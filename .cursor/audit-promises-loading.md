# Auditoría Técnica - Sistema de Carga y Navegación: Promesas

**Fecha:** 18 de enero de 2025  
**Rama:** `260118-studio-promise-loading`  
**Problema:** Navigation Race Conditions al navegar de Kanban a detalle

---

## 1. ESTRUCTURA DE CARGA

### 1.1 Arquitectura Actual

**Ruta:** `/[slug]/studio/commercial/promises/`

```
promises/
├── page.tsx (Client Component)
│   └── PromisesPageContent
│       └── PromisesWrapper (Client Component)
│           ├── Estado: loading (useState)
│           ├── loadData() (useCallback)
│           └── PromisesSkeleton (condicional)
└── [promiseId]/
    ├── page.tsx (Server Component)
    ├── layout.tsx (Server Component)
    └── components/
        └── PromiseLayoutClient (Client Component)
```

### 1.2 Patrón de Carga Identificado

**❌ NO usa `loading.tsx` nativo de Next.js**

- **Promesas:** Skeleton renderizado condicionalmente dentro de `PromisesWrapper`
- **Detalle:** Skeleton renderizado en `PromiseLayoutSkeleton` (componente interno)
- **Redirección:** `PromiseRedirectClient` muestra skeleton durante redirección

**Problema:** No aprovecha el sistema de Suspense/Streaming de Next.js 15.

---

## 2. FLUJO DE DATOS Y REVALIDACIONES

### 2.1 Revalidaciones en Server Actions

**Ubicaciones con `revalidatePath`:**

```typescript
// promises.actions.ts
revalidatePath(`/${studioSlug}/studio/commercial/promises`);
revalidatePath(`/${studioSlug}/studio/commercial/crm`);

// cotizaciones.actions.ts
revalidatePath(`/${studioSlug}/studio/commercial/promises`);
revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacionId}/revision`);
```

### 2.2 Revalidaciones en Client Components

**Ubicaciones con `router.refresh()`:**

```typescript
// PromiseLayoutClient.tsx (4 instancias)
router.refresh(); // Líneas 60, 79, 97, 113

// PromiseQuotesPanelCard.tsx (3 instancias)
router.refresh(); // Líneas 447, 484, 599

// CotizacionForm.tsx (3 instancias)
router.refresh(); // Líneas 634, 637, 640
```

### 2.3 Flujo de Carga en PromisesWrapper

```typescript
// PromisesWrapper.tsx
useEffect(() => {
  loadData(); // Se ejecuta al montar
}, [loadData]);

const loadData = useCallback(async () => {
  setLoading(true);
  const [promisesResult, stagesResult] = await Promise.all([
    getPromises(studioSlug, { page: 1, limit: 1000 }),
    getPipelineStages(studioSlug),
  ]);
  // ... actualizar estado
  setLoading(false);
}, [studioSlug]);
```

**⚠️ PROBLEMA CRÍTICO:**

1. `loadData()` se ejecuta en `useEffect` al montar
2. Si hay una revalidación tardía desde un Server Action, puede disparar un re-render
3. Durante la navegación, si `PromisesWrapper` se re-renderiza, puede ejecutar `loadData()` nuevamente
4. Esto interrumpe la navegación iniciada por `router.push()`

---

## 3. INTERACCIÓN PREMATURA - PromiseKanbanCard

### 3.1 Flujo de Navegación

```typescript
// PromiseKanbanCard.tsx (línea 451-455)
const handleViewDetails = () => {
  if (onClick) {
    onClick(promise);
  }
};

// PromisesKanban.tsx (línea 562-566)
const handlePromiseClick = (promise: PromiseWithContact) => {
  const routeId = promise.promise_id || promise.id;
  router.push(`/${studioSlug}/studio/commercial/promises/${routeId}`);
};
```

### 3.2 Análisis de Atomicidad

**❌ Navegación NO es atómica:**

- Usa `router.push()` que es asíncrono
- No hay protección contra re-renders del padre
- No hay flag de "navegando" que prevenga revalidaciones
- El clic puede ser interrumpido si el padre se re-renderiza

**Comparación con EventKanbanCard:**

```typescript
// EventKanbanCard.tsx (línea 36-48)
const handleClick = (e: React.MouseEvent) => {
  if (isDragging) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  if (onClick) {
    onClick(event);
  }
};
```

**Diferencia:** Events tiene protección contra clics durante drag, pero Promesas no tiene protección contra re-renders durante navegación.

---

## 4. INCONSISTENCIAS CON OTRAS RUTAS

### 4.1 Comparación de Patrones

| Ruta | `loading.tsx` | Skeleton Condicional | `router.refresh()` | `revalidatePath` |
|------|---------------|---------------------|-------------------|------------------|
| **Promesas** | ❌ No | ✅ Sí (PromisesWrapper) | ✅ Sí (múltiples) | ✅ Sí (múltiples) |
| **Eventos** | ❌ No | ✅ Sí (EventsWrapper) | ❌ No encontrado | ✅ Sí (en actions) |
| **Finanzas** | ❌ No | ❌ No | ✅ Sí (1 instancia) | ❌ No encontrado |

### 4.2 Patrones Mezclados

**Problema:** El sistema mezcla:

1. **Skeletons manuales** (PromisesWrapper, EventsWrapper)
2. **Revalidaciones de Server Actions** (`revalidatePath`)
3. **Revalidaciones de Client Components** (`router.refresh()`)
4. **Actualizaciones optimistas** (en Kanban)
5. **Realtime updates** (usePromisesRealtime)

**Resultado:** Múltiples fuentes de verdad que pueden entrar en conflicto.

---

## 5. DIAGNÓSTICO DEL RACE CONDITION

### 5.1 Secuencia del Problema

```
1. Usuario hace clic en PromiseKanbanCard
   └─> handleViewDetails() → onClick(promise) → router.push()

2. router.push() inicia navegación (asíncrono)
   └─> Next.js comienza a cargar /promises/[promiseId]

3. Mientras tanto, un Server Action completa (tardío)
   └─> revalidatePath('/promises') se ejecuta

4. Next.js detecta revalidación de ruta padre
   └─> Re-renderiza PromisesWrapper

5. PromisesWrapper se re-renderiza
   └─> useEffect detecta cambio → loadData() se ejecuta

6. loadData() completa y actualiza estado
   └─> React reconcilia y puede cancelar navegación pendiente

7. Usuario es devuelto a /promises (página padre)
```

### 5.2 Factores Contribuyentes

1. **Falta de `loading.tsx`:** Next.js no puede manejar la transición de forma nativa
2. **Revalidaciones agresivas:** Múltiples `revalidatePath` en rutas padre
3. **`router.refresh()` en client:** Puede disparar re-renders inesperados
4. **Navegación no protegida:** No hay flag que prevenga revalidaciones durante navegación
5. **Client Component en page.tsx:** La página principal es client, no aprovecha SSR

---

## 6. PROPUESTA: METODOLOGÍA ZEN

### 6.1 Principios Fundamentales

1. **Separación de Responsabilidades**
   - Server Components para datos iniciales
   - Client Components solo para interactividad
   - `loading.tsx` para estados de carga nativos

2. **Navegación Atómica**
   - Flags de "navegando" para prevenir revalidaciones
   - `startTransition` para marcar navegaciones como no-urgentes
   - Protección contra re-renders durante transiciones

3. **Revalidación Estratégica**
   - `revalidatePath` solo en Server Actions
   - Evitar `router.refresh()` en client components
   - Usar actualizaciones optimistas + realtime para UI

4. **Estados de Carga Consistentes**
   - `loading.tsx` en todas las rutas dinámicas
   - Skeletons solo para componentes internos
   - Suspense boundaries para streaming

### 6.2 Estructura Propuesta

```
promises/
├── page.tsx (Server Component)
│   └── PromisesPage (async, fetch directo)
│       └── PromisesKanbanClient (Client Component)
├── loading.tsx (Skeleton nativo)
└── [promiseId]/
    ├── page.tsx (Server Component)
    ├── layout.tsx (Server Component)
    ├── loading.tsx (Skeleton nativo)
    └── components/
        └── PromiseLayoutClient (Client Component)
```

### 6.3 Patrón de Navegación Protegida

```typescript
// PromisesKanban.tsx
const [isNavigating, setIsNavigating] = useState<string | null>(null);

const handlePromiseClick = (promise: PromiseWithContact) => {
  const routeId = promise.promise_id || promise.id;
  setIsNavigating(routeId);
  
  startTransition(() => {
    router.push(`/${studioSlug}/studio/commercial/promises/${routeId}`);
  });
};

// Prevenir revalidaciones durante navegación
useEffect(() => {
  if (isNavigating) {
    // Bloquear loadData() mientras navega
    return;
  }
}, [isNavigating]);
```

### 6.4 Patrón de Revalidación Estratégica

```typescript
// Server Actions: revalidatePath específico
revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`, 'page');

// Client Components: NO usar router.refresh()
// En su lugar, usar actualizaciones optimistas + realtime
```

### 6.5 Checklist de Implementación

- [ ] Convertir `page.tsx` a Server Component
- [ ] Crear `loading.tsx` en `/promises`
- [ ] Crear `loading.tsx` en `/promises/[promiseId]`
- [ ] Implementar flag `isNavigating` en PromisesKanban
- [ ] Reemplazar `router.refresh()` con actualizaciones optimistas
- [ ] Reducir `revalidatePath` a rutas específicas (no padre)
- [ ] Usar `startTransition` para navegaciones
- [ ] Agregar protección contra re-renders durante navegación

---

## 7. MÉTRICAS DE ÉXITO

1. **Navegación sin interrupciones:** 0% de casos donde usuario es devuelto a padre
2. **Tiempo de transición:** < 200ms desde clic hasta skeleton del detalle
3. **Consistencia:** Mismo patrón en todas las rutas (Promesas, Eventos, etc.)
4. **Performance:** Reducción de re-renders innecesarios durante navegación

---

## 8. RIESGOS Y CONSIDERACIONES

### 8.1 Riesgos de Implementación

- **Breaking changes:** Cambiar `page.tsx` a Server Component puede romper estado local
- **Realtime sync:** Necesita verificación de que realtime sigue funcionando
- **Testing:** Requiere pruebas exhaustivas de navegación en diferentes escenarios

### 8.2 Consideraciones Técnicas

- **Next.js 15:** Aprovechar `loading.tsx` y Suspense nativo
- **React 19:** Usar `startTransition` para navegaciones
- **Backward compatibility:** Mantener funcionalidad existente durante migración

---

**Próximos Pasos:** Implementar solución piloto en ruta de Promesas antes de escalar a sistema completo.
