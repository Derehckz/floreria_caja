/* ──────────────────────────────────────────────────
   ALMACENAMIENTO · localStorage (depende de domain.js)
   Florería Elizabeth · Caja
────────────────────────────────────────────────── */
var PREFIX = 'fe_';

function loadDay(o) {
  var key = PREFIX + dateKey(o);
  try {
    var r = localStorage.getItem(key);
    if (!r) return { ef: 0, tb: 0, gastos: [], nota: '' };
    return normalizeDayData(JSON.parse(r));
  } catch (err) {
    console.warn('loadDay failed', key, err);
    if (typeof toast === 'function') toast('Error al cargar el día; se muestra vacío.');
    return { ef: 0, tb: 0, gastos: [], nota: '' };
  }
}

/** Guarda el día en localStorage. Devuelve true si guardó bien, false si falló (QuotaExceeded, etc.). */
function saveDay(o, data) {
  try {
    var normalized = normalizeDayData(data);
    localStorage.setItem(PREFIX + dateKey(o), JSON.stringify(normalized));
    return true;
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      if (typeof toast === 'function') toast('Memoria llena. Haz un backup.');
    } else {
      if (typeof toast === 'function') toast('No se pudo guardar.');
    }
    return false;
  }
}

function allDayKeys() {
  var keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf(PREFIX) === 0 && k !== PREFIX + 'meta') keys.push(k.replace(PREFIX, ''));
  }
  return keys.sort();
}

function getDaysOfMonth(y, m) {
  var keys = allDayKeys();
  var mm = String(m).length < 2 ? '0' + m : '' + m;
  var prefix = y + '-' + mm;
  return keys.filter(function (k) { return k.indexOf(prefix) === 0; }).map(function (k) {
    var p = k.split('-');
    return { y: parseInt(p[0], 10), m: parseInt(p[1], 10), d: parseInt(p[2], 10) };
  });
}
