const params = new URLSearchParams(window.location.search);

const matricula = params.get('id').trim().toUpperCase();
const inicioParam = params.get('inicio');
const fimParam = params.get('fim');
fetch(`./data/dados_publico.json?v=${Date.now()}`, { cache: 'no-store' })
  .then((response) => response.json())
  .then((data) => {
    let inspetor = data.inspetores.find(
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

    inspetor = obterConfiguracaoPeriodo(inspetor, inicio, fim);

    const metaPeriodo = calcularMetaPeriodo(inspetor, inicio, fim);
    const realizado = inspecoesInspetor.length;
    const realizadoAproveitado =
      calcularRealizadoAproveitado(inspetor, inicio, fim, inspecoesInspetor);

    const performanceReal =
      metaPeriodo > 0 ? (realizadoAproveitado / metaPeriodo) * 100 : 0;

    const performance = Math.min(performanceReal, 100);

    const gap = Math.max(metaPeriodo - realizadoAproveitado, 0);

    document.getElementById('matricula').innerHTML = inspetor.matricula;
    document.getElementById('nome_inspetor').innerHTML = inspetor.nome;
    document.getElementById('meta_mes').innerHTML = inspetor.sem_meta ? 'Sem meta cadastrada' : metaPeriodo;
    document.getElementById('realizado').innerHTML = realizado;
    document.getElementById('performance').innerHTML =
      inspetor.sem_meta ? '—' : performance.toFixed(1) + '%';
    document.getElementById('gap').innerHTML = inspetor.sem_meta ? '—' : gap;

    const periodos = obterPeriodosMetas(inspetor, inicio, fim).map(periodo => ({
      ...periodo,
      realizado: inspecoesInspetor.filter(item => {
        const data = new Date(item.data + 'T00:00:00');
        return data >= periodo.inicio && data <= periodo.fim;
      }).length,
    }));

    let html = '';

    periodos.forEach((p) => {
      const aproveitado = Math.min(p.realizado, p.meta);

      html += `
        <tr>
          <td>${p.nome}</td>
          <td>${p.meta === null ? 'Sem meta' : p.meta}</td>
          <td>${p.realizado}</td>
          <td>${p.meta === null ? '—' : aproveitado}</td>
        </tr>
      `;
    });

    document.getElementById('periodos').innerHTML = html;
  });

const linkVoltar = document.querySelector('.voltar');

if (linkVoltar) {
  let urlVoltar = 'index.html';

  if (inicioParam && fimParam) {
    urlVoltar += `?inicio=${inicioParam}&fim=${fimParam}`;
  }

  linkVoltar.href = urlVoltar;
}
