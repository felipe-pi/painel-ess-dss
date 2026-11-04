# Atualizar o painel durante as férias, sem Snowflake

O repositório é `felipe-pi/painel-ess-dss` e sua branch principal é **master**.
O modo por planilha atualiza ESS e Altas Horas, mantém a base fixa de
setembro/2026 e preserva o DSS com a data de sua última coleta.

## 1. Liberar o acesso no GitHub (Felipe)

A colega deve ter uma conta própria no GitHub. No repositório, abra
Settings → Collaborators → Add people, convide a conta dela e peça que aceite.
Isso permite fazer push no repositório pessoal; não precisa torná-la administradora.
Não é necessário dar acesso ao Snowflake nem compartilhar a conta de Felipe.

Documentação: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository

## 2. Instalar no computador dela (uma vez)

- Git for Windows: https://git-scm.com/install/windows — mantenha o Git Credential Manager.
- Python 3.11, 64 bits: https://www.python.org/downloads/release/python-3119/
- PowerShell já vem com o Windows. Excel é opcional para executar a rotina.

Depois da instalação, feche e reabra o PowerShell. Use uma pasta local simples,
fora do OneDrive, e **clone** o repositório. Não copie a pasta `.git` de outra máquina.

```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\Projetos" -Force | Out-Null
Set-Location -LiteralPath "$env:USERPROFILE\Projetos"
git clone --branch master https://github.com/felipe-pi/painel-ess-dss.git
Set-Location -LiteralPath "$env:USERPROFILE\Projetos\painel-ess-dss"

# Substitua pelos dados da colega, usados na autoria dos commits.
git config user.name "NOME DA COLEGA"
git config user.email "EMAIL DA COLEGA"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\manutencao\instalar_planilha.ps1'
```

O instalador cria `PainelESSPlanilha\venv` no perfil dela e instala somente
openpyxl para leitura do Excel. Não instala conector nem credenciais Snowflake.

## 3. Preparar o histórico de partida (Felipe, antes das férias)

Faça uma última atualização completa no computador com Snowflake e confirme
o push. Em seguida, prepare o ZIP com o histórico correspondente:

```powershell
$painel = 'D:\Bkp-Felipe\BKP- FELIPE\Equatorial Piauí\Trabalhos Pessoais\Scripts\Projetos&Testes\Inspetor\painel_ess_web'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$painel\scripts\atualizar_e_publicar.ps1"
if ($LASTEXITCODE -ne 0) { throw 'A coleta completa falhou; nao prepare o kit ainda.' }
& "$env:USERPROFILE\PainelESSRuntime\venv\Scripts\python.exe" "$painel\manutencao\preparar_kit.py" --projeto "$painel"
```

O ZIP fica em `bkp/kit_planilha_DATA_HORA.zip`. Ele contém somente o cadastro,
o histórico de partida e a planilha inicial. Não inclui scripts de conexão,
tokens, ambiente virtual ou `.git`. Transfira o ZIP diretamente à colega;
o cadastro e o histórico são dados locais e não devem ir ao repositório público.

Na máquina dela, extraia o ZIP na raiz do clone, ao lado de `index.html`.
Devem existir `scripts/ferias/base.json` e `scripts/Checklists Realizados.xlsx`.
Execute uma simulação antes da primeira publicação:

```powershell
$painel = Join-Path $env:USERPROFILE 'Projetos\painel-ess-dss'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$painel\manutencao\atualizar_e_publicar_planilha.ps1" -Simular
```

Durante a cobertura, use apenas um computador publicador. No computador de
Felipe, ao iniciar as férias, desative a tarefa antiga para ela não alternar
publicações com o modo por planilha:

```powershell
Disable-ScheduledTask -TaskName 'Painel ESS - Atualizar e Publicar'
```

Não desative a tarefa agora se a cobertura ainda não começou. O kit de teste
deve ser recriado após a última coleta de partida, se houver novas atualizações.

## 4. Rotina diária da colega

1. Substituir `scripts/Checklists Realizados.xlsx` pelo relatório exportado.
2. Manter o nome, a aba de dados, os cabeçalhos, os IDs e as datas de execução.
3. Fechar o arquivo no Excel e executar o bloco abaixo.

Exporte sempre o **mês completo em atualização**, desde o dia 1, e não apenas
os novos dias. O comparativo PMS usa o maior total mensal entre histórico e
planilha; um relatório incompleto pode subestimar o total do mês. O histórico
dos meses anteriores é preservado pelo kit.

```powershell
$painel = Join-Path $env:USERPROFILE 'Projetos\painel-ess-dss'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$painel\manutencao\atualizar_e_publicar_planilha.ps1"
```

O comando atualiza o clone com `pull --ff-only`, lê a planilha, gera os JSONs
públicos, faz commit e executa `push origin master`. No primeiro push, conclua
o login no navegador com a conta da colega que aceitou o convite. `user.name`
e `user.email` identificam a autoria; eles não substituem o login no GitHub.

Somente `data/dados_publico.json` e `data/altas_horas_publico.json` são preparados
para commit. A pasta `scripts/` continua ignorada pelo Git. **Não use `git add .`
nem force o envio da planilha.** Aguarde a publicação no GitHub Pages.

Para consultar o último log:

```powershell
$painel = Join-Path $env:USERPROFILE 'Projetos\painel-ess-dss'
$log = Get-ChildItem -LiteralPath "$painel\logs" -Filter 'planilha_*.log' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($log) { Get-Content -LiteralPath $log.FullName -Tail 30 }
```

## Regras e recuperação

- O histórico de partida é mantido. PMS usa o maior total por colaborador/mês;
  Altas Horas usa o maior total por colaborador/dia, como na rotina completa.
- Os IDs já lidos ficam acumulados em `scripts/ferias/estado.json`. Repetir o
  arquivo não duplica realizações. Relatórios parciais posteriores não apagam
  os IDs registrados antes. Preserve essa pasta ao trocar de computador.
- IDs antigos corrigidos na planilha substituem a entrada correspondente no
  estado; o histórico congelado de partida não é apagado. Exclusões ou ajustes
  retroativos no histórico de partida devem ser revisados pelo responsável.
- Se outro publicador fizer uma coleta completa, o kit antigo é bloqueado
  quando o novo histórico for recebido. Prepare um novo kit; não use reset,
  force push ou remova o estado para tentar contornar o bloqueio.
- Falha no push não apaga o commit. Resolva o login/permissão e repita a rotina.
  Se existirem mudanças de outro computador junto com dados locais pendentes,
  ela interrompe o processo para revisão, sem sobrescrever o histórico remoto.
- Os backups ficam em `bkp/planilha_DATA_HORA`. As publicações mudam a data de
  atualização de ESS/Altas Horas; DSS conserva sua própria data.

## Retorno das férias

No computador com Snowflake, primeiro receba os commits da colega (`git pull
--ff-only`). Transfira também a planilha e `scripts/ferias/estado.json`: o Git
contém apenas dados públicos, não os arquivos locais da cobertura. Antes de
retomar a coleta completa, garanta que a planilha exportada cubra todo o período
de férias ou que os registros já tenham chegado ao Snowflake. Confira os totais
contra o último painel publicado para não perder realizações da cobertura.
Depois dessa conferência, execute a rotina completa e reative a tarefa:

```powershell
Enable-ScheduledTask -TaskName 'Painel ESS - Atualizar e Publicar'
```
