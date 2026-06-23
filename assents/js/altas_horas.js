let inspetoresAltasHoras = [];
let inspecoesAltasHoras = [];

const paramsAltasHoras = new URLSearchParams(window.location.search);
const inicioUrlAltasHoras = paramsAltasHoras.get('inicio');
const fimUrlAltasHoras = paramsAltasHoras.get('fim');

fetch(`./data/altas_horas_publico.json?v=${Date.now()}`, { cache: 'no-store' })
  .then((response) => response.json())
  .then((json) => {
    inspetoresAltasHoras = json.inspetores || [];
    inspecoesAltasHoras = json.inspecoes || [];

    document.getElementById('atualizadoAltasHoras').innerHTML =
      json.atualizado_em || '';

    definirMesAtualAltasHoras();
    preencherAreasAltasHoras();
    aplicarFiltrosAltasHoras();
  });

function definirMesAtualAltasHoras() {
  if (inicioUrlAltasHoras && fimUrlAltasHoras) {
    document.getElementById('dataInicioAltasHoras').value = inicioUrlAltasHoras;
    document.getElementById('dataFimAltasHoras').value = fimUrlAltasHoras;
    return;
  }

  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  document.getElementById('dataInicioAltasHoras').value = primeiroDia
    .toISOString()
    .split('T')[0];

  document.getElementById('dataFimAltasHoras').value = ultimoDia
    .toISOString()
    .split('T')[0];
}

function preencherAreasAltasHoras() {
  const select = document.getElementById('areaFiltroAltasHoras');
  const areas = [
    ...new Set(inspetoresAltasHoras.map((item) => item.area).filter(Boolean)),
  ].sort();

  select.innerHTML = `<option value="">Todas as areas</option>`;

  areas.forEach((area) => {
    const option = document.createElement('option');
    option.value = area;
    option.textContent = area;
    select.appendChild(option);
  });
}

function obterStatusTextoAltasHoras(status) {
  const textos = {
    verde: 'No prazo',
    amarelo: 'Atencao',
    vermelho: 'Abaixo',
  };

  return textos[status] || 'Abaixo';
}

function aplicarFiltrosAltasHoras() {
  const busca = document
    .getElementById('buscaAltasHoras')
    .value
    .toLowerCase();
  const areaSelecionada = document.getElementById(
    'areaFiltroAltasHoras',
  ).value;
  const inicio = document.getElementById('dataInicioAltasHoras').value;
  const fim = document.getElementById('dataFimAltasHoras').value;

  const dataInicio = new Date(inicio + 'T00:00:00');
  const dataFim = new Date(fim + 'T23:59:59');

  const inspecoesFiltradas = inspecoesAltasHoras.filter((item) => {
    if (!item.data || item.data === 'None') return false;

    const dataInspecao = new Date(item.data + 'T00:00:00');

    return dataInspecao >= dataInicio && dataInspecao <= dataFim;
  });

  const realizadosPorMatricula = {};

  inspecoesFiltradas.forEach((item) => {
    realizadosPorMatricula[item.matricula] =
      (realizadosPorMatricula[item.matricula] || 0) + 1;
  });

  let painel = inspetoresAltasHoras.map((inspetor) => {
    const meta = Number(inspetor.meta_altas_horas) || 0;
    const realizado = realizadosPorMatricula[inspetor.matricula] || 0;
    const performanceReal = meta > 0 ? (realizado / meta) * 100 : 0;
    const performance = Math.min(performanceReal, 100);

    let status = 'vermelho';

    if (performance >= 100) {
      status = 'verde';
    } else if (performance >= 70) {
      status = 'amarelo';
    }

    return {
      ...inspetor,
      meta,
      realizado,
      performance: Number(performance.toFixed(1)),
      status,
    };
  });

  if (areaSelecionada) {
    painel = painel.filter((item) => item.area === areaSelecionada);
  }

  if (busca) {
    painel = painel.filter(
      (item) =>
        item.nome.toLowerCase().includes(busca) ||
        item.matricula.toLowerCase().includes(busca),
    );
  }

  painel.sort((a, b) => {
    if (b.performance !== a.performance) {
      return b.performance - a.performance;
    }

    return b.realizado - a.realizado;
  });

  renderizarTabelaAltasHoras(painel);
  atualizarCardsAltasHoras(painel);
}

function renderizarTabelaAltasHoras(dados) {
  if (dados.length === 0) {
    document.getElementById('tabelaAltasHoras').innerHTML = `
      <tr>
        <td colspan="7" class="estado-vazio">
          Nenhum inspetor encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  const html = dados
    .map(
      (item) => `
        <tr>
          <td>${item.matricula}</td>
          <td>${item.nome}</td>
          <td>${item.area}</td>
          <td>${item.meta}</td>
          <td>${item.realizado}</td>
          <td>${item.performance}%</td>
          <td>
            <span class="status-badge ${item.status}">
              <span class="status ${item.status}"></span>
              ${obterStatusTextoAltasHoras(item.status)}
            </span>
          </td>
        </tr>
      `,
    )
    .join('');

  document.getElementById('tabelaAltasHoras').innerHTML = html;
}

function atualizarCardsAltasHoras(dados) {
  const colaboradores = dados.length;
  const meta = dados.reduce((soma, item) => soma + item.meta, 0);
  const realizado = dados.reduce((soma, item) => soma + item.realizado, 0);
  const realizadoAproveitado = dados.reduce(
    (soma, item) => soma + Math.min(item.realizado, item.meta),
    0,
  );
  const performance =
    meta > 0 ? Math.min((realizadoAproveitado / meta) * 100, 100) : 0;

  document.getElementById('colaboradoresAltasHoras').innerHTML =
    colaboradores;
  document.getElementById('metaAltasHoras').innerHTML = meta;
  document.getElementById('realizadoAltasHoras').innerHTML = realizado;
  document.getElementById('performanceAltasHoras').innerHTML =
    performance.toFixed(1) + '%';
}

document
  .getElementById('buscaAltasHoras')
  .addEventListener('keyup', aplicarFiltrosAltasHoras);
document
  .getElementById('areaFiltroAltasHoras')
  .addEventListener('change', aplicarFiltrosAltasHoras);
document
  .getElementById('btnAplicarAltasHoras')
  .addEventListener('click', aplicarFiltrosAltasHoras);
document
  .getElementById('btnLimparAltasHoras')
  .addEventListener('click', () => {
    document.getElementById('buscaAltasHoras').value = '';
    document.getElementById('areaFiltroAltasHoras').value = '';
    definirMesAtualAltasHoras();
    aplicarFiltrosAltasHoras();
  });

const menuBtnAltasHoras = document.getElementById('menuToggle');
const sidebarAltasHoras = document.getElementById('sidebar');

if (menuBtnAltasHoras) {
  menuBtnAltasHoras.addEventListener('click', () => {
    sidebarAltasHoras.classList.toggle('active');
  });

  document.addEventListener('click', (event) => {
    const clicouNoMenu = sidebarAltasHoras.contains(event.target);
    const clicouBotao = menuBtnAltasHoras.contains(event.target);

    if (!clicouNoMenu && !clicouBotao) {
      sidebarAltasHoras.classList.remove('active');
    }
  });
}
