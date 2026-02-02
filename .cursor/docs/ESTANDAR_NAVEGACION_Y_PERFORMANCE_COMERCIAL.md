# Estándar de Navegación y Performance Comercial

**Documento de referencia única** para navegación comercial, performance y estructura del pipeline de promesas. Consolida la arquitectura de validación, escalonamiento de carga y mapeo de etapas.

---

## 1. Navegación

### 1.1 Guarda de Identidad (evitar parpadeo y rebotes)

- **Problema:** Si el usuario llega a la raíz `/[slug]/studio/commercial/promises/[promiseId]` (link viejo o manual), antes se cargaba el cliente y luego se redirigía → parpadeo.
- **Solución:** La raíz es un **Server Component** que hace `determinePromiseState(promiseId)` y **redirect inmediato** a la sub-ruta correcta (`/pendiente`, `/cierre` o `/autorizada`) antes de enviar HTML. El usuario no ve la raíz.
- **Ubicación:** `src/app/[slug]/studio/commercial/promises/[promiseId]/page.tsx` → `redirect(getPromisePathFromState(studioSlug, promiseId, state))`.
- **Utilidad:** `src/lib/utils/promise-navigation.ts` — `getPromisePathFromState(studioSlug, promiseId, state)` para redirects en servidor; `getPromisePath(studioSlug, promise)` para enlaces desde el Kanban.

### 1.2 Enrutamiento directo desde el Kanban

- **Problema:** Si el href de la card era `.../promises/${id}` (raíz), el usuario pasaba por la raíz → redirect en cliente → parpadeo.
- **Solución:** El Kanban usa **getPromisePath(studioSlug, promise)** para construir el href y el `router.push` al hacer clic. La ruta ya incluye la sub-ruta correcta (`/pendiente`, `/cierre` o `/autorizada`) según `promise.promise_pipeline_stage?.slug`. Cero parpadeo.
- **Ubicación:** `PromiseKanbanCard.tsx` (href), `PromisesKanban.tsx` (handlePromiseClick).

### 1.3 Cadenero (guardas en sub-rutas)

Cada sub-ruta valida en **servidor** que la promesa pertenece a esa página; si no, redirect a la correcta.

| Ruta        | Archivo page.tsx                         | Guarda |
|------------|-------------------------------------------|--------|
| `/pendiente`  | `[promiseId]/pendiente/page.tsx`          | `determinePromiseState` → si `state !== 'pendiente'` → `redirect(getPromisePathFromState(...))` |
| `/cierre`     | `[promiseId]/cierre/page.tsx`            | Idem → si `state !== 'cierre'` → redirect |
| `/autorizada` | `[promiseId]/autorizada/page.tsx`         | Idem → si `state !== 'autorizada'` → redirect |

---

## 2. Performance: escalonamiento de carga (evitar 429 Too Many Requests)

- **Problema:** Al entrar al Kanban, si la página y el header cargaban datos a la vez (8+ requests casi simultáneos), el servidor o el proxy podían devolver 429.
- **Solución (staggering):**
  1. **Página Kanban (servidor):** Solo 3 llamadas en paralelo: `getPromises`, `getPipelineStages`, `getCurrentUserId`. No se llama `getTestPromisesCount` en servidor.
  2. **Cliente (PromisesPageClient):** `getTestPromisesCount` se ejecuta en un `useEffect` con delay de **600 ms** tras el montaje.
  3. **HeaderDataLoader:** La carga de datos del header (userId, agenda, reminders) se retrasa **400 ms** respecto al montaje (`setTimeout(loadData, 400)`). Así la ráfaga inicial del Kanban (3 requests) termina antes de sumar los 4 del header.
- **Regla:** El Server Component de la página es la **única** fuente de datos inicial (promesas + etapas + userId). El cliente no debe pedir nada adicional al montar; los datos opcionales (test count, header) se cargan con delay.

---

## 3. Estructura: slugs terminales vs activos

### 3.1 Mapeo de slugs a sub-ruta (promesas studio)

| Slug(s) | Sub-ruta   | Uso |
|--------|------------|-----|
| `approved`, `aprobada`, `autorizada`, `canceled`, `cancelado`, `archived`, `archivado` | `/autorizada` | Terminales (historial) |
| `closing`, `cierre`, `en_cierre` | `/cierre` | Cierre |
| Cualquier otro (p. ej. `pending`, `pendiente`, `negotiation`, `negociacion`, **`interesado`**, `interested`) | `/pendiente` | Seguimiento activo |

- **Utilidad:** `getPromiseRouteStateFromSlug(slug)` en `src/lib/utils/promise-navigation.ts`. Slugs no terminales y no cierre → siempre `/pendiente`.
- **Nombres de display:** `src/lib/utils/pipeline-stage-names.ts` — `DEFAULT_STAGE_NAMES` incluye `interesado` / `interested` → "Interesado". `isTerminalStage(slug)` define qué va a la columna virtual "Historial" en el Kanban.

### 3.2 Kanban: columnas activas vs Historial

- **Activas:** Todas las etapas cuyo slug **no** está en `TERMINAL_SLUGS` (`approved`, `aprobada`, `autorizada`, `canceled`, `cancelado`, `archived`, `archivado`). Cada una tiene su columna.
- **Historial:** Columna virtual que agrupa todas las promesas en una etapa **terminal**. Toggle "Mostrar Historial" (oculta por defecto).
- Una promesa con slug `interesado` (o cualquier no terminal) aparece en su columna activa y **no** en Historial; al hacer clic, `getPromisePath` la lleva a `/pendiente`.

---

## 4. Instrucción para eventos: replicar en el pipeline de eventos

Para aplicar la misma lógica en el pipeline de **eventos** (o otro flujo similar):

1. **Utilidad de rutas:** Crear un `event-navigation.ts` (o equivalente) con:
   - `getEventRouteStateFromSlug(slug)` → estado de ruta (ej. `pendiente` | `confirmado` | `realizado`).
   - `getEventPath(studioSlug, event)` y `getEventPathFromState(studioSlug, eventId, state)` para enlaces y redirects.

2. **Raíz como escudo:** La página raíz del detalle del evento debe ser un Server Component que:
   - Llame a una acción tipo `determineEventState(eventId)`.
   - Haga `redirect(getEventPathFromState(studioSlug, eventId, state))` sin renderizar cliente en la raíz.

3. **Enlaces directos:** En la lista/Kanban de eventos, usar `getEventPath(studioSlug, event)` para href y para el handler de clic (no llevar a la raíz).

4. **Cadenero:** En cada sub-ruta del evento (ej. `/confirmado`, `/realizado`), al inicio del page.tsx (servidor): si `determineEventState` devuelve un estado distinto al de la sub-ruta actual, hacer `redirect(getEventPathFromState(...))`.

5. **Performance:** Una sola fuente de datos en el Server Component de la lista; datos secundarios (contadores, header) en cliente con delay (ej. 400–600 ms) para evitar ráfaga y 429.

6. **Slugs:** Definir en un único módulo los conjuntos de slugs terminales vs activos y usarlos tanto para rutas como para la columna "Historial" (o equivalente) en el Kanban de eventos.

---

## 5. Referencia rápida

| Tema | Ubicación |
|------|------------|
| Navegación promesas (studio) | `src/lib/utils/promise-navigation.ts` |
| Raíz redirect | `src/app/[slug]/studio/commercial/promises/[promiseId]/page.tsx` |
| Cadenero pendiente/cierre/autorizada | `[promiseId]/pendiente/page.tsx`, `cierre/page.tsx`, `autorizada/page.tsx` |
| Kanban href y click | `PromiseKanbanCard.tsx`, `PromisesKanban.tsx` |
| Slugs y nombres de etapa | `src/lib/utils/pipeline-stage-names.ts` |
| Staggering página | `src/app/[slug]/studio/commercial/promises/page.tsx` (3 requests) |
| Staggering header | `src/app/[slug]/studio/components/layout/HeaderDataLoader.tsx` (delay 400 ms) |
| Test count defer | `PromisesPageClient.tsx` (getTestPromisesCount a los 600 ms) |
