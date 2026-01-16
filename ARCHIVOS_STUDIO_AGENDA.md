# Archivos que consumen `studio_agenda`

## Resumen de operaciones

### SELECT (findMany, findFirst, findUnique)

1. **`src/lib/actions/shared/agenda-unified.actions.ts`**
   - `obtenerAgendaUnificada()` - línea 153: `findMany` con filtros por contexto/fecha
   - `obtenerAgendaUnificada()` - línea 331: `findMany` para obtener agendas por promise
   - `obtenerAgendamientoPorId()` - línea 592: `findFirst` por ID
   - `obtenerAgendamientosPorEvento()` - línea 795: `findMany` por evento_id
   - `eliminarAgendamiento()` - línea 1489: `findFirst` antes de eliminar
   - `obtenerAgendamientosPorPromise()` - línea 1384: `findMany` por promise_id

2. **`src/lib/actions/studio/business/events/events.actions.ts`**
   - `cancelarEvento()` - línea 1518: `findFirst` para obtener agendamiento antes de cancelar
   - `actualizarFechaEvento()` - línea 2024: `deleteMany` antes de crear nuevo

3. **`src/lib/notifications/studio/helpers/agenda-notifications.ts`**
   - `findUnique` - línea 21: obtener agenda para notificaciones

### INSERT (create)

1. **`src/lib/actions/shared/agenda-unified.actions.ts`**
   - `crearAgendamiento()` - línea 963: `create` con metadata según tipo
   - ✅ **ACTUALIZADO**: Usa `construirMetadataAgenda()` helper

2. **`src/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions.ts`**
   - `autorizarYCrearEvento()` - línea 1682: `create` al autorizar evento
   - ✅ **ACTUALIZADO**: Incluye metadata con `agenda_type: 'main_event_date'`

3. **`src/lib/actions/studio/business/events/events.actions.ts`**
   - `actualizarFechaEvento()` - línea 2051: `create` al actualizar fecha
   - ✅ **ACTUALIZADO**: Incluye metadata según tipo

4. **`src/lib/actions/shared/agenda-cleanup.actions.ts`**
   - `limpiarDuplicadosAgenda()` - línea 66: `INSERT` raw SQL para crear agendas faltantes
   - ⚠️ **REVISAR**: Usa raw SQL, necesita incluir metadata

### UPDATE

1. **`src/lib/actions/shared/agenda-unified.actions.ts`**
   - `actualizarAgendamiento()` - línea 1210: `update` con validación de metadata
   - ⚠️ **REVISAR**: Debe mantener/actualizar metadata según cambios

### DELETE

1. **`src/lib/actions/shared/agenda-unified.actions.ts`**
   - `eliminarAgendamiento()` - línea 1507: `delete` por ID

2. **`src/lib/actions/studio/commercial/promises/promises.actions.ts`**
   - `deletePromise()` - línea 1638: `deleteMany` por promise_id
   - `deleteTestPromises()` - línea 1727: `deleteMany` para promesas de prueba

3. **`src/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions.ts`**
   - `autorizarYCrearEvento()` - línea 1650: `deleteMany` citas comerciales (contexto: 'promise')
   - `autorizarYCrearEvento()` - línea 1660: `deleteMany` agendas existentes del evento
   - `autorizarYCrearEvento()` - línea 1696: `deleteMany` citas comerciales si no hay fecha

4. **`src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts`**
   - `autorizarCotizacion()` - línea 1887: `deleteMany` citas comerciales

5. **`src/lib/actions/studio/business/events/events.actions.ts`**
   - `cancelarEvento()` - línea 1684: `delete` agendamiento al cancelar
   - `actualizarFechaEvento()` - línea 2024: `deleteMany` agendas existentes antes de crear nueva

6. **`src/lib/actions/shared/agenda-cleanup.actions.ts`**
   - `limpiarDuplicadosAgenda()` - línea 30: `DELETE` raw SQL para agendas desalineadas
   - `limpiarDuplicadosAgenda()` - línea 56: `DELETE` raw SQL para duplicados

## Checklist de verificación

### ✅ Completado
- [x] `crearAgendamiento()` - Usa helper `construirMetadataAgenda()`
- [x] `autorizarYCrearEvento()` - Incluye metadata al crear agenda de evento
- [x] `actualizarFechaEvento()` - Incluye metadata al actualizar fecha

### ✅ Completado adicional
- [x] `actualizarAgendamiento()` - Recalcula metadata automáticamente cuando cambian campos relevantes

### ⚠️ Pendiente de revisar (baja prioridad)
- [ ] `limpiarDuplicadosAgenda()` - Raw SQL necesita incluir metadata en INSERTs (función de limpieza, menos crítica)
- [ ] `obtenerAgendaUnificada()` - Refactorizar para usar SOLO `studio_agenda` (eliminar consultas a `studio_promises`) - **NOTA**: Actualmente mezcla `studio_agenda` con `studio_promises.tentative_dates/event_date` para mostrar fechas pendientes sin agendamiento. Esto puede mantenerse como está o migrarse a crear entradas en `studio_agenda` automáticamente.

### 📋 Archivos que solo leen (no requieren cambios)
- `obtenerAgendamientoPorId()` - Solo lectura
- `obtenerAgendamientosPorEvento()` - Solo lectura
- `obtenerAgendamientosPorPromise()` - Solo lectura
- `cancelarEvento()` - Solo lectura antes de eliminar
- `deletePromise()` - Solo elimina, no crea
- `deleteTestPromises()` - Solo elimina, no crea
- `agenda-notifications.ts` - Solo lectura

## Estructura de metadata esperada

```typescript
{
  agenda_type: 'event_date' | 'commercial_appointment' | 'main_event_date' | 'event_appointment' | 'scheduler_task',
  sync_google: boolean,
  google_calendar_type?: 'primary' | 'secondary',
  is_main_event_date?: boolean,
  scheduler_task_id?: string
}
```

## Tipos de agenda según contexto

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
