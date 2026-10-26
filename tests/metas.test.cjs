const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
vm.runInThisContext(fs.readFileSync('assents/js/metas.js', 'utf8'));
const data = texto => new Date(texto + 'T00:00:00');
const pessoa = { metas_por_referencia: {
  '2026-10': { classificacao: 'Ciclo+10', meta_01_10: 4, meta_11_20: 3, meta_21_31: 3 },
  '2026-11': { classificacao: 'Inspeção', meta_01_10: 1, meta_11_20: 1, meta_21_31: 0 },
  '2028-02': { classificacao: 'Ciclo+10', meta_01_10: 4, meta_11_20: 3, meta_21_31: 9 },
} };
assert.equal(calcularMetaPeriodo(pessoa, data('2026-10-01'), data('2026-10-31')), 10);
assert.equal(calcularMetaPeriodo(pessoa, data('2026-11-01'), data('2026-11-30')), 2);
assert.equal(calcularMetaPeriodo(pessoa, data('2026-10-01'), data('2026-11-30')), 12);
assert.equal(calcularMetaPeriodo(pessoa, data('2026-10-06'), data('2026-10-10')), 2);
assert.equal(calcularMetaPeriodo(pessoa, data('2028-02-29'), data('2028-02-29')), 1);
assert.equal(obterConfiguracaoPeriodo(pessoa, data('2026-11-01'), data('2026-11-30')).classificacao, 'Inspeção');
assert.equal(obterConfiguracaoPeriodo(pessoa, data('2026-12-01'), data('2026-12-31')).sem_meta, true);
assert.equal(calcularMetaPeriodo(pessoa, data('2026-12-01'), data('2026-12-31')), 0);
const inspecoes = ['2026-10-01','2026-10-01','2026-10-01','2026-10-01','2026-10-01',
  '2026-11-01','2026-11-01','2026-11-01'].map(data => ({data}));
assert.equal(calcularRealizadoAproveitado(pessoa, data('2026-10-01'), data('2026-11-30'), inspecoes), 6);
assert.equal(calcularRealizadoAproveitado(pessoa, data('2026-10-06'), data('2026-10-10'), inspecoes), 0);
const antigo = pessoa.metas_por_referencia['2026-10'];
assert.equal(calcularMetaPeriodo(antigo, data('2026-10-01'), data('2026-10-31')), 10);
const fixo = { ...antigo, referencia_base: '2026-09' };
for (const [inicio, fim] of [['2026-09-01', '2026-09-30'], ['2026-10-01', '2026-10-31'], ['2027-01-01', '2027-01-31']]) {
  assert.equal(calcularMetaPeriodo(fixo, data(inicio), data(fim)), 10);
  assert.equal(obterConfiguracaoPeriodo(fixo, data(inicio), data(fim)).classificacao, 'Ciclo+10');
  assert.equal(obterConfiguracaoPeriodo(fixo, data(inicio), data(fim)).sem_meta, false);
}
assert.equal(calcularMetaPeriodo(fixo, data('2026-09-01'), data('2026-10-31')), 20);
console.log('OK: metas mensais, classificação, ausência, períodos parciais, aproveitamento, ano bissexto e JSON legado.');

async function testarTela(arquivo, mes, esperado) {
  const elementos = {};
  const elemento = id => elementos[id] ||= {
    value: '', checked: false, innerHTML: '', open: false,
    addEventListener() {}, contains() { return false; },
    classList: { toggle() {}, remove() {} },
  };
  const json = { atualizado_em: 'teste', inspetores: [{...pessoa,
    matricula: 'INSPETOR_01', nome: 'Colaborador Teste', area: 'STC'}], inspecoes: [] };
  const contexto = vm.createContext({
    Date, URLSearchParams, console,
    window: { location: { search: `?id=INSPETOR_01&inicio=2026-${mes}-01&fim=2026-${mes}-${mes === '10' ? '31' : '30'}` } },
    document: { getElementById: elemento, querySelectorAll: () => [],
      querySelector: () => elemento('voltar'), addEventListener() {} },
    fetch: async () => ({json: async () => json}),
  });
  vm.runInContext(fs.readFileSync('assents/js/metas.js', 'utf8'), contexto);
  vm.runInContext(fs.readFileSync(arquivo, 'utf8'), contexto);
  await new Promise(resolve => setImmediate(resolve));
  const detalhe = arquivo.includes('detalhe');
  assert.equal(elementos[detalhe ? 'meta_mes' : 'metaGeral'].innerHTML, esperado);
  if (!detalhe) assert.ok(elementos.tabelaInspetores.innerHTML.includes(mes === '10' ? 'Ciclo+10' : 'Inspeção'));
  else assert.ok(elementos.periodos.innerHTML.includes(`${mes}/2026`));
}
(async () => {
  for (const arquivo of ['assents/js/app.js', 'assents/js/detalhe.js']) {
    await testarTela(arquivo, '10', 10);
    await testarTela(arquivo, '11', 2);
  }
  console.log('OK: telas principal e detalhe exibem metas de outubro e novembro sem duplicar colaboradores.');
})().catch(erro => { console.error(erro); process.exitCode = 1; });
