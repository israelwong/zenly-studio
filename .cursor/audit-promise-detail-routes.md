# Auditoría de Scope: Ruta [promiseId]

**Fecha:** 18 de enero de 2025  
**Rama:** `260118-studio-promise-loading`  
**Metodología de referencia:** `docs/architecture/metodologia-optimizacion-zen.md`

---

## 📋 Tarea 1: Inventario de Sub-rutas

### Estructura Completa de Rutas

```
[promiseId]/
├── layout.tsx                    # Layout principal (Server Component)
├── page.tsx                      # Redirección según estado (Server Component)
├── pendiente/
│   └── page.tsx                  # Vista de promesa pendiente
├── autorizada/
│   └── page.tsx                  # Vista de promesa autorizada
├── cierre/
│   └── page.tsx                  # Vista de proceso de cierre
└── cotizacion/
    ├── nueva/
    │   └── page.tsx              # Crear nueva cotización
    └── [cotizacionId]/
        ├── page.tsx              # Editar cotización
        ├── negociacion/
        │   └── page.tsx          # Negociación de cotización
        └── revision/
            ├── page.tsx          # Editar revisión
            └── autorizar/
                └── page.tsx      # Autorizar revisión
```

### Rutas Identificadas (10 rutas)

1. **`/[slug]/studio/commercial/promises/[promiseId]/layout.tsx`** - Layout principal
2. **`/[slug]/studio/commercial/promises/[promiseId]/page.tsx`** - Redirección base
3. **`/[slug]/studio/commercial/promises/[promiseId]/pendiente/page.tsx`** - Vista pendiente
4. **`/[slug]/studio/commercial/promises/[promiseId]/autorizada/page.tsx`** - Vista autorizada
5. **`/[slug]/studio/commercial/promises/[promiseId]/cierre/page.tsx`** - Vista cierre
6. **`/[slug]/studio/commercial/promises/[promiseId]/cotizacion/nueva/page.tsx`** - Nueva cotización
7. **`/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/page.tsx`** - Editar cotización
8. **`/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/negociacion/page.tsx`** - Negociación
9. **`/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/revision/page.tsx`** - Editar revisión
10. **`/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/revision/autorizar/page.tsx`** - Autorizar revisión

---

## 📊 Tarea 2: Validación de Metodología

### Criterios de Evaluación

- ✅ **Cumple** - Implementado correctamente
- ⚠️ **Parcial** - Implementado pero con mejoras necesarias
- ❌ **No cumple** - Requiere implementación completa

---

### Ruta 1: `layout.tsx` (Principal)

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/layout.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` en este nivel |
| **Server Component** | ✅ **Cumple** | Es Server Component async, hace fetch directo |
| **Protección isNavigating** | ✅ **Cumple** | `PromiseLayoutClient` cierra overlays al montar |

**Análisis:**
- ✅ Fetch directo con `determinePromiseState` y `getPipelineStages`
- ✅ Redirección si no hay datos
- ❌ **FALTA:** `loading.tsx` para transiciones
- ✅ Cierre de overlays implementado en `PromiseLayoutClient`

**Puntos de entrada desde otras rutas:**
- Desde lista de promesas: ✅ Protegido (implementado en lista)
- Desde otras sub-rutas: ⚠️ Depende de cada sub-ruta

---

### Ruta 2: `page.tsx` (Redirección Base)

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/page.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` |
| **Server Component** | ✅ **Cumple** | Es Server Component async |
| **Protección isNavigating** | ⚠️ **Parcial** | `PromiseRedirectClient` muestra skeleton, pero no tiene protección de navegación |

**Análisis:**
- ✅ Server Component con fetch directo
- ✅ Usa `PromiseRedirectClient` para redirección
- ❌ **FALTA:** `loading.tsx` nativo
- ⚠️ Redirección usa `router.replace` sin `startTransition`

---

### Ruta 3: `pendiente/page.tsx`

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/pendiente/page.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` |
| **Server Component** | ❌ **No cumple** | Es Client Component (`'use client'`) |
| **Depende de useEffect** | ❌ **No cumple** | Usa `usePromiseContext` + `useEffect` para datos |
| **Protección isNavigating** | ❌ **No cumple** | No tiene protección |

**Análisis:**
- ❌ Client Component con `'use client'`
- ❌ Usa `usePromiseContext` (datos vienen del layout, pero no es Server Component)
- ❌ Skeleton condicional basado en `contextLoading` (patrón prohibido)
- ❌ `useEffect` para cargar datos de autorización (`loadAuthorizationData`)
- ❌ No tiene protección de navegación

**Puntos de entrada:**
- Desde `PromiseQuotesPanelCard`: ❌ Usa `router.push` sin `startTransition`
- Desde otras rutas: ❌ Sin protección

---

### Ruta 4: `autorizada/page.tsx`

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/autorizada/page.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` |
| **Server Component** | ❌ **No cumple** | Es Client Component (`'use client'`) |
| **Depende de useEffect** | ❌ **No cumple** | `useEffect` carga `getCotizacionAutorizadaByPromiseId` |
| **Protección isNavigating** | ❌ **No cumple** | No tiene protección |

**Análisis:**
- ❌ Client Component
- ❌ `useEffect` cargando datos (`getCotizacionAutorizadaByPromiseId`)
- ❌ Skeleton condicional (retorna `null` mientras carga)
- ❌ Parpadeo visible al cargar

---

### Ruta 5: `cierre/page.tsx`

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/cierre/page.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` |
| **Server Component** | ❌ **No cumple** | Es Client Component (`'use client'`) |
| **Depende de useEffect** | ❌ **No cumple** | `useEffect` carga `getCotizacionesByPromiseId` |
| **Protección isNavigating** | ❌ **No cumple** | No tiene protección |

**Análisis:**
- ❌ Client Component
- ❌ `useEffect` cargando datos (`getCotizacionesByPromiseId`)
- ⚠️ Usa `PromiseCierreSkeleton` pero condicionalmente (patrón prohibido)
- ❌ Parpadeo visible

---

### Ruta 6: `cotizacion/nueva/page.tsx`

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/cotizacion/nueva/page.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` |
| **Server Component** | ❌ **No cumple** | Es Client Component (`'use client'`) |
| **Depende de useEffect** | ⚠️ **Parcial** | Solo `useEffect` para `document.title` |
| **Protección isNavigating** | ❌ **No cumple** | No tiene protección |

**Análisis:**
- ❌ Client Component (no necesita serlo, solo renderiza formulario)
- ⚠️ `useEffect` solo para título (aceptable)
- ❌ No tiene `loading.tsx`
- ❌ Navegación con `router.back()` sin `startTransition`

---

### Ruta 7: `cotizacion/[cotizacionId]/page.tsx`

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/page.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` |
| **Server Component** | ❌ **No cumple** | Es Client Component (`'use client'`) |
| **Depende de useEffect** | ❌ **No cumple** | `useEffect` carga `getCotizacionById` y `obtenerCondicionComercial` |
| **Protección isNavigating** | ❌ **No cumple** | No tiene protección |

**Análisis:**
- ❌ Client Component
- ❌ `useEffect` cargando datos (`getCotizacionById`, `obtenerCondicionComercial`)
- ❌ Skeleton condicional basado en `isFormLoading`
- ❌ Navegación con `router.push` sin `startTransition`

**Puntos de entrada:**
- Desde `PromiseQuotesPanelCard`: ❌ `router.push` sin protección
- Desde `CotizacionCard` (cierre): ❌ `router.push` sin protección

---

### Ruta 8: `cotizacion/[cotizacionId]/negociacion/page.tsx`

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/negociacion/page.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` |
| **Server Component** | ❌ **No cumple** | Es Client Component (`'use client'`) |
| **Depende de useEffect** | ❌ **No cumple** | `useEffect` carga `loadCotizacionParaNegociacion` y `obtenerConfiguracionPrecios` |
| **Protección isNavigating** | ❌ **No cumple** | No tiene protección |

**Análisis:**
- ❌ Client Component
- ❌ `useEffect` cargando múltiples datos
- ⚠️ Usa `NegociacionSkeleton` pero condicionalmente
- ❌ Navegación con `router.back()` sin `startTransition`

**Puntos de entrada:**
- Desde `PromiseQuotesPanelCard`: ❌ `router.push` sin protección

---

### Ruta 9: `cotizacion/[cotizacionId]/revision/page.tsx`

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/revision/page.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` |
| **Server Component** | ❌ **No cumple** | Es Client Component (`'use client'`) |
| **Depende de useEffect** | ❌ **No cumple** | `useEffect` carga `getCotizacionById` (múltiples veces) |
| **Protección isNavigating** | ❌ **No cumple** | No tiene protección |

**Análisis:**
- ❌ Client Component
- ❌ `useEffect` cargando datos (cotización y original)
- ❌ Skeleton inline (no usa `loading.tsx`)
- ❌ Navegación con `router.push` y `router.refresh` sin `startTransition`

**Puntos de entrada:**
- Desde `PromiseQuotesPanelCard`: ❌ `router.push` sin protección

---

### Ruta 10: `cotizacion/[cotizacionId]/revision/autorizar/page.tsx`

**Ruta:** `/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/revision/autorizar/page.tsx`

| Criterio | Estado | Detalles |
|----------|--------|----------|
| **loading.tsx** | ❌ **No cumple** | No existe `loading.tsx` |
| **Server Component** | ❌ **No cumple** | Es Client Component (`'use client'`) |
| **Depende de useEffect** | ❌ **No cumple** | `useEffect` carga `getCotizacionById` y `getPromiseById` |
| **Protección isNavigating** | ❌ **No cumple** | No tiene protección |

**Análisis:**
- ❌ Client Component
- ❌ `useEffect` cargando múltiples datos
- ❌ Skeleton inline (no usa `loading.tsx`)
- ❌ Navegación con `router.push` sin `startTransition`

---

## 🔍 Análisis de Puntos de Entrada

### Navegación desde Componentes

#### `PromiseQuotesPanelCard.handleClick()`

**Ubicación:** `pendiente/components/cotizaciones/PromiseQuotesPanelCard.tsx:230`

**Estado:** ❌ **No cumple**

```typescript
const handleClick = () => {
  // ... lógica de redirección
  router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`);
};
```

**Problemas:**
- ❌ No usa `startTransition`
- ❌ No dispara evento `close-overlays`
- ❌ No tiene protección `isNavigating`

#### `CotizacionCard` (en cierre)

**Ubicación:** `cierre/components/CotizacionCard.tsx:66`

**Estado:** ❌ **No cumple**

```typescript
onClick={() => router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}?from=cierre`)}
```

**Problemas:**
- ❌ No usa `startTransition`
- ❌ No dispara evento `close-overlays`

---

## 📋 Tarea 3: Plan de Vuelo

### Orden de Implementación Recomendado

#### **Fase 1: Fundamentos (Prioridad Alta)**

1. **`layout.tsx` + `page.tsx` base**
   - ✅ Ya es Server Component
   - ❌ Agregar `loading.tsx`
   - ⚠️ Mejorar `PromiseRedirectClient` con `startTransition`

2. **`pendiente/page.tsx`**
   - ❌ Convertir a Server Component
   - ❌ Crear `loading.tsx`
   - ❌ Mover fetch de autorización a Server Component
   - ❌ Proteger navegación desde `PromiseQuotesPanelCard`

#### **Fase 2: Vistas de Estado (Prioridad Media)**

3. **`autorizada/page.tsx`**
   - ❌ Convertir a Server Component
   - ❌ Crear `loading.tsx`
   - ❌ Mover fetch a Server Component

4. **`cierre/page.tsx`**
   - ❌ Convertir a Server Component
   - ❌ Crear `loading.tsx`
   - ❌ Mover fetch a Server Component

#### **Fase 3: Rutas de Cotización (Prioridad Media-Alta)**

5. **`cotizacion/nueva/page.tsx`**
   - ❌ Convertir a Server Component (solo necesita params)
   - ❌ Crear `loading.tsx`

6. **`cotizacion/[cotizacionId]/page.tsx`**
   - ❌ Convertir a Server Component
   - ❌ Crear `loading.tsx`
   - ❌ Mover fetch a Server Component
   - ❌ Proteger navegación desde `PromiseQuotesPanelCard` y `CotizacionCard`

7. **`cotizacion/[cotizacionId]/negociacion/page.tsx`**
   - ❌ Convertir a Server Component
   - ❌ Crear `loading.tsx`
   - ❌ Mover fetch a Server Component
   - ❌ Proteger navegación desde `PromiseQuotesPanelCard`

#### **Fase 4: Rutas de Revisión (Prioridad Media)**

8. **`cotizacion/[cotizacionId]/revision/page.tsx`**
   - ❌ Convertir a Server Component
   - ❌ Crear `loading.tsx`
   - ❌ Mover fetch a Server Component
   - ❌ Proteger navegación desde `PromiseQuotesPanelCard`

9. **`cotizacion/[cotizacionId]/revision/autorizar/page.tsx`**
   - ❌ Convertir a Server Component
   - ❌ Crear `loading.tsx`
   - ❌ Mover fetch a Server Component

#### **Fase 5: Protección de Navegación (Prioridad Alta)**

10. **`PromiseQuotesPanelCard.handleClick()`**
    - ❌ Implementar `startTransition`
    - ❌ Disparar evento `close-overlays`
    - ❌ Agregar protección `isNavigating` (si aplica)

11. **`CotizacionCard` (cierre)**
    - ❌ Implementar `startTransition`
    - ❌ Disparar evento `close-overlays`

---

## 📊 Resumen Ejecutivo

### Estadísticas Generales

| Métrica | Cantidad | Porcentaje |
|---------|----------|------------|
| **Total de rutas** | 10 | 100% |
| **Con loading.tsx** | 0 | 0% |
| **Server Components** | 2 | 20% |
| **Client Components con useEffect** | 8 | 80% |
| **Con protección isNavigating** | 0 | 0% |

### Estado por Criterio

**loading.tsx:**
- ❌ **0/10 rutas** tienen `loading.tsx` (0%)

**Server-First:**
- ✅ **2/10 rutas** son Server Components (20%)
  - `layout.tsx` ✅
  - `page.tsx` (redirección) ✅
- ❌ **8/10 rutas** son Client Components con `useEffect` (80%)

**Navegación Atómica:**
- ❌ **0/10 rutas** tienen protección `isNavigating` (0%)
- ❌ **0/2 puntos de entrada** usan `startTransition` (0%)

---

## 🎯 Priorización de Implementación

### Orden Recomendado (Impacto + Complejidad)

1. **`layout.tsx` + `page.tsx`** (Fundamento)
   - Impacto: ⭐⭐⭐⭐⭐ (afecta todas las sub-rutas)
   - Complejidad: ⭐⭐ (bajo, solo agregar loading.tsx)

2. **`PromiseQuotesPanelCard.handleClick()`** (Punto de entrada crítico)
   - Impacto: ⭐⭐⭐⭐⭐ (navegación más común)
   - Complejidad: ⭐⭐ (bajo, solo agregar protección)

3. **`pendiente/page.tsx`** (Ruta más usada)
   - Impacto: ⭐⭐⭐⭐ (ruta principal de trabajo)
   - Complejidad: ⭐⭐⭐ (medio, requiere refactor)

4. **`cotizacion/[cotizacionId]/page.tsx`** (Ruta de edición)
   - Impacto: ⭐⭐⭐⭐ (navegación frecuente)
   - Complejidad: ⭐⭐⭐ (medio)

5. **`autorizada/page.tsx` + `cierre/page.tsx`** (Vistas de estado)
   - Impacto: ⭐⭐⭐ (rutas específicas)
   - Complejidad: ⭐⭐⭐ (medio)

6. **Rutas de cotización restantes** (Negociación, Revisión)
   - Impacto: ⭐⭐ (rutas especializadas)
   - Complejidad: ⭐⭐⭐ (medio)

---

## ⚠️ Riesgos Identificados

### Riesgos Críticos

1. **Race Conditions en Navegación**
   - **Ubicación:** Todas las rutas Client Component
   - **Impacto:** Alto - Usuario puede ser devuelto a lista
   - **Solución:** Implementar protección `isNavigating` en puntos de entrada

2. **Parpadeo de Skeletons**
   - **Ubicación:** 8/10 rutas
   - **Impacto:** Medio - Mala UX
   - **Solución:** Convertir a Server Components + `loading.tsx`

3. **Falta de `loading.tsx`**
   - **Ubicación:** 10/10 rutas
   - **Impacto:** Alto - Router inestable
   - **Solución:** Crear `loading.tsx` en cada nivel

### Riesgos Menores

4. **Navegación sin `startTransition`**
   - **Ubicación:** Todos los `router.push`
   - **Impacto:** Medio - Puede causar lag
   - **Solución:** Envolver en `startTransition`

5. **Falta de cierre de overlays**
   - **Ubicación:** Puntos de entrada
   - **Impacto:** Bajo - Ruido visual
   - **Solución:** Disparar evento `close-overlays`

---

## 📝 Notas Adicionales

### Patrones Encontrados

1. **Uso de Contexto (`PromiseContext`)**
   - ✅ Buen patrón para datos compartidos
   - ⚠️ Pero no reemplaza Server Components para datos iniciales

2. **Skeletons Inline**
   - ❌ Patrón prohibido según metodología
   - ⚠️ Presente en: `revision/page.tsx`, `autorizar/page.tsx`

3. **Múltiples `useEffect` en una ruta**
   - ❌ Patrón problemático
   - ⚠️ Presente en: `negociacion/page.tsx`, `revision/page.tsx`

---

**Próximo paso:** Implementar Fase 1 (Fundamentos) antes de continuar con las demás fases.
