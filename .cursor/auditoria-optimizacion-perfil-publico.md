# Auditoría de Optimización: Perfil Público (`/[slug]/profile/public`)

**Fecha:** 2025-01-28  
**Ruta analizada:** `src/app/[slug]/profile/public`  
**Metodología:** ZEN v2.0

---

## ✅ Implementaciones Correctas

### 1. Fragmentación Basic + Deferred ✅
- **Estado:** Implementado correctamente
- **Archivo:** `page.tsx`
- **Detalles:**
  - Basic Data: `getStudioProfileBasicData()` con `await` (bloqueante)
  - Deferred Data: `getStudioProfileDeferredPosts()`, `getStudioProfileDeferredPortfolios()`, `getPublicActiveOffers()` como promesas (sin `await`)
  - Header renderiza inmediatamente, contenido pesado via streaming

### 2. Streaming con Hook `use()` ✅
- **Estado:** Implementado correctamente
- **Archivo:** `ProfilePageStreaming.tsx`
- **Detalles:**
  - Usa `use()` de React 19 para resolver promesas
  - Suspense con `ProfilePageSkeleton` como fallback
  - Resuelve 3 promesas en paralelo: posts, portfolios, offers

### 3. Virtual Scrolling ✅
- **Estado:** Implementado correctamente
- **Archivos:** `MainSection.tsx`, `PortfolioSection.tsx`
- **Detalles:**
  - Usa Virtua para renderizar solo items visibles
  - Alturas dinámicas estimadas
  - Scroll nativo en desktop, VList en mobile

### 4. startTransition en Tabs ✅
- **Estado:** Implementado parcialmente
- **Archivo:** `useProfilePageLogic.ts:181`
- **Detalles:**
  - `handleTabChange` usa `startTransition` ✅
  - Otras navegaciones (`handlePostClick`, `handlePortfolioClick`) NO usan `startTransition` ⚠️

### 5. Metadata Ligera ✅
- **Estado:** Implementado correctamente
- **Archivo:** `page.tsx:generateMetadata`
- **Detalles:**
  - Query separada `getStudioProfileMetadata()` (ultra-ligera)
  - Solo 5 campos esenciales para SEO
  - Sin duplicación con queries principales

### 6. loading.tsx ✅
- **Estado:** Implementado
- **Archivo:** `src/app/[slug]/loading.tsx` existe
- **Detalles:**
  - Skeleton para transiciones de ruta
  - Protege estabilidad del Router

---

## ⚠️ Oportunidades de Optimización

### 1. Caché con Tags e Invalidación ⚠️ **PRIORIDAD ALTA**

**Problema:** Las queries no usan `unstable_cache` con tags para invalidación selectiva.

**Impacto:**
- No hay invalidación granular de caché
- Cambios en posts/portfolios requieren revalidación manual completa
- No hay aislamiento por tenant en caché

**Solución Recomendada:**

```typescript
// src/lib/actions/public/profile.actions.ts
import { unstable_cache } from 'next/cache';

export async function getStudioProfileBasicData({ slug }: { slug: string }) {
  // Cachear con tag por studio
  const getCachedBasic = unstable_cache(
    async () => {
      // ... query actual
    },
    ['studio-profile-basic', slug],
    {
      tags: [`studio-profile-basic-${slug}`],
      revalidate: 3600, // 1 hora
    }
  );
  
  return getCachedBasic();
}

export async function getStudioProfileDeferredPosts(studioId: string, isOwner: boolean) {
  const getCachedPosts = unstable_cache(
    async () => {
      // ... query actual
    },
    ['studio-profile-posts', studioId, String(isOwner)],
    {
      tags: [`studio-profile-posts-${studioId}`],
      revalidate: 300, // 5 minutos
    }
  );
  
  return getCachedPosts();
}
```

**Invalidación en Server Actions:**

```typescript
// Al crear/actualizar post
import { revalidateTag } from 'next/cache';

export async function createPost(studioId: string, data: PostData) {
  // ... crear post
  revalidateTag(`studio-profile-posts-${studioId}`);
  revalidateTag(`studio-profile-basic-${slug}`); // Si afecta metadata
}
```

**Beneficios:**
- Invalidación granular por studio
- Mejor performance en lecturas repetidas
- Aislamiento entre tenants

---

### 2. Flag `isNavigating` para Prevenir Race Conditions ⚠️ **PRIORIDAD MEDIA**

**Problema:** No hay protección contra race conditions durante navegaciones.

**Impacto:**
- Si hay actualizaciones de realtime (Supabase) durante navegación, pueden sobrescribir el estado
- Posibles "rebotes" en la UI

**Solución Recomendada:**

```typescript
// useProfilePageLogic.ts
export function useProfilePageLogic({ profileData, studioSlug, offers = [] }: UseProfilePageLogicProps) {
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Sincronizar datos solo si NO estamos navegando
  useEffect(() => {
    if (!isNavigatingRef.current) {
      // Sincronizar datos si vienen del servidor
    }
  }, [profileData]);

  const handlePostClick = (postSlug: string) => {
    setIsNavigating(postSlug);
    isNavigatingRef.current = true;
    
    startTransition(() => {
      setSelectedPostSlug(postSlug);
      router.push(buildUrl({ post: postSlug, tab: activeTab }), { scroll: false });
      
      setTimeout(() => {
        setIsNavigating(null);
        isNavigatingRef.current = false;
      }, 1000);
    });
  };

  // ... resto del código
}
```

**Beneficios:**
- Previene race conditions
- Navegación más estable
- Mejor UX

---

### 3. startTransition en Todas las Navegaciones ⚠️ **PRIORIDAD BAJA**

**Problema:** Solo `handleTabChange` usa `startTransition`, otras navegaciones no.

**Impacto:**
- Navegaciones de posts/portfolios pueden bloquear UI
- Menor fluidez en transiciones

**Solución Recomendada:**

```typescript
// useProfilePageLogic.ts
const handlePostClick = (postSlug: string) => {
  startTransition(() => {
    setSelectedPostSlug(postSlug);
    router.push(buildUrl({ post: postSlug, tab: activeTab }), { scroll: false });
  });
};

const handlePortfolioClick = (portfolioSlug: string) => {
  startTransition(() => {
    setSelectedPortfolioSlug(portfolioSlug);
    router.push(buildUrl({ portfolio: portfolioSlug, tab: activeTab }), { scroll: false });
  });
};
```

**Beneficios:**
- UI más fluida
- Transiciones no bloqueantes
- Mejor percepción de performance

---

### 4. Evento `close-overlays` para Higiene de UI ⚠️ **PRIORIDAD BAJA**

**Problema:** No hay mecanismo para cerrar overlays al navegar.

**Impacto:**
- Modals/sheets pueden quedar abiertos al navegar
- Confusión visual

**Solución Recomendada:**

```typescript
// useProfilePageLogic.ts
const handlePostClick = (postSlug: string) => {
  // Cerrar overlays antes de navegar
  window.dispatchEvent(new CustomEvent('close-overlays'));
  
  startTransition(() => {
    setSelectedPostSlug(postSlug);
    router.push(buildUrl({ post: postSlug, tab: activeTab }), { scroll: false });
  });
};
```

**Beneficios:**
- UI más limpia
- Sin overlays "fantasma"
- Mejor UX

---

## 📊 Resumen de Estado

| Aspecto | Estado | Prioridad | Esfuerzo |
|---------|--------|-----------|----------|
| Fragmentación Basic + Deferred | ✅ Completo | - | - |
| Streaming con use() | ✅ Completo | - | - |
| Virtual Scrolling | ✅ Completo | - | - |
| Metadata Ligera | ✅ Completo | - | - |
| loading.tsx | ✅ Completo | - | - |
| Caché con Tags | ⚠️ Falta | Alta | Medio |
| Flag isNavigating | ⚠️ Falta | Media | Bajo |
| startTransition completo | ⚠️ Parcial | Baja | Muy Bajo |
| close-overlays | ⚠️ Falta | Baja | Muy Bajo |

---

## 🎯 Recomendaciones Prioritarias

### Prioridad 1: Caché con Tags
- **Impacto:** Alto (performance, escalabilidad)
- **Esfuerzo:** Medio (requiere cambios en server actions)
- **ROI:** Muy alto

### Prioridad 2: Flag isNavigating
- **Impacto:** Medio (estabilidad, UX)
- **Esfuerzo:** Bajo (solo hook)
- **ROI:** Alto

### Prioridad 3: startTransition completo + close-overlays
- **Impacto:** Bajo (polish, UX)
- **Esfuerzo:** Muy bajo (cambios menores)
- **ROI:** Medio

---

## ✅ Conclusión

El perfil público está **bien optimizado** según la metodología ZEN, con las implementaciones core correctas:
- ✅ Fragmentación
- ✅ Streaming
- ✅ Virtual scrolling
- ✅ Metadata ligera

**Mejoras recomendadas:**
1. Implementar caché con tags (alta prioridad)
2. Agregar flag `isNavigating` (media prioridad)
3. Completar `startTransition` y `close-overlays` (baja prioridad)

**Estado general:** 85% optimizado según ZEN v2.0
