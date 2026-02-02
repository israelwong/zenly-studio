# Kanban de Promesas - ZEN Platform

**Última Actualización:** 2025-01-26  
**Estado:** ✅ Implementado

---

## 📋 Resumen

El Kanban de Promesas permite visualizar y gestionar prospectos organizados por etapas del pipeline. Las promesas se ordenan automáticamente por fecha y se pueden mover entre columnas mediante drag & drop.

---

## 🎯 Características Principales

### Ordenamiento Automático

Las promesas se ordenan **estrictamente por fecha** siguiendo esta prioridad:

1. **event_date** (fecha del evento confirmado)
2. **interested_dates[0]** (primera fecha de interés)
3. **defined_date** (fecha definida legacy)
4. **updated_at** (fecha de actualización, más reciente primero)

**⚠️ Importante:** No hay ordenamiento manual. El campo `order` existe en el schema pero no se utiliza.

### Drag & Drop

- **Movimiento entre columnas:** Permite mover promesas entre etapas del pipeline
- **Validaciones de transición:** Previene movimientos inválidos (ej: Pendiente → Aprobado)
- **Sin reordenamiento manual:** No se puede reordenar dentro de la misma columna

### Badge de Recordatorio

Cada tarjeta del Kanban muestra un badge informativo con la fecha del próximo seguimiento (si existe):

- 🔴 **Rojo (destructive):** Seguimiento vencido
- 🟡 **Amarillo (warning):** Seguimiento para hoy
- ⚪ **Gris (default):** Seguimiento futuro (muestra fecha)

**Nota:** El badge es puramente informativo. No es funcional (no abre modal ni navega).

---

## 🏗️ Arquitectura

### Componentes

```
src/app/[slug]/studio/commercial/promises/components/
├── PromisesKanban.tsx          # Componente principal del Kanban
└── PromiseKanbanCard.tsx       # Tarjeta individual (con badge de recordatorio)
```

### Server Actions

```
src/lib/actions/studio/commercial/promises/
└── promises.actions.ts         # movePromise() para mover entre etapas
```

### Flujo de Drag & Drop

```
1. Usuario arrastra tarjeta
   ↓
2. handleDragStart() identifica la promesa y su etapa actual
   ↓
3. Usuario suelta sobre otra columna
   ↓
4. handleDragEnd() valida:
   - Es una etapa válida
   - La transición está permitida
   - No hay restricciones especiales (ej: evento asociado)
   ↓
5. Actualización optimista en UI
   ↓
6. Server Action movePromise() actualiza pipeline_stage_id
   ↓
7. Revalidación de paths
```

### Validaciones de Transición

- ❌ **Pendiente/Negociación → Cierre/Aprobado:** Requiere acciones específicas en cotizaciones
- ❌ **Cierre → Pendiente/Negociación/Aprobado:** Solo puede ir a Archivado/Cancelado
- ❌ **Aprobado con evento → Otra etapa:** Solo puede archivarse

---

## 🎨 UI/UX

### Tarjeta del Kanban (PromiseKanbanCard)

**Elementos visuales:**
- Avatar del contacto
- Nombre (limitado a 2 palabras)
- Tipo de evento
- **Badge de recordatorio** (si existe)
- Fecha del evento
- Tags
- Cotizaciones pendientes
- Agendamiento (si existe)

**Acciones:**
- Click: Navega a detalle de la promesa
- Drag handle: Arrastrar para mover
- Menú de opciones: Archivar/Eliminar

### Badge de Recordatorio

```tsx
{reminderDate && (
  <ZenBadge
    variant={
      new Date(reminderDate) < new Date()
        ? 'destructive'
        : new Date(reminderDate).toDateString() === new Date().toDateString()
        ? 'warning'
        : 'default'
    }
  >
    <Clock className="h-2.5 w-2.5" />
    {formattedDate}
  </ZenBadge>
)}
```

---

## 🔧 Detalles Técnicos

### Ordenamiento en sortedPromises

```typescript
const sortedPromises = useMemo(() => {
  return [...filteredPromises].sort((a, b) => {
    const getEventDate = (promise: PromiseWithContact): number => {
      if (promise.event_date) return new Date(promise.event_date).getTime();
      if (promise.interested_dates?.[0]) return new Date(promise.interested_dates[0]).getTime();
      if (promise.defined_date) return new Date(promise.defined_date).getTime();
      return 0;
    };

    const dateA = getEventDate(a);
    const dateB = getEventDate(b);

    if (dateA !== 0 && dateB !== 0) return dateA - dateB;
    if (dateA !== 0) return -1;
    if (dateB !== 0) return 1;
    
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}, [filteredPromises]);
```

### Carga de Recordatorio en Tarjeta

```typescript
useEffect(() => {
  const loadReminder = async () => {
    const reminderResult = await getReminderByPromise(studioSlug, promiseId);
    if (reminderResult.success && reminderResult.data && !reminderResult.data.is_completed) {
      setReminderDate(reminderResult.data.reminder_date);
    }
  };
  loadReminder();
}, [promise.promise_id, studioSlug]);
```

---

## 📝 Notas de Implementación

1. **Campo `order` no utilizado:** Existe en el schema pero no se usa. Las promesas se ordenan solo por fecha.

2. **Simplificación de handleDragEnd:** Solo maneja movimiento entre columnas. No hay lógica de reordenamiento dentro de la misma columna.

3. **Badge informativo:** El badge de recordatorio es solo visual. No tiene funcionalidad interactiva.

4. **Optimistic Updates:** La UI se actualiza inmediatamente al mover una promesa, antes de que termine la Server Action.

---

**Última Actualización:** 2025-01-26  
**Versión:** 1.0
