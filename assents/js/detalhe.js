const params = new URLSearchParams(window.location.search);

const matricula = params.get('id').trim().toUpperCase();
const inicioParam = params.get('inicio');
const fimParam = params.get('fim');
fetch(`./data/dados_publico.json?v=${Date.now()}`, { cache: 'no-store' })
  .then((response) => response.json())
  .then((data) => {
    const inspetor = data.inspetores.find(
      (x) => x.matricula.trim().toUpperCase() === matricula,
    );

    if (!inspetor) {
      document.body.innerHTML = '<h1>Inspetor não encontrado</h1>';
      return;
    }

    let inicio;
    let fim;

    if (inicioParam && fimParam) {
      inicio = new Date(inicioParam + 'T00:00:00');
      fim = new Date(fimParam + 'T23:59:59');
    } else {
      const hoje = new Date();

      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      fim.setHours(23, 59, 59, 999);
    }

    fim.setHours(23, 59, 59, 999);

    const inspecoesInspetor = data.inspecoes.filter((i) => {
      if (!i.data || i.data === 'None') return false;

      const dataInspecao = new Date(i.data + 'T00:00:00');

      return (
        i.matricula === matricula &&
        dataInspecao >= inicio &&
        dataInspecao <= fim
      );
    });

    const realizado = inspecoesInspetor.length;
    const metaPeriodo = calcularMetaPeriodo(inspetor, inicio, fim);

    const performanceReal =
      metaPeriodo > 0 ? (realizado / metaPeriodo) * 100 : 0;

    const performance = Math.min(performanceReal, 100);

    const gap = Math.max(metaPeriodo - realizado, 0);

    document.getElementById('matricula').innerHTML = inspetor.matricula;
    document.getElementById('nome_inspetor').innerHTML = inspetor.nome;
    document.getElementById('meta_mes').innerHTML = metaPeriodo;
    document.getElementById('realizado').innerHTML = realizado;
    document.getElementById('performance').innerHTML =
      performance.toFixed(1) + '%';
    document.getElementById('gap').innerHTML = gap;

    const real_01_10 = inspecoesInspetor.filter((i) => {
      const dia = Number(i.data.split('-')[2]);
      return dia >= 1 && dia <= 10;
    }).length;

    const real_11_20 = inspecoesInspetor.filter((i) => {
      const dia = Number(i.data.split('-')[2]);
      return dia >= 11 && dia <= 20;
    }).length;

    const real_21_31 = inspecoesInspetor.filter((i) => {
      const dia = Number(i.data.split('-')[2]);
      return dia >= 21 && dia <= 31;
    }).length;

    const periodos = [
      {
        nome: '01-10',
        meta: inspetor.meta_01_10,
        realizado: real_01_10,
      },
      {
        nome: '11-20',
        meta: inspetor.meta_11_20,
        realizado: real_11_20,
      },
      {
        nome: '21-31',
        meta: inspetor.meta_21_31,
        realizado: real_21_31,
      },
    ];

    let html = '';

    periodos.forEach((p) => {
      const aproveitado = Math.min(p.realizado, p.meta);

      html += `
        <tr>
          <td>${p.nome}</td>
          <td>${p.meta}</td>
          <td>${p.realizado}</td>
          <td>${aproveitado}</td>
        </tr>
      `;
    });

    document.getElementById('periodos').innerHTML = html;
  });

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

  const metaCalculada = periodos.reduce((total, periodo) => {
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

  return Math.ceil(metaCalculada);
}

const linkVoltar = document.querySelector('.voltar');

if (linkVoltar) {
  let urlVoltar = 'index.html';

  if (inicioParam && fimParam) {
    urlVoltar += `?inicio=${inicioParam}&fim=${fimParam}`;
  }

  linkVoltar.href = urlVoltar;
}
