# Pipeline de Promesas: Estados y Routing

## 📊 Estado Actual Implementado

### Pipeline Stages (6 Estados)

El sistema usa **Pipeline Stages** (`studio_promise_pipeline_stages`) como fuente única de verdad para el estado de las promesas.

| Order | Slug | Nombre | Color | Sistema | Descripción |
|-------|------|--------|-------|---------|-------------|
| 0 | `pending` | Pendiente | `#3B82F6` | ✅ | Promesas nuevas sin cotizaciones o con cotizaciones pendientes |
| 1 | `negotiation` | En Negociación | `#8B5CF6` | ❌ | Cotizaciones compartidas para revisión del cliente |
| 2 | `closing` | En Cierre | `#F59E0B` | ✅ | Proceso de cierre (condiciones, contrato, pago inicial) |
| 3 | `approved` | Aprobada | `#10B981` | ✅ | Evento creado desde cotización autorizada |
| 4 | `archived` | Archivada | `#6B7280` | ✅ | Promesas archivadas manualmente |
| 5 | `canceled` | Cancelada | `#EF4444` | ✅ | Promesas canceladas (todas las cotizaciones canceladas) |

**Seed:** `prisma/04-seed-promise-pipeline.ts` crea estos 6 estados por defecto para cada studio.

---

## 🛣️ Sistema de Routing

### Rutas Internas (Studio)

El routing interno usa `determinePromiseState()` que calcula el estado desde cotizaciones y redirige a:

```
/[slug]/studio/commercial/promises/[promiseId]/
├── pendiente/    → Para promesas en pending/negotiation
├── cierre/       → Para promesas en closing
└── autorizada/   → Para promesas en approved
```

**Lógica de `determinePromiseState()`:**

1. **Prioridad 1:** Si `promise.status === 'aprobada'` o hay cotización autorizada con `evento_id` → `autorizada`
2. **Prioridad 2:** Si hay cotización `en_cierre` o `aprobada` sin evento → `cierre`
3. **Default:** → `pendiente`

**Mapeo Pipeline Stage → Ruta:**

```typescript
function getRouteFromPipelineStage(stageSlug: string): string {
  switch (stageSlug) {
    case 'approved':
      return '/autorizada';
    case 'closing':
      return '/cierre';
    case 'pending':
    case 'negotiation': // Ambos van a /pendiente
      return '/pendiente';
    case 'archived':
    case 'canceled':
      return null; // No tienen ruta específica (filtradas del kanban)
    default:
      return '/pendiente';
  }
}
```

**Archivo:** `src/lib/actions/studio/commercial/promises/promise-state.actions.ts`

---

## 🔄 Sincronización Automática

### `syncPromisePipelineStageFromQuotes()`

Sincroniza automáticamente el `pipeline_stage_id` de la promesa basándose en el estado de sus cotizaciones.

**Lógica de Sincronización:**

```typescript
// Prioridad de detección:
1. hasAuthorized → 'approved'
   (cotizaciones con status: aprobada, autorizada, approved, contract_pending, contract_generated, contract_signed)

2. hasClosing → 'closing'
   (cotizaciones con status: en_cierre)

3. hasNegotiation → 'negotiation'
   (cotizaciones con status: negociacion Y selected_by_prospect !== true)

4. allCanceled → 'canceled'
   (todas las cotizaciones canceladas)

5. Default → 'pending'
```

**Fallbacks:**
- Si `closing` no existe → fallback a `negotiation`
- Si `canceled` no existe → fallback a `pending`

**Registro de Historial:**
- Cada cambio se registra en `studio_promise_status_history`
- Incluye metadata con estados de cotizaciones que causaron el cambio

**Archivo:** `src/lib/actions/studio/commercial/promises/promise-pipeline-sync.actions.ts`

### Puntos de Sincronización

La sincronización se ejecuta automáticamente cuando:

1. **Autorizar cotización y crear evento:**
   - `autorizarYCrearEvento()` → Sincroniza a `approved`
   - Archivo: `src/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions.ts:1794`

2. **Crear versión negociada:**
   - `crearVersionNegociada()` → Sincroniza según estado resultante
   - Archivo: `src/lib/actions/studio/commercial/promises/negociacion.actions.ts:352`

3. **Aplicar cambios de negociación:**
   - `aplicarCambiosNegociacion()` → Sincroniza según estado resultante
   - Archivo: `src/lib/actions/studio/commercial/promises/negociacion.actions.ts:542`

4. **Pasar a cierre:**
   - `pasarACierre()` → Debe sincronizar a `closing` (verificar implementación)

5. **Cancelar cierre:**
   - `cancelarCierre()` → Debe sincronizar según estado resultante (verificar implementación)

---

## 📝 Historial de Cambios

### Tabla: `studio_promise_status_history`

Registra todos los cambios de pipeline stage con:

- `from_stage_id` / `to_stage_id`
- `from_stage_slug` / `to_stage_slug`
- `user_id` (opcional)
- `reason` (opcional: "Sincronización automática desde cotizaciones", etc.)
- `metadata` (JSON con contexto: trigger, estados de cotizaciones, etc.)
- `created_at`

**Función:** `logPromiseStatusChange()` en `src/lib/actions/studio/commercial/promises/promise-status-history.actions.ts`

**Uso:**
- Se registra automáticamente en `syncPromisePipelineStageFromQuotes()`
- Se registra manualmente en `movePromise()` cuando se mueve en el kanban

---

## 🎯 Estados de Cotizaciones vs Pipeline Stages

### Estados de Cotización (`studio_cotizaciones.status`)

- `pendiente` - Pendiente
- `negociacion` - En Negociación
- `en_cierre` - En Cierre
- `aprobada` / `autorizada` / `approved` - Aprobada/Autorizada
- `contract_pending` - Esperando contrato
- `contract_generated` - Contrato generado
- `contract_signed` - Contrato firmado
- `cancelada` - Cancelada
- `archivada` - Archivada

### Mapeo Cotización Status → Pipeline Stage

| Cotización Status | Condición | Pipeline Stage |
|-------------------|-----------|----------------|
| `aprobada`, `autorizada`, `approved`, `contract_*` | Cualquiera | `approved` |
| `en_cierre` | Cualquiera | `closing` |
| `negociacion` | `selected_by_prospect !== true` | `negotiation` |
| `cancelada` | Todas canceladas | `canceled` |
| `pendiente` o otros | Default | `pending` |

---

## 🌐 Promise Público (Vista del Cliente)

### Rutas Públicas

El promise público (`/[slug]/promise/[promiseId]`) **NO usa pipeline stages**, usa directamente los estados de cotizaciones:

```
/[slug]/promise/[promiseId]/
├── pendientes/   → Cotizaciones con status: pendiente
├── negociacion/ → Cotizaciones con status: negociacion (selected_by_prospect !== true)
└── cierre/       → Cotizaciones con status: en_cierre (selected_by_prospect === true)
```

**Router Principal:** `src/app/[slug]/promise/[promiseId]/page.tsx`

**Prioridad de Redirección:**
1. **Negociación** (prioridad más alta) - Si existe cotización en `negociacion` sin `selected_by_prospect`
2. **Cierre** - Si existe cotización en `en_cierre` con `selected_by_prospect === true`
3. **Pendientes** (default) - Cotizaciones pendientes

**Nota:** El promise público está desacoplado del pipeline interno. La sincronización automática asegura que el pipeline refleje el estado real de las cotizaciones.

---

## 🚫 Validaciones de Transición (Kanban)

El kanban valida transiciones para evitar movimientos inválidos:

**Validación 1:** Desde `pending` o `negotiation` NO puede ir a `closing` o `approved`
- Estas transiciones requieren acciones específicas en las cotizaciones
- Mensaje: "No se puede mover directamente a 'En Cierre'. Debes pasar una cotización a cierre desde su vista detallada."

**Validación 2:** Desde `closing` NO puede ir a `pending`, `negotiation` o `approved`
- El cierre requiere completar el proceso desde la vista de cierre
- Mensaje: "No se puede mover desde 'En Cierre'. Debes completar o cancelar el proceso de cierre."

**Validación 3:** Desde `approved` NO puede ir a otros estados
- Una vez aprobada, la promesa debe permanecer en `approved` o moverse a `archived`
- Mensaje: "No se puede mover desde 'Aprobada'. La promesa ya tiene un evento creado."

**Archivo:** `src/app/[slug]/studio/commercial/promises/components/PromisesKanban.tsx:397-430`

---

## 🔧 Funciones Clave

### `determinePromiseState(promiseId: string)`
- Determina el estado para routing interno
- Retorna: `'pendiente' | 'cierre' | 'autorizada'`
- Archivo: `src/lib/actions/studio/commercial/promises/promise-state.actions.ts`

### `syncPromisePipelineStageFromQuotes(promiseId, studioId, userId?)`
- Sincroniza `pipeline_stage_id` desde estados de cotizaciones
- Registra cambios en historial
- Archivo: `src/lib/actions/studio/commercial/promises/promise-pipeline-sync.actions.ts`

### `movePromise(studioSlug, data)`
- Mueve promesa entre stages manualmente (desde kanban)
- Valida transiciones
- Registra cambios en historial
- Archivo: `src/lib/actions/studio/commercial/promises/promises.actions.ts:1150`

### `logPromiseStatusChange(params)`
- Registra cambio en `studio_promise_status_history`
- Archivo: `src/lib/actions/studio/commercial/promises/promise-status-history.actions.ts`

---

## 📊 Schema de Base de Datos

### `studio_promises`
```prisma
model studio_promises {
  id                String
  pipeline_stage_id String?  // ⭐ Fuente de verdad principal
  status            String   @default("pending") // ⚠️ Legacy, en proceso de deprecación
  // ...
  pipeline_stage    studio_promise_pipeline_stages? @relation(...)
}
```

### `studio_promise_pipeline_stages`
```prisma
model studio_promise_pipeline_stages {
  id         String   @id @default(cuid())
  studio_id  String
  name       String
  slug       String   // pending, negotiation, closing, approved, archived, canceled
  color      String   @default("#3B82F6")
  order      Int
  is_active  Boolean  @default(true)
  is_system  Boolean  @default(false) // Stages del sistema no se pueden eliminar
  // ...
  @@unique([studio_id, slug])
}
```

### `studio_promise_status_history`
```prisma
model studio_promise_status_history {
  id              String   @id @default(cuid())
  promise_id      String
  from_stage_id   String?
  to_stage_id     String
  from_stage_slug String?
  to_stage_slug   String
  user_id         String?
  reason          String?
  metadata        Json?
  created_at      DateTime @default(now())
  // ...
  @@index([promise_id, created_at])
  @@index([to_stage_id, created_at])
}
```

---

## ✅ Estado de Implementación

### ✅ Implementado

- [x] 6 estados del pipeline (pending, negotiation, closing, approved, archived, canceled)
- [x] Seed automático de pipeline stages
- [x] Sincronización automática desde cotizaciones
- [x] Historial de cambios (`studio_promise_status_history`)
- [x] Routing interno (pendiente/cierre/autorizada)
- [x] Validaciones de transición en kanban
- [x] Promise público desacoplado (usa estados de cotizaciones)
- [x] `determinePromiseState()` para routing
- [x] `movePromise()` con registro de historial

### ⚠️ En Proceso

- [ ] Deprecación completa del campo `status` en `studio_promises`
- [ ] Verificar sincronización en `pasarACierre()` y `cancelarCierre()`
- [ ] Migración completa de datos existentes a usar solo `pipeline_stage_id`

### 📝 Notas

- El campo `status` todavía existe pero se está migrando a usar solo `pipeline_stage_id`
- La función `determinePromiseState()` todavía usa `status` como fallback, pero prioriza cotizaciones
- El promise público puede seguir usando estados de cotizaciones directamente (no requiere cambios)

---

## 🔗 Archivos Relacionados

- `src/lib/actions/studio/commercial/promises/promise-state.actions.ts` - Determina estado para routing
- `src/lib/actions/studio/commercial/promises/promise-pipeline-sync.actions.ts` - Sincronización automática
- `src/lib/actions/studio/commercial/promises/promise-status-history.actions.ts` - Historial de cambios
- `src/lib/actions/studio/commercial/promises/promises.actions.ts` - `movePromise()`
- `src/app/[slug]/studio/commercial/promises/components/PromisesKanban.tsx` - Validaciones de transición
- `src/app/[slug]/studio/commercial/promises/[promiseId]/components/PromiseRedirectClient.tsx` - Redirección según estado
- `src/app/[slug]/promise/[promiseId]/page.tsx` - Router del promise público
- `prisma/04-seed-promise-pipeline.ts` - Seed de pipeline stages
- `prisma/schema.prisma` - Schema de base de datos
