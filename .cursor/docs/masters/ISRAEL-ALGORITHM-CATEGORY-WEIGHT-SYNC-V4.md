# ISRAEL ALGORITHM V4.0: Sincronización de Peso de Categoría

## Problema Original

Cuando se reordenaban ítems en el scheduler, las **categorías "rebotaban"** a su posición anterior. Esto ocurría porque:

1. El campo `order` en `studio_scheduler_event_tasks` solo contenía el índice secuencial de la tarea (0, 1, 2...)
2. Este `order` no estaba sincronizado con el `order` de la categoría padre en `studio_section_categories`
3. Al hacer `router.refresh()`, el servidor devolvía datos con el orden de categorías antiguo
4. La UI mostraba las categorías en su posición anterior, causando el efecto de "rebote"

## Solución: Sistema de Peso de Categoría

### Concepto

El `order` de cada tarea ahora incluye un **"peso de categoría"** que refleja la posición actual de su categoría padre:

```
taskOrder = (categoryOrder * 1000) + indexInCategory
```

**Ejemplo:**
- Categoría 0: tareas tienen order 0, 1, 2...
- Categoría 1: tareas tienen order 1000, 1001, 1002...
- Categoría 2: tareas tienen order 2000, 2001, 2002...

Esto permite hasta **999 tareas por categoría**.

### Flujo de Sincronización

#### 1. Persistencia (Server Action)

```typescript
// scheduler-actions.ts: reorderSchedulerTasksToOrder()

// PASO 1: Consultar order de categoría padre
const sectionCategory = await prisma.studio_section_categories.findUnique({
  where: { category_id: targetCatId },
  select: { order: true },
});

const categoryOrder = sectionCategory?.order ?? 0;
const categoryWeightBase = categoryOrder * 1000;

// PASO 2: Calcular order con peso
for (let index = 0; index < taskIdsInOrder.length; index++) {
  const newOrder = categoryWeightBase + index;
  
  await tx.studio_scheduler_event_tasks.update({
    where: { id: taskId },
    data: { order: newOrder },
  });
}
```

#### 2. Serialización (obtenerEventoDetalle)

```typescript
// events.actions.ts

const itemsOrdenados = [...cot.cotizacion_items].sort((a, b) => {
  const taskOrderA = a.scheduler_task?.order;
  const taskOrderB = b.scheduler_task?.order;
  
  if (hasOrderA && hasOrderB) {
    // El order ya incluye peso de categoría
    // (categoryOrder * 1000) + taskIndex
    // El sort respeta automáticamente ambos niveles
    return taskOrderA! - taskOrderB!;
  }
  
  // Fallback para items sin scheduler_task
  return (a.order ?? 0) - (b.order ?? 0);
});
```

#### 3. Actualización Optimista (EventScheduler)

```typescript
// EventScheduler.tsx

if (result.data) {
  // V4.0: result.data.newOrder incluye peso de categoría
  const orderMap = new Map(result.data.map((t) => [t.taskId, t.newOrder]));
  
  setLocalEventData((prev) => ({
    ...prev,
    cotizaciones: prev.cotizaciones?.map((cot) => ({
      ...cot,
      cotizacion_items: cot.cotizacion_items?.map((item) => {
        const newOrder = orderMap.get(item.scheduler_task?.id);
        return newOrder !== undefined 
          ? { ...item, scheduler_task: { ...item.scheduler_task, order: newOrder } }
          : item;
      }),
    })),
  }));
}

// NO hacer router.refresh() inmediato
// El Shadow Map optimista se mantiene hasta el próximo navigation natural
```

## Arquitectura de Datos

### Relaciones

```
studio_scheduler_event_tasks
  └─ catalog_category_id → studio_service_categories
                              └─ id (category_id) ← studio_section_categories
                                                       └─ order (peso base)
```

### Campos Clave

**studio_section_categories:**
- `category_id`: UNIQUE, FK a studio_service_categories
- `order`: Posición de la categoría en la sección (0, 1, 2...)

**studio_scheduler_event_tasks:**
- `catalog_category_id`: FK a studio_service_categories
- `order`: Orden con peso de categoría = (categoryOrder * 1000) + taskIndex

## Ventajas del Sistema

### 1. Persistencia de Posición de Categoría
Al mover un ítem, el `order` de la tarea "sella" la posición actual de la categoría. No depende de índices huérfanos.

### 2. Sort Natural en Serialización
Un simple `sort((a, b) => a.order - b.order)` respeta automáticamente:
1. Primero: orden de categorías
2. Luego: orden de tareas dentro de cada categoría

### 3. Shadow Map Optimista Estable
El estado optimista local no se ve afectado por refreshes del servidor con datos "obsoletos". El `order` persistido es la "verdad absoluta".

### 4. Compatibilidad con Futuras Migraciones
Si en el futuro se necesita recalcular todos los `order`, simplemente:
1. Consultar el `order` de cada categoría desde `studio_section_categories`
2. Aplicar la fórmula: `categoryOrder * 1000 + taskIndex`

## Casos Edge

### Categoría sin Order
```typescript
const categoryOrder = sectionCategory?.order ?? 0;
const categoryWeightBase = categoryOrder * 1000;
// Default: peso base = 0, tareas empiezan en 0, 1, 2...
```

### Más de 999 Tareas en una Categoría
**Límite actual:** 999 tareas por categoría (weight 1000-1999, 2000-2999, etc.)

Si se necesita más, cambiar el multiplicador:
```typescript
const CATEGORY_WEIGHT = 10000; // Permite 9999 tareas
const categoryWeightBase = categoryOrder * CATEGORY_WEIGHT;
```

### Tareas Manuales sin Categoría
```typescript
const targetCatId = first.cotizacion_item_id
  ? first.cotizacion_item?.service_category_id ?? first.catalog_category_id ?? null
  : first.catalog_category_id ?? null;

// Si targetCatId es null, categoryOrder = 0, peso = 0
```

## Testing

### Escenario 1: Reordenar Tareas en Misma Categoría
1. Categoría A tiene order = 1 (peso base = 1000)
2. Tareas: [task1, task2, task3]
3. Reordenar a: [task3, task1, task2]
4. Nuevo order: [1002, 1000, 1001]
5. Verificar: sort respeta el nuevo orden dentro de categoría A

### Escenario 2: Reordenar Categorías
1. Sección con categorías: [Cat0, Cat1, Cat2]
2. Reordenar a: [Cat1, Cat0, Cat2]
3. studio_section_categories.order: Cat1=0, Cat0=1, Cat2=2
4. Al reordenar tareas de Cat1, peso base = 0 * 1000 = 0
5. Al reordenar tareas de Cat0, peso base = 1 * 1000 = 1000
6. Verificar: El sort global respeta Cat1 < Cat0 < Cat2

### Escenario 3: Shadow Map Optimista
1. Mover task de Cat0 a Cat1
2. Actualización optimista aplica newOrder con peso de Cat1
3. NO hacer router.refresh()
4. Verificar: La tarea aparece en Cat1 sin rebote
5. Hacer navigation natural (cambiar de página)
6. Verificar: Al volver, la tarea sigue en Cat1 (datos del servidor correctos)

## Migración de Datos Existentes

Si hay datos legacy con `order` sin peso de categoría:

```sql
-- Script de migración (ejecutar una vez)
UPDATE studio_scheduler_event_tasks t
SET order = (
  SELECT (COALESCE(sc.order, 0) * 1000) + t.order
  FROM studio_section_categories sc
  WHERE sc.category_id = t.catalog_category_id
)
WHERE t.catalog_category_id IS NOT NULL;
```

## Referencias

- **Server Action:** `src/lib/actions/studio/business/events/scheduler-actions.ts` → `reorderSchedulerTasksToOrder`
- **Serialización:** `src/lib/actions/studio/business/events/events.actions.ts` → `obtenerEventoDetalle`
- **Actualización Optimista:** `src/app/[slug]/studio/business/events/[eventId]/scheduler/components/layout/EventScheduler.tsx`
- **Schema:** `prisma/schema.prisma` → `studio_section_categories`, `studio_scheduler_event_tasks`

## Changelog

### V4.0 (2026-02-16)
- **FEAT:** Implementar sistema de peso de categoría para sincronización category-task order
- **FIX:** Resolver rebote de categorías tras reordenar ítems
- **REFACTOR:** Actualizar algoritmo de sort en serialización para respetar peso
- **DOCS:** Documentar Shadow Map optimista y evitar router.refresh() inmediato

### V3.3 (Anterior)
- Sort blindado con manejo robusto de nulos
- Priorización de scheduler_task.order sobre cotizacion_item.order

---

**Autor:** Israel Algorithm V4.0  
**Fecha:** Febrero 16, 2026  
**Commits:** c7f9bc79, cff12118
