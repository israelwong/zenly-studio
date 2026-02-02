# Análisis de Arquitectura: Promise Detalle

> **Fecha:** 2026-01-27  
> **Ruta analizada:** `/src/app/[slug]/studio/commercial/promises/[promiseId]`  
> **Objetivo:** Auditar con "ojos de halcón" para detectar sobre-hidratación y oportunidades de optimización

---

## 📊 Resumen Ejecutivo

### Estado Actual: ⚠️ **REQUIERE OPTIMIZACIÓN**

**Problemas detectados:**
1. ❌ Query principal usa `include` con múltiples relaciones (aunque usa `select` dentro)
2. ❌ Badges/contadores hacen queries separadas al montar (3+ queries)
3. ⚠️ Cliente hace fetch inicial aunque hay datos del servidor
4. ✅ Realtime está bien implementado (una sola suscripción global)

**Impacto estimado:**
- **Queries al montar:** 5-7 queries independientes
- **Tiempo de carga inicial:** ~300-500ms (sin optimizar)
- **Re-suscripciones Realtime:** 0 (bien optimizado)

---

## 1. La Query Principal

### 1.1 `determinePromiseState()` - Layout Principal

**Ubicación:** `src/lib/actions/studio/commercial/promises/promise-state.actions.ts:45`

**Estado actual:**
```typescript
const promise = await prisma.studio_promises.findUnique({
  where: { id: promiseId },
  include: {
    contact: {
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        acquisition_channel_id: true,
        social_network_id: true,
        referrer_contact_id: true,
        referrer_name: true,
        acquisition_channel: { select: { name: true } },
        social_network: { select: { name: true } },
        referrer_contact: { select: { id: true, name: true, email: true } },
      },
    },
    event_type: { select: { id: true, name: true } },
    pipeline_stage: { select: { id: true, slug: true } },
    event: { select: { id: true, status: true } },
    quotes: { select: { id: true, status: true, evento_id: true, archived: true } },
  },
});
```

**Análisis:**
- ✅ **Bien:** Usa `select` dentro de cada relación (no `include` masivo)
- ⚠️ **Mejorable:** Trae `quotes` completas aunque solo se usan 4 campos
- ⚠️ **Mejorable:** Trae `referrer_contact` completo aunque solo se usa en algunos casos
- ✅ **Bien:** No trae relaciones anidadas innecesarias

**Recomendación:**
- Convertir a `select` atómico en el nivel superior
- Separar query de `quotes` si no se usan en el layout
- Usar `Promise.all()` si hay queries independientes

**Prioridad:** 🟡 Media

---

### 1.2 `getCotizacionesByPromiseId()` - Página Pendiente

**Ubicación:** `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts:216`

**Estado actual:**
```typescript
const cotizaciones = await prisma.studio_cotizaciones.findMany({
  where: { promise_id: promiseId, /* filtros */ },
  select: {
    id: true,
    name: true,
    price: true,
    status: true,
    // ... 15+ campos
    condiciones_comerciales: {
      select: {
        id: true,
        name: true,
        discount_percentage: true,
        advance_percentage: true,
        advance_type: true,
        advance_amount: true,
      },
    },
  },
});
```

**Análisis:**
- ✅ **Bien:** Usa `select` atómico
- ✅ **Bien:** Solo trae campos necesarios
- ⚠️ **Mejorable:** Trae `condiciones_comerciales` completo aunque no siempre se usa

**Prioridad:** 🟢 Baja (ya está optimizado)

---

## 2. Los Badges/Contadores

### 2.1 `PromiseStatsCard` - 3 Queries Separadas

**Ubicación:** `src/app/[slug]/studio/commercial/promises/[promiseId]/pendiente/components/PromiseStatsCard.tsx:36`

**Problema detectado:**
```typescript
useEffect(() => {
  if (promiseId) {
    loadStats(); // ❌ Fetch al montar sin datos iniciales
  }
}, [promiseId]);

const loadStats = async () => {
  const [viewsResult, cotizacionesResult, paquetesResult] = await Promise.allSettled([
    getPromiseViewStats(promiseId),      // Query 1
    getCotizacionClickStats(promiseId),  // Query 2
    getPaqueteClickStats(promiseId),     // Query 3
  ]);
  // ...
};
```

**Análisis:**
- ❌ **Problema:** Hace 3 queries separadas al montar
- ❌ **Problema:** No recibe `initialData` del servidor
- ❌ **Problema:** Cada query es independiente (podrían consolidarse)

**Recomendación:**
1. Crear una acción única `getPromiseStats(promiseId)` que consolide las 3 queries
2. Pasar `initialStats` desde el servidor (page.tsx)
3. Cliente solo muestra `initialStats` y se suscribe a Realtime para actualizaciones

**Prioridad:** 🔴 Alta

---

### 2.2 `PromiseQuotesPanelCard` - Click Count Individual

**Ubicación:** `src/app/[slug]/studio/commercial/promises/[promiseId]/pendiente/components/cotizaciones/PromiseQuotesPanelCard.tsx:125`

**Problema detectado:**
```typescript
useEffect(() => {
  const loadClickCount = async () => {
    const result = await getCotizacionClickCount(cotizacion.id); // ❌ Query por card
    if (result.success && result.data) {
      setClickCount(result.data.clicks);
    }
  };
  loadClickCount();
}, [cotizacion.id]);
```

**Análisis:**
- ❌ **Problema:** Cada card hace su propia query de click count
- ❌ **Problema:** Si hay 10 cotizaciones = 10 queries adicionales
- ❌ **Problema:** No hay datos iniciales del servidor

**Recomendación:**
1. Incluir `click_count` en `getCotizacionesByPromiseId()` (JOIN o subquery)
2. Pasar `clickCount` como prop desde el padre
3. Eliminar `useEffect` de cada card

**Prioridad:** 🔴 Alta

---

## 3. El Realtime

### 3.1 `useCotizacionesRealtime` - Suscripción Global

**Ubicación:** `src/hooks/useCotizacionesRealtime.ts:37`

**Estado actual:**
```typescript
export function useCotizacionesRealtime({
  studioSlug,
  promiseId,
  onCotizacionInserted,
  onCotizacionUpdated,
  onCotizacionDeleted,
  ignoreCierreEvents = false,
}: UseCotizacionesRealtimeProps) {
  // ✅ Usa useRef para callbacks estables
  const onInsertedRef = useRef(onCotizacionInserted);
  const onUpdatedRef = useRef(onCotizacionUpdated);
  const onDeletedRef = useRef(onCotizacionDeleted);
  
  // ✅ Una sola suscripción global
  useEffect(() => {
    const channel = createRealtimeChannel(supabase, channelConfig);
    channel.on('broadcast', { event: '*' }, handleUpdate);
    // ...
  }, [studioSlug, promiseId]);
}
```

**Análisis:**
- ✅ **Excelente:** Una sola suscripción global (no múltiples)
- ✅ **Excelente:** Usa `useRef` para callbacks estables (evita re-suscripciones)
- ✅ **Excelente:** Dependencias estables (`studioSlug`, `promiseId`)
- ✅ **Excelente:** Cleanup correcto del canal

**Prioridad:** 🟢 Sin cambios necesarios

---

### 3.2 Uso en Componentes

**Ubicación:** `src/app/[slug]/studio/commercial/promises/[promiseId]/pendiente/components/cotizaciones/PromiseQuotesPanel.tsx:188`

**Estado actual:**
```typescript
useCotizacionesRealtime({
  studioSlug,
  promiseId: promiseId || null,
  ignoreCierreEvents: true,
  onCotizacionInserted: () => {
    loadCotizaciones(); // ⚠️ Recarga completa
  },
  onCotizacionUpdated: (cotizacionId, payload) => {
    // Lógica compleja de actualización selectiva
    if (changeInfo?.statusChanged) {
      loadCotizaciones(); // ⚠️ Recarga completa
    }
  },
  onCotizacionDeleted: (cotizacionId) => {
    setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId)); // ✅ Optimista
  },
});
```

**Análisis:**
- ⚠️ **Mejorable:** `onCotizacionInserted` recarga completa (podría ser optimista)
- ⚠️ **Mejorable:** `onCotizacionUpdated` recarga completa en algunos casos
- ✅ **Bien:** `onCotizacionDeleted` usa actualización optimista

**Recomendación:**
- Actualización optimista para INSERT (agregar al array local)
- Actualización selectiva para UPDATE (solo actualizar el item específico)
- Mantener recarga completa solo para cambios críticos de estado

**Prioridad:** 🟡 Media

---

## 4. Estrategia de Cliente (Hidratación)

### 4.1 Fetch Inicial en Cliente

**Problema 1: `PromiseQuotesPanel` - loadCotizaciones al montar**

**Ubicación:** `src/app/[slug]/studio/commercial/promises/[promiseId]/pendiente/components/cotizaciones/PromiseQuotesPanel.tsx:150`

```typescript
const loadCotizaciones = React.useCallback(async () => {
  if (!promiseId || !isSaved) return;
  setLoadingCotizaciones(true);
  const result = await getCotizacionesByPromiseId(promiseId); // ❌ Fetch al montar
  setCotizaciones(result.data || []);
}, [promiseId, isSaved]);

useEffect(() => {
  loadCotizaciones(); // ❌ Se ejecuta al montar
}, [loadCotizaciones]);
```

**Análisis:**
- ❌ **Problema:** Hace fetch al montar aunque `page.tsx` ya carga cotizaciones
- ❌ **Problema:** No recibe `initialCotizaciones` del servidor
- ❌ **Problema:** Duplica trabajo (servidor + cliente)

**Recomendación:**
1. Pasar `initialCotizaciones` desde `page.tsx` como prop
2. Cliente muestra `initialCotizaciones` de inmediato
3. Realtime solo para actualizaciones posteriores

**Prioridad:** 🔴 Alta

---

**Problema 2: `PromiseStatsCard` - loadStats al montar**

**Ubicación:** `src/app/[slug]/studio/commercial/promises/[promiseId]/pendiente/components/PromiseStatsCard.tsx:82`

```typescript
useEffect(() => {
  if (promiseId) {
    loadStats(); // ❌ Fetch al montar sin datos iniciales
  }
}, [promiseId]);
```

**Análisis:**
- ❌ **Problema:** No recibe `initialStats` del servidor
- ❌ **Problema:** Hace 3 queries al montar

**Recomendación:**
- Pasar `initialStats` desde `page.tsx`
- Cliente muestra `initialStats` de inmediato

**Prioridad:** 🔴 Alta

---

**Problema 3: `PromiseQuotesPanel` - loadPackages al montar**

**Ubicación:** `src/app/[slug]/studio/commercial/promises/[promiseId]/pendiente/components/cotizaciones/PromiseQuotesPanel.tsx:114`

```typescript
useEffect(() => {
  const loadPackages = async () => {
    if (!eventTypeId) return;
    const result = await obtenerPaquetes(studioSlug); // ❌ Fetch al montar
    setPackages(filteredPackages);
  };
  loadPackages();
}, [studioSlug, eventTypeId]);
```

**Análisis:**
- ⚠️ **Mejorable:** Hace fetch al montar aunque podría venir del servidor
- ⚠️ **Mejorable:** Depende de `eventTypeId` (podría no estar disponible inmediatamente)

**Recomendación:**
- Si `eventTypeId` está disponible en el servidor, cargar paquetes ahí
- Pasar `initialPackages` como prop

**Prioridad:** 🟡 Media

---

## 5. Checklist de Optimización

### ✅ Ya Optimizado

- [x] Realtime: Una sola suscripción global con callbacks estables
- [x] `getCotizacionesByPromiseId`: Usa `select` atómico
- [x] Layout: Usa `Promise.all()` para queries independientes

### ❌ Requiere Optimización

- [ ] **Query Principal:** Convertir `determinePromiseState` a `select` atómico
- [ ] **Badges/Contadores:** Consolidar 3 queries de stats en una sola
- [ ] **Click Counts:** Incluir en query principal de cotizaciones
- [ ] **Fetch Inicial:** Eliminar `loadCotizaciones` al montar (usar `initialData`)
- [ ] **Fetch Inicial:** Eliminar `loadStats` al montar (usar `initialStats`)
- [ ] **Fetch Inicial:** Considerar `initialPackages` desde servidor

---

## 6. Plan de Acción Recomendado

### Fase 1: Eliminar Fetchs Iniciales (Impacto Alto, Esfuerzo Bajo)

1. **Modificar `page.tsx` (pendiente):**
   ```typescript
   // Cargar stats en servidor
   const [cotizacionesResult, statsResult] = await Promise.all([
     getCotizacionesByPromiseId(promiseId),
     getPromiseStats(promiseId), // Nueva acción consolidada
   ]);
   
   return (
     <PromisePendienteClient
       initialCotizaciones={cotizacionesResult.data}
       initialStats={statsResult.data}
     />
   );
   ```

2. **Modificar `PromisePendienteClient`:**
   - Recibir `initialCotizaciones` y `initialStats` como props
   - Eliminar `useEffect` de `loadCotizaciones` y `loadStats`
   - Usar `initialData` directamente

**Impacto:** Elimina 4-5 queries al montar  
**Esfuerzo:** 2-3 horas

---

### Fase 2: Consolidar Queries de Stats (Impacto Medio, Esfuerzo Medio)

1. **Crear `getPromiseStats()` consolidada:**
   ```typescript
   export async function getPromiseStats(promiseId: string) {
     const [views, cotizaciones, paquetes] = await Promise.all([
       getPromiseViewStats(promiseId),
       getCotizacionClickStats(promiseId),
       getPaqueteClickStats(promiseId),
     ]);
     return { views, cotizaciones, paquetes };
   }
   ```

2. **Incluir click_count en `getCotizacionesByPromiseId`:**
   - Agregar JOIN o subquery para `click_count`
   - Retornar `click_count` en cada cotización

**Impacto:** Reduce queries de N+1 a 1  
**Esfuerzo:** 3-4 horas

---

### Fase 3: Optimizar Query Principal (Impacto Bajo, Esfuerzo Bajo)

1. **Convertir `determinePromiseState` a `select` atómico:**
   ```typescript
   const promise = await prisma.studio_promises.findUnique({
     where: { id: promiseId },
     select: {
       id: true,
       contact_id: true,
       // Solo campos necesarios
     },
   });
   ```

2. **Separar query de quotes si no se usa en layout:**
   - Mover a página específica si solo se usa ahí

**Impacto:** Reduce tamaño de query principal  
**Esfuerzo:** 2-3 horas

---

## 7. Métricas Esperadas Post-Optimización

### Antes (Actual)
- **Queries al montar:** 5-7 queries
- **Tiempo de carga inicial:** ~300-500ms
- **POSTs desde cliente:** 4-5 requests
- **Re-suscripciones Realtime:** 0 ✅

### Después (Optimizado)
- **Queries al montar:** 2-3 queries (consolidadas)
- **Tiempo de carga inicial:** ~150-250ms (50% mejora)
- **POSTs desde cliente:** 0 requests (solo Realtime)
- **Re-suscripciones Realtime:** 0 ✅

---

## 8. Referencias

- **Protocolo de Optimización:** `.cursor/docs/protocolo-optimizacion-zenly.md`
- **Layout Ultraligero:** `.cursor/rules/layout-ultraligero-decisionador-cliente.mdc`
- **Master Plan:** `.cursor/MASTER_PLAN_OPTIMIZACION.md`

---

**Última actualización:** 2026-01-27  
**Mantenedor:** Análisis de Arquitectura Promise Detalle
