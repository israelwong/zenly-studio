# Análisis del Scheduler de Eventos - ZEN Platform

## 📋 Resumen Ejecutivo

El **Scheduler** es una herramienta de planificación tipo Gantt que permite asignar tareas a items de cotización dentro de un rango de fechas configurable. Las tareas se crean directamente desde los items de cotizaciones aprobadas y se pueden gestionar mediante drag & drop, asignación de personal y seguimiento de progreso.

### Funcionalidades Principales

- ✅ **Asignación de tareas a items de cotización** (1:1 - un item = una tarea)
- ✅ **Gestión de rangos de fechas** (configuración flexible del timeline)
- ✅ **Drag & Drop** para mover y redimensionar tareas
- ✅ **Asignación de personal** a tareas con generación automática de nómina
- ✅ **Seguimiento de progreso** (completadas, pendientes, atrasadas, en proceso)
- ✅ **Sincronización con Google Calendar** (background, no bloqueante)
- ✅ **Validación de conflictos** al cambiar rangos de fechas

---

## 🏗️ Arquitectura Técnica

### Estructura de Componentes

```
page.tsx (Entry Point)
└── SchedulerWrapper
    ├── SchedulerDateRangeConfig (Configuración de rango)
    ├── DateRangeConflictModal (Validación de conflictos)
    └── EventSchedulerView
        └── EventScheduler
            └── SchedulerPanel
                ├── SchedulerSidebar (Lista de items)
                └── SchedulerTimeline
                    └── SchedulerRow (por item)
                        └── TaskBar (tarea draggable)
                            └── TaskBarContextMenu (menú contextual)
```

### Flujo de Datos

1. **Carga inicial**: `page.tsx` → `obtenerEventoDetalle()` → `SchedulerWrapper`
2. **Filtrado**: Solo cotizaciones con status `autorizada`, `aprobada`, `approved` o `seleccionada`
3. **Agrupación**: Items agrupados por sección/categoría del catálogo (o snapshot si no hay catálogo)
4. **Renderizado**: Cada item puede tener máximo 1 tarea (`scheduler_task`)

---

## 📅 Asignación de Tareas y Fechas

### Creación de Tareas

**Método 1: Click en slot vacío**
- Usuario hace click en una fila sin tarea asignada
- Se calcula la fecha desde la posición X del click
- Se crea tarea con duración de 1 día por defecto
- **Action**: `crearSchedulerTask()`

**Método 2: Desde código (no disponible en UI actual)**
- Directamente mediante `crearSchedulerTask()` con parámetros completos

### Asociación de Fechas

**Rango de Fechas (DateRange)**
- Configurado en `SchedulerDateRangeConfig`
- Guardado en `studio_scheduler_event_instances` (start_date, end_date)
- Por defecto: 7 días antes del evento + 30 días después
- **Action**: `actualizarRangoScheduler()`

**Fechas de Tareas**
- `start_date`: Fecha de inicio de la tarea
- `end_date`: Fecha de fin de la tarea
- `duration_days`: Calculado automáticamente desde start/end
- Almacenadas en `studio_scheduler_event_tasks`

### Modificación de Fechas

**Drag & Drop (Mover tarea)**
- Usuario arrastra la `TaskBar` horizontalmente
- Se calcula nueva `start_date` desde posición X
- Se mantiene la duración original
- **Action**: `actualizarSchedulerTaskFechas()`

**Resize (Redimensionar tarea)**
- Usuario redimensiona desde bordes izquierdo/derecho
- Grid snap: 60px = 1 día (mínimo 1 día)
- Se actualizan `start_date` y `end_date`
- **Action**: `actualizarSchedulerTaskFechas()`

---

## 🧩 Componentes Principales

### 1. `SchedulerWrapper`

**Responsabilidades:**
- Gestionar estado del `dateRange` localmente
- Calcular estadísticas de tareas (progreso, estados)
- Validar conflictos al cambiar rango de fechas
- Renderizar barra de estadísticas y configuración

**Props:**
```typescript
{
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  initialDateRange?: DateRange;
  onDataChange?: (data: EventoDetalle) => void;
  cotizacionId?: string; // Filtro opcional por cotización
}
```

**Estadísticas calculadas:**
- `completed`: Tareas completadas
- `total`: Total de items
- `percentage`: Porcentaje de completitud
- `delayed`: Tareas atrasadas (end_date < hoy)
- `inProcess`: Tareas en proceso (hoy entre start_date y end_date)
- `pending`: Tareas programadas (start_date > hoy)
- `unassigned`: Items sin tarea asignada
- `withoutCrew`: Tareas activas sin personal asignado

### 2. `EventScheduler`

**Responsabilidades:**
- Construir `itemsMap` desde cotizaciones aprobadas
- Agrupar items por sección/categoría (catálogo o snapshot)
- Manejar callbacks de CRUD de tareas
- Gestionar modales de asignación de personal
- Actualización optimista del estado local

**Handlers principales:**
- `handleTaskCreate`: Crear tarea desde click en slot
- `handleTaskUpdate`: Actualizar fechas (drag/resize)
- `handleTaskDelete`: Eliminar tarea (vaciar slot)
- `handleTaskToggleComplete`: Marcar como completada/pendiente
- `handleAssignAndComplete`: Asignar personal y completar

**Lógica de completado:**
1. Si tiene personal asignado → Verificar tipo de salario (fijo/variable)
2. Si tiene costo y no tiene personal → Mostrar modal de asignación
3. Si `has_crew === false` → Completar directamente sin pago
4. Si se completa → Generar nómina automáticamente (a menos que `skipPayroll = true`)

### 3. `SchedulerPanel`

**Responsabilidades:**
- Contenedor principal con scroll unificado
- Sidebar sticky (360px) + Timeline flexible
- Sincronización de scroll entre sidebar y timeline

**Estructura:**
```tsx
<div className="flex h-[calc(100vh-300px)]">
  <SchedulerSidebar /> {/* sticky left */}
  <SchedulerTimeline /> {/* flex-1 */}
</div>
```

### 4. `SchedulerRow`

**Responsabilidades:**
- Renderizar una fila por item de cotización
- Detectar clicks en slots vacíos para crear tareas
- Renderizar `TaskBar` si existe tarea
- Grid visual de 60px por día

**Lógica de creación:**
```typescript
// Click en slot vacío
const clickedDate = getDateFromPosition(clickX, dateRange);
onTaskCreate(itemId, catalogItemId, itemName, clickedDate);
```

### 5. `TaskBar`

**Responsabilidades:**
- Componente draggable/resizable usando `react-rnd`
- Visualización de estado (color según status + crew)
- Manejo de drag & drop con grid snap (60px)
- Actualización optimista local antes de persistir

**Props clave:**
```typescript
{
  taskId: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  hasCrewMember?: boolean;
  onUpdate: (taskId, startDate, endDate) => Promise<void>;
  onDelete?: (taskId) => Promise<void>;
  onToggleComplete?: (taskId, isCompleted) => Promise<void>;
}
```

**Validaciones de drag/resize:**
- Threshold de movimiento: 5px (drag), 10px (resize)
- Validación de rango: `isDateInRange(date, dateRange)`
- Grid snap: 60px = 1 día
- Ancho mínimo: 60px (1 día)

**Estados visuales:**
- `PENDING` (gris): Tarea pendiente sin personal
- `PENDING + crew` (azul): Tarea pendiente con personal
- `COMPLETED` (verde): Tarea completada
- `DELAYED` (rojo): Tarea atrasada
- `IN_PROGRESS` (azul claro): Tarea en proceso

### 6. `TaskBarContextMenu`

**Responsabilidades:**
- Menú contextual (click derecho) en tareas
- Opciones: Completar/Pendiente, Asignar/Quitar personal, Eliminar
- Integración con `SelectCrewModal` para asignación
- Actualización optimista mediante `useSchedulerItemSync`

**Opciones del menú:**
1. **Marcar como completada/pendiente**: `onToggleComplete()`
2. **Asignar/Quitar personal**: Abre `SelectCrewModal`
3. **Vaciar slot**: `onDelete()` → Elimina tarea

### 7. `AssignCrewBeforeCompleteModal`

**Responsabilidades:**
- Modal que aparece al intentar completar tarea sin personal
- Permite asignar personal antes de completar
- Opción de completar sin pago
- Manejo de sueldos fijos vs variables

**Flujos:**
1. **Con personal disponible**: Seleccionar → Asignar y completar
2. **Sin personal**: Opción de agregar rápidamente o completar sin pago
3. **Sueldo fijo**: Modal de confirmación adicional (pasar a pago o solo completar)

---

## 🔧 Server Actions

### 1. `crearSchedulerTask()`

**Ubicación**: `src/lib/actions/studio/business/events/events.actions.ts`

**Parámetros:**
```typescript
{
  studioSlug: string;
  eventId: string;
  data: {
    itemId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    description?: string;
    assignedToCrewMemberId?: string | null;
    notes?: string;
    isCompleted?: boolean;
  }
}
```

**Validaciones:**
- ✅ Studio existe
- ✅ Item existe y pertenece al evento
- ✅ No existe tarea previa para el item (1:1)
- ✅ Crea instancia de scheduler si no existe

**Persistencia:**
- Crea registro en `studio_scheduler_event_tasks`
- Calcula `duration_days` automáticamente
- Sincroniza con Google Calendar (background)

**Revalidación:**
```typescript
revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/gantt`);
revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
```

### 2. `actualizarSchedulerTaskFechas()`

**Ubicación**: `src/lib/actions/studio/business/events/scheduler-actions.ts`

**Parámetros:**
```typescript
{
  studioSlug: string;
  eventId: string;
  taskId: string;
  data: {
    start_date: Date;
    end_date: Date;
  }
}
```

**Validaciones:**
- ✅ Fechas requeridas
- ✅ `start_date <= end_date`
- ✅ Tarea existe y pertenece al evento

**Persistencia:**
- Actualiza solo `start_date` y `end_date`
- No actualiza `duration_days` (se calcula en otro lugar si es necesario)

### 3. `actualizarSchedulerTask()`

**Ubicación**: `src/lib/actions/studio/business/events/events.actions.ts`

**Parámetros:**
```typescript
{
  studioSlug: string;
  eventId: string;
  taskId: string;
  data: {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    notes?: string;
    isCompleted?: boolean;
    skipPayroll?: boolean; // No generar nómina automáticamente
  }
}
```

**Validaciones:**
- ✅ Studio existe
- ✅ Tarea existe y pertenece al evento

**Lógica especial:**
- Si `isCompleted === true` y `skipPayroll !== true`:
  - Intenta crear nómina automáticamente
  - Retorna `payrollResult` con información de éxito/error

**Persistencia:**
- Actualiza campos según parámetros
- Si completa: `status = 'COMPLETED'`, `progress_percent = 100`, `completed_at = now()`
- Si descompleta: `status = 'PENDING'`, `progress_percent = 0`, `completed_at = null`

### 4. `eliminarSchedulerTask()`

**Ubicación**: `src/lib/actions/studio/business/events/events.actions.ts`

**Parámetros:**
```typescript
{
  studioSlug: string;
  eventId: string;
  taskId: string;
}
```

**Validaciones:**
- ✅ Studio existe
- ✅ Tarea existe y pertenece al evento

**Persistencia:**
- Elimina registro de `studio_scheduler_event_tasks`
- Sincroniza eliminación con Google Calendar (background)

### 5. `actualizarRangoScheduler()`

**Ubicación**: `src/lib/actions/studio/business/events/events.actions.ts`

**Parámetros:**
```typescript
{
  studioSlug: string;
  eventId: string;
  dateRange: {
    from: Date;
    to: Date;
  }
}
```

**Persistencia:**
- Actualiza `start_date` y `end_date` en `studio_scheduler_event_instances`
- Crea instancia si no existe

---

## ✅ Validaciones

### Validaciones de Creación

1. **Studio existe**: Verifica que el `studioSlug` corresponde a un studio válido
2. **Item existe**: El `itemId` debe existir y pertenecer al evento
3. **Unicidad**: No puede existir más de una tarea por item (relación 1:1)
4. **Fechas válidas**: `startDate <= endDate`

### Validaciones de Actualización

1. **Tarea existe**: La tarea debe existir y pertenecer al evento
2. **Fechas válidas**: `start_date <= end_date` (en `actualizarSchedulerTaskFechas`)
3. **Rango permitido**: Al hacer drag/resize, las fechas deben estar dentro del `dateRange` configurado

### Validaciones de Rango de Fechas

**En `SchedulerWrapper.validateDateRangeChange()`:**
- Verifica si hay tareas fuera del nuevo rango propuesto
- Si hay conflictos:
  - Muestra `DateRangeConflictModal`
  - Bloquea el cambio hasta que el usuario confirme
  - Cuenta cuántas tareas están fuera del rango

**Lógica:**
```typescript
const tasksOutsideRange = itemsWithTasks.filter(item => {
  const taskStart = new Date(item.scheduler_task.start_date);
  const taskEnd = new Date(item.scheduler_task.end_date);
  return taskStart < rangeStart || taskEnd > rangeEnd;
});
```

### Validaciones de Drag & Drop

**En `TaskBar`:**
- **Threshold de movimiento**: 5px (drag), 10px (resize) - evita actualizaciones por clicks accidentales
- **Grid snap**: 60px = 1 día (mínimo 1 día)
- **Rango permitido**: `isDateInRange(date, dateRange)` antes de actualizar
- **Rollback**: Si falla la actualización, revierte a fechas originales

### Validaciones de Completado

**En `EventScheduler.handleTaskToggleComplete()`:**
1. Si descompletar → Procede normalmente
2. Si completar:
   - Si tiene personal asignado → Verifica tipo de salario
   - Si tiene costo y no tiene personal → Muestra modal de asignación
   - Si `has_crew === false` → Completa sin pago
   - Si completa → Genera nómina (a menos que `skipPayroll = true`)

---

## 🗄️ Modelo de Datos

### `studio_scheduler_event_instances`

**Campos clave:**
- `id`: CUID
- `event_id`: FK a `studio_events` (unique)
- `start_date`: Inicio del rango del scheduler
- `end_date`: Fin del rango del scheduler
- `event_date`: Fecha del evento

**Relaciones:**
- `event` → `studio_events`
- `tasks[]` → `studio_scheduler_event_tasks`

### `studio_scheduler_event_tasks`

**Campos clave:**
- `id`: CUID
- `scheduler_instance_id`: FK a `studio_scheduler_event_instances`
- `cotizacion_item_id`: FK a `studio_cotizacion_items` (unique - 1:1)
- `name`: Nombre de la tarea
- `start_date`: Fecha de inicio
- `end_date`: Fecha de fin
- `duration_days`: Duración calculada
- `status`: `PENDING | IN_PROGRESS | BLOCKED | COMPLETED | CANCELLED`
- `progress_percent`: 0-100
- `completed_at`: Timestamp de completado
- `assigned_to_user_id`: FK a `user_studio_roles` (personal asignado)
- `google_calendar_id`: ID de evento en Google Calendar
- `google_event_id`: ID interno de Google Calendar

**Relaciones:**
- `assigned_to` → `user_studio_roles` (TaskAssignedTo)
- `completed_by` → `user_studio_roles` (TaskCompletedBy)
- `cotizacion_item` → `studio_cotizacion_items`

**Índices:**
- `@@unique([cotizacion_item_id])` - Garantiza 1:1
- `@@index([scheduler_instance_id])`
- `@@index([assigned_to_user_id])`

---

## 🔄 Flujos de Usuario

### Flujo 1: Crear Tarea

1. Usuario hace click en slot vacío de una fila
2. `SchedulerRow.handleRowClick()` calcula fecha desde posición X
3. `EventScheduler.handleTaskCreate()` se ejecuta
4. **Actualización optimista**: Se agrega tarea al estado local
5. `crearSchedulerTask()` se llama (Server Action)
6. Si éxito → Toast de confirmación
7. Si error → Rollback del estado optimista + Toast de error

### Flujo 2: Mover Tarea (Drag)

1. Usuario arrastra `TaskBar` horizontalmente
2. `TaskBar.handleDragStop()` detecta movimiento (>5px)
3. Calcula nueva `start_date` desde posición X
4. Mantiene duración original → Calcula nueva `end_date`
5. **Validación**: `isDateInRange()` para ambas fechas
6. **Actualización optimista**: Actualiza estado local
7. `actualizarSchedulerTaskFechas()` se llama
8. Si éxito → Toast de confirmación
9. Si error → Rollback a fechas originales

### Flujo 3: Redimensionar Tarea (Resize)

1. Usuario redimensiona `TaskBar` desde bordes
2. `TaskBar.handleResizeStop()` detecta cambio (>10px)
3. Grid snap: Redondea a múltiplos de 60px
4. Calcula nueva duración en días
5. Calcula nueva `end_date` desde `start_date + duration`
6. **Validación**: Ambas fechas dentro del rango
7. **Actualización optimista**: Actualiza estado local
8. `actualizarSchedulerTaskFechas()` se llama
9. Si éxito → Toast de confirmación
10. Si error → Rollback a fechas originales

### Flujo 4: Completar Tarea

1. Usuario hace click derecho → "Marcar como completada"
2. `EventScheduler.handleTaskToggleComplete()` se ejecuta
3. **Lógica condicional:**
   - Si tiene personal asignado → Verifica tipo de salario
   - Si tiene costo y no tiene personal → Muestra `AssignCrewBeforeCompleteModal`
   - Si `has_crew === false` → Completa directamente sin pago
4. `actualizarSchedulerTask()` se llama con `isCompleted: true`
5. Si `skipPayroll !== true` → Intenta generar nómina automáticamente
6. **Actualización optimista**: Actualiza estado local
7. Toast con resultado (éxito + info de nómina si aplica)

### Flujo 5: Asignar Personal

1. Usuario hace click derecho → "Asignar personal"
2. Se abre `SelectCrewModal`
3. Usuario selecciona miembro del equipo
4. `TaskBarContextMenu.handleAssignCrew()` se ejecuta
5. **Actualización optimista**: Actualiza estado local del item
6. `asignarCrewAItem()` se llama (Server Action)
7. Si éxito → Toast de confirmación
8. Si error → Rollback del estado optimista

### Flujo 6: Cambiar Rango de Fechas

1. Usuario hace click en botón de rango de fechas
2. `SchedulerDateRangeConfig` se abre
3. Usuario selecciona nuevo rango
4. Al aplicar → `validateDateRangeChange()` se ejecuta
5. Si hay tareas fuera del rango:
   - Muestra `DateRangeConflictModal` con cantidad de conflictos
   - Bloquea el cambio
6. Si no hay conflictos:
   - `actualizarRangoScheduler()` se llama
   - Actualiza `dateRange` local
   - Re-renderiza scheduler con nuevo rango

---

## 🎨 Estado y Actualización Optimista

### Estado Local

**En `EventScheduler`:**
- `localEventData`: Copia local de `eventData` para actualizaciones optimistas
- Se sincroniza con `eventData` cuando cambia desde el padre
- Permite actualizaciones inmediatas sin esperar respuesta del servidor

**Estrategia:**
1. Actualizar estado local inmediatamente
2. Llamar Server Action
3. Si éxito → Notificar al padre (`onDataChange`)
4. Si error → Rollback del estado local + Toast de error

### Hook `useSchedulerItemSync`

**Ubicación**: `src/app/[slug]/studio/business/events/[eventId]/scheduler/hooks/useSchedulerItemSync.ts`

**Propósito:**
- Sincronizar estado local de items entre componentes
- Actualización optimista de asignación de personal
- Evitar re-renders innecesarios

**Uso:**
```typescript
const { localItem, updateCrewMember } = useSchedulerItemSync(item, onItemUpdate);
```

---

## 🔗 Integraciones

### Google Calendar

**Sincronización automática:**
- Al crear tarea → Crea evento en Google Calendar (background)
- Al actualizar tarea → Actualiza evento en Google Calendar (background)
- Al eliminar tarea → Elimina evento en Google Calendar (background)

**Campos almacenados:**
- `google_calendar_id`: ID del calendario
- `google_event_id`: ID del evento

**Implementación:**
- No bloquea la operación principal
- Errores se loguean pero no afectan el flujo

---

## 📊 Métricas y Estadísticas

### Cálculo de Estadísticas

**En `SchedulerWrapper.taskStats`:**
- Se calcula en cada render desde `filteredCotizaciones`
- Compara fechas normalizadas (sin hora) con fecha actual
- Estados:
  - `completed`: `completed_at !== null`
  - `delayed`: `end_date < hoy` y no completada
  - `inProcess`: `hoy >= start_date && hoy <= end_date` y no completada
  - `pending`: `start_date > hoy` y no completada
  - `unassigned`: Items sin `scheduler_task`
  - `withoutCrew`: Tareas activas sin `assigned_to_crew_member_id`

---

## 🐛 Casos Edge y Limitaciones

### Limitaciones Actuales

1. **1 tarea por item**: Un item de cotización solo puede tener una tarea (relación 1:1)
2. **Sin dependencias**: No hay soporte para dependencias entre tareas (`depends_on_task_id` existe en schema pero no se usa)
3. **Sin subtareas**: No hay jerarquía de tareas
4. **Grid fijo**: 60px = 1 día (no configurable)
5. **Sin zoom**: No hay zoom in/out del timeline

### Casos Edge Manejados

1. **Items sin catálogo**: Se agrupan por `seccion_name_snapshot` y `category_name_snapshot`
2. **Rango sin configurar**: Muestra mensaje para configurar rango
3. **Sin items**: Muestra mensaje "No hay items para mostrar"
4. **Tareas fuera de rango**: Validación previene cambio de rango con modal de conflicto
5. **Drag fuera de rango**: Validación previene actualización si fechas están fuera del rango
6. **Personal sin sueldo**: Manejo especial para sueldos fijos vs variables

---

## 🚀 Mejoras Potenciales para Análisis de Usabilidad

### Puntos a Evaluar

1. **UX de creación de tareas:**
   - ¿Es intuitivo hacer click en slot vacío?
   - ¿Se entiende que solo puede haber 1 tarea por item?

2. **UX de drag & drop:**
   - ¿El grid snap de 60px es adecuado?
   - ¿El threshold de 5px/10px previene clicks accidentales?

3. **UX de asignación de personal:**
   - ¿El flujo de completar sin personal es claro?
   - ¿El modal de sueldo fijo es necesario o confuso?

4. **UX de validaciones:**
   - ¿El modal de conflicto de rango es claro?
   - ¿Las validaciones de drag/resize son demasiado restrictivas?

5. **UX de visualización:**
   - ¿Los colores de estado son claros?
   - ¿La información en el sidebar es suficiente?

6. **Performance:**
   - ¿El scroll unificado funciona bien en móvil?
   - ¿Las actualizaciones optimistas son lo suficientemente rápidas?

---

## 📝 Notas Técnicas

### Optimizaciones

1. **React.memo**: Componentes principales usan `React.memo` con comparación personalizada
2. **useMemo**: Cálculos pesados (itemsMap, seccionesFiltradas) están memoizados
3. **useCallback**: Handlers están memoizados para evitar re-renders
4. **Actualización optimista**: Mejora percepción de velocidad
5. **Scroll unificado**: Evita problemas de sincronización entre sidebar y timeline

### Dependencias Clave

- `react-rnd`: Drag & drop y resize
- `date-fns`: Manipulación de fechas
- `react-day-picker`: Selector de rango de fechas
- `sonner`: Toasts de notificación

---

**Última actualización**: 2025-02-05
**Versión del documento**: 1.0

