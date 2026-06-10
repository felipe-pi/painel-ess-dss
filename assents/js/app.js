let inspetores = [];
let inspecoes = [];

const params = new URLSearchParams(window.location.search);

const inicioUrl = params.get('inicio');
const fimUrl = params.get('fim');

fetch(`./data/dados_publico.json?v=${Date.now()}`, { cache: 'no-store' })
  .then((response) => response.json())
  .then((json) => {
    inspetores = json.inspetores || [];
    inspecoes = json.inspecoes || [];

    document.getElementById('atualizado').innerHTML = json.atualizado_em;

    definirMesAtual();
    preencherAreas();
    aplicarFiltros();
  });

function definirMesAtual() {
  if (inicioUrl && fimUrl) {
    document.getElementById('dataInicio').value = inicioUrl;
    document.getElementById('dataFim').value = fimUrl;
    return;
  }

  const hoje = new Date();

  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  document.getElementById('dataInicio').value = primeiroDia
    .toISOString()
    .split('T')[0];

  document.getElementById('dataFim').value = ultimoDia
    .toISOString()
    .split('T')[0];
}

function preencherAreas() {
  const select = document.getElementById('areaFiltro');

  const areas = [
    ...new Set(inspetores.map((i) => i.area).filter(Boolean)),
  ].sort();

  select.innerHTML = `<option value="">Todas as áreas</option>`;

  areas.forEach((area) => {
    const option = document.createElement('option');
    option.value = area;
    option.textContent = area;
    select.appendChild(option);
  });
}

function calcularDiasSobrepostos(inicioA, fimA, inicioB, fimB) {
  const inicio = new Date(Math.max(inicioA.getTime(), inicioB.getTime()));
  const fim = new Date(Math.min(fimA.getTime(), fimB.getTime()));

  if (inicio > fim) return 0;

  const msPorDia = 24 * 60 * 60 * 1000;

  return Math.floor((fim - inicio) / msPorDia) + 1;
}

function calcularMetaPeriodo(inspetor, dataInicio, dataFim) {
  const ano = dataInicio.getFullYear();
  const mes = dataInicio.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  const periodos = [
    {
      inicio: new Date(ano, mes, 1),
      fim: new Date(ano, mes, 10),
      meta: Number(inspetor.meta_01_10) || 0,
    },
    {
      inicio: new Date(ano, mes, 11),
      fim: new Date(ano, mes, 20),
      meta: Number(inspetor.meta_11_20) || 0,
    },
    {
      inicio: new Date(ano, mes, 21),
      fim: new Date(ano, mes, ultimoDia),
      meta: Number(inspetor.meta_21_31) || 0,
    },
  ];

  return periodos.reduce((total, periodo) => {
    const diasPeriodo = calcularDiasSobrepostos(
      periodo.inicio,
      periodo.fim,
      periodo.inicio,
      periodo.fim,
    );

    const diasSelecionados = calcularDiasSobrepostos(
      dataInicio,
      dataFim,
      periodo.inicio,
      periodo.fim,
    );

    if (diasSelecionados === 0 || diasPeriodo === 0) return total;

    return total + Math.ceil((periodo.meta / diasPeriodo) * diasSelecionados);
  }, 0);
}

function calcularRealizadoAproveitado(
  inspetor,
  dataInicio,
  dataFim,
  inspecoesInspetor,
) {
  const ano = dataInicio.getFullYear();
  const mes = dataInicio.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  const periodos = [
    {
      inicio: new Date(ano, mes, 1),
      fim: new Date(ano, mes, 10),
      meta: Number(inspetor.meta_01_10) || 0,
    },
    {
      inicio: new Date(ano, mes, 11),
      fim: new Date(ano, mes, 20),
      meta: Number(inspetor.meta_11_20) || 0,
    },
    {
      inicio: new Date(ano, mes, 21),
      fim: new Date(ano, mes, ultimoDia),
      meta: Number(inspetor.meta_21_31) || 0,
    },
  ];

  return periodos.reduce((total, periodo) => {
    const diasPeriodo = calcularDiasSobrepostos(
      periodo.inicio,
      periodo.fim,
      periodo.inicio,
      periodo.fim,
    );

    const diasSelecionados = calcularDiasSobrepostos(
      dataInicio,
      dataFim,
      periodo.inicio,
      periodo.fim,
    );

    if (diasSelecionados === 0 || diasPeriodo === 0) return total;

    const metaSelecionada = Math.ceil(
      (periodo.meta / diasPeriodo) * diasSelecionados,
    );

    const realizadoPeriodo = inspecoesInspetor.filter((inspecao) => {
      const dataInspecao = new Date(inspecao.data + 'T00:00:00');

      return dataInspecao >= periodo.inicio && dataInspecao <= periodo.fim;
    }).length;

    return total + Math.min(realizadoPeriodo, metaSelecionada);
  }, 0);
}

function aplicarFiltros() {
  const busca = document.getElementById('busca').value.toLowerCase();
  const areaSelecionada = document.getElementById('areaFiltro').value;
  const classificacaoSelecionada = document.getElementById(
    'classificacaoFiltro',
  ).value;
  const inicio = document.getElementById('dataInicio').value;
  const fim = document.getElementById('dataFim').value;

  const dataInicio = new Date(inicio + 'T00:00:00');
  const dataFim = new Date(fim + 'T23:59:59');

  const inspecoesFiltradas = inspecoes.filter((i) => {
    if (!i.data || i.data === 'None') return false;

    const dataInspecao = new Date(i.data + 'T00:00:00');

    return dataInspecao >= dataInicio && dataInspecao <= dataFim;
  });

  const inspecoesPorMatricula = {};

  inspecoesFiltradas.forEach((i) => {
    if (!inspecoesPorMatricula[i.matricula]) {
      inspecoesPorMatricula[i.matricula] = [];
    }

    inspecoesPorMatricula[i.matricula].push(i);
  });

  let painel = inspetores.map((i) => {
    const inspecoesInspetor = inspecoesPorMatricula[i.matricula] || [];
    const realizado = inspecoesInspetor.length;
    const metaPeriodo = calcularMetaPeriodo(i, dataInicio, dataFim);
    const realizadoAproveitado =
      i.classificacao === 'Ciclo+10'
        ? calcularRealizadoAproveitado(i, dataInicio, dataFim, inspecoesInspetor)
        : Math.min(realizado, metaPeriodo);

    const performanceReal =
      metaPeriodo > 0 ? (realizadoAproveitado / metaPeriodo) * 100 : 0;

    const performance = Math.min(performanceReal, 100);

    let status = 'vermelho';

    if (performance >= 100) {
      status = 'verde';
    } else if (performance >= 70) {
      status = 'amarelo';
    }

    const gap = Math.max(metaPeriodo - realizado, 0);

    return {
      ...i,
      meta_periodo: metaPeriodo,
      realizado,
      realizado_aproveitado: realizadoAproveitado,
      performance: Number(performance.toFixed(1)),
      performance_real: Number(performanceReal.toFixed(1)),
      gap,
      status,
    };
  });

  if (areaSelecionada) {
    painel = painel.filter((i) => i.area === areaSelecionada);
  }

  if (classificacaoSelecionada) {
    painel = painel.filter(
      (i) => i.classificacao === classificacaoSelecionada,
    );
  }

  if (busca) {
    painel = painel.filter(
      (i) =>
        i.nome.toLowerCase().includes(busca) ||
        i.matricula.toLowerCase().includes(busca),
    );
  }

  painel.sort((a, b) => {
    if (b.performance !== a.performance) {
      return b.performance - a.performance;
    }

    return b.realizado - a.realizado;
  });

  renderizarTabela(painel);
  atualizarCards(painel);
}

function renderizarTabela(dados) {
  const dataInicio = document.getElementById('dataInicio').value;

  const dataFim = document.getElementById('dataFim').value;
  let html = '';

  dados.forEach((item) => {
    html += `
      <tr>
        <td>
        <a href="detalhe.html?id=${item.matricula.trim()}&inicio=${dataInicio}&fim=${dataFim}">
          ${item.matricula}
        </a>
        </td>
        <td>${item.nome}</td>
        <td>${item.area}</td>
        <td>${item.meta_periodo}</td>
        <td>${item.realizado}</td>
        <td>${item.performance}%</td>
        <td>
          <span class="status ${item.status}"></span>
        </td>
      </tr>
    `;
  });

  document.getElementById('tabelaInspetores').innerHTML = html;
}

function atualizarCards(dados) {
  const colaboradores = dados.length;

  const meta = dados.reduce((soma, item) => soma + item.meta_periodo, 0);

  const realizado = dados.reduce((soma, item) => soma + item.realizado, 0);

  const performance = meta > 0 ? Math.min((realizado / meta) * 100, 100) : 0;

  document.getElementById('colaboradores').innerHTML = colaboradores;
  document.getElementById('metaGeral').innerHTML = meta;
  document.getElementById('realizadoGeral').innerHTML = realizado;
  document.getElementById('performanceGeral').innerHTML =
    performance.toFixed(1) + '%';
}

document.getElementById('busca').addEventListener('keyup', aplicarFiltros);
document
  .getElementById('areaFiltro')
  .addEventListener('change', aplicarFiltros);
document
  .getElementById('classificacaoFiltro')
  .addEventListener('change', aplicarFiltros);
document.getElementById('btnAplicar').addEventListener('click', aplicarFiltros);
// MENU MOBILE
const menuBtn = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // Fecha clicando fora
  document.addEventListener('click', (e) => {
    const clicouNoMenu = sidebar.contains(e.target);
    const clicouBotao = menuBtn.contains(e.target);

    if (!clicouNoMenu && !clicouBotao) {
      sidebar.classList.remove('active');
    }
  });
}
