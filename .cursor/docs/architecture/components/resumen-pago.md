# ResumenPago — Componente compartido de resumen financiero

**Ubicación centralizada:** `src/components/shared/precio/ResumenPago.tsx`  
**Export:** `@/components/shared/precio` (vía `src/components/shared/precio/index.ts`)

Documento de arquitectura del componente unificado que muestra Precio de lista → Cortesías → Bono → Ajuste por cierre → **Total a pagar** → Anticipo → Diferido. Usado en vista de Cierre (studio), Confirmar Cierre, Autorizada y autorización pública.

---

## 1. Props (ResumenPagoProps)

| Prop | Tipo | Descripción |
|------|------|-------------|
| `precioBase` | number | Precio base de referencia. |
| `descuentoCondicion` | number? | Descuento en % de la condición. |
| `precioConDescuento` | number? | Precio tras descuento. |
| `precioFinalNegociado` | number \| null? | Precio negociado (si aplica). |
| `advanceType` | 'percentage' \| 'fixed_amount' | Tipo de anticipo. |
| `anticipoPorcentaje` | number \| null | Porcentaje de anticipo (cuando advanceType === 'percentage'). |
| `anticipo` | number | Monto de anticipo (usado cuando advanceType === 'fixed_amount'; con percentage el componente calcula internamente). |
| `diferido` | number | Total − Anticipo (con percentage se deriva internamente). |
| `cortesias` | number? | Monto cortesías (alternativo). |
| `precioLista` | number \| null? | Precio de lista (Studio); se muestra tachado. |
| `montoCortesias` | number? | Monto total de cortesías. |
| `cortesiasCount` | number? | Cantidad de ítems cortesía "(n)". |
| `montoBono` | number? | Bono especial. |
| `precioFinalCierre` | number \| null? | **Total a pagar.** Si se pasa, el componente usa este valor como base para Total y para el cálculo de anticipo %. |
| `ajusteCierre` | number? | Ajuste: PrecioFinal − (PrecioLista − Cortesías − Bono). |
| `tieneConcesiones` | boolean? | Si mostrar bloque lista/cortesías/bono/ajuste. |
| `compact` | boolean? | Sin margen superior (modales). |
| `title` | string? | Por defecto "Resumen de Pago"; en cierre "Resumen de Cierre". |
| `renderAnticipoActions` | () => ReactNode? | Contenido a la izquierda de la fila Anticipo (ej. botón Editar). |
| `anticipoModificado` | boolean? | Si el anticipo fue editado manualmente (estilo ámbar). |

---

## 2. Estados de uso (compact / editable / solo lectura)

| Estado | Cómo se configura | Contexto típico |
|--------|-------------------|-----------------|
| **Compact** | `compact={true}` | Dentro de modales (ConfirmarCierreModal, popover). Sin `mt-4`. |
| **Editable** | `renderAnticipoActions` devuelve botón que abre popover; caller maneja `actualizarAnticipoCierre` / `actualizarAnticipoCondicionNegociacionCierre`. | CotizacionCard (cierre), ConfirmarCierreModal. |
| **Solo lectura** | No pasar `renderAnticipoActions`. | Vista Autorizada, Step3Summary (autorización pública), ResumenCotizacion sin edición. |

El componente **no** tiene estado interno de edición; la edición la orquesta el padre (popover + Server Action).

---

## 3. Regla de cálculo del anticipo (SSOT en el componente)

- **Si `advanceType === 'percentage'`:** El anticipo mostrado se calcula **siempre** sobre el **Total a pagar** (`precioFinalAPagar`), que es `precioFinalCierre` cuando se pasa, o el total derivado de precio negociado / precio con descuento menos cortesías.  
  Fórmula interna: `anticipoDisplay = Math.round(precioFinalAPagar × anticipoPorcentaje / 100)`, `diferidoDisplay = precioFinalAPagar − anticipoDisplay`.
- **Si `advanceType === 'fixed_amount'`:** Se usan las props `anticipo` y `diferido`; el componente asegura `diferido = total − anticipo` para consistencia visual.

**SSOT flujo Cierre/Autorización:** En [flujo-cierre-cotizacion.md](../flows/flujo-cierre-cotizacion.md) sección **0.5 Guía de Visualización (UI Parity)** se define que todos los consumidores (ConfirmarCierreModal, CotizacionCard cierre, CotizacionAutorizadaCard, ResumenCotizacion) deben pasar `precioFinalCierre` para que Total a pagar y anticipo/diferido coincidan con el contrato y la vista autorizada.

Ver también: **Master** [calculo-utilidad-financiera.md](../../masters/calculo-utilidad-financiera.md) — Sección 8 (Gestión de Anticipos).

---

## 4. Flujo de datos y consumidores

| Consumidor | Fuente de datos | Editable |
|------------|-----------------|----------|
| **CotizacionCard** (cierre) | `obtenerRegistroCierre` → desgloseCierre, pagoData; `getPrecioListaStudio`, `getAjusteCierre`. Total = `cotizacion.price` (total final cierre). | Sí (actualizarAnticipoCierre). |
| **ConfirmarCierreModal** | `getDatosConfirmarCierre` → cotización (price, precio_calculado, cortesias_monto, bono_especial, etc.). Total = cotización.price. | Sí (ajuste fino vía actualizarAnticipoCondicionNegociacionCierre). |
| **CotizacionAutorizadaCard** (Autorizada) | Snapshots en cotización: precio_calculado, bono_especial, cortesias_monto_snapshot, cortesias_count_snapshot; condiciones snapshots para anticipo. Total = cotización.price. | No. |
| **Step3Summary** | Datos del paso 3 de autorización pública. | No. |
| **ResumenCotizacion** | Override opcional (resumenCierreOverride, anticipoOverride). | No (o según contexto). |
| **PrecioDesglose** | Re-exporta ResumenPago con `compact={false}`. | Según padre. |

---

## 5. Vista Autorizada: snapshots y paridad con Cierre

Para que la vista **Autorizada** muestre el mismo bloque que en Cierre (sin edición), los datos deben construirse a partir de **snapshots** persistidos al autorizar:

| Dato mostrado | Origen en Autorizada |
|---------------|----------------------|
| Total a pagar | `cotizacion.price` (precio final ya guardado). |
| Precio de lista | `getPrecioListaStudio({ price, precio_calculado })` con `precio_calculado` de la cotización. |
| Cortesías (n), monto | `cortesias_monto_snapshot`, `cortesias_count_snapshot` en cotización. |
| Bono especial | `bono_especial` en cotización. |
| Ajuste por cierre | `getAjusteCierre(precioFinal, precioLista, montoCortesias, montoBono)`. |
| Anticipo / Diferido | Snapshots de condiciones (advance_type, advance_percentage, advance_amount) o monto del primer pago; si es %, el componente calcula sobre `precioFinalCierre` = price. |

**Persistencia al autorizar:** En `autorizarYCrearEvento` se guardan en la cotización, entre otros: `precio_calculado`, `bono_especial`, `cortesias_monto_snapshot`, `cortesias_count_snapshot`, y snapshots de condiciones. Las lecturas `getCotizacionAutorizadaByPromiseId` y `obtenerResumenEventoCreado` deben incluir estos campos en el `select` para que ResumenPago reciba las mismas magnitudes que en Cierre y se mantenga la paridad de centavos.

---

## 6. Fórmula de consistencia (Ajuste de Cierre)

En todo el sistema, el ajuste por cierre y el total deben cumplir:

$$\text{AjusteCierre} = \text{PrecioFinal} - (\text{PrecioLista} - \text{Cortesías} - \text{Bono})$$

$$\text{Diferido} = \text{PrecioFinal} - \text{Anticipo}$$

El componente usa estas relaciones para coherencia visual; los callers deben pasar `precioFinalCierre` (Total a pagar) y `ajusteCierre` ya calculados según el Master financiero.

**SSOT Total a pagar (Fase 2026-03):** En cierre y vista previa, el total se calcula con prioridad:
1. `totalAPagar` (motor de cotización `calculateCotizacionTotals`)
2. `negociacion_precio_personalizado` (precio personalizado del socio)
3. Fallback calculado (precio base − descuento condición)

Esto garantiza paridad entre editor, pendientes, cierre y sheet lateral.

---

**Referencias:**  
- Auditoría detallada: [.cursor/docs/audits/resumen-pago-component-and-autorizada-data.md](../../audits/resumen-pago-component-and-autorizada-data.md)  
- Master fórmulas: [.cursor/docs/masters/calculo-utilidad-financiera.md](../../masters/calculo-utilidad-financiera.md) §8
