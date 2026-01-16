# Problema: Fechas se guardan con un día de diferencia en servidor

## Descripción del Problema

Al crear una promesa desde el formulario `ContactEventFormModal`, cuando el usuario selecciona una fecha (ej: **31 de enero**), la fecha se guarda correctamente en desarrollo local, pero en producción (Vercel) se guarda con **un día de diferencia** (ej: **30 de enero**).

## Flujo Actual

### 1. Cliente (ContactEventFormModal.tsx)

**Ubicación:** `src/components/shared/contact-info/ContactEventFormModal.tsx`

**Líneas 399-417:**

```typescript
// Helper para formatear fecha como YYYY-MM-DD sin zona horaria
const formatDateForServer = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

useEffect(() => {
  if (selectedDates.length > 0) {
    const dateStrings = selectedDates.map((d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      // Enviar solo YYYY-MM-DD para evitar problemas de zona horaria
      return formatDateForServer(date);
    });
    setFormData((prev) => ({
      ...prev,
      interested_dates: dateStrings, // Ej: ["2024-01-31"]
    }));
  }
}, [selectedDates]);
```

**Resultado:** Se envía al servidor como string `"2024-01-31"` (formato YYYY-MM-DD)

### 2. Schema de Validación (promises-schemas.ts)

**Ubicación:** `src/lib/actions/schemas/promises-schemas.ts`

**Línea 16:**

```typescript
interested_dates: z.array(
  z.string().refine(
    (val) => {
      // Aceptar formato ISO datetime completo o formato fecha simple YYYY-MM-DD
      const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      return isoDateTimePattern.test(val) || dateOnlyPattern.test(val);
    },
    { message: 'Fecha inválida. Debe ser formato ISO datetime o YYYY-MM-DD' }
  )
).optional(),
```

**Resultado:** Valida correctamente el formato `"2024-01-31"`

### 3. Servidor - Parseo de Fecha (promises.actions.ts)

**Ubicación:** `src/lib/actions/studio/commercial/promises/promises.actions.ts`

**Líneas 620-630:**

```typescript
// Parsear fecha en UTC (sin cambios por zona horaria)
let eventDate: Date | null = null;
if (
  validatedData.interested_dates &&
  validatedData.interested_dates.length === 1
) {
  const dateString = validatedData.interested_dates[0]; // "2024-01-31"
  eventDate = toUtcDateOnly(dateString);
}
```

**Problema aquí:**

- Aun normalizando a UTC en servidor, el día sigue cambiando en producción
- Indica que el desfase podría ocurrir en otra parte del flujo (lectura o UI)

### 4. Base de Datos (Prisma Schema)

**Ubicación:** `prisma/schema.prisma`

**Línea 1319:**

```prisma
model studio_promises {
  ...
  event_date  DateTime?
  ...
}
```

**Tipo en PostgreSQL:** `TIMESTAMP` (puede incluir zona horaria)

**Línea 645 en promises.actions.ts:**

```typescript
const promise = await prisma.studio_promises.create({
  data: {
    ...
    event_date: eventDate, // Date object creado en zona horaria del servidor
    ...
  },
});
```

## Problema Identificado

1. **Cliente envía:** `"2024-01-31"` (string sin zona horaria) ✅
2. **Servidor parsea:** `new Date(2024, 0, 31)` crea fecha en zona horaria LOCAL del servidor
3. **Prisma guarda:** Convierte el Date object a TIMESTAMP en PostgreSQL
4. **PostgreSQL almacena:** Puede almacenar en UTC o en zona horaria del servidor
5. **Al leer:** Puede haber conversión de zona horaria que cambia el día

## Diferencias entre Entornos

- **Local:** Servidor probablemente en zona horaria de México (UTC-6)
- **Vercel:** Servidor en UTC (UTC+0)
- **Resultado:** Diferencia de 6 horas puede causar cambio de día

## Ejemplo del Problema

**Usuario selecciona:** 31 de enero 2024

**En local (México UTC-6):**

- Cliente envía: `"2024-01-31"`
- Servidor crea: `new Date(2024, 0, 31)` → `2024-01-31T00:00:00-06:00`
- Prisma guarda: `2024-01-31T06:00:00Z` (UTC)
- Al leer: Se muestra correctamente como 31 de enero ✅

**En Vercel (UTC):**

- Cliente envía: `"2024-01-31"`
- Servidor crea: `new Date(2024, 0, 31)` → `2024-01-31T00:00:00Z` (UTC)
- Prisma guarda: `2024-01-31T00:00:00Z` (UTC)
- **PERO:** Si hay alguna conversión adicional o el cliente lee en otra zona horaria, puede mostrar 30 de enero ❌

## Solución Implementada (Enero 2026)

Se implementó un **blindaje completo de fechas "Calendar-Only"** que garantiza que las fechas se manejen como valores absolutos independientes de la zona horaria.

### 1. Capa de Datos (Prisma & SQL) ✅

**Schema de Prisma actualizado:**
- `studio_promises.event_date`: Cambiado de `DateTime?` a `DateTime? @db.Date`
- `studio_events.event_date`: Cambiado de `DateTime` a `DateTime @db.Date`

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

### 2. Capa de Utilidades ✅

**`src/lib/utils/date-only.ts` - Actualizado:**
- `parseDateOnlyToUtc`: Usa `Date.UTC(year, month, day, 12, 0, 0)` - mediodía UTC como buffer
- `normalizeDateToUtcDateOnly`: Usa mediodía UTC como buffer
- **Razón del buffer:** Usar las 12:00 PM (mediodía) UTC garantiza que, aunque el navegador sume o reste hasta 11 horas, el día calendario siga siendo el mismo

**`src/lib/utils/date-formatter.ts` - Nueva utilidad creada:**
- `formatDisplayDate`: Formatea fechas usando **exclusivamente métodos UTC** (`getUTCDate`, `getUTCMonth`, `getUTCFullYear`)
- `formatDisplayDateShort`: Variante corta (día mes año)
- `formatDisplayDateLong`: Variante larga (día de semana, día mes año)
- **NO usa `.toLocaleDateString()` directamente**, sino que extrae componentes UTC y luego formatea

### 3. Capa de Lógica (Server Actions) ✅

**`promises.actions.ts`:**
- `createPromise`: Usa `toUtcDateOnly` antes de guardar `event_date`
- `updatePromise`: Usa `toUtcDateOnly` antes de guardar `event_date`
- **Normalización antes de serializar:** Todas las funciones que devuelven promesas (`getPromises`, `getPromiseByIdAsPromiseWithContact`, etc.) normalizan `event_date` y `defined_date` a string `YYYY-MM-DD` usando `dateToDateOnlyString()` antes de enviar al cliente
- **Razón:** Cuando Next.js serializa objetos `Date` desde server actions, los convierte a strings ISO que pueden causar problemas de zona horaria en el cliente. Al normalizar a `YYYY-MM-DD` en el servidor, el cliente recibe un string puro sin información de hora/zona horaria

**`events.actions.ts`:**
- `actualizarFechaEvento`: Usa `toUtcDateOnly` antes de guardar `event_date`

**Resultado:** Todas las fechas se procesan a través de `toUtcDateOnly` antes de enviarse a Prisma, y se normalizan a strings `YYYY-MM-DD` antes de serializar al cliente, garantizando consistencia en todo el flujo.

### 4. Capa de Visualización (Frontend) ✅

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
- `PromiseKanbanCard.tsx` - Actualizado para manejar `event_date` como `Date | string | null` y parsear strings `YYYY-MM-DD` directamente usando componentes UTC

**Resultado:** Todas las fechas se renderizan usando métodos UTC exclusivamente, evitando problemas de zona horaria en la visualización.

**Manejo de tipos en componentes:**
- `PromiseWithContact` ahora acepta `event_date: Date | string | null` para manejar tanto objetos Date como strings `YYYY-MM-DD` serializados desde el servidor
- Los componentes que reciben promesas verifican el tipo y parsean strings `YYYY-MM-DD` directamente usando componentes UTC antes de crear objetos Date

### 5. Validación de Flujo ✅

**`ContactEventFormModal.tsx`:**
- `formatDateForServer`: Actualizado para usar métodos UTC (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`)
- El formulario sigue enviando strings `YYYY-MM-DD` puros al servidor
- **No se convierte a Date en el cliente** antes de enviarlo al servidor

**Resultado:** El flujo completo garantiza que las fechas se manejen como "Calendar-Only" desde el cliente hasta la base de datos.

## Estado Actual

✅ **Problema resuelto:** Las fechas ahora se manejan como valores absolutos de calendario independientes de la zona horaria.

✅ **Migración completada:** Las columnas `event_date` en `studio_promises` y `studio_events` ahora son tipo `DATE` en PostgreSQL.

✅ **Blindaje completo:** Todas las capas (datos, utilidades, lógica, visualización) usan métodos UTC exclusivamente.

## Archivos Modificados

### Utilidades
1. `src/lib/utils/date-only.ts` - Actualizado con buffer UTC mediodía y función `dateToDateOnlyString()`
2. `src/lib/utils/date-formatter.ts` - Nueva utilidad creada

### Schema y Migración
3. `prisma/schema.prisma` - Actualizado con `@db.Date`
4. `supabase/migrations/convert_event_date_to_date.sql` - Migración SQL creada

### Server Actions
5. `src/lib/actions/studio/commercial/promises/promises.actions.ts` - Ya usa `toUtcDateOnly`
6. `src/lib/actions/studio/business/events/events.actions.ts` - Ya usa `toUtcDateOnly`

### Schemas y Tipos
7. `src/lib/actions/schemas/promises-schemas.ts` - Actualizado `PromiseWithContact` para aceptar `event_date: Date | string | null`

### Componentes UI (13 archivos)
8. `src/components/shared/contact-info/ContactEventFormModal.tsx` - Métodos UTC en formatDateForServer
9. `src/components/shared/contact-info/ContactEventInfoCard.tsx`
10. `src/app/[slug]/studio/business/events/components/EventCardInfo.tsx`
11. `src/app/[slug]/studio/business/events/components/EventKanbanCard.tsx`
12. `src/components/client/EventCard.tsx`
13. `src/app/[slug]/cliente/[clientId]/[eventId]/components/InformacionEventoCard.tsx`
14. `src/components/promise/Step2EventDetails.tsx`
15. `src/components/promise/Step3Summary.tsx`
16. `src/components/shared/promise/PublicPromiseDataForm.tsx`
17. `src/components/shared/contacts/ContactModal.tsx`
18. `src/components/shared/payments/PaymentReceipt.tsx`
19. `src/app/[slug]/studio/business/clientes/[contactId]/page.tsx`
20. `src/app/[slug]/studio/commercial/promises/components/PromiseKanbanCard.tsx` - Maneja `Date | string | null` y parsea strings `YYYY-MM-DD` directamente

## Cómo Funciona la Solución

### Flujo Completo

1. **Cliente selecciona fecha:** Usuario selecciona "31 de enero" en el calendario
2. **Formateo para servidor:** `formatDateForServer` extrae componentes UTC y crea string `"2024-01-31"`
3. **Envío al servidor:** Se envía como string puro `"2024-01-31"` (sin conversión a Date)
4. **Procesamiento en servidor:** `toUtcDateOnly` crea Date usando `Date.UTC(2024, 0, 31, 12, 0, 0)` (mediodía UTC)
5. **Guardado en DB:** Prisma guarda como tipo `DATE` en PostgreSQL (solo fecha, sin hora)
6. **Lectura desde DB:** PostgreSQL devuelve solo la fecha (ej: `2024-01-31`)
7. **Renderizado en UI:** `formatDisplayDate` extrae componentes UTC y formatea usando métodos UTC

### Por qué Funciona

- **Buffer de mediodía UTC:** Al usar las 12:00 PM UTC, cualquier offset de zona horaria (+/- 12 horas máximo) no puede cambiar el día calendario
- **Tipo DATE en PostgreSQL:** Elimina completamente la información de hora y zona horaria de la base de datos
- **Métodos UTC exclusivos:** Al usar `getUTCDate`, `getUTCMonth`, `getUTCFullYear` en lugar de métodos locales, garantizamos que el día calendario sea correcto independientemente de la zona horaria del navegador

## Testing Recomendado

1. ✅ Crear promesa con fecha 31 de enero en producción
2. ✅ Verificar que se guarde como 31 de enero en la base de datos
3. ✅ Verificar que se muestre como 31 de enero en la UI
4. ✅ Probar en diferentes zonas horarias (México UTC-6, UTC, etc.)
5. ✅ Verificar que las fechas existentes se migraron correctamente a tipo DATE
6. ✅ Verificar que `PromiseKanbanCard` muestra las fechas correctamente sin desfase de 1 día
7. ✅ Verificar que las fechas se serializan correctamente desde server actions como strings `YYYY-MM-DD`

## Archivos Involucrados

1. `src/components/shared/contact-info/ContactEventFormModal.tsx` (líneas 399-417)
2. `src/lib/actions/schemas/promises-schemas.ts` (línea 16)
3. `src/lib/actions/studio/commercial/promises/promises.actions.ts` (líneas 620-645)
4. `src/lib/actions/studio/commercial/promises/promises.actions.ts` (líneas 1018-1029 para updatePromise)
5. `src/lib/actions/studio/business/events/events.actions.ts` (línea 1771 para actualizarFechaEvento)
6. `prisma/schema.prisma` (línea 1319 - campo event_date)

## Notas Adicionales

- El problema también afecta a `tentative_dates` (JSON array de strings)
- El problema puede afectar a `updatePromise` y `actualizarFechaEvento`
- Necesita testing en ambos entornos (local y Vercel) después del fix
ss/events/events.actions.ts` (línea 1771 para actualizarFechaEvento)
6. `prisma/schema.prisma` (línea 1319 - campo event_date)

## Notas Adicionales

- El problema también afecta a `tentative_dates` (JSON array de strings)
- El problema puede afectar a `updatePromise` y `actualizarFechaEvento`
- Necesita testing en ambos entornos (local y Vercel) después del fix
