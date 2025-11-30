# Análisis: Edición de Cotizaciones Autorizadas

## 📋 Contexto Actual

### Flujo de Autorización

1. Usuario crea cotización en promesa (`studio_cotizaciones` + `studio_cotizacion_items`)
2. Al autorizar:
   - Se crea evento (`studio_events`)
   - Se guardan **snapshots** en `cotizacion_items` (`*_snapshot`)
   - Se vincula cotización al evento (`evento_id`)
   - Se cambia status a `aprobada`

### Relaciones Críticas

```
studio_cotizaciones (promise_id) ← Fuente única de verdad
  ├─ studio_cotizacion_items
  │   ├─ scheduler_task_id → studio_scheduler_event_tasks (único)
  │   └─ assigned_to_crew_member_id → crew member
  └─ studio_pagos (cotizacion_id)
```

## 🚨 Problemática

### Escenario 1: Usuario quiere modificar cotización autorizada

**Situación actual:**

- `updateCotizacion()` bloquea edición si `status === 'aprobada'` (línea 832)
- Usuario solo puede **cancelar** la cotización

**Problemas al cancelar:**

1. **Scheduler Tasks**:
   - `studio_scheduler_event_tasks.cotizacion_item_id` es único
   - Si se elimina `cotizacion_item` → se rompe la relación
   - Tareas ya creadas perderían referencia

2. **Crew Assignments**:
   - `assigned_to_crew_member_id` se perdería
   - Personal ya asignado perdería su asignación

3. **Pagos**:
   - `studio_pagos.cotizacion_id` mantiene referencia histórica
   - Pero el evento se eliminaría (si es única cotización)
   - Perdería contexto de qué se pagó

4. **Consistencia de Datos**:
   - Snapshots (`*_snapshot`) quedarían huérfanos
   - Evento perdería su cotización autorizada
   - Promesa volvería a etapa anterior

### Escenario 2: Usuario necesita agregar/quitar items

**Casos de uso reales:**

- Cliente solicita agregar servicio adicional
- Cliente quiere quitar servicio no necesario
- Ajuste de cantidades

**Restricciones actuales:**

- No puede editar (bloqueado)
- Cancelar es destructivo (pierde scheduler/crew/pagos)

## 💡 Soluciones Propuestas

### Opción A: **Sistema de Revisiones/Versionado** ⭐ RECOMENDADA

**Concepto:** Crear nueva cotización como "revisión" manteniendo la original.

**Flujo:**

1. Usuario solicita "Crear revisión" desde evento
2. Sistema crea nueva cotización con:
   - Mismo `promise_id` (fuente única)
   - Status `pendiente` o `revision`
   - Copia de items actuales (desde catálogo, no snapshots)
3. Usuario edita la nueva cotización libremente
4. Al autorizar la revisión:
   - Nueva cotización se marca `aprobada`
   - Original se marca `reemplazada` o `archivada`
   - **Migración de dependencias:**
     - Scheduler tasks: Reasignar `cotizacion_item_id` a nuevos items (si coinciden)
     - Crew assignments: Migrar asignaciones
     - Pagos: Mantener referencia a original (histórico) + nueva (activa)

**Pros:**

- ✅ Mantiene historial completo
- ✅ Permite edición sin perder trabajo previo
- ✅ Migración controlada de dependencias
- ✅ Auditabilidad total

**Contras:**

- ⚠️ Complejidad media-alta
- ⚠️ Requiere lógica de migración de dependencias
- ⚠️ Múltiples cotizaciones por evento

**Implementación:**

```typescript
// Nuevo campo en schema
model studio_cotizaciones {
  revision_of_id String? // ID de cotización original
  revision_number Int @default(1)
  // ...
}

// Nueva acción
async function crearRevisionCotizacion(
  cotizacionOriginalId: string,
  cambios: { items: {...}, precio: number }
) {
  // 1. Crear nueva cotización
  // 2. Copiar items desde catálogo (no snapshots)
  // 3. Aplicar cambios
  // 4. Marcar original como "revision_pending"
}
```

---

### Opción B: **Edición Controlada con Validaciones**

**Concepto:** Permitir edición pero con restricciones estrictas.

**Reglas:**

1. **Items con dependencias NO eliminables:**
   - Si tiene `scheduler_task_id` → no eliminar
   - Si tiene `assigned_to_crew_member_id` → no eliminar
   - Si tiene pagos asociados → no eliminar

2. **Items modificables:**
   - Solo cantidad (si no afecta scheduler)
   - Solo precio unitario (recalcular total)

3. **Items agregables:**
   - Siempre permitido

4. **Sincronización:**
   - Al editar, actualizar snapshots de items modificados
   - Mantener snapshots de items no modificados

**Pros:**

- ✅ Más simple que versionado
- ✅ Permite ajustes menores
- ✅ Mantiene integridad de dependencias

**Contras:**

- ⚠️ Limitado (no puede eliminar items con dependencias)
- ⚠️ Puede crear inconsistencias si scheduler ya avanzó
- ⚠️ Complejidad en validaciones

**Implementación:**

```typescript
async function updateCotizacionAutorizada(
  cotizacionId: string,
  cambios: UpdateData
) {
  // 1. Validar items a eliminar
  const itemsConDependencias = await verificarDependencias(itemsAEliminar);
  if (itemsConDependencias.length > 0) {
    throw new Error("No se pueden eliminar items con dependencias");
  }

  // 2. Actualizar items modificables
  // 3. Agregar nuevos items
  // 4. Actualizar snapshots de items modificados
}
```

---

### Opción C: **Modo "Add-on" (Solo Agregar)**

**Concepto:** Permitir solo agregar items, nunca eliminar/modificar existentes.

**Flujo:**

1. Usuario puede agregar nuevos items
2. No puede eliminar items existentes
3. No puede modificar cantidades/precios de items existentes
4. Nueva cotización "adicional" se crea automáticamente

**Pros:**

- ✅ Simple de implementar
- ✅ No rompe dependencias
- ✅ Mantiene integridad

**Contras:**

- ⚠️ Muy limitado
- ⚠️ No resuelve caso de "quitar servicio"
- ⚠️ Puede crear múltiples cotizaciones confusas

---

### Opción D: **Bloquear Edición + Workflow de Cancelación Inteligente**

**Concepto:** Mantener bloqueo pero mejorar cancelación.

**Mejoras:**

1. **Cancelación con preservación:**
   - No eliminar scheduler tasks (marcar como "orphaned")
   - No eliminar crew assignments (marcar como "pending_reassignment")
   - Mantener pagos históricos
   - Crear nueva cotización automáticamente

2. **Workflow guiado:**
   - Wizard que muestra impacto de cancelación
   - Opción de "migrar" dependencias a nueva cotización
   - Confirmación explícita

**Pros:**

- ✅ Mantiene simplicidad actual
- ✅ Mejora UX de cancelación
- ✅ Preserva datos históricos

**Contras:**

- ⚠️ Sigue siendo destructivo (requiere cancelar)
- ⚠️ Workflow complejo para usuario
- ⚠️ Puede crear inconsistencias temporales

---

## 🎯 Recomendación: Opción A (Sistema de Revisiones)

### Razones:

1. **Flexibilidad total:** Permite cualquier cambio
2. **Preserva historial:** Auditabilidad completa
3. **Migración controlada:** Dependencias se manejan explícitamente
4. **Escalable:** Soporta múltiples revisiones

### Implementación Sugerida:

#### Fase 1: Schema

```prisma
model studio_cotizaciones {
  // ... campos existentes
  revision_of_id String?
  revision_number Int @default(1)
  revision_status String? // 'active', 'replaced', 'superseded'

  revision_of studio_cotizaciones? @relation("CotizacionRevision", fields: [revision_of_id], references: [id])
  revisions studio_cotizaciones[] @relation("CotizacionRevision")
}
```

#### Fase 2: Acción de Crear Revisión

```typescript
async function crearRevisionCotizacion(
  cotizacionOriginalId: string,
  studioSlug: string,
  cambios: RevisionData
) {
  // 1. Validar que original está autorizada
  // 2. Crear nueva cotización con revision_of_id
  // 3. Copiar items desde catálogo (no snapshots)
  // 4. Aplicar cambios del usuario
  // 5. Marcar original como "revision_pending"
}
```

#### Fase 3: Autorizar Revisión con Migración

```typescript
async function autorizarRevisionCotizacion(
  revisionId: string,
  migrarDependencias: boolean
) {
  // 1. Autorizar nueva cotización (normal)
  // 2. Si migrarDependencias:
  //    - Mapear items antiguos → nuevos (por item_id)
  //    - Reasignar scheduler_task.cotizacion_item_id
  //    - Migrar assigned_to_crew_member_id
  // 3. Marcar original como "replaced"
  // 4. Actualizar evento para usar nueva cotización
}
```

#### Fase 4: UI

- Botón "Crear Revisión" en `EventCotizacionesCard`
- Modal que muestra:
  - Items actuales (desde snapshots)
  - Opción de editar/agregar/eliminar
  - Preview de impacto en scheduler/crew
- Wizard de autorización con opción de migrar dependencias

---

## 📊 Comparación de Opciones

| Criterio           | Opción A (Revisiones) | Opción B (Controlada) | Opción C (Add-on) | Opción D (Cancelación) |
| ------------------ | --------------------- | --------------------- | ----------------- | ---------------------- |
| Flexibilidad       | ⭐⭐⭐⭐⭐            | ⭐⭐⭐                | ⭐⭐              | ⭐                     |
| Complejidad        | ⭐⭐⭐                | ⭐⭐⭐⭐              | ⭐⭐              | ⭐⭐⭐                 |
| Preserva Historial | ⭐⭐⭐⭐⭐            | ⭐⭐⭐                | ⭐⭐⭐            | ⭐⭐                   |
| UX                 | ⭐⭐⭐⭐              | ⭐⭐⭐                | ⭐⭐              | ⭐⭐                   |
| Integridad Datos   | ⭐⭐⭐⭐⭐            | ⭐⭐⭐⭐              | ⭐⭐⭐⭐⭐        | ⭐⭐⭐                 |

---

## 🔄 Próximos Pasos

1. **Validar con usuario** cuál opción prefiere
2. **Diseñar UI/UX** para la opción seleccionada
3. **Implementar schema** (si Opción A)
4. **Desarrollar acciones** de servidor
5. **Crear componentes** de UI
6. **Testing** exhaustivo de migración de dependencias
