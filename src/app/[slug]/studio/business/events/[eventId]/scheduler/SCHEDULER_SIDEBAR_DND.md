# Scheduler: Sidebar, DnD y Tareas Manuales — Guía de arquitectura

Resumen técnico del flujo de datos y decisiones de diseño del scheduler (eventos), con foco en tareas manuales, sincronización Popover ↔ Grid y reactividad visual.

> **Roadmap:** Ver [scheduler-v2-refactor-roadmap.md](../../../../../../../../.cursor/plans/scheduler-v2-refactor-roadmap.md) para el estado actual del refactor (rama `260208-scheduler-refactor`).

---

## 1. Modelo de datos

- **ManualTaskPayload**: incluye `duration_days`, `start_date`, `end_date` (y resto: nombre, costo, crew, status, etc.).
- **ManualTaskPatch**: subconjunto parcial; siempre puede traer `duration_days`, `start_date`, `end_date` para actualizaciones de fechas/duración.
- **Backend**: `actualizarSchedulerTaskFechas` persiste `start_date` y `end_date` y calcula/persiste `duration_days` (días inclusivos). `obtenerTareasScheduler` devuelve tasks con `duration_days` en el select.

---

## 2. Handler central: `handleManualTaskPatch` (EventScheduler)

- **Único punto** donde se actualiza el estado local (`localEventData.scheduler.tasks`) a partir de un patch de tarea manual (venga del Popover o del Grid).
- **Regla de normalización**: si entra `duration_days` → se calcula `end_date` desde `start_date` (anclaje); si entra `end_date` → se calcula `duration_days`. Todas las fechas se convierten a **objeto `Date`** (nunca string ISO en estado) para que el Grid calcule bien el ancho.
- **Sobrescritura explícita**: al mergear `{ ...task, ...normalizedPatch }` se vuelven a aplicar `end_date` y `duration_days` al final para que los valores calculados tengan prioridad sobre cualquier valor crudo del patch (p. ej. string).
- Tras actualizar estado se llama `onDataChange(updatedData)` y se dispara el evento custom `scheduler-task-updated` para que el resto de la UI (sidebar, etc.) pueda reaccionar.

---

## 3. Popover y formulario (tarea manual)

- **TaskForm (edit)**: campo "Duración (días)" junto a costo; valor inicial desde `task.duration_days` o derivado de `start_date`/`end_date`.
- **Anclaje en start_date**: al cambiar solo la duración, la posición de inicio no cambia; `newEndDate = addDays(anchorStart, days - 1)` (días inclusivos). Así la barra en el Grid no “salta” al guardar.
- **Al guardar**: se llama `actualizarSchedulerTaskFechas` con `start_date` y `end_date` y luego `onManualTaskPatch` con `{ start_date, end_date, duration_days }` para actualizar estado local y Grid en la misma pasada.

---

## 4. Grid y barras (TaskBar)

- **Resize en barra**: al soltar el resize se calcula `durationInclusive = differenceInCalendarDays(newEndDate, newStartDate) + 1` y se llama `onManualTaskPatch` con `{ start_date, end_date, duration_days }` (mismo contrato que el Popover).
- **Reactividad visual**: el componente `Rnd` (react-rnd) usa `default={{ width }}`; el ancho solo se aplica en el montaje. Por eso:
  - `manualTasks` se construye con `useMemo(..., [localEventData])` para que cualquier cambio en el evento entregue un array nuevo al Grid.
  - Las keys incluyen la geometría: `key={\`${task.id}-${task.end_date.getTime()}\`}` en SchedulerRow (TaskBar), en la fila manual del SchedulerGrid y en el `Rnd` dentro de TaskBar. Así, cuando cambia `end_date`, React desmonta y vuelve a montar la barra con el ancho correcto.

---

## 5. Sincronización Sidebar ↔ estado (useSchedulerManualTaskSync)

- El Sidebar muestra la tarea desde **estado local** (`localTask`) que se sincroniza con la prop `task` que viene del padre (que a su vez viene de `localEventData.scheduler.tasks`).
- **taskKey**: incluye `id`, nombre, status, `completed_at`, crew y **startEndDurationKey** (derivado de `start_date`, `end_date`, `duration_days`). Cuando el usuario cambia la duración en el Popover o hace resize en el Grid, `handleManualTaskPatch` actualiza el estado → la prop `task` cambia → `taskKey` cambia → el hook hace `setLocalTask(task)` y el formulario del Sidebar refleja al instante la nueva duración/fechas sin retraso.

---

## 6. Flujo resumido (duración cambiada en Popover)

1. Usuario cambia "Duración (días)" y guarda en el Popover.
2. TaskForm calcula `computedEndDate = addDays(anchorStart, newDurationDays - 1)` y llama a la server action `actualizarSchedulerTaskFechas` y luego `onManualTaskPatch(taskId, { start_date, end_date, duration_days })`.
3. `handleManualTaskPatch` normaliza fechas a `Date`, aplica el patch al array de tasks (con sobrescritura explícita de `end_date` y `duration_days`) y hace `setLocalEventData`.
4. `manualTasks` (useMemo con `[localEventData]`) se recalcula; el Grid recibe el nuevo array; las keys con `end_date.getTime()` cambian → React remonta las barras afectadas con el nuevo ancho.
5. El Sidebar recibe la misma task actualizada vía props; `useSchedulerManualTaskSync` detecta el cambio por `startEndDurationKey` y actualiza `localTask` → el formulario muestra la nueva duración/fechas.

---

## 7. Normalización y consistencia de orden (re-indexación universal)

Para evitar colisiones de `order` e intercalación entre tareas manuales y de cotización, se usa una **"verdad en el servidor"** alineada con el frontend:

1. **Carga profunda de contexto (deep include)**  
   El servidor no filtra por `catalog_category_id` en SQL (las tareas de cotización suelen tenerlo `null`). Se cargan **todas** las tareas del evento (`eventId`) con `include` de la relación `cotizacion_item`.

2. **Filtrado en memoria (server-side)**  
   Se aplica la misma lógica que el frontend para agrupar en segmentos (Categoría + Etapa). Así el servidor "ve" los mismos ítems que la UI.

3. **Atomicidad del re-indexado**  
   Cada creación o movimiento dispara una re-indexación secuencial (0, 1, 2, 3…) dentro del segmento. Las nuevas tareas reciben `order = maxOrder + 1` según el segmento completo, quedando siempre al final.

4. **Sincronía espejo**  
   El helper `applySegmentOrderNormalization` se usa en el cliente (actualización optimista) y la reindexación en el servidor (persistencia), evitando parpadeos o desorden tras la respuesta.

---

## 8. Archivos clave

| Rol | Archivo |
|-----|--------|
| Estado y handler central | `EventScheduler.tsx` — `localEventData`, `handleManualTaskPatch`, `manualTasks` useMemo |
| Popover + guardado fechas | `SchedulerManualTaskPopover.tsx` — `handleSaveSubmit`, llamada a `actualizarSchedulerTaskFechas` y `onManualTaskPatch` |
| Formulario y anclaje | `TaskForm.tsx` — duración, anclaje en `start_date`, `onSave` con `start_date`/`end_date`/`duration_days` |
| Sync estado Sidebar | `useSchedulerManualTaskSync.ts` — `taskKey`, `startEndDurationKey`, `setLocalTask(task)` |
| Grid y barras | `SchedulerGrid.tsx` — keys de fila manual; `SchedulerRow.tsx` — key de TaskBar; `TaskBar.tsx` — key de Rnd, resize → `onManualTaskPatch` |
| Servidor | `scheduler-actions.ts` — `actualizarSchedulerTaskFechas`, `obtenerTareasScheduler`, `crearTareaManualScheduler` (filtro en memoria + reindexación) |
