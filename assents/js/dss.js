let metasArea = [];
let dss = [];

fetch('./data/dss_publico.json')
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
  const areas = metasArea.length;

  const meta = metasArea.reduce((soma, item) => soma + item.meta, 0);

  // Realizado = soma dos participantes
  const realizado = dados.reduce(
    (soma, item) => soma + (Number(item.participantes) || 0),
    0,
  );

  // Participantes também é a mesma soma
  const participantes = realizado;

  const performance = meta > 0 ? Math.min((realizado / meta) * 100, 100) : 0;

  document.getElementById('areasDss').innerHTML = areas;
  document.getElementById('metaDss').innerHTML = meta;
  document.getElementById('realizadoDss').innerHTML = realizado;
  document.getElementById('performanceDss').innerHTML =
    performance.toFixed(1) + '%';
  document.getElementById('participantesDss').innerHTML = participantes;
}

function atualizarTabelaArea(dados) {
  let html = '';

  metasArea.forEach((metaArea) => {
    const registros = dados.filter((x) => x.area === metaArea.area);

    // quantidade de DSS
    const quantidade = registros.length;

    // soma participantes
    const realizado = registros.reduce(
      (soma, item) => soma + (item.participantes || 0),
      0,
    );

    const gap = metaArea.meta - realizado;

    const performance =
      metaArea.meta > 0 ? Math.min((realizado / metaArea.meta) * 100, 100) : 0;

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
          <td>${metaArea.meta}</td>
          <td>${realizado}</td>
          <td>${gap}</td>
          <td>
            ${performance.toFixed(1)}%
          </td>
          <td>
            <span class="status ${status}">
            </span>
          </td>
        </tr>
      `;
  });

  document.getElementById('tabelaAreasDss').innerHTML = html;
}

function atualizarTabelaColaborador(dados) {
  const resumo = {};

  dados.forEach((x) => {
    const chave = x.matricula;

    if (!resumo[chave]) {
      resumo[chave] = {
        matricula: x.matricula,

        nome: x.nome,

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

document
  .getElementById('areaFiltroDss')
  .addEventListener('change', aplicarFiltrosDss);

document
  .getElementById('buscaDss')
  .addEventListener('keyup', aplicarFiltrosDss);
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
