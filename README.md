# Florería Elizabeth · Caja diaria

Aplicación web sencilla (PWA) para llevar la **caja diaria** de una florería: registrar efectivo, tarjeta/Transbank, gastos, notas del día y ver resúmenes por día y por mes. Todo se guarda **localmente en el navegador** usando `localStorage`, sin servidor ni base de datos externa.

**Repositorio:** [github.com/Derehckz/floreria_caja](https://github.com/Derehckz/floreria_caja)

---

## Estado del proyecto

- **Funcional:** La app está operativa con todas las funciones descritas más abajo: **Caja** (wizard de cierre en pasos, KPIs, recordatorio nocturno, día sin ventas), **Mes** (resumen, día de corte, avance, esta semana, hábitos de caja, cierre masivo de pendientes), **Histórico** (total ganado, mejor/peor mes, tabla de meses por año) y **Respaldo** (desde el botón del header: backup/restore, recordatorio de último backup).
- **Navegación:** Tres pestañas en la barra: **Caja**, **Mes**, **Histórico**. El **Respaldo** se abre desde el botón 💾 del header.
- **Arquitectura actual:** Lógica de dominio y almacenamiento en módulos separados (`js/domain.js`, `js/storage.js`); `app.js` con estado global y UI; estilos en `styles.css`. Tests automatizados con `npm test` (Node) y tests manuales en navegador (`tests.js`).
- **Mejoras ya aplicadas:** Normalización de datos al cargar (`normalizeDayData`), manejo de errores en `loadDay` (toast + `console.warn`), validación de backup antes de restaurar, PWA con Service Worker registrado y caché de todos los assets, recordatorio si no se cerró el día (después de las 20:00), cierre masivo de días pendientes del mes, vista Histórico con filtro por año.
- **Auditoría y roadmap:** En [AUDITORIA_FLORERIA_ELIZABETH.md](./AUDITORIA_FLORERIA_ELIZABETH.md) hay una auditoría técnica y de producto (marzo 2025) con recomendaciones (ya aplicadas en gran parte), bugs priorizados e ideas de evolución. Consulta ese documento para el detalle.

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
- **Recordatorio nocturno:** si son más de las 20:00 y hoy sigue pendiente, se muestra un aviso para ir a cerrar el día.
- **Cierre en wizard (pasos):** Paso 1 → Efectivo y Transbank; Paso 2 → Gastos del día; Paso 3 → Nota del día (opcional); Paso 4 → Resultado del día y acciones. Opción **Cerrar día sin ventas** si no abriste.
- **KPIs en vista:** resultado del día (hero), efectivo, Transbank, gastos; contexto (promedio diario del mes, sobre/bajo promedio).
- **Acciones:** Ingresar cierre, Copiar resumen, WhatsApp, **Guardar y cerrar día**, Limpiar día.

### Resumen mensual (pestaña **Mes**)

- **Cabecera:** navegación de mes, “Ir a mes actual”, resumen de cierres y botón **Cerrar pendientes del mes** (solo días con datos).
- **Resumen del mes:** Total Ingresos, Total Gastos, Lo que ganaste (neto), Mejor día.
- **Totales hasta un día:** día de corte (1–31) opcional, avance del mes, “Esta semana”.
- **Resumen y hábitos:** resumen para el negocio (promedio, proyección, comparativa) y hábitos de caja.
- **Notas importantes del mes** y tabla **Días del mes** (click en un día para abrirlo en Caja).

### Histórico (pestaña **Histórico**)

- **Total ganado** en todos los meses registrados.
- **Mejor y peor mes** con barras comparativas.
- **Filtro por año** (o “Todos”).
- **Tabla de meses** con Ingresos, Gastos, Neto y estado; click en un mes para abrirlo en la pestaña Mes.

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

**Archivos:**

| Archivo          | Descripción                                  |
|------------------|----------------------------------------------|
| `index.html`     | Estructura y vistas                          |
| `styles.css`     | Estilos y diseño responsivo (WCAG AA)        |
| `js/domain.js`   | Lógica de dominio (fechas, resumen, backup)  |
| `js/storage.js`  | Persistencia en `localStorage`                |
| `app.js`         | Estado global, UI (caja, mes, backup)        |
| `sw.js`          | Service worker (caché versionada)            |
| `manifest.json`  | PWA (nombre, icono, theme-color)              |
| `tests.js`       | Tests manuales en navegador (`runTests()`)    |
| `run-tests.js`   | Runner de tests automatizados (Node)         |
| `package.json`   | Script `npm test` para tests de dominio      |

**Orden de carga de scripts (index.html):** `js/domain.js` → `js/storage.js` → `app.js` → `tests.js`. El dominio expone funciones puras (fechas, resumen, validación de backup, `parseMontoInput`, `clampCorteDia`, etc.). Storage: `loadDay`, `saveDay`, `allDayKeys`, `getDaysOfMonth`. La app mantiene el **estado global** en `state` (`app.js`): `cur`, `curMes`, `mesCorteDia`, `cajaPaso`, pasos del wizard, `lastSavedAt`, `S`. La UI (Caja, Mes, Histórico, Respaldo) lee y escribe en `state`; los `onclick` del HTML llaman a funciones globales.

---

## Cómo usar la app (flujo diario)

1. **Al cierre del día** → pestaña **Caja**:
   - Ingresa total **efectivo** y total **Transbank** del día.
   - Registra cada **gasto** (plata que salió) y, si quieres, la **nota** del día.
   - Revisa el **Resultado del día** y pulsa **Confirmar cierre del día**.

2. **Histórico** → pestaña **Mes** → tabla “Días del mes” → toca un día para verlo/editarlo en Caja.

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

- **[REDISENO_UX_2026.md](./REDISENO_UX_2026.md)** — Rediseño UX 2026: diagnóstico, layout, paleta fintech, microinteracciones (solo HTML/CSS).
- **[AUDITORIA_FLORERIA_ELIZABETH.md](./AUDITORIA_FLORERIA_ELIZABETH.md)** — Auditoría técnica y de producto (marzo 2025), roadmap priorizado y propuestas de mejora estructural y de UX.
- **[PROPUESTA_CAJA_2026.md](./PROPUESTA_CAJA_2026.md)** — Evolución a “Sistema de Caja Minimalista 2026”: inteligencia sin más campos, métricas derivadas, arquitectura limpia y visión dueño de negocio (sin ERP ni inventario).
