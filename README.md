# Florería Elizabeth · Caja diaria

Aplicación web sencilla (PWA) para llevar la **caja diaria** de una florería: registrar efectivo, tarjeta/Transbank, gastos, notas del día y ver resúmenes por día y por mes. Todo se guarda **localmente en el navegador** usando `localStorage`, sin servidor ni base de datos externa.

**Repositorio:** [github.com/Derehckz/floreria_caja](https://github.com/Derehckz/floreria_caja)

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

- **Ingresos:** total de **efectivo** (billetes en caja) y total **Tarjeta / Transbank** (según cierre o papelito).
- **Gastos del día:** cada egreso con descripción y monto.
- **Nota del día:** observaciones opcionales.
- **Resultado del día:** ingresos, gastos, neto, margen y resumen de la semana actual.
- **KPIs visibles:** efectivo, tarjeta, gastos, resultado del día. Si hay días anteriores en el mes, se muestra **promedio diario** y si hoy vas sobre o bajo ese promedio.
- **Acciones:** Copiar resumen, enviar por WhatsApp, **Confirmar cierre del día** (también se puede cerrar días sin ventas).

### Resumen mensual (pestaña **Mes**)

- Totales: **Ingresos**, **Gastos**, **Lo que ganaste** (neto), **Mejor día**.
- **Resumen para el negocio:** promedio por día abierto, proyección al cierre del mes, comparativa vs mes anterior (mismo período).
- Lista de **días del mes** con ingresos, gastos, neto y estado (Cerrado / Pendiente). Click en un día para abrirlo en Caja.
- **Notas importantes del mes** y **análisis avanzado** (Efectivo vs Transbank, ingresos por semana, tabla semanal, top 3 días).

### Respaldo (pestaña **Respaldo**)

- **Estado:** días registrados, primer/último registro, tamaño aproximado, **último backup** (fecha/hora).
- **Descargar backup** en `.json` (Guardar en Drive o WhatsApp).
- **Restaurar backup** desde un `.json` (con confirmación; reemplaza los datos actuales).
- **Compartir resumen del día** por WhatsApp.

### Histórico y pendientes

- Los días se guardan por clave `fe_YYYY-MM-DD` en `localStorage`.
- **Banner de pendientes** (últimos 30 días) avisa si hay días sin cerrar y permite ir al primero.

---

## Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript (sin frameworks).
- **Almacenamiento:** `localStorage`.
- **PWA:** `manifest.json`, `sw.js` (caché versionada, network first).

**Archivos:**

| Archivo        | Descripción                          |
|----------------|--------------------------------------|
| `index.html`   | Estructura y vistas                  |
| `styles.css`   | Estilos y diseño responsivo          |
| `app.js`       | Lógica (caja, mes, backup, UI)       |
| `sw.js`        | Service worker                       |
| `manifest.json`| PWA (nombre, icono, tema)            |
| `tests.js`     | Tests manuales de lógica             |

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

## Tests manuales

En la consola del navegador (F12), con la app cargada:

```javascript
runTests()
```

Incluyen: `calcularResumenDia`, casos sin ventas, días pendientes.

---

## Accesibilidad

- Tabs con ARIA; cambio con flechas ← → con foco en la pestaña.
- Modal “Limpiar día” con `role="dialog"` y focus trap.
- Toast y mensajes con `aria-live` donde aplica.

---

## Ideas para más adelante

- Recordatorio si no se cerró el día.
- Foto del comprobante Transbank por día.
- Marcar “día sin venta” (no abriste).
- Temporadas (14 feb, día de la madre) para ver picos.

---

## Limitaciones

- Datos **solo en el navegador**. Sin backup se pierden al borrar caché o cambiar dispositivo.
- No hay multiusuario ni sincronización en la nube.
- Tests manuales (sin runner automatizado).
