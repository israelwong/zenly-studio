# Flujo de Trabajo: Edición de Cotizaciones Autorizadas

## 📋 Estado Actual del Sistema

### Bloqueo de Edición Directa

- `updateCotizacion()` **bloquea** edición si `status === 'aprobada'` o `'autorizada'` (línea 836)
- El botón "Editar" en `EventCotizacionesCard` redirige a la página de edición
- La página de edición (`/cotizacion/[cotizacionId]/page.tsx`) permite editar solo si NO está autorizada

## 🔄 Flujo Completo Implementado

### Escenario: Usuario necesita modificar cotización autorizada

#### **Paso 0: Estado inicial de cotización autorizada**

**Características:**

- `status`: `'aprobada'` o `'autorizada'`
- `revision_status`: `'active'` o `null`
- `evento_id`: Vinculada a evento
- `cotizacion_items`: Con snapshots guardados (`*_snapshot`)
- Puede tener dependencias:
  - `scheduler_task_id` → Tareas del scheduler
  - `assigned_to_crew_member_id` → Asignaciones de personal
  - `studio_pagos` → Pagos registrados

---

#### **Paso 1: Usuario ve cotización autorizada en Evento**

**Ubicación:** `EventCotizacionesCard.tsx`

**Estado de la cotización:**

- `status`: `'aprobada'` o `'autorizada'`
- `revision_status`: `'active'` o `null`
- Tiene `cotizacion_items` con snapshots guardados
- Puede tener:
  - Scheduler tasks vinculadas (`scheduler_task_id`)
  - Crew assignments (`assigned_to_crew_member_id`)
  - Pagos registrados (`studio_pagos`)

**UI mostrada:**

- Card con nombre, precio, descuento (si aplica)
- Stats de tareas y crew (completadas/totales, asignaciones)
- Mini avatares del equipo asignado
- Menú dropdown con opciones:
  - ✅ **Ver** → Abre `ResumenCotizacionAutorizada` (muestra snapshots históricos)
  - ⚠️ **Editar** → Redirige a `/cotizacion/[cotizacionId]` → `updateCotizacion()` bloquea ❌
  - ➕ **Crear Revisión** → Abre modal para crear revisión ⭐ **SOLUCIÓN**
  - ❌ **Cancelar** → Cancela cotización (destructivo, elimina evento si es única)

**⚠️ Problema actual con "Editar":**

- Usuario hace clic → Redirige a página de edición
- Usuario modifica y guarda → `updateCotizacion()` retorna error: "No se puede actualizar una cotización autorizada o aprobada"
- **UX confusa:** Botón existe pero no funciona

---

#### **Paso 2: Usuario hace clic en "Crear Revisión"**

**Acción:** `handleCrearRevision(cotizacion)`

**Flujo:**

1. Abre `CrearRevisionCotizacionModal`
2. Modal se pre-puebla con:
   - Nombre: `"{nombre original} - Revisión"`
   - Descripción: Copia de original
   - Precio: Precio original
   - Items: Items desde `cotizacion_items` (usando `item_id` del catálogo)

---

#### **Paso 3: Usuario edita la revisión**

**Componente:** `CrearRevisionCotizacionModal.tsx`

**Capacidades:**

- ✅ Editar nombre
- ✅ Editar descripción
- ✅ Agregar/quitar items del catálogo
- ✅ Modificar cantidades
- ✅ Ajustar precio (calculado o personalizado)

**Restricciones:**

- ⚠️ No puede editar items directamente (usa catálogo actual)
- ⚠️ No puede ver snapshots de la original (usa catálogo)

---

#### **Paso 4: Usuario guarda la revisión**

**Acción:** `crearRevisionCotizacion()`

**Proceso:**

1. **Validaciones:**
   - Studio existe
   - Cotización original existe y está autorizada/aprobada
   - Items válidos (al menos uno con cantidad > 0)

2. **Creación de revisión:**

   ```typescript
   - Nueva cotización creada con:
     * revision_of_id: ID de original
     * revision_number: Número secuencial (1, 2, 3...)
     * revision_status: 'pending_revision'
     * status: 'pendiente'
     * Items creados desde catálogo (NO snapshots)
   ```

3. **Actualización de original:**
   - Si no tiene otras revisiones activas → `revision_status: 'pending_revision'`
   - Mantiene `status: 'aprobada'` (sigue activa hasta que se autorice revisión)

4. **Resultado:**
   - Revisión aparece en sección "Revisiones Pendientes"
   - Original sigue siendo la cotización activa del evento

---

#### **Paso 5: Usuario autoriza la revisión**

**Ubicación:** Sección "Revisiones Pendientes" en `EventCotizacionesCard`

**Acción:** `handleAutorizarRevision(revision)`

**Flujo:**

1. Abre `AutorizarRevisionModal`
2. Usuario selecciona:
   - Condiciones comerciales
   - Monto final (calculado automáticamente)
   - **Checkbox:** "Migrar dependencias automáticamente" (checked por defecto)

---

#### **Paso 6: Sistema autoriza revisión con migración**

**Acción:** `autorizarRevisionCotizacion()`

**Proceso completo:**

1. **Validaciones:**
   - Revisión existe y está pendiente
   - Cotización original existe
   - Evento asociado existe

2. **Guardar snapshots de revisión:**

   ```typescript
   guardarEstructuraCotizacionAutorizada()
   - Crea snapshots de items de la revisión
   - Usa catálogo actual para obtener costos/precios
   ```

3. **Actualizar revisión:**

   ```typescript
   - status: 'aprobada'
   - revision_status: 'active'
   - evento_id: eventoOriginal.id
   - condiciones_comerciales_id: seleccionada
   - discount: calculado si monto < precio
   ```

4. **Marcar original como reemplazada:**

   ```typescript
   - revision_status: 'replaced'
   - Mantiene status: 'aprobada' (histórico)
   ```

5. **Migración de dependencias (si `migrar_dependencias === true`):**

   **a) Mapeo de items:**

   ```typescript
   // Crear mapas item_id → cotizacion_item_id
   itemsOriginalMap: item_id → item.id (original)
   itemsRevisionMap: item_id → item.id (revisión)
   ```

   **b) Migrar Scheduler Tasks:**

   ```typescript
   Para cada item original con scheduler_task_id:
     1. Buscar item en revisión con mismo item_id
     2. Si existe:
        - Actualizar studio_scheduler_event_tasks.cotizacion_item_id
          (de original.id → revision.id)
        - Actualizar cotizacion_item.scheduler_task_id en revisión
   ```

   **c) Migrar Crew Assignments:**

   ```typescript
   Para cada item original con assigned_to_crew_member_id:
     1. Buscar item en revisión con mismo item_id
     2. Si existe:
        - Actualizar cotizacion_item.assigned_to_crew_member_id
          (copiar de original a revisión)
   ```

6. **Actualizar evento:**

   ```typescript
   - evento.cotizacion_id: revision.id (nueva cotización activa)
   ```

7. **Resultado:**
   - ✅ Revisión se convierte en cotización activa
   - ✅ Original queda como histórico (`replaced`)
   - ✅ Scheduler tasks migradas (si items coinciden por `item_id`)
   - ✅ Crew assignments migradas (si items coinciden)
   - ✅ Evento usa revisión como cotización activa

---

## 🎯 Casos de Uso Específicos

### Caso 1: Agregar servicio adicional

**Flujo:**

1. Usuario → "Crear Revisión"
2. En modal, agrega nuevo item del catálogo
3. Guarda revisión
4. Autoriza revisión con migración
5. **Resultado:** Nuevo servicio agregado, dependencias existentes migradas

---

### Caso 2: Quitar servicio

**Flujo:**

1. Usuario → "Crear Revisión"
2. En modal, elimina item del catálogo
3. Guarda revisión
4. Autoriza revisión con migración
5. **Resultado:**
   - Si el item tenía scheduler task → Task queda huérfana (referencia a item original eliminado)
   - Si el item tenía crew assignment → Se pierde asignación
   - ⚠️ **Consideración:** Deberíamos mostrar advertencia si se eliminan items con dependencias

---

### Caso 3: Modificar cantidad de servicio existente

**Flujo:**

1. Usuario → "Crear Revisión"
2. En modal, modifica cantidad de item existente
3. Guarda revisión
4. Autoriza revisión con migración
5. **Resultado:**
   - Item migrado correctamente (mismo `item_id`)
   - Scheduler task y crew assignment migrados
   - Cantidad actualizada

---

### Caso 4: Cambiar precio sin modificar items

**Flujo:**

1. Usuario → "Crear Revisión"
2. En modal, mantiene items pero cambia precio personalizado
3. Guarda revisión
4. Autoriza revisión con migración
5. **Resultado:**
   - Todos los items migrados correctamente
   - Precio actualizado
   - Dependencias intactas

---

## ⚠️ Limitaciones Actuales

### 1. Items eliminados con dependencias

**Problema:**

- Si usuario elimina item que tiene `scheduler_task_id` o `assigned_to_crew_member_id`
- Al autorizar revisión, la migración busca por `item_id`
- Como el item no existe en revisión, la dependencia queda huérfana

**Solución propuesta:**

- Mostrar advertencia en `CrearRevisionCotizacionModal` antes de guardar
- Listar items que tienen dependencias y están siendo eliminados
- Opción: Bloquear eliminación o requerir confirmación explícita

---

### 2. Items agregados sin migración automática

**Problema:**

- Items nuevos en revisión no tienen scheduler tasks ni crew assignments
- Usuario debe crearlos manualmente después

**Solución propuesta:**

- Opción en modal de autorización: "Crear tareas automáticas para items nuevos"
- O simplemente dejar que usuario las cree manualmente (flujo actual)

---

### 3. Múltiples revisiones pendientes

**Problema:**

- Usuario puede crear múltiples revisiones de la misma original
- Solo puede autorizar una a la vez
- No hay UI para comparar revisiones

**Solución propuesta:**

- Mostrar comparación lado a lado antes de autorizar
- O limitar a una revisión pendiente por vez

---

### 4. Botón "Editar" en cotizaciones autorizadas

**Problema actual:**

- Botón "Editar" redirige a página de edición
- Página bloquea edición si está autorizada
- Usuario confundido: ¿por qué hay botón si no puedo editar?

**Solución propuesta:**

- Ocultar botón "Editar" si `status === 'aprobada'` y `revision_status !== 'pending_revision'`
- O mostrar tooltip explicando que debe crear revisión
- O redirigir directamente a "Crear Revisión"

---

## 🔍 Puntos de Mejora Identificados

### 1. Validación de items eliminados con dependencias

**Implementar en:** `CrearRevisionCotizacionModal.tsx`

```typescript
// Antes de guardar, verificar:
const itemsAEliminar = itemsOriginales.filter(
  (item) => !itemsNuevos.includes(item.item_id)
);

const itemsConDependencias = await verificarDependencias(itemsAEliminar);
if (itemsConDependencias.length > 0) {
  // Mostrar advertencia con lista de items
  // Opción: Bloquear guardado o requerir confirmación
}
```

---

### 2. Comparación visual antes de autorizar

**Implementar en:** `AutorizarRevisionModal.tsx`

- Mostrar diff entre original y revisión
- Resaltar items agregados/eliminados/modificados
- Mostrar impacto en dependencias

---

### 3. Historial de revisiones

**Implementar en:** `EventCotizacionesCard.tsx`

- Mostrar todas las revisiones (activas, reemplazadas, pendientes)
- Timeline visual de cambios
- Opción de ver cualquier revisión histórica

---

### 4. Mejorar UX del botón "Editar"

**Problema actual:**

- Botón "Editar" siempre visible
- Redirige a página que bloquea guardado
- Usuario confundido al recibir error

**Opciones:**

- **Opción A:** Ocultar botón si `status === 'aprobada'` y `revision_status !== 'pending_revision'`
- **Opción B:** Cambiar texto a "Crear Revisión" y abrir modal directamente
- **Opción C:** Mostrar tooltip explicativo: "Las cotizaciones autorizadas se editan creando una revisión"
- **Opción D:** Interceptar click y mostrar modal explicativo con opción de crear revisión

**Recomendación:** Opción B (cambiar comportamiento directamente)

---

## 📊 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│  Cotización Autorizada (status: 'aprobada')                │
│  revision_status: 'active' | null                           │
│  Tiene: snapshots, scheduler tasks, crew, pagos             │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                     │
        ▼                   ▼                     ▼
   [Ver]              [Editar]            [Crear Revisión]
        │                   │                     │
        │                   │                     │
        │              ┌────┴────┐                │
        │              │         │                │
        │              ▼         ▼                │
        │        Redirige   updateCotizacion()    │
        │        a página   → BLOQUEADO ❌        │
        │        de edición                        │
        │                                           │
        │                                           ▼
        │                              CrearRevisionCotizacionModal
        │                                           │
        │                                           │
        │                                           ▼
        │                              Usuario edita items/precio
        │                                           │
        │                                           ▼
        │                              [Guardar] → crearRevisionCotizacion()
        │                                           │
        │                                           ├─ Nueva cotización
        │                                           │  revision_status: 'pending_revision'
        │                                           │  status: 'pendiente'
        │                                           │
        │                                           └─ Original
        │                                              revision_status: 'pending_revision'
        │                                              (mantiene status: 'aprobada')
        │
        │                                           │
        │                                           ▼
        │                              ┌────────────────────────────┐
        │                              │ Revisiones Pendientes      │
        │                              │ Aparecen en UI            │
        │                              └────────────────────────────┘
        │                                           │
        │                                           ▼
        │                              [Autorizar Revisión]
        │                                           │
        │                                           ▼
        │                              AutorizarRevisionModal
        │                                           │
        │                                           ├─ Condiciones comerciales
        │                                           ├─ Monto final
        │                                           └─ Migrar dependencias? ✓
        │                                           │
        │                                           ▼
        │                              [Autorizar] → autorizarRevisionCotizacion()
        │                                           │
        │                                           ├─ 1. Guarda snapshots revisión
        │                                           ├─ 2. Revisión → 'aprobada', 'active'
        │                                           ├─ 3. Original → 'replaced'
        │                                           ├─ 4. Migra scheduler tasks (por item_id)
        │                                           ├─ 5. Migra crew assignments (por item_id)
        │                                           └─ 6. Evento → cotizacion_id: revision.id
        │
        │                                           │
        │                                           ▼
        │                              ┌────────────────────────────┐
        │                              │ Revisión es ahora activa   │
        │                              │ Original queda histórico   │
        │                              └────────────────────────────┘
        │
        ▼
ResumenCotizacionAutorizada
(muestra snapshots históricos)
```

---

## 🔍 Flujo Detallado Paso a Paso

### **Caso Real: Cliente solicita agregar servicio**

**1. Usuario en Evento → Ve cotización autorizada**

```
Cotización: "Boda Premium"
Precio: $15,000
Items: 25 servicios
Stats: 18/25 tareas completadas, 5/8 crew asignado
```

**2. Usuario → Menú → "Crear Revisión"**

- Modal se abre
- Pre-poblado con:
  - Nombre: "Boda Premium - Revisión"
  - Items: Los 25 servicios actuales
  - Precio: $15,000

**3. Usuario agrega nuevo servicio**

- Selecciona "Video 4K" del catálogo
- Cantidad: 1
- Precio se recalcula automáticamente: $16,500

**4. Usuario guarda revisión**

- `crearRevisionCotizacion()` ejecuta:
  - Crea nueva cotización con `revision_of_id` apuntando a original
  - `revision_number: 1`
  - `revision_status: 'pending_revision'`
  - Items creados desde catálogo (incluye nuevo servicio)
  - Original mantiene `status: 'aprobada'` pero `revision_status: 'pending_revision'`

**5. UI se actualiza**

- Original sigue en "Cotizaciones Activas"
- Nueva revisión aparece en "Revisiones Pendientes"
- Badge: "Revisión #1"

**6. Usuario → Menú revisión → "Autorizar Revisión"**

- Modal se abre
- Selecciona condiciones comerciales
- Monto: $16,500 (calculado automáticamente)
- Checkbox "Migrar dependencias" está marcado ✓

**7. Usuario autoriza**

- `autorizarRevisionCotizacion()` ejecuta:
  - Guarda snapshots de los 26 items (incluye nuevo)
  - Revisión → `status: 'aprobada'`, `revision_status: 'active'`
  - Original → `revision_status: 'replaced'`
  - **Migración:**
    - Los 25 items originales encuentran match por `item_id` en revisión
    - Scheduler tasks migradas: 18 tareas ahora apuntan a items de revisión
    - Crew assignments migradas: 5 asignaciones copiadas
    - Nuevo servicio (Video 4K) NO tiene dependencias (normal)
  - Evento → `cotizacion_id: revision.id`

**8. Resultado final**

- ✅ Revisión es la cotización activa del evento
- ✅ Todas las dependencias migradas correctamente
- ✅ Nuevo servicio agregado sin problemas
- ✅ Original preservada como histórico
- ✅ Usuario puede continuar trabajando normalmente

---

## ✅ Checklist de Implementación Actual

- [x] Schema con campos de revisión
- [x] Acción `crearRevisionCotizacion()`
- [x] Acción `autorizarRevisionCotizacion()` con migración
- [x] Componente `CrearRevisionCotizacionModal`
- [x] Componente `AutorizarRevisionModal`
- [x] UI en `EventCotizacionesCard` para crear revisión
- [x] UI para mostrar revisiones pendientes
- [x] UI para autorizar revisiones
- [ ] Validación de items eliminados con dependencias
- [ ] Comparación visual antes de autorizar
- [ ] Mejorar UX del botón "Editar"
- [ ] Historial completo de revisiones

---

## 🎯 Próximos Pasos Recomendados

1. **Validar items eliminados:** Implementar advertencia antes de guardar revisión
2. **Mejorar botón "Editar":** Ocultar o cambiar comportamiento para cotizaciones autorizadas
3. **Comparación visual:** Mostrar diff antes de autorizar
4. **Testing:** Probar todos los casos de uso con datos reales
5. **Documentación:** Crear guía de usuario para el flujo de revisiones
