# Análisis de Arquitectura: Flujo Comercial Promise (Root & Sub-routes)

## 📋 Resumen Ejecutivo

Análisis de `src/app/[slug]/promise/[promiseId]` y sub-rutas para identificar cuellos de botella y redundancias antes de aplicar Metodología ZEN.

---

## 1. 🔀 Lógica del Dispatcher (page.tsx raíz)

### Función de Routing
- **Query ligera**: `getPublicPromiseRouteState()` - Solo consulta `id`, `status`, `selected_by_prospect`
- **Lógica de redirección**: `determinePromiseRoute()` - Prioridad: Negociación > Cierre > Pendientes
- **Validación temprana**: Verifica estados antes de cargar datos pesados

### Flujo del Dispatcher
```typescript
1. getPublicPromiseRouteState() → Solo estados (ligera ✅)
2. Verificar cotización aprobada → redirect(/cliente)
3. determinePromiseRoute() → Decidir ruta
4. redirect() → Sub-ruta correspondiente
```

### ⚠️ Problemas Identificados
- **Redundancia**: Cada sub-ruta vuelve a llamar `getPublicPromiseRouteState()` para validación
- **Doble query**: Dispatcher + validación en sub-ruta = 2 queries idénticas

---

## 2. 📍 Estado de las Sub-rutas

### `/pendientes`
**Datos que obtiene:**
- `getPublicPromiseRouteState()` (validación)
- `getPublicPromiseBasicData()` (datos básicos - streaming inmediato)
- `getPublicPromisePendientes()` (datos pesados - deferred con Suspense)

**Características:**
- ✅ Streaming implementado (básicos + deferred)
- ✅ Usa `PendientesPageBasic` + `PendientesPageDeferred`
- ⚠️ Query pesada: cotizaciones + items + paquetes + portafolios + condiciones + términos

### `/negociacion`
**Datos que obtiene:**
- `getPublicPromiseRouteState()` (validación)
- `getPublicPromiseNegociacion()` (datos completos)

**Características:**
- ❌ NO usa streaming (await completo)
- ⚠️ Query pesada: cotización + items + catálogo + multimedia + condiciones + términos
- ⚠️ Carga catálogo completo aunque solo necesita items de la cotización

### `/cierre`
**Datos que obtiene:**
- `getPublicPromiseRouteState()` (validación)
- `getPublicPromiseCierre()` (datos completos)

**Características:**
- ❌ NO usa streaming (await completo)
- ⚠️ Query pesada: cotización + items + catálogo + multimedia + contrato + términos
- ⚠️ Carga catálogo completo aunque solo necesita items de la cotización

### 🔄 Acciones de Servidor Compartidas
- ✅ `getPublicPromiseRouteState()` - Compartida (ligera)
- ✅ `getPublicPromiseBasicData()` - Compartida (básicos)
- ✅ `getPublicPromiseMetadata()` - Compartida (metadata)
- ❌ Cada ruta tiene su función específica pesada (no comparten lógica de carga)

---

## 3. 🗄️ Complejidad de Datos (Mega-Joins)

### Queries Identificadas con Alto Costo

#### `getPublicPromisePendientes()`
```typescript
studio_promises.findFirst({
  quotes: {
    cotizacion_items: { ... },           // Nested join
    condiciones_comerciales_metodo_pago: { // Nested join
      metodos_pago: { ... }              // Double nested
    },
    condiciones_comerciales: { ... },     // Nested join
    paquete: { ... }                      // Nested join
  }
})
// + Query separada: catálogo completo
// + Query separada: portafolios
// + Query separada: términos y condiciones
// + Query separada: multimedia de items
```

#### `getPublicPromiseNegociacion()`
```typescript
studio_promises.findFirst({
  quotes: {
    cotizacion_items: { ... },           // Nested join
    condiciones_comerciales_metodo_pago: { // Nested join
      metodos_pago: { ... }              // Double nested
    },
    condiciones_comerciales: { ... }     // Nested join
  }
})
// + Query separada: catálogo completo (innecesario - solo necesita items de cotización)
// + Query separada: multimedia de items
// + Query separada: términos y condiciones
```

#### `getPublicPromiseCierre()`
```typescript
studio_promises.findFirst({
  quotes: {
    cotizacion_items: { ... },           // Nested join
    cotizacion_cierre: {                 // Nested join
      condiciones_comerciales: { ... }  // Double nested
    },
    paquete: { ... }                     // Nested join
  }
})
// + Query separada: catálogo completo (innecesario - solo necesita items de cotización)
// + Query separada: multimedia de items
// + Query separada: términos y condiciones
```

### ⚠️ Problemas Críticos
1. **Catálogo completo innecesario**: `/negociacion` y `/cierre` cargan catálogo completo cuando solo necesitan items de la cotización
2. **Múltiples queries separadas**: En lugar de un mega-join, hacen 4-5 queries separadas (mejor para performance, pero aún pesadas)
3. **Multimedia no optimizado**: Carga todos los media de todos los items, incluso si no se muestran

---

## 4. 📄 Higiene de Metadata

### Estado Actual
✅ **Bien implementado**: Todas las sub-rutas usan `getPublicPromiseMetadata()` (función ligera)
✅ **Cache implementado**: `unstable_cache` con revalidate: 3600s
✅ **Query optimizada**: Solo consulta `studio_name`, `logo_url`, `event_name`, `event_type_name`

### ⚠️ Redundancia Menor
- Cada sub-ruta tiene su propio `generateMetadata()` con código idéntico
- Podría centralizarse en un helper compartido

---

## 5. ⏳ Streaming y Skeletons

### Estado Actual

#### `/pendientes`
- ✅ `loading.tsx` específico
- ✅ Streaming implementado: `PendientesPageBasic` (inmediato) + `PendientesPageDeferred` (Suspense)
- ✅ `PromisePageSkeleton` como fallback

#### `/negociacion`
- ✅ `loading.tsx` específico
- ❌ NO usa streaming (await completo de `getPublicPromiseNegociacion()`)
- ✅ `PromisePageSkeleton` como fallback (pero no se usa por falta de Suspense)

#### `/cierre`
- ✅ `loading.tsx` específico
- ❌ NO usa streaming (await completo de `getPublicPromiseCierre()`)
- ✅ `PromisePageSkeleton` como fallback (pero no se usa por falta de Suspense)

### ⚠️ Oportunidades de Mejora
- `/negociacion` y `/cierre` deberían usar streaming como `/pendientes`
- Separar datos básicos (inmediato) de datos pesados (deferred)

---

## 6. ✍️ Interactividad de Cierre

### Componente Principal
`PublicQuoteAuthorizedView` maneja:
- Visualización de contrato
- Firma de contrato (`signPublicContract`)
- Edición de datos de promesa
- Regeneración de contrato
- Información bancaria

### Manejo de Mutaciones

#### Firma de Contrato
```typescript
// signPublicContract() - Server Action
- Valida cotización en estado correcto
- Actualiza contract_signed_at en cotizacion_cierre
- NO bloquea UI (usa toast para feedback)
```

#### Autorización de Cotización
```typescript
// autorizarCotizacionPublica() - Server Action
- Actualiza status a 'en_cierre'
- Crea registro en cotizacion_cierre
- Archiva otras cotizaciones
- Revalida paths
```

### ⚠️ Problemas Identificados
1. **Estados de loading locales**: Cada acción tiene su propio `useState` para loading
   - `isUpdatingData`
   - `isRegeneratingContract`
   - `loadingBankInfo`
2. **No hay bloqueo global de UI**: Múltiples acciones pueden ejecutarse simultáneamente
3. **Falta optimistic updates**: Los cambios no se reflejan inmediatamente en UI
4. **Realtime updates**: Usa `useCotizacionesRealtime` pero puede causar recargas innecesarias

### 🔄 Flujo de Mutaciones
```
Usuario hace acción
  ↓
setIsLoading(true) [local]
  ↓
Server Action
  ↓
toast.success/error
  ↓
setIsLoading(false) [local]
  ↓
Revalidación de paths (si aplica)
```

---

## 📊 Resumen de Cuellos de Botella

### 🔴 Críticos
1. **Redundancia de `getPublicPromiseRouteState()`**: Dispatcher + cada sub-ruta = 2 queries idénticas
2. **Catálogo completo innecesario**: `/negociacion` y `/cierre` cargan catálogo completo
3. **Falta de streaming**: `/negociacion` y `/cierre` no usan streaming (esperan todo)

### 🟡 Moderados
4. **Múltiples queries separadas**: Aunque mejor que mega-join, aún son pesadas
5. **Multimedia no optimizado**: Carga todos los media de todos los items
6. **Falta de optimistic updates**: Mutaciones no reflejan cambios inmediatamente

### 🟢 Menores
7. **Metadata duplicado**: Código idéntico en cada `generateMetadata()`
8. **Estados de loading locales**: Podrían centralizarse

---

## 🎯 Recomendaciones para Metodología ZEN

### Prioridad 1: Optimización de Queries
1. **Eliminar redundancia de `getPublicPromiseRouteState()`**
   - Pasar estado desde dispatcher a sub-rutas (via props o context)
   - O cachear resultado en request

2. **Optimizar carga de catálogo**
   - Solo cargar items que están en la cotización
   - Usar `filtrarCatalogoPorItems()` más eficientemente

3. **Lazy load multimedia**
   - Cargar solo media de items visibles inicialmente
   - Cargar resto on-demand

### Prioridad 2: Streaming
4. **Implementar streaming en `/negociacion` y `/cierre`**
   - Separar datos básicos (inmediato) de datos pesados (deferred)
   - Usar mismo patrón que `/pendientes`

### Prioridad 3: UX de Mutaciones
5. **Optimistic updates**
   - Reflejar cambios inmediatamente en UI
   - Revertir si falla

6. **Bloqueo global de UI durante mutaciones**
   - Prevenir acciones simultáneas
   - Mejor feedback visual

---

## 📈 Métricas de Performance Actuales

### Queries por Ruta
- **Dispatcher**: 1 query ligera (`getPublicPromiseRouteState`)
- **Pendientes**: 3-4 queries (routeState + basic + pesada + términos)
- **Negociación**: 4-5 queries (routeState + pesada + catálogo + multimedia + términos)
- **Cierre**: 4-5 queries (routeState + pesada + catálogo + multimedia + términos)

### Tiempos Estimados (sin medición real)
- Dispatcher: ~50-100ms (query ligera)
- Pendientes: ~500-1000ms (con streaming: básicos ~100ms, deferred ~400-900ms)
- Negociación: ~800-1500ms (sin streaming)
- Cierre: ~800-1500ms (sin streaming)

---

**Fecha de análisis**: 2025-01-28
**Archivos analizados**: 15+ archivos en `src/app/[slug]/promise/[promiseId]` y `src/lib/actions/public/`
