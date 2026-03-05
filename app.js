/* ──────────────────────────────────────────────────
   ESTADO GLOBAL (dominio y almacenamiento en js/domain.js y js/storage.js)
────────────────────────────────────────────────── */
const DIAS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES_ES  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_SH  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

let cur     = todayObj();
let curMes  = { y: cur.y, m: cur.m };
let mesCorteDia = null;
let cajaPaso = 1;
let paso1Guardado = false;
let paso2Guardado = false;
let lastSavedAt = null;
let guardadoTimeout = null;

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

function showGuardadoIndicator() {
  lastSavedAt = hora();
  const el = document.getElementById('guardado-indicator');
  if (!el) return;
  el.textContent = 'Guardado ' + lastSavedAt;
  el.classList.add('show');
  if (guardadoTimeout) clearTimeout(guardadoTimeout);
  guardadoTimeout = setTimeout(function () {
    el.classList.remove('show');
    guardadoTimeout = null;
  }, 2500);
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
  paso1Guardado = !!S.efHora;
  paso2Guardado = !!S.tbHora;
  document.getElementById('nota-in').value = S.nota || '';
  cajaPaso = 1;
  updateDateHeader();
  renderCaja();
}
function irAHoy() {
  cur = todayObj(); S = loadDay(cur);
  paso1Guardado = !!S.efHora;
  paso2Guardado = !!S.tbHora;
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
    b.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  var respaldoBtn = document.getElementById('header-respaldo-btn');
  if (respaldoBtn) respaldoBtn.classList.remove('active');
  if (name === 'backup') {
    document.getElementById('view-backup').classList.add('active');
    if (respaldoBtn) respaldoBtn.classList.add('active');
    renderBackup();
  } else {
    var btn = document.getElementById('tab-' + name);
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    }
    document.getElementById('view-' + name).classList.add('active');
    if (name === 'mes') renderMes();
  }
  var appBody = document.getElementById('app-body');
  if (appBody) appBody.scrollTo(0, 0);
  var roBanner = document.getElementById('ro-banner');
  if (roBanner) {
    roBanner.classList.remove('show');
    if (name === 'caja' && !isToday(cur)) roBanner.classList.add('show');
  }
}

function toggleRespaldo() {
  var backupView = document.getElementById('view-backup');
  if (backupView && backupView.classList.contains('active')) {
    setTab('caja');
  } else {
    setTab('backup');
  }
}

/* ──────────────────────────────────────────────────
   CAJA — ACCIONES
────────────────────────────────────────────────── */
function parseMontoInput(raw) {
  if (!raw || typeof raw !== 'string') return NaN;
  const limpio = raw.trim().replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
  const n = parseInt(limpio, 10);
  return isNaN(n) ? NaN : n;
}

const MONTO_ALTO_UMBRAL = 500000;

/** Guarda efectivo o transbank. Retorna true si guardó, false si no (validación o canceló). */
function setMonto(t) {
  const raw = document.getElementById(t + '-in').value;
  const v = parseMontoInput(raw);
  if (isNaN(v) || v < 0) {
    toast('Ingresa un monto válido (solo números). Ej: 85000');
    return false;
  }
  if (v >= MONTO_ALTO_UMBRAL && !confirm('¿Confirmas ' + fmt(v) + '? (monto alto)')) return false;
  S[t] = v;
  S[t + 'Hora'] = hora();
  S.cerrado = false;
  document.getElementById(t + '-in').value = '';
  saveDay(cur, S);
  showGuardadoIndicator();
  if (t === 'ef') paso1Guardado = true;
  if (t === 'tb') paso2Guardado = true;
  renderCaja();
  actualizarCajaWizardUI();
  const nombre = t === 'ef' ? 'Efectivo' : 'Transbank';
  toast(nombre + ' guardado: ' + fmt(v) + ' ✓', 'success');
  return true;
}

function guardarEfectivoYSiguiente() {
  var raw = document.getElementById('ef-in').value;
  var v = parseMontoInput(raw);
  if (!isNaN(v) && v >= 0) {
    if (setMonto('ef')) {
      cajaPaso = 2;
      actualizarCajaWizardUI();
      scrollAPaso(2);
    }
    return;
  }
  if (paso1Guardado || (typeof S.ef === 'number' && S.ef >= 0)) {
    cajaPaso = 2;
    actualizarCajaWizardUI();
    scrollAPaso(2);
    return;
  }
  toast('Ingresa un monto válido (solo números). Ej: 85000');
}

function guardarTransbankYSiguiente() {
  var raw = document.getElementById('tb-in').value;
  var v = parseMontoInput(raw);
  if (!isNaN(v) && v >= 0) {
    if (setMonto('tb')) {
      cajaPaso = 3;
      actualizarCajaWizardUI();
      scrollAPaso(3);
    }
    return;
  }
  if (paso2Guardado || (typeof S.tb === 'number' && S.tb >= 0)) {
    cajaPaso = 3;
    actualizarCajaWizardUI();
    scrollAPaso(3);
    return;
  }
  toast('Ingresa un monto válido (solo números). Ej: 120000');
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
  saveDay(cur, S);
  showGuardadoIndicator();
  renderCaja();
  toast('Gasto: ' + fmt(m) + ' ✓', 'success');
}

function delGasto(id) {
  S.gastos = S.gastos.filter(g => g.id !== id);
  saveDay(cur, S);
  showGuardadoIndicator();
  renderCaja();
  toast('Eliminado');
}

function guardarNota() {
  const n = document.getElementById('nota-in').value.trim();
  S.nota = n;
  S.cerrado = false;
  saveDay(cur, S);
  showGuardadoIndicator();
  renderCaja();
  actualizarCajaWizardUI();
  toast('Nota guardada ✓', 'success');
}

/** Guarda la nota y avanza al paso 4 (Revisar y cerrar). */
function guardarNotaYSiguiente() {
  const n = document.getElementById('nota-in') ? document.getElementById('nota-in').value.trim() : '';
  S.nota = n;
  S.cerrado = false;
  saveDay(cur, S);
  showGuardadoIndicator();
  renderCaja();
  toast('Nota guardada ✓', 'success');
  cajaPaso = 4;
  actualizarCajaWizardUI();
  scrollAPaso(4);
}

function toggleNotaExpand() {
  var wrap = document.getElementById('nota-wrap-collapsible');
  var body = document.getElementById('nota-body');
  var toggleBtn = document.getElementById('nota-toggle');
  if (!wrap || !body) return;
  var isExpanded = wrap.classList.toggle('nota-expanded');
  body.hidden = !isExpanded;
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  if (isExpanded) {
    setTimeout(function () {
      var notaIn = document.getElementById('nota-in');
      if (notaIn && typeof notaIn.focus === 'function') notaIn.focus();
    }, 80);
  }
}

/* ──────────────────────────────────────────────────
   CAJA — RENDER (por secciones)
────────────────────────────────────────────────── */
function renderCajaKPIs(resumen) {
  const { gastos, totG, totI, neto } = resumen;
  document.getElementById('k-ef').textContent = fmt(S.ef||0);
  document.getElementById('k-tb').textContent = fmt(S.tb||0);
  document.getElementById('k-gs').textContent = fmt(totG);
  document.getElementById('k-gs-n').textContent = gastos.length + (gastos.length===1?' item':' items');

  var heroEl = document.getElementById('kpi-hero-val');
  if (heroEl) {
    heroEl.textContent = fmt(neto);
    heroEl.classList.remove('positive', 'negative', 'zero');
    if (totI === 0 && totG === 0) heroEl.classList.add('zero');
    else if (neto >= 0) heroEl.classList.add('positive');
    else heroEl.classList.add('negative');
  }

  const ctxEl = document.getElementById('kpi-context');
  const chipEl = document.getElementById('kpi-chip');
  if (ctxEl) {
    const daysMes = getDaysOfMonth(cur.y, cur.m);
    const diasAnteriores = daysMes.filter(o => o.d < cur.d);
    if (diasAnteriores.length > 0) {
      let sumOtros = 0;
      diasAnteriores.forEach(o => { const d = loadDay(o); sumOtros += (d.ef||0) + (d.tb||0); });
      const promDia = Math.round(sumOtros / diasAnteriores.length);
      ctxEl.innerHTML = '<span class="kpi-ctx-label">📊 Promedio diario del mes (días anteriores): <strong>' + fmt(promDia) + '</strong></span>';
      if (totI > 0) {
        const pct = promDia > 0 ? Math.round(((totI - promDia) / promDia) * 100) : 0;
        const txt = pct > 0 ? 'Hoy <span class="kpi-ctx-pos">+' + pct + '% sobre el promedio</span>' : pct < 0 ? 'Hoy <span class="kpi-ctx-neg">' + pct + '% bajo el promedio</span>' : 'Hoy al promedio';
        ctxEl.innerHTML += ' · ' + txt;
      }
      ctxEl.classList.add('show');
      if (chipEl && totI > 0 && promDia > 0) {
        var pct = Math.round(((totI - promDia) / promDia) * 100);
        chipEl.textContent = pct > 0 ? 'Hoy +' + pct + '% vs promedio' : pct < 0 ? 'Hoy ' + pct + '% vs promedio' : 'Hoy al promedio';
        chipEl.classList.add('show');
      } else if (chipEl) chipEl.classList.remove('show');
    } else {
      ctxEl.textContent = '';
      ctxEl.classList.remove('show');
      if (chipEl) {
        if (cur.d === 1) {
          chipEl.textContent = 'Primer día del mes';
          chipEl.classList.add('show');
        } else chipEl.classList.remove('show');
      }
    }
  }
}

function renderCajaPasosEfectivoTransbank() {
  document.getElementById('ef-disp').textContent = fmt(S.ef||0);
  document.getElementById('tb-disp').textContent = fmt(S.tb||0);
  const efLast = document.getElementById('ef-last');
  if (efLast) {
    efLast.textContent = (S.ef || 0) > 0
      ? (S.efHora ? 'Guardado a las ' + escapeHtml(S.efHora) : 'Guardado')
      : 'Escribe el total y pulsa Guardar.';
  }
  const tbLast = document.getElementById('tb-last');
  if (tbLast) {
    tbLast.textContent = (S.tb || 0) > 0
      ? (S.tbHora ? 'Guardado a las ' + escapeHtml(S.tbHora) : 'Guardado')
      : 'Escribe el total y pulsa Guardar.';
  }
  var efWrap = document.getElementById('field-wrap-ef');
  var tbWrap = document.getElementById('field-wrap-tb');
  if (efWrap) efWrap.classList.toggle('saved', !!S.efHora);
  if (tbWrap) tbWrap.classList.toggle('saved', !!S.tbHora);
}

function renderCajaPasoGastosYNota(resumen) {
  const { gastos, totG } = resumen;
  const notaIn = document.getElementById('nota-in');
  if (document.activeElement !== notaIn) notaIn.value = S.nota || '';
  document.getElementById('nota-disp').textContent = S.nota ? '✓ Nota guardada' : '';

  var notaWrap = document.getElementById('nota-wrap-collapsible');
  var notaBody = document.getElementById('nota-body');
  var notaSummary = document.getElementById('nota-toggle-summary');
  if (notaWrap && notaBody) {
    if (S.nota && S.nota.trim()) {
      notaWrap.classList.add('nota-expanded');
      notaBody.hidden = false;
      var toggleBtn = document.getElementById('nota-toggle');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
      if (notaSummary) notaSummary.textContent = S.nota.length > 40 ? S.nota.substring(0, 40) + '…' : S.nota;
    } else {
      notaWrap.classList.remove('nota-expanded');
      notaBody.hidden = true;
      var toggleBtn = document.getElementById('nota-toggle');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
      if (notaSummary) notaSummary.textContent = 'Observaciones, eventos especiales (opcional)';
    }
  }

  const lista = document.getElementById('gs-list');
  if (gastos.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-title">Sin gastos</div><div class="empty-state-desc">Agrega cada egreso del día</div></div>';
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
  var totalWrap = document.getElementById('gs-total-wrap');
  var totalVal = document.getElementById('gs-total');
  if (totalWrap && totalVal) {
    if (gastos.length > 0) {
      totalWrap.style.display = 'flex';
      totalVal.textContent = fmt(totG);
    } else {
      totalWrap.style.display = 'none';
    }
  }
}

function renderCajaPasoResultado(resumen) {
  const { gastos, totG, totI, neto, mrg } = resumen;

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
    if (weekEl) weekEl.textContent = '';
  } else {
    if (weekEl) {
      weekEl.innerHTML =
        `<strong>Semana actual (${lunesLabel}–${hoyLabel}):</strong> ` +
        `Ingresos ${fmt(acIng)}, Gastos ${fmt(acGs)}, Neto ${fmt(acNeto)}`;
    }
  }

  var sparkEl = document.getElementById('rc-sparkline');
  if (sparkEl) {
    var semanaIngresos = [];
    var iter = new Date(lunesDate);
    while (iter <= jsCur) {
      var o = { y: iter.getFullYear(), m: iter.getMonth() + 1, d: iter.getDate() };
      var d = loadDay(o);
      semanaIngresos.push((d.ef || 0) + (d.tb || 0));
      iter.setDate(iter.getDate() + 1);
    }
    var maxIng = Math.max.apply(null, semanaIngresos.concat([1]));
    sparkEl.innerHTML = semanaIngresos.map(function (ing) {
      var pct = maxIng > 0 ? (ing / maxIng * 100).toFixed(0) : 0;
      return '<div class="spark-bar"><div class="spark-fill" style="height:' + pct + '%"></div></div>';
    }).join('');
    sparkEl.classList.toggle('hidden', semanaIngresos.length === 0);
  }

  const btnCerrar = document.getElementById('btn-cerrar-dia');
  if (btnCerrar) {
    if (S.cerrado) {
      btnCerrar.textContent = '✅ Día cerrado (puedes editar si es necesario)';
      btnCerrar.disabled = false;
    } else {
      btnCerrar.textContent = (totI === 0 && totG === 0)
        ? 'No abrí hoy — Cerrar día'
        : '✅ Confirmar cierre del día';
      btnCerrar.disabled = false;
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
}

function renderEstadoGeneral() {
  var el = document.getElementById('estado-general');
  if (!el) return;
  if (!isToday(cur)) {
    el.classList.remove('show');
    el.textContent = '';
    return;
  }
  var resumen = calcularResumenDia(S);
  var estadoTxt = S.cerrado
    ? 'Hoy · Cerrado · Neto ' + fmt(resumen.neto)
    : 'Hoy · Pendiente de cerrar';
  var backupTxt = '';
  try {
    var metaRaw = localStorage.getItem(PREFIX + 'meta');
    if (metaRaw) {
      var meta = JSON.parse(metaRaw);
      if (meta.lastBackupAt) {
        var t = new Date(meta.lastBackupAt).getTime();
        if (isFinite(t)) {
          var dias = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
          backupTxt = dias === 0 ? 'Backup: hoy' : dias === 1 ? 'Backup: ayer' : 'Backup: hace ' + dias + ' días';
        }
      }
    }
  } catch (e) {}
  el.innerHTML = '<span class="estado-general-hoy">' + estadoTxt + '</span>' + (backupTxt ? ' <span class="estado-general-backup">' + backupTxt + '</span>' : '');
  el.classList.add('show');
  el.classList.toggle('estado-general-cerrado', S.cerrado);
}

function renderCaja() {
  const resumen = calcularResumenDia(S);
  renderEstadoGeneral();
  renderCajaKPIs(resumen);
  renderCajaPasosEfectivoTransbank();
  renderCajaPasoGastosYNota(resumen);
  renderCajaPasoResultado(resumen);
  renderPendientes();
  renderRecordatorioNocturno();
  var atajo = document.getElementById('caja-atajo-revisar');
  if (atajo) atajo.style.display = (paso1Guardado && paso2Guardado && cajaPaso < 4) ? 'block' : 'none';
  var noAbriWrap = document.getElementById('caja-no-abri-wrap');
  if (noAbriWrap) {
    var totI = resumen.totI;
    var totG = resumen.totG;
    noAbriWrap.style.display = (!S.cerrado && totI === 0 && totG === 0) ? 'flex' : 'none';
  }
  actualizarCajaWizardUI();
}

function renderRecordatorioNocturno() {
  const banner = document.getElementById('night-reminder');
  if (!banner) return;
  const hora = new Date().getHours();
  const mostrar = isToday(cur) && !S.cerrado && hora >= 20;
  banner.classList.toggle('show', mostrar);
}

/* ──────────────────────────────────────────────────
   MES — RENDER (por secciones)
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

function irAMesActual() {
  const hoy = todayObj();
  curMes.y = hoy.y;
  curMes.m = hoy.m;
  mesCorteDia = null;
  document.getElementById('btn-mes-sig').disabled = true;
  renderMes();
}

/** Estado vacío del mes: un solo lugar para no olvidar ningún elemento. */
function setMesEmptyState() {
  const ids = ['mk-ing', 'mk-gas', 'mk-neto'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '$0'; });
  const mkMejor = document.getElementById('mk-mejor-val');
  if (mkMejor) mkMejor.textContent = '—';
  document.getElementById('mk-ing-sub').textContent  = '0 días con datos';
  document.getElementById('mk-gas-sub').textContent  = '0 registros';
  document.getElementById('mk-neto-sub').textContent = 'Margen 0%';
  document.getElementById('mk-mejor-dia').textContent = 'Sin datos';

  const resumenNegEl = document.getElementById('mes-resumen-negocio');
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

  const corteInput = document.getElementById('mes-corte-dia');
  if (corteInput) corteInput.value = '';
  const corteLabel = document.getElementById('mes-corte-resumen');
  if (corteLabel) corteLabel.textContent = 'Sin datos en este mes.';

  const cierresInfo = document.getElementById('mes-cierres-info');
  if (cierresInfo) cierresInfo.textContent = 'Días cerrados: 0 · Pendientes: 0';

  const diasBody = document.getElementById('dias-mes-body');
  if (diasBody) diasBody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Aún no hay datos este mes</div><div class="empty-state-desc">Los días se irán llenando al cerrar la caja</div></div></td></tr>';
  var prog = document.getElementById('mes-progreso-dia');
  if (prog) { prog.innerHTML = ''; prog.classList.add('hidden'); }
  var estaSem = document.getElementById('mes-esta-semana');
  if (estaSem) estaSem.classList.add('hidden');
  var salud = document.getElementById('mes-salud');
  if (salud) salud.classList.add('hidden');
  var masivoEl = document.getElementById('mes-cierre-masivo');
  if (masivoEl) masivoEl.style.display = 'none';
  var navHoy = document.getElementById('mes-nav-hoy');
  if (navHoy) {
    var hoy = todayObj();
    navHoy.style.display = (curMes.y !== hoy.y || curMes.m !== hoy.m) ? 'block' : 'none';
  }
}

function renderMesTitulo() {
  const { y, m } = curMes;
  document.getElementById('mes-titulo').textContent =
    MESES_ES[m-1].charAt(0).toUpperCase() + MESES_ES[m-1].slice(1) + ' ' + y;
  const hoy = todayObj();
  var navHoy = document.getElementById('mes-nav-hoy');
  if (navHoy) navHoy.style.display = (y !== hoy.y || m !== hoy.m) ? 'block' : 'none';
}

function renderMesKPIs(dayData, days, totIng, totGs, totNeto, mrg, numGs, mejor) {
  const diasCerrados = dayData.filter(d => d.cerrado).length;
  const diasPend     = days.length - diasCerrados;
  document.getElementById('mk-ing').textContent      = fmt(totIng);
  document.getElementById('mk-gas').textContent      = fmt(totGs);
  document.getElementById('mk-neto').textContent     = fmt(totNeto);
  document.getElementById('mk-ing-sub').textContent  = days.length + ' días con datos';
  document.getElementById('mk-gas-sub').textContent  = numGs + ' registros';
  document.getElementById('mk-neto-sub').textContent = 'Margen ' + mrg + '%';
  const jsM = new Date(mejor.o.y, mejor.o.m-1, mejor.o.d);
  document.getElementById('mk-mejor-val').textContent = fmt(mejor.ing);
  document.getElementById('mk-mejor-dia').textContent = `${DIAS_ES[jsM.getDay()]} ${mejor.o.d}`;

  const cierresInfo = document.getElementById('mes-cierres-info');
  if (cierresInfo) cierresInfo.textContent = `Días cerrados: ${diasCerrados} · Pendientes: ${diasPend}`;
}

function renderMesCorte(y, m, corte, dayData) {
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
  if (corteLabel) corteLabel.textContent = `Hasta el día ${corte}: Ingresos ${fmt(cIng)}, Gastos ${fmt(cGs)}, Neto ${fmt(cNeto)} (Margen ${cMrg}%)`;
}

function renderMesProgresoDia(diaActual, diasEnMes, netoAcumulado) {
  var el = document.getElementById('mes-progreso-dia');
  if (!el) return;
  var pct = diasEnMes > 0 ? (diaActual / diasEnMes * 100).toFixed(0) : 0;
  var leyenda = 'Avance del mes (días). El color indica ganancia o pérdida acumulada hasta ese día.';
  el.innerHTML = '<span class="mes-progreso-texto">Día ' + diaActual + ' de ' + diasEnMes + '</span>' +
    '<div class="mes-progreso-bar"><div class="mes-progreso-fill' + (netoAcumulado >= 0 ? ' mes-progreso-ok' : ' mes-progreso-bajo') + '" style="width:' + pct + '%"></div></div>' +
    '<div class="mes-progreso-leyenda">' + leyenda + '</div>';
  el.classList.remove('hidden');
}

function renderMesEstaSemana(y, m, hoy) {
  var wrap = document.getElementById('mes-esta-semana');
  if (!wrap) return;
  if (hoy.y !== y || hoy.m !== m) { wrap.classList.add('hidden'); return; }
  var jsHoy = new Date(hoy.y, hoy.m - 1, hoy.d);
  var dow = jsHoy.getDay();
  var diffLun = dow === 0 ? 6 : dow - 1;
  var lun = new Date(jsHoy);
  lun.setDate(jsHoy.getDate() - diffLun);
  var acIng = 0, acGs = 0;
  var it = new Date(lun);
  while (it <= jsHoy) {
    var o = { y: it.getFullYear(), m: it.getMonth() + 1, d: it.getDate() };
    var d = loadDay(o);
    acIng += (d.ef || 0) + (d.tb || 0);
    acGs += (d.gastos || []).reduce(function (s, g) { return s + g.monto; }, 0);
    it.setDate(it.getDate() + 1);
  }
  wrap.innerHTML = '<div class="mes-esta-semana-title">📅 Esta semana (lun–hoy)</div>' +
    '<div class="mes-esta-semana-row">Ingresos ' + fmt(acIng) + ' · Gastos ' + fmt(acGs) + ' · Neto ' + fmt(acIng - acGs) + '</div>';
  wrap.classList.remove('hidden');
}

function renderMesSalud(dayData, mrg, semanas, y, m, hoy) {
  var wrap = document.getElementById('mes-salud');
  if (!wrap) return;
  var keys = allDayKeys();
  var hoyKey = dateKey(hoy);
  var idx = keys.indexOf(hoyKey);
  var rachaArr = [];
  for (var i = idx - 1; i >= 0 && rachaArr.length < 31; i--) {
    var p = keys[i].split('-');
    var o = { y: parseInt(p[0], 10), m: parseInt(p[1], 10), d: parseInt(p[2], 10) };
    var d = loadDay(o);
    rachaArr.push({ cerrado: !!d.cerrado });
  }
  var racha = getRachaCierres(rachaArr);
  var diasVerdes = getDiasVerdes(dayData);
  var ingEsta = 0, ingAnterior = 0;
  if (semanas && semanas.length >= 2 && hoy.y === y && hoy.m === m) {
    var jsHoy = new Date(hoy.y, hoy.m - 1, hoy.d);
    var dow = jsHoy.getDay();
    var diffLun = dow === 0 ? 6 : dow - 1;
    var lun = new Date(jsHoy);
    lun.setDate(jsHoy.getDate() - diffLun);
    var lastSun = new Date(lun);
    lastSun.setDate(lun.getDate() - 1);
    var lastLun = new Date(lastSun);
    lastLun.setDate(lastSun.getDate() - 6);
    for (var d = new Date(lun); d <= jsHoy; d.setDate(d.getDate() + 1)) {
      var o = { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
      var ld = loadDay(o);
      ingEsta += (ld.ef || 0) + (ld.tb || 0);
    }
    for (var d = new Date(lastLun); d <= lastSun; d.setDate(d.getDate() + 1)) {
      var o = { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
      var ld = loadDay(o);
      ingAnterior += (ld.ef || 0) + (ld.tb || 0);
    }
  }
  var tendenciaPct = getTendenciaSemanalPct(ingEsta, ingAnterior);
  var tendenciaTxt = tendenciaPct == null ? '—' : (tendenciaPct > 5 ? 'Vendes más que la semana pasada (+' + Math.round(tendenciaPct) + '%)' : tendenciaPct < -5 ? 'Vendes menos que la semana pasada (' + Math.round(tendenciaPct) + '%)' : 'Muy parecido a la semana pasada');
  var rachaTxt = racha > 0 ? 'Llevas ' + racha + ' día' + (racha === 1 ? '' : 's') + ' cerrando la caja ✓' : '—';
  var diasVerdesTxt = diasVerdes.total > 0 ? diasVerdes.verdes + ' de ' + diasVerdes.total + ' días con ganancia' : '—';
  wrap.innerHTML = '<div class="mes-salud-title">💚 En resumen</div>' +
    '<div class="mes-salud-row"><span>¿Cerraste la caja seguido?</span><span>' + rachaTxt + '</span></div>' +
    '<div class="mes-salud-row"><span>Esta semana vs la anterior</span><span>' + tendenciaTxt + '</span></div>' +
    '<div class="mes-salud-row"><span>Días con ganancia</span><span>' + diasVerdesTxt + '</span></div>';
  wrap.classList.remove('hidden');
}

function renderMesResumenNegocio(y, m, days, dayData, totIng, maxDiaDatos) {
  const resumenNegEl = document.getElementById('mes-resumen-negocio');
  if (!resumenNegEl) return;
  const diasEnMes = new Date(y, m, 0).getDate();
  const promIngresoDia = Math.round(totIng / days.length);
  const proyeccion = promIngresoDia * diasEnMes;
  var ritmoReciente = getPromedioMovil7(dayData.map(function (item) { return item.ing; }));
  var proyeccionRitmo = Math.round(ritmoReciente * diasEnMes);
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const daysPrev = getDaysOfMonth(prevY, prevM);
  const hastaDia = Math.min(maxDiaDatos, new Date(prevY, prevM, 0).getDate());
  const ingEstePeriodo = dayData.filter(item => item.o.d <= hastaDia).reduce((s, item) => s + item.ing, 0);
  const daysPrevMismoPeriodo = daysPrev.filter(o => o.d <= hastaDia);
  let vsAnterior = '';
  if (daysPrevMismoPeriodo.length > 0) {
    let ingPrev = 0;
    daysPrevMismoPeriodo.forEach(o => { const d = loadDay(o); ingPrev += (d.ef||0) + (d.tb||0); });
    const pct = ingPrev > 0 ? Math.round(((ingEstePeriodo - ingPrev) / ingPrev) * 100) : 0;
    vsAnterior = pct >= 0
      ? 'Vendes <span class="mes-vs-pos">' + pct + '% más</span> que en el mismo período del mes pasado'
      : 'Vendes <span class="mes-vs-neg">' + pct + '% menos</span> que en el mismo período del mes pasado';
  } else {
    vsAnterior = 'No hay datos del mes pasado para comparar';
  }
  var objMeta = {};
  try {
    var metaRaw = localStorage.getItem(PREFIX + 'meta');
    if (metaRaw) objMeta = JSON.parse(metaRaw);
  } catch (e) {}
  var objetivoMensual = objMeta.objetivoMensual;
  var lineaObjetivo = '';
  if (typeof objetivoMensual === 'number' && objetivoMensual > 0) {
    var pctObj = Math.round((ingEstePeriodo / objetivoMensual) * 100);
    lineaObjetivo = '<div class="mes-rn-row"><span>Cuánto llevas de tu meta del mes</span><strong>' + pctObj + '% (' + fmt(objetivoMensual) + ')</strong></div>';
  }
  var mrgNum = parseFloat(totIng > 0 ? ((dayData.reduce(function (s, it) { return s + it.neto; }, 0) / totIng) * 100).toFixed(1) : 0);
  var lineaMargenBajo = (mrgNum < 10 && dayData.length >= 3) ? '<div class="mes-rn-row mes-margen-bajo">⚠️ Este mes queda poco margen; conviene revisar los gastos.</div>' : '';
  var lineaProyeccion = ritmoReciente > 0
    ? '<div class="mes-rn-row"><span>Proyección a fin de mes (ritmo últimos 7 días)</span><strong>' + fmt(proyeccionRitmo) + '</strong></div>'
    : '<div class="mes-rn-row"><span>Proyección a fin de mes (promedio del mes)</span><strong>' + fmt(proyeccion) + '</strong></div>';
  resumenNegEl.innerHTML =
    '<div class="mes-rn-title">📈 Cómo va tu mes</div>' +
    '<div class="mes-rn-row"><span>Promedio de ventas por día</span><strong>' + fmt(promIngresoDia) + '</strong></div>' +
    lineaProyeccion +
    lineaObjetivo +
    '<div class="mes-rn-row mes-rn-vs">' + vsAnterior + '</div>' +
    lineaMargenBajo;
  resumenNegEl.classList.add('show');
}

function renderMesNotas(dayData) {
  const notasList = document.getElementById('mes-notas-list');
  if (!notasList) return;
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

function renderMesAvanzado(dayData, totEf, totTb, totIng, semanas, days, y, m) {
  const efPct = totIng > 0 ? (totEf/totIng*100).toFixed(0) : 50;
  const tbPct = totIng > 0 ? (totTb/totIng*100).toFixed(0) : 50;
  document.getElementById('comp-ef-bar').style.width = efPct + '%';
  document.getElementById('comp-tb-bar').style.width = tbPct + '%';
  document.getElementById('comp-ef-pct').textContent = efPct + '%';
  document.getElementById('comp-tb-pct').textContent = tbPct + '%';
  document.getElementById('comp-ef-monto').textContent = fmt(totEf);
  document.getElementById('comp-tb-monto').textContent = fmt(totTb);

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
}

function renderMesDiasTable(dayData, totIng) {
  const diasBody = document.getElementById('dias-mes-body');
  if (!diasBody) return;
  const hoy2 = todayObj();
  const promedioMes = dayData.length > 0 ? totIng / dayData.length : 0;
  diasBody.innerHTML = dayData.map(item => {
    const jsD = new Date(item.o.y, item.o.m-1, item.o.d);
    const netoClass = item.neto >= 0 ? 'td-neto-pos' : 'td-neto-neg';
    const labelDia = `${DIAS_ES[jsD.getDay()].slice(0,3)} ${item.o.d}`;
    const estado = item.cerrado ? 'Cerrado' : 'Pendiente';
    const estadoClass = item.cerrado ? 'dia-estado dia-estado-cerrado' : 'dia-estado dia-estado-pendiente';
    const hoyClass = (item.o.y === hoy2.y && item.o.m === hoy2.m && item.o.d === hoy2.d) ? ' class="dia-hoy"' : '';
    const anomalo = getEsDiaAnomalo(item.ing, promedioMes);
    const badge = anomalo === 'pico' ? ' <span class="dia-badge dia-badge-pico" title="Día con ingresos muy altos">📈</span>' : anomalo === 'bajo' ? ' <span class="dia-badge dia-badge-bajo" title="Día con ingresos muy bajos">📉</span>' : '';
    const ariaLabel = labelDia + ', Ingresos ' + fmt(item.ing) + ', Neto ' + fmt(item.neto) + ', ' + estado + '. Toca o Enter para abrir en Caja.';
    return `<tr${hoyClass} role="button" tabindex="0" aria-label="${escapeHtml(ariaLabel)}" onclick="irADiaDesdeMes(${item.o.y},${item.o.m},${item.o.d})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();irADiaDesdeMes(${item.o.y},${item.o.m},${item.o.d})}">
      <td>${labelDia}${badge}</td>
      <td>${fmt(item.ing)}</td>
      <td>${fmt(item.gs)}</td>
      <td class="${netoClass}">${fmt(item.neto)}</td>
      <td class="${estadoClass}">${estado}</td>
    </tr>`;
  }).join('');
}

function renderMes() {
  const { y, m } = curMes;
  renderMesTitulo();

  const days = getDaysOfMonth(y, m);
  if (days.length === 0) {
    setMesEmptyState();
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
  const mrg    = totIng > 0 ? ((totNeto/totIng)*100).toFixed(1) : 0;

  const diasConDatos = days.map(o => o.d);
  const maxDiaDatos = days.length ? Math.max(...days.map(o => o.d)) : 1;
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

  const mejor = [...dayData].sort((a, b) => b.ing - a.ing)[0];
  dayData.sort((a, b) => dateKey(a.o).localeCompare(dateKey(b.o)));

  var netoHastaCorte = dayData.filter(function (item) { return item.o.d <= corte; }).reduce(function (s, item) { return s + item.neto; }, 0);

  renderMesKPIs(dayData, days, totIng, totGs, totNeto, mrg, numGs, mejor);
  renderMesProgresoDia(corte, diasEnMes, netoHastaCorte);
  renderMesCorte(y, m, corte, dayData);
  renderMesResumenNegocio(y, m, days, dayData, totIng, maxDiaDatos);
  renderMesEstaSemana(y, m, hoy);
  renderMesNotas(dayData);
  renderMesDiasTable(dayData, totIng);

  var pendientesConDatos = dayData.filter(function (x) { return !x.cerrado && (x.ing > 0 || x.gs > 0); });
  var masivoEl = document.getElementById('mes-cierre-masivo');
  var countEl = document.getElementById('mes-pendientes-count');
  if (masivoEl) masivoEl.style.display = pendientesConDatos.length > 0 ? 'block' : 'none';
  if (countEl) countEl.textContent = pendientesConDatos.length;

  const semanas = agruparSemanas(days, y, m);
  renderMesAvanzado(dayData, totEf, totTb, totIng, semanas, days, y, m);
  renderMesSalud(dayData, mrg, semanas, y, m, hoy);
}

function irADiaDesdeMes(y, m, d) {
  cur = { y, m, d };
  S = loadDay(cur);
  paso1Guardado = !!S.efHora;
  paso2Guardado = !!S.tbHora;
  const notaIn = document.getElementById('nota-in');
  if (notaIn) notaIn.value = S.nota || '';
  cajaPaso = 1;
  updateDateHeader();
  renderCaja();
  setTab('caja');
}

/** Cierre masivo: marca como cerrados todos los días del mes actual que tengan datos y estén pendientes. */
function confirmarCierreMasivoMes() {
  var y = curMes.y;
  var m = curMes.m;
  var days = getDaysOfMonth(y, m);
  var pendientes = [];
  for (var i = 0; i < days.length; i++) {
    var d = loadDay(days[i]);
    var ing = (d.ef || 0) + (d.tb || 0);
    var gs = (d.gastos || []).reduce(function (s, g) { return s + g.monto; }, 0);
    if (!d.cerrado && (ing > 0 || gs > 0)) pendientes.push(days[i]);
  }
  if (pendientes.length === 0) {
    toast('No hay días pendientes con datos en este mes.');
    return;
  }
  if (!confirm('Se cerrarán ' + pendientes.length + ' día(s) que tienen datos y están pendientes.\n¿Continuar?')) {
    return;
  }
  var horaCierre = hora();
  for (var i = 0; i < pendientes.length; i++) {
    var o = pendientes[i];
    var data = loadDay(o);
    data.cerrado = true;
    data.cerradoHora = horaCierre;
    saveDay(o, data);
  }
  var curKey = dateKey(cur);
  var cerramosElActual = pendientes.some(function (o) { return dateKey(o) === curKey; });
  if (cerramosElActual) {
    S = loadDay(cur);
    renderCaja();
  }
  renderMes();
  toast(pendientes.length + ' días cerrados ✓', 'success');
}

function scrollAPaso(n) {
  const el = document.getElementById('caja-paso-' + n);
  if (!el) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

function actualizarCajaWizardUI() {
  const maxPaso = 4;
  if (cajaPaso < 1) cajaPaso = 1;
  if (cajaPaso > maxPaso) cajaPaso = maxPaso;
  var viewCaja = document.getElementById('view-caja');
  if (viewCaja) viewCaja.setAttribute('data-caja-paso', String(cajaPaso));
  document.querySelectorAll('.caja-step-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.caja-step-' + cajaPaso).forEach(p => p.classList.add('active'));
  const prev = document.getElementById('cw-prev');
  const next = document.getElementById('cw-next');
  const label = document.getElementById('cw-label');
  const help  = document.getElementById('cw-help');
  if (prev) prev.disabled = (cajaPaso === 1);
  if (next) {
    next.style.display = '';
    var notaEl = document.getElementById('nota-in');
    var notaVal = notaEl ? notaEl.value.trim() : '';
    var notaGuardada = (S.nota || '') === notaVal;
    var bloqueado = (cajaPaso === 1 && !paso1Guardado) || (cajaPaso === 2 && !paso2Guardado) || (cajaPaso === 3 && !notaGuardada);
    next.disabled = !!bloqueado;
  }
  if (help) help.style.display = '';
  var txt = '';
  var helpTxt = '';
  var check = '';
  if (cajaPaso === 1) {
    txt = 'Paso 1 de 4 · Efectivo en caja';
    helpTxt = 'Escribe el total y pulsa Guardar.';
    if (paso1Guardado) check = ' ✓';
  }
  if (cajaPaso === 2) {
    txt = 'Paso 2 de 4 · Transbank (tarjeta)';
    helpTxt = 'Escribe el total del cierre y pulsa Guardar.';
    if (paso2Guardado) check = ' ✓';
  }
  if (cajaPaso === 3) {
    txt = 'Paso 3 de 4 · Gastos y nota';
    helpTxt = 'Agrega cada egreso y, si quieres, una nota.';
  }
  if (cajaPaso === 4) {
    txt = 'Paso 4 de 4 · Revisar y cerrar el día';
    helpTxt = 'Revisa el resultado y confirma el cierre.';
  }
  if (label) label.innerHTML = txt + (check ? '<span class="cw-check" aria-hidden="true">' + check + '</span>' : '');
  if (help) help.textContent = helpTxt;
  for (var i = 1; i <= 4; i++) {
    var chip = document.getElementById('cw-chip-' + i);
    if (chip) {
      chip.setAttribute('aria-selected', i === cajaPaso ? 'true' : 'false');
      chip.classList.toggle('active', i === cajaPaso);
    }
  }
  focusPrimerControlPaso(cajaPaso);
}

function focusPrimerControlPaso(paso) {
  var el = null;
  if (paso === 1) el = document.getElementById('ef-in');
  else if (paso === 2) el = document.getElementById('tb-in');
  else if (paso === 3) el = document.getElementById('gs-desc');
  else if (paso === 4) {
    var btnCerrar = document.getElementById('btn-cerrar-dia');
    if (btnCerrar && !btnCerrar.disabled) el = btnCerrar;
    else el = document.querySelector('#view-caja .rc-quick-links .btn');
  }
  if (el && typeof el.focus === 'function') {
    setTimeout(function () { el.focus({ preventScroll: true }); }, 100);
  }
}

function cajaPasoSiguiente() {
  if (cajaPaso === 1 && !paso1Guardado) {
    toast('Guarda el efectivo antes de continuar.');
    return;
  }
  if (cajaPaso === 2 && !paso2Guardado) {
    toast('Guarda el Transbank antes de continuar.');
    return;
  }
  if (cajaPaso === 3) {
    const notaEl = document.getElementById('nota-in');
    const notaVal = notaEl ? notaEl.value.trim() : '';
    if (notaVal !== (S.nota || '')) {
      toast('Guarda la nota del día antes de continuar (o bórrala).');
      return;
    }
  }
  cajaPaso++;
  actualizarCajaWizardUI();
  scrollAPaso(cajaPaso);
}
function cajaPasoAnterior() { cajaPaso--; actualizarCajaWizardUI(); scrollAPaso(cajaPaso); }

function irPasoCaja(n) {
  cajaPaso = n;
  actualizarCajaWizardUI();
  scrollAPaso(n);
}

function confirmarCierreDia() {
  if (!S) return;
  const { totG, totI } = calcularResumenDia(S);
  if (totI === 0 && totG === 0) {
    if (!confirm('¿No abriste este día? Se marcará como cerrado con $0 en ventas y sin gastos.')) {
      return;
    }
  }
  S.cerrado = true;
  S.cerradoHora = hora();
  saveDay(cur, S);
  showGuardadoIndicator();
  renderCaja();
  const jsD = new Date(cur.y, cur.m - 1, cur.d);
  const label = `${DIAS_ES[jsD.getDay()]} ${cur.d}`;
  toast(label + ' cerrado ✓', 'success');
}

/** Atajo: cerrar el día como "no abrí" sin pasar por los 4 pasos. Solo visible cuando no hay datos. */
function cerrarDiaSinVentas() {
  if (!S) return;
  const { totI, totG } = calcularResumenDia(S);
  if (totI !== 0 || totG !== 0) {
    toast('Hay datos ingresados. Usa "Confirmar cierre del día" en el paso 4.');
    return;
  }
  if (!confirm('¿Cerrar este día como "no abrí"? Se guardará con $0 en ventas y sin gastos.')) return;
  S.ef = 0;
  S.tb = 0;
  S.gastos = [];
  S.nota = S.nota || '';
  S.cerrado = true;
  S.cerradoHora = hora();
  saveDay(cur, S);
  showGuardadoIndicator();
  renderCaja();
  const jsD = new Date(cur.y, cur.m - 1, cur.d);
  toast(jsD.getDate() + ' cerrado (sin ventas) ✓', 'success');
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
  paso1Guardado = !!S.efHora;
  paso2Guardado = !!S.tbHora;
  const notaIn = document.getElementById('nota-in');
  if (notaIn) notaIn.value = S.nota || '';
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
function formatKeyAsDate(key) {
  if (!key || key.length < 10) return key;
  var p = key.split('-');
  var d = parseInt(p[2], 10), m = parseInt(p[1], 10), y = parseInt(p[0], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return key;
  return d + ' ' + MESES_SH[m - 1] + ' ' + y;
}

function renderBackup() {
  const keys = allDayKeys();
  document.getElementById('st-dias').textContent = keys.length;
  document.getElementById('st-inicio').textContent = keys.length ? formatKeyAsDate(keys[0]) : '—';
  document.getElementById('st-ultimo').textContent = keys.length ? formatKeyAsDate(keys[keys.length - 1]) : '—';
  let size = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) size += (localStorage.getItem(k) || '').length;
  }
  document.getElementById('st-size').textContent = (size / 1024).toFixed(1) + ' KB';
  let lastBackup = 'Nunca';
  let lastBackupDate = null;
  try {
    const metaRaw = localStorage.getItem(PREFIX + 'meta');
    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      if (meta && meta.lastBackupAt) {
        const iso = meta.lastBackupAt;
        lastBackupDate = new Date(iso);
        if (isFinite(lastBackupDate.getTime())) {
          lastBackup = lastBackupDate.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } else {
          const match = String(iso).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (match) {
            lastBackupDate = new Date(match[3], parseInt(match[2], 10) - 1, parseInt(match[1], 10));
            lastBackup = meta.lastBackupAt;
          }
        }
      }
    }
  } catch {}
  const stBackup = document.getElementById('st-backup');
  if (stBackup) stBackup.textContent = lastBackup;

  const backupEmpty = document.getElementById('backup-empty-state');
  const reminder = document.getElementById('backup-reminder');
  if (backupEmpty) backupEmpty.style.display = lastBackup === 'Nunca' ? 'block' : 'none';

  if (reminder) {
    const diasSinBackup = lastBackupDate ? Math.floor((Date.now() - lastBackupDate.getTime()) / (24 * 60 * 60 * 1000)) : 999;
    if (lastBackup === 'Nunca') {
      reminder.classList.remove('show');
    } else if (diasSinBackup > 7) {
      reminder.classList.add('show');
      var msgEl = reminder.querySelector('.backup-reminder-msg');
      if (msgEl) msgEl.textContent = 'Han pasado más de 7 días desde tu último respaldo. Descarga uno para no perder datos.';
    } else {
      reminder.classList.remove('show');
    }
  }
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
  toast('Respaldo descargado 💾', 'success');
  try {
    const metaRaw = localStorage.getItem(PREFIX + 'meta');
    const meta = metaRaw ? JSON.parse(metaRaw) : {};
    meta.lastBackupAt = new Date().toISOString();
    localStorage.setItem(PREFIX + 'meta', JSON.stringify(meta));
  } catch {}
  renderBackup();
}

function validarEstructuraBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: 'Archivo inválido: no es un objeto JSON.' };
  }
  const dayKeyRe = /^fe_\d{4}-\d{2}-\d{2}$/;
  let tieneClaveDia = false;
  let primeraClaveDia = null;
  for (const k of Object.keys(data)) {
    if (dayKeyRe.test(k)) {
      tieneClaveDia = true;
      if (primeraClaveDia == null) primeraClaveDia = k;
    }
  }
  if (!tieneClaveDia || !primeraClaveDia) {
    return { ok: false, message: 'Este archivo no parece un respaldo de Florería Elizabeth. Debe contener datos de días (fe_YYYY-MM-DD).' };
  }
  const raw = data[primeraClaveDia];
  if (typeof raw !== 'string' || raw.length > 50000) {
    return { ok: false, message: 'Formato de datos incorrecto en el archivo.' };
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'El contenido del respaldo está dañado o no es válido.' };
  }
  if (!obj || typeof obj !== 'object') {
    return { ok: false, message: 'Cada día debe ser un objeto (efectivo, transbank, gastos).' };
  }
  const hasEf = typeof obj.ef === 'number' || obj.ef === undefined;
  const hasTb = typeof obj.tb === 'number' || obj.tb === undefined;
  const hasGastos = Array.isArray(obj.gastos) || obj.gastos === undefined;
  if (!hasEf || !hasTb || !hasGastos) {
    return { ok: false, message: 'Este archivo no es un respaldo de Florería Elizabeth. Comprueba que sea el .json descargado desde esta app.' };
  }
  return { ok: true };
}

function descargarBackupPreRestore() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) data[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const ts = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  a.href = url;
  a.download = 'floreria-pre-restore-' + ts + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function restaurarBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const valid = validarEstructuraBackup(data);
      if (!valid.ok) {
        toast('⚠️ ' + valid.message);
        input.value = '';
        return;
      }
      const dayKeys = Object.keys(data).filter(k => k.startsWith(PREFIX) && /^fe_\d{4}-\d{2}-\d{2}$/.test(k));
      const numDias = dayKeys.length;
      const primera = dayKeys.length ? dayKeys[0].replace(PREFIX, '') : '—';
      const ultima = dayKeys.length ? dayKeys[dayKeys.length - 1].replace(PREFIX, '') : '—';
      const msg = 'Vas a reemplazar TODOS los datos actuales.\n\n' +
        'Este respaldo tiene ' + numDias + ' día(s), desde ' + primera + ' hasta ' + ultima + '.\n' +
        'Solo quedarán esos días; cualquier otro día que tengas aquí se perderá.\n\n' +
        'Se descargará un backup de lo que tienes ahora antes de restaurar.\n\n¿Continuar?';
      if (!confirm(msg)) {
        input.value = '';
        return;
      }
      descargarBackupPreRestore();
      toast('Restaurando respaldo…');
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      let count = 0;
      Object.entries(data).forEach(([k, v]) => {
        if (!k.startsWith(PREFIX)) return;
        if (k === PREFIX + 'meta') {
          try { localStorage.setItem(k, v); } catch (_) {}
          return;
        }
        if (typeof v !== 'string' || v.length > 50000) return;
        let obj;
        try {
          obj = JSON.parse(v);
        } catch {
          return;
        }
        const normalized = normalizeDayData(obj);
        try {
          localStorage.setItem(k, JSON.stringify(normalized));
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
      toast('✓ Respaldo restaurado (' + count + ' días)', 'success');
    } catch {
      toast('⚠️ Archivo inválido. No se pudo leer el JSON.');
    }
    input.value = '';
  };
  reader.readAsText(file);
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
  const primary = ov.querySelector('.modal-btns .btn-danger') || ov.querySelector('#modal-btn-limpiar');
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
  toast('Día limpiado 🌸', 'success');
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
  navigator.clipboard.writeText(txt).then(function(){ toast('Resumen copiado 📋', 'success'); }).catch(function(){
    const ta=document.createElement('textarea'); ta.value=txt;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    toast('Resumen copiado 📋', 'success');
  });
}

/* ──────────────────────────────────────────────────
   TOAST
────────────────────────────────────────────────── */
function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('toast--success');
  if (type === 'success') el.classList.add('toast--success');
  el.classList.add('show');
  setTimeout(function () { el.classList.remove('show'); }, 2600);
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
    if (id==='ef-in')   guardarEfectivoYSiguiente();
    if (id==='tb-in')   guardarTransbankYSiguiente();
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
  paso1Guardado = !!S.efHora;
  paso2Guardado = !!S.tbHora;
  const efIn = document.getElementById('ef-in');
  const tbIn = document.getElementById('tb-in');
  if (efIn) efIn.addEventListener('input', function () { paso1Guardado = false; actualizarCajaWizardUI(); });
  if (tbIn) tbIn.addEventListener('input', function () { paso2Guardado = false; actualizarCajaWizardUI(); });
  const notaIn = document.getElementById('nota-in');
  if (notaIn) notaIn.addEventListener('input', actualizarCajaWizardUI);
  updateDateHeader();
  renderCaja();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
