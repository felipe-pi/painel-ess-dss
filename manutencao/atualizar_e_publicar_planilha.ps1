param([switch]$Simular, [string]$PythonExe = '')
$ErrorActionPreference = 'Stop'
$ProjetoPlanilha = Split-Path -Parent $PSScriptRoot
$PastaLocalPlanilha = Join-Path $ProjetoPlanilha 'scripts\ferias'
$PythonPlanilha = Join-Path $env:USERPROFILE 'PainelESSPlanilha\venv\Scripts\python.exe'
if ($PythonExe) { $PythonPlanilha = $PythonExe }
$PublicosPlanilha = @('data/dados_publico.json', 'data/altas_horas_publico.json')
$LogDirPlanilha = Join-Path $ProjetoPlanilha 'logs'
New-Item -ItemType Directory -Path $LogDirPlanilha -Force | Out-Null
$LogPlanilha = Join-Path $LogDirPlanilha ('planilha_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.log')
function Registrar-Planilha([string]$Mensagem) {
    $linha = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Mensagem
    Write-Host $linha
    Add-Content -LiteralPath $LogPlanilha -Value $linha -Encoding UTF8
}
function Git-Planilha([string[]]$Argumentos) {
    $preferenciaAnteriorPlanilha = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $saida = & git -C $ProjetoPlanilha @Argumentos 2>&1
        $codigo = $LASTEXITCODE
    } finally { $ErrorActionPreference = $preferenciaAnteriorPlanilha }
    foreach ($linha in $saida) { Registrar-Planilha ([string]$linha) }
    if ($codigo -ne 0) { throw ('Git falhou: ' + ($Argumentos -join ' ')) }
    return @($saida | ForEach-Object { [string]$_ })
}
if (-not (Test-Path -LiteralPath $PythonPlanilha)) { throw 'Execute manutencao\instalar_planilha.ps1 primeiro.' }
if (-not (Test-Path -LiteralPath (Join-Path $PastaLocalPlanilha 'base.json'))) { throw 'Extraia o kit local fornecido pelo responsavel na raiz deste clone.' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git nao encontrado.' }
$lockPlanilha = [IO.File]::Open((Join-Path $PastaLocalPlanilha 'publicacao.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
try {
    $branch = ((Git-Planilha @('branch','--show-current')) -join '').Trim()
    if ($branch -ne 'master') { throw 'Use a branch master neste clone.' }
    $origin = ((Git-Planilha @('remote','get-url','origin')) -join '').Trim()
    if ($origin -notin @('https://github.com/felipe-pi/painel-ess-dss.git','https://github.com/felipe-pi/painel-ess-dss','git@github.com:felipe-pi/painel-ess-dss.git')) { throw 'O origin deste clone nao e o repositorio do painel.' }
    $pendentes = Git-Planilha @('diff','--cached','--name-only')
    if ($pendentes.Count -gt 0) { throw 'Ha arquivos preparados para outro commit. Conclua essa operacao antes.' }
    $alterados = Git-Planilha @('diff','--name-only')
    foreach ($nome in $alterados) { if ($nome -notin $PublicosPlanilha) { throw ('Ha alteracao de codigo fora da rotina: ' + $nome) } }
    if (-not $Simular) {
        if ($alterados.Count -eq 0) {
            $null = Git-Planilha @('pull','--ff-only','origin','master')
        } else {
            $null = Git-Planilha @('fetch','origin','master')
            $atrasados = ((Git-Planilha @('rev-list','--count','HEAD..origin/master')) -join '').Trim()
            if ([int]$atrasados -gt 0) { throw 'Existem dados locais pendentes e commits novos no remoto. Pare e peca ajuda; nao use force ou reset.' }
        }
        if (-not ((Git-Planilha @('config','user.name')) -join '').Trim()) { throw 'Configure git config user.name com seu nome.' }
        if (-not ((Git-Planilha @('config','user.email')) -join '').Trim()) { throw 'Configure git config user.email com seu email.' }
    }
    Registrar-Planilha 'Atualizacao por planilha; Snowflake nao sera consultado.'
    $argumentosPythonPlanilha = @((Join-Path $PSScriptRoot 'atualizar_planilha.py'), '--projeto', $ProjetoPlanilha)
    if (-not $Simular) { $argumentosPythonPlanilha += '--aplicar' }
    $preferenciaPythonPlanilha = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $PythonPlanilha @argumentosPythonPlanilha 2>&1 | ForEach-Object { Registrar-Planilha ([string]$_) }
        $codigoPythonPlanilha = $LASTEXITCODE
    } finally { $ErrorActionPreference = $preferenciaPythonPlanilha }
    if ($codigoPythonPlanilha -ne 0) { throw 'Falha na leitura/geracao. Publicacao cancelada.' }
    if ($Simular) { Registrar-Planilha 'Simulacao concluida. Sem commit nem push.'; return }
    $null = Git-Planilha (@('add','--') + $PublicosPlanilha)
    $mudancas = Git-Planilha @('diff','--cached','--name-only')
    if ($mudancas.Count -gt 0) {
        foreach ($nome in $mudancas) { if ($nome -notin $PublicosPlanilha) { throw ('Arquivo fora da publicacao: ' + $nome) } }
        $null = Git-Planilha @('commit','-m',('Atualiza painel por planilha ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')))
    }
    # Sempre tenta enviar commits pendentes, inclusive apos uma falha anterior de login.
    $null = Git-Planilha @('push','origin','master')
    Registrar-Planilha 'Publicacao por planilha concluida com sucesso. Aguarde o GitHub Pages.'
} catch {
    Registrar-Planilha ('ERRO: ' + $_.Exception.Message)
    throw
} finally {
    $lockPlanilha.Dispose()
}
