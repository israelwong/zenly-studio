# Master Plan de Optimización ZEN

**Versión:** 1.0  
**Fecha:** Enero 2025  
**Estado:** En Progreso  
**Metodología:** `docs/architecture/metodologia-optimizacion-zen.md`

---

## 📋 Tabla de Contenidos

1. [Inventario de Rutas](#1-inventario-de-rutas)
2. [Estado de Implementación](#2-estado-de-implementación)
3. [Plan de Vuelo por Fases](#3-plan-de-vuelo-por-fases)
4. [Checklist de Control](#4-checklist-de-control)
5. [Rutas Públicas de Promesas](#5-rutas-públicas-de-promesas)
6. [Atomic Seeding (Carga Atómica)](#6-atomic-seeding-carga-atómica)

---

## 1. Inventario de Rutas

### 1.1 Ruta: Promesas (Lista)

**Ruta:** `/[slug]/studio/commercial/promises/`

**Estado:** ✅ **COMPLETADO**

| Criterio | Estado | Fecha |
|----------|--------|-------|
| `loading.tsx` | ✅ | 18/01/2025 |
| Server Component | ✅ | 18/01/2025 |
| Caché con tags | ✅ | 18/01/2025 |
| Protección isNavigating | ✅ | 18/01/2025 |
| Cierre de overlays | ✅ | 18/01/2025 |

**Archivos clave:**
- `page.tsx` - Server Component con `unstable_cache`
- `loading.tsx` - Skeleton nativo
- `components/PromisesPageClient.tsx` - Client wrapper
- `components/PromisesKanbanClient.tsx` - Gestión de navegación

---

### 1.2 Ruta: Detalle de Promesa ([promiseId])

**Ruta base:** `/[slug]/studio/commercial/promises/[promiseId]/`

#### Layout Principal

**Archivo:** `layout.tsx`

| Criterio | Estado | Prioridad |
|----------|--------|-----------|
| `loading.tsx` | ✅ **COMPLETADO** | - |
| Server Component | ✅ **OK** | - |
| Cierre de overlays | ✅ **OK** | - |

---

#### Redirección Base

**Archivo:** `page.tsx`

| Criterio | Estado | Prioridad |
|----------|--------|-----------|
| `loading.tsx` | ✅ **COMPLETADO** | - |
| Server Component | ✅ **OK** | - |
| `startTransition` | ✅ **COMPLETADO** | - |

---

#### Sub-rutas Identificadas (10 rutas)

| # | Ruta | `loading.tsx` | Server Component | `isNavigating` | Prioridad |
|---|------|--------------|------------------|-----------------|-----------|
| 1 | `layout.tsx` | ✅ | ✅ | ✅ | ✅ |
| 2 | `page.tsx` | ✅ | ✅ | ✅ | ✅ |
| 3 | `pendiente/page.tsx` | ✅ | ✅ | ✅ | ✅ |
| 4 | `autorizada/page.tsx` | ✅ | ✅ | ✅ | ✅ |
| 5 | `cierre/page.tsx` | ✅ | ✅ | ✅ | ✅ |
| 6 | `cotizacion/nueva/page.tsx` | ✅ | ✅ | ✅ | ✅ |
| 7 | `cotizacion/[cotizacionId]/page.tsx` | ✅ | ✅ | ✅ | ✅ |
| 8 | `cotizacion/[cotizacionId]/negociacion/page.tsx` | ✅ | ✅ | ✅ | ✅ |
| 9 | `cotizacion/[cotizacionId]/revision/page.tsx` | 🗑️ | 🗑️ | 🗑️ | 🗑️ ELIMINADO |
| 10 | `cotizacion/[cotizacionId]/revision/autorizar/page.tsx` | 🗑️ | 🗑️ | 🗑️ | 🗑️ ELIMINADO |
| 11 | `cotizacion/[cotizacionId]/autorizar/` | 🗑️ | 🗑️ | 🗑️ | 🗑️ ELIMINADO |

**Leyenda:**
- ✅ = Implementado
- ⚠️ = Legacy (no se optimizará)
- ❌ = No implementado
- 🗑️ = Eliminado (carpeta/ruta legacy removida)

---

### 1.3 Puntos de Entrada (Navegación)

| Componente | Ruta Destino | `startTransition` | `close-overlays` | `isNavigating` | Prioridad |
|------------|--------------|-------------------|------------------|----------------|-----------|
| `PromiseKanbanCard` | `/[promiseId]` | ✅ | ✅ | ✅ | ✅ |
| `PromiseQuotesPanelCard` | `/[promiseId]/cotizacion/[id]` | ✅ | ✅ | ✅ | ✅ |
| `PromiseQuotesPanelCard` | `/[promiseId]/cotizacion/[id]/negociacion` | ✅ | ✅ | ✅ | ✅ |
| `PromiseQuotesPanelCard` | `/[promiseId]/cotizacion/[id]` (editar) | ✅ | ✅ | ✅ | ✅ |
| `CotizacionCard` (cierre) | `/[promiseId]/cotizacion/[id]` | ✅ | ✅ | ✅ | ✅ |

---

## 2. Estado de Implementación

### 2.1 Fase 1: Fundamentos ✅ COMPLETADO

**Objetivo:** Estabilizar entrada al detalle de promesa

**Tareas:**
- [x] Crear `loading.tsx` en `[promiseId]/`
- [x] Refactorizar `page.tsx` con `startTransition`
- [x] Convertir `pendiente/page.tsx` a Server Component
- [x] Proteger `PromiseQuotesPanelCard.handleClick()`

**Estado:** ✅ **COMPLETADO** (18/01/2025)

**Archivos creados/modificados:**
- `[promiseId]/loading.tsx` (nuevo)
- `[promiseId]/components/PromiseRedirectClient.tsx` (modificado)
- `[promiseId]/pendiente/page.tsx` (convertido a Server Component)
- `[promiseId]/pendiente/loading.tsx` (nuevo)
- `[promiseId]/pendiente/components/PromisePendienteClient.tsx` (nuevo)
- `[promiseId]/pendiente/components/cotizaciones/PromiseQuotesPanelCard.tsx` (modificado)

---

### 2.2 Fase 2: Vistas de Estado ✅ COMPLETADO

**Objetivo:** Optimizar vistas de estado (autorizada, cierre)

**Tareas:**
- [x] `autorizada/page.tsx` → Server Component
- [x] `cierre/page.tsx` → Server Component
- [x] Crear `loading.tsx` para ambas
- [x] Proteger navegación en `CotizacionCard`

**Estado:** ✅ **COMPLETADO** (18/01/2025)

**Archivos creados/modificados:**
- `autorizada/loading.tsx` (nuevo)
- `autorizada/page.tsx` (convertido a Server Component)
- `autorizada/components/PromiseAutorizadaClient.tsx` (nuevo)
- `cierre/loading.tsx` (nuevo)
- `cierre/page.tsx` (convertido a Server Component)
- `cierre/components/PromiseCierreClient.tsx` (nuevo)
- `cierre/components/CotizacionCard.tsx` (modificado - navegación protegida)

---

### 2.3 Fase 3: Rutas de Cotización ✅ COMPLETADO

**Objetivo:** Optimizar flujo de cotizaciones

**Tareas:**
- [x] `cotizacion/nueva/page.tsx` → Server Component
- [x] `cotizacion/[cotizacionId]/page.tsx` → Server Component
- [x] `cotizacion/[cotizacionId]/negociacion/page.tsx` → Server Component
- [x] Crear `loading.tsx` para todas las rutas de cotización
- [x] Implementar `unstable_cache` con tags en edición
- [x] Proteger navegación en `PromiseQuotesPanel`

**Estado:** ✅ **COMPLETADO** (18/01/2025)

**Archivos creados/modificados:**
- `cotizacion/nueva/loading.tsx` (nuevo)
- `cotizacion/nueva/page.tsx` (convertido a Server Component)
- `cotizacion/nueva/components/NuevaCotizacionClient.tsx` (nuevo)
- `cotizacion/[cotizacionId]/loading.tsx` (nuevo)
- `cotizacion/[cotizacionId]/page.tsx` (convertido a Server Component con `unstable_cache`)
- `cotizacion/[cotizacionId]/components/EditarCotizacionClient.tsx` (nuevo)
- `cotizacion/[cotizacionId]/negociacion/loading.tsx` (nuevo)
- `cotizacion/[cotizacionId]/negociacion/page.tsx` (convertido a Server Component)
- `cotizacion/[cotizacionId]/negociacion/components/NegociacionClient.tsx` (nuevo)
- `pendiente/components/cotizaciones/PromiseQuotesPanel.tsx` (modificado - navegación protegida)
- `cotizaciones.actions.ts` (modificado - agregado `revalidateTag`)

---

### 2.4 Fase 4: Rutas de Revisión 🗑️ ELIMINADO

**Objetivo:** ~~Optimizar flujo de revisiones~~ (Flujo legacy eliminado)

**Flujo Actual:**
- **Pendiente** → `PromiseQuotesPanelCard` → `pasarACierre()` → Estado `en_cierre`
- **Cierre** → `CierreActionButtons` → `autorizarYCrearEvento()` → Autorizar y crear evento

**Rutas Eliminadas:**
- 🗑️ `cotizacion/[cotizacionId]/revision/page.tsx` (eliminado)
- 🗑️ `cotizacion/[cotizacionId]/revision/autorizar/page.tsx` (eliminado)
- 🗑️ Todos los componentes relacionados en `revision/components/` (eliminados)

**Referencias Actualizadas:**
- `PromiseQuotesPanelCard.tsx` - Redirige a edición normal en lugar de `/revision`
- `InfoCrearRevisionModal.tsx` - Redirige a `/cotizacion/nueva` en lugar de `/revision`
- `ResumenCotizacion.tsx` - Redirige a edición normal en lugar de `/revision`
- `cotizaciones.actions.ts` - Eliminado `revalidatePath` de ruta de revisión
- `AutorizarRevisionModal.tsx` - Import actualizado de `CondicionesComercialesSelector` a `/components/shared/promises`

**Componentes Reorganizados:**
- `CondicionesComercialesSelector.tsx` → Movido a `/components/shared/promises/` (18/01/2025)
- `DatosContratante.tsx` → Movido a `/autorizada/components/` (18/01/2025)

**Estado:** 🗑️ **ELIMINADO** (18/01/2025)

---

## 3. Plan de Vuelo por Fases

### Fase 1: Fundamentos ✅ COMPLETADO

**Impacto:** ⭐⭐⭐⭐⭐  
**Complejidad:** ⭐⭐  
**Tiempo estimado:** 2-3 horas  
**Tiempo real:** ~2 horas

**Resultados:**
- ✅ Entrada al detalle de promesa instantánea
- ✅ Skeleton nativo sin parpadeos
- ✅ Sin race conditions en navegación
- ✅ Componente "Pendiente" sin parpadeo al cargar

---

### Fase 2: Vistas de Estado 🟡 MEDIA PRIORIDAD

**Impacto:** ⭐⭐⭐  
**Complejidad:** ⭐⭐⭐

**Tareas:**
- Convertir `autorizada/page.tsx` y `cierre/page.tsx` a Server Components
- Crear `loading.tsx` para cada una
- Mover fetches a Server Components
- Proteger navegación desde `CotizacionCard` (cierre)

---

### Fase 3: Rutas de Cotización ✅ COMPLETADO

**Impacto:** ⭐⭐⭐⭐  
**Complejidad:** ⭐⭐⭐  
**Tiempo estimado:** 3-4 horas  
**Tiempo real:** ~3 horas

**Resultados:**
- ✅ Rutas de cotización sin parpadeos
- ✅ Caché optimizado con `unstable_cache` y tags
- ✅ Navegación protegida en todos los puntos de entrada
- ✅ Datos cargados en paralelo en servidor

---

### Fase 4: Rutas de Revisión 🗑️ ELIMINADO

**Impacto:** N/A (flujo legacy eliminado)  
**Complejidad:** N/A  
**Fecha eliminación:** 18/01/2025

**Nota:** El flujo actual es:
1. **Pendiente** → Usuario hace clic en "Pasar a Cierre" en `PromiseQuotesPanelCard`
2. **Cierre** → Usuario completa condiciones, contrato, pago en vista `/cierre/`
3. **Autorizar** → Usuario hace clic en "Autorizar y Crear Evento" en `CierreActionButtons`

**Acciones realizadas:**
- 🗑️ Eliminada carpeta completa `/revision/` y todos sus archivos
- ✅ Actualizadas referencias en código para redirigir a rutas normales
- ✅ Eliminado `revalidatePath` de rutas de revisión en acciones

---

## 4. Checklist de Control

### Por Ruta

#### ✅ Promesas (Lista) - COMPLETADO

- [x] `loading.tsx` existe
- [x] Server Component con fetch directo
- [x] Caché con tags (`promises-list-${studioSlug}`)
- [x] Protección `isNavigating` implementada
- [x] Evento `close-overlays` disparado
- [x] `startTransition` en navegación

---

#### ✅ Detalle de Promesa - FASE 1 COMPLETADA

**Layout (`layout.tsx`):**
- [x] `loading.tsx` existe ✅
- [x] Server Component
- [x] Cierre de overlays al montar

**Redirección (`page.tsx`):**
- [x] `loading.tsx` existe ✅
- [x] Server Component
- [x] `startTransition` en `PromiseRedirectClient` ✅

**Pendiente (`pendiente/page.tsx`):**
- [x] `loading.tsx` existe ✅
- [x] Server Component ✅
- [x] Sin `useEffect` para datos ✅
- [x] Datos pasados como props ✅
- [x] Validación de estado y redirección ✅

---

#### 🔄 Detalle de Promesa - PENDIENTE (Fases 2-4)

**Autorizada (`autorizada/page.tsx`):**
- [x] `loading.tsx` existe ✅
- [x] Server Component ✅
- [x] Sin `useEffect` para datos ✅

**Cierre (`cierre/page.tsx`):**
- [x] `loading.tsx` existe ✅
- [x] Server Component ✅
- [x] Sin `useEffect` para datos ✅
- [x] Validación de estado y redirección ✅

**Cotización Nueva (`cotizacion/nueva/page.tsx`):**
- [x] `loading.tsx` existe ✅
- [x] Server Component ✅

**Editar Cotización (`cotizacion/[cotizacionId]/page.tsx`):**
- [x] `loading.tsx` existe ✅
- [x] Server Component ✅
- [x] Sin `useEffect` para datos ✅
- [x] `unstable_cache` con tags ✅

**Negociación (`cotizacion/[cotizacionId]/negociacion/page.tsx`):**
- [x] `loading.tsx` existe ✅
- [x] Server Component ✅
- [x] Sin `useEffect` para datos ✅

**Revisión (`cotizacion/[cotizacionId]/revision/page.tsx`):**
- 🗑️ **ELIMINADO** - Carpeta completa eliminada (18/01/2025)

**Autorizar Revisión (`cotizacion/[cotizacionId]/revision/autorizar/page.tsx`):**
- 🗑️ **ELIMINADO** - Carpeta completa eliminada (18/01/2025)

**Autorizar (`cotizacion/[cotizacionId]/autorizar/`):**
- 🗑️ **ELIMINADO** - Carpeta completa eliminada (18/01/2025)
- Componentes movidos: `CondicionesComercialesSelector` → `/components/shared/promises/`, `DatosContratante` → `/autorizada/components/`

---

### Por Punto de Entrada

**PromiseKanbanCard:**
- [x] `startTransition` ✅
- [x] `close-overlays` ✅
- [x] `isNavigating` ✅

**PromiseQuotesPanelCard:**
- [x] `startTransition` ✅
- [x] `close-overlays` ✅
- [x] `isNavigating` (si aplica) ✅

**CotizacionCard (cierre):**
- [x] `startTransition` ✅
- [x] `close-overlays` ✅

**CotizacionAutorizadaCard:**
- [x] `startTransition` ✅
- [x] `close-overlays` ✅

**AuthorizeCotizacionModal:**
- [x] `startTransition` ✅
- [x] `close-overlays` ✅
- [x] `router.refresh()` ✅

**usePromiseCierreLogic:**
- [x] `handleCancelarCierre` - Navegación protegida ✅
- [x] `handleConfirmAutorizar` - Navegación protegida ✅

---

## 📊 Métricas de Progreso

### Estado General

```
Rutas Optimizadas:     8/8   (100%) ✅
loading.tsx Creados:   8/8   (100%) ✅
Server Components:     9/9   (100%) ✅
Navegación Protegida:  7/7   (100%) ✅
Validaciones Estado:   2/2   (100%) ✅
```

### Por Fase

- **Fase 1 (Fundamentos):** ✅ 4/4 tareas (100%)
- **Fase 2 (Vistas Estado):** ✅ 4/4 tareas (100%)
- **Fase 3 (Rutas Cotización):** ✅ 6/6 tareas (100%)
- **Fase 4 (Revisión):** 🗑️ ELIMINADO

---

## 🎯 Estado Final

### ✅ Optimización Completada al 100%

**Fases 1-3 completadas:**
- ✅ Fase 1: Fundamentos (Detalle de Promesa)
- ✅ Fase 2: Vistas de Estado (Autorizada/Cierre)
- ✅ Fase 3: Rutas de Cotización (Nueva/Editar/Negociación)

**Ajustes Finales Completados (18/01/2025):**
- ✅ Validaciones de estado en `pendiente/page.tsx` y `cierre/page.tsx`
- ✅ Navegación protegida en `handleCancelarCierre`
- ✅ Navegación protegida en `handleConfirmAutorizar`
- ✅ Navegación protegida en `CotizacionAutorizadaCard`
- ✅ Navegación protegida en `AuthorizeCotizacionModal`
- ✅ Corrección de `revalidateTag` con segundo argumento `'max'`
- ✅ Corrección de error de hidratación en `PromiseKanbanCard`

**Rutas Eliminadas:**
- 🗑️ `/revision/` - Flujo legacy eliminado, reemplazado por flujo de Cierre

**Flujo Actual Optimizado:**
1. **Pendiente** → `PromiseQuotesPanelCard` → `pasarACierre()` ✅
2. **Cierre** → `PromiseCierreClient` (Server Component) ✅
3. **Autorizar** → `CierreActionButtons` → `autorizarYCrearEvento()` ✅

---

## 6. Atomic Seeding (Carga Atómica)

**Estado:** ✅ **Documentado y aplicado** (Promise Pendiente, Feb 2026)

**Objetivo:** Eliminar bounces de navegación y skeletons en la primera pintada: todos los datos de la vista se obtienen en el Server Component y se inyectan como props `initial*` a los Client Components.

**Reglas:**
- **Server-Side Priming:** Incluir en el `Promise.all` de cada `page.tsx` todos los datos que las cards/paneles necesitan (agenda, recordatorios, etc.).
- **Zero-Skeleton:** Los Client Components que reciben `initial*` inicializan estado con ellos; si hay dato inicial, no skeleton y no fetch en mount.
- **startTransition para router.refresh:** Tras mutaciones, usar `startTransition(() => router.refresh())` para no interrumpir una navegación en curso.

**Referencias:**
- **Regla Cursor:** `.cursor/rules/atomic-seeding-pattern.mdc` (globs: `page.tsx`, `*Client*.tsx`, `*Card*.tsx`)
- **Patrón:** `.cursor/docs/patterns/PATRON_ATOMIC_SEEDING.md`
- **Caso de uso:** `pendiente/page.tsx`, `PromisePendienteClient`, `PromiseAppointmentCard`, `SeguimientoMinimalCard`

---

## 🔗 Referencias

- **Metodología:** `docs/architecture/metodologia-optimizacion-zen.md`
- **Auditoría Lista:** `.cursor/audit-promises-loading.md`
- **Auditoría Detalle:** `.cursor/audit-promise-detail-routes.md`
- **Atomic Seeding (regla):** `.cursor/rules/atomic-seeding-pattern.mdc`
- **Atomic Seeding (patrón):** `.cursor/docs/patterns/PATRON_ATOMIC_SEEDING.md`

---

## 📝 Notas de Implementación

### Fase 1 - Lecciones Aprendidas ✅

1. **Server Components + Props:**
   - Los datos de autorización se cargan en paralelo con `Promise.all`
   - Se pasan como props iniciales al Client Component
   - Elimina completamente el parpadeo de carga

2. **startTransition:**
   - Todas las navegaciones deben estar envueltas
   - Prioriza la navegación sobre actualizaciones de fondo
   - Mejora significativamente la percepción de velocidad

3. **close-overlays:**
   - Evento global disparado antes de navegar
   - Limpia la UI automáticamente
   - Mejora la experiencia de usuario

4. **loading.tsx:**
   - Debe existir en cada nivel de ruta
   - Permite streaming nativo de Next.js
   - Elimina skeletons condicionales

---

### Fase 2 - Lecciones Aprendidas ✅

1. **Refactorización de Componentes Complejos:**
   - Componentes con mucha lógica (como `cierre/page.tsx`) se benefician enormemente de la separación Server/Client
   - El Client Component mantiene toda la interactividad mientras el Server Component solo hace fetch

2. **Protección de Navegación:**
   - Incluso componentes internos como `CotizacionCard` deben proteger su navegación
   - El patrón `startTransition` + `close-overlays` es universal

3. **Manejo de Estados Null:**
   - Los Server Components pueden retornar `null` si no hay datos
   - El `loading.tsx` maneja el estado de carga, no el componente

---

### Fase 3 - Lecciones Aprendidas ✅

1. **Caché con Tags Específicos:**
   - `unstable_cache` con tags `quote-detail-${cotizacionId}` permite invalidación selectiva
   - Agregar `revalidateTag` en todas las acciones que modifican cotizaciones
   - Incluir `studioSlug` en tags para aislamiento multi-tenant

2. **Rutas Anidadas con IDs:**
   - Rutas con múltiples IDs (`[promiseId]` y `[cotizacionId]`) requieren cuidado especial
   - Los tags de caché deben incluir todos los IDs relevantes

3. **Carga de Datos en Paralelo:**
   - `Promise.all` en Server Components es crítico para rendimiento
   - Pre-cargar condiciones comerciales en negociación reduce latencia

4. **Protección Universal:**
   - Todos los puntos de entrada (crear, editar, navegar) deben usar `startTransition`
   - El evento `close-overlays` debe dispararse antes de cualquier navegación

1. **Server Components + Props:**
   - Los datos de autorización se cargan en paralelo con `Promise.all`
   - Se pasan como props iniciales al Client Component
   - Elimina completamente el parpadeo de carga

2. **startTransition:**
   - Todas las navegaciones deben estar envueltas
   - Prioriza la navegación sobre actualizaciones de fondo
   - Mejora significativamente la percepción de velocidad

3. **close-overlays:**
   - Evento global disparado antes de navegar
   - Limpia la UI automáticamente
   - Mejora la experiencia de usuario

4. **loading.tsx:**
   - Debe existir en cada nivel de ruta
   - Permite streaming nativo de Next.js
   - Elimina skeletons condicionales

---

---

## 5. Rutas Públicas de Promesas

### 5.1 Optimización SSR del Layout

**Ruta:** `/[slug]/promise/[promiseId]/`

**Estado:** ✅ **COMPLETADO** (27/01/2025)

**Problema Resuelto:**
- Lag de 2 segundos en móviles al cargar promesas públicas
- Error 500 "Aborted or already flushed boundaries" por conflictos de hidratación
- Fetch inicial innecesario en el cliente para validar rutas

**Solución Implementada:**
- **Layout Ultraligero (Server)**: Calcula ruta en servidor y pasa datos al cliente
- **Decisionador Único (Client)**: `PromiseRouteGuard` usa `useLayoutEffect` para comparación instantánea
- **Skeleton Preventivo**: Muestra `PromisePageSkeleton` mientras `isReady === false` para evitar montar hijos prematuramente

| Criterio | Estado | Fecha |
|----------|--------|-------|
| Server Component con `force-dynamic` | ✅ | 27/01/2025 |
| Cálculo de ruta en servidor | ✅ | 27/01/2025 |
| Inyección de datos al cliente | ✅ | 27/01/2025 |
| `useLayoutEffect` para comparación | ✅ | 27/01/2025 |
| Skeleton preventivo | ✅ | 27/01/2025 |
| Sin fetch inicial si hay datos del servidor | ✅ | 27/01/2025 |

**Archivos clave:**
- `src/app/[slug]/promise/[promiseId]/layout.tsx` - Server Component que calcula ruta
- `src/components/promise/PromiseRouteGuard.tsx` - Decisionador único con `useLayoutEffect`
- `src/lib/actions/studio/commercial/promises/promise-short-url.actions.ts` - Sincronización de Short URLs

**Patrón Arquitectónico:**
- **Ley de Separación Total**: Layout solo pasa datos, cliente decide redirección
- **Evita Error 500**: No se usa `redirect()` en Layout para comparaciones de ruta
- **Optimización Móvil**: Elimina lag de 2 segundos mostrando skeleton mientras valida

---

### 5.2 Sincronización Inteligente de Short URLs

**Estado:** ✅ **COMPLETADO** (27/01/2025)

**Problema Resuelto:**
- Short URLs apuntaban a rutas incorrectas cuando cambiaba el estatus de cotizaciones
- El `original_url` no se actualizaba automáticamente según el estado actual

**Solución Implementada:**
- Función `syncShortUrlRoute()` que actualiza `original_url` usando `determinePromiseRoute`
- Sincronización automática en todas las acciones que cambian estatus de cotizaciones
- El short code base (`/s/XYZ`) siempre apunta al mismo registro, pero el destino se actualiza

| Acción | Sincronización | Estado |
|--------|----------------|--------|
| `toggleNegociacionStatus` | ✅ | 27/01/2025 |
| `quitarCancelacionCotizacion` | ✅ | 27/01/2025 |
| `autorizarCotizacion` | ✅ | 27/01/2025 |
| `cancelarCotizacion` | ✅ | 27/01/2025 |
| `pasarCotizacionACierre` | ✅ | 27/01/2025 |
| `cancelarCierre` | ✅ | 27/01/2025 |
| `autorizarCotizacionPublica` | ✅ | 27/01/2025 |

**Archivos clave:**
- `src/lib/actions/studio/commercial/promises/promise-short-url.actions.ts` - `syncShortUrlRoute()`
- `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts` - Integración en acciones
- `src/lib/actions/public/cotizaciones.actions.ts` - Integración en autorización pública

**Flujo:**
1. Usuario cambia estatus de cotización → Server Action ejecuta cambio
2. Server Action llama a `syncShortUrlRoute()` automáticamente
3. Se obtienen todas las cotizaciones de la promesa
4. Se calcula ruta objetivo con `determinePromiseRoute`
5. Se actualiza `original_url` del short URL en la BD
6. El short code (`/s/XYZ`) siempre redirige a la ruta correcta

---

**Última actualización:** 27 de enero de 2025  
**Mantenido por:** Equipo ZEN Platform
