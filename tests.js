// Tests muy simples para la lógica de caja y mes.
// Ejecuta runTests() en la consola del navegador para ver resultados.

function assertEqual(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console[ok ? 'log' : 'error'](
    (ok ? 'OK   ' : 'FAIL ') + name,
    ok ? '' : `esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(actual)}`
  );
}

function testCalcularResumenDia() {
  const base = { ef: 10000, tb: 5000, gastos: [{monto: 3000},{monto:2000}] };
  const r = calcularResumenDia(base);
  assertEqual('calcularResumenDia.totI', r.totI, 15000);
  assertEqual('calcularResumenDia.totG', r.totG, 5000);
  assertEqual('calcularResumenDia.neto', r.neto, 10000);
}

function testCalcularResumenDiaSinVentas() {
  const base = { ef: 0, tb: 0, gastos: [] };
  const r = calcularResumenDia(base);
  assertEqual('calcularResumenDia.sinVentas.totI', r.totI, 0);
  assertEqual('calcularResumenDia.sinVentas.totG', r.totG, 0);
  assertEqual('calcularResumenDia.sinVentas.neto', r.neto, 0);
}

function testCalcularResumenDiaConPerdida() {
  const base = { ef: 0, tb: 10000, gastos: [{monto: 15000}] };
  const r = calcularResumenDia(base);
  assertEqual('calcularResumenDia.perdida.totI', r.totI, 10000);
  assertEqual('calcularResumenDia.perdida.totG', r.totG, 15000);
  assertEqual('calcularResumenDia.perdida.neto', r.neto, -5000);
}

function testGetPendientesHastaHoyEnRangoDias() {
  const r = getPendientesHastaHoyEnRangoDias(30);
  const esArray = Array.isArray(r);
  console[esArray ? 'log' : 'error']('getPendientesHastaHoyEnRangoDias retorna array', r);
}

function runTests() {
  console.log('Ejecutando tests de Florería Elizabeth...');
  try {
    testCalcularResumenDia();
    testCalcularResumenDiaSinVentas();
    testCalcularResumenDiaConPerdida();
    testGetPendientesHastaHoyEnRangoDias();
    console.log('Tests finalizados.');
  } catch (e) {
    console.error('Error al ejecutar tests', e);
  }
}

