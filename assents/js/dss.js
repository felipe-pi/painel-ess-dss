let metasArea = [];
let dss = [];

fetch(`./data/dss_publico.json?v=${Date.now()}`, { cache: 'no-store' })
  .then((response) => response.json())
  .then((json) => {
    metasArea = json.metas_area || [];
    dss = json.dss || [];

    document.getElementById('atualizadoDss').innerHTML = json.atualizado_em;

    definirMesAtual();
    preencherAreas();
    aplicarFiltrosDss();
  });

function definirMesAtual() {
  const hoje = new Date();

  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  document.getElementById('dataInicioDss').value = primeiroDia
    .toISOString()
    .split('T')[0];

  document.getElementById('dataFimDss').value = ultimoDia
    .toISOString()
    .split('T')[0];
}

function preencherAreas() {
  const select = document.getElementById('areaFiltroDss');

  const areas = [...new Set(metasArea.map((x) => x.area))].sort();

  areas.forEach((area) => {
    const option = document.createElement('option');

    option.value = area;
    option.textContent = area;

    select.appendChild(option);
  });
}

function formatarNumero(valor) {
  return Number.isInteger(valor) ? valor : valor.toFixed(1);
}

function calcularDiasSobrepostos(inicioA, fimA, inicioB, fimB) {
  const inicio = new Date(Math.max(inicioA.getTime(), inicioB.getTime()));
  const fim = new Date(Math.min(fimA.getTime(), fimB.getTime()));

  if (inicio > fim) return 0;

  const msPorDia = 24 * 60 * 60 * 1000;

  return Math.floor((fim - inicio) / msPorDia) + 1;
}

function calcularMetaDssPeriodo(metaArea, dataInicio, dataFim) {
  const ano = dataInicio.getFullYear();
  const mes = dataInicio.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  const periodos = [
    {
      inicio: new Date(ano, mes, 1),
      fim: new Date(ano, mes, 7),
      meta: Number(metaArea.meta_1_7) || 0,
    },
    {
      inicio: new Date(ano, mes, 8),
      fim: new Date(ano, mes, 15),
      meta: Number(metaArea.meta_8_15) || 0,
    },
    {
      inicio: new Date(ano, mes, 16),
      fim: new Date(ano, mes, 22),
      meta: Number(metaArea.meta_16_22) || 0,
    },
    {
      inicio: new Date(ano, mes, 23),
      fim: new Date(ano, mes, ultimoDia),
      meta: Number(metaArea.meta_23_31) || 0,
    },
  ];

  const metaPeriodo = periodos.reduce((total, periodo) => {
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

    return total + (periodo.meta / diasPeriodo) * diasSelecionados;
  }, 0);

  return Math.ceil(metaPeriodo);
}

function obterMetasVisiveis() {
  const areaSelecionada = document.getElementById('areaFiltroDss').value;

  if (!areaSelecionada) return metasArea;

  return metasArea.filter((x) => x.area === areaSelecionada);
}

function obterStatusTexto(status) {
  const textos = {
    verde: 'No prazo',
    amarelo: 'Atenção',
    vermelho: 'Abaixo',
  };

  return textos[status] || 'Abaixo';
}

function aplicarFiltrosDss() {
  const busca = document.getElementById('buscaDss').value.toLowerCase();

  const areaSelecionada = document.getElementById('areaFiltroDss').value;

  const inicio = document.getElementById('dataInicioDss').value;

  const fim = document.getElementById('dataFimDss').value;

  const dataInicio = new Date(inicio + 'T00:00:00');

  const dataFim = new Date(fim + 'T23:59:59');

  let dssFiltrado = dss.filter((x) => {
    const data = new Date(x.data + 'T00:00:00');

    const dentroPeriodo = data >= dataInicio && data <= dataFim;

    const regionalParnaiba =
      x.regional === 'PARNAIBA' || x.regional === 'PARNAÍBA';

    return dentroPeriodo && regionalParnaiba;
  });

  if (areaSelecionada) {
    dssFiltrado = dssFiltrado.filter((x) => x.area === areaSelecionada);
  }

  if (busca) {
    dssFiltrado = dssFiltrado.filter(
      (x) =>
        x.nome.toLowerCase().includes(busca) ||
        x.matricula.toLowerCase().includes(busca) ||
        x.area.toLowerCase().includes(busca),
    );
  }

  atualizarResumo(dssFiltrado);

  atualizarTabelaArea(dssFiltrado);

  atualizarTabelaColaborador(dssFiltrado);
}

function atualizarResumo(dados) {
  const inicio = document.getElementById('dataInicioDss').value;
  const fim = document.getElementById('dataFimDss').value;
  const dataInicio = new Date(inicio + 'T00:00:00');
  const dataFim = new Date(fim + 'T23:59:59');
  const metasVisiveis = obterMetasVisiveis();

  const areas = metasVisiveis.length;

  const meta = metasVisiveis.reduce(
    (soma, item) => soma + calcularMetaDssPeriodo(item, dataInicio, dataFim),
    0,
  );

  // Realizado = soma dos participantes
  const realizado = dados.reduce(
    (soma, item) => soma + (Number(item.participantes) || 0),
    0,
  );

  // Participantes também é a mesma soma
  const participantes = realizado;

  const performance = meta > 0 ? Math.min((realizado / meta) * 100, 100) : 0;

  document.getElementById('areasDss').innerHTML = areas;
  document.getElementById('metaDss').innerHTML = formatarNumero(meta);
  document.getElementById('realizadoDss').innerHTML = realizado;
  document.getElementById('performanceDss').innerHTML =
    performance.toFixed(1) + '%';
  document.getElementById('participantesDss').innerHTML = participantes;
}

function atualizarTabelaArea(dados) {
  const inicio = document.getElementById('dataInicioDss').value;
  const fim = document.getElementById('dataFimDss').value;
  const dataInicio = new Date(inicio + 'T00:00:00');
  const dataFim = new Date(fim + 'T23:59:59');
  const metasVisiveis = obterMetasVisiveis();

  let html = '';

  if (metasVisiveis.length === 0) {
    document.getElementById('tabelaAreasDss').innerHTML = `
      <tr>
        <td colspan="7" class="estado-vazio">
          Nenhuma área encontrada para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  metasVisiveis.forEach((metaArea) => {
    const registros = dados.filter((x) => x.area === metaArea.area);
    const metaPeriodo = calcularMetaDssPeriodo(metaArea, dataInicio, dataFim);

    // quantidade de DSS
    const quantidade = registros.length;

    // soma participantes
    const realizado = registros.reduce(
      (soma, item) => soma + (item.participantes || 0),
      0,
    );

    const gap = Math.max(metaPeriodo - realizado, 0);

    const performance =
      metaPeriodo > 0 ? Math.min((realizado / metaPeriodo) * 100, 100) : 0;

    let status = 'vermelho';

    if (performance >= 100) {
      status = 'verde';
    } else if (performance >= 80) {
      status = 'amarelo';
    }

    html += `
        <tr>
          <td>${metaArea.area}</td>
          <td>${quantidade}</td>
          <td>${formatarNumero(metaPeriodo)}</td>
          <td>${realizado}</td>
          <td>${formatarNumero(gap)}</td>
          <td>
            ${performance.toFixed(1)}%
          </td>
          <td>
            <span class="status-badge ${status}">
              <span class="status ${status}"></span>
              ${obterStatusTexto(status)}
            </span>
          </td>
        </tr>
      `;
  });

  document.getElementById('tabelaAreasDss').innerHTML = html;
}

function atualizarTabelaColaborador(dados) {
  const resumo = {};

  const normalizarNomePublico = (nome) => {
    const partes = String(nome || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return partes.slice(0, 2).join(' ');
  };

  dados.forEach((x) => {
    const nomePublico = normalizarNomePublico(x.nome);
    const chave = x.matricula || `${nomePublico}|${x.area}`;

    if (!resumo[chave]) {
      resumo[chave] = {
        matricula: x.matricula,

        nome: nomePublico,

        area: x.area,

        realizado: 0,

        participantes: 0,
      };
    }

    resumo[chave].realizado++;

    resumo[chave].participantes += x.participantes || 0;
  });

  const lista = Object.values(resumo);

  lista.sort((a, b) => b.realizado - a.realizado);

  let html = '';

  if (lista.length === 0) {
    document.getElementById('tabelaColaboradoresDss').innerHTML = `
      <tr>
        <td colspan="5" class="estado-vazio">
          Nenhum colaborador encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach((x) => {
    html += `
        <tr>
          <td>${x.matricula}</td>
          <td>${x.nome}</td>
          <td>${x.area}</td>
          <td>${x.realizado}</td>
          <td>${x.participantes}</td>
        </tr>
      `;
  });

  document.getElementById('tabelaColaboradoresDss').innerHTML = html;
}

document
  .getElementById('btnAplicarDss')
  .addEventListener('click', aplicarFiltrosDss);
document.getElementById('btnLimparDss').addEventListener('click', () => {
  document.getElementById('buscaDss').value = '';
  document.getElementById('areaFiltroDss').value = '';
  definirMesAtual();
  aplicarFiltrosDss();
});

document
  .getElementById('areaFiltroDss')
  .addEventListener('change', aplicarFiltrosDss);

document
  .getElementById('buscaDss')
  .addEventListener('keyup', aplicarFiltrosDss);
// MENU MOBILE
// MENU MOBILE - DSS
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
    });

    sidebar.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      sidebar.classList.remove('active');
    });
  }
});
