# Direct Navigator Architecture (v1.1 - Enhanced)

## Resumen

El **Direct Navigator** es el sistema de sincronización de rutas determinista para promesas públicas. Utiliza el servidor como **Single Source of Truth (SSOT)** y un **filtro de Visibilidad obligatorio** para decidir la ruta correcta basada en el estado actual de las cotizaciones.

## Arquitectura

### Principios Fundamentales

1. **El servidor es la única fuente de verdad**: El cliente no gestiona estado local; consulta la base de datos para validar su posición.
2. **Filtro de Visibilidad**: Solo las cotizaciones marcadas como `visible_to_client === true` participan en el cálculo de la ruta.
3. **Análisis de Grupo**: La ruta de la promesa se determina evaluando el estado más avanzado de todas sus cotizaciones visibles.

## Componentes Clave

### 1. `syncPromiseRoute` (SSOT)

**Ubicación:** `src/lib/utils/public-promise-routing.ts`

**Función:** Única función autorizada para ejecutar redirecciones basadas en el estado de cotizaciones.

```typescript
/**
 * Single Source of Truth (SSOT) para sincronización de rutas de promesas.
 * 
 * Consulta al servidor (bypass cache) para obtener la ruta correcta
 * según la prioridad: Aprobada > Negociación > Cierre > Pendientes.
 * 
 * @param promiseId - ID de la promesa
 * @param currentPath - Ruta actual del navegador
 * @param slug - Slug del estudio
 * @returns true si hubo redirección, false si ya está en la ruta correcta
 */
export async function syncPromiseRoute(
  promiseId: string,
  currentPath: string,
  slug: string
): Promise<boolean>
```

**Mejora Técnica:** Incluye un parámetro de cache-busting automático (`?t=${Date.now()}`) en la petición fetch para ignorar cualquier caché intermedio del navegador o de Next.js.

**Flujo:**
1. Consulta al endpoint `/api/promise/[slug]/[promiseId]/redirect?t=${Date.now()}` con bypass de caché
2. Compara la ruta actual con la ruta objetivo del servidor
3. Si difieren, ejecuta `window.location.replace(targetRoute)`
4. Retorna `true` si hubo redirección, `false` si ya está en la ruta correcta

### 2. `PromiseRouteGuard`

**Ubicación:** `src/components/promise/PromiseRouteGuard.tsx`

**Función:** Componente cliente que monitorea y sincroniza rutas en todas las sub-rutas.

**Responsabilidades:**
- Sincronización al cambiar de ruta (`usePathname`)
- Escucha eventos de Realtime (UPDATE, INSERT, DELETE)
- Detecta cambios en `visible_to_client`
- Redirige automáticamente cuando es necesario

**Características:**
- No renderiza nada (`return null`)
- Usa `useRef` para evitar múltiples sincronizaciones
- Se ejecuta en el layout común de todas las sub-rutas

**Implementación:**
```typescript
export function PromiseRouteGuard({ studioSlug, promiseId }: PromiseRouteGuardProps) {
  const pathname = usePathname();
  
  // Sincronizar al cambiar de ruta
  useEffect(() => {
    handleSyncRoute();
  }, [pathname, promiseId, studioSlug]);

  // Realtime: Reaccionar a cualquier cambio
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: (cotizacionId, changeInfo) => {
      handleSyncRouteRef.current();
    },
    onCotizacionInserted: () => handleSyncRouteRef.current(),
    onCotizacionDeleted: () => handleSyncRouteRef.current(),
  });

  return null;
}
```

### 3. `PromiseRedirectHandler`

**Ubicación:** `src/app/[slug]/promise/[promiseId]/PromiseRedirectHandler.tsx`

**Función:** Componente que maneja la redirección inicial desde la ruta raíz.

**Responsabilidades:**
- Sincronización en carga inicial (al montar)
- Escucha eventos de Realtime
- Muestra Skeleton durante validación/redirección

### 4. API Endpoint `/api/promise/[slug]/[promiseId]/redirect`

**Ubicación:** `src/app/api/promise/[slug]/[promiseId]/redirect/route.ts`

**Operación Crítica:**
- Realiza una consulta **Full Group Scan**: Obtiene todas las cotizaciones asociadas al `promiseId`
- **Bypass de Caché**: Implementado mediante `export const dynamic = 'force-dynamic'` y el uso de `findMany` con consulta directa
- **Filtro de Salida**: Entrega al motor de rutas tanto el estatus como el flag de visibilidad

**Características:**
- `export const dynamic = 'force-dynamic'` (sin caché)
- Consulta directa a Prisma sin usar `getPublicPromiseRouteState` (que usa cache)
- Trae **todas** las cotizaciones (sin filtrar por `visible_to_client` en la consulta)
- Incluye `visible_to_client` en el select para que `determinePromiseRoute` filtre

### 5. Función Maestra de Prioridad (`determinePromiseRoute`)

**Ubicación:** `src/lib/utils/public-promise-routing.ts`

**Función:** Determina la ruta correcta basada en el estado de las cotizaciones visibles.

**Lógica de Prioridad:**
La función aplica un embudo de prioridad exclusivamente sobre cotizaciones visibles:

1. **Aprobada** → `/${slug}/cliente`
   - Si alguna cotización visible tiene `status === 'aprobada' || 'autorizada' || 'approved'`

2. **Negociación** → `/${slug}/promise/${promiseId}/negociacion`
   - Si alguna cotización visible tiene `status === 'negociacion'` y `selected_by_prospect !== true`

3. **Cierre** → `/${slug}/promise/${promiseId}/cierre`
   - Si alguna cotización visible tiene `status === 'en_cierre'` (normalizado desde 'cierre')

4. **Pendientes** → `/${slug}/promise/${promiseId}/pendientes` (default)
   - Si todas las cotizaciones visibles están pendientes, o no hay cotizaciones visibles

**Filtro de Visibilidad:**
```typescript
// FILTRO INICIAL: Solo considerar cotizaciones visibles al cliente
const visibleQuotes = cotizaciones.filter(q => q.visible_to_client === true);

// Si no hay cotizaciones visibles, siempre redirigir a /pendientes
if (visibleQuotes.length === 0) {
  return `/${slug}/promise/${promiseId}/pendientes`;
}
```

## Flujo de Ejecución

### Carga Inicial

1. Usuario entra a cualquier ruta de promesa (`/pendientes`, `/negociacion`, `/cierre`)
2. `PromiseRouteGuard` se monta en el layout
3. `useEffect` dispara `syncPromiseRoute()` inmediatamente
4. `syncPromiseRoute()` consulta al servidor (bypass cache con `?t=${Date.now()}`)
5. API trae todas las cotizaciones y las pasa a `determinePromiseRoute`
6. `determinePromiseRoute` filtra por `visible_to_client === true` y aplica prioridad
7. Si `targetRoute !== currentPath` → `window.location.replace()`
8. Si no hay redirección → Usuario ve el contenido

### Eventos Realtime

1. Supabase detecta cambio en `studio_cotizaciones` (UPDATE/INSERT/DELETE)
2. `useCotizacionesRealtime` en `PromiseRouteGuard` dispara callback
3. Callback ejecuta `syncPromiseRoute()`
4. `syncPromiseRoute()` consulta al servidor (bypass cache)
5. API ahora "ve" la cotización (gracias al flag `visible_to_client === true`)
6. `determinePromiseRoute` recalcula la ruta con las cotizaciones visibles actualizadas
7. Si la ruta cambió → `window.location.replace()` automáticamente

### El "Guardián" de Visibilidad (Realtime)

**Escenario:** El fotógrafo marca una cotización como Visible (`visible_to_client: false → true`)

1. Supabase detecta el cambio
2. `PromiseRouteGuard` recibe la notificación
3. Se dispara `syncPromiseRoute`
4. La API ahora "ve" la cotización (gracias al flag `true`)
5. Devuelve la nueva ruta (ej: `/negociacion`)
6. El navegador ejecuta `window.location.replace()`

## Ventajas

1. **Seguridad**: El cliente nunca es redirigido a una sección (Cierre o Negociación) si el estudio no ha hecho pública la cotización
2. **Determinismo**: El servidor siempre tiene la verdad
3. **Simplicidad**: No hay gestión de estado local compleja
4. **Consistencia**: Misma lógica en servidor y cliente
5. **Mantenibilidad**: Un solo lugar para cambiar la lógica de rutas
6. **Inmunidad a Latencia**: Al consultar el ID de la promesa completo, el sistema se recupera solo si un evento de Realtime llega desordenado

## Limitaciones

1. **Latencia**: Cada sincronización requiere una llamada al servidor
2. **Sin estado optimista**: No hay actualización inmediata de UI antes de confirmar con servidor

## Notas de Mantenimiento

### Cambios en Status

Si se añade un nuevo status en la base de datos, debe registrarse obligatoriamente en `determinePromiseRoute` y asignarle un nivel de prioridad.

### Flags de Bloqueo

Si en el futuro se desea bloquear el acceso a una promesa, el API Endpoint es el lugar para centralizar esa lógica, devolviendo una ruta de error o `/404`.

### Logs de Diagnóstico

Los logs de diagnóstico (`🔍`, `📊`) están activos para debugging. Una vez confirmado que funciona correctamente, pueden eliminarse para producción.

## Archivos Clave

- `/lib/utils/public-promise-routing.ts` - `syncPromiseRoute`, `determinePromiseRoute`, `normalizeStatus`
- `/components/promise/PromiseRouteGuard.tsx` - Guardián de rutas en todas las sub-rutas
- `/app/[slug]/promise/[promiseId]/PromiseRedirectHandler.tsx` - Redirección inicial desde ruta raíz
- `/app/[slug]/promise/[promiseId]/layout.tsx` - Layout que incluye `PromiseRouteGuard`
- `/app/api/promise/[slug]/[promiseId]/redirect/route.ts` - API de redirección (bypass cache)
- `/hooks/useCotizacionesRealtime.ts` - Hook de Realtime que detecta cambios
