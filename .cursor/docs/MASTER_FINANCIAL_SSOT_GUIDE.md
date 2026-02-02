# Guía Maestra: SSoT Financiero (Cotizaciones y Descuentos)

**Última actualización**: 2026-01-29  
**Rama**: 260129-fixes-calculo-financiero  
**Referencias**: Arquitectura de Precios y Resiliencia (UI Tonta, Servidor Inteligente), [RESUMEN_CONTRATACION_DESCUENTO_SSoT.md](./RESUMEN_CONTRATACION_DESCUENTO_SSoT.md)

Este documento consolida las auditorías de congruencia financiera y SSoT en el flujo de cotizaciones y descuentos: mapa de componentes, brechas detectadas y propuesta/implementación del Motor de Cálculo.

**Arquitectura actual:** La lógica financiera (total a pagar, anticipo, diferido, descuento) es un **Módulo Independiente**: el **Cotización Calculation Engine** (`cotizacion-calculation-engine.ts`). Sigue el patrón **Servidor Inteligente / UI Tonta**: el servidor calcula una única vez con el engine; la UI solo recibe y muestra los valores (sin fórmulas propias). Esto permite auditorías de módulo y certificación de paridad sin depender del front.

---

## 1. Mapa de Componentes (montos finales)

Archivos que muestran o calculan montos finales (total a pagar, anticipo, descuento, total contrato).

### 1.1 Studio – Cierre de promesa

| Archivo | Muestra montos | Usa SSoT |
|---------|----------------|----------|
| `src/app/.../cierre/components/CotizacionCard.tsx` | Sí (precioBase → desglose) | Sí – `CondicionesComercialesDesglose` |
| `src/app/.../cierre/components/CondicionesSection.tsx` | Sí | Sí – `CondicionesComercialesDesglose` |
| `src/app/.../cierre/components/ContratoSection.tsx` | Sí (datos para contrato) | Depende del renderer |
| `src/app/.../cierre/components/ContratoDigitalCard.tsx` | Sí | Datos del padre |
| `src/app/.../cierre/components/ContratoGestionCard.tsx` | Sí | Idem |

### 1.2 Studio – Edición de cotizaciones / Autorizar

| Archivo | Muestra montos | Usa SSoT |
|---------|----------------|----------|
| `src/components/shared/cotizaciones/ResumenCotizacion.tsx` | Sí | Sí – `CondicionesComercialesDesglose` cuando hay condiciones |
| `src/app/.../pendiente/.../AuthorizeCotizacionModal.tsx` | Sí | Sí – usa `ResumenCotizacion` |
| `src/components/promise/AutorizarCotizacionModal.tsx` | Sí (precioBase prop) | Recibe precioBase; no calcula descuento internamente |
| `src/components/promise/CotizacionDetailSheet.tsx` | Sí | **No** – fórmula local (Brechas) |
| `src/app/.../negociacion/components/CalculoConCondiciones.tsx` | Sí | Sí – `CondicionesComercialesDesglose` |

### 1.3 Studio – Visualización de eventos

| Archivo | Muestra montos | Usa SSoT |
|---------|----------------|----------|
| `src/app/.../events/[eventId]/components/EventCotizacionesCard.tsx` | Sí | Sí – ResumenCotizacion / resumen autorizada |
| `src/app/.../events/[eventId]/components/CondicionesComerciales.tsx` | Sí | Sí – `CondicionesComercialesDesglose` con snapshots/negociación |

### 1.4 Público – Vista promesa / cliente

| Archivo | Muestra montos | Usa SSoT |
|---------|----------------|----------|
| `src/components/promise/PublicQuoteFinancialCard.tsx` | Sí | Sí – `CondicionesComercialesDesglose` |
| `src/components/promise/PublicContractView.tsx` | Sí (total, anticipo, descuento) | **No** – fórmulas propias (Brechas) |
| `src/components/promise/PublicQuoteAuthorizedView.tsx` | Sí | No usa desglose; muestra datos de cotización |
| `src/app/.../negociacion/NegociacionView.tsx` | Sí | **No** – fórmula local duplicada |

### 1.5 Portal del cliente / Resumen contratos y pagos

| Archivo | Muestra montos | Usa SSoT |
|---------|----------------|----------|
| `src/app/.../cliente/[clientId]/[eventId]/components/ResumenPago.tsx` | Sí | Depende de datos que recibe |
| `src/app/.../cliente/[clientId]/[eventId]/components/BalanceFinancieroCard.tsx` | Sí | Idem |

### 1.6 Servidor – Contratos PDF y totales

| Archivo | Calcula montos | Usa SSoT / Snapshots |
|---------|----------------|----------------------|
| `src/lib/actions/studio/business/contracts/renderer.actions.ts` | Sí (getPromiseContractData, buildEventContractData) | **Sí** – snapshots y negociación |
| `src/lib/utils/promise-financials.ts` | Sí (contractValue, pendiente) | Parcial – no considera precio negociado (Brechas) |
| `src/lib/utils/cotizacion-calculation-engine.ts` | Sí (Fase 1) | **Sí** – motor único para total/anticipo/diferido |

### 1.7 Otros

- `src/components/promise/PaqueteDetailSheet.tsx` – Fórmula local + PrecioDesglose.
- `src/components/promise/Step3Summary.tsx` – Recibe precioCalculado.precioBase; no calcula descuento.
- `src/components/shared/condiciones-comerciales/CondicionesComercialesDesglose.tsx` – **Componente SSoT UI**.
- `src/components/shared/cotizaciones/CondicionesFinancierasResumen.tsx` – Resumen numérico; alineado con condiciones.

---

## 2. Brechas detectadas

### 2.1 Flujo de datos: Portal vs Studio / Contrato PDF

| Origen | Server Action / Util | Problema |
|--------|----------------------|----------|
| Portal – Cierre (precio rápido) | `getPublicPromiseCierreBasic` | `totalPrice = price - discount`; ignora `negociacion_precio_personalizado` y snapshots. |
| Portal – Lista/detalle eventos | `obtenerEventosCliente` / `obtenerEventoDetalle` | No seleccionan `negociacion_precio_personalizado` ni snapshot; `total = price - discount` (descuento como monto). |
| Util – Financieros promesa | `getPromiseFinancials` / `getPromiseContractValue` | Usa snapshot y `discount`; **no considera `negociacion_precio_personalizado`**. |

### 2.2 Uso de descuento/precio sin SSoT

| Archivo | Qué hace | Severidad |
|---------|----------|-----------|
| **PublicContractView.tsx** | Calcula total y anticipo con fórmulas propias; no usa utilidad compartida. Si se pasa precio base vs total final de forma inconsistente, hay riesgo de doble descuento o descuento sobre negociado. | Media |
| **CotizacionDetailSheet.tsx** | `calculatePriceWithCondition()` duplica fórmula de descuento/anticipo. | Baja |
| **NegociacionView.tsx** | Trata `cotizacion.discount` como **%**; totales y anticipo/diferido calculados en cliente. | Alta (si en BD discount es monto) |
| **PublicQuoteFinancialCard.tsx** | `descuentoCotizacionMonto = (cotizacionPrice * cotizacionDiscount) / 100`; asume `cotizacionDiscount` en %. | Media |
| **PaqueteDetailSheet.tsx** | Fórmula local + PrecioDesglose. | Baja |

### 2.3 promise-financials no considera precio negociado

- **Archivo:** `src/lib/utils/promise-financials.ts`.
- **Comportamiento:** Usa `c.price` y `condiciones_comerciales_discount_percentage_snapshot` para `precioFinal`. No lee `negociacion_precio_personalizado`.
- **Riesgo:** Para cotizaciones aprobadas con negociación, `contractValue` y `pendingAmount` son incorrectos.
- **Acción:** Usar `cotizacion-calculation-engine` por cotización; cuando exista precio negociado, usar `totalAPagar` del engine.

### 2.4 Resumen de acciones recomendadas

| Fuga | Ubicación | Acción |
|------|-----------|--------|
| Total sin negociación ni snapshot | `getPublicPromiseCierreBasic` | Usar engine; devolver `totalAPagar`. |
| Total sin negociación ni snapshot | `obtenerEventosCliente` / `obtenerEventoDetalle` | Incluir snapshot y `negociacion_precio_personalizado` en select; calcular total con engine. |
| Total sin precio negociado | `promise-financials.ts` | Usar engine por cotización (totalAPagar). |
| Cálculo en cliente (discount como %) | NegociacionView, PublicQuoteFinancialCard | Consumir total resuelto del servidor (engine). |
| Desglose calculado en UI | CondicionesComercialesDesglose, CondicionesFinancierasResumen | Recibir totalAPagar, anticipo, diferido del servidor; solo formatear. |
| Fórmulas duplicadas | PublicContractView, CotizacionDetailSheet, PaqueteDetailSheet | Unificar con engine o CondicionesComercialesDesglose. |

---

## 3. Estado de Snapshots

- **Renderer (getPromiseContractData / buildEventContractData):** Usa `negociacion_precio_personalizado`, `negociacion_precio_original`; prioriza snapshots de condiciones (`condiciones_comerciales_*_snapshot`). Total final: negociado o precio base real menos descuento según condiciones/snapshots.
- **UI evento (CondicionesComerciales):** Usa mismos datos de negociación/snapshots.
- **PublicContractView:** No garantizado que use la misma fuente que el renderer; depende del valor de `cotizacionPrice` que recibe.
- **promise-financials:** Usa solo snapshot de `discount_percentage`; no usa precio negociado.

---

## 4. Cotización Calculation Engine – Módulo Independiente

La lógica financiera está encapsulada en un **módulo independiente (Engine)** que implementa el patrón **Servidor Inteligente / UI Tonta**: una única fuente de verdad en servidor; la UI solo formatea y muestra.

### 4.1 Ubicación y responsabilidad

- **Archivo:** `src/lib/utils/cotizacion-calculation-engine.ts`
- **Responsabilidad:** Dada una cotización (precio, discount, negociación, snapshots) y condiciones comerciales (o snapshots), devolver **un único total a pagar**, descuento aplicado, anticipo y diferido, de forma que Contrato PDF, Portal y Studio usen el mismo resultado.

### 4.2 Reglas de decisión (SSoT)

1. **Precio negociado**  
   Si `negociacion_precio_personalizado != null` y `> 0`:  
   - `totalAPagar = negociacion_precio_personalizado`.  
   - El descuento por porcentaje se ignora (`descuentoAplicado = 0`).

2. **Sin precio negociado**  
   - Precio base real: si `discount` (monto) > 0, `precioBaseReal = price + discount`; si no, `precioBaseReal = price`.  
   - Descuento: priorizar `condiciones_comerciales_discount_percentage_snapshot` (o condiciones.discount_percentage); si hay %, `descuentoAplicado = precioBaseReal * (pct/100)`, `totalAPagar = precioBaseReal - descuentoAplicado`. Si no hay % pero `discount` (monto) > 0, `totalAPagar = price`, `descuentoAplicado = discount`. Si no hay ninguno, `totalAPagar = price`, `descuentoAplicado = 0`.

3. **Anticipo**  
   Sobre `totalAPagar`: si `advance_type === 'percentage'` → `anticipo = totalAPagar * advance_percentage / 100`; si `fixed_amount` → `anticipo = advance_amount`. Usar snapshots cuando existan, sino condiciones.

4. **Diferido**  
   `diferido = totalAPagar - anticipo`.

### 4.3 Convención crítica: `discount` en BD

- En el engine y en el renderer, `studio_cotizaciones.discount` se interpreta como **monto absoluto** (no porcentaje).  
- Cuando `discount > 0`, el campo `price` en BD se considera “precio ya con descuento aplicado”; el precio base real para condiciones es `price + discount`.  
- El descuento **por porcentaje** viene solo de condiciones comerciales (o snapshots).

### 4.4 Uso previsto (fases posteriores)

- **Servidor:** `getPublicPromiseCierreBasic`, `getPublicPromiseCierre`, `obtenerEventosCliente`/`obtenerEventoDetalle`, `getPromiseFinancials`/`getPromiseContractValue`, `renderer.actions.ts` (sustituir bloque de cálculo por llamada al engine).  
- **Cliente:** UI recibe `totalAPagar`, `anticipo`, `diferido`, `descuentoAplicado` del servidor y solo formatea.

---

## 5. Resumen ejecutivo

- **Un solo motor** (`cotizacion-calculation-engine.ts`) centraliza total, descuento, anticipo y diferido para cotizaciones.  
- **Brechas:** Portal (cierre básico, eventos) y `promise-financials` no usan precio negociado ni snapshots de forma consistente con el contrato PDF.  
- **Fase 1:** Motor creado y validado con prueba interna que replica la lógica del renderer (0 centavos de diferencia).  
- **Siguientes fases:** Integrar el engine en server actions y, en UI, consumir totales ya resueltos en lugar de recalcular.

---

## 6. 🏁 Certificación de Paridad y Validación Final (Enero 2026)

**Fecha**: 2026-01-29  
**Referencia**: cotizacion-calculation-engine.ts, runInternalRendererParityTest(), tests de certificación.

### 6.0 Validación en producción ($38,700.00)

Escenario validado en producción con **desviación 0.00 pesos** entre Contrato PDF, Portal del cliente y Studio:

| Comprobación | Resultado |
|--------------|-----------|
| Total a pagar validado | **$38,700.00** (motor = renderer = servidor) |
| Anticipo y diferido | Calculados por el engine; misma cifra en todos los puntos de consumo |
| Desviación | **0.00 pesos** |

Cualquier cambio en reglas de redondeo o descuentos debe hacerse únicamente en `cotizacion-calculation-engine.ts` para mantener la paridad.

### 6.1 Escenario de certificación (tests)

Escenario complejo ejecutado en el motor y en tests:

| Dato | Valor |
|------|--------|
| Precio base | $30,000 |
| Descuento por condición | 10% |
| Precio negociado manual | $25,000 (**manda** sobre el descuento) |
| Anticipo | 20% |

**Salidas esperadas (motor = renderer = servidor):**

| Concepto | Valor |
|----------|--------|
| **totalAPagar** | $25,000.00 |
| **anticipo** | $5,000.00 (20% de 25,000) |
| **diferido** | $20,000.00 |

- El descuento 10% se **ignora** porque existe `negociacion_precio_personalizado`.
- Anticipo y diferido se calculan sobre el total final (25,000).

Escenario cubierto en:
- `cotizacion-calculation-engine.ts`: caso en `runInternalRendererParityTest()`.
- `src/lib/utils/__tests__/cotizacion-calculation-engine.test.ts`: test explícito de certificación.

### 6.2 Verificación cross-check (desviación 0.00)

| Origen | totalAPagar | anticipo | diferido |
|--------|-------------|----------|----------|
| **Motor** (`calculateCotizacionTotals`) | 25,000 | 5,000 | 20,000 |
| **Renderer** (`getPromiseContractData` / buildEventContractData) | 25,000 | 5,000 | 20,000 |
| **getPublicPromiseCierre** (Portal) | Usa engine → `engineOut.totalAPagar` | Idem engine | Idem engine |
| **getPromiseFinancials** (Studio) | Usa engine → `out.totalAPagar` | Idem engine | Idem engine |

- **Renderer**: misma lógica que el motor (negociado → totalFinal = precioNegociado; anticipo = totalFinal × advance_percentage/100; diferido = totalFinal − anticipo).
- **getPublicPromiseCierre**: llama `calculateCotizacionTotals` y expone `totalAPagar`, `anticipo`, `diferido` en la cotización mapeada.
- **promise-financials**: `getPromiseContractValue` y `getPromiseFinancials` usan `calculateCotizacionTotals(buildEngineInput(c))` y toman `out.totalAPagar` por cotización.

**Conclusión**: La desviación entre estos puntos es **0.00 pesos** para el escenario de certificación y para todos los casos cubiertos por `runInternalRendererParityTest()` (incl. negociado, descuento %, descuento monto, anticipo fijo, sin condiciones).

### 6.3 Validación de UI tonta

| Componente | Comportamiento |
|------------|----------------|
| **PublicContractView.tsx** | Sin fórmulas propias; recibe `totalAPagar`, `anticipo`, `diferido`, `descuentoAplicado` del engine vía `getPublicPromiseCierre`; usa `cotizacionPrice` solo como fallback cuando no vienen del servidor. Solo pinta valores con `formatMoney(totalAPagar)`. |
| **BalanceFinancieroCard.tsx** | Recibe `evento` con `total`, `pagado`, `pendiente` resueltos en servidor. Solo muestra Total a pagar, Total pagado, Saldo pendiente con `formatMoney`. |

### 6.4 Resumen de certificación

| Comprobación | Estado |
|--------------|--------|
| Escenario complejo (30k base, 10% desc, 25k negociado, 20% anticipo) | OK – totalAPagar 25,000; anticipo 5,000; diferido 20,000 |
| Paridad motor vs renderer (0 centavos) | OK – `runInternalRendererParityTest()` incluye el caso de certificación |
| getPublicPromiseCierre usa engine | OK – totalAPagar/anticipo/diferido del engine |
| getPromiseFinancials usa engine | OK – totalAPagar por cotización del engine |
| PublicContractView sin matemáticas propias | OK – solo props del engine |
| BalanceFinancieroCard sin matemáticas propias | OK – solo total/pagado/pendiente del servidor |
| Formato consistente (formatMoney) | OK – PublicContractView y portal usan package-price-formatter |

**Desviación entre contrato PDF, Portal y Studio: 0.00 pesos** para los escenarios verificados (incl. $38,700.00 en producción y $25,000 del caso de tests). Si en el futuro apareciera alguna diferencia de centavos por redondeo, debe corregirse en `cotizacion-calculation-engine.ts` (y, si aplica, en `price-rounding`) para mantener una única fuente de verdad.

**Preparación para auditoría de módulos:** El Engine es un módulo independiente; las auditorías de precisión financiera pueden ejecutarse contra `cotizacion-calculation-engine.ts` y sus tests sin depender del front ni de las actions. La UI se considera "tonta" y solo debe recibir `totalAPagar`, `anticipo`, `diferido`, `descuentoAplicado` ya resueltos por el servidor.
