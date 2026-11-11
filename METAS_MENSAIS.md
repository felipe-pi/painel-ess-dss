# Metas por referência no painel ESS

O filtro de datas seleciona as inspeções e as metas/classificações cadastradas
para cada mês em `scripts/base_inspetores.xlsx`. Mantenha uma linha por matrícula
e referência. Use datas, MM/AAAA ou AAAA-MM para incluir o ano; nomes de meses
sem ano são interpretados como 2026. O campo check é auxiliar.

O arquivo local `scripts/base_inspetores_outubro_2026.xlsx` preserva outubro
da base anterior quando o mês inteiro não está na planilha principal. A
planilha principal tem prioridade. Preserve ambos no backup dos scripts.

Sem cadastro no mês, um colaborador com inspeções continua visível, sem meta
atribuída. O total de metas usa as referências cadastradas. Intervalos com mais
de um mês acumulam as metas correspondentes, com rateio para datas parciais.
A regra de aproveitamento do Ciclo+10 permanece por ciclo.

A atualização completa usa esse cadastro. O modo sem Snowflake também preserva
as referências incluídas no kit; gere um kit novo quando a base de partida mudar.
