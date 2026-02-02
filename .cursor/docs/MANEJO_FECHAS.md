# Manejo de Fechas en ZEN Platform

**Última actualización:** Enero 2026  
**Estado:** ✅ Sistema estable y funcional  
**Fuente única de verdad** para el manejo de fechas en el sistema

---

## 📋 Resumen Ejecutivo

ZEN Platform implementa un sistema de fechas **"Calendar-Only"** que garantiza que las fechas se manejen como valores absolutos de calendario independientes de la zona horaria. Todas las fechas se procesan usando métodos UTC exclusivamente para evitar problemas de desfase de días entre entornos (local vs producción).

### Estado Actual

- ✅ **Problema resuelto:** Fechas con un día de diferencia entre entornos
- ✅ **Migración completada:** Columnas `event_date` en `studio_promises` y `studio_events` son tipo `DATE` en PostgreSQL
- ✅ **Blindaje completo:** Todas las capas (datos, utilidades, lógica, visualización) usan métodos UTC
- ✅ **Áreas corregidas:** Promesas, Eventos, Agendamientos, Pagos, Scheduler, Componentes UI

---

## 🎯 Problema Original

### Descripción

Al crear una promesa desde el formulario, cuando el usuario selecciona una fecha (ej: **31 de enero**), la fecha se guardaba correctamente en desarrollo local, pero en producción (Vercel) se guardaba con **un día de diferencia** (ej: **30 de enero**).

### Causa Raíz

1. **Cliente enviaba:** `"2024-01-31"` (string sin zona horaria) ✅
2. **Servidor parseaba:** `new Date(2024, 0, 31)` creaba fecha en zona horaria LOCAL del servidor
3. **Prisma guardaba:** Convertía el Date object a TIMESTAMP en PostgreSQL
4. **PostgreSQL almacenaba:** Podía almacenar en UTC o en zona horaria del servidor
5. **Al leer:** Había conversión de zona horaria que cambiaba el día

### Diferencias entre Entornos

- **Local:** Servidor en zona horaria de México (UTC-6)
- **Vercel:** Servidor en UTC (UTC+0)
- **Resultado:** Diferencia de 6 horas causaba cambio de día

---

## ✅ Solución Implementada

### 1. Capa de Datos (Prisma & SQL)

**Schema de Prisma actualizado:**
- `studio_promises.event_date`: Cambiado de `DateTime?` a `DateTime? @db.Date`
- `studio_events.event_date`: Cambiado de `DateTime` a `DateTime @db.Date`
- `studio_agenda.date`: Mantiene `DateTime?` (puede incluir hora para agendamientos)

**Migración SQL ejecutada:**
```sql
ALTER TABLE "studio_promises" 
  ALTER COLUMN "event_date" TYPE DATE 
  USING "event_date"::date;

ALTER TABLE "studio_eventos" 
  ALTER COLUMN "event_date" TYPE DATE 
  USING "event_date"::date;
```

**Resultado:** Las fechas ahora se almacenan como tipo `DATE` en PostgreSQL, eliminando completamente la información de hora y zona horaria.

### 2. Capa de Utilidades

#### `src/lib/utils/date-only.ts`

**Funciones principales:**

```typescript
// Parsea string YYYY-MM-DD a Date usando UTC con mediodía como buffer
toUtcDateOnly(value: string | Date): Date | null

// Convierte Date a string YYYY-MM-DD usando métodos UTC
dateToDateOnlyString(date: Date | null | undefined): string | null

// Normaliza Date usando UTC con mediodía como buffer
normalizeDateToUtcDateOnly(value: Date): Date
```

**Buffer de mediodía UTC:** Usar las 12:00 PM (mediodía) UTC garantiza que, aunque el navegador sume o reste hasta 11 horas, el día calendario siga siendo el mismo.

#### `src/lib/utils/date-formatter.ts`

**Funciones de formateo:**

```typescript
// Formatea fecha usando EXCLUSIVAMENTE métodos UTC
formatDisplayDate(date: Date | string | null | undefined, options?): string

// Variante corta (día mes año)
formatDisplayDateShort(date: Date | string | null | undefined): string

// Variante larga (día de semana, día mes año)
formatDisplayDateLong(date: Date | string | null | undefined): string
```

**Características:**
- NO usa `.toLocaleDateString()` directamente
- Extrae componentes UTC (`getUTCDate`, `getUTCMonth`, `getUTCFullYear`)
- Luego formatea usando `Intl.DateTimeFormat`

#### `src/lib/actions/utils/payment-date.ts`

**Función específica para pagos:**

```typescript
// Normaliza fecha de pago usando métodos UTC
normalizePaymentDate(date: Date | string | undefined | null): Date
```

**Características:**
- Usa mediodía UTC como buffer
- Maneja strings `YYYY-MM-DD` directamente
- Extrae componentes usando métodos UTC exclusivamente

### 3. Capa de Lógica (Server Actions)

#### Promesas (`promises.actions.ts`)

**`createPromise`:**
- Usa `toUtcDateOnly()` antes de guardar `event_date`
- Normaliza `event_date` a string `YYYY-MM-DD` usando `dateToDateOnlyString()` antes de serializar al cliente

**`updatePromise`:**
- Usa `toUtcDateOnly()` antes de guardar `event_date`
- Normaliza antes de serializar

**Razón de normalización:** Cuando Next.js serializa objetos `Date` desde server actions, los convierte a strings ISO que pueden causar problemas de zona horaria en el cliente. Al normalizar a `YYYY-MM-DD` en el servidor, el cliente recibe un string puro sin información de hora/zona horaria.

#### Eventos (`events.actions.ts`)

**`actualizarFechaEvento`:**
- Usa `toUtcDateOnly()` antes de guardar `event_date`

#### Agendamientos (`agenda-unified.actions.ts`)

**`crearAgendamiento`:**
- Normaliza fecha usando `toUtcDateOnly()` antes de guardar (líneas 842-848)
- Construye metadata según tipo de agenda usando `construirMetadataAgenda()`

**`actualizarAgendamiento`:**
- Recalcula metadata automáticamente cuando cambian campos relevantes
- Normaliza fecha si se actualiza

**Tipos de agenda según metadata:**

1. **Promesa fecha evento** (`contexto: 'promise'`, `type_scheduling: null`)
   - `metadata.agenda_type = 'event_date'`
   - `metadata.sync_google = false`

2. **Promesa cita comercial** (`contexto: 'promise'`, `type_scheduling: 'presencial'|'virtual'`)
   - `metadata.agenda_type = 'commercial_appointment'`
   - `metadata.sync_google = true`
   - `metadata.google_calendar_type = 'primary'`

3. **Evento asignado** (`contexto: 'evento'`, `type_scheduling: null`, `isMainEventDate: true`)
   - `metadata.agenda_type = 'main_event_date'`
   - `metadata.sync_google = true`
   - `metadata.google_calendar_type = 'primary'`
   - `metadata.is_main_event_date = true`

4. **Evento cita** (`contexto: 'evento'`, `type_scheduling: 'presencial'|'virtual'`)
   - `metadata.agenda_type = 'event_appointment'`
   - `metadata.sync_google = true`
   - `metadata.google_calendar_type = 'primary'`

5. **Evento tarea personal** (`contexto: 'evento'`, `scheduler_task_id`)
   - `metadata.agenda_type = 'scheduler_task'`
   - `metadata.sync_google = true`
   - `metadata.google_calendar_type = 'secondary'`
   - `metadata.scheduler_task_id = 'xxx'`

#### Pagos (`payments.actions.ts`)

**`createPayment`:**
- Usa `normalizePaymentDate()` antes de guardar `payment_date`

#### Scheduler (`scheduler-actions.ts`)

**Todas las operaciones:**
- Normalizan fechas usando métodos UTC antes de comparar y guardar
- Utilidades en `coordinate-utils.ts` actualizadas para usar UTC

### 4. Capa de Visualización (Frontend)

**Componentes actualizados para usar `formatDisplayDate`:**

- `ContactEventInfoCard.tsx`
- `EventCardInfo.tsx`
- `EventKanbanCard.tsx`
- `EventCard.tsx`
- `InformacionEventoCard.tsx`
- `PaymentReceipt.tsx`
- `Step3Summary.tsx`
- `Step2EventDetails.tsx`
- `PublicPromiseDataForm.tsx`
- `ContactModal.tsx`
- `clientes/[contactId]/page.tsx`
- `PromiseKanbanCard.tsx` - Maneja `event_date` como `Date | string | null` y parsea strings `YYYY-MM-DD` directamente usando componentes UTC
- `AgendaForm.tsx` - Inicialización, selección y comparación usando UTC
- `PaymentForm.tsx` - Inicialización y formateo usando UTC

**Manejo de tipos en componentes:**
- `PromiseWithContact` acepta `event_date: Date | string | null` para manejar tanto objetos Date como strings `YYYY-MM-DD` serializados desde el servidor
- Los componentes que reciben promesas verifican el tipo y parsean strings `YYYY-MM-DD` directamente usando componentes UTC antes de crear objetos Date

**Formularios:**

**`ContactEventFormModal.tsx`:**
- `formatDateForServer`: Usa métodos UTC (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`)
- El formulario envía strings `YYYY-MM-DD` puros al servidor
- **No se convierte a Date en el cliente** antes de enviarlo al servidor

---

## 🔄 Flujo Completo

### Ejemplo: Crear Promesa con Fecha

1. **Cliente selecciona fecha:** Usuario selecciona "31 de enero" en el calendario
2. **Formateo para servidor:** `formatDateForServer` extrae componentes UTC y crea string `"2024-01-31"`
3. **Envío al servidor:** Se envía como string puro `"2024-01-31"` (sin conversión a Date)
4. **Procesamiento en servidor:** `toUtcDateOnly` crea Date usando `Date.UTC(2024, 0, 31, 12, 0, 0)` (mediodía UTC)
5. **Guardado en DB:** Prisma guarda como tipo `DATE` en PostgreSQL (solo fecha, sin hora)
6. **Lectura desde DB:** PostgreSQL devuelve solo la fecha (ej: `2024-01-31`)
7. **Serialización al cliente:** Server action normaliza a string `"2024-01-31"` antes de serializar
8. **Renderizado en UI:** `formatDisplayDate` extrae componentes UTC y formatea usando métodos UTC

### Por qué Funciona

- **Buffer de mediodía UTC:** Al usar las 12:00 PM UTC, cualquier offset de zona horaria (+/- 12 horas máximo) no puede cambiar el día calendario
- **Tipo DATE en PostgreSQL:** Elimina completamente la información de hora y zona horaria de la base de datos
- **Métodos UTC exclusivos:** Al usar `getUTCDate`, `getUTCMonth`, `getUTCFullYear` en lugar de métodos locales, garantizamos que el día calendario sea correcto independientemente de la zona horaria del navegador
- **Serialización normalizada:** Al normalizar a `YYYY-MM-DD` antes de serializar, el cliente recibe un string puro sin información de zona horaria

---

## 📚 Utilidades Disponibles

### Importar Utilidades

```typescript
// Para parsear y normalizar fechas
import { toUtcDateOnly, dateToDateOnlyString } from '@/lib/utils/date-only';

// Para formatear fechas y etiquetas relativas en UI
import { formatDisplayDate, formatDisplayDateShort, formatDisplayDateLong, getRelativeDateLabel, getRelativeDateDiffDays } from '@/lib/utils/date-formatter';

// Para fechas de pago
import { normalizePaymentDate } from '@/lib/actions/utils/payment-date';
```

### Uso Recomendado

**En Server Actions (crear/actualizar):**
```typescript
// Parsear fecha desde string
const eventDate = toUtcDateOnly(dateString);

// Normalizar antes de serializar
const normalizedDate = dateToDateOnlyString(promise.event_date);
```

**En Componentes (formatear para mostrar):**
```typescript
// Formatear fecha para mostrar
const displayDate = formatDisplayDate(promise.event_date);

// Formatear fecha corta
const shortDate = formatDisplayDateShort(promise.event_date);
```

**En Formularios (enviar al servidor):**
```typescript
// Formatear fecha para enviar al servidor (solo componentes UTC)
const formatDateForServer = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
```

---

## 📅 Fechas relativas en la UI (Hoy, Mañana, En X días)

Para etiquetas como "Hoy", "Mañana", "En 2 días", "Vencido", **"hoy" debe ser el día actual en la zona horaria del usuario**, no en UTC. Si se usa UTC para "today", en zonas con offset negativo (ej. México UTC-6) las etiquetas pueden adelantarse un día.

### Función global recomendada

**`getRelativeDateLabel(date, options?)`** en `src/lib/utils/date-formatter.ts`:
- Usa **fecha local** del usuario para "hoy" (`getFullYear()`, `getMonth()`, `getDate()`).
- Devuelve `{ text, variant }` (ej. `{ text: 'Hoy · 29 ene', variant: 'warning' }`).
- Opciones: `pastLabel` ('Vencido' | 'Vencida'), `futureVariant` ('default' | 'success').

```typescript
import { getRelativeDateLabel } from '@/lib/utils/date-formatter';

const { text, variant } = getRelativeDateLabel(reminder.reminder_date, { pastLabel: 'Vencido' });
```

### Dónde se usa fecha relativa en el sistema

| Ubicación | Uso | Estado |
|-----------|-----|--------|
| **ReminderButton** (`promises/[promiseId]/components/ReminderButton.tsx`) | Seguimiento: Hoy · 29 ene, Vencido, etc. | ✅ Usa `getRelativeDateLabel` |
| **AgendaButton** (`promises/[promiseId]/components/AgendaButton.tsx`) | Agenda: Hoy · 31 ene, Vencida, En X días | ✅ Usa `getRelativeDateLabel` |
| **PromiseReminderCard** (`pendiente/components/PromiseReminderCard.tsx`) | getRelativeDateLabel(): Vencido · X, Hoy · X, fecha | ✅ Usa `getRelativeDateLabel` |
| **EventInfoCard** (`shared/promises/EventInfoCard.tsx`) | Colores por diffDays (pasado / ≤7 / futuro) | ✅ Usa `getRelativeDateDiffDays` |
| **PromiseKanbanCard** (`components/PromiseKanbanCard.tsx`) | daysRemaining + getRelativeDateLabel().text para recordatorio | ✅ Usa `getRelativeDateDiffDays` y `getRelativeDateLabel` |
| **EventKanbanCard** (`events/components/EventKanbanCard.tsx`) | daysRemaining para colores e isToday | ✅ Usa `getRelativeDateDiffDays` |
| **formatRelativeTime** (`lib/actions/utils/formatting.ts`) | "hace X min/hora/día" (pasado) | Otro caso: tiempo transcurrido, no día calendario |
| **useRelativeTime** (`hooks/useRelativeTime.ts`) | Llama a formatRelativeTime; usado en AlertsPopover, AgendaPopover | Mismo caso que formatRelativeTime |
| **PromiseKanbanCard** (línea 722) | "Últ. interacción: {formatRelativeTime(promise.updated_at)}" | Tiempo transcurrido (pasado) |
| **EventKanbanCard** (línea 164) | "Actualizado: {formatRelativeTime(event.updated_at)}" | Tiempo transcurrido (pasado) |
| **PostRenderer** (`components/posts/PostRenderer.tsx`) | Hoy, Ayer, Hace X días (pasado) | Lógica local con diffDays |
| **PostFeedCard** (`components/profile/sections/PostFeedCard.tsx`) | Xd, Xm, Xy (pasado) | Lógica local |
| **CurrentPlanCard** (`suscripcion/components/CurrentPlanCard.tsx`) | diffDays para días hasta renovación | Solo número, no etiqueta "Hoy" |
| **ReminderFormModal** (`shared/reminders/ReminderFormModal.tsx`) | Botón "En 3 días" (label fijo, no cálculo) | N/A |

### Resumen

- **Unificados con fecha local (getRelativeDateLabel / getRelativeDateDiffDays):** ReminderButton, AgendaButton, PromiseReminderCard, EventInfoCard, PromiseKanbanCard, EventKanbanCard.
- **Utilidad adicional:** `getRelativeDateDiffDays(date)` en `date-formatter.ts` devuelve días desde hoy (local) hasta la fecha; usado cuando solo se necesita el número (colores, isToday).
- **Caso distinto (pasado en tiempo real):** formatRelativeTime, useRelativeTime, PromiseKanbanCard "Últ. interacción", EventKanbanCard "Actualizado" — no necesitan `getRelativeDateLabel`.

---

## ✅ Checklist de Verificación

### Áreas Corregidas

- [x] **Pagos** ✅
  - [x] `normalizePaymentDate()` actualizado para usar métodos UTC
  - [x] Función duplicada eliminada en `cotizaciones-cierre.actions.ts`
  - [x] `PaymentForm.tsx` actualizado para usar UTC
  - [x] `PaymentReceipt.tsx` usa `formatDisplayDate`

- [x] **Agendamientos** ✅
  - [x] `crearAgendamiento()` normaliza fecha antes de guardar
  - [x] `actualizarAgendamiento()` normaliza fecha al actualizar
  - [x] `AgendaForm.tsx` actualizado para usar UTC
  - [x] Metadata construida correctamente según tipo

- [x] **Scheduler** ✅
  - [x] `scheduler-actions.ts` normaliza fechas usando UTC
  - [x] `events.actions.ts` cálculos de scheduler usando UTC
  - [x] `coordinate-utils.ts` funciones normalizadas con UTC
  - [x] Componentes del timeline actualizados para usar UTC

- [x] **Promesas y Eventos** ✅
  - [x] `createPromise()` usa `toUtcDateOnly()` y normaliza antes de serializar
  - [x] `updatePromise()` usa `toUtcDateOnly()` y normaliza antes de serializar
  - [x] `actualizarFechaEvento()` usa `toUtcDateOnly()`
  - [x] Componentes UI actualizados para usar `formatDisplayDate`

- [x] **Componentes de UI** ✅
  - [x] Todos los componentes principales actualizados
  - [x] Manejo de tipos `Date | string | null` implementado
  - [x] Parseo de strings `YYYY-MM-DD` usando UTC

---

## 🚨 Mejores Prácticas

### ✅ SIEMPRE HACER

1. **Usar métodos UTC exclusivamente:**
   - `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`
   - `Date.UTC()` para crear fechas
   - Mediodía UTC como buffer (12:00 PM)

2. **Normalizar antes de guardar:**
   ```typescript
   const normalizedDate = toUtcDateOnly(dateString);
   await prisma.studio_promises.create({
     data: { event_date: normalizedDate }
   });
   ```

3. **Normalizar antes de serializar:**
   ```typescript
   const promise = await prisma.studio_promises.findUnique(...);
   return {
     ...promise,
     event_date: dateToDateOnlyString(promise.event_date)
   };
   ```

4. **Formatear en UI usando utilidades:**
   ```typescript
   formatDisplayDate(promise.event_date)
   ```

5. **Enviar strings YYYY-MM-DD desde formularios:**
   ```typescript
   const formatDateForServer = (date: Date): string => {
     const year = date.getUTCFullYear();
     const month = String(date.getUTCMonth() + 1).padStart(2, "0");
     const day = String(date.getUTCDate()).padStart(2, "0");
     return `${year}-${month}-${day}`;
   };
   ```

### ❌ NUNCA HACER

1. **NO usar métodos locales:**
   - ❌ `getFullYear()`, `getMonth()`, `getDate()`
   - ❌ `setHours(0, 0, 0, 0)` sin normalización UTC
   - ❌ `toLocaleDateString()` directamente sin extraer componentes UTC primero

2. **NO serializar Date objects directamente:**
   - ❌ Devolver `Date` objects desde server actions sin normalizar
   - ❌ Usar `JSON.stringify()` en Date objects sin normalizar

3. **NO parsear strings sin normalización:**
   - ❌ `new Date(dateString)` sin usar `toUtcDateOnly()`
   - ❌ Comparar fechas sin normalizar primero

---

## 📁 Archivos Clave

### Utilidades
- `src/lib/utils/date-only.ts` - Funciones de parseo y normalización UTC
- `src/lib/utils/date-formatter.ts` - Funciones de formateo UTC
- `src/lib/actions/utils/payment-date.ts` - Normalización de fechas de pago

### Server Actions
- `src/lib/actions/studio/commercial/promises/promises.actions.ts` - CRUD de promesas
- `src/lib/actions/studio/business/events/events.actions.ts` - CRUD de eventos
- `src/lib/actions/shared/agenda-unified.actions.ts` - CRUD de agendamientos
- `src/lib/actions/studio/business/events/payments.actions.ts` - CRUD de pagos
- `src/lib/actions/studio/business/events/scheduler-actions.ts` - Operaciones de scheduler

### Schema y Migraciones
- `prisma/schema.prisma` - Schema con `@db.Date` para `event_date`
- `supabase/migrations/convert_event_date_to_date.sql` - Migración a tipo DATE

### Componentes UI Principales
- `src/components/shared/contact-info/ContactEventFormModal.tsx` - Formulario de creación
- `src/app/[slug]/studio/commercial/promises/components/PromiseKanbanCard.tsx` - Card de promesa
- `src/components/shared/agenda/AgendaForm.tsx` - Formulario de agendamiento
- `src/components/shared/payments/PaymentForm.tsx` - Formulario de pago

---

## 🧪 Testing Recomendado

1. ✅ Crear promesa con fecha 31 de enero en producción
2. ✅ Verificar que se guarde como 31 de enero en la base de datos
3. ✅ Verificar que se muestre como 31 de enero en la UI
4. ✅ Probar en diferentes zonas horarias (México UTC-6, UTC, etc.)
5. ✅ Verificar que las fechas existentes se migraron correctamente a tipo DATE
6. ✅ Verificar que `PromiseKanbanCard` muestra las fechas correctamente sin desfase de 1 día
7. ✅ Verificar que las fechas se serializan correctamente desde server actions como strings `YYYY-MM-DD`

---

## 📊 Resumen de Archivos Modificados

### Utilidades (3 archivos)
1. ✅ `src/lib/utils/date-only.ts` - Actualizado con buffer UTC mediodía y función `dateToDateOnlyString()`
2. ✅ `src/lib/utils/date-formatter.ts` - Nueva utilidad creada
3. ✅ `src/lib/actions/utils/payment-date.ts` - `normalizePaymentDate()` actualizado

### Schema y Migración (2 archivos)
4. ✅ `prisma/schema.prisma` - Actualizado con `@db.Date`
5. ✅ `supabase/migrations/convert_event_date_to_date.sql` - Migración SQL creada

### Server Actions (5 archivos)
6. ✅ `src/lib/actions/studio/commercial/promises/promises.actions.ts` - Normalización en crear/actualizar
7. ✅ `src/lib/actions/studio/business/events/events.actions.ts` - Normalización en actualizar fecha
8. ✅ `src/lib/actions/shared/agenda-unified.actions.ts` - Normalización en crear/actualizar
9. ✅ `src/lib/actions/studio/business/events/payments.actions.ts` - Usa `normalizePaymentDate()`
10. ✅ `src/lib/actions/studio/business/events/scheduler-actions.ts` - Normalización UTC

### Componentes UI (20+ archivos)
- Todos los componentes principales actualizados para usar `formatDisplayDate` y métodos UTC

---

## 📝 Notas Adicionales

1. **Scheduler:** Las fechas del scheduler pueden requerir hora (no solo fecha), por lo que se mantiene `DateTime` pero se normaliza correctamente usando UTC
2. **Agendamientos:** Si incluyen hora (`time` field), se mantiene `DateTime` pero se normaliza correctamente usando UTC
3. **Pagos:** Generalmente solo necesitan fecha, ideal para `@db.Date` (aunque actualmente usan `DateTime` normalizado)
4. **Metadata de agenda:** Se construye automáticamente según el contexto y tipo de agendamiento usando `construirMetadataAgenda()`

---

**Estado:** ✅ Sistema estable y funcional  
**Última revisión:** Enero 2026
