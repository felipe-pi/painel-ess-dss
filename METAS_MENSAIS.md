# Metas mensais do painel ESS

Na planilha local `scripts/base_inspetores.xlsx`, mantenha uma linha por
matrícula e mês na aba de inspetores. Preserve as linhas dos meses anteriores.
Para cadastrar outro mês, acrescente as linhas correspondentes e ajuste a
classificação, o TOTAL e as metas dos três ciclos de cada colaborador.

A coluna `Referência` aceita uma data do Excel, `MM/AAAA` ou `AAAA-MM`.
Os nomes de meses por extenso da base atual (como `Setembro` e `Outubro`)
são interpretados como meses de 2026. Para os próximos anos, inclua o ano
explicitamente, por exemplo `01/2027`, para preservar o histórico.
As metas são identificadas pela matrícula e pelo ano/mês; colunas auxiliares
como `check` não substituem essa chave. O TOTAL deve corresponder à soma das
três metas. Referências vazias, inválidas e matrículas repetidas no mesmo mês
interrompem a geração com uma mensagem, antes da consulta ao Snowflake.

O gerador local `scripts/metas_mensais.py` agrupa as referências em
`metas_por_referencia`. A anonimização mantém esse histórico no JSON público.
O filtro de datas usa as metas e a classificação de cada mês, mantendo a regra
de aproveitamento por ciclo para Ciclo+10. Intervalos que atravessam meses
somam as metas correspondentes; filtros parciais mantêm o rateio dos ciclos.
Sem referência cadastrada, a tela informa “Sem meta”; não reutiliza a meta de
outro mês. JSONs antigos, sem histórico mensal, continuam compatíveis.

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
