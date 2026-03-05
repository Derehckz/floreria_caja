/**
 * Genera un JSON de respaldo con muchos días y datos variados
 * para probar tarjetas (Caja, Mes, Histórico) y el sistema.
 * Uso: node scripts/generar-backup-prueba.js
 * Salida: floreria-backup-prueba.json
 */

const fs = require('fs');
const PREFIX = 'fe_';

function dateKey(y, m, d) {
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

// Genera datos variados por día (ef, tb, gastos, nota, cerrado)
function generarDia(y, m, d, seed) {
  const rand = (mul) => ((seed * 9301 + 49297) % 233280) / 233280;
  const ef = Math.round(15000 + rand() * 80000);
  const tb = Math.round(5000 + rand() * 45000);
  const numGastos = Math.floor(rand() * 4);
  const gastos = [];
  const descs = ['Flores', 'Embalaje', 'Flete', 'Otro', 'Insumos'];
  for (let i = 0; i < numGastos; i++) {
    gastos.push({
      id: Date.now() + seed * 1000 + i,
      desc: descs[Math.floor(rand() * descs.length)],
      monto: Math.round(1000 + rand() * 15000),
      hora: ''
    });
  }
  const notas = ['', 'Día tranquilo', 'Mucho pedido', 'Evento', 'Feriado', 'Cierre temprano'];
  const nota = rand() > 0.6 ? notas[Math.floor(rand() * notas.length)] : '';
  const cerrado = rand() > 0.15;
  const cerradoHora = cerrado ? (rand() > 0.5 ? '22:30' : '21:00') : undefined;
  return {
    ef,
    tb,
    gastos,
    nota,
    cerrado,
    ...(cerradoHora && { cerradoHora })
  };
}

const backup = {};

// 2024: varios meses con muchos días
for (const [y, meses] of [[2024, [6, 7, 8, 9, 10]]]) {
  for (const m of meses) {
    const dias = daysInMonth(y, m);
    for (let d = 1; d <= dias; d++) {
      const key = PREFIX + dateKey(y, m, d);
      const seed = y * 10000 + m * 100 + d;
      backup[key] = JSON.stringify(generarDia(y, m, d, seed));
    }
  }
}

// 2025: ene, feb y mar (para tener "mes actual" y "esta semana")
for (const [y, meses] of [[2025, [1, 2, 3]]]) {
  for (const m of meses) {
    const dias = daysInMonth(y, m);
    for (let d = 1; d <= dias; d++) {
      const key = PREFIX + dateKey(y, m, d);
      const seed = y * 10000 + m * 100 + d;
      backup[key] = JSON.stringify(generarDia(y, m, d, seed));
    }
  }
}

backup[PREFIX + 'meta'] = JSON.stringify({
  lastBackupAt: new Date().toISOString()
});

const ruta = require('path').join(__dirname, '..', 'floreria-backup-prueba.json');
fs.writeFileSync(ruta, JSON.stringify(backup, null, 2), 'utf8');
console.log('Generado:', ruta);
console.log('Días en el respaldo:', Object.keys(backup).filter(k => /^fe_\d{4}-\d{2}-\d{2}$/.test(k)).length);
