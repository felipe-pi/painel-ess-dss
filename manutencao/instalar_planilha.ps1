$ErrorActionPreference = 'Stop'
$ProjetoPlanilha = Split-Path -Parent $PSScriptRoot
$VenvPlanilha = Join-Path $env:USERPROFILE 'PainelESSPlanilha\venv'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Instale o Git for Windows e reabra o PowerShell.' }
if (-not (Get-Command py -ErrorAction SilentlyContinue)) { throw 'Instale o Python 3.11 e reabra o PowerShell.' }
& py -3.11 --version
if ($LASTEXITCODE -ne 0) { throw 'Python 3.11 nao encontrado. Instale antes de continuar.' }
if (-not (Test-Path -LiteralPath (Join-Path $VenvPlanilha 'Scripts\python.exe'))) {
    & py -3.11 -m venv $VenvPlanilha
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel criar o ambiente virtual.' }
}
& (Join-Path $VenvPlanilha 'Scripts\python.exe') -m pip install -r (Join-Path $PSScriptRoot 'requirements-planilha.txt')
if ($LASTEXITCODE -ne 0) { throw 'Falha na instalacao das dependencias.' }
Write-Host 'Ambiente pronto. Nenhum conector Snowflake e necessario.'
