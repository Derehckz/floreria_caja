# Florería Elizabeth · Caja diaria

Aplicación web sencilla (PWA) para llevar la **caja diaria** de una florería: registrar efectivo, tarjeta/Transbank, gastos, notas del día y ver resúmenes por día y por mes. Todo se guarda **localmente en el navegador** usando `localStorage`, sin servidor ni base de datos externa.

**Repositorio:** [github.com/Derehckz/floreria_caja](https://github.com/Derehckz/floreria_caja)

---

## Estado del proyecto

- **Funcional:** La app está operativa con todas las funciones descritas más abajo: **Caja** (cierre del día vía modal único: efectivo, Transbank, gastos y nota; KPIs, panel de avisos, recordatorio nocturno, día sin ventas), **Mes** (resumen, totales acumulados hasta un día, avance, esta semana, notas del mes, días del mes, cierre masivo de pendientes), **Histórico** (total ganado, mejor/peor mes, tabla de meses con filtro por año) y **Respaldo** (desde el botón 💾 del header: descargar/restaurar, recordatorio de último backup).
- **Navegación:** Tres pestañas: **Caja**, **Mes**, **Histórico**. **Respaldo** se abre desde el botón 💾 del header.
- **Arquitectura:** Lógica de dominio en `js/domain.js`, almacenamiento en `js/storage.js`, estado global y UI en `app.js`, estilos en `styles.css`. Tests automatizados con `npm test` (Node) y tests manuales en navegador (`tests.js`).
- **Diseño:** Paleta 2026 (variables CSS en `:root`), componentes reutilizables (cards, KPIs, chips de estado), accesibilidad (ARIA, foco visible, contraste WCAG AA).
- **Documentación:** [AUDITORIA_FLORERIA_ELIZABETH.md](./AUDITORIA_FLORERIA_ELIZABETH.md) — auditoría técnica y de producto con roadmap; [REDISENO_UX_2026.md](./REDISENO_UX_2026.md) y [PROPUESTA_CAJA_2026.md](./PROPUESTA_CAJA_2026.md) para evolución de UX.

---

## Clonar y ejecutar

```bash
git clone https://github.com/Derehckz/floreria_caja.git
cd floreria_caja
python -m http.server 8000
```

Abre en el navegador: **http://localhost:8000/index.html**

---

## Funcionalidad principal

### Caja del día (pestaña **Caja**)

- **Navegación de día:** selector con día anterior/siguiente e “Ir a hoy”; chip de estado (Día cerrado / Día pendiente / Sin datos). Banner cuando estás viendo un día pasado.
- **Panel de avisos (🔔):** campanita en el header con avisos: día pasado, “no abriste este día”, recordatorio de cierre, días pendientes en los últimos 30.
- **Cierre del día:** el flujo principal es el botón flotante **Ingresar cierre** (FAB), que abre un **modal único** donde ingresas:
  - Efectivo y Transbank (totales del día).
  - Gastos del día (tipo: Flores, Verde, Día Kathy, Otros; monto y descripción).
  - Nota del día (opcional).
  Desde el modal puedes **Guardar sin cerrar** o **Guardar y cerrar día**. Si no abriste, existe la opción **Cerrar día sin ventas** desde el aviso correspondiente.
- **Vista Resultado del día:** en la misma pestaña se muestra el resumen (efectivo, Transbank, ingresos, gastos, balance neto, margen) y acciones: Editar, Copiar, WhatsApp, Limpiar.
- **KPIs:** hero con “Lo que te queda hoy” (o resultado del día), desglose efectivo/Transbank/gastos, y contexto vs promedio del mes.
- **Recordatorio nocturno:** después de las 20:00, si hoy sigue pendiente, se muestra un aviso para ir a cerrar el día.

### Resumen mensual (pestaña **Mes**)

- **Cabecera:** navegación de mes (‹ ›), “Ir a mes actual”, chips de estado (cerrados/pendientes) y botón **Cerrar pendientes del mes** (solo días con datos).
- **Resumen del mes:** Lo que ganaste este mes (hero), desglose Total ingresos, Total gastos, Mejor día (ingresos).
- **Totales acumulados hasta una fecha:** selector de día (1–31), totales hasta ese día, avance del mes y bloque “Esta semana (lun–hoy)”.
- **Notas importantes del mes** y tabla **Días del mes** (click en un día para abrirlo en la pestaña Caja).
- **Análisis avanzado:** resumen semanal del mes y Top 3 mejores días por ingresos.

### Histórico (pestaña **Histórico**)

- **Total ganado** en todos los meses registrados (o en el año filtrado).
- **Mejor y peor mes** con barras comparativas.
- **Filtro por año** (select “Todos” o año concreto).
- **Tabla de meses** con columnas ordenables (Mes, Ingresos, Gastos, Neto, Estado); click en una fila para abrir ese mes en la pestaña Mes.

### Respaldo (botón 💾 del **header**)

- **Estado:** días registrados, primer/último registro, tamaño aproximado, **último backup** (fecha/hora). Recordatorio si nunca has descargado o hace tiempo.
- **Descargar backup** en `.json` (Guardar en Drive o WhatsApp).
- **Restaurar backup** desde un `.json` (con confirmación; reemplaza los datos actuales).

### Pendientes

- Los días se guardan por clave `fe_YYYY-MM-DD` en `localStorage`.
- **Banner de pendientes** (últimos 30 días) avisa si hay días sin cerrar y permite ir al primero.

---

## Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript (sin frameworks).
- **Almacenamiento:** `localStorage`.
- **PWA:** `manifest.json`, `sw.js` (caché versionada, network first).

**Archivos principales:**

| Archivo          | Descripción                                                  |
|------------------|--------------------------------------------------------------|
| `index.html`     | Estructura, vistas (Caja, Mes, Histórico, Respaldo), modales |
| `styles.css`     | Estilos, variables CSS (paleta 2026), diseño responsivo (WCAG AA) |
| `js/domain.js`   | Lógica de dominio (fechas, resumen, validación backup, `parseMontoInput`, etc.) |
| `js/storage.js`  | Persistencia: `loadDay`, `saveDay`, `allDayKeys`, `getDaysOfMonth` |
| `app.js`         | Estado global (`state`), UI (render Caja/Mes/Histórico/Respaldo, modal de cierre) |
| `sw.js`          | Service worker (caché versionada, network first)            |
| `manifest.json`  | PWA (nombre, icono, theme-color)                             |
| `tests.js`       | Tests manuales en navegador (`runTests()`)                   |
| `run-tests.js`   | Runner de tests automatizados (Node)                         |
| `package.json`   | Script `npm test` para tests de dominio                     |

La carpeta `scripts/` puede contener utilidades auxiliares (por ejemplo, generación de backups de prueba).

**Orden de carga de scripts (index.html):** `js/domain.js` → `js/storage.js` → `app.js` → `tests.js`. El estado global (`state` en `app.js`) incluye `cur` (día seleccionado), `curMes`, `mesCorteDia`, `cajaPaso`, `S` (datos del día actual), `lastSavedAt`, etc. La UI se actualiza mediante funciones `render*`; los eventos del HTML llaman a funciones globales (`abrirModalCierre`, `setTab`, `guardarCierreDesdeModal`, etc.).

---

## Cómo usar la app (flujo diario)

1. **Al cierre del día** → pestaña **Caja**:
   - Pulsa **Ingresar cierre** (botón flotante o el CTA en la vista).
   - En el modal: ingresa total **efectivo** y **Transbank**, agrega cada **gasto** (tipo y monto) y, opcionalmente, la **nota** del día.
   - Elige **Guardar sin cerrar** (para seguir editando) o **Guardar y cerrar día** para marcar el día como cerrado.

2. **Ver o editar un día** → pestaña **Mes** → tabla “Días del mes” → toca un día para abrirlo en Caja (o desde Histórico, toca un mes y luego un día).

3. **Respaldo** → Descargar backup con frecuencia; restaurar solo si cambias de dispositivo o pierdes datos.

---

## Respaldo recomendado

- Haz backup **al menos una vez a la semana**.
- Guarda el `.json` en Google Drive o WhatsApp.
- Si borras datos del navegador o cambias de dispositivo, **sin backup pierdes todo**.

---

## Cambio de dispositivo

1. **Dispositivo actual:** Respaldo → Descargar backup → guarda el `.json`.
2. **Nuevo dispositivo:** Respaldo → Restaurar backup → elige ese archivo (reemplaza los datos actuales).

---

## Tests

**Automáticos (Node):** ejecuta los tests de la lógica de dominio sin abrir el navegador:

```bash
npm test
```

**Manuales (navegador):** en la consola (F12), con la app cargada:

```javascript
runTests()
```

Incluyen: `calcularResumenDia`, `normalizeDayData`, casos sin ventas, días pendientes, `getPendientesHastaHoyEnRangoDias`, `parseMontoInput`, `clampCorteDia` (en Node también vía `npm test`).

---

## Accesibilidad

- Tabs con ARIA; cambio con flechas ← → con foco en la pestaña.
- Modal “Limpiar día” con `role="dialog"` y focus trap.
- Toast y mensajes con `aria-live` donde aplica.
- Contraste de texto ajustado a WCAG AA (`--ink-soft`).
- Foco visible con `:focus-visible` para navegación por teclado.

---

## Ideas para más adelante

- Foto del comprobante Transbank por día.
- Temporadas (14 feb, día de la madre) para ver picos.
- Exportar CSV, categorías de gastos, vista previa al restaurar backup.

---

## Limitaciones

- Datos **solo en el navegador**. Sin backup se pierden al borrar caché o cambiar dispositivo.
- No hay multiusuario ni sincronización en la nube.
- Tests: runner automatizado (`npm test`) para lógica de dominio; tests manuales en navegador para flujos con `localStorage`.

---

## Documentación adicional

- **[AUDITORIA_FLORERIA_ELIZABETH.md](./AUDITORIA_FLORERIA_ELIZABETH.md)** — Auditoría técnica y de producto, roadmap priorizado y propuestas de mejora.
- **[REDISENO_UX_2026.md](./REDISENO_UX_2026.md)** — Rediseño UX 2026: diagnóstico, layout, paleta y microinteracciones.
- **[PROPUESTA_CAJA_2026.md](./PROPUESTA_CAJA_2026.md)** — Propuesta “Sistema de Caja Minimalista 2026”: métricas derivadas, arquitectura y visión de negocio.
