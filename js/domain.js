/* ──────────────────────────────────────────────────
   DOMINIO · Funciones puras (sin DOM ni localStorage)
   Florería Elizabeth · Caja
────────────────────────────────────────────────── */
function todayObj() {
  var n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
}
function dateKey(o) {
  return o.y + '-' + String(o.m).padStart(2, '0') + '-' + String(o.d).padStart(2, '0');
}
function isToday(o) {
  return dateKey(o) === dateKey(todayObj());
}

function normalizeDayData(raw) {
  if (!raw || typeof raw !== 'object') return { ef: 0, tb: 0, gastos: [], nota: '', cerrado: false };
  var ef = typeof raw.ef === 'number' && raw.ef >= 0 && isFinite(raw.ef) ? raw.ef : 0;
  var tb = typeof raw.tb === 'number' && raw.tb >= 0 && isFinite(raw.tb) ? raw.tb : 0;
  var gastos = Array.isArray(raw.gastos) ? raw.gastos : [];
  gastos = gastos.map(function (g, i) {
    if (!g || typeof g !== 'object') return { id: Date.now() + i, desc: '', monto: 0, hora: '' };
    var monto = typeof g.monto === 'number' && g.monto >= 0 && isFinite(g.monto) ? g.monto : 0;
    var desc = typeof g.desc === 'string' ? String(g.desc).substring(0, 200) : '';
    var id = typeof g.id === 'number' && isFinite(g.id) ? g.id : Date.now() + i;
    return { id: id, desc: desc, monto: monto, hora: typeof g.hora === 'string' ? g.hora : '' };
  });
  var nota = typeof raw.nota === 'string' ? String(raw.nota).substring(0, 2000) : '';
  var out = {};
  for (var key in raw) { if (Object.prototype.hasOwnProperty.call(raw, key)) out[key] = raw[key]; }
  out.ef = ef; out.tb = tb; out.gastos = gastos; out.nota = nota; out.cerrado = !!raw.cerrado;
  return out;
}

function calcularResumenDia(estadoDia) {
  var gastos = estadoDia.gastos || [];
  var totG = gastos.reduce(function (s, g) { return s + g.monto; }, 0);
  var totI = (estadoDia.ef || 0) + (estadoDia.tb || 0);
  var neto = totI - totG;
  var mrg = totI > 0 ? Math.max(0, (neto / totI) * 100) : 0;
  return { gastos: gastos, totG: totG, totI: totI, neto: neto, mrg: mrg };
}

function validarEstructuraBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, message: 'Archivo inválido: no es un objeto JSON.' };
  var dayKeyRe = /^fe_\d{4}-\d{2}-\d{2}$/;
  var tieneClaveDia = false, primeraClaveDia = null;
  for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k) && dayKeyRe.test(k)) { tieneClaveDia = true; if (primeraClaveDia == null) primeraClaveDia = k; } }
  if (!tieneClaveDia || !primeraClaveDia) return { ok: false, message: 'Este archivo no parece un respaldo de Florería Elizabeth.' };
  var raw = data[primeraClaveDia];
  if (typeof raw !== 'string' || raw.length > 50000) return { ok: false, message: 'Formato de datos incorrecto.' };
  var obj; try { obj = JSON.parse(raw); } catch (e) { return { ok: false, message: 'Contenido dañado.' }; }
  if (!obj || typeof obj !== 'object') return { ok: false, message: 'Cada día debe ser un objeto.' };
  if ((typeof obj.ef !== 'number' && obj.ef !== undefined) || (typeof obj.tb !== 'number' && obj.tb !== undefined) || !Array.isArray(obj.gastos) && obj.gastos !== undefined) return { ok: false, message: 'No es un respaldo de Florería Elizabeth.' };
  return { ok: true };
}

function getPromedioMovil7(ingresosPorDia) {
  if (!ingresosPorDia || ingresosPorDia.length === 0) return 0;
  var arr = ingresosPorDia.slice(-7);
  return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0;
}
function getTendenciaSemanalPct(ingEstaSemana, ingSemanaAnterior) {
  if (!ingSemanaAnterior || ingSemanaAnterior === 0) return null;
  return ((ingEstaSemana - ingSemanaAnterior) / ingSemanaAnterior) * 100;
}
function getEsDiaAnomalo(ingresoDia, promedioMes, factorAlto, factorBajo) {
  if (promedioMes <= 0) return null;
  if (ingresoDia >= promedioMes * (factorAlto || 2)) return 'pico';
  if (ingresoDia > 0 && ingresoDia <= promedioMes * (factorBajo || 0.3)) return 'bajo';
  return null;
}
function getDiasVerdes(dayDataItems) {
  if (!dayDataItems || dayDataItems.length === 0) return { total: 0, verdes: 0 };
  var verdes = dayDataItems.filter(function (item) { return (item.neto || 0) >= 0; }).length;
  return { total: dayDataItems.length, verdes: verdes };
}
function getRachaCierres(daysWithCerrado) {
  if (!daysWithCerrado || daysWithCerrado.length === 0) return 0;
  var racha = 0;
  for (var i = 0; i < daysWithCerrado.length; i++) { if (daysWithCerrado[i].cerrado) racha++; else break; }
  return racha;
}

/**
 * Parsea un string de monto (ej. input de usuario). Quita espacios, puntos y comas; devuelve número o NaN.
 * @param {string} raw - Valor en bruto
 * @returns {number} - Número entero o NaN si no es válido
 */
function parseMontoInput(raw) {
  if (!raw || typeof raw !== 'string') return NaN;
  var limpio = raw.trim().replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
  var n = parseInt(limpio, 10);
  return isNaN(n) ? NaN : n;
}

/**
 * Ajusta el día de corte al rango válido 1..diasEnMes.
 * @param {number} d - Valor ingresado
 * @param {number} diasEnMes - Días del mes (ej. 28, 30, 31)
 * @returns {number|null} - Número entre 1 y diasEnMes, o null si d no es válido
 */
function clampCorteDia(d, diasEnMes) {
  var n = parseInt(d, 10);
  if (!diasEnMes || diasEnMes < 1) return null;
  if (isNaN(n) || n < 1) return null;
  return Math.min(Math.max(1, n), diasEnMes);
}

/**
 * Totales hasta un día de corte a partir de una lista de días con ef, tb, gs.
 * @param {Array<{dia: number, ef?: number, tb?: number, gs?: number}>} items - Lista de días (dia = número de día)
 * @param {number} dia - Día de corte (incluido)
 * @returns {{ totEf: number, totTb: number, totGs: number, totIng: number, totNeto: number, mrg: string }}
 */
function totalesHastaDia(items, dia) {
  if (!items || !Array.isArray(items)) return { totEf: 0, totTb: 0, totGs: 0, totIng: 0, totNeto: 0, mrg: '0.0' };
  var hasta = items.filter(function (item) { return item.dia <= dia; });
  var totEf = 0, totTb = 0, totGs = 0;
  hasta.forEach(function (item) {
    totEf += item.ef || 0;
    totTb += item.tb || 0;
    totGs += item.gs || 0;
  });
  var totIng = totEf + totTb;
  var totNeto = totIng - totGs;
  var mrg = totIng > 0 ? ((totNeto / totIng) * 100).toFixed(1) : '0.0';
  return { totEf: totEf, totTb: totTb, totGs: totGs, totIng: totIng, totNeto: totNeto, mrg: mrg };
}

// Export para tests en Node (runner automatizado)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    todayObj,
    dateKey,
    isToday,
    normalizeDayData,
    calcularResumenDia,
    validarEstructuraBackup,
    getPromedioMovil7,
    getTendenciaSemanalPct,
    getEsDiaAnomalo,
    getDiasVerdes,
    getRachaCierres,
    parseMontoInput,
    clampCorteDia,
    totalesHastaDia
  };
}
