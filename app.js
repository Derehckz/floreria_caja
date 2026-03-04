/* ──────────────────────────────────────────────────
   ESTADO GLOBAL
────────────────────────────────────────────────── */
const DIAS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES_ES  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_SH  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function todayObj() {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth()+1, d: n.getDate() };
}
function dateKey(o) {
  return `${o.y}-${String(o.m).padStart(2,'0')}-${String(o.d).padStart(2,'0')}`;
}
function isToday(o) { return dateKey(o) === dateKey(todayObj()); }

let cur     = todayObj();
let curMes  = { y: cur.y, m: cur.m };
let mesCorteDia = null;
let cajaPaso = 1;
let mostrarAyudaCaja = true;

const PREFIX = 'fe_';
function loadDay(o) {
  try { const r = localStorage.getItem(PREFIX + dateKey(o)); return r ? JSON.parse(r) : {ef:0, tb:0, gastos:[], nota:''}; }
  catch { return {ef:0, tb:0, gastos:[], nota:''}; }
}
function saveDay(o, data) {
  try {
    localStorage.setItem(PREFIX + dateKey(o), JSON.stringify(data));
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      toast('No se pudo guardar: memoria llena. Libera espacio o haz un backup.');
    } else {
      toast('No se pudo guardar. Intenta de nuevo.');
    }
  }
}

let S = loadDay(cur);

/* ──────────────────────────────────────────────────
   UTILIDADES
────────────────────────────────────────────────── */
function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
function fmt(n)    { return '$' + Math.round(n).toLocaleString('es-CL'); }
function hora()    { return new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}); }

function calcularResumenDia(estadoDia) {
  const gastos = estadoDia.gastos || [];
  const totG   = gastos.reduce((s,g) => s+g.monto, 0);
  const totI   = (estadoDia.ef||0) + (estadoDia.tb||0);
  const neto   = totI - totG;
  const mrg    = totI > 0 ? Math.max(0,(neto/totI)*100) : 0;
  return { gastos, totG, totI, neto, mrg };
}

function allDayKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX) && k !== 'fe_meta') keys.push(k.replace(PREFIX,''));
  }
  return keys.sort();
}

function getDaysOfMonth(y, m) {
  const keys = allDayKeys();
  return keys.filter(k => k.startsWith(`${y}-${String(m).padStart(2,'0')}`)).map(k => {
    const p = k.split('-');
    return { y:parseInt(p[0]), m:parseInt(p[1]), d:parseInt(p[2]) };
  });
}

/* ──────────────────────────────────────────────────
   HEADER FECHA
────────────────────────────────────────────────── */
function updateDateHeader() {
  const jsDate = new Date(cur.y, cur.m-1, cur.d);
  document.getElementById('dn-day').textContent  = DIAS_ES[jsDate.getDay()];
  document.getElementById('dn-date').textContent = `${cur.d} ${MESES_SH[cur.m-1]} ${cur.y}`;
  document.getElementById('btn-sig').disabled    = isToday(cur);

  const ro = document.getElementById('ro-banner');
  isToday(cur) ? ro.classList.remove('show') : ro.classList.add('show');

  document.getElementById('rc-date').textContent = `${cur.d}/${cur.m}/${cur.y}`;

  const dot = document.getElementById('dn-today-dot');
  if (dot) dot.style.display = isToday(cur) ? 'inline-block' : 'none';
}

function cambiarDia(d) {
  const jsDate = new Date(cur.y, cur.m-1, cur.d);
  jsDate.setDate(jsDate.getDate() + d);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if (jsDate > hoy) return;
  cur = { y: jsDate.getFullYear(), m: jsDate.getMonth()+1, d: jsDate.getDate() };
  S = loadDay(cur);
  document.getElementById('nota-in').value = S.nota || '';
  cajaPaso = 1;
  updateDateHeader();
  renderCaja();
}
function irAHoy() {
  cur = todayObj(); S = loadDay(cur);
  document.getElementById('nota-in').value = S.nota || '';
  cajaPaso = 1;
  updateDateHeader(); renderCaja();
}

/* ──────────────────────────────────────────────────
   TABS
────────────────────────────────────────────────── */
function setTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected','false');
    b.setAttribute('role','tab');
  });
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const btn = document.getElementById('tab-' + name);
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected','true');
  }
  document.getElementById('view-' + name).classList.add('active');
  const appBody = document.getElementById('app-body');
  if (appBody) appBody.scrollTo(0, 0);
  if (name === 'mes')    renderMes();
  if (name === 'backup') renderBackup();

  document.getElementById('date-nav').style.display = (name === 'caja') ? '' : 'none';
  document.getElementById('ro-banner').classList.remove('show');
  if (name === 'caja' && !isToday(cur)) document.getElementById('ro-banner').classList.add('show');
}

/* ──────────────────────────────────────────────────
   CAJA — ACCIONES
────────────────────────────────────────────────── */
function setMonto(t) {
  const v = parseInt(document.getElementById(t+'-in').value);
  if (!v || v < 0) { toast('Ingresa un monto válido 💰'); return; }
  S[t] = v;
  S[t + 'Hora'] = hora();
  S.cerrado = false;
  document.getElementById(t+'-in').value = '';
  saveDay(cur, S); renderCaja();
  toast((t==='ef'?'Efectivo':'Transbank') + ' guardado: ' + fmt(v) + ' ✓');
}

function addGasto() {
  const d = document.getElementById('gs-desc').value.trim();
  const m = parseInt(document.getElementById('gs-mn').value);
  if (!d)         { toast('Escribe una descripción 📝'); return; }
  if (!m || m<=0) { toast('Monto inválido 💰'); return; }
  if (!S.gastos) S.gastos = [];
  S.gastos.push({ id: Date.now(), desc: d, monto: m, hora: hora() });
  S.cerrado = false;
  document.getElementById('gs-desc').value = '';
  document.getElementById('gs-mn').value   = '';
  document.getElementById('gs-desc').focus();
  saveDay(cur, S); renderCaja();
  toast('Gasto: ' + fmt(m) + ' ✓');
}

function delGasto(id) {
  S.gastos = S.gastos.filter(g => g.id !== id);
  saveDay(cur, S); renderCaja();
  toast('Eliminado');
}

function guardarNota() {
  const n = document.getElementById('nota-in').value.trim();
  S.nota = n;
  S.cerrado = false;
  saveDay(cur, S); renderCaja();
  toast('Nota guardada ✓');
}

/* ──────────────────────────────────────────────────
   CAJA — RENDER
────────────────────────────────────────────────── */
function renderCaja() {
  const { gastos, totG, totI, neto, mrg } = calcularResumenDia(S);

  document.getElementById('k-ef').textContent = fmt(S.ef||0);
  document.getElementById('k-tb').textContent = fmt(S.tb||0);
  document.getElementById('k-gs').textContent = fmt(totG);
  document.getElementById('k-gs-n').textContent = gastos.length + (gastos.length===1?' item':' items');
  document.getElementById('k-nt').textContent = fmt(neto);
  const kntSub = document.getElementById('k-nt-sub');
  if (kntSub) kntSub.textContent = neto >= 0 ? 'Ganancia del día' : 'Pérdida del día';

  const ctxEl = document.getElementById('kpi-context');
  if (ctxEl) {
    const daysMes = getDaysOfMonth(cur.y, cur.m);
    const diasAnteriores = daysMes.filter(o => o.d < cur.d);
    const hoyIng = totI;
    if (diasAnteriores.length > 0) {
      let sumOtros = 0;
      diasAnteriores.forEach(o => { const d = loadDay(o); sumOtros += (d.ef||0) + (d.tb||0); });
      const promDia = Math.round(sumOtros / diasAnteriores.length);
      ctxEl.innerHTML = '<span class="kpi-ctx-label">📊 Promedio diario del mes (días anteriores): <strong>' + fmt(promDia) + '</strong></span>';
      if (hoyIng > 0) {
        const pct = promDia > 0 ? Math.round(((hoyIng - promDia) / promDia) * 100) : 0;
        const txt = pct > 0 ? 'Hoy <span class="kpi-ctx-pos">+' + pct + '% sobre el promedio</span>' : pct < 0 ? 'Hoy <span class="kpi-ctx-neg">' + pct + '% bajo el promedio</span>' : 'Hoy al promedio';
        ctxEl.innerHTML += ' · ' + txt;
      }
      ctxEl.classList.add('show');
    } else {
      ctxEl.textContent = '';
      ctxEl.classList.remove('show');
    }
  }

  document.getElementById('ef-disp').textContent = fmt(S.ef||0);
  document.getElementById('tb-disp').textContent = fmt(S.tb||0);

  const efLast = document.getElementById('ef-last');
  if (efLast) {
    efLast.textContent = (S.ef||0) > 0
      ? `Último valor guardado: ${fmt(S.ef||0)}${S.efHora ? ' a las ' + escapeHtml(S.efHora) : ''}`
      : 'Aún no hay efectivo guardado.';
  }
  const tbLast = document.getElementById('tb-last');
  if (tbLast) {
    tbLast.textContent = (S.tb||0) > 0
      ? `Último valor guardado: ${fmt(S.tb||0)}${S.tbHora ? ' a las ' + escapeHtml(S.tbHora) : ''}`
      : 'Aún no hay Transbank guardado.';
  }

  const notaIn = document.getElementById('nota-in');
  if (document.activeElement !== notaIn) notaIn.value = S.nota || '';
  document.getElementById('nota-disp').textContent = S.nota ? '✓ Nota guardada' : '';

  const lista = document.getElementById('gs-list');
  if (gastos.length === 0) {
    lista.innerHTML = '<div class="empty-note">Sin gastos registrados aún 🌿</div>';
  } else {
    lista.innerHTML = [...gastos].reverse().map(g =>
      `<div class="gasto-item">
        <div class="g-dot"></div>
        <div class="g-desc">${escapeHtml(g.desc)}</div>
        <div class="g-monto">${fmt(g.monto)}</div>
        <div class="g-hora">${escapeHtml(g.hora||'')}</div>
        <button class="g-del" onclick="delGasto(${g.id})">✕</button>
      </div>`
    ).join('');
  }

  document.getElementById('rc-ef').textContent  = fmt(S.ef||0);
  document.getElementById('rc-tb').textContent  = fmt(S.tb||0);
  document.getElementById('rc-ing').textContent = fmt(totI);
  document.getElementById('rc-gs').textContent  = fmt(totG);
  document.getElementById('rc-gn').textContent  = gastos.length > 0 ? `(${gastos.length})` : '';
  document.getElementById('rc-neto').textContent= fmt(neto);

  const netoEl = document.getElementById('rc-neto');
  const estEl  = document.getElementById('rc-estado');
  netoEl.classList.remove('nv-pos','nv-neg','nv-zero');
  if (totI===0 && totG===0) {
    netoEl.classList.add('nv-zero');
    estEl.textContent = 'Sin registros en este día · Ingresa efectivo, Transbank y gastos para ver el resultado';
  } else if (neto >= 0) {
    netoEl.classList.add('nv-pos');
    estEl.textContent = `Ganancia del día · margen ${mrg.toFixed(1)}%`;
  } else {
    netoEl.classList.add('nv-neg');
    estEl.textContent = `Pérdida del día · ${fmt(Math.abs(neto))}`;
  }

  const mfill = document.getElementById('rc-mrg-fill');
  mfill.style.width = mrg.toFixed(1) + '%';
  mfill.classList.toggle('neg', neto < 0);
  document.getElementById('rc-mrg-pct').textContent = mrg.toFixed(1) + '%';

  const jsCur = new Date(cur.y, cur.m-1, cur.d);
  const diaSemana = jsCur.getDay();
  const diffDesdeLunes = diaSemana === 0 ? 6 : (diaSemana - 1);
  const lunesDate = new Date(jsCur);
  lunesDate.setDate(jsCur.getDate() - diffDesdeLunes);

  let acEf = 0, acTb = 0, acGs = 0;
  const desdeObj = { y: lunesDate.getFullYear(), m: lunesDate.getMonth()+1, d: lunesDate.getDate() };
  const fechaIter = new Date(lunesDate);
  while (fechaIter <= jsCur) {
    const o = { y: fechaIter.getFullYear(), m: fechaIter.getMonth()+1, d: fechaIter.getDate() };
    const dData = loadDay(o);
    acEf += dData.ef || 0;
    acTb += dData.tb || 0;
    acGs += (dData.gastos || []).reduce((s,g)=>s+g.monto,0);
    fechaIter.setDate(fechaIter.getDate()+1);
  }
  const acIng = acEf + acTb;
  const acNeto = acIng - acGs;

  const weekEl = document.getElementById('rc-week-summary');
  const lunesLabel = `${desdeObj.d}/${desdeObj.m}`;
  const hoyLabel = `${cur.d}/${cur.m}`;
  if (acIng === 0 && acGs === 0) {
    weekEl.textContent = '';
  } else {
    weekEl.innerHTML =
      `<strong>Semana actual (${lunesLabel}–${hoyLabel}):</strong> ` +
      `Ingresos ${fmt(acIng)}, Gastos ${fmt(acGs)}, Neto ${fmt(acNeto)}`;
  }

  const btnCerrar = document.getElementById('btn-cerrar-dia');
  if (btnCerrar) {
    if (S.cerrado) {
      btnCerrar.textContent = '✅ Día cerrado (puedes editar si es necesario)';
      btnCerrar.disabled = false;
    } else {
      btnCerrar.textContent = '✅ Confirmar cierre del día';
      btnCerrar.disabled = (totI === 0 && totG === 0);
    }
  }

  const statusChip = document.getElementById('rc-status-chip');
  if (statusChip) {
    statusChip.classList.remove('cerrado','pendiente');
    if (S.cerrado) {
      const txtHora = S.cerradoHora ? ` a las ${escapeHtml(S.cerradoHora)}` : '';
      statusChip.textContent = `Día cerrado${txtHora}`;
      statusChip.classList.add('cerrado');
    } else {
      statusChip.textContent = 'Día pendiente de cerrar';
      statusChip.classList.add('pendiente');
    }
  }

  renderPendientes();
  actualizarCajaWizardUI();
}

/* ──────────────────────────────────────────────────
   MES — RENDER
────────────────────────────────────────────────── */
function setMesCorteDia(v) {
  const d = parseInt(v);
  if (!d || d < 1) {
    mesCorteDia = null;
    renderMes();
    return;
  }
  const diasEnMes = new Date(curMes.y, curMes.m, 0).getDate();
  mesCorteDia = Math.min(Math.max(1, d), diasEnMes);
  renderMes();
}

function cambiarMes(d) {
  curMes.m += d;
  if (curMes.m > 12) { curMes.m = 1;  curMes.y++; }
  if (curMes.m < 1)  { curMes.m = 12; curMes.y--; }
  mesCorteDia = null;
  const hoy = todayObj();
  document.getElementById('btn-mes-sig').disabled = (curMes.y > hoy.y || (curMes.y === hoy.y && curMes.m >= hoy.m));
  renderMes();
}

function renderMes() {
  const { y, m } = curMes;
  document.getElementById('mes-titulo').textContent =
    MESES_ES[m-1].charAt(0).toUpperCase() + MESES_ES[m-1].slice(1) + ' ' + y;

  const days = getDaysOfMonth(y, m);
  const resumenNegEl = document.getElementById('mes-resumen-negocio');
  if (days.length === 0) {
    ['mk-ing','mk-gas','mk-neto','mk-mejor-val'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = id === 'mk-mejor-val' ? '—' : '$0'; });
    document.getElementById('mk-ing-sub').textContent  = '0 días con datos';
    document.getElementById('mk-gas-sub').textContent  = '0 registros';
    document.getElementById('mk-neto-sub').textContent = 'Margen 0%';
    document.getElementById('mk-mejor-dia').textContent= 'Sin datos';
    if (resumenNegEl) { resumenNegEl.innerHTML = ''; resumenNegEl.classList.remove('show'); }
    document.getElementById('comp-ef-bar').style.width = '50%';
    document.getElementById('comp-tb-bar').style.width = '50%';
    document.getElementById('comp-ef-pct').textContent = '50%';
    document.getElementById('comp-tb-pct').textContent = '50%';
    document.getElementById('comp-ef-monto').textContent = '$0';
    document.getElementById('comp-tb-monto').textContent = '$0';
    document.getElementById('semanas-body').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--ink-soft);font-style:italic">Sin datos para este mes</td></tr>';
    document.getElementById('top-dias').innerHTML = '<div class="empty-note">Sin datos para este mes</div>';
    document.getElementById('bar-chart').innerHTML = '<div style="color:var(--ink-soft);font-size:.8rem;font-style:italic;padding:20px;width:100%;text-align:center">Sin datos</div>';
    const corteLabel = document.getElementById('mes-corte-resumen');
    if (corteLabel) corteLabel.textContent = 'Sin datos en este mes.';
    return;
  }

  let totEf = 0, totTb = 0, totGs = 0, numGs = 0;
  const dayData = days.map(o => {
    const d = loadDay(o);
    const ing = (d.ef||0) + (d.tb||0);
    const gs  = (d.gastos||[]).reduce((s,g)=>s+g.monto,0);
    totEf += d.ef||0; totTb += d.tb||0; totGs += gs;
    numGs += (d.gastos||[]).length;
    return { o, d, ing, gs, neto: ing-gs, cerrado: !!d.cerrado };
  });
  const totIng  = totEf + totTb;
  const totNeto = totIng - totGs;
  const mrg     = totIng > 0 ? ((totNeto/totIng)*100).toFixed(1) : 0;

  document.getElementById('mk-ing').textContent      = fmt(totIng);
  document.getElementById('mk-gas').textContent      = fmt(totGs);
  document.getElementById('mk-neto').textContent     = fmt(totNeto);
  const diasCerrados = dayData.filter(d => d.cerrado).length;
  const diasPend     = days.length - diasCerrados;
  document.getElementById('mk-ing-sub').textContent  = days.length + ' días con datos';
  document.getElementById('mk-gas-sub').textContent  = numGs + ' registros';
  document.getElementById('mk-neto-sub').textContent = 'Margen ' + mrg + '%';

  const diasConDatos = days.map(o => o.d);
  const maxDiaDatos = Math.max(...diasConDatos);
  const hoy = todayObj();
  let corte = mesCorteDia;
  if (!corte || corte < 1) {
    if (hoy.y === y && hoy.m === m && diasConDatos.includes(hoy.d)) {
      corte = hoy.d;
    } else {
      corte = maxDiaDatos;
    }
  }
  const diasEnMes = new Date(y, m, 0).getDate();
  corte = Math.min(Math.max(1, corte), diasEnMes);
  mesCorteDia = corte;

  const hasta = dayData.filter(item => item.o.d <= corte);
  let cEf = 0, cTb = 0, cGs = 0;
  hasta.forEach(item => {
    cEf += item.d.ef || 0;
    cTb += item.d.tb || 0;
    cGs += item.gs || 0;
  });
  const cIng  = cEf + cTb;
  const cNeto = cIng - cGs;
  const cMrg  = cIng > 0 ? ((cNeto/cIng)*100).toFixed(1) : '0.0';

  const corteInput = document.getElementById('mes-corte-dia');
  const corteLabel = document.getElementById('mes-corte-resumen');
  if (corteInput) corteInput.value = corte;
  if (corteLabel) {
    corteLabel.textContent =
      `Hasta el día ${corte}: Ingresos ${fmt(cIng)}, Gastos ${fmt(cGs)}, Neto ${fmt(cNeto)} (Margen ${cMrg}%)`;
  }

  const mejor = dayData.sort((a,b) => b.ing - a.ing)[0];
  dayData.sort((a,b) => dateKey(a.o).localeCompare(dateKey(b.o)));
  const jsM = new Date(mejor.o.y, mejor.o.m-1, mejor.o.d);
  document.getElementById('mk-mejor-val').textContent = fmt(mejor.ing);
  document.getElementById('mk-mejor-dia').textContent = `${DIAS_ES[jsM.getDay()]} ${mejor.o.d}`;

  if (resumenNegEl) {
    const diasEnMes = new Date(y, m, 0).getDate();
    const promIngresoDia = Math.round(totIng / days.length);
    const proyeccion = promIngresoDia * diasEnMes;
    let vsAnterior = '';
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const daysPrev = getDaysOfMonth(prevY, prevM);
    const hastaDia = Math.min(maxDiaDatos, new Date(prevY, prevM, 0).getDate());
    const ingEstePeriodo = dayData.filter(item => item.o.d <= hastaDia).reduce((s, item) => s + item.ing, 0);
    const daysPrevMismoPeriodo = daysPrev.filter(o => o.d <= hastaDia);
    if (daysPrevMismoPeriodo.length > 0) {
      let ingPrev = 0;
      daysPrevMismoPeriodo.forEach(o => { const d = loadDay(o); ingPrev += (d.ef||0) + (d.tb||0); });
      const pct = ingPrev > 0 ? Math.round(((ingEstePeriodo - ingPrev) / ingPrev) * 100) : 0;
      vsAnterior = pct >= 0 ? 'Ingresos <span class="mes-vs-pos">+' + pct + '%</span> vs mes anterior (días 1–' + hastaDia + ')' : 'Ingresos <span class="mes-vs-neg">' + pct + '%</span> vs mes anterior (días 1–' + hastaDia + ')';
    } else {
      vsAnterior = 'Sin datos del mes anterior para comparar';
    }
    resumenNegEl.innerHTML =
      '<div class="mes-rn-title">📈 Resumen para el negocio</div>' +
      '<div class="mes-rn-row"><span>Promedio por día abierto</span><strong>' + fmt(promIngresoDia) + '</strong></div>' +
      '<div class="mes-rn-row"><span>Proyección al cierre del mes</span><strong>' + fmt(proyeccion) + '</strong></div>' +
      '<div class="mes-rn-row mes-rn-vs">' + vsAnterior + '</div>';
    resumenNegEl.classList.add('show');
  }

  const cierresInfo = document.getElementById('mes-cierres-info');
  if (cierresInfo) {
    cierresInfo.textContent = `Días cerrados: ${diasCerrados} · Pendientes: ${diasPend}`;
  }

  const notasList = document.getElementById('mes-notas-list');
  if (notasList) {
    const conNotas = dayData.filter(item => (item.d.nota || '').trim().length > 0);
    if (conNotas.length === 0) {
      notasList.innerHTML = '<div class="mes-notas-empty">Aún no hay notas guardadas este mes.</div>';
    } else {
      notasList.innerHTML = conNotas.map(item => {
        const jsD2 = new Date(item.o.y, item.o.m-1, item.o.d);
        const fechaTxt = `${DIAS_ES[jsD2.getDay()]} ${item.o.d} ${MESES_SH[item.o.m-1]}`;
        const notaTxt = escapeHtml(item.d.nota.substring(0,80)) + (item.d.nota.length > 80 ? '…' : '');
        return `<div class="mes-nota-item">
          <div class="mes-nota-fecha">${fechaTxt}</div>
          <div class="mes-nota-texto">${notaTxt}</div>
        </div>`;
      }).join('');
    }
  }

  const efPct = totIng > 0 ? (totEf/totIng*100).toFixed(0) : 50;
  const tbPct = totIng > 0 ? (totTb/totIng*100).toFixed(0) : 50;
  document.getElementById('comp-ef-bar').style.width = efPct + '%';
  document.getElementById('comp-tb-bar').style.width = tbPct + '%';
  document.getElementById('comp-ef-pct').textContent = efPct + '%';
  document.getElementById('comp-tb-pct').textContent = tbPct + '%';
  document.getElementById('comp-ef-monto').textContent = fmt(totEf);
  document.getElementById('comp-tb-monto').textContent = fmt(totTb);

  const semanas = agruparSemanas(days, y, m);
  const maxSemIng = Math.max(...semanas.map(s=>s.ing), 1);

  const chart = document.getElementById('bar-chart');
  chart.innerHTML = semanas.map((s,i) => {
    const pct = (s.ing / maxSemIng * 100).toFixed(0);
    return `<div class="bar-col">
      <div class="bar-val">${fmt(s.ing)}</div>
      <div class="bar-outer" style="height:80px">
        <div class="bar-inner" style="height:${pct}%"></div>
      </div>
      <div class="bar-lbl">S${i+1}</div>
    </div>`;
  }).join('');

  const tbody = document.getElementById('semanas-body');
  const maxNeto = Math.max(...semanas.map(s=>s.neto));
  tbody.innerHTML = semanas.map((s,i) => {
    const netoClass = s.neto >= 0 ? 'td-neto-pos' : 'td-neto-neg';
    const star = s.neto === maxNeto ? ' class="semana-star"' : '';
    const medal = s.neto === maxNeto ? ' 🏆' : '';
    return `<tr${star}>
      <td>Sem ${i+1}${medal} <span style="font-size:.68rem;color:var(--ink-soft)">(${s.rango} ${MESES_SH[m-1]})</span></td>
      <td>${fmt(s.ing)}</td>
      <td>${fmt(s.gs)}</td>
      <td class="${netoClass}">${fmt(s.neto)}</td>
    </tr>`;
  }).join('');

  const top3 = [...dayData].sort((a,b)=>b.ing-a.ing).slice(0,3);
  const ranks = ['rank-1','rank-2','rank-3'];
  document.getElementById('top-dias').innerHTML = top3.length === 0
    ? '<div class="empty-note">Sin datos</div>'
    : top3.map((item,i) => {
        const jsD = new Date(item.o.y, item.o.m-1, item.o.d);
        const nota = item.d.nota ? `<span style="font-style:italic"> · "${escapeHtml(item.d.nota.substring(0,30))}…"</span>` : '';
        return `<div class="top-dia">
          <div class="td-rank ${ranks[i]}">${i+1}</div>
          <div class="td-info">
            <div class="td-fecha">${DIAS_ES[jsD.getDay()]} ${item.o.d} ${MESES_SH[item.o.m-1]}${nota}</div>
            <div class="td-detalle">Ef: ${fmt(item.d.ef||0)} · TB: ${fmt(item.d.tb||0)} · Gastos: ${fmt(item.gs)}</div>
          </div>
          <div class="td-neto-val">${fmt(item.ing)}</div>
        </div>`;
      }).join('');

  const diasBody = document.getElementById('dias-mes-body');
  const hoy2 = todayObj();
  diasBody.innerHTML = dayData.map(item => {
    const jsD = new Date(item.o.y, item.o.m-1, item.o.d);
    const netoClass = item.neto >= 0 ? 'td-neto-pos' : 'td-neto-neg';
    const labelDia = `${DIAS_ES[jsD.getDay()].slice(0,3)} ${item.o.d}`;
    const estado = item.cerrado ? 'Cerrado' : 'Pendiente';
    const estadoClass = item.cerrado ? 'dia-estado dia-estado-cerrado' : 'dia-estado dia-estado-pendiente';
    const hoyClass = (item.o.y === hoy2.y && item.o.m === hoy2.m && item.o.d === hoy2.d) ? ' class="dia-hoy"' : '';
    return `<tr${hoyClass} onclick="irADiaDesdeMes(${item.o.y},${item.o.m},${item.o.d})">
      <td>${labelDia}</td>
      <td>${fmt(item.ing)}</td>
      <td>${fmt(item.gs)}</td>
      <td class="${netoClass}">${fmt(item.neto)}</td>
      <td class="${estadoClass}">${estado}</td>
    </tr>`;
  }).join('');
}

function irADiaDesdeMes(y, m, d) {
  cur = { y, m, d };
  S = loadDay(cur);
  const notaIn = document.getElementById('nota-in');
  if (notaIn) notaIn.value = S.nota || '';
   cajaPaso = 1;
  updateDateHeader();
  renderCaja();
  setTab('caja');
}

function actualizarCajaWizardUI() {
  const maxPaso = 4;
  if (cajaPaso < 1) cajaPaso = 1;
  if (cajaPaso > maxPaso) cajaPaso = maxPaso;
  document.querySelectorAll('.caja-step-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.caja-step-' + cajaPaso).forEach(p => p.classList.add('active'));
  const prev = document.getElementById('cw-prev');
  const next = document.getElementById('cw-next');
  const label = document.getElementById('cw-label');
  const help  = document.getElementById('cw-help');
  const steps = document.getElementById('caja-steps');
  const toggleHelpBtn = document.getElementById('cw-toggle-help');
  if (prev) prev.disabled = (cajaPaso === 1);
  if (next) next.disabled = (cajaPaso === maxPaso);
  if (steps) steps.style.display = mostrarAyudaCaja ? '' : 'none';
  if (help) help.style.display = mostrarAyudaCaja ? '' : 'none';
  if (toggleHelpBtn) {
    toggleHelpBtn.textContent = mostrarAyudaCaja ? 'Ocultar ayuda' : 'Mostrar ayuda';
  }
  if (label || help) {
    let txt = '';
    let helpTxt = '';
    if (cajaPaso === 1) {
      txt = 'Paso 1 de 4 · Efectivo';
      helpTxt = 'Cuenta los billetes de la caja y escribe aquí el total de efectivo del día.';
    }
    if (cajaPaso === 2) {
      txt = 'Paso 2 de 4 · Tarjeta / Transbank';
      helpTxt = 'Mira el papelito o cierre de Transbank y escribe el total del día.';
    }
    if (cajaPaso === 3) {
      txt = 'Paso 3 de 4 · Gastos y nota';
      helpTxt = 'Anota cada plata que salió y, si quieres, deja una nota del día.';
    }
    if (cajaPaso === 4) {
      txt = 'Paso 4 de 4 · Revisar y cerrar el día';
      helpTxt = 'Revisa el resultado y, si está bien, marca el día como cerrado.';
    }
    if (label) label.textContent = txt;
    if (help) help.textContent = helpTxt;
  }
}

function cajaPasoSiguiente() { cajaPaso++; actualizarCajaWizardUI(); }
function cajaPasoAnterior() { cajaPaso--; actualizarCajaWizardUI(); }

function irPasoCaja(n) {
  cajaPaso = n;
  actualizarCajaWizardUI();
}

function toggleCajaAyuda() {
  mostrarAyudaCaja = !mostrarAyudaCaja;
  try {
    localStorage.setItem(PREFIX + 'ayuda_caja', mostrarAyudaCaja ? 'on' : 'off');
  } catch {}
  actualizarCajaWizardUI();
}

function confirmarCierreDia() {
  if (!S) return;
  const { totG, totI } = calcularResumenDia(S);
  if (totI === 0 && totG === 0) {
    if (!confirm('Este día no tiene ventas ni gastos.\n¿Quieres marcarlo igualmente como día cerrado?')) {
      return;
    }
  }
  S.cerrado = true;
  S.cerradoHora = hora();
  saveDay(cur, S);
  renderCaja();
  const jsD = new Date(cur.y, cur.m - 1, cur.d);
  const label = `${DIAS_ES[jsD.getDay()]} ${cur.d}`;
  toast(`${label} cerrado ✓`);
}

function getPendientesHastaHoyEnRangoDias(maxDiasAtras) {
  const hoy = todayObj();
  const hoyD = new Date(hoy.y, hoy.m-1, hoy.d);
  const limite = new Date(hoyD);
  limite.setDate(limite.getDate() - maxDiasAtras);
  const keys = allDayKeys();
  const pendientes = [];
  keys.forEach(k => {
    const [y,m,d] = k.split('-').map(x => parseInt(x,10));
    const fecha = new Date(y, m-1, d);
    if (fecha > hoyD || fecha < limite) return;
    const data = loadDay({y,m,d});
    if (!data.cerrado) pendientes.push({y,m,d});
  });
  pendientes.sort((a,b)=>dateKey(a).localeCompare(dateKey(b)));
  return pendientes;
}

function renderPendientes() {
  const banner = document.getElementById('pending-banner');
  if (!banner) return;
  const hoy = todayObj();
  const pendientes = getPendientesHastaHoyEnRangoDias(30);
  const sinHoy = pendientes.filter(o => !(o.y===hoy.y && o.m===hoy.m && o.d===hoy.d));
  const lista = sinHoy;
  if (lista.length === 0) {
    banner.classList.remove('show');
    banner.textContent = '';
    return;
  }
  const diasTxt = lista.map(o => o.d).join(', ');
  banner.innerHTML = `<strong>Tienes días sin cerrar en los últimos 30 días:</strong> ${diasTxt}. <button class="btn btn-sm btn-ghost" onclick="irAPrimerPendiente()">Ir al primero</button>`;
  banner.classList.add('show');
}

function irAPrimerPendiente() {
  const pendientes = getPendientesHastaHoyEnRangoDias(30);
  if (pendientes.length === 0) return;
  const primero = pendientes[0];
  cur = { y: primero.y, m: primero.m, d: primero.d };
  S = loadDay(cur);
  cajaPaso = 1;
  updateDateHeader();
  renderCaja();
  setTab('caja');
}

function toggleMesAdvanced() {
  const sec = document.getElementById('mes-advanced');
  const btn = document.getElementById('btn-mes-adv');
  if (!sec || !btn) return;
  const hidden = sec.classList.toggle('hidden');
  btn.textContent = hidden ? 'Ver análisis avanzado' : 'Ocultar análisis avanzado';
}

function agruparSemanas(days, y, m) {
  const diasDelMes = new Date(y, m, 0).getDate();
  const semanas = [];
  const mapaDias = new Map();
  days.forEach(o => mapaDias.set(dateKey(o), o));
  let semanaInicio = 1;
  let diasSemana = [];
  for (let d = 1; d <= diasDelMes; d++) {
    const jsD   = new Date(y, m-1, d);
    const dow   = jsD.getDay();
    const clave = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const o     = mapaDias.get(clave);
    if (o) diasSemana.push(o);
    const esDomingo   = dow === 0;
    const esUltimoDia = d === diasDelMes;
    if (esDomingo || esUltimoDia) {
      let ing = 0, gs = 0;
      diasSemana.forEach(o2 => {
        const dData = loadDay(o2);
        ing += (dData.ef||0) + (dData.tb||0);
        gs  += (dData.gastos||[]).reduce((s,g)=>s+g.monto,0);
      });
      semanas.push({ rango:`${semanaInicio}-${d}`, ing, gs, neto: ing-gs });
      semanaInicio = d + 1;
      diasSemana = [];
    }
  }
  return semanas;
}

/* ──────────────────────────────────────────────────
   BACKUP — RENDER
────────────────────────────────────────────────── */
function renderBackup() {
  const keys = allDayKeys();
  document.getElementById('st-dias').textContent = keys.length;
  document.getElementById('st-inicio').textContent = keys.length ? keys[0] : '—';
  document.getElementById('st-ultimo').textContent = keys.length ? keys[keys.length-1] : '—';
  let size = 0;
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) size += (localStorage.getItem(k)||'').length;
  }
  document.getElementById('st-size').textContent = (size/1024).toFixed(1) + ' KB';
  let lastBackup = 'Nunca';
  try {
    const metaRaw = localStorage.getItem(PREFIX + 'meta');
    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      if (meta && meta.lastBackupAt) lastBackup = meta.lastBackupAt;
    }
  } catch {}
  const stBackup = document.getElementById('st-backup');
  if (stBackup) stBackup.textContent = lastBackup;
}

function descargarBackup() {
  const data = {};
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) data[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const d    = new Date();
  a.href     = url;
  a.download = `floreria-backup-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup descargado 💾');
  try {
    const metaRaw = localStorage.getItem(PREFIX + 'meta');
    const meta = metaRaw ? JSON.parse(metaRaw) : {};
    const fecha = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}`;
    meta.lastBackupAt = fecha;
    localStorage.setItem(PREFIX + 'meta', JSON.stringify(meta));
  } catch {}
  renderBackup();
}

function restaurarBackup(input) {
  const file = input.files[0];
  if (!file) return;
  if (!confirm('Vas a reemplazar todos los datos actuales por los del archivo seleccionado.\nTe recomiendo hacer un backup antes.\n\n¿Continuar con la restauración?')) {
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        toast('⚠️ Archivo inválido (estructura incorrecta)');
        return;
      }
      let count = 0;
      Object.entries(data).forEach(([k, v]) => {
        if (!k.startsWith(PREFIX)) return;
        if (typeof v !== 'string' || v.length > 50000) return;
        try {
          JSON.parse(v);
        } catch {
          return;
        }
        try {
          localStorage.setItem(k, v);
          count++;
        } catch (err) {
          if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
            toast('Memoria llena al restaurar. Se guardaron ' + count + ' registros.');
          }
        }
      });
      S = loadDay(cur);
      renderCaja();
      renderBackup();
      toast('✓ ' + count + ' registros restaurados');
    } catch {
      toast('⚠️ Archivo inválido');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function compartirWhatsApp() {
  if (!S.cerrado) {
    if (!confirm('Este día aún no está marcado como cerrado.\n¿Seguro que quieres enviar este resumen por WhatsApp?')) {
      return;
    }
  }
  const { gastos, totG, totI, neto } = calcularResumenDia(S);
  const jsD  = new Date(cur.y, cur.m-1, cur.d);
  let txt = `🌸 *Florería Elizabeth — Cierre de Caja*\n`;
  txt += `📅 ${DIAS_ES[jsD.getDay()]} ${cur.d} de ${MESES_ES[cur.m-1]} ${cur.y}\n`;
  txt += `━━━━━━━━━━━━━━━━━━━\n`;
  txt += `💵 Efectivo:   ${fmt(S.ef||0)}\n`;
  txt += `💳 Transbank:  ${fmt(S.tb||0)}\n`;
  txt += `📊 Ingresos:   ${fmt(totI)}\n`;
  txt += `🧾 Gastos:     ${fmt(totG)}\n`;
  txt += `━━━━━━━━━━━━━━━━━━━\n`;
  txt += `✨ *NETO: ${fmt(neto)}*\n`;
  if (gastos.length > 0) {
    txt += `\n📋 Gastos:\n`;
    gastos.forEach(g => txt += `  · ${g.desc}: ${fmt(g.monto)}\n`);
  }
  if (S.nota) txt += `\n📝 ${S.nota}\n`;
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}

/* ──────────────────────────────────────────────────
   MODAL / LIMPIAR
────────────────────────────────────────────────── */
function confirmarLimpiar() {
  const jsD = new Date(cur.y, cur.m-1, cur.d);
  const label = isToday(cur) ? 'hoy' : `${DIAS_ES[jsD.getDay()]} ${cur.d} de ${MESES_ES[cur.m-1]}`;
  document.getElementById('modal-limpiar-txt').textContent =
    `Se eliminarán todos los registros de ${label} (efectivo, transbank, gastos y nota). Esta acción no se puede deshacer.`;
  const ov = document.getElementById('overlay');
  ov.classList.add('open');
  const primary = ov.querySelector('.modal-btns .btn-rose');
  if (primary) primary.focus();
}
function cerrarModal() {
  const ov = document.getElementById('overlay');
  ov.classList.remove('open');
}
function limpiar() {
  S = {ef:0, tb:0, gastos:[], nota:''};
  document.getElementById('nota-in').value = '';
  saveDay(cur, S); renderCaja(); cerrarModal();
  toast('Día limpiado 🌸');
}

/* ──────────────────────────────────────────────────
   COPIAR RESUMEN
────────────────────────────────────────────────── */
function copiarResumen() {
  if (!S.cerrado) {
    if (!confirm('Este día aún no está marcado como cerrado.\n¿Seguro que quieres copiar este resumen?')) {
      return;
    }
  }
  const { gastos, totG, totI, neto } = calcularResumenDia(S);
  const mrg    = totI>0 ? ((neto/totI)*100).toFixed(1) : '0.0';
  const jsD    = new Date(cur.y, cur.m-1, cur.d);
  let txt = `🌸 FLORERÍA ELIZABETH — Cierre de Caja\n`;
  txt += `📅 ${DIAS_ES[jsD.getDay()]} ${cur.d} de ${MESES_ES[cur.m-1]} ${cur.y}\n`;
  txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt += `💵 Efectivo:       ${fmt(S.ef||0)}\n`;
  txt += `💳 Transbank:      ${fmt(S.tb||0)}\n`;
  txt += `📊 Total Ingresos: ${fmt(totI)}\n`;
  txt += `🧾 Total Gastos:   ${fmt(totG)}\n`;
  txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt += `✨ BALANCE NETO:   ${fmt(neto)}  (Margen ${mrg}%)\n`;
  if (gastos.length > 0) { txt += `\n🧾 Detalle Gastos:\n`; gastos.forEach(g => txt += `  · [${g.hora||''}] ${g.desc}: ${fmt(g.monto)}\n`); }
  if (S.nota) txt += `\n📝 Nota: ${S.nota}\n`;
  navigator.clipboard.writeText(txt).then(()=>toast('Resumen copiado 📋')).catch(()=>{
    const ta=document.createElement('textarea'); ta.value=txt;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    toast('Resumen copiado 📋');
  });
}

/* ──────────────────────────────────────────────────
   TOAST
────────────────────────────────────────────────── */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

/* ──────────────────────────────────────────────────
   TECLADO
────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  const overlay = document.getElementById('overlay');
  const modalOpen = overlay && overlay.classList.contains('open');

  if (modalOpen && e.key === 'Tab') {
    const modal = overlay.querySelector('.modal');
    const focusable = modal ? modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') : [];
    const list = Array.from(focusable).filter(el => el.offsetParent !== null);
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first && last) { last.focus(); e.preventDefault(); }
    } else {
      if (document.activeElement === last && first) { first.focus(); e.preventDefault(); }
    }
    return;
  }

  if (e.key==='Enter') {
    const id = document.activeElement.id;
    if (id==='ef-in')   setMonto('ef');
    if (id==='tb-in')   setMonto('tb');
    if (id==='gs-mn')   addGasto();
    if (id==='gs-desc') document.getElementById('gs-mn').focus();
  }
  if (e.key==='Escape') cerrarModal();
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const active = document.activeElement;
    if (active && active.classList.contains('tab-btn')) {
      const tabs = Array.from(document.querySelectorAll('.tab-btn'));
      const idx = tabs.indexOf(active);
      if (idx !== -1) {
        const nextIdx = e.key === 'ArrowRight'
          ? (idx + 1) % tabs.length
          : (idx - 1 + tabs.length) % tabs.length;
        const nextTab = tabs[nextIdx];
        nextTab.focus();
        const id = nextTab.id.replace('tab-','');
        setTab(id);
      }
    }
  }
});
document.getElementById('overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('overlay')) cerrarModal();
});

/* ──────────────────────────────────────────────────
   INIT + PWA
────────────────────────────────────────────────── */
(function init() {
  const hoy = todayObj();
  document.getElementById('btn-mes-sig').disabled =
    (curMes.y > hoy.y || (curMes.y === hoy.y && curMes.m >= hoy.m));
  try {
    const flag = localStorage.getItem(PREFIX + 'ayuda_caja');
    if (flag === 'off') mostrarAyudaCaja = false;
  } catch {}
  updateDateHeader();
  renderCaja();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
