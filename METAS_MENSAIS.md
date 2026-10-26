# Base fixa de metas do painel ESS

Por orientação de gestão, o painel usa o cadastro de setembro/2026 para todos
os períodos analisados. O filtro de datas seleciona as inspeções e calcula
o período, mas não troca as metas nem a classificação dos colaboradores.

A coluna `Referência` aceita uma data do Excel, `MM/AAAA` ou `AAAA-MM`.
Os nomes de meses por extenso da base atual são interpretados como meses de
2026. A referência fixa permanece setembro/2026 independentemente do ano
selecionado no filtro.
Somente as linhas de setembro/2026 são usadas; outras referências e a coluna
auxiliar `check` não definem as metas do painel. A planilha é preservada.
Sem coluna Referência, o cadastro inteiro é considerado fixo. A falta de
setembro, matrículas duplicadas e metas inválidas interrompem a geração.

O JSON identifica a origem em `referencia_base: "2026-09"`, sem o histórico
`metas_por_referencia`. Todos os meses usam as mesmas metas e classificação
de cada colaborador. O aproveitamento por ciclo do Ciclo+10 e o rateio para
filtros parciais são preservados. Intervalos que atravessam meses acumulam
a mesma meta fixa em cada mês.

Após salvar a planilha, execute na pasta do projeto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\atualizar_jsons.ps1"
```

Revise os dados gerados antes de executar o script de publicação. A pasta
`scripts/` é ignorada pelo Git neste projeto: preserve também o gerador e o
módulo de metas nos backups e nas migrações de máquina.

Teste das regras e integração das telas, sem consultar o Snowflake:

```powershell
node tests/metas.test.cjs
```
