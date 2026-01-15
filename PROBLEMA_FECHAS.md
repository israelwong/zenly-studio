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

## Fix Aplicado (enero 2026)

- Se agregó `toUtcDateOnly` en `src/lib/utils/date-only.ts`
- Se normaliza a UTC en:
  - `createPromise` y `updatePromise` (event_date)
  - `actualizarFechaEvento`

**Estado:** El problema persiste en producción.

## Posibles Causas Pendientes

1. **Lectura y render en cliente**
   - Se está usando `new Date(dbDate)` y luego `getDate()` en local
   - El valor llega como `Date` con zona UTC y se presenta en zona local
2. **Tipo de columna en DB**
   - `event_date` es `TIMESTAMP` (sin zona), posible ambigüedad en conversiones
3. **Serialización en API/Next**
   - En el paso server -> client se serializa a ISO y se reinterpreta en local

## Próximos Pasos Recomendados

- Validar cómo se renderiza `event_date` en UI (buscar `new Date(event_date)` y `toLocaleDateString`)
- Probar lectura en Vercel con `console.log` de:
  - valor crudo en DB
  - valor en server actions
  - valor en cliente
- Considerar migrar `event_date` a tipo `DATE` si es fecha-only

## Posibles Soluciones

### Opción 1: Usar Date-only en PostgreSQL

- Cambiar el tipo de `DateTime` a un tipo de solo fecha (si PostgreSQL lo soporta)
- O usar `DATE` en lugar de `TIMESTAMP`

### Opción 2: Guardar como string YYYY-MM-DD

- Cambiar el campo en Prisma a `String` en lugar de `DateTime`
- Guardar directamente el string `"2024-01-31"`
- Parsear solo cuando sea necesario para cálculos

### Opción 3: Normalizar siempre a UTC medianoche

- Asegurar que siempre se guarde como `YYYY-MM-DD 00:00:00 UTC`
- Usar `Date.UTC()` para crear la fecha

### Opción 4: Usar biblioteca de manejo de fechas

- Usar `date-fns` o `dayjs` con configuración explícita de zona horaria
- Normalizar todas las fechas a UTC antes de guardar

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
