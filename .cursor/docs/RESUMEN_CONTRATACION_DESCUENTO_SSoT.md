# Fuente única de verdad: Resumen de contratación y descuento aplicado

**Objetivo:** Un solo lugar que define cómo se calcula y muestra el resumen de la cotización (precio base, descuento aplicado, total a pagar) para evitar inconsistencias entre preview, cierre, evento y contrato.

---

## 1. Dónde se muestra el resumen (preview “Cotización / Precio / Descuento”)

El **resumen de la cotización** (nombre, descripción, items, precio base, descuento, total) se muestra en:

- **Studio – Cierre:** modal “Preview de Cotización” → `ResumenCotizacion`
- **Studio – Pendiente / Autorizar:** `AuthorizeCotizacionModal` → `ResumenCotizacion`
- **Studio – Evento detalle:** `EventCotizacionesCard` → `ResumenCotizacion` o `ResumenCotizacionAutorizada`
- **Público / Cliente:** vistas que usan el mismo componente compartido

El componente compartido es **`ResumenCotizacion`** (`src/components/shared/cotizaciones/ResumenCotizacion.tsx`).

- Construye la estructura de items con **`construirEstructuraJerarquicaCotizacion`** (cotizacion-structure.utils).
- Si hay **condiciones comerciales**, el bloque “Precio base → Descuento → Total a pagar” lo renderiza **`CondicionesComercialesDesglose`**.

---

## 2. Fuente única para “descuento aplicado” en la UI

**`CondicionesComercialesDesglose`** (`src/components/shared/condiciones-comerciales/CondicionesComercialesDesglose.tsx`) es la **fuente única de verdad en la UI** para:

- Calcular si hay descuento y cuánto.
- Mostrar “Precio base”, “Descuento (X%):”, “Subtotal”, “Total a pagar”, “Anticipo”, “Diferido”.

Fórmula (modo normal, sin negociación):

```ts
descuentoMonto = condicion.discount_percentage
  ? precioBase * (condicion.discount_percentage / 100)
  : 0;
subtotal = precioBase - descuentoMonto;
```

- **precioBase:** suele ser `cotizacion.price` (precio de la cotización).
- **condicion:** condiciones comerciales con `discount_percentage`, `advance_type`, `advance_percentage` / `advance_amount`.

Validación de “descuento aplicado”: si hay `condicionesComerciales` con `discount_percentage`, el descuento mostrado debe ser exactamente el que calcula este componente (precioBase × discount_percentage / 100). No debe haber otra fórmula en la UI para el mismo concepto.

---

## 3. Dónde se usa CondicionesComercialesDesglose

- **ResumenCotizacion** – cuando existe `condicionesComerciales`, pasa `precioBase={cotizacion.price}` y `condicion` derivado de condiciones comerciales.
- **CotizacionCard / CondicionesSection** (cierre) – desglose de condiciones en la card de cotización.
- Otras vistas de “resumen financiero” que muestran condiciones comerciales (evento, cotizaciones públicas, etc.).

Cualquier pantalla que muestre “Precio: $X / Descuento (Y%): -$Z” para una cotización con condiciones comerciales debe usar **CondicionesComercialesDesglose** (o la misma fórmula documentada aquí), no una fórmula local distinta.

---

## 4. Servidor: totales y contratos

Para **totales financieros** (valor de contrato, pagado, pendiente) el servidor usa:

- **`getPromiseFinancials`** (`src/lib/utils/promise-financials.ts`): mismo criterio de descuento:
  - Prioriza `condiciones_comerciales_discount_percentage_snapshot`.
  - Fallback a campo `discount` de la cotización.
  - `precioFinal = precioBase - descuentoMonto`.

Para **renderizado de contratos** (PDF, contenido legal):

- **`renderer.actions.ts`**: usa precio base y condiciones/snapshots para calcular total final y descuento en el contrato; debe alinearse con la lógica anterior (precio base − descuento por porcentaje de condiciones).

---

## 5. Resumen

| Ámbito              | Fuente única / componente principal | Fórmula descuento (modo normal) |
|--------------------|-------------------------------------|----------------------------------|
| UI – Resumen       | CondicionesComercialesDesglose      | `precioBase * (discount_percentage / 100)` → subtotal = precioBase − descuento |
| UI – Quién lo usa  | ResumenCotizacion                   | Pasa precio y condición a CondicionesComercialesDesglose |
| Servidor – Totales | promise-financials.ts               | Snapshot o discount; precioFinal = precioBase − descuento |
| Contratos          | renderer.actions.ts                 | Misma lógica con snapshots       |

Para **validar si el descuento aplicado es correcto** en la UI: comprobar que el componente que muestra el resumen use **CondicionesComercialesDesglose** (o la misma fórmula) con `precioBase = cotizacion.price` y `condicion.discount_percentage` de las condiciones comerciales seleccionadas.
