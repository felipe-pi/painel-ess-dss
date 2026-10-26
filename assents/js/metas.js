// Regras compartilhadas pela lista e pelo detalhe do inspetor.
function obterMesesPeriodo(inicio, fim) {
  const meses = [];
  if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fim.getTime()) || inicio > fim) return meses;
  for (let mes = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    mes <= fim; mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)) {
    meses.push(mes);
  }
  return meses;
}

function obterMetaMensal(inspetor, mes) {
  if (inspetor.referencia_base) return inspetor; // Cadastro fixo, independente do filtro.
  if (!inspetor.metas_por_referencia) return inspetor; // JSON anterior à migração.
  const referencia = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`;
  return inspetor.metas_por_referencia[referencia] || null;
}

function obterConfiguracaoPeriodo(inspetor, inicio, fim) {
  const metas = obterMesesPeriodo(inicio, fim).map(mes => obterMetaMensal(inspetor, mes));
  const presentes = metas.filter(Boolean);
  const classificacoes = [...new Set(presentes.map(meta => meta.classificacao))];
  return {
    ...inspetor,
    ...(presentes[0] || {}),
    classificacao: classificacoes.join(' / ') || 'Sem meta',
    sem_meta: metas.length === 0 || presentes.length !== metas.length,
  };
}

function obterPeriodosMetas(inspetor, inicio, fim) {
  return obterMesesPeriodo(inicio, fim).flatMap(mes => {
    const configuracao = obterMetaMensal(inspetor, mes);
    const ano = mes.getFullYear();
    const numeroMes = mes.getMonth();
    const ultimo = new Date(ano, numeroMes + 1, 0).getDate();
    return [[1, 10, 'meta_01_10'], [11, 20, 'meta_11_20'], [21, ultimo, 'meta_21_31']]
      .map(([primeiro, final, campo]) => {
        const de = new Date(ano, numeroMes, primeiro);
        const ate = new Date(ano, numeroMes, final);
        const inicioSelecionado = new Date(Math.max(de, inicio));
        const fimSelecionado = new Date(Math.min(ate, new Date(fim.getFullYear(), fim.getMonth(), fim.getDate())));
        const dias = inicioSelecionado <= fimSelecionado
          ? Math.round((Date.UTC(fimSelecionado.getFullYear(), fimSelecionado.getMonth(), fimSelecionado.getDate())
            - Date.UTC(inicioSelecionado.getFullYear(), inicioSelecionado.getMonth(), inicioSelecionado.getDate())) / 86400000) + 1 : 0;
        return {
          nome: `${String(numeroMes + 1).padStart(2, '0')}/${ano} · ${String(primeiro).padStart(2, '0')}-${final}`,
          inicio: inicioSelecionado, fim: fimSelecionado, dias,
          configuracao,
          meta: configuracao ? Math.ceil((Number(configuracao[campo]) || 0) * dias / (final - primeiro + 1)) : null,
        };
      }).filter(periodo => periodo.dias > 0);
  });
}

function calcularMetaPeriodo(inspetor, inicio, fim) {
  return obterPeriodosMetas(inspetor, inicio, fim).reduce((total, periodo) => total + (periodo.meta || 0), 0);
}

function calcularRealizadoAproveitado(inspetor, inicio, fim, inspecoes) {
  return obterMesesPeriodo(inicio, fim).reduce((total, mes) => {
    const configuracao = obterMetaMensal(inspetor, mes);
    if (!configuracao) return total;
    const periodos = obterPeriodosMetas(inspetor,
      new Date(Math.max(inicio, mes)),
      new Date(Math.min(fim, new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59, 999))));
    const realizados = periodos.map(periodo => inspecoes.filter(item => {
      const data = new Date(item.data + 'T00:00:00');
      return data >= periodo.inicio && data <= periodo.fim;
    }).length);
    return total + (configuracao.classificacao === 'Ciclo+10'
      ? periodos.reduce((soma, periodo, indice) => soma + Math.min(realizados[indice], periodo.meta), 0)
      : Math.min(realizados.reduce((soma, valor) => soma + valor, 0),
        periodos.reduce((soma, periodo) => soma + periodo.meta, 0)));
  }, 0);
}
