#!/usr/bin/env node
/**
 * Runner de tests automatizados para la lógica de dominio (Florería Elizabeth).
 * Ejecutar: npm test  o  node run-tests.js
 * Las funciones puras se prueban en Node; los tests que usan localStorage se ejecutan en el navegador (tests.js).
 */
const domain = require('./js/domain.js');

let failed = 0;

function assertEqual(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed++;
    console.error('FAIL ' + name + ' — esperado ' + JSON.stringify(expected) + ', obtenido ' + JSON.stringify(actual));
  } else {
    console.log('OK   ' + name);
  }
}

// calcularResumenDia
const base = { ef: 10000, tb: 5000, gastos: [{ monto: 3000 }, { monto: 2000 }] };
const r = domain.calcularResumenDia(base);
assertEqual('calcularResumenDia.totI', r.totI, 15000);
assertEqual('calcularResumenDia.totG', r.totG, 5000);
assertEqual('calcularResumenDia.neto', r.neto, 10000);

const sinVentas = { ef: 0, tb: 0, gastos: [] };
const r2 = domain.calcularResumenDia(sinVentas);
assertEqual('calcularResumenDia.sinVentas.totI', r2.totI, 0);
assertEqual('calcularResumenDia.sinVentas.totG', r2.totG, 0);
assertEqual('calcularResumenDia.sinVentas.neto', r2.neto, 0);

const perdida = { ef: 0, tb: 10000, gastos: [{ monto: 15000 }] };
const r3 = domain.calcularResumenDia(perdida);
assertEqual('calcularResumenDia.perdida.totI', r3.totI, 10000);
assertEqual('calcularResumenDia.perdida.totG', r3.totG, 15000);
assertEqual('calcularResumenDia.perdida.neto', r3.neto, -5000);

// normalizeDayData
const n1 = domain.normalizeDayData(null);
assertEqual('normalizeDayData.null.gastos.length', n1.gastos.length, 0);
assertEqual('normalizeDayData.null.ef', n1.ef, 0);

const n2 = domain.normalizeDayData({ ef: 100, tb: 200, gastos: [{ desc: 'x', monto: 50 }] });
assertEqual('normalizeDayData.ef', n2.ef, 100);
assertEqual('normalizeDayData.tb', n2.tb, 200);
assertEqual('normalizeDayData.gastos.length', n2.gastos.length, 1);
assertEqual('normalizeDayData.gastos[0].monto', n2.gastos[0].monto, 50);
assertEqual('normalizeDayData.gastos[0].desc', n2.gastos[0].desc, 'x');
if (typeof n2.gastos[0].id !== 'number') {
  failed++;
  console.error('FAIL normalizeDayData.gastos[0].id debe ser número', n2.gastos[0]);
} else {
  console.log('OK   normalizeDayData.gastos[0].id');
}

const n3 = domain.normalizeDayData({ gastos: [{ monto: 10 }] });
assertEqual('normalizeDayData.sinId.ef', n3.ef, 0);
assertEqual('normalizeDayData.sinId.gastos[0].monto', n3.gastos[0].monto, 10);
if (typeof n3.gastos[0].id !== 'number') {
  failed++;
  console.error('FAIL normalizeDayData asigna id a gasto sin id', n3.gastos[0]);
} else {
  console.log('OK   normalizeDayData.gastos[0].id asignado');
}

// validarEstructuraBackup
const v1 = domain.validarEstructuraBackup(null);
assertEqual('validarEstructuraBackup.null.ok', v1.ok, false);

const backupValido = {};
backupValido['fe_2025-01-15'] = JSON.stringify({ ef: 0, tb: 0, gastos: [] });
const v2 = domain.validarEstructuraBackup(backupValido);
assertEqual('validarEstructuraBackup.válido.ok', v2.ok, true);

const v3 = domain.validarEstructuraBackup({});
assertEqual('validarEstructuraBackup.vacío.ok', v3.ok, false);

// getPromedioMovil7, getDiasVerdes, getRachaCierres
assertEqual('getPromedioMovil7.vacío', domain.getPromedioMovil7([]), 0);
assertEqual('getPromedioMovil7.7valores', domain.getPromedioMovil7([10, 20, 30, 40, 50, 60, 70]), 40);

const verdes = domain.getDiasVerdes([{ neto: 100 }, { neto: -10 }, { neto: 0 }]);
assertEqual('getDiasVerdes.total', verdes.total, 3);
assertEqual('getDiasVerdes.verdes', verdes.verdes, 2);

assertEqual('getRachaCierres.vacío', domain.getRachaCierres([]), 0);
assertEqual('getRachaCierres.racha3', domain.getRachaCierres([{ cerrado: true }, { cerrado: true }, { cerrado: true }, { cerrado: false }]), 3);

// parseMontoInput
assertEqual('parseMontoInput.vacío', Number.isNaN(domain.parseMontoInput('')), true);
assertEqual('parseMontoInput.null', Number.isNaN(domain.parseMontoInput(null)), true);
assertEqual('parseMontoInput.número', domain.parseMontoInput('85000'), 85000);
assertEqual('parseMontoInput.con puntos', domain.parseMontoInput('85.000'), 85000);
assertEqual('parseMontoInput.solo puntos', Number.isNaN(domain.parseMontoInput('...')), true);
assertEqual('parseMontoInput.negativo', domain.parseMontoInput('-100'), -100);

// clampCorteDia
assertEqual('clampCorteDia.válido', domain.clampCorteDia(15, 31), 15);
assertEqual('clampCorteDia.menor a 1', domain.clampCorteDia(0, 31), null);
assertEqual('clampCorteDia.mayor que días', domain.clampCorteDia(32, 31), 31);
assertEqual('clampCorteDia.clamp 1', domain.clampCorteDia(1, 28), 1);
assertEqual('clampCorteDia.inválido', domain.clampCorteDia('x', 31), null);

// totalesHastaDia
const itemsMes = [
  { dia: 1, ef: 10000, tb: 5000, gs: 2000 },
  { dia: 2, ef: 8000, tb: 4000, gs: 1000 },
  { dia: 3, ef: 12000, tb: 6000, gs: 3000 }
];
const t1 = domain.totalesHastaDia(itemsMes, 2);
assertEqual('totalesHastaDia.hasta dia 2 totIng', t1.totIng, 10000 + 5000 + 8000 + 4000);
assertEqual('totalesHastaDia.hasta dia 2 totGs', t1.totGs, 2000 + 1000);
assertEqual('totalesHastaDia.hasta dia 2 totNeto', t1.totNeto, 27000 - 3000);
const t2 = domain.totalesHastaDia(itemsMes, 5);
assertEqual('totalesHastaDia.hasta dia 5 totIng', t2.totIng, 45000);
assertEqual('totalesHastaDia.vacío', domain.totalesHastaDia([], 10).totIng, 0);

if (failed > 0) {
  console.error('\n' + failed + ' test(s) fallaron.');
  process.exit(1);
}
console.log('\nTodos los tests de dominio pasaron.');
