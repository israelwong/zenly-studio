# Metodología de Optimización ZEN

**Versión:** 1.0  
**Fecha:** Enero 2025  
**Aplicable a:** Next.js 15+ con React 19

---

## 📋 Tabla de Contenidos

1. [Arquitectura Server-First](#1-arquitectura-server-first)
2. [Streaming Nativo](#2-streaming-nativo)
3. [Navegación Atómica](#3-navegación-atómica)
4. [Gestión de Rutas Anidadas](#4-gestión-de-rutas-anidadas)
5. [Higiene de UI Global](#5-higiene-de-ui-global)
6. [Sistema de Caché con Tags](#6-sistema-de-caché-con-tags)
7. [Checklist de Implementación](#7-checklist-de-implementación)

---

## 1. Arquitectura Server-First

### Principio Fundamental

**Los datos iniciales DEBEN cargarse en Server Components (`page.tsx` async) para eliminar el parpadeo de Skeletons basados en `useEffect`.**

### ❌ Patrón Incorrecto (Client-First)

```tsx
// ❌ MAL: Client Component con useEffect
'use client';

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData(); // Parpadeo visible, mala UX
  }, []);

  if (loading) return <Skeleton />;
  return <ItemsList items={items} />;
}
```

**Problemas:**
- Parpadeo visible del skeleton
- Race conditions al navegar
- Pérdida de beneficios de SSR

### ✅ Patrón Correcto (Server-First)

```tsx
// ✅ BIEN: Server Component con fetch directo
import { getItems } from '@/lib/actions/items';
import { ItemsPageClient } from './components/ItemsPageClient';

export default async function ItemsPage({ params }: ItemsPageProps) {
  const { slug } = await params;
  
  const itemsResult = await getItems(slug);
  const items = itemsResult.success && itemsResult.data 
    ? itemsResult.data 
    : [];

  return (
    <ItemsPageClient
      studioSlug={slug}
      initialItems={items}
    />
  );
}
```

**Beneficios:**
- Sin parpadeo: datos disponibles en el HTML inicial
- Mejor SEO y performance
- Streaming nativo de Next.js

### Estructura Recomendada

```
items/
├── page.tsx              # Server Component (async, fetch directo)
├── loading.tsx           # Skeleton para transiciones
└── components/
    ├── ItemsPageClient.tsx  # Client Component (interactividad)
    └── ItemsList.tsx        # Componente de presentación
```

---

## 2. Streaming Nativo

### Obligatoriedad de `loading.tsx`

**Cada segmento de ruta dinámica DEBE tener su `loading.tsx` para proteger la estabilidad del Router de Next.js.**

### Estructura de Archivos

```
items/
├── page.tsx
├── loading.tsx          # ✅ OBLIGATORIO para rutas dinámicas
└── [itemId]/
    ├── page.tsx
    ├── layout.tsx
    ├── loading.tsx      # ✅ OBLIGATORIO para sub-rutas
    └── edit/
        ├── page.tsx
        └── loading.tsx  # ✅ OBLIGATORIO para cada nivel
```

### Implementación

```tsx
// items/loading.tsx
import { ItemsSkeleton } from './components';

export default function ItemsLoading() {
  return <ItemsSkeleton />;
}
```

```tsx
// items/[itemId]/loading.tsx
import { ItemDetailSkeleton } from './components';

export default function ItemDetailLoading() {
  return <ItemDetailSkeleton />;
}
```

### Beneficios

- **Transiciones suaves:** Next.js muestra el skeleton automáticamente
- **Sin race conditions:** El router espera a que los datos estén listos
- **Mejor UX:** El usuario ve feedback inmediato

### ⚠️ Regla Crítica

**NUNCA usar skeletons condicionales basados en `useState` + `useEffect` en Client Components cuando hay datos del servidor.**

```tsx
// ❌ PROHIBIDO
'use client';
function ItemsPageClient({ initialItems }) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(false); // Parpadeo innecesario
  }, []);
  
  if (loading) return <Skeleton />; // ❌
  return <ItemsList items={initialItems} />;
}
```

---

## 3. Navegación Atómica

### Problema: Race Conditions

Al navegar de una lista a un detalle, si el padre se revalida tarde, el usuario puede ser devuelto a la lista. Esto se conoce como "Navigation Race Condition".

### Solución: Patrón `isNavigating` + `startTransition`

### Implementación Completa

#### 3.1 Componente Cliente (Wrapper)

```tsx
// components/ItemsKanbanClient.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { startTransition } from 'react';
import { ItemsKanban } from './ItemsKanban';

export function ItemsKanbanClient({
  studioSlug,
  initialItems,
}: ItemsKanbanClientProps) {
  const [items, setItems] = useState(initialItems);
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Sincronizar items cuando cambian desde el servidor
  useEffect(() => {
    // Solo sincronizar si NO estamos navegando
    if (!isNavigatingRef.current) {
      setItems(initialItems);
    }
  }, [initialItems]);

  return (
    <ItemsKanban
      studioSlug={studioSlug}
      items={items}
      isNavigating={isNavigating}
      setIsNavigating={(itemId: string | null) => {
        setIsNavigating(itemId);
        isNavigatingRef.current = itemId !== null;
      }}
    />
  );
}
```

#### 3.2 Componente de Navegación (Kanban)

```tsx
// components/ItemsKanban.tsx
'use client';

import { startTransition } from 'react';
import { useRouter } from 'next/navigation';

function ItemsKanban({
  studioSlug,
  items,
  isNavigating,
  setIsNavigating,
}: ItemsKanbanProps) {
  const router = useRouter();

  // Sincronizar estado local cuando cambian los items desde el padre
  useEffect(() => {
    // Si estamos navegando, no sincronizar (previene race condition)
    if (isNavigating) {
      prevItemsRef.current = items;
      return;
    }
    // ... lógica de sincronización
  }, [items, isNavigating]);

  const handleItemClick = (item: Item) => {
    const routeId = item.id;
    
    // Cerrar overlays globales antes de navegar
    window.dispatchEvent(new CustomEvent('close-overlays'));
    
    // Activar flag de navegación
    if (setIsNavigating) {
      setIsNavigating(routeId);
    }

    // Usar startTransition para dar prioridad a la navegación
    startTransition(() => {
      router.push(`/${studioSlug}/items/${routeId}`);
      
      // Limpiar flag después de un delay
      setTimeout(() => {
        if (setIsNavigating) {
          setIsNavigating(null);
        }
      }, 1000);
    });
  };

  // ... resto del componente
}
```

### Protecciones Implementadas

1. **Flag `isNavigating`:** Previene sincronización durante navegación
2. **`startTransition`:** Marca la navegación como no-urgente, priorizando UI
3. **Ref `isNavigatingRef`:** Previene actualizaciones de realtime durante navegación
4. **Timeout de limpieza:** Asegura que el flag se resetee después de la transición

### Resultado

✅ Navegación instantánea sin rebotes  
✅ Sin race conditions  
✅ Transiciones fluidas

---

## 4. Gestión de Rutas Anidadas

### Estructura de Ejemplo

```
items/
├── page.tsx                    # Lista (Server Component)
├── loading.tsx                 # Skeleton de lista
└── [itemId]/
    ├── layout.tsx              # Layout del detalle (Server Component)
    ├── page.tsx                # Redirección según estado (Server Component)
    ├── loading.tsx             # Skeleton de detalle
    ├── edit/
    │   ├── page.tsx            # Edición (Server Component)
    │   └── loading.tsx         # Skeleton de edición
    └── components/
        └── ItemLayoutClient.tsx # Client Component (interactividad)
```

### 4.1 Layout Anidado

```tsx
// items/[itemId]/layout.tsx
import { getItemById, getItemStages } from '@/lib/actions/items';
import { ItemLayoutClient } from './components/ItemLayoutClient';

export default async function ItemLayout({
  children,
  params,
}: ItemLayoutProps) {
  const { slug: studioSlug, itemId } = await params;

  const [itemResult, stagesResult] = await Promise.all([
    getItemById(itemId),
    getItemStages(studioSlug),
  ]);

  if (!itemResult.success || !itemResult.data) {
    redirect(`/${studioSlug}/items`);
  }

  const item = itemResult.data;
  const stages = stagesResult.success && stagesResult.data
    ? stagesResult.data
    : [];

  return (
    <ItemLayoutClient
      studioSlug={studioSlug}
      itemId={itemId}
      itemData={item}
      stages={stages}
    >
      {children}
    </ItemLayoutClient>
  );
}
```

### 4.2 Page con Redirección

```tsx
// items/[itemId]/page.tsx
import { determineItemState } from '@/lib/actions/items';
import { ItemRedirectClient } from './components/ItemRedirectClient';

export default async function ItemPage({ params }: ItemPageProps) {
  const { slug: studioSlug, itemId } = await params;

  const stateResult = await determineItemState(itemId);

  if (!stateResult.success || !stateResult.data) {
    return (
      <ItemRedirectClient
        studioSlug={studioSlug}
        itemId={itemId}
        state={null}
      />
    );
  }

  const state = stateResult.data.state;

  return (
    <ItemRedirectClient
      studioSlug={studioSlug}
      itemId={itemId}
      state={state}
    />
  );
}
```

### 4.3 Client Component del Layout

```tsx
// items/[itemId]/components/ItemLayoutClient.tsx
'use client';

import { useEffect } from 'react';

export function ItemLayoutClient({
  studioSlug,
  itemId,
  itemData,
  stages,
  children,
}: ItemLayoutClientProps) {
  // Cerrar overlays al montar el componente de detalle
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('close-overlays'));
  }, []);

  // ... resto del componente
}
```

### Reglas para Rutas Anidadas

1. **Cada nivel debe tener su `loading.tsx`**
2. **Los layouts deben ser Server Components cuando sea posible**
3. **Los Client Components solo para interactividad**
4. **Cerrar overlays al montar componentes de detalle**

---

## 5. Higiene de UI Global

### Problema

Al navegar entre rutas, los overlays (Side Sheets, Modals) pueden quedar abiertos, causando "ruido visual" y confusión.

### Solución: Evento Global `close-overlays`

### 5.1 Disparar Evento al Navegar

```tsx
// En el componente que maneja la navegación
const handleItemClick = (item: Item) => {
  // Cerrar overlays globales antes de navegar
  window.dispatchEvent(new CustomEvent('close-overlays'));
  
  // ... resto de la navegación
};
```

### 5.2 Escuchar Evento en Layout Global

```tsx
// app/[slug]/studio/components/layout/StudioLayoutWrapper.tsx
'use client';

import { usePathname } from 'next/navigation';

export function StudioLayoutContent({ studioSlug, children }) {
  const pathname = usePathname();
  const [remindersSheetOpen, setRemindersSheetOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const { closeContactsSheet } = useContactsSheet();
  // ... otros estados

  // Función para cerrar todos los overlays
  const closeAllOverlays = useCallback(() => {
    setRemindersSheetOpen(false);
    setAgendaOpen(false);
    setCrewSheetOpen(false);
    setTareasOperativasOpen(false);
    closeContactsSheet(); // Para sheets que usan contexto
  }, [closeContactsSheet]);

  // Escuchar evento para cerrar overlays al navegar
  useEffect(() => {
    const handleCloseOverlays = () => {
      closeAllOverlays();
    };

    window.addEventListener('close-overlays', handleCloseOverlays);
    return () => {
      window.removeEventListener('close-overlays', handleCloseOverlays);
    };
  }, [closeAllOverlays]);

  // Seguro adicional: Cerrar overlays cuando cambia la ruta
  // Si por alguna razón el evento no se dispara, el cambio de pathname lo detectará
  useEffect(() => {
    closeAllOverlays();
  }, [pathname, closeAllOverlays]);

  // ... resto del componente
}
```

**Nota sobre `usePathname`:** Este hook actúa como un "seguro adicional". Si por alguna razón el evento `close-overlays` no se dispara (por ejemplo, navegación directa por URL o fallo en el evento), el cambio de ruta detectado por `usePathname` cerrará todos los overlays automáticamente.

### 5.3 Cerrar al Montar Detalle

```tsx
// items/[itemId]/components/ItemLayoutClient.tsx
'use client';

import { useEffect } from 'react';

export function ItemLayoutClient({ children }: Props) {
  // Cerrar overlays al montar el componente de detalle
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('close-overlays'));
  }, []);

  // ... resto del componente
}
```

### Overlays que Deben Cerrarse

- ✅ RemindersSideSheet
- ✅ AgendaUnifiedSheet
- ✅ ContactsSheet
- ✅ CrewMembersManager
- ✅ TareasOperativasSheet
- ✅ Cualquier modal/sheet global

---

## 6. Sistema de Caché con Tags

### Problema

Necesitamos que los datos se refresquen cuando hay cambios, pero sin perder el beneficio del streaming.

### Solución: `unstable_cache` + `revalidateTag`

**Nota importante:** Aunque `unstable_cache` lleva el prefijo "unstable", es el **estándar actual en Next.js 15** para este patrón de caché con tags. Next.js mantiene esta API estable a pesar del nombre.

### 6.1 Cachear en Server Component

**⚠️ CRÍTICO: Los tags DEBEN incluir el `studioSlug` para evitar filtrado entre tenants.**

Aunque Prisma filtra por `studio_id` en las queries, el tag de caché debe ser único por estudio para garantizar aislamiento completo entre tenants.

**Nota importante:** Los parámetros dinámicos como `studioSlug` deben estar tanto en el array de keys como en los tags. La función `unstable_cache` debe crearse dentro del componente async para tener acceso a los parámetros dinámicos.

```tsx
// items/page.tsx
import { unstable_cache } from 'next/cache';
import { getItems } from '@/lib/actions/items';

export default async function ItemsPage({ params }: ItemsPageProps) {
  const { slug: studioSlug } = await params;

  // Cachear items con tag para invalidación selectiva
  // ✅ BIEN: Tag incluye studioSlug para aislamiento entre tenants
  // Los parámetros dinámicos deben estar en el array de keys y en los tags
  const getCachedItems = unstable_cache(
    async () => {
      return getItems(studioSlug);
    },
    ['items-list', studioSlug], // ✅ studioSlug en keys
    {
      tags: [`items-list-${studioSlug}`], // ✅ Incluye studioSlug en tags
      revalidate: false, // No cachear por tiempo, solo por tags
    }
  );

  // Cachear stages con revalidate más largo (cambian poco)
  const getCachedStages = unstable_cache(
    async () => {
      return getItemStages(studioSlug);
    },
    ['item-stages', studioSlug], // ✅ studioSlug en keys
    {
      tags: [`item-stages-${studioSlug}`], // ✅ Incluye studioSlug en tags
      revalidate: 3600, // 1 hora
    }
  );

  const [itemsResult, stagesResult] = await Promise.all([
    getCachedItems(),
    getCachedStages(),
  ]);

  // ... procesar resultados
}
```

### 6.2 Invalidar Caché en Server Actions

**⚠️ CRÍTICO: Siempre incluir `studioSlug` en los tags al invalidar.**

```tsx
// lib/actions/items/items.actions.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function createItem(studioSlug: string, data: CreateItemData) {
  // ... lógica de creación

  // Revalidar rutas específicas
  revalidatePath(`/${studioSlug}/items`);
  revalidatePath(`/${studioSlug}/items/${item.id}`);
  
  // Invalidar caché de lista (con studioSlug para aislamiento)
  revalidateTag(`items-list-${studioSlug}`); // ✅ Incluye studioSlug

  return { success: true, data: item };
}

export async function updateItem(studioSlug: string, data: UpdateItemData) {
  // ... lógica de actualización

  revalidatePath(`/${studioSlug}/items`);
  revalidatePath(`/${studioSlug}/items/${data.itemId}`);
  revalidateTag(`items-list-${studioSlug}`); // ✅ Incluye studioSlug

  return { success: true, data: updatedItem };
}
```

### Estrategia de Tags

- **`items-list-${studioSlug}`:** Para listas que cambian frecuentemente (`revalidate: false`)
- **`item-stages-${studioSlug}`:** Para datos que cambian poco (`revalidate: 3600`)
- **`item-${itemId}-${studioSlug}`:** Para detalles específicos (opcional)

**Regla de oro:** Todos los tags deben incluir identificador del tenant para garantizar aislamiento completo.

### Beneficios

✅ Datos frescos cuando hay cambios  
✅ Streaming preservado  
✅ Performance optimizada

---

## 7. Checklist de Implementación

### Para Rutas Simples (Lista)

- [ ] `page.tsx` es Server Component (async)
- [ ] Fetch directo en `page.tsx` (no en `useEffect`)
- [ ] `loading.tsx` existe y renderiza skeleton
- [ ] Client Component separado para interactividad
- [ ] Datos pasados como props (`initialItems`)
- [ ] Caché con tags implementado
- [ ] `revalidateTag` en server actions relevantes

### Para Rutas Anidadas (Detalle)

- [ ] `layout.tsx` es Server Component (async)
- [ ] `page.tsx` maneja redirección si es necesario
- [ ] `loading.tsx` en cada nivel de ruta
- [ ] Client Component para interactividad
- [ ] Overlays se cierran al montar detalle
- [ ] Breadcrumbs funcionales con `startTransition`

### Para Navegación

- [ ] Flag `isNavigating` implementado
- [ ] `startTransition` envuelve `router.push()`
- [ ] Sincronización bloqueada durante navegación
- [ ] Evento `close-overlays` disparado
- [ ] Listener en layout global configurado

### Para Caché

- [ ] `unstable_cache` con tags en `page.tsx`
- [ ] Tags incluyen `studioSlug` para aislamiento entre tenants
- [ ] `revalidateTag` en server actions de mutación (con `studioSlug`)
- [ ] Tags consistentes y documentados
- [ ] `revalidate: false` para datos dinámicos
- [ ] `revalidate: 3600+` para datos estáticos

---

## 📚 Ejemplos Completos

### Ejemplo 1: Lista Simple

Ver implementación en: `src/app/[slug]/studio/commercial/promises/`

**Archivos clave:**
- `page.tsx` - Server Component con fetch
- `loading.tsx` - Skeleton nativo
- `components/PromisesPageClient.tsx` - Client Component wrapper
- `components/PromisesKanbanClient.tsx` - Gestión de estado y navegación

### Ejemplo 2: Detalle con Sub-rutas

Ver implementación en: `src/app/[slug]/studio/commercial/promises/[promiseId]/`

**Archivos clave:**
- `layout.tsx` - Server Component con fetch
- `page.tsx` - Redirección según estado
- `loading.tsx` - Skeleton de detalle
- `components/PromiseLayoutClient.tsx` - Client Component con cierre de overlays

---

## 🚨 Errores Comunes

### ❌ Error: Parpadeo de Skeleton

**Causa:** `useEffect` cargando datos en Client Component

**Solución:** Mover fetch a Server Component

```tsx
// ❌ ANTES
'use client';
useEffect(() => { loadData(); }, []);

// ✅ DESPUÉS
export default async function Page() {
  const data = await getData();
  return <PageClient initialData={data} />;
}
```

### ❌ Error: Race Condition al Navegar

**Causa:** Falta protección `isNavigating`

**Solución:** Implementar patrón de navegación atómica

```tsx
// ✅ SOLUCIÓN
const [isNavigating, setIsNavigating] = useState<string | null>(null);

useEffect(() => {
  if (isNavigating) return; // Bloquear sincronización
  // ... sincronizar datos
}, [items, isNavigating]);

const handleClick = (item) => {
  setIsNavigating(item.id);
  startTransition(() => {
    router.push(`/items/${item.id}`);
  });
};
```

### ❌ Error: Overlays Abiertos al Navegar

**Causa:** No se cierran automáticamente

**Solución:** Implementar evento `close-overlays` + `usePathname` como seguro

```tsx
// ✅ SOLUCIÓN
const handleClick = () => {
  window.dispatchEvent(new CustomEvent('close-overlays'));
  router.push('/items/123');
};

// En layout global
import { usePathname } from 'next/navigation';

const pathname = usePathname();

useEffect(() => {
  const handler = () => {
    setRemindersSheetOpen(false);
    setAgendaOpen(false);
    // ... cerrar todos los overlays
  };
  window.addEventListener('close-overlays', handler);
  return () => window.removeEventListener('close-overlays', handler);
}, []);

// Seguro adicional: Cerrar cuando cambia la ruta
useEffect(() => {
  // Cerrar todos los overlays cuando cambia pathname
  setRemindersSheetOpen(false);
  setAgendaOpen(false);
  // ...
}, [pathname]);
```

### ❌ Error: Datos Desactualizados

**Causa:** Caché sin invalidación

**Solución:** Agregar `revalidateTag` en server actions

```tsx
// ✅ SOLUCIÓN
export async function updateItem(data) {
  // ... actualizar
  revalidateTag('items-list'); // Invalidar caché
  revalidatePath(`/items/${data.id}`);
}
```

---

## 📝 Notas Finales

- Esta metodología fue probada exitosamente en la ruta de **Promesas**
- Todos los patrones son compatibles con Next.js 15+ y React 19
- La implementación debe seguir este orden: Server-First → Streaming → Navegación → Caché

---

## 🔗 Referencias

- **Implementación de referencia:** `src/app/[slug]/studio/commercial/promises/`
- **Next.js 15 Docs:** [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- **React 19 Docs:** [startTransition](https://react.dev/reference/react/startTransition)

---

**Última actualización:** Enero 2025  
**Mantenido por:** Equipo ZEN Platform
