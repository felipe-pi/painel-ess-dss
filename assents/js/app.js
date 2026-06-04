let inspetores = [];
let inspecoes = [];

const params = new URLSearchParams(window.location.search);

const inicioUrl = params.get('inicio');
const fimUrl = params.get('fim');

fetch('./data/dados_publico.json')
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

function aplicarFiltros() {
  const busca = document.getElementById('busca').value.toLowerCase();
  const areaSelecionada = document.getElementById('areaFiltro').value;
  const inicio = document.getElementById('dataInicio').value;
  const fim = document.getElementById('dataFim').value;

  const dataInicio = new Date(inicio + 'T00:00:00');
  const dataFim = new Date(fim + 'T23:59:59');

  const inspecoesFiltradas = inspecoes.filter((i) => {
    if (!i.data || i.data === 'None') return false;

    const dataInspecao = new Date(i.data + 'T00:00:00');

    return dataInspecao >= dataInicio && dataInspecao <= dataFim;
  });

  const realizados = {};

  inspecoesFiltradas.forEach((i) => {
    realizados[i.matricula] = (realizados[i.matricula] || 0) + 1;
  });

  let painel = inspetores.map((i) => {
    const realizado = realizados[i.matricula] || 0;

    const performanceReal = i.meta_mes > 0 ? (realizado / i.meta_mes) * 100 : 0;

    const performance = Math.min(performanceReal, 100);

    let status = 'vermelho';

    if (performance >= 100) {
      status = 'verde';
    } else if (performance >= 70) {
      status = 'amarelo';
    }

    const gap = Math.max(i.meta_mes - realizado, 0);

    return {
      ...i,
      realizado,
      performance: Number(performance.toFixed(1)),
      performance_real: Number(performanceReal.toFixed(1)),
      gap,
      status,
    };
  });

  if (areaSelecionada) {
    painel = painel.filter((i) => i.area === areaSelecionada);
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
        <td>${item.meta_mes}</td>
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

  const meta = dados.reduce((soma, item) => soma + item.meta_mes, 0);

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
