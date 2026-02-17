# ISRAEL ALGORITHM – TASK REORDER MASTER SPEC

**Versión**: 2.2 (Estable)  
**Fecha**: 2026-02-16  
**Última Actualización**: 2026-02-16 PM (Fix: Detección de posiciones extremas y adyacentes)  
**Objetivo**: Especificación única y definitiva del algoritmo de reordenamiento de tareas por drag & drop dentro del Scheduler.

---

## ⚠️ FUENTE ÚNICA DE VERDAD

**Este documento es la referencia definitiva** para el reordenamiento de tareas en el Scheduler. Cualquier cambio futuro DEBE:
1. Mantener la arquitectura descrita aquí
2. Actualizar este documento si hay mejoras
3. **NUNCA** transgredir los principios fundamentales sin justificación documentada

---

## 1. Arquitectura del Sistema

### 1.1 Componentes Involucrados

```
┌─────────────────────────────────────────────────────────────┐
│ EventScheduler.tsx (Orquestador Principal)                  │
├─────────────────────────────────────────────────────────────┤
│ • handleDragEnd() → Manejo del evento drag & drop          │
│ • Construcción de combined[] → Lista unificada de tareas   │
│ • Cálculo de reordered[] → Nuevo orden después del drag    │
│ • Actualización optimista → UI inmediata                    │
│ • Reconciliación → Sincronización con servidor              │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ buildSchedulerRows() + reorderWithHierarchy()              │
├─────────────────────────────────────────────────────────────┤
│ • scheduler-section-stages.ts                               │
│ • Construcción de estructura de datos                       │
│ • Aplicación de jerarquía padre-hijo                        │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ reorderSchedulerTasksToOrder() (Server Action)             │
├─────────────────────────────────────────────────────────────┤
│ • scheduler-actions.ts                                       │
│ • Validación de tareas                                      │
│ • Transacción Prisma                                        │
│ • Persistencia en BD: order = índice en array              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Flujo de Datos

```
1. RENDERIZADO INICIAL
   buildSchedulerRows() lee:
   • cotizacion_items + scheduler_task.order
   • manual_tasks + task.order
   reorderWithHierarchy() organiza:
   • Padres por order ascendente
   • Hijos después de cada padre

2. DRAG & DROP (Usuario arrastra tarea)
   handleDragStart() bloquea drags concurrentes:
   • setUpdatingTaskId(activeId)
   • dropIndicatorRef.current = null
   
  handleDragOver() calcula posición visual:
  • overlayPositionRef.current = { x, y } (desde overlayStartRectRef + delta)
  • dropIndicatorRef.current = { overId, insertBefore }
  • setDropIndicator(dropIndicatorRef.current)
  • insertBefore determinado por:
    ✅ Casos especiales (extremos/adyacentes) → lógica forzada
    ✅ Casos normales → threshold 40%
   
   handleDragEnd() captura:
   • activeId: tarea que se mueve
   • overId: tarea sobre la que se suelta
   • ⚠️ dropIndicatorRef.current: (NO dropIndicator state)
   
   Construye combined[]:
   • Array plano de Entry[] con order desde BD
   • Sort explícito: combined.sort((a, b) => a.order - b.order)
   
   Calcula reordered[]:
   • Extrae bloque (padre + todos sus hijos)
   • Calcula nueva posición usando dropIndicatorRef.current
   • Genera array reordered: string[] (IDs en orden final)

3. ACTUALIZACIÓN OPTIMISTA
   setLocalEventData():
   • Actualiza scheduler_task.order en cotizacion_items
   • Actualiza task.order en scheduler.tasks
   • UI se re-renderiza inmediatamente (SIN REBOTE)

4. DEBOUNCE 300ms
   Espera a que el usuario termine de arrastrar múltiples veces

5. PERSISTENCIA SERVIDOR
   reorderSchedulerTasksToOrder(studioSlug, eventId, reordered):
   • Valida que todas las tareas existen
   • Valida mismo stage/categoría
   • Transacción Prisma:
     UPDATE scheduler_task SET order = índice WHERE id = reordered[índice]
   • Retorna: Array<{ taskId, newOrder }>

6. RECONCILIACIÓN
   Cliente recibe result.data:
   • Construye orderMap fuera del setter
   • Actualiza localEventData con orden del servidor
   • Notifica al padre: onDataChange(updatedData)
   • ❌ NO ejecuta router.refresh()

7. RE-RENDERIZADO
   useMemo detecta cambio en localEventData:
   • buildSchedulerRows() lee nuevo orden desde BD
   • reorderWithHierarchy() aplica jerarquía
   • Sidebar renderiza con nuevo orden (SIN REBOTE)
```

### 1.3 Variables de Estado Críticas (EventScheduler.tsx)

Estas variables controlan el ciclo de vida del drag & drop y su correcta gestión es **FUNDAMENTAL** para evitar bugs:

#### `updatingTaskId` (State)
```typescript
const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
```

**Propósito**: Bloquear drags concurrentes mientras se procesa un reordenamiento.

**Ciclo de Vida**:
1. `handleDragStart()`: `setUpdatingTaskId(activeId)` → Bloquea nuevos drags
2. Drag en progreso: `disableDrag: updatingTaskId != null` (SchedulerSidebar.tsx)
3. `handleDragEnd()` (finally): `setUpdatingTaskId(null)` → Permite nuevos drags
4. **Backup timeout 8s**: Si reconciliación falla, timeout limpia con `setUpdatingTaskId(null)`

**🔴 BUG COMÚN**: Usar `setUpdatingTaskIdRef.current(null)` en lugar de `setUpdatingTaskId(null)` en el timeout → `updatingTaskId` nunca se limpia → todos los drags quedan bloqueados.

#### `dropIndicator` (State) + `dropIndicatorRef` (Ref)
```typescript
const [dropIndicator, setDropIndicator] = useState<{ overId: string; insertBefore: boolean } | null>(null);
const dropIndicatorRef = useRef<{ overId: string; insertBefore: boolean } | null>(null);
```

**Propósito**: Guardar si el elemento debe insertarse antes/después de `overId`.

**Ciclo de Vida**:
1. `handleDragOver()`: Calcula `insertBefore` según posición del mouse
   ```typescript
   const indicator = { overId, insertBefore };
   setDropIndicator(indicator);
   dropIndicatorRef.current = indicator;  // ← Sincronizar ambos
   ```
2. `handleDragEnd()`: Lee desde `dropIndicatorRef.current` (NO desde `dropIndicator` state)
   ```typescript
   const effectiveDropIndicator = dropIndicatorRef.current;
   ```
3. `handleDragEnd()` (finally): Limpia ambos
   ```typescript
   setDropIndicator(null);
   dropIndicatorRef.current = null;
   ```

**🔴 BUG COMÚN**: Leer desde `dropIndicator` state en lugar de `dropIndicatorRef.current` → el state puede ser null por re-render → `finalInsertIndex` siempre es 0 → orden no cambia.

#### `overlayPositionRef` (Ref)
```typescript
const overlayPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
```

**Propósito**: Posición visual del overlay durante drag (UI pura, no afecta lógica).

#### `reorderBackupClearRef` (Ref)
```typescript
const reorderBackupClearRef = useRef<NodeJS.Timeout | null>(null);
```

**Propósito**: ID del timeout de backup (8s) para limpieza.

**⚠️ REGLA CRÍTICA**: 
- **State (`dropIndicator`, `updatingTaskId`)**: Para re-renders y UI
- **Ref (`dropIndicatorRef`, `overlayPositionRef`)**: Para valores que persisten entre renders y NO deben causar re-renders

---

## 2. Principios Fundamentales

### 2.1 Fuente Única de Verdad

**`scheduler_task.order` en la base de datos es LA fuente de verdad.**

```sql
-- Tabla: studio_scheduler_event_tasks
-- Campo clave: order (integer, nullable)

-- Valores:
-- • 0, 1, 2, 3, 4... (secuencial, sin gaps idealmente)
-- • El orden es POR CATEGORÍA Y STAGE
-- • Gaps son tolerados pero no ideales
```

### 2.2 Orden Lineal

**order = índice en el array visual = 0, 1, 2, 3, 4...**

```typescript
// ✅ CORRECTO
reordered = ['task-a', 'task-b', 'task-c'];
// task-a → order: 0
// task-b → order: 1
// task-c → order: 2

// ❌ INCORRECTO
// Gaps innecesarios: order: 0, 5, 10, 15...
```

### 2.3 Jerarquía Simple

**Padres ordenados → Hijos inmediatamente después de su padre**

```
Padre A (order: 0)
  ├─ Hijo A1 (order: 1)
  └─ Hijo A2 (order: 2)
Padre B (order: 3)
  └─ Hijo B1 (order: 4)
Padre C (order: 5)
```

### 2.4 Sin Shadow Map

**❌ PROHIBIDO: Mantener estado temporal de orden visual (visualOrderOverrides)**

**✅ OBLIGATORIO: Actualización optimista + reconciliación con servidor**

### 2.5 Sin router.refresh()

**❌ PROHIBIDO: Forzar recarga completa después de reordenar**

**✅ OBLIGATORIO: Confiar en la reconciliación con datos del servidor**

---

## 3. buildSchedulerRows() - Construcción de Estructura

### 3.1 Firma de Función

```typescript
export function buildSchedulerRows(
  secciones: SeccionData[],
  itemsMap: Map<string, CotizacionItemBase>,
  manualTasks: ManualTaskPayload[] = [],
  activeSectionIds?: Set<string>,
  explicitlyActivatedStageIds?: Set<string> | string[],
  customCategoriesBySectionStage?: Map<string, CustomCategoryItem[]>
): SchedulerRowDescriptor[]
```

**⚠️ NO recibe `visualOrderOverrides` - Esto es CRÍTICO**

### 3.2 Lógica de Construcción

```typescript
// PASO 1: Estructura de buckets
const data = new Map<
  string, // sectionId
  Map<TaskCategoryStage, // stage (PLANNING, PRODUCTION, etc.)
    Map<string, // categoryKey (nombre de categoría)
      Array<{ order: number; row: TaskRow }>
    >
  >
>();

// PASO 2: Procesar ítems de catálogo
for (const item of itemsMap.values()) {
  const task = item.scheduler_task;
  if (!task) continue;

  // Orden: usar task.order si existe, sino displayIndex++
  getOrCreate(sectionId, stage, categoryKey).push({
    order: task.order ?? displayIndex++,
    row: createTaskRow(item)
  });
}

// PASO 3: Procesar tareas manuales
for (const task of manualTasks) {
  getOrCreate(sectionId, stage, categoryKey).push({
    order: task.order ?? manualDisplayIndex++,
    row: createManualTaskRow(task)
  });
}

// PASO 4: Construir filas de salida
for (const [categoryKey, list] of byCat.entries()) {
  // ✅ APLICAR JERARQUÍA (sin visualOrderOverrides)
  const sorted = list.length > 0 ? reorderWithHierarchy([...list]) : [];
  
  categoryRows.push({
    type: 'category',
    rows: sorted.map(e => e.row) // ← ORDEN FINAL
  });
}
```

### 3.3 Puntos Clave

- ✅ `order` proviene DIRECTAMENTE de `scheduler_task.order` o `task.order`
- ✅ NO hay Shadow Map ni overrides
- ✅ `reorderWithHierarchy()` se aplica UNA vez al construir
- ✅ El orden es el que está en la BD, no hay manipulación

---

## 4. reorderWithHierarchy() - Aplicación de Jerarquía

### 4.1 Algoritmo Simple (Versión Funcional)

```typescript
export function reorderWithHierarchy(
  list: Array<{ order: number; row: TaskRow }>
): Array<{ order: number; row: TaskRow }> {
  const byTaskId = new Map<string, { order: number; row: TaskRow }>();
  const taskMeta = new Map<string, { parentId: string | null }>();

  // PASO 1: Indexar todas las tareas
  for (const entry of list) {
    const meta = getTaskIdAndParent(entry.row);
    if (!meta) continue;
    byTaskId.set(meta.taskId, entry);
    taskMeta.set(meta.taskId, { parentId: meta.parentId });
  }

  const taskIds = new Set(byTaskId.keys());
  const roots: string[] = [];
  const childrenByParent = new Map<string, string[]>();
  const orphans: string[] = [];

  // PASO 2: Clasificar tareas (roots vs children vs orphans)
  for (const [taskId, meta] of taskMeta.entries()) {
    const parentId = meta.parentId;
    if (!parentId) {
      roots.push(taskId);
    } else if (taskIds.has(parentId)) {
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push(taskId);
      childrenByParent.set(parentId, arr);
    } else {
      orphans.push(taskId);
    }
  }

  const result: Array<{ order: number; row: TaskRow }> = [];
  
  // PASO 3: Ordenar padres por order ascendente
  const sortedRoots = [...roots].sort((a, b) => {
    const ea = byTaskId.get(a)!;
    const eb = byTaskId.get(b)!;
    return (ea.order ?? 0) - (eb.order ?? 0) || a.localeCompare(b);
  });

  // PASO 4: Construir resultado (padre → hijos, padre → hijos, ...)
  for (const rootId of sortedRoots) {
    result.push(byTaskId.get(rootId)!);
    const children = childrenByParent.get(rootId) ?? [];
    
    // Ordenar hijos por order ascendente
    const sortedChildren = [...children].sort((a, b) => {
      const ea = byTaskId.get(a)!;
      const eb = byTaskId.get(b)!;
      return (ea.order ?? 0) - (eb.order ?? 0) || a.localeCompare(b);
    });
    
    for (const cid of sortedChildren) {
      result.push(byTaskId.get(cid)!);
    }
  }

  // PASO 5: Agregar huérfanos al final
  for (const oid of orphans) {
    result.push(byTaskId.get(oid)!);
  }

  return result;
}
```

### 4.2 Características Clave

- ✅ **Simple**: 60 líneas de código
- ✅ **Explícito**: Clasificación clara (roots, children, orphans)
- ✅ **Ordenamiento**: Por `order` numérico ascendente
- ✅ **Sin parámetros adicionales**: No recibe `visualOrderOverrides`
- ✅ **Mantenible**: Fácil de entender y debuggear

---

## 5. handleDragEnd() - Cálculo de Nuevo Orden

### 5.1 Construcción de `combined[]`

```typescript
// PASO 1: Construir array desde buildSchedulerRows()
const rows = buildSchedulerRows(
  secciones,
  itemsMapForRows,
  manualTasksForRows,
  activeSectionIds,
  explicitlyActivatedStageIds,
  customCategoriesBySectionStage
  // ⚠️ NO se pasa visualOrderOverrides
);

// PASO 2: Encontrar segmento que contiene activeId
for (const segment of getStageSegments(block.contentRows)) {
  const taskRows = segment.rows.filter(r => isTaskRow(r) || isManualTaskRow(r));
  const hasActive = taskRows.some(r => toEntryTaskId(r) === activeId);
  
  if (hasActive) {
    // Construir combined
    combined = taskRows.map(r => 
      r.type === 'task'
        ? ({
            taskId: String(r.item.scheduler_task?.id),
            order: (r.item.scheduler_task as { order?: number }).order ?? 0,
            stageKey: stageId,
            type: 'item' as const,
            item: r.item,
          })
        : ({
            taskId: String(r.task.id),
            order: (r.task as { order?: number }).order ?? 0,
            stageKey: stageId,
            type: 'manual' as const,
            task: r.task,
          })
    );
    
    // ✅ SORT EXPLÍCITO: Garantiza orden ascendente
    combined.sort((a, b) => a.order - b.order);
    break;
  }
}
```

### 5.2 Cálculo de `insertBefore` en `handleDragOver()`

**Problema**: Threshold simple (50%) causaba rebote en posiciones extremas y adyacentes.

**Solución**: Detectar 4 casos especiales con lógica forzada + threshold 40% para casos normales.

```typescript
// 1. Obtener todas las tareas del mismo scope ordenadas
const tasksInScope = Array.from(taskIdToMeta.entries())
  .filter(([_, meta]) => {
    const cat = normCat(meta.catalogCategoryId);
    return cat === targetCat && meta.stageKey === targetStage;
  })
  .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
  .map(([id]) => id);

// 2. Detectar posición relativa
const targetIndexInScope = tasksInScope.indexOf(overId);
const activeIndexInScope = tasksInScope.indexOf(activeId);
const isLastInScope = targetIndexInScope === tasksInScope.length - 1;
const isFirstInScope = targetIndexInScope === 0;
const activeIsAbove = activeIndexInScope >= 0 && activeIndexInScope < targetIndexInScope;
const activeIsBelow = activeIndexInScope >= 0 && activeIndexInScope > targetIndexInScope;
const areAdjacent = Math.abs(targetIndexInScope - activeIndexInScope) === 1;

// 3. Calcular insertBefore con lógica especial
const overlayMid = overlayPos.y + ROW_HEIGHTS.TASK_ROW / 2;
const threshold = rect.top + rect.height * 0.4; // 40% threshold

let insertBefore: boolean;

if (isLastInScope && activeIsAbove) {
  // CASO 1: Arrastrar desde arriba sobre el ÚLTIMO → siempre insertar DESPUÉS
  insertBefore = false;
} else if (isFirstInScope && activeIsBelow) {
  // CASO 2: Arrastrar desde abajo sobre el PRIMERO → siempre insertar ANTES
  insertBefore = true;
} else if (areAdjacent && activeIsAbove) {
  // CASO 3: Adyacentes, active arriba del target → insertar DESPUÉS (swap)
  insertBefore = false;
} else if (areAdjacent && activeIsBelow) {
  // CASO 4: Adyacentes, active abajo del target → insertar ANTES (swap)
  insertBefore = true;
} else {
  // Caso normal: usar threshold 40%
  insertBefore = overlayMid < threshold;
}

const indicator = { overId, insertBefore };
setDropIndicator(indicator);
dropIndicatorRef.current = indicator;
```

### 5.3 Cálculo de `reordered[]` (Israel Algorithm)

```typescript
// PASO 3: Extraer bloque (padre + todos sus hijos)
const activeIdStr = String(activeId);
const childrenOfActive = combined.filter(
  e => getParentId(e) != null && String(getParentId(e)) === activeIdStr
);
const block = [activeEntry, ...childrenOfActive];
const rest = combined.filter(e => !block.some(b => b.taskId === e.taskId));

// PASO 4: Calcular índice de inserción
let overIndexInRest = rest.findIndex(e => e.taskId === overId);

// ⚠️ CRÍTICO: Usar dropIndicatorRef (NO dropIndicator state)
// dropIndicator state puede ser null por re-render React
// dropIndicatorRef.current persiste durante todo el drag
const effectiveDropIndicator = dropIndicatorRef.current;

let finalInsertIndex = overIndexInRest;
if (effectiveDropIndicator && !effectiveDropIndicator.insertBefore) {
  finalInsertIndex = overIndexInRest + 1;
}

// PASO 5: Construir array reordenado
const reorderedEntries = [
  ...rest.slice(0, finalInsertIndex),
  ...block,
  ...rest.slice(finalInsertIndex)
];

// ✅ EXTRAER SOLO IDs
reordered = reorderedEntries.map(e => String(e.taskId));

// ✅ MAPAS DE ORDEN
taskIdToNewOrder = new Map(reordered.map((id, i) => [id, i]));
taskIdToOldOrder = new Map(combined.map(e => [String(e.taskId), e.order]));
```

### 5.4 Puntos Críticos

- ✅ **Bloque completo**: Padre + todos sus hijos se mueven juntos
- ✅ **Sort explícito**: `combined.sort()` garantiza orden correcto
- ✅ **Array reordered**: IDs en el orden final visual
- ✅ **Índice = nuevo order**: Posición en el array = valor de `order` en BD
- 🔴 **dropIndicatorRef**: Usar `dropIndicatorRef.current`, NO `dropIndicator` state (se pierde entre renders)
- 🔴 **updatingTaskId**: DEBE limpiarse correctamente con `setUpdatingTaskId(null)` o bloquea drags subsecuentes
- 🔴 **overlayStartRectRef desde DOM**: `event.active.rect.current` puede ser null, usar `activeElement.getBoundingClientRect()`
- 🔴 **Detectar extremos/adyacentes**: Lógica forzada para `insertBefore` en casos límite

---

## 6. Actualización Optimista

### 6.1 Código de Actualización

```typescript
// PASO 1: Actualizar estado local inmediatamente
setLocalEventData((prev) => {
  const next = { ...prev };
  
  // Actualizar cotizacion_items
  next.cotizaciones = prev.cotizaciones?.map(cot => ({
    ...cot,
    cotizacion_items: cot.cotizacion_items?.map(item => {
      const taskId = item?.scheduler_task?.id;
      const newOrderVal = taskId != null 
        ? taskIdToNewOrder.get(String(taskId)) 
        : undefined;
      
      if (newOrderVal === undefined) return item;
      
      return {
        ...item,
        scheduler_task: item!.scheduler_task 
          ? { ...item.scheduler_task, order: newOrderVal }
          : null
      };
    }),
  }));
  
  // Actualizar manual tasks
  next.scheduler = prev.scheduler
    ? {
        ...prev.scheduler,
        tasks: (prev.scheduler.tasks ?? []).map(t => {
          const newOrder = taskIdToNewOrder.get(String(t.id)) 
            ?? (t as { order?: number }).order 
            ?? 0;
          return { ...t, order: newOrder };
        }),
      }
    : prev.scheduler;
  
  return next as SchedulerViewData;
});
```

### 6.2 Características

- ✅ **Inmediata**: UI se actualiza sin esperar al servidor
- ✅ **Completa**: Actualiza ítems de catálogo Y tareas manuales
- ✅ **Sin rebote**: Porque NO hay `router.refresh()` después

---

## 7. Persistencia en Servidor

### 7.1 Server Action

```typescript
export async function reorderSchedulerTasksToOrder(
  studioSlug: string,
  eventId: string,
  taskIdsInOrder: string[]
): Promise<{ 
  success: boolean; 
  data?: Array<{ taskId: string; newOrder: number }>; 
  error?: string;
}> {
  if (taskIdsInOrder.length === 0) return { success: true, data: [] };
  
  try {
    // PASO 1: Validar que todas las tareas existen
    const tasksInList = await prisma.studio_scheduler_event_tasks.findMany({
      where: { 
        id: { in: taskIdsInOrder }, 
        scheduler_instance: { event_id: eventId } 
      },
      select: {
        id: true,
        category: true,
        catalog_category_id: true,
        scheduler_instance_id: true,
      },
    });
    
    if (tasksInList.length !== taskIdsInOrder.length) {
      return { success: false, error: 'Una o más tareas no encontradas' };
    }

    // PASO 2: Validar mismo stage/categoría
    const first = tasksInList.find(t => t.id === taskIdsInOrder[0]);
    const allSameStage = tasksInList.every(t => 
      t.scheduler_instance_id === first.scheduler_instance_id && 
      t.category === first.category
    );
    
    if (!allSameStage) {
      return { 
        success: false, 
        error: 'Tareas no pertenecen al mismo ámbito' 
      };
    }

    // PASO 3: Actualizar order = índice en array
    const reorderedTasks: Array<{ taskId: string; newOrder: number }> = [];

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < taskIdsInOrder.length; i++) {
        await tx.studio_scheduler_event_tasks.update({
          where: { id: taskIdsInOrder[i] },
          data: { order: i }, // ← ORDEN = ÍNDICE
        });
        
        reorderedTasks.push({ taskId: taskIdsInOrder[i], newOrder: i });
      }
    }, { maxWait: 5_000 });

    // PASO 4: Retornar confirmación
    return { success: true, data: reorderedTasks };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reordenar',
    };
  }
}
```

### 7.2 Características Clave

- ✅ **Validación**: Todas las tareas existen y mismo stage/categoría
- ✅ **Transacción**: Un solo UPDATE por tarea dentro de transacción
- ✅ **order = índice**: El valor de `order` es la posición en el array (0, 1, 2...)
- ✅ **Respuesta**: Retorna array con `{ taskId, newOrder }` para reconciliación
- ✅ **Timeout**: `maxWait: 5_000` evita bloqueos

---

## 8. Reconciliación con Servidor

### 8.1 Código de Reconciliación

```typescript
// PASO 3: RECONCILIACIÓN INMEDIATA con orden del servidor
if (result.data) {
  const orderMap = new Map(result.data.map(t => [String(t.taskId), t.newOrder]));
  
  // ✅ Calcular nuevo estado FUERA del setter
  const updatedData: SchedulerViewData = {
    ...localEventDataRef.current,
    cotizaciones: localEventDataRef.current.cotizaciones?.map(cot => ({
      ...cot,
      cotizacion_items: cot.cotizacion_items?.map(item => {
        const taskId = item?.scheduler_task?.id != null 
          ? String(item.scheduler_task.id) 
          : undefined;
        const newOrder = taskId ? orderMap.get(taskId) : undefined;
        
        return newOrder !== undefined && item?.scheduler_task
          ? { 
              ...item, 
              scheduler_task: { 
                ...item.scheduler_task, 
                order: newOrder 
              } 
            }
          : item;
      }),
    })),
    scheduler: localEventDataRef.current.scheduler
      ? {
          ...localEventDataRef.current.scheduler,
          tasks: localEventDataRef.current.scheduler.tasks.map(task => {
            const newOrder = orderMap.get(String(task.id));
            return newOrder !== undefined 
              ? { ...task, order: newOrder } 
              : task;
          }),
        }
      : localEventDataRef.current.scheduler,
  };
  
  // ✅ Actualizar estado local
  setLocalEventData(updatedData);
  
  // ✅ Notificar al padre con datos ya actualizados
  onDataChangeRef.current?.(updatedData);
}
```

### 8.2 Puntos Críticos

- ✅ **Cálculo fuera del setter**: Evita race conditions
- ✅ **Notificación correcta**: `onDataChange` recibe datos actualizados
- ✅ **Sin router.refresh()**: Confía en la reconciliación
- ✅ **Sin Shadow Map**: No hay limpieza de `visualOrderOverrides`

---

## 9. Rollback en Caso de Error

### 9.1 Código de Rollback

```typescript
if (!result.success) {
  // ROLLBACK: Revertir al orden anterior
  const rollbackData: SchedulerViewData = {
    ...localEventDataRef.current,
    cotizaciones: localEventDataRef.current.cotizaciones?.map(cot => ({
      ...cot,
      cotizacion_items: cot.cotizacion_items?.map(item => {
        const id = item?.scheduler_task?.id;
        const oldOrder = id != null 
          ? taskIdToOldOrder.get(String(id)) 
          : undefined;
        
        if (oldOrder === undefined) return item;
        
        return { 
          ...item, 
          scheduler_task: item!.scheduler_task 
            ? { ...item.scheduler_task, order: oldOrder } 
            : null 
        };
      }),
    })),
    scheduler: localEventDataRef.current.scheduler
      ? { 
          ...localEventDataRef.current.scheduler, 
          tasks: localEventDataRef.current.scheduler.tasks.map(t => ({ 
            ...t, 
            order: taskIdToOldOrder.get(String(t.id)) 
              ?? (t as { order?: number }).order 
              ?? 0 
          })) 
        }
      : localEventDataRef.current.scheduler,
  };
  
  setLocalEventData(rollbackData);
  toast.error(result.error ?? 'Error al reordenar');
  return;
}
```

### 9.2 Características

- ✅ **Reversión completa**: Usa `taskIdToOldOrder` para restaurar
- ✅ **Feedback al usuario**: Toast con mensaje de error
- ✅ **Consistencia**: Estado local vuelve al orden original

---

## 10. Checklist de Implementación

### ✅ DO (Hacer)

1. **buildSchedulerRows()**
   - ✅ Leer `order` directamente de `scheduler_task.order` o `task.order`
   - ✅ NO recibir parámetro `visualOrderOverrides`
   - ✅ Aplicar `reorderWithHierarchy()` UNA vez por categoría

2. **reorderWithHierarchy()**
   - ✅ Usar algoritmo simple (clasificación explícita)
   - ✅ NO recibir parámetro `visualOrderOverrides`
   - ✅ Ordenar padres e hijos por `order` ascendente

3. **handleDragStart()**
   - ✅ Verificar `if (updatingTaskId != null) return;` (bloquear drags concurrentes)
   - ✅ Setear `setUpdatingTaskId(activeId)`
   - ✅ Limpiar `dropIndicatorRef.current = null`

4. **handleDragOver()**
   - ✅ Calcular `insertBefore` según posición del mouse
   - ✅ Sincronizar ambos: `setDropIndicator(indicator)` Y `dropIndicatorRef.current = indicator`
   - ✅ Limpiar ambos si `overId === activeId`

5. **handleDragEnd()**
   - ✅ Construir `combined` desde `buildSchedulerRows()`
   - ✅ Sort explícito: `combined.sort((a, b) => a.order - b.order)`
   - ✅ Extraer bloque completo (padre + hijos)
   - 🔴 **Leer desde `dropIndicatorRef.current`** (NO desde `dropIndicator` state)
   - ✅ Generar `reordered[]` con IDs en orden final
   - ✅ Finally: Limpiar `setUpdatingTaskId(null)` y `dropIndicatorRef.current = null`

6. **Actualización Optimista**
   - ✅ Actualizar `scheduler_task.order` en `cotizacion_items`
   - ✅ Actualizar `task.order` en `scheduler.tasks`
   - ✅ UI se actualiza inmediatamente

7. **Persistencia Servidor**
   - ✅ Validar tareas existen y mismo stage/categoría
   - ✅ Transacción Prisma con `order = índice`
   - ✅ Retornar `Array<{ taskId, newOrder }>`

8. **Reconciliación**
   - ✅ Calcular `updatedData` FUERA del setter
   - ✅ Actualizar estado con orden del servidor
   - ✅ Notificar al padre con datos correctos
   - 🔴 **Limpiar `setUpdatingTaskId(null)`** en reconciliación exitosa
   - ✅ NO ejecutar `router.refresh()`

### ❌ DON'T (No Hacer)

1. **NUNCA usar Shadow Map**
   - ❌ No crear estado `visualOrderOverrides`
   - ❌ No pasar como parámetro a funciones
   - ❌ No implementar `getEffectiveOrder()`

2. **NUNCA pre-ordenar antes de jerarquía**
   - ❌ No hacer sort adicional antes de `reorderWithHierarchy()`
   - ❌ No usar `sortCotizacionItemsBySchedulerOrder()`

3. **NUNCA usar router.refresh()**
   - ❌ No forzar recarga después de reconciliación
   - ❌ Confiar en la actualización de estado

4. **NUNCA omitir sort en combined**
   - ❌ No confiar solo en orden de `reorderWithHierarchy()`
   - ✅ Siempre hacer `combined.sort((a, b) => a.order - b.order)`

5. **🔴 NUNCA usar setUpdatingTaskIdRef.current() como función**
   - ❌ `setUpdatingTaskIdRef.current(null)` → Error, bloquea todos los drags
   - ✅ `setUpdatingTaskId(null)` → Correcto
   - **Ubicación**: Timeout de backup (8s) en `handleDragEnd()`

6. **🔴 NUNCA leer dropIndicator state en handleDragEnd**
   - ❌ `if (dropIndicator && !dropIndicator.insertBefore)` → Puede ser null
   - ✅ `const effectiveDropIndicator = dropIndicatorRef.current` → Siempre correcto
   - **Razón**: React re-render puede limpiar el state antes de leer

---

## 11. Casos de Borde y Soluciones

### 11.1 Rebote Visual

**Problema**: UI rebota después de reordenar.

**Causa**: `router.refresh()` fuerza recarga completa.

**Solución**: 
- ❌ Eliminar `router.refresh()` del flujo
- ✅ Confiar en reconciliación con datos del servidor

### 11.2 Orden Inconsistente

**Problema**: `combined` no está ordenado correctamente.

**Causa**: Falta sort explícito después de construir array.

**Solución**:
```typescript
combined.sort((a, b) => a.order - b.order);
```

### 11.3 Hijos No Se Mueven con Padre

**Problema**: Al mover padre, los hijos quedan atrás.

**Causa**: No se extrae bloque completo (padre + hijos).

**Solución**:
```typescript
const childrenOfActive = combined.filter(
  e => getParentId(e) === activeId
);
const block = [activeEntry, ...childrenOfActive];
```

### 11.4 Error de Servidor

**Problema**: Servidor retorna error, UI queda desincronizada.

**Causa**: No hay rollback al orden anterior.

**Solución**:
```typescript
if (!result.success) {
  // Revertir usando taskIdToOldOrder
  const rollbackData = /* ... */;
  setLocalEventData(rollbackData);
}
```

### 11.5 🔴 CRÍTICO: Timeout de Limpieza Roto

**Problema**: Después del primer drag, **TODOS** los drags subsecuentes quedan bloqueados. El usuario arrastra visualmente pero no se ejecuta el reordenamiento.

**Síntoma**: 
- Primer drag → funciona ✅
- Drags subsecuentes → visualmente arrastra pero no reordena ❌
- NO aparecen logs de `handleDragEnd`

**Causa**: Error en línea 1527 de `EventScheduler.tsx`:
```typescript
// ❌ ERROR (intenta llamar .current como función):
setUpdatingTaskIdRef.current(null);

// Variable correcta es:
const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
```

**Efecto Cascada**:
1. `updatingTaskId` se activa al iniciar drag
2. Timeout de 8s intenta limpiarlo pero **FALLA** por el error
3. `updatingTaskId` **nunca se limpia**
4. Línea 2712 de `SchedulerSidebar.tsx` bloquea drags:
   ```typescript
   disableDrag: updatingTaskId != null,  // ← Bloquea si no es null
   ```
5. Todos los drags subsecuentes quedan deshabilitados

**Solución**:
```typescript
// ✅ CORRECTO:
if (reorderBackupClearRef.current) clearTimeout(reorderBackupClearRef.current);
reorderBackupClearRef.current = setTimeout(() => {
  reorderBackupClearRef.current = null;
  setUpdatingTaskId(null);  // ← Usar el setter correcto
}, 8000);
```

**Ubicación**: `EventScheduler.tsx` línea ~1527

**Validación**: Si los drags no funcionan después del primero, verificar:
```typescript
// En DevTools Console durante drag bloqueado:
console.log(updatingTaskId);  // Si NO es null → bug activo
```

---

### 11.6 🔴 CRÍTICO: dropIndicator Perdido

**Problema**: Al mover tarea desde pos 0 a pos 1 (debajo del siguiente), **el orden no cambia**. La tarea "rebota" a su posición original.

**Síntoma**:
- Drag funciona visualmente
- `handleDragEnd` SÍ se ejecuta
- Pero orden calculado es idéntico al original: `[0,1,2] → [0,1,2]`

**Causa**: El estado `dropIndicator` se limpia **ANTES** de llegar al cálculo de `finalInsertIndex`:

```typescript
// En handleSchedulerDragOver:
setDropIndicator({ overId, insertBefore: false });  // ✅ Se setea

// En handleSchedulerDragEnd:
const finalInsertIndex = 
  dropIndicator && !dropIndicator.insertBefore ? overIndexInRest + 1 : overIndexInRest;
//    ↑ dropIndicator es NULL aquí → finalInsertIndex = 0 siempre
```

**Por qué se pierde**:
1. React re-renderiza entre `onDragOver` y `onDragEnd`
2. El estado `dropIndicator` puede ser null al momento de leer
3. Sin `insertBefore`, el algoritmo no sabe si va arriba/abajo

**Efecto**:
```typescript
overIndexInRest = 0  // Shooting está en rest[0]
dropIndicator = null // ← Se perdió
finalInsertIndex = 0 // Fallback: sin !insertBefore
// Resultado: [...rest.slice(0, 0), block, ...rest.slice(0)]
//          = [block, ...rest] = [custom, shooting, asistencia]
//          = ORDEN ORIGINAL (no cambió nada)
```

**Solución**: Agregar `dropIndicatorRef` que persiste durante todo el drag:

```typescript
// 1. Declarar ref (persiste durante re-renders):
const dropIndicatorRef = useRef<{ overId: string; insertBefore: boolean } | null>(null);

// 2. Sincronizar ref con estado en handleSchedulerDragOver:
const indicator = { overId, insertBefore };
setDropIndicator(indicator);
dropIndicatorRef.current = indicator;  // ← Guarda en ref

// 3. Usar ref en handleSchedulerDragEnd:
const effectiveDropIndicator = dropIndicatorRef.current;  // ← Lee desde ref
const finalInsertIndex = 
  effectiveDropIndicator && !effectiveDropIndicator.insertBefore 
    ? overIndexInRest + 1 
    : overIndexInRest;

// 4. Limpiar ambos en finally:
setDropIndicator(null);
dropIndicatorRef.current = null;
```

**Ubicación**: 
- Declaración: `EventScheduler.tsx` línea ~276
- Uso: `EventScheduler.tsx` línea ~1437

**Validación**: Si el orden no cambia al mover, agregar log:
```typescript
console.log('dropIndicator:', dropIndicator, 'dropIndicatorRef:', dropIndicatorRef.current);
// Si dropIndicator=null pero dropIndicatorRef tiene valor → bug resuelto
```

---

## 12. Debugging y Troubleshooting

### 12.1 Verificar Orden en BD

```sql
SELECT id, name, order, parent_id, category
FROM studio_scheduler_event_tasks
WHERE scheduler_instance_id = 'xxx'
  AND category = 'PLANNING'
ORDER BY order ASC;
```

### 12.2 Verificar Estado Local

```typescript
// En DevTools Console
console.log('Items:', localEventData.cotizaciones
  ?.flatMap(c => c.cotizacion_items)
  ?.map(i => ({ 
    id: i.id, 
    order: i.scheduler_task?.order 
  }))
);

console.log('Manual Tasks:', localEventData.scheduler?.tasks
  ?.map(t => ({ 
    id: t.id, 
    order: t.order 
  }))
);
```

### 12.3 Verificar Combined Array

```typescript
// Agregar log temporal en handleDragEnd
console.log('Combined:', combined.map(e => ({ 
  id: e.taskId, 
  order: e.order 
})));
```

---

## 13. Historial de Versiones

| Versión | Fecha | Descripción | Estado |
|---------|-------|-------------|--------|
| **V1 (Shadow Map)** | 2026-02-15 | Implementación con `visualOrderOverrides` | ❌ Deprecado (rebote visual) |
| **V2 (Simple)** | 2026-02-16 AM | Restauración de algoritmo simple sin Shadow Map | ⚠️ Bugs críticos |
| **V2.1 (Fix Crítico)** | 2026-02-16 PM | Fix de `updatingTaskId` y `dropIndicatorRef` | ⚠️ Bugs en extremos/adyacentes |
| **V2.2 (Fix insertBefore)** | 2026-02-16 PM | Detección de posiciones extremas y adyacentes | ✅ Funcional (Estable) |

**Cambios en V2.1**:
- 🔴 **Bug #1 (Drags bloqueados)**: Corregido timeout de limpieza usando `setUpdatingTaskId(null)` en lugar de `setUpdatingTaskIdRef.current(null)`
- 🔴 **Bug #2 (Orden no cambia)**: Agregado `dropIndicatorRef` para persistir `dropIndicator` entre renders, usado en `handleDragEnd` en lugar del state

**Cambios en V2.2**:
- 🔴 **Bug #3 (NaN en overlayPos)**: `event.active.rect.current` retornaba `null`, causando `overlayPos.y: NaN` → **Solución**: obtener coordenadas iniciales desde `activeElement.getBoundingClientRect()` directamente del DOM
- 🔴 **Bug #4 (Rebote en extremos)**: Imposible arrastrar elemento a última posición desde arriba → **Solución**: detectar `isLastInScope && activeIsAbove` y forzar `insertBefore: false`
- 🔴 **Bug #5 (Rebote en adyacentes)**: Threshold 50% causaba rebote en swaps simples → **Solución**: detectar casos adyacentes con lógica forzada basada en dirección del arrastre
- ✅ **Lógica mejorada en `handleDragOver`**: 
  - **CASO 1**: Último elemento + arrastre desde arriba → `insertBefore: false`
  - **CASO 2**: Primer elemento + arrastre desde abajo → `insertBefore: true`
  - **CASO 3**: Elementos adyacentes, active arriba → `insertBefore: false` (swap down)
  - **CASO 4**: Elementos adyacentes, active abajo → `insertBefore: true` (swap up)
  - **Caso normal**: threshold 40% para casos no extremos ni adyacentes

---

## 14. Referencias

### Archivos Clave

| Archivo | Líneas Relevantes | Descripción |
|---------|-------------------|-------------|
| `EventScheduler.tsx` | ~276 | Declaración de `dropIndicatorRef` |
| `EventScheduler.tsx` | ~1094-1141 | handleDragStart() + bloqueo de drags concurrentes |
| `EventScheduler.tsx` | ~1141-1196 | handleDragOver() + sincronización de `dropIndicatorRef` |
| `EventScheduler.tsx` | ~1196-1580 | handleDragEnd() + uso de `dropIndicatorRef.current` |
| `EventScheduler.tsx` | ~1527 | Fix crítico: timeout de limpieza con `setUpdatingTaskId(null)` |
| `scheduler-section-stages.ts` | 519-578, 748-1099 | reorderWithHierarchy() + buildSchedulerRows() |
| `scheduler-actions.ts` | 1558-1622 | reorderSchedulerTasksToOrder() |
| `SchedulerSidebar.tsx` | ~2712 | disableDrag: bloqueo por `updatingTaskId != null` |

### Documentos Relacionados

- `ISRAEL-ALGORITHM-CATEGORY-REORDER-MASTER.md` → Reordenamiento de categorías
- `SCHEDULER_MASTER_SPEC.md` → Especificación general del Scheduler

---

## 15. Mantenimiento y Evolución

### Antes de Modificar

1. ✅ Leer este documento completo
2. ✅ Entender por qué funcionaba la versión simple
3. ✅ Identificar el problema específico a resolver
4. ✅ Proponer solución sin transgredir principios

### Al Agregar Mejoras

1. ✅ Mantener arquitectura simple
2. ✅ No reintroducir Shadow Map a menos que sea absolutamente necesario
3. ✅ Actualizar este documento con los cambios
4. ✅ Probar exhaustivamente antes de commitear

### Si Algo se Rompe

1. ✅ Consultar este documento primero
2. ✅ Verificar que se sigan los principios fundamentales
3. ✅ Revisar commit `3025fd63` como referencia funcional
4. ✅ No intentar "arreglos rápidos" que transgredan la arquitectura

---

## 16. Issues Conocidos y Fixes

### Issue #1: Tareas Custom/Manuales no Reconocen Drag & Drop

**Fecha**: 2026-02-17  
**Síntoma**: Al arrastrar una tarea custom/manual, aparece el mensaje:
```
"Usa el menú 'Mover a otro estado' para cambiar de sección"
```

**Causa Raíz**:
Las tareas custom/manuales tienen `catalog_section_id: undefined` en ciertos casos. Cuando `resolveActiveDragDataById()` construye el `stageKey`, usa:

```typescript
stageKey: `${manual.catalog_section_id ?? SIN_CATEGORIA_SECTION_ID}-${manual.category}`
// Resultado: '__sin_categoria__-PRODUCTION' ❌
```

Pero visualmente la tarea está renderizada en:
```
overStage: 'cmiqfsulg0000ilguop4h0e81-PRODUCTION' ✅
```

El `scopeMatch` falla porque compara diferentes `stageKey`, bloqueando el drag & drop.

**Fix Aplicado**:
En `EventScheduler.tsx` → `resolveActiveDragDataById()`, derivar `sectionId` desde `catalog_category_id` cuando `catalog_section_id` es `undefined`:

```typescript
// ✅ FIX: Si catalog_section_id es undefined, derivarlo desde catalog_category_id
let sectionId = manual.catalog_section_id;
if (!sectionId && manual.catalog_category_id) {
  sectionId = getSectionIdFromCatalog(manual.catalog_category_id);
}

const resolved = {
  taskId: String(id),
  isManual: true,
  catalogCategoryId: manual.catalog_category_id ?? null,
  stageKey: `${sectionId ?? SIN_CATEGORIA_SECTION_ID}-${manual.category ?? 'PLANNING'}`,
};
```

**Ubicación del Fix**:
- Archivo: `src/app/[slug]/studio/business/events/[eventId]/scheduler/components/layout/EventScheduler.tsx`
- Función: `resolveActiveDragDataById` (línea ~1097-1120)
- Helper usado: `getSectionIdFromCatalog(catalogCategoryId)` (línea ~1063-1076)

**Validación**:
El drag & drop de tareas custom ahora funciona correctamente dentro de su categoría y stage, respetando las reglas de scope.

---

**Documento consolidado**: 2026-02-16  
**Última actualización**: 2026-02-17  
**Autor**: Sistema de reordenamiento funcional del Scheduler  
**Commit de referencia**: `3025fd63` (versión funcional sin rebote)
