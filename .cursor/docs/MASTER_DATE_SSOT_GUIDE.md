# Guía Maestra: SSoT de Fechas en ZEN Platform

**Última actualización:** 2026-01-29  
**Estado:** Unificación completada. Fases 1–4 aplicadas.  
**Fuentes:** Manejo de Fechas, Auditoría Contratos, Auditoría SSoT 260129

Este documento es la **fuente única de verdad** para el manejo de fechas en ZEN Platform: fundamentos, utilidades certificadas, reglas de oro y registro de componentes blindados.

---

## Reglas de oro: fechas legales

1. **Nunca** usar lógica local (`getFullYear()`, `getMonth()`, `getDate()`, `toLocaleDateString()` directo) para fechas de evento o firma.
2. **Siempre** usar las utilidades certificadas según el caso (tabla más abajo).
3. **Para fechas legales de firma:** usar siempre **`getDateOnlyInTimezone`** con el **timezone del Studio** (`studio.timezone` o default `America/Mexico_City`), para que el día mostrado coincida con el día calendario en la zona del estudio (y con la tarjeta “Firmado” en Studio).

Las etiquetas relativas ("Hoy", "Mañana") en la UI pueden usar fecha local del usuario; las fechas que se imprimen en contratos o se guardan como "fecha del evento" / "fecha de firma" **no**.

---

## Utilidades certificadas y casos de uso

| Utilidad | Origen | Caso de uso |
|----------|--------|-------------|
| **`toUtcDateOnly(value)`** | `@/lib/utils/date-only` | Fecha del **evento** (día calendario en UTC). Normaliza `string \| Date` a mediodía UTC. Entrada a `formatDisplayDateLong` para `fecha_evento`. |
| **`formatDisplayDateLong(date)`** | `@/lib/utils/date-formatter` | Texto legal largo (ej. "sábado, 25 de abril de 2025"). Usar con la salida de `toUtcDateOnly` o de `getDateOnlyInTimezone`. |
| **`getDateOnlyInTimezone(value, timeZone)`** | `@/lib/utils/date-only` | **Fecha de firma del contrato.** Dado un instante y la zona del studio, devuelve el día calendario en esa zona como `Date` a mediodía UTC. Ej.: firma jueves 29 a las 22:50 México → "jueves, 29 de enero". |

**Referencia rápida:**

```typescript
import { toUtcDateOnly, getDateOnlyInTimezone } from '@/lib/utils/date-only';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';

// Fecha del evento (legal)
const textoEvento = eventDate
  ? formatDisplayDateLong(toUtcDateOnly(eventDate))
  : 'Fecha por definir';

// Fecha de firma del cliente (legal) – siempre con timezone del Studio
const studioTz = studio.timezone ?? 'America/Mexico_City';
const dayInTz = getDateOnlyInTimezone(contract_signed_at, studioTz);
const normalized = dayInTz ?? toUtcDateOnly(contract_signed_at);
const textoFirma = normalized ? formatDisplayDateLong(normalized) : '—';
```

---

# Parte 1: Fundamentos (Manejo de Fechas)

## 1.1 Resumen ejecutivo

ZEN Platform implementa un sistema de fechas **"Calendar-Only"** usando **exclusivamente métodos UTC** (o día en timezone del studio para firma) para evitar desfase de días entre entornos.

- **Problema resuelto en flujos ya migrados:** Fechas con un día de diferencia entre entornos.
- **Migración de datos:** Columnas `event_date` en `studio_promises` y `studio_events` son tipo `DATE` en PostgreSQL.
- **Utilidades SSoT:** `date-only.ts` (toUtcDateOnly, getDateOnlyInTimezone, dateToDateOnlyString) y `date-formatter.ts` (formatDisplayDate, formatDisplayDateLong).

## 1.2 Problema original

Al seleccionar una fecha (ej. **31 de enero**), en producción se guardaba o mostraba **un día de diferencia** (ej. **30 de enero**) por:

1. Uso de `new Date(...)` o métodos locales en servidor/cliente.
2. Serialización de `Date` a ISO (medianoche UTC) y reinterpretación en otra zona.
3. Uso de `.toLocaleDateString()` sin extraer antes componentes UTC.

**Solución:** Tipo `DATE` en BD, buffer de mediodía UTC, y en **toda mención legal de fecha** usar solo las utilidades certificadas (toUtcDateOnly o getDateOnlyInTimezone + formatDisplayDateLong).

## 1.3 Capa de utilidades (certificadas)

### `src/lib/utils/date-only.ts`

- **`toUtcDateOnly(value: string | Date): Date | null`**  
  Parsea/normaliza a día calendario en UTC con mediodía (12:00) como buffer.
- **`getDateOnlyInTimezone(value: Date | string, timeZone: string): Date | null`**  
  Dado un instante y una zona (ej. `America/Mexico_City`), devuelve el día calendario **en esa zona** como `Date` a mediodía UTC. **Usar para fecha de firma del contrato** con `studio.timezone`.
- **`dateToDateOnlyString(date): string | null`**  
  Convierte `Date` a `YYYY-MM-DD` usando solo métodos UTC.
- **`normalizeDateToUtcDateOnly(value: Date): Date`**  
  Normaliza un `Date` existente a mediodía UTC con el mismo día calendario.

### `src/lib/utils/date-formatter.ts`

- **`formatDisplayDate(date, options?)`**  
  Formatea usando **solo** `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`.
- **`formatDisplayDateLong(date)`**  
  Formato largo: día de semana + día + mes + año (ej. "sábado, 25 de abril de 2025"). **Usar en renderer y vista de contrato para todas las fechas legales.**

## 1.4 Certificación

- **Prueba interna:** `runDateOnlyLegalDisplayTest()` en `date-formatter.ts` valida que una fecha ISO de medianoche UTC devuelva siempre el mismo texto (ej. "sábado, 25 de abril de 2025") al pasar por `toUtcDateOnly` + `formatDisplayDateLong`.
- **Suite Jest:** `src/lib/utils/__tests__/date-formatter.test.ts`.

---

# Parte 2: Soberanía de la Zona Horaria del Studio

## 2.1 Objetivo

La **fecha de firma del contrato** debe mostrarse como el **día calendario en la zona horaria del Studio** (ej. México), no el día en UTC. Así se evita que, si el cliente firma el jueves 29 a las 22:50 (hora México), el contrato muestre "viernes 30" por usar solo UTC.

## 2.2 Cómo funciona `getDateOnlyInTimezone`

- **Entrada:** Un instante (`Date` o string ISO) y un `timeZone` (ej. `America/Mexico_City`, guardado en `studios.timezone`).
- **Proceso:** Usa `Intl.DateTimeFormat` con `timeZone` para obtener año, mes y día **en esa zona**; construye un `Date` a mediodía UTC con ese día calendario.
- **Salida:** `Date` listo para pasar a `formatDisplayDateLong`, de modo que el texto sea "jueves, 29 de enero de 2026" cuando el instante corresponde a ese día en la zona del studio.

## 2.3 Dónde se usa

- **`getPromiseContractData`** (renderer.actions.ts): Para `fecha_firma_cliente` usa `getDateOnlyInTimezone(contract_signed_at, studio.timezone ?? 'America/Mexico_City')`; fallback a `toUtcDateOnly` si falla.
- **`getEventContractData`** (renderer.actions.ts): Misma lógica para la fecha de firma del contrato del evento.

Con esto, el texto del contrato (estudio y cliente) y la tarjeta "Firmado" en Studio muestran el mismo día (ej. jueves 29).

---

# Parte 3: Auditoría de Contratos (resumen)

## 3.1 Puntos de falla que fueron corregidos

| Ubicación | Antes (incorrecto) | Después |
|-----------|--------------------|---------|
| **renderer.actions.ts** – fecha evento | `new Date(eventDate).toLocaleDateString("es-ES", ...)` | `formatDisplayDateLong(toUtcDateOnly(eventDate))` |
| **renderer.actions.ts** – fecha firma | `new Date(...).toLocaleDateString("es-ES", ...)` | `getDateOnlyInTimezone(signedAt, studioTz)` + `formatDisplayDateLong` (fallback `toUtcDateOnly`) |
| **PublicContractView.tsx** – fallback fecha evento | `new Date(promise.event_date).toLocaleDateString('es-ES', ...)` | `formatDisplayDateLong(toUtcDateOnly(promise.event_date))` |
| **Portal cliente – página contrato** | Contenido desde snapshot (fecha incorrecta pre-renderizada) | Re-render con plantilla + eventData cuando hay `template_id` (fecha correcta desde getEventContractData) |
| **Firma desde portal público** | `contract_signed_at: new Date()` (instante UTC) | Cliente envía `signature_date` (YYYY-MM-DD local); servidor valida hoy/ayer UTC y guarda con `parseDateOnlyToUtc` |

## 3.2 Comparativa: Agenda (correcto) vs Contrato (ahora alineado)

- **Agenda:** Usa componentes UTC y `formatDisplayDateLong` / `formatDisplayDate`.
- **Contrato:** Tras las fases 2–4, usa las mismas utilidades y, para firma, `getDateOnlyInTimezone` con timezone del studio.

---

# Parte 4: Unificación por tipo de fecha

| Tipo | Meta | Utilidad |
|------|------|----------|
| **Absoluta (evento)** | Que el día no cambie (25 es 25). | `formatDisplayDateLong(toUtcDateOnly(...))` |
| **Absoluta (firma contrato)** | Día calendario en zona del studio. | `formatDisplayDateLong(getDateOnlyInTimezone(..., studio.timezone) ?? toUtcDateOnly(...))` |
| **Relativa (faltan X días)** | "Hoy" del usuario, "día" del evento en UTC. | `getRelativeDateLabel` (usa toUtcDateOnly internamente) |
| **Sistema (logs/auditoría)** | Hora exacta de creación/actualización. | `formatRelativeTime` o formatDisplayDate si solo interesa el día |

---

# Anexo A: Componentes blindados (Fases 1–4)

Evitar re-trabajos: estos archivos ya usan el SSoT de fechas (toUtcDateOnly / formatDisplayDateLong / getDateOnlyInTimezone según corresponda).

## Fase 1 – Utilidades y certificación

- `src/lib/utils/date-only.ts` (toUtcDateOnly, getDateOnlyInTimezone, dateToDateOnlyString, parseDateOnlyToUtc, normalizeDateToUtcDateOnly)
- `src/lib/utils/date-formatter.ts` (formatDisplayDate, formatDisplayDateLong, formatDisplayDateShort, runDateOnlyLegalDisplayTest)
- `src/lib/utils/__tests__/date-formatter.test.ts`

## Fase 2 – Renderer y vista pública de contrato

- `src/lib/actions/studio/business/contracts/renderer.actions.ts` (getPromiseContractData, getEventContractData: fecha evento + fecha firma con timezone)
- `src/components/promise/PublicContractView.tsx` (eventDataFallback fecha_evento; envío de signature_date al firmar)

## Fase 3 – Portal cliente y contrato

- `src/lib/actions/cliente/dashboard.actions.ts` (contract con template_id)
- `src/app/[slug]/cliente/[clientId]/[eventId]/contrato/page.tsx` (re-render con plantilla + eventData cuando hay template_id)
- `src/lib/actions/public/contracts.actions.ts` (signature_date opcional, guardar con parseDateOnlyToUtc)

## Fase 4 – Auditoría amplia (evento/contrato/pago)

- `src/lib/utils/template-parser.ts` (promise_event_date, event_date)
- `src/app/.../CotizacionAutorizadaCard.tsx` (fechas pago, signed_at, contract_signed_at_snapshot, evento.created_at)
- `src/.../DatosContratante.tsx` (fecha celebración event_date)
- `src/.../PagoItem.tsx` (Portal cliente – payment date)
- `src/.../PromisesKanban.tsx` (defined_date, interested_dates, agenda.date)
- `src/.../AgendaPopover.tsx`, `AlertsPopover.tsx`, `ClosingProcessInfoModal.tsx`
- `src/.../PendientesPageClient.tsx`, `PromisePageClient.tsx` (fecha sugerida)
- `src/.../promise-notifications.ts`, `EntregaDigitalCard.tsx`
- `src/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions.ts` (event_date en log)
- `src/.../TareasOperativasSheet.tsx`
- `src/.../ResumenEvento.tsx`, `InformacionEventoCard.tsx` (detalle evento)

## Componentes que ya usaban SSoT (sin cambios)

- getRelativeDateLabel / getRelativeDateDiffDays: EventKanbanCard, AgendaButton, ReminderButton, PromiseKanbanCard, PromiseReminderCard, EventInfoCard.
- formatDisplayDate / formatDisplayDateLong / formatDisplayDateShort: EventInfoCard, PaymentReceipt, Step2EventDetails, Step3Summary, PublicPromiseDataForm, PromiseHeroSection, PublicPromisePageHeader, EventCardInfo, ContactModal, AgendaForm, PaymentForm, OfferInfoCard, EventAgendamiento, ReminderFormModal, clientes/[contactId], PromisesKanban (display), etc.

---

# Anexo B: Usos restantes de `.toLocaleDateString()` (revisión manual)

No modificados en la auditoría; pueden ser sistema, log o UI admin. Revisar según contexto:

- admin/_lib/utils/fechas.ts, OfferStats.tsx, PlanMigrationModal.tsx, PostRenderer.tsx
- admin/campanas, admin/descuentos, finanzas/page.tsx, HistorialSheet.tsx
- PortfolioCard.tsx, promise-logs.actions.ts, useNotificationsHistory.ts, consulta-disponibilidad.actions.ts
- aviso-privacidad/page.tsx, ArchivedContent.tsx, agente/dashboard y CRM, AcquisitionStatsClient.tsx
- PromiseQuotesPanelCard.tsx, AnalisisFinancieroModal.tsx, suscripcion.actions.ts, PaymentsSection.tsx, ExpensesManager.tsx
- scheduler/page.tsx, seguimiento-detalle.actions.ts, proyeccion.actions.ts, ClientsSection.tsx
- (Detalle completo en historial de auditoría 260129.)

---

**Fases 1–4:** Completadas. Documentación y código unificados bajo esta guía maestra.
