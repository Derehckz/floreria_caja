/* ──────────────────────────────────────────────────
   ESTADO GLOBAL (dominio y almacenamiento en js/domain.js y js/storage.js)
   Estado agrupado en un solo objeto para claridad y tests.
────────────────────────────────────────────────── */
const DIAS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES_ES  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_SH  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const state = {
  cur: todayObj(),
  curMes: null,
  mesCorteDia: null,
  cajaPaso: 1,
  paso1Guardado: false,
  paso2Guardado: false,
  lastSavedAt: null,
  guardadoTimeout: null,
  S: null,
  historicoSort: { by: 'fecha', dir: -1 }
};
state.curMes = { y: state.cur.y, m: state.cur.m };
state.S = loadDay(state.cur);

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
  state.lastSavedAt = hora();
  const el = document.getElementById('guardado-indicator');
  if (!el) return;
  el.textContent = 'Guardado ' + state.lastSavedAt;
  el.classList.add('show');
  if (state.guardadoTimeout) clearTimeout(state.guardadoTimeout);
  state.guardadoTimeout = setTimeout(function () {
    el.classList.remove('show');
    state.guardadoTimeout = null;
  }, 2500);
}

/* ──────────────────────────────────────────────────
   HEADER FECHA
────────────────────────────────────────────────── */
function updateDateHeader() {
  const jsDate = new Date(state.cur.y, state.cur.m - 1, state.cur.d);
  document.getElementById('dn-day').textContent = DIAS_ES[jsDate.getDay()];
  document.getElementById('dn-date').textContent = `${state.cur.d} ${MESES_SH[state.cur.m - 1]} ${state.cur.y}`;
  document.getElementById('btn-sig').disabled = isToday(state.cur);
  /* ro-banner lo controla solo renderCaja() para no duplicar lógica de notificaciones */

  document.getElementById('rc-date').textContent = `${state.cur.d}/${state.cur.m}/${state.cur.y}`;

  const dot = document.getElementById('dn-today-dot');
  if (dot) dot.style.display = isToday(state.cur) ? 'inline-block' : 'none';

  updateCajaDiaStatusChip();
}

function updateCajaDiaStatusChip() {
  const chip = document.getElementById('caja-dia-status-chip');
  if (!chip) return;
  const resumen = state.S ? calcularResumenDia(state.S) : { totI: 0, totG: 0 };
  const { totI, totG } = resumen;
  chip.classList.remove('caja-status-pendiente', 'caja-status-cerrado', 'caja-status-sin-datos');
  if (state.S && state.S.cerrado) {
    chip.textContent = 'Día cerrado';
    chip.classList.add('caja-status-cerrado');
  } else if (totI > 0 || totG > 0) {
    chip.textContent = 'Día pendiente';
    chip.classList.add('caja-status-pendiente');
  } else {
    chip.textContent = 'Sin datos';
    chip.classList.add('caja-status-sin-datos');
  }
}

function cambiarDia(d) {
  const jsDate = new Date(state.cur.y, state.cur.m - 1, state.cur.d);
  jsDate.setDate(jsDate.getDate() + d);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (jsDate > hoy) return;
  state.cur = { y: jsDate.getFullYear(), m: jsDate.getMonth() + 1, d: jsDate.getDate() };
  state.S = loadDay(state.cur);
  state.paso1Guardado = !!state.S.efHora;
  state.paso2Guardado = !!state.S.tbHora;
  document.getElementById('nota-in').value = state.S.nota || '';
  state.cajaPaso = 1;
  updateDateHeader();
  renderCaja();
}
function irAHoy() {
  state.cur = todayObj();
  state.S = loadDay(state.cur);
  state.paso1Guardado = !!state.S.efHora;
  state.paso2Guardado = !!state.S.tbHora;
  document.getElementById('nota-in').value = state.S.nota || '';
  state.cajaPaso = 1;
  updateDateHeader();
  renderCaja();
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
  const respaldoBtn = document.getElementById('header-respaldo-btn');
  if (respaldoBtn) respaldoBtn.classList.remove('active');
  if (name === 'backup') {
    document.getElementById('view-backup').classList.add('active');
    if (respaldoBtn) respaldoBtn.classList.add('active');
    renderBackup();
  } else {
    const btn = document.getElementById('tab-' + name);
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    }
    document.getElementById('view-' + name).classList.add('active');
    if (name === 'mes') renderMes();
    else if (name === 'historico') renderHistorico();
  }
  const appBody = document.getElementById('app-body');
  if (appBody) appBody.scrollTo(0, 0);
  document.body.classList.toggle('tab-caja-active', name === 'caja');
  const notifBtn = document.getElementById('header-notif-btn');
  if (notifBtn && name !== 'caja') cerrarNotifPanel();
  /* Al entrar a Caja siempre refrescamos vista y notificaciones para que campanita y badge sean coherentes */
  if (name === 'caja') {
    renderCaja();
  }
}

function toggleRespaldo() {
  const backupView = document.getElementById('view-backup');
  if (backupView && backupView.classList.contains('active')) {
    setTab('caja');
  } else {
    setTab('backup');
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('header-notif-btn');
  if (!panel || !btn) return;
  const isOpen = panel.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen);
  panel.setAttribute('aria-hidden', !isOpen);
}

function cerrarNotifPanel() {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('header-notif-btn');
  if (panel) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/**
 * Actualiza el badge de la campanita y el panel de avisos.
 * Regla: solo debe llamarse cuando las notificaciones ya tienen .show correcto
 * (p. ej. al final de renderCaja o tras init). No modifica quién tiene .show.
 */
function updateNotifPanelUI() {
  const ro = document.getElementById('ro-banner');
  const noAbri = document.getElementById('caja-no-abri-wrap');
  const estado = document.getElementById('estado-general');
  const pending = document.getElementById('pending-banner');
  const night = document.getElementById('night-reminder');
  const count = [ro, noAbri, estado, pending, night].filter(el => el && el.classList.contains('show')).length;
  const badge = document.getElementById('header-notif-badge');
  const notifBtn = document.getElementById('header-notif-btn');
  const empty = document.getElementById('notif-panel-empty');
  const list = document.getElementById('caja-notifications');
  if (badge) {
    badge.textContent = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
    badge.classList.toggle('has-count', count > 0);
  }
  if (notifBtn) {
    const avisosTxt = count === 0 ? 'Avisos' : count === 1 ? '1 aviso' : count + ' avisos';
    notifBtn.setAttribute('title', avisosTxt);
    notifBtn.setAttribute('aria-label', count > 0 ? 'Ver ' + avisosTxt : 'Ver avisos y notificaciones');
  }
  if (empty) empty.classList.toggle('show', count === 0);
  if (list) list.style.display = count > 0 ? 'flex' : 'none';
}

/* ──────────────────────────────────────────────────
   CAJA — ACCIONES
────────────────────────────────────────────────── */
/* parseMontoInput está en js/domain.js */
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
  state.S[t] = v;
  state.S[t + 'Hora'] = hora();
  state.S.cerrado = false;
  document.getElementById(t + '-in').value = '';
  if (!saveDay(state.cur, state.S)) return false;
  showGuardadoIndicator();
  if (t === 'ef') state.paso1Guardado = true;
  if (t === 'tb') state.paso2Guardado = true;
  renderCaja();
  actualizarCajaWizardUI();
  const nombre = t === 'ef' ? 'Efectivo' : 'Transbank';
  toast(nombre + ' guardado: ' + fmt(v) + ' ✓', 'success');
  return true;
}

/**
 * Guarda efectivo o transbank y avanza al siguiente paso.
 * @param {'ef'|'tb'} tipo - 'ef' efectivo, 'tb' transbank
 */
function guardarMontoYSiguiente(tipo) {
  const inputId = tipo === 'ef' ? 'ef-in' : 'tb-in';
  const raw = document.getElementById(inputId).value;
  const v = parseMontoInput(raw);
  const pasoActual = tipo === 'ef' ? 1 : 2;
  const pasoSiguiente = tipo === 'ef' ? 2 : 3;
  const yaGuardado = tipo === 'ef' ? state.paso1Guardado : state.paso2Guardado;
  const valorGuardado = tipo === 'ef' ? state.S.ef : state.S.tb;
  const ejemplo = tipo === 'ef' ? '85000' : '120000';

  if (!isNaN(v) && v >= 0) {
    if (setMonto(tipo)) {
      state.cajaPaso = pasoSiguiente;
      actualizarCajaWizardUI();
      scrollAPaso(pasoSiguiente);
    }
    return;
  }
  if (yaGuardado || (typeof valorGuardado === 'number' && valorGuardado >= 0)) {
    state.cajaPaso = pasoSiguiente;
    actualizarCajaWizardUI();
    scrollAPaso(pasoSiguiente);
    return;
  }
  toast('Ingresa un monto válido (solo números). Ej: ' + ejemplo);
}

function guardarEfectivoYSiguiente() {
  guardarMontoYSiguiente('ef');
}

function guardarTransbankYSiguiente() {
  guardarMontoYSiguiente('tb');
}

function addGasto() {
  const d = document.getElementById('gs-desc').value.trim();
  const m = parseInt(document.getElementById('gs-mn').value);
  if (!d)         { toast('Escribe una descripción 📝'); return; }
  if (!m || m<=0) { toast('Monto inválido 💰'); return; }
  if (!state.S.gastos) state.S.gastos = [];
  state.S.gastos.push({ id: Date.now(), desc: d, monto: m, hora: hora() });
  state.S.cerrado = false;
  document.getElementById('gs-desc').value = '';
  document.getElementById('gs-mn').value   = '';
  document.getElementById('gs-desc').focus();
  if (!saveDay(state.cur, state.S)) return;
  showGuardadoIndicator();
  renderCaja();
  toast('Gasto: ' + fmt(m) + ' ✓', 'success');
}

function delGasto(id) {
  state.S.gastos = state.S.gastos.filter(g => g.id !== id);
  if (!saveDay(state.cur, state.S)) return;
  showGuardadoIndicator();
  renderCaja();
  toast('Eliminado');
}

function guardarNota() {
  const n = document.getElementById('nota-in').value.trim();
  state.S.nota = n;
  state.S.cerrado = false;
  if (!saveDay(state.cur, state.S)) return;
  showGuardadoIndicator();
  renderCaja();
  actualizarCajaWizardUI();
  toast('Nota guardada ✓', 'success');
}

/** Guarda la nota y avanza al paso 4 (Revisar y cerrar). */
function guardarNotaYSiguiente() {
  const n = document.getElementById('nota-in') ? document.getElementById('nota-in').value.trim() : '';
  state.S.nota = n;
  state.S.cerrado = false;
  if (!saveDay(state.cur, state.S)) return;
  showGuardadoIndicator();
  renderCaja();
  toast('Nota guardada ✓', 'success');
  state.cajaPaso = 4;
  actualizarCajaWizardUI();
  scrollAPaso(4);
}

function toggleNotaExpand() {
  const wrap = document.getElementById('nota-wrap-collapsible');
  const body = document.getElementById('nota-body');
  const toggleBtn = document.getElementById('nota-toggle');
  if (!wrap || !body) return;
  const isExpanded = wrap.classList.toggle('nota-expanded');
  body.hidden = !isExpanded;
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  if (isExpanded) {
    setTimeout(function () {
      const notaIn = document.getElementById('nota-in');
      if (notaIn && typeof notaIn.focus === 'function') notaIn.focus();
    }, 80);
  }
}

function toggleRcWeekDetail() {
  const detail = document.getElementById('rc-week-detail');
  const toggle = document.getElementById('rc-week-toggle');
  if (!detail || !toggle) return;
  const isExpanded = detail.classList.toggle('rc-week-detail-expanded');
  toggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  toggle.textContent = isExpanded ? 'Ocultar detalle' : 'Ver detalle de la semana';
}

/* ──────────────────────────────────────────────────
   CAJA — RENDER (por secciones)
   Revisión cerrada: flujo único vía modal; toast visible
   en móvil (abajo) y PC (arriba); atajo por state.S.ef / state.S.tb.
────────────────────────────────────────────────── */
function renderCajaKPIs(resumen) {
  const { gastos, totG, totI, neto } = resumen;
  document.getElementById('k-ef').textContent = fmt(state.S.ef||0);
  document.getElementById('k-tb').textContent = fmt(state.S.tb||0);
  document.getElementById('k-gs').textContent = fmt(totG);
  document.getElementById('k-gs-n').textContent = gastos.length === 0 ? '0 egresos' : (gastos.length === 1 ? '1 egreso' : gastos.length + ' egresos');

  const heroEl = document.getElementById('kpi-hero-val');
  if (heroEl) {
    heroEl.textContent = fmt(neto);
    heroEl.classList.remove('positive', 'negative', 'zero');
    if (totI === 0 && totG === 0) heroEl.classList.add('zero');
    else if (neto >= 0) heroEl.classList.add('positive');
    else heroEl.classList.add('negative');
  }
  const heroLabel = document.getElementById('kpi-hero-label');
  if (heroLabel) heroLabel.textContent = isToday(state.cur) ? 'Lo que te queda hoy' : 'Resultado del día';

  const ctxWrap = document.getElementById('kpi-context-wrap');
  const ctxEl = document.getElementById('kpi-context');
  const chipEl = document.getElementById('kpi-chip');
  const diaLabel = isToday(state.cur) ? 'Hoy' : 'Este día';
  if (ctxEl) {
    const daysMes = getDaysOfMonth(state.cur.y, state.cur.m);
    const diasAnteriores = daysMes.filter(o => o.d < state.cur.d);
    if (diasAnteriores.length > 0) {
      let sumOtros = 0;
      diasAnteriores.forEach(o => { const d = loadDay(o); sumOtros += (d.ef||0) + (d.tb||0); });
      const promDia = Math.round(sumOtros / diasAnteriores.length);
      ctxEl.innerHTML = '<span class="kpi-ctx-label">📊 Promedio diario del mes (días anteriores): <strong>' + escapeHtml(String(fmt(promDia))) + '</strong></span>';
      if (totI > 0) {
        const pct = promDia > 0 ? Math.round(((totI - promDia) / promDia) * 100) : 0;
        const txt = pct > 0 ? escapeHtml(diaLabel) + ' <span class="kpi-ctx-pos">+' + pct + '% sobre el promedio</span>' : pct < 0 ? escapeHtml(diaLabel) + ' <span class="kpi-ctx-neg">' + pct + '% bajo el promedio</span>' : escapeHtml(diaLabel) + ' al promedio';
        ctxEl.innerHTML += ' · ' + txt;
      }
      ctxEl.classList.add('show');
      if (chipEl && totI > 0 && promDia > 0) {
        const pctChip = Math.round(((totI - promDia) / promDia) * 100);
        chipEl.textContent = pctChip > 0 ? diaLabel + ' +' + pctChip + '% vs promedio' : pctChip < 0 ? diaLabel + ' ' + pctChip + '% vs promedio' : diaLabel + ' al promedio';
        chipEl.classList.add('show');
      } else if (chipEl) chipEl.classList.remove('show');
      if (ctxWrap) ctxWrap.classList.add('show');
    } else {
      ctxEl.textContent = '';
      ctxEl.classList.remove('show');
      if (chipEl) {
        if (state.cur.d === 1) {
          chipEl.textContent = 'Primer día del mes';
          chipEl.classList.add('show');
          if (ctxWrap) ctxWrap.classList.add('show');
        } else {
          chipEl.classList.remove('show');
          if (ctxWrap) ctxWrap.classList.remove('show');
        }
      } else if (ctxWrap) ctxWrap.classList.remove('show');
    }
  }
}

function renderCajaPasosEfectivoTransbank() {
  document.getElementById('ef-disp').textContent = fmt(state.S.ef||0);
  document.getElementById('tb-disp').textContent = fmt(state.S.tb||0);
  const efLast = document.getElementById('ef-last');
  if (efLast) {
    efLast.textContent = (state.S.ef || 0) > 0
      ? (state.S.efHora ? 'Guardado a las ' + escapeHtml(state.S.efHora) : 'Guardado')
      : 'Escribe el total y pulsa Guardar.';
  }
  const tbLast = document.getElementById('tb-last');
  if (tbLast) {
    tbLast.textContent = (state.S.tb || 0) > 0
      ? (state.S.tbHora ? 'Guardado a las ' + escapeHtml(state.S.tbHora) : 'Guardado')
      : 'Escribe el total y pulsa Guardar.';
  }
  const efWrap = document.getElementById('field-wrap-ef');
  const tbWrap = document.getElementById('field-wrap-tb');
  if (efWrap) efWrap.classList.toggle('saved', !!state.S.efHora);
  if (tbWrap) tbWrap.classList.toggle('saved', !!state.S.tbHora);
}

function renderCajaPasoGastosYNota(resumen) {
  const { gastos, totG } = resumen;
  const notaIn = document.getElementById('nota-in');
  if (document.activeElement !== notaIn) notaIn.value = state.S.nota || '';
  document.getElementById('nota-disp').textContent = state.S.nota ? '✓ Nota guardada' : '';

  const notaWrap = document.getElementById('nota-wrap-collapsible');
  const notaBody = document.getElementById('nota-body');
  const notaSummary = document.getElementById('nota-toggle-summary');
  if (notaWrap && notaBody) {
    if (state.S.nota && state.S.nota.trim()) {
      notaWrap.classList.add('nota-expanded');
      notaBody.hidden = false;
      const toggleBtn = document.getElementById('nota-toggle');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
      if (notaSummary) notaSummary.textContent = state.S.nota.length > 40 ? state.S.nota.substring(0, 40) + '…' : state.S.nota;
    } else {
      notaWrap.classList.remove('nota-expanded');
      notaBody.hidden = true;
      const toggleBtn = document.getElementById('nota-toggle');
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
  const totalWrap = document.getElementById('gs-total-wrap');
  const totalVal = document.getElementById('gs-total');
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

  document.getElementById('rc-ef').textContent  = fmt(state.S.ef||0);
  document.getElementById('rc-tb').textContent  = fmt(state.S.tb||0);
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
    estEl.textContent = isToday(state.cur) ? `Ganaste plata hoy · margen ${mrg.toFixed(1)}%` : `Ganancia del día · margen ${mrg.toFixed(1)}%`;
  } else {
    netoEl.classList.add('nv-neg');
    estEl.textContent = isToday(state.cur) ? `Perdiste plata hoy · ${fmt(Math.abs(neto))}` : `Pérdida del día · ${fmt(Math.abs(neto))}`;
  }

  const mfill = document.getElementById('rc-mrg-fill');
  mfill.style.width = mrg.toFixed(1) + '%';
  mfill.classList.toggle('neg', neto < 0);
  document.getElementById('rc-mrg-pct').textContent = mrg.toFixed(1) + '%';

  const jsCur = new Date(state.cur.y, state.cur.m - 1, state.cur.d);
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
  const weekToggle = document.getElementById('rc-week-toggle');
  const weekDetail = document.getElementById('rc-week-detail');
  const lunesLabel = `${desdeObj.d}/${desdeObj.m}`;
  const hoyLabel = `${state.cur.d}/${state.cur.m}`;
  const weekSection = document.getElementById('rc-week-section');
  if (acIng === 0 && acGs === 0) {
    if (weekEl) weekEl.textContent = '';
    if (weekToggle) weekToggle.style.display = 'none';
    if (weekDetail) weekDetail.classList.remove('has-data');
    if (weekSection) weekSection.style.display = 'none';
  } else {
    if (weekEl) {
      weekEl.innerHTML =
        `<strong>Semana actual (${lunesLabel}–${hoyLabel}):</strong> ` +
        `Ingresos ${fmt(acIng)}, Gastos ${fmt(acGs)}, Neto ${fmt(acNeto)}`;
    }
    if (weekToggle) weekToggle.style.display = '';
    if (weekDetail) weekDetail.classList.add('has-data');
    if (weekSection) weekSection.style.display = 'block';
  }

  const sparkEl = document.getElementById('rc-sparkline');
  if (sparkEl) {
    const semanaIngresos = [];
    const iter = new Date(lunesDate);
    while (iter <= jsCur) {
      const o = { y: iter.getFullYear(), m: iter.getMonth() + 1, d: iter.getDate() };
      const d = loadDay(o);
      semanaIngresos.push((d.ef || 0) + (d.tb || 0));
      iter.setDate(iter.getDate() + 1);
    }
    const maxIng = Math.max.apply(null, semanaIngresos.concat([1]));
    sparkEl.innerHTML = semanaIngresos.map(function (ing) {
      const pct = maxIng > 0 ? (ing / maxIng * 100).toFixed(0) : 0;
      return '<div class="spark-bar"><div class="spark-fill" style="height:' + pct + '%"></div></div>';
    }).join('');
    sparkEl.classList.toggle('hidden', semanaIngresos.length === 0);
  }

  const btnCerrar = document.getElementById('btn-cerrar-dia');
  if (btnCerrar) {
    if (state.S.cerrado) {
      btnCerrar.textContent = '✅ Día cerrado (puedes editar si es necesario)';
      btnCerrar.disabled = false;
    } else {
      btnCerrar.textContent = (totI === 0 && totG === 0)
        ? 'No abrí hoy — Guardar y cerrar día'
        : '✅ Guardar y cerrar día';
      btnCerrar.disabled = false;
    }
  }

  const statusChip = document.getElementById('rc-status-chip');
  if (statusChip) {
    statusChip.classList.remove('cerrado','pendiente');
    if (state.S.cerrado) {
      const txtHora = state.S.cerradoHora ? ` a las ${escapeHtml(state.S.cerradoHora)}` : '';
      statusChip.textContent = `Día cerrado${txtHora}`;
      statusChip.classList.add('cerrado');
    } else {
      statusChip.textContent = 'Día pendiente de cerrar';
      statusChip.classList.add('pendiente');
    }
  }
}

function renderEstadoGeneral() {
  const el = document.getElementById('estado-general');
  if (!el) return;
  if (!isToday(state.cur)) {
    el.classList.remove('show');
    el.textContent = '';
    return;
  }
  const resumen = calcularResumenDia(state.S);
  const estadoTxt = state.S.cerrado
    ? 'Hoy · Cerrado · Neto ' + fmt(resumen.neto)
    : 'Hoy · Pendiente de cerrar';
  let backupTxt = '';
  try {
    const metaRaw = localStorage.getItem(PREFIX + 'meta');
    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      if (meta.lastBackupAt) {
        const t = new Date(meta.lastBackupAt).getTime();
        if (isFinite(t)) {
          const dias = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
          backupTxt = dias === 0 ? 'Backup: hoy' : dias === 1 ? 'Backup: ayer' : 'Backup: hace ' + dias + ' días';
        }
      }
    }
  } catch (e) {}
  el.innerHTML = '<span class="estado-general-hoy">' + escapeHtml(estadoTxt) + '</span>' + (backupTxt ? ' <span class="estado-general-backup">' + escapeHtml(backupTxt) + '</span>' : '');
  el.classList.add('show');
  el.classList.toggle('estado-general-cerrado', state.S.cerrado);
}

/**
 * Render de la vista Caja y de las notificaciones del panel.
 * Es la ÚNICA función que asigna .show a ro-banner, caja-no-abri-wrap, estado-general,
 * pending-banner y night-reminder. Al final siempre llama updateNotifPanelUI() para
 * que el badge de la campanita coincida con el número de avisos visibles.
 */
function renderCaja() {
  const resumen = calcularResumenDia(state.S);
  const { totI, totG } = resumen;
  updateCajaDiaStatusChip();
  renderEstadoGeneral();
  renderCajaKPIs(resumen);
  renderCajaPasosEfectivoTransbank();
  renderCajaPasoGastosYNota(resumen);
  renderCajaPasoResultado(resumen);
  renderPendientes();
  renderRecordatorioNocturno();
  const atajo = document.getElementById('caja-atajo-revisar');
  const ctaCierre = document.getElementById('caja-cta-cierre');
  const tieneEfTb = (state.S.ef > 0 || state.S.tb > 0) && !state.S.cerrado;
  if (atajo) atajo.style.display = 'none'; /* FAB es la entrada única */
  if (ctaCierre) ctaCierre.style.display = 'none'; /* FAB flotante reemplaza el CTA inline */
  const noAbriWrap = document.getElementById('caja-no-abri-wrap');
  const mostrarNoAbri = !state.S.cerrado && totI === 0 && totG === 0;
  if (noAbriWrap) {
    noAbriWrap.style.display = mostrarNoAbri ? 'flex' : 'none';
    noAbriWrap.classList.toggle('show', mostrarNoAbri);
  }
  const roBanner = document.getElementById('ro-banner');
  if (roBanner) roBanner.classList.toggle('show', !isToday(state.cur));
  actualizarCajaWizardUI();
  updateNotifPanelUI();
}

function renderRecordatorioNocturno() {
  const banner = document.getElementById('night-reminder');
  if (!banner) return;
  const hora = new Date().getHours();
  const mostrar = isToday(state.cur) && !state.S.cerrado && hora >= 20;
  banner.classList.toggle('show', mostrar);
}

/* ──────────────────────────────────────────────────
   MES — RENDER (por secciones)
────────────────────────────────────────────────── */
function setMesCorteDia(v) {
  const d = parseInt(v);
  if (!d || d < 1) {
    state.mesCorteDia = null;
    renderMes();
    return;
  }
  const diasEnMes = new Date(state.curMes.y, state.curMes.m, 0).getDate();
  state.mesCorteDia = Math.min(Math.max(1, d), diasEnMes);
  renderMes();
}

function cambiarMes(d) {
  state.curMes.m += d;
  if (state.curMes.m > 12) { state.curMes.m = 1;  state.curMes.y++; }
  if (state.curMes.m < 1)  { state.curMes.m = 12; state.curMes.y--; }
  state.mesCorteDia = null;
  const hoy = todayObj();
  document.getElementById('btn-mes-sig').disabled = (state.curMes.y > hoy.y || (state.curMes.y === hoy.y && state.curMes.m >= hoy.m));
  renderMes();
}

function irAMesActual() {
  const hoy = todayObj();
  state.curMes.y = hoy.y;
  state.curMes.m = hoy.m;
  state.mesCorteDia = null;
  document.getElementById('btn-mes-sig').disabled = true;
  renderMes();
}

/** Estado vacío del mes: un solo lugar para no olvidar ningún elemento. */
function setMesEmptyState() {
  const ids = ['mk-ing', 'mk-gas', 'mk-hero-neto'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '$0'; });
  const heroNeto = document.getElementById('mk-hero-neto');
  if (heroNeto) { heroNeto.classList.remove('positive', 'negative'); heroNeto.classList.add('zero'); }
  const heroDesc = document.getElementById('mk-hero-desc');
  if (heroDesc) heroDesc.textContent = 'Ingresos del mes menos gastos del mes';
  const mkMejor = document.getElementById('mk-mejor-val');
  if (mkMejor) mkMejor.textContent = '—';
  document.getElementById('mk-ing-sub').textContent  = '0 días con datos';
  document.getElementById('mk-gas-sub').textContent  = '0 registros';
  document.getElementById('mk-mejor-dia').textContent = 'Sin datos';

  const semanasBody = document.getElementById('semanas-body');
  const topDias = document.getElementById('top-dias');
  if (semanasBody) semanasBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--ink-soft);font-style:italic">Sin datos para este mes</td></tr>';
  if (topDias) topDias.innerHTML = '<div class="empty-note">Sin datos para este mes</div>';

  const corteInput = document.getElementById('mes-corte-dia');
  if (corteInput) {
    corteInput.value = '';
    corteInput.setAttribute('max', new Date(state.curMes.y, state.curMes.m, 0).getDate());
  }
  const corteHint = document.getElementById('mes-corte-resumen');
  if (corteHint) corteHint.textContent = 'Sin datos en este mes.';
  const wrap = document.getElementById('mes-totales-result-wrap');
  if (wrap) wrap.classList.remove('show');
  const diaEl = document.getElementById('mes-totales-dia');
  const ingEl = document.getElementById('mes-totales-ing');
  const gsEl = document.getElementById('mes-totales-gs');
  const netoEl = document.getElementById('mes-totales-neto');
  const mrgEl = document.getElementById('mes-totales-mrg');
  if (diaEl) diaEl.textContent = '—';
  if (ingEl) ingEl.textContent = '$0';
  if (gsEl) gsEl.textContent = '$0';
  if (netoEl) { netoEl.textContent = '$0'; netoEl.classList.remove('negative'); }
  if (mrgEl) mrgEl.textContent = 'Margen —';

  const chipCerrados = document.getElementById('mes-chip-cerrados');
  const chipPendientes = document.getElementById('mes-chip-pendientes');
  if (chipCerrados) chipCerrados.textContent = '0 cerrados';
  if (chipPendientes) chipPendientes.textContent = '0 pendientes';

  const diasBody = document.getElementById('dias-mes-body');
  if (diasBody) diasBody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Aún no hay datos este mes</div><div class="empty-state-desc">Los días se irán llenando al cerrar la caja</div></div></td></tr>';
  const prog = document.getElementById('mes-progreso-dia');
  if (prog) { prog.innerHTML = ''; prog.classList.add('hidden'); }
  const estaSem = document.getElementById('mes-esta-semana');
  if (estaSem) estaSem.classList.add('hidden');
  const blockProg = document.querySelector('.mes-card-block--progreso');
  const blockSemana = document.querySelector('.mes-card-block--semana');
  if (blockProg) blockProg.style.display = 'none';
  if (blockSemana) blockSemana.style.display = 'none';
  const masivoEl = document.getElementById('mes-cierre-masivo');
  if (masivoEl) masivoEl.style.display = 'none';
  const navHoy = document.getElementById('mes-nav-hoy');
  if (navHoy) {
    const hoy = todayObj();
    navHoy.style.display = (state.curMes.y !== hoy.y || state.curMes.m !== hoy.m) ? 'block' : 'none';
  }
}

function renderMesTitulo() {
  const { y, m } = state.curMes;
  const mesNombre = MESES_ES[m - 1].charAt(0).toUpperCase() + MESES_ES[m - 1].slice(1);
  const tituloEl = document.getElementById('mes-titulo');
  const annoEl = document.getElementById('mes-anno');
  if (tituloEl) tituloEl.textContent = mesNombre;
  if (annoEl) annoEl.textContent = String(y);
  const hoy = todayObj();
  const pip = document.getElementById('mes-today-pip');
  if (pip) pip.style.display = (y === hoy.y && m === hoy.m) ? 'inline-block' : 'none';
  const navHoy = document.getElementById('mes-nav-hoy');
  if (navHoy) navHoy.style.display = (y !== hoy.y || m !== hoy.m) ? 'block' : 'none';
}

function renderMesKPIs(dayData, days, totIng, totGs, totNeto, mrg, numGs, mejor) {
  const diasCerrados = dayData.filter(d => d.cerrado).length;
  const diasPend     = days.length - diasCerrados;
  const chipCerrados = document.getElementById('mes-chip-cerrados');
  const chipPendientes = document.getElementById('mes-chip-pendientes');
  if (chipCerrados) chipCerrados.textContent = diasCerrados + (diasCerrados === 1 ? ' cerrado' : ' cerrados');
  if (chipPendientes) chipPendientes.textContent = diasPend + (diasPend === 1 ? ' pendiente' : ' pendientes');
  document.getElementById('mk-ing').textContent      = fmt(totIng);
  document.getElementById('mk-gas').textContent      = fmt(totGs);
  document.getElementById('mk-ing-sub').textContent  = days.length + ' días con datos';
  document.getElementById('mk-gas-sub').textContent  = numGs + ' registros';
  const jsM = new Date(mejor.o.y, mejor.o.m-1, mejor.o.d);
  document.getElementById('mk-mejor-val').textContent = fmt(mejor.ing);
  document.getElementById('mk-mejor-dia').textContent = `${DIAS_ES[jsM.getDay()]} ${mejor.o.d}`;

  const heroNeto = document.getElementById('mk-hero-neto');
  if (heroNeto) {
    heroNeto.textContent = fmt(totNeto);
    heroNeto.classList.remove('positive', 'negative', 'zero');
    if (totIng === 0 && totGs === 0) heroNeto.classList.add('zero');
    else if (totNeto >= 0) heroNeto.classList.add('positive');
    else heroNeto.classList.add('negative');
  }
  const heroDesc = document.getElementById('mk-hero-desc');
  if (heroDesc) {
    heroDesc.textContent = totIng > 0
      ? 'Ingresos del mes menos gastos del mes · Margen ' + mrg + '%'
      : 'Ingresos del mes menos gastos del mes';
  }
}

/**
 * Rellena el input de corte y el resumen "Hasta el día X" con totales precalculados.
 * @param {number} y - Año
 * @param {number} m - Mes
 * @param {number} corte - Día de corte
 * @param {{ totIng: number, totGs: number, totNeto: number, mrg: string }} totalsCorte - Salida de totalesHastaDia
 */
function renderMesCorte(y, m, corte, totalsCorte) {
  const { totIng: cIng, totGs: cGs, totNeto: cNeto, mrg: cMrg } = totalsCorte;

  const corteInput = document.getElementById('mes-corte-dia');
  const corteHint = document.getElementById('mes-corte-resumen');
  if (corteInput) corteInput.value = corte;
  if (corteHint) corteHint.textContent = 'Totales acumulados del día 1 al ' + corte + ' del mes.';

  const wrap = document.getElementById('mes-totales-result-wrap');
  const diaEl = document.getElementById('mes-totales-dia');
  const ingEl = document.getElementById('mes-totales-ing');
  const gsEl = document.getElementById('mes-totales-gs');
  const netoEl = document.getElementById('mes-totales-neto');
  const mrgEl = document.getElementById('mes-totales-mrg');
  if (diaEl) diaEl.textContent = corte;
  if (ingEl) ingEl.textContent = fmt(cIng);
  if (gsEl) gsEl.textContent = fmt(cGs);
  if (netoEl) {
    netoEl.textContent = fmt(cNeto);
    netoEl.classList.toggle('negative', cNeto < 0);
  }
  if (mrgEl) mrgEl.textContent = 'Margen ' + cMrg + '%';
  if (wrap) wrap.classList.add('show');
}

function renderMesProgresoDia(diaActual, diasEnMes, netoAcumulado) {
  const el = document.getElementById('mes-progreso-dia');
  if (!el) return;
  const pct = diasEnMes > 0 ? (diaActual / diasEnMes * 100).toFixed(0) : 0;
  el.innerHTML =
    '<span class="mes-progreso-texto">Día ' + diaActual + ' de ' + diasEnMes +
    ' · Neto ' + fmt(netoAcumulado) + '</span>' +
    '<div class="mes-progreso-bar"><div class="mes-progreso-fill' +
    (netoAcumulado >= 0 ? ' mes-progreso-ok' : ' mes-progreso-bajo') +
    '" style=\"width:' + pct + '%\"></div></div>';
  el.classList.remove('hidden');
}

function renderMesEstaSemana(y, m, hoy) {
  const wrap = document.getElementById('mes-esta-semana');
  if (!wrap) return;
  if (hoy.y !== y || hoy.m !== m) { wrap.classList.add('hidden'); return; }
  const jsHoy = new Date(hoy.y, hoy.m - 1, hoy.d);
  const dow = jsHoy.getDay();
  const diffLun = dow === 0 ? 6 : dow - 1;
  const lun = new Date(jsHoy);
  lun.setDate(jsHoy.getDate() - diffLun);
  let acIng = 0, acGs = 0;
  const it = new Date(lun);
  while (it <= jsHoy) {
    const o = { y: it.getFullYear(), m: it.getMonth() + 1, d: it.getDate() };
    const d = loadDay(o);
    acIng += (d.ef || 0) + (d.tb || 0);
    acGs += (d.gastos || []).reduce(function (s, g) { return s + g.monto; }, 0);
    it.setDate(it.getDate() + 1);
  }
  wrap.innerHTML = '<div class="mes-esta-semana-row">Ingresos ' + fmt(acIng) + ' · Gastos ' + fmt(acGs) + ' · Neto ' + fmt(acIng - acGs) + '</div>';
  wrap.classList.remove('hidden');
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
  const tbody = document.getElementById('semanas-body');
  const topDiasEl = document.getElementById('top-dias');
  if (!tbody) return;
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
  if (topDiasEl) topDiasEl.innerHTML = top3.length === 0
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
  const { y, m } = state.curMes;
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
  let corte = state.mesCorteDia;
  if (!corte || corte < 1) {
    if (hoy.y === y && hoy.m === m && diasConDatos.includes(hoy.d)) {
      corte = hoy.d;
    } else {
      corte = maxDiaDatos;
    }
  }
  const diasEnMes = new Date(y, m, 0).getDate();
  corte = Math.min(Math.max(1, corte), diasEnMes);
  state.mesCorteDia = corte;

  const corteInput = document.getElementById('mes-corte-dia');
  if (corteInput) {
    corteInput.setAttribute('max', diasEnMes);
    const val = parseInt(corteInput.value, 10);
    if (val > diasEnMes || (val && val < 1)) {
      corteInput.value = corte;
      state.mesCorteDia = corte;
    }
  }

  const mejor = [...dayData].sort((a, b) => b.ing - a.ing)[0];
  dayData.sort((a, b) => dateKey(a.o).localeCompare(dateKey(b.o)));

  const itemsCorte = dayData.map(item => ({ dia: item.o.d, ef: item.d.ef || 0, tb: item.d.tb || 0, gs: item.gs || 0 }));
  const totalsCorte = totalesHastaDia(itemsCorte, corte);

  renderMesKPIs(dayData, days, totIng, totGs, totNeto, mrg, numGs, mejor);
  renderMesProgresoDia(corte, diasEnMes, totalsCorte.totNeto);
  renderMesCorte(y, m, corte, totalsCorte);
  renderMesResumenNegocio(y, m, days, dayData, totIng, maxDiaDatos);
  renderMesEstaSemana(y, m, hoy);
  const progEl = document.getElementById('mes-progreso-dia');
  const semanaEl = document.getElementById('mes-esta-semana');
  const blockProg = document.querySelector('.mes-card-block--progreso');
  const blockSemana = document.querySelector('.mes-card-block--semana');
  if (blockProg) blockProg.style.display = (progEl && progEl.classList.contains('hidden')) ? 'none' : '';
  if (blockSemana) blockSemana.style.display = (semanaEl && semanaEl.classList.contains('hidden')) ? 'none' : '';
  renderMesNotas(dayData);
  renderMesDiasTable(dayData, totIng);

  const pendientesConDatos = dayData.filter(function (x) { return !x.cerrado && (x.ing > 0 || x.gs > 0); });
  const masivoEl = document.getElementById('mes-cierre-masivo');
  const countEl = document.getElementById('mes-pendientes-count');
  if (masivoEl) masivoEl.style.display = pendientesConDatos.length > 0 ? 'block' : 'none';
  if (countEl) countEl.textContent = pendientesConDatos.length;

  const semanas = agruparSemanas(days, y, m);
  renderMesAvanzado(dayData, totEf, totTb, totIng, semanas, days, y, m);
}

function irADiaDesdeMes(y, m, d) {
  state.cur = { y, m, d };
  state.S = loadDay(state.cur);
  state.paso1Guardado = !!state.S.efHora;
  state.paso2Guardado = !!state.S.tbHora;
  const notaIn = document.getElementById('nota-in');
  if (notaIn) notaIn.value = state.S.nota || '';
  state.cajaPaso = 1;
  updateDateHeader();
  renderCaja();
  setTab('caja');
}

/** Construye el mapa año-mes → acumulados a partir de las keys de días. */
function buildMesesMap(keys) {
  const mesesMap = new Map();
  keys.forEach(key => {
    const parts = key.split('-');
    if (parts.length !== 3) return;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return;
    const ymKey = y + '-' + String(m).padStart(2, '0');
    let acc = mesesMap.get(ymKey);
    if (!acc) {
      acc = { y, m, totEf: 0, totTb: 0, totGs: 0, numDias: 0, cerrados: 0, pendientes: 0 };
    }
    const o = { y, m, d };
    const data = loadDay(o);
    const ing = (data.ef || 0) + (data.tb || 0);
    const gs = (data.gastos || []).reduce(function (s, g) { return s + g.monto; }, 0);
    acc.totEf += data.ef || 0;
    acc.totTb += data.tb || 0;
    acc.totGs += gs;
    const tieneDatos = ing > 0 || gs > 0 || data.cerrado || (data.nota && data.nota.trim().length > 0);
    if (tieneDatos) {
      acc.numDias++;
      if (data.cerrado) acc.cerrados++; else acc.pendientes++;
    }
    mesesMap.set(ymKey, acc);
  });
  return mesesMap;
}

/** Rellena hero (total neto, mejor/peor mes) y subtítulo. selectedYear opcional para filtro por año. */
function renderHistoricoHero(totalNetoEl, mejorMesEl, peorMesEl, heroSubEl, comparativaEl, totalNeto, mejor, peor, meses, mesLabel, selectedYear) {
  totalNetoEl.textContent = fmt(totalNeto);
  totalNetoEl.classList.toggle('negative', totalNeto < 0);
  mejorMesEl.textContent = mejor ? mesLabel(mejor) + ' · ' + fmt(mejor.neto) : '—';
  peorMesEl.textContent = peor ? mesLabel(peor) + ' · ' + fmt(peor.neto) : '—';
  peorMesEl.classList.toggle('negative', peor && peor.neto < 0);
  if (heroSubEl) {
    if (selectedYear != null) {
      heroSubEl.textContent = meses.length + ' mes' + (meses.length === 1 ? '' : 'es') + ' en ' + selectedYear;
    } else {
      heroSubEl.textContent = meses.length + ' mes' + (meses.length === 1 ? '' : 'es') + ' registrado' + (meses.length === 1 ? '' : 's');
    }
  }
  if (comparativaEl) comparativaEl.style.display = (mejor || peor) ? '' : 'none';
}

/** Actualiza las barras comparativas mejor/peor mes. */
function renderHistoricoBarras(barMejor, barPeor, mejor, peor) {
  if (barMejor && mejor) {
    barMejor.style.width = '100%';
    barMejor.classList.remove('hist-comp-bar--danger');
    barMejor.classList.add('hist-comp-bar--ok');
  }
  if (barPeor && peor && mejor) {
    const maxVal = Math.max(mejor.neto, Math.abs(peor.neto), 1);
    const pctPeor = peor.neto >= 0
      ? (peor.neto / maxVal) * 100
      : Math.min(100, (Math.abs(peor.neto) / maxVal) * 100);
    barPeor.style.width = pctPeor + '%';
    barPeor.classList.toggle('hist-comp-bar--danger', peor.neto < 0);
    barPeor.classList.toggle('hist-comp-bar--ok', peor.neto >= 0);
  }
  if (barMejor && !mejor) barMejor.style.width = '0%';
  if (barPeor && !peor) barPeor.style.width = '0%';
}

/** Genera opciones del select de año. */
function renderHistoricoYearOptions(yearFilterEl, years, currentValue) {
  const optionsHtml = '<option value="">Todos</option>' +
    years.map(function (y) {
      return '<option value="' + y + '"' + (String(y) === currentValue ? ' selected' : '') + '>' + y + '</option>';
    }).join('');
  yearFilterEl.innerHTML = optionsHtml;
}

/** Histórico de meses (vista larga). */
function renderHistorico() {
  const tbody = document.getElementById('hist-body');
  const totalNetoEl = document.getElementById('hist-total-neto');
  const mejorMesEl = document.getElementById('hist-mejor-mes');
  const peorMesEl = document.getElementById('hist-peor-mes');
  const yearFilterEl = document.getElementById('hist-year-filter');
  const comparativaEl = document.getElementById('hist-comparativa');
  const heroSubEl = document.getElementById('hist-hero-sub');
  if (!tbody || !totalNetoEl || !mejorMesEl || !peorMesEl || !yearFilterEl) return;

  const keys = allDayKeys();
  const emptyRow = '<tr><td colspan="5" class="hist-empty">Aún no hay datos. Cierra días en Caja para que aparezcan aquí los meses.</td></tr>';
  if (keys.length === 0) {
    tbody.innerHTML = emptyRow;
    totalNetoEl.textContent = fmt(0);
    mejorMesEl.textContent = '—';
    peorMesEl.textContent = '—';
    if (heroSubEl) heroSubEl.textContent = 'En todos los meses registrados';
    if (comparativaEl) comparativaEl.style.display = 'none';
    yearFilterEl.innerHTML = '<option value="">Todos</option>';
    return;
  }

  const mesesMap = buildMesesMap(keys);
  let meses = Array.from(mesesMap.values());
  if (meses.length === 0) {
    tbody.innerHTML = emptyRow;
    totalNetoEl.textContent = fmt(0);
    mejorMesEl.textContent = '—';
    peorMesEl.textContent = '—';
    if (heroSubEl) heroSubEl.textContent = 'En todos los meses registrados';
    if (comparativaEl) comparativaEl.style.display = 'none';
    yearFilterEl.innerHTML = '<option value="">Todos</option>';
    return;
  }

  meses.forEach(function (mesItem) {
    const totIng = mesItem.totEf + mesItem.totTb;
    mesItem.totIng = totIng;
    mesItem.neto = totIng - mesItem.totGs;
  });

  function mesLabel(mesItem) {
    const nombre = MESES_ES[mesItem.m - 1] || '';
    return nombre.charAt(0).toUpperCase() + nombre.slice(1) + ' ' + mesItem.y;
  }

  const years = Array.from(new Set(meses.map(function (mesItem) { return mesItem.y; }))).sort(function (a, b) { return a - b; });
  renderHistoricoYearOptions(yearFilterEl, years, yearFilterEl.value);

  const selectedYear = yearFilterEl.value ? parseInt(yearFilterEl.value, 10) : null;
  let visibleMeses = meses;
  if (selectedYear) {
    visibleMeses = meses.filter(function (mesItem) { return mesItem.y === selectedYear; });
  }

  // Cuando hay filtro de año, hero y mejor/peor usan solo los meses visibles
  const mesesParaHero = visibleMeses.length > 0 ? visibleMeses : meses;
  const totalNeto = mesesParaHero.reduce(function (s, mesItem) { return s + mesItem.neto; }, 0);
  let mejor = null;
  let peor = null;
  mesesParaHero.forEach(function (mesItem) {
    if (!mejor || mesItem.neto > mejor.neto) mejor = mesItem;
    if (!peor || mesItem.neto < peor.neto) peor = mesItem;
  });

  renderHistoricoHero(totalNetoEl, mejorMesEl, peorMesEl, heroSubEl, comparativaEl, totalNeto, mejor, peor, mesesParaHero, mesLabel, selectedYear);
  const barMejor = document.getElementById('hist-bar-mejor');
  const barPeor = document.getElementById('hist-bar-peor');
  renderHistoricoBarras(barMejor, barPeor, mejor, peor);

  if (visibleMeses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="hist-empty">No hay meses para este filtro.</td></tr>';
    updateHistoricoSortHeaders();
    return;
  }

  var sortBy = state.historicoSort.by;
  var sortDir = state.historicoSort.dir;
  visibleMeses.sort(function (a, b) {
    var va, vb;
    if (sortBy === 'fecha') {
      if (a.y !== b.y) return sortDir * (a.y - b.y);
      return sortDir * (a.m - b.m);
    }
    if (sortBy === 'ingresos') { va = a.totIng; vb = b.totIng; }
    else if (sortBy === 'gastos') { va = a.totGs; vb = b.totGs; }
    else { va = a.neto; vb = b.neto; }
    if (va === vb) return 0;
    return sortDir * (va > vb ? 1 : -1);
  });

  const hoy = todayObj();
  const promedioNeto = visibleMeses.length > 0 ? visibleMeses.reduce(function (s, mesItem) { return s + mesItem.neto; }, 0) / visibleMeses.length : 0;

  const rowsHtml = visibleMeses.map(function (mesItem) {
    const label = mesLabel(mesItem);
    const estadoTxt = mesItem.numDias === 0
      ? 'Sin datos'
      : (mesItem.pendientes === 0 ? 'Mes completo' : 'Con días pendientes');
    const estadoClass = mesItem.numDias === 0
      ? 'dia-estado'
      : (mesItem.pendientes === 0 ? 'dia-estado dia-estado-cerrado' : 'dia-estado dia-estado-pendiente');
    const netoClass = mesItem.neto >= 0 ? 'td-neto-pos' : 'td-neto-neg';
    const esMesActual = mesItem.y === hoy.y && mesItem.m === hoy.m;
    const rowClass = esMesActual ? ' class="dia-hoy"' : '';
    const anomalo = getEsDiaAnomalo(mesItem.neto, promedioNeto, 1.7, 0.3);
    const badge = anomalo === 'pico'
      ? ' <span class="dia-badge dia-badge-pico" title="Mes con neto muy alto">📈</span>'
      : (anomalo === 'bajo'
        ? ' <span class="dia-badge dia-badge-bajo" title="Mes con neto muy bajo">📉</span>'
        : '');
    const ariaLabel = label + ', Ingresos ' + fmt(mesItem.totIng) + ', Neto ' + fmt(mesItem.neto) + ', ' + estadoTxt + '. Toca para ver el detalle en la pestaña Mes.';
    return '<tr' + rowClass + ' role="button" tabindex="0" aria-label="' + escapeHtml(ariaLabel) + '" onclick="irAMesDesdeHistorico(' + mesItem.y + ',' + mesItem.m + ')">' +
      '<td>' + escapeHtml(label) + badge + '</td>' +
      '<td>' + fmt(mesItem.totIng) + '</td>' +
      '<td>' + fmt(mesItem.totGs) + '</td>' +
      '<td class="' + netoClass + '">' + fmt(mesItem.neto) + '</td>' +
      '<td class="' + estadoClass + '">' + estadoTxt + '</td>' +
      '</tr>';
  });

  // Fila de totales cuando hay más de un mes visible
  let totalsRow = '';
  if (visibleMeses.length > 1) {
    const sumIng = visibleMeses.reduce(function (s, mesItem) { return s + mesItem.totIng; }, 0);
    const sumGs = visibleMeses.reduce(function (s, mesItem) { return s + mesItem.totGs; }, 0);
    const sumNeto = sumIng - sumGs;
    const netoClassTot = sumNeto >= 0 ? 'td-neto-pos' : 'td-neto-neg';
    totalsRow = '<tr class="hist-totals-row" aria-label="Totales">' +
      '<td><strong>' + (selectedYear ? 'Total ' + selectedYear : 'Total') + '</strong></td>' +
      '<td><strong>' + fmt(sumIng) + '</strong></td>' +
      '<td><strong>' + fmt(sumGs) + '</strong></td>' +
      '<td class="' + netoClassTot + '"><strong>' + fmt(sumNeto) + '</strong></td>' +
      '<td></td></tr>';
  }
  tbody.innerHTML = rowsHtml.join('') + totalsRow;
  updateHistoricoSortHeaders();
}

function sortHistoricoBy(col) {
  if (state.historicoSort.by === col) {
    state.historicoSort.dir *= -1;
  } else {
    state.historicoSort.by = col;
    state.historicoSort.dir = (col === 'fecha' ? -1 : 1);
  }
  renderHistorico();
}

function updateHistoricoSortHeaders() {
  var by = state.historicoSort.by;
  var dir = state.historicoSort.dir;
  var arrow = dir === 1 ? ' ↑' : ' ↓';
  var labels = { fecha: 'Mes', ingresos: 'Ingresos', gastos: 'Gastos', neto: 'Neto' };
  var ids = ['hist-th-mes', 'hist-th-ingresos', 'hist-th-gastos', 'hist-th-neto'];
  var cols = ['fecha', 'ingresos', 'gastos', 'neto'];
  cols.forEach(function (col, i) {
    var th = document.getElementById(ids[i]);
    if (!th) return;
    th.textContent = labels[col] + (by === col ? arrow : '');
    th.setAttribute('aria-sort', by === col ? (dir === 1 ? 'ascending' : 'descending') : 'none');
    th.classList.toggle('hist-th-sorted', by === col);
  });
}

function irAMesDesdeHistorico(y, m) {
  state.curMes.y = y;
  state.curMes.m = m;
  state.mesCorteDia = null;
  const hoy = todayObj();
  const btnSig = document.getElementById('btn-mes-sig');
  if (btnSig) {
    btnSig.disabled = (state.curMes.y > hoy.y || (state.curMes.y === hoy.y && state.curMes.m >= hoy.m));
  }
  setTab('mes');
}

/** Cierre masivo: marca como cerrados todos los días del mes actual que tengan datos y estén pendientes. */
function confirmarCierreMasivoMes() {
  const y = state.curMes.y;
  const m = state.curMes.m;
  const days = getDaysOfMonth(y, m);
  const pendientes = [];
  for (let i = 0; i < days.length; i++) {
    const d = loadDay(days[i]);
    const ing = (d.ef || 0) + (d.tb || 0);
    const gs = (d.gastos || []).reduce(function (s, g) { return s + g.monto; }, 0);
    if (!d.cerrado && (ing > 0 || gs > 0)) pendientes.push(days[i]);
  }
  if (pendientes.length === 0) {
    toast('No hay días pendientes con datos en este mes.');
    return;
  }
  if (!confirm('Se cerrarán ' + pendientes.length + ' día(s) que tienen datos y están pendientes.\n¿Continuar?')) {
    return;
  }
  const horaCierre = hora();
  let fallos = 0;
  for (let i = 0; i < pendientes.length; i++) {
    const o = pendientes[i];
    const data = loadDay(o);
    data.cerrado = true;
    data.cerradoHora = horaCierre;
    if (!saveDay(o, data)) fallos++;
  }
  const curKey = dateKey(state.cur);
  const cerramosElActual = pendientes.some(function (o) { return dateKey(o) === curKey; });
  if (cerramosElActual) {
    state.S = loadDay(state.cur);
    renderCaja();
  }
  renderMes();
  if (fallos > 0) toast('Algunos días no se pudieron guardar (memoria llena). Haz un backup.');
  else toast(pendientes.length + ' días cerrados ✓', 'success');
}

function scrollAPaso(n) {
  const el = document.getElementById('caja-paso-' + n);
  if (!el) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

function actualizarCajaWizardUI() {
  const maxPaso = 4;
  if (state.cajaPaso < 1) state.cajaPaso = 1;
  if (state.cajaPaso > maxPaso) state.cajaPaso = maxPaso;
  const viewCaja = document.getElementById('view-caja');
  if (viewCaja) viewCaja.setAttribute('data-caja-paso', String(state.cajaPaso));
  document.querySelectorAll('.caja-step-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.caja-step-' + state.cajaPaso).forEach(p => p.classList.add('active'));
  const prev = document.getElementById('cw-prev');
  const next = document.getElementById('cw-next');
  const label = document.getElementById('cw-label');
  const help = document.getElementById('cw-help');
  if (prev) prev.disabled = (state.cajaPaso === 1);
  if (next) {
    next.style.display = '';
    const notaEl = document.getElementById('nota-in');
    const notaVal = notaEl ? notaEl.value.trim() : '';
    const notaGuardada = (state.S.nota || '') === notaVal;
    const bloqueado = (state.cajaPaso === 1 && !state.paso1Guardado) || (state.cajaPaso === 2 && !state.paso2Guardado) || (state.cajaPaso === 3 && !notaGuardada);
    next.disabled = !!bloqueado;
  }
  if (help) help.style.display = '';
  let txt = '';
  let helpTxt = '';
  let check = '';
  if (state.cajaPaso === 1) {
    txt = 'Paso 1 de 4 · Efectivo en caja';
    helpTxt = 'Escribe el total y pulsa Guardar.';
    if (state.paso1Guardado) check = ' ✓';
    if (next) next.textContent = 'Ir a Transbank ›';
  }
  if (state.cajaPaso === 2) {
    txt = 'Paso 2 de 4 · Transbank (tarjeta)';
    helpTxt = 'Escribe el total del cierre y pulsa Guardar.';
    if (state.paso2Guardado) check = ' ✓';
    if (next) next.textContent = 'Ir a gastos ›';
  }
  if (state.cajaPaso === 3) {
    txt = 'Paso 3 de 4 · Gastos y nota';
    helpTxt = 'Agrega cada egreso y, si quieres, una nota.';
    if (next) next.textContent = 'Ir a revisar resultado ›';
  }
  if (state.cajaPaso === 4) {
    txt = 'Paso 4 de 4 · Revisar y cerrar el día';
    helpTxt = 'Revisa el resultado y confirma el cierre.';
    if (next) {
      next.textContent = 'Siguiente ›';
      next.style.display = 'none';
    }
  }
  if (label) label.innerHTML = escapeHtml(txt) + (check ? '<span class="cw-check" aria-hidden="true">' + escapeHtml(check) + '</span>' : '');
  if (help) help.textContent = helpTxt;
  for (let i = 1; i <= 4; i++) {
    const chip = document.getElementById('cw-chip-' + i);
    if (chip) {
      chip.setAttribute('aria-selected', i === state.cajaPaso ? 'true' : 'false');
      chip.classList.toggle('active', i === state.cajaPaso);
    }
  }
  focusPrimerControlPaso(state.cajaPaso);
}

function focusPrimerControlPaso(paso) {
  let el = null;
  if (paso === 1) el = document.getElementById('ef-in');
  else if (paso === 2) el = document.getElementById('tb-in');
  else if (paso === 3) el = document.getElementById('gs-desc');
  else if (paso === 4) {
    const btnCerrar = document.getElementById('btn-cerrar-dia');
    if (btnCerrar && !btnCerrar.disabled) el = btnCerrar;
    else el = document.querySelector('#view-caja .rc-quick-links .btn');
  }
  if (el && typeof el.focus === 'function') {
    setTimeout(function () { el.focus({ preventScroll: true }); }, 100);
  }
}

function cajaPasoSiguiente() {
  if (state.cajaPaso === 1 && !state.paso1Guardado) {
    toast('Guarda el efectivo antes de continuar.');
    return;
  }
  if (state.cajaPaso === 2 && !state.paso2Guardado) {
    toast('Guarda el Transbank antes de continuar.');
    return;
  }
  if (state.cajaPaso === 3) {
    const notaEl = document.getElementById('nota-in');
    const notaVal = notaEl ? notaEl.value.trim() : '';
    if (notaVal !== (state.S.nota || '')) {
      toast('Guarda la nota del día antes de continuar (o bórrala).');
      return;
    }
  }
  state.cajaPaso++;
  actualizarCajaWizardUI();
  scrollAPaso(state.cajaPaso);
}
function cajaPasoAnterior() { state.cajaPaso--; actualizarCajaWizardUI(); scrollAPaso(state.cajaPaso); }

function irPasoCaja(n) {
  state.cajaPaso = n;
  actualizarCajaWizardUI();
  scrollAPaso(n);
}

function confirmarCierreDia() {
  if (!state.S) return;
  const { totG, totI } = calcularResumenDia(state.S);
  if (totI === 0 && totG === 0) {
    abrirModalSinVentas(function ejecutarCierreDesdePaso4() {
      state.S.cerrado = true;
      state.S.cerradoHora = hora();
      if (!saveDay(state.cur, state.S)) return;
      showGuardadoIndicator();
      renderCaja();
      cerrarModalCierre();
      const jsD = new Date(state.cur.y, state.cur.m - 1, state.cur.d);
      const label = `${DIAS_ES[jsD.getDay()]} ${state.cur.d}`;
      toast(label + ' cerrado ✓', 'success');
    });
    return;
  }
  state.S.cerrado = true;
  state.S.cerradoHora = hora();
  if (!saveDay(state.cur, state.S)) return;
  showGuardadoIndicator();
  renderCaja();
  const jsD = new Date(state.cur.y, state.cur.m - 1, state.cur.d);
  const label = `${DIAS_ES[jsD.getDay()]} ${state.cur.d}`;
  toast(label + ' cerrado ✓', 'success');
}

/** Atajo: cerrar el día como "no abrí" sin pasar por los 4 pasos. Solo visible cuando no hay datos. */
function cerrarDiaSinVentas() {
  if (!state.S) return;
  const { totI, totG } = calcularResumenDia(state.S);
  if (totI !== 0 || totG !== 0) {
    toast('Hay datos ingresados. Usa "Confirmar cierre del día" en el paso 4.');
    return;
  }
  abrirModalSinVentas(function ejecutarCierreSinVentas() {
    state.S.ef = 0;
    state.S.tb = 0;
    state.S.gastos = [];
    state.S.nota = state.S.nota || '';
    state.S.cerrado = true;
    state.S.cerradoHora = hora();
    if (!saveDay(state.cur, state.S)) return;
    showGuardadoIndicator();
    renderCaja();
    const jsD = new Date(state.cur.y, state.cur.m - 1, state.cur.d);
    toast(jsD.getDate() + ' cerrado (sin ventas) ✓', 'success');
  });
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
  banner.innerHTML = '<span class="caja-notif-msg"><strong>Tienes días sin cerrar en los últimos 30 días:</strong> ' + escapeHtml(diasTxt) + '.</span> <button type="button" class="btn btn-sm btn-ghost caja-notif-action" onclick="irAPrimerPendiente(); cerrarNotifPanel();">Ir al primero</button>';
  banner.classList.add('show');
}

function irAPrimerPendiente() {
  const pendientes = getPendientesHastaHoyEnRangoDias(30);
  if (pendientes.length === 0) return;
  const primero = pendientes[0];
  state.cur = { y: primero.y, m: primero.m, d: primero.d };
  state.S = loadDay(state.cur);
  state.paso1Guardado = !!state.S.efHora;
  state.paso2Guardado = !!state.S.tbHora;
  const notaIn = document.getElementById('nota-in');
  if (notaIn) notaIn.value = state.S.nota || '';
  state.cajaPaso = 1;
  updateDateHeader();
  setTab('caja');
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
  const p = key.split('-');
  const d = parseInt(p[2], 10), m = parseInt(p[1], 10), y = parseInt(p[0], 10);
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
      const msgEl = reminder.querySelector('.backup-reminder-msg');
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
      state.S = loadDay(state.cur);
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

/**
 * Construye el texto del resumen de cierre para copiar o WhatsApp.
 * @param {{ y: number, m: number, d: number }} cur - Fecha actual (objeto día)
 * @param {Object} dayState - Estado del día (S)
 * @param {'clipboard'|'whatsapp'} variant - Formato: clipboard incluye margen y "BALANCE NETO"; whatsapp usa *NETO* y lista de gastos
 * @returns {string}
 */
function obtenerTextoResumenCierre(cur, dayState, variant) {
  const { gastos, totG, totI, neto } = calcularResumenDia(dayState);
  const mrg = totI > 0 ? ((neto / totI) * 100).toFixed(1) : '0.0';
  const jsD = new Date(cur.y, cur.m - 1, cur.d);
  const isWhatsApp = variant === 'whatsapp';
  let txt = isWhatsApp
    ? `🌸 *Florería Elizabeth — Cierre de Caja*\n`
    : `🌸 FLORERÍA ELIZABETH — Cierre de Caja\n`;
  txt += `📅 ${DIAS_ES[jsD.getDay()]} ${cur.d} de ${MESES_ES[cur.m - 1]} ${cur.y}\n`;
  txt += isWhatsApp ? `━━━━━━━━━━━━━━━━━━━\n` : `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt += isWhatsApp
    ? `💵 Efectivo:   ${fmt(dayState.ef || 0)}\n💳 Transbank:  ${fmt(dayState.tb || 0)}\n📊 Ingresos:   ${fmt(totI)}\n🧾 Gastos:     ${fmt(totG)}\n`
    : `💵 Efectivo:       ${fmt(dayState.ef || 0)}\n💳 Transbank:      ${fmt(dayState.tb || 0)}\n📊 Total Ingresos: ${fmt(totI)}\n🧾 Total Gastos:   ${fmt(totG)}\n`;
  txt += isWhatsApp ? `━━━━━━━━━━━━━━━━━━━\n` : `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt += isWhatsApp
    ? `✨ *NETO: ${fmt(neto)}*\n`
    : `✨ BALANCE NETO:   ${fmt(neto)}  (Margen ${mrg}%)\n`;
  if (gastos.length > 0) {
    txt += isWhatsApp ? `\n📋 Gastos:\n` : `\n🧾 Detalle Gastos:\n`;
    gastos.forEach(g => {
      txt += isWhatsApp ? `  · ${g.desc}: ${fmt(g.monto)}\n` : `  · [${g.hora || ''}] ${g.desc}: ${fmt(g.monto)}\n`;
    });
  }
  if (dayState.nota) txt += `\n📝 ${isWhatsApp ? dayState.nota : 'Nota: ' + dayState.nota}\n`;
  return txt;
}

function compartirWhatsApp() {
  if (!state.S.cerrado) {
    if (!confirm('Este día aún no está marcado como cerrado.\n¿Seguro que quieres enviar este resumen por WhatsApp?')) {
      return;
    }
  }
  const txt = obtenerTextoResumenCierre(state.cur, state.S, 'whatsapp');
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
}

/* ──────────────────────────────────────────────────
   MODAL / LIMPIAR
────────────────────────────────────────────────── */
function confirmarLimpiar() {
  const jsD = new Date(state.cur.y, state.cur.m - 1, state.cur.d);
  const label = isToday(state.cur) ? 'hoy' : `${DIAS_ES[jsD.getDay()]} ${state.cur.d} de ${MESES_ES[state.cur.m - 1]}`;
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

/** Modal "¿No abriste este día?" — evita confirm() del navegador */
var pendingCierreSinVentasCallback = null;
function abrirModalSinVentas(onConfirm) {
  pendingCierreSinVentasCallback = onConfirm;
  const ov = document.getElementById('overlay-sin-ventas');
  if (ov) ov.classList.add('open');
  const btn = document.getElementById('modal-btn-sin-ventas');
  if (btn) btn.focus();
}
function cerrarModalSinVentas() {
  pendingCierreSinVentasCallback = null;
  const ov = document.getElementById('overlay-sin-ventas');
  if (ov) ov.classList.remove('open');
}
function confirmarCierreSinVentasModal() {
  if (typeof pendingCierreSinVentasCallback === 'function') pendingCierreSinVentasCallback();
  cerrarModalSinVentas();
}

function limpiar() {
  state.S = {ef:0, tb:0, gastos:[], nota:''};
  document.getElementById('nota-in').value = '';
  if (!saveDay(state.cur, state.S)) { renderCaja(); cerrarModal(); return; }
  renderCaja();
  cerrarModal();
  toast('Día limpiado 🌸', 'success');
}

/* ──────────────────────────────────────────────────
   MODAL CIERRE DEL DÍA (un solo paso)
────────────────────────────────────────────────── */
function abrirModalCierre() {
  const ov = document.getElementById('overlay-cierre');
  const fechaEl = document.getElementById('modal-cierre-fecha');
  const jsD = new Date(state.cur.y, state.cur.m - 1, state.cur.d);
  if (fechaEl) fechaEl.textContent = DIAS_ES[jsD.getDay()] + ' ' + state.cur.d + ' de ' + MESES_ES[state.cur.m - 1] + ' ' + state.cur.y;
  document.getElementById('modal-ef-in').value = (state.S.ef > 0 ? String(state.S.ef) : '');
  document.getElementById('modal-tb-in').value = (state.S.tb > 0 ? String(state.S.tb) : '');
  document.getElementById('modal-nota-in').value = state.S.nota || '';
  var tipoEl = document.getElementById('modal-gs-tipo');
  var otrosEl = document.getElementById('modal-gs-desc-otros');
  if (tipoEl) tipoEl.value = '';
  if (otrosEl) { otrosEl.value = ''; otrosEl.style.display = 'none'; }
  renderModalGastosList();
  ov.classList.add('open');
  setTimeout(function () {
    const first = document.querySelector('#overlay-cierre input:not([type="hidden"]), #overlay-cierre textarea');
    if (first) first.focus({ preventScroll: true });
  }, 100);
}

function cerrarModalCierre() {
  document.getElementById('overlay-cierre').classList.remove('open');
}

function renderModalGastosList() {
  const listEl = document.getElementById('modal-gastos-list');
  const totalWrap = document.getElementById('modal-gastos-total-wrap');
  const totalVal = document.getElementById('modal-gastos-total');
  if (!listEl) return;
  const gastos = state.S.gastos || [];
  const totG = gastos.reduce(function (s, g) { return s + g.monto; }, 0);
  if (gastos.length === 0) {
    listEl.innerHTML = '<div class="mcierre-gastos-empty" id="modal-gastos-empty">Sin gastos. Agrega cada egreso arriba.</div>';
    if (totalWrap) totalWrap.style.display = 'none';
    return;
  }
  listEl.innerHTML = gastos.map(function (g) {
    return '<div class="mcierre-gasto-item">' +
      '<span class="mcierre-gasto-desc">' + escapeHtml(g.desc) + '</span>' +
      '<span class="mcierre-gasto-monto">' + fmt(g.monto) + '</span>' +
      '<button type="button" class="mcierre-gasto-del" onclick="quitarGastoEnModal(' + g.id + ')" aria-label="Eliminar gasto">✕</button>' +
      '</div>';
  }).join('');
  if (totalWrap && totalVal) {
    totalWrap.style.display = 'flex';
    totalVal.textContent = fmt(totG);
  }
}

function toggleModalGsOtros() {
  const tipoEl = document.getElementById('modal-gs-tipo');
  const otrosEl = document.getElementById('modal-gs-desc-otros');
  if (!tipoEl || !otrosEl) return;
  const isOtros = tipoEl.value === 'otros';
  otrosEl.style.display = isOtros ? 'block' : 'none';
  otrosEl.placeholder = 'Escribe la descripción';
  if (!isOtros) otrosEl.value = '';
  if (isOtros) otrosEl.focus();
}

function addGastoEnModal() {
  const tipoEl = document.getElementById('modal-gs-tipo');
  const otrosEl = document.getElementById('modal-gs-desc-otros');
  const montoEl = document.getElementById('modal-gs-monto');
  var d = '';
  if (tipoEl && tipoEl.value) {
    if (tipoEl.value === 'otros') {
      d = (otrosEl && otrosEl.value) ? otrosEl.value.trim() : '';
      if (!d) { toast('Escribe la descripción en Otros 📝'); return; }
    } else {
      d = tipoEl.value;
    }
  }
  const m = parseInt((montoEl && montoEl.value) ? String(montoEl.value).replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '') : '', 10);
  if (!d) { toast('Elige un tipo de gasto 📝'); return; }
  if (!m || m <= 0) { toast('Monto inválido 💰'); return; }
  if (!state.S.gastos) state.S.gastos = [];
  state.S.gastos.push({ id: Date.now(), desc: d, monto: m, hora: hora() });
  state.S.cerrado = false;
  if (tipoEl) tipoEl.value = '';
  if (otrosEl) { otrosEl.value = ''; otrosEl.style.display = 'none'; }
  if (montoEl) montoEl.value = '';
  if (tipoEl) tipoEl.focus();
  renderModalGastosList();
  toast('Gasto agregado ✓', 'success');
}

function quitarGastoEnModal(id) {
  state.S.gastos = (state.S.gastos || []).filter(function (g) { return g.id !== id; });
  state.S.cerrado = false;
  renderModalGastosList();
  toast('Gasto eliminado');
}

function guardarCierreDesdeModal() {
  const efRaw = document.getElementById('modal-ef-in').value;
  const tbRaw = document.getElementById('modal-tb-in').value;
  const notaRaw = (document.getElementById('modal-nota-in') && document.getElementById('modal-nota-in').value) ? document.getElementById('modal-nota-in').value.trim() : '';
  const ef = parseMontoInput(efRaw);
  const tb = parseMontoInput(tbRaw);
  state.S.ef = (typeof ef === 'number' && !isNaN(ef) && ef >= 0) ? ef : 0;
  state.S.tb = (typeof tb === 'number' && !isNaN(tb) && tb >= 0) ? tb : 0;
  state.S.nota = notaRaw;
  state.S.efHora = (state.S.ef > 0 || state.S.tb > 0) ? hora() : (state.S.efHora || '');
  state.S.tbHora = state.S.tb > 0 ? hora() : (state.S.tbHora || '');
  state.S.cerrado = false;
  if (!saveDay(state.cur, state.S)) return;
  showGuardadoIndicator();
  state.paso1Guardado = !!state.S.efHora;
  state.paso2Guardado = !!state.S.tbHora;
  document.getElementById('nota-in').value = state.S.nota || '';
  renderCaja();
  cerrarModalCierre();
  toast('Cierre guardado ✓', 'success');
}

function cerrarDiaDesdeModal() {
  const efRaw = document.getElementById('modal-ef-in').value;
  const tbRaw = document.getElementById('modal-tb-in').value;
  const notaEl = document.getElementById('modal-nota-in');
  const notaRaw = notaEl ? (notaEl.value || '').trim() : '';
  const ef = parseMontoInput(efRaw);
  const tb = parseMontoInput(tbRaw);
  state.S.ef = (typeof ef === 'number' && !isNaN(ef) && ef >= 0) ? ef : 0;
  state.S.tb = (typeof tb === 'number' && !isNaN(tb) && tb >= 0) ? tb : 0;
  state.S.nota = notaRaw;
  state.S.efHora = (state.S.ef > 0 || state.S.tb > 0) ? hora() : (state.S.efHora || '');
  state.S.tbHora = state.S.tb > 0 ? hora() : (state.S.tbHora || '');
  state.S.cerrado = true;
  state.S.cerradoHora = hora();
  if (!saveDay(state.cur, state.S)) return;
  showGuardadoIndicator();
  state.paso1Guardado = !!state.S.efHora;
  state.paso2Guardado = !!state.S.tbHora;
  if (document.getElementById('nota-in')) document.getElementById('nota-in').value = state.S.nota || '';
  renderCaja();
  cerrarModalCierre();
  const jsD = new Date(state.cur.y, state.cur.m - 1, state.cur.d);
  toast(DIAS_ES[jsD.getDay()] + ' ' + state.cur.d + ' cerrado ✓', 'success');
}

/* ──────────────────────────────────────────────────
   COPIAR RESUMEN
────────────────────────────────────────────────── */
function copiarResumen() {
  if (!state.S.cerrado) {
    if (!confirm('Este día aún no está marcado como cerrado.\n¿Seguro que quieres copiar este resumen?')) {
      return;
    }
  }
  const txt = obtenerTextoResumenCierre(state.cur, state.S, 'clipboard');
  navigator.clipboard.writeText(txt).then(function () { toast('Resumen copiado 📋', 'success'); }).catch(function () {
    const ta = document.createElement('textarea');
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('Resumen copiado 📋', 'success');
  });
}

/* ──────────────────────────────────────────────────
   TOAST
────────────────────────────────────────────────── */
function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('toast--success');
  if (type === 'success') el.classList.add('toast--success');
  el.classList.add('show');
  clearTimeout(toast._hideId);
  toast._hideId = setTimeout(function () {
    el.classList.remove('show');
    toast._hideId = null;
  }, 2600);
}

/* ──────────────────────────────────────────────────
   TECLADO
────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  const overlay = document.getElementById('overlay');
  const overlayCierre = document.getElementById('overlay-cierre');
  const overlaySinVentas = document.getElementById('overlay-sin-ventas');
  const notifPanel = document.getElementById('notif-panel');
  const modalOpen = overlay && overlay.classList.contains('open');
  const cierreOpen = overlayCierre && overlayCierre.classList.contains('open');
  const sinVentasOpen = overlaySinVentas && overlaySinVentas.classList.contains('open');
  const notifOpen = notifPanel && notifPanel.classList.contains('open');

  if (cierreOpen && e.key === 'Escape') { cerrarModalCierre(); return; }
  if (sinVentasOpen && e.key === 'Escape') { cerrarModalSinVentas(); return; }
  if (notifOpen && e.key === 'Escape') { cerrarNotifPanel(); return; }
  if (cierreOpen && e.key === 'Tab') {
    const modal = overlayCierre.querySelector('.modal-cierre');
    const focusable = modal ? modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') : [];
    var list = Array.from(focusable).filter(function (el) { return el.offsetParent !== null; });
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first && last) { last.focus(); e.preventDefault(); }
    } else {
      if (document.activeElement === last && first) { first.focus(); e.preventDefault(); }
    }
    return;
  }

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
    if (cierreOpen && id === 'modal-gs-monto') { addGastoEnModal(); e.preventDefault(); }
    if (cierreOpen && id === 'modal-gs-desc') { const mEl = document.getElementById('modal-gs-monto'); if (mEl) mEl.focus(); e.preventDefault(); }
  }
  if (e.key==='Escape') { if (sinVentasOpen) cerrarModalSinVentas(); else if (modalOpen) cerrarModal(); }
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
const overlaySinVentasEl = document.getElementById('overlay-sin-ventas');
if (overlaySinVentasEl) {
  overlaySinVentasEl.addEventListener('click', function (e) {
    if (e.target === overlaySinVentasEl) cerrarModalSinVentas();
  });
}
const overlayCierreEl = document.getElementById('overlay-cierre');
if (overlayCierreEl) {
  overlayCierreEl.addEventListener('click', function (e) {
    if (e.target === overlayCierreEl) cerrarModalCierre();
  });
}

/* Cerrar panel de notificaciones al hacer clic fuera */
document.addEventListener('click', function (e) {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('header-notif-btn');
  if (!panel || !panel.classList.contains('open')) return;
  if (btn && btn.contains(e.target)) return;
  if (panel.contains(e.target)) return;
  cerrarNotifPanel();
});

/* ──────────────────────────────────────────────────
   INIT + PWA
────────────────────────────────────────────────── */
(function init() {
  const appBody = document.getElementById('app-body');
  const efIn = document.getElementById('ef-in');
  if (!appBody || !efIn) {
    if (typeof console !== 'undefined' && console.warn) console.warn('Florería: DOM no listo. Comprueba que index.html carga correctamente.');
    return;
  }
  const hoy = todayObj();
  const btnMesSig = document.getElementById('btn-mes-sig');
  if (btnMesSig) btnMesSig.disabled = (state.curMes.y > hoy.y || (state.curMes.y === hoy.y && state.curMes.m >= hoy.m));
  state.paso1Guardado = !!state.S.efHora;
  state.paso2Guardado = !!state.S.tbHora;
  const tbIn = document.getElementById('tb-in');
  if (efIn) efIn.addEventListener('input', function () { state.paso1Guardado = false; actualizarCajaWizardUI(); });
  if (tbIn) tbIn.addEventListener('input', function () { state.paso2Guardado = false; actualizarCajaWizardUI(); });
  const notaIn = document.getElementById('nota-in');
  if (notaIn) notaIn.addEventListener('input', actualizarCajaWizardUI);
  updateDateHeader();
  renderCaja();
  const viewCaja = document.getElementById('view-caja');
  if (viewCaja && viewCaja.classList.contains('active')) {
    document.body.classList.add('tab-caja-active');
  }
  /* Asegurar que el badge de avisos se actualice tras el primer render (misma lógica que al cambiar de pestaña) */
  setTimeout(updateNotifPanelUI, 0);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
