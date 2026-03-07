# Flujo: "Autorizar y Crear Evento" (click → DB → redirect a autorizada)

Documento de referencia para el flujo completo desde el click en **"Autorizar y Crear Evento"** en la pantalla de cierre hasta la redirección a la vista autorizada. Incluye rutas, componentes, Server Actions, relaciones de base de datos y enrutamiento para análisis y depuración (p. ej. contenido vacío en autorizada o card en "nuevo" en vez de archivado/autorizado).

**Última actualización:** 2026-03-03 (Persistencia pagos staging + cancelación justificada contratos)  
**Relación:** Complementa [flujo-cierre-cotizacion.md](./flujo-cierre-cotizacion.md) (entrada al cierre: público y "Pasar a Cierre" desde estudio), [promesa-cierre.md](../promesa-cierre.md) y [persistencia-snapshots-cotizacion.md](../persistencia-snapshots-cotizacion.md).

---

## Índice

1. [Resumen del flujo](#1-resumen-del-flujo)
2. [Click y confirmación (UI)](#2-click-y-confirmación-ui)
3. [Server Action: autorizarYCrearEvento](#3-server-action-autorizarycrearevento)
4. [Relaciones y tablas DB implicadas](#4-relaciones-y-tablas-db-implicadas)
5. [Overlay de progreso y redirección](#5-overlay-de-progreso-y-redirección)
6. [Página autorizada: carga y cadeneros](#6-página-autorizada-carga-y-cadeneros)
7. [Enrutamiento y utilidades](#7-enrutamiento-y-utilidades)
8. [Listado de promesas (Kanban) y etapa "autorizado"](#8-listado-de-promesas-kanban-y-etapa-autorizado)
9. [Problemas conocidos y análisis](#9-problemas-conocidos-y-análisis)

---

## 1. Resumen del flujo

| Fase | Dónde | Qué ocurre |
|------|--------|------------|
| 1 | Cierre (Studio) | Usuario hace click en **"Autorizar y Crear Evento"** → se abre modal de confirmación. |
| 2 | Modal | Usuario confirma → se cierra el modal y se dispara la autorización en servidor + animación de progreso en cliente. |
| 3 | Servidor | `autorizarYCrearEvento` ejecuta una transacción: crea/actualiza evento, autoriza cotización, actualiza promesa a etapa "approved", archiva otras cotizaciones, limpia registro de cierre, etc. |
| 4 | Cliente | Overlay muestra 8 pasos; cuando ambos (servidor + animación) terminan sin error, se hace **redirect** a `/[slug]/studio/commercial/promises/[promiseId]/autorizada`. |
| 5 | Página autorizada | Servidor ejecuta cadenero (`determinePromiseState`) y carga cotización autorizada (`getCotizacionAutorizadaByPromiseId`). Si state !== 'autorizada' redirige; si no hay cotización con evento, el cliente puede renderizar vacío. |
| 6 | Listado | En `/promises` el Kanban muestra las promesas por etapa; si los datos no se revalidan, la card puede seguir en "nuevo" (ej. closing) hasta que el usuario refresque o se invalide la lista. |

---

## 2. Click y confirmación (UI)

### Rutas y componentes

| Elemento | Ruta / archivo |
|----------|-----------------|
| Página cierre | `src/app/[slug]/studio/commercial/promises/[promiseId]/cierre/page.tsx` |
| Contenido cierre | `CierrePageInner` → `PromiseCierreClient` |
| Botón | `CierreActionButtons` en `.../cierre/components/CierreActionButtons.tsx` |
| Lógica y estado | `usePromiseCierreLogic` en `.../cierre/components/usePromiseCierreLogic.tsx` |
| Modal confirmación | `ZenConfirmModal` "¿Autorizar cotización y crear evento?" (dentro de `PromiseCierreClient`) |
| Overlay de progreso | `AutorizacionProgressOverlay` en `src/components/promise/AutorizacionProgressOverlay.tsx` |

### Secuencia UI

1. **CierreActionButtons** recibe `onAutorizar` desde `PromiseCierreClient`, que lo toma de `cierreLogic.handleAutorizar`.
2. **handleAutorizar** (en `usePromiseCierreLogic`): solo hace `setShowConfirmAutorizarModal(true)`.
3. Usuario confirma en **ZenConfirmModal** → `onConfirm` = `handleConfirmAutorizar`.
4. **handleConfirmAutorizar**:
   - `setIsAuthorizing(true)` y `setShowConfirmAutorizarModal(false)`.
   - Inicia en paralelo:
     - **Servidor:** `autorizarYCrearEvento(studioSlug, promiseId, cotizacion.id, { registrarPago, montoInicial })`.
     - **Cliente:** `runProgressAnimation()` que va marcando los 8 pasos cada `STEP_DELAY_MS` (350 ms).
   - Cuando el servidor responde:
     - Si `result.success`: toast éxito, `setAuthorizationEventoId(evento_id)`.
     - Si error: `setAuthorizationError(msg)`, toast error.
   - La animación sigue hasta completar los 8 pasos; entonces `currentTask === ''` y `completedTasks.length === TASKS.length`.

**Nota:** No se crea evento en el front; toda la creación de evento y actualización de estado ocurre en `autorizarYCrearEvento` (backend). Los nombres de los pasos en el overlay son solo descriptivos para la UX.

---

## 3. Server Action: autorizarYCrearEvento

### Ubicación

- **Archivo:** `src/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions.ts`
- **Función:** `autorizarYCrearEvento(studioSlug, promiseId, cotizacionId, options?)`

### Orden lógico dentro de la transacción (resumido)

1. Validar studio, cotización (en `en_cierre`), registro en `studio_cotizaciones_cierre`.
2. Validar según tipo de cliente (prospecto vs manual): condiciones, contrato y firma si aplica; capacidad del día (`checkDateConflict`, `max_events_per_day`) salvo `forceBooking`.
3. Resolver etapa inicial del pipeline de eventos y etapa "approved" del pipeline de promesas; etiqueta "Aprobado".
4. **Transacción:**
   - Crear o actualizar **studio_events** (cotizacion_id, event_type_id, stage_id, event_date, status ACTIVE).
   - Actualizar contacto prospecto → cliente si aplica.
   - **studio_cotizaciones:** la cotización en cierre pasa a `status: 'autorizada'`, se conecta al evento (`eventos: { connect: { id: evento.id } }`), se guardan **snapshots inmutables** y se desconecta `condiciones_comerciales`:
     - **Condiciones:** nombre, descripción, advance_*, discount_percentage (campos `*_snapshot`).
     - **Cortesías:** `cortesias_monto_snapshot`, `cortesias_count_snapshot`.
     - **Financieros (auditoría/anexos):** `snap_precio_lista`, `snap_ajuste_cierre`, `snap_monto_bono`, `snap_total_final`.
     - **Contrato:** `contract_content_snapshot` = contenido del contrato con el **bloque de condiciones comerciales (resumen financiero) ya inyectado** en HTML (vía `generateFinancialSummaryHtml` + `injectFinancialSummaryIntoContractContent`); `contract_template_*_snapshot`, `contract_version_snapshot`, `contract_signed_at_snapshot`.
   - **Integración con finanzas (Prioridad de persistencia):**
     - **Prioridad 1 - Staging de pagos desde UI:** Si `options.pagosStaging` tiene items, se crean múltiples registros en **studio_pagos** (uno por cada item del staging: Anticipo, Abonos adicionales). Cada pago se crea con `status: 'CONFIRMED'`, `transaction_type: 'ingreso'`, `transaction_category: 'abono'`.
     - **Prioridad 2 - Registro de cierre (fallback legacy):** Si no hay staging, se usa el registro de cierre (`studio_cotizaciones_cierre`). Si `pago_confirmado_estudio = true` y hay `pago_monto` definido, se crea un único pago inicial en **studio_pagos** con los datos del registro de cierre.
     - Los pagos con status `'CONFIRMED'` se incluyen en el cálculo de `pagos_confirmados_sum` para mostrar en el resumen de cierre.
   - **studio_promises:** actualizar `pipeline_stage` a la etapa "approved" (`etapaAprobado.id`).
   - Crear **studio_promises_tags** con etiqueta "Aprobado".
   - **studio_cotizaciones:** archivar otras cotizaciones de la promesa (`status: 'archivada'`, `archived: true`).
   - **studio_agenda:** eliminar citas comerciales de la promesa; crear entrada "Evento Principal" para el evento.
   - Eliminar **studio_cotizaciones_cierre** (registro temporal de cierre).
   - **studio_promise_logs:** log tipo `quotation_authorized`.
5. **Fuera de la transacción:** actualización de precios/items (cotización autorizada), notificaciones, sincronización Google Calendar, `syncPromisePipelineStageFromQuotes`, `revalidatePath` y `revalidateTag`.

### Integración con Finanzas

La persistencia de pagos sigue un sistema de prioridades:

1. **Staging de pagos (UI):** Si el usuario confirmó pagos desde la interfaz de "Confirmación de pago" (`ActivacionOperativaCard`), el array `options.pagosStaging` contiene los items de pago (Anticipo + Abonos adicionales opcionales). Cada item incluye:
   - `monto`: cantidad recibida
   - `metodoId`: método de pago seleccionado
   - `fecha`: fecha del pago (global para todos)
   - `concepto`: "Anticipo" o "Abono adicional"
   
   Estos se persisten como múltiples registros en **studio_pagos** con `status: 'CONFIRMED'`.

2. **Registro de cierre (fallback):** Si no hay staging, se usa el registro de cierre legacy. Si `pago_confirmado_estudio = true` y hay `pago_monto` definido, se crea un único pago inicial en **studio_pagos**.

**Visualización:** Los pagos con status `'CONFIRMED'` se suman en `pagos_confirmados_sum` y se muestran en el componente `ResumenPago` del resumen de cierre.

### Retorno

- `{ success: true, data: { evento_id, cotizacion_id, pago_registrado } }` o `{ success: false, error: string }` (incl. `DATE_OCCUPIED` si el día está lleno y no hay `forceBooking`).

---

## 4. Relaciones y tablas DB implicadas

### Tablas que se modifican en la transacción

| Tabla | Cambio relevante |
|-------|-------------------|
| **studio_events** | Crear o actualizar fila: `promise_id`, `cotizacion_id`, `event_type_id`, `stage_id`, `event_date`, `status: 'ACTIVE'`. |
| **studio_contacts** | Si contacto es prospecto → `status: 'cliente'`. |
| **studio_cotizaciones** | Cotización en cierre: `status: 'autorizada'`, relación con evento (`evento_id` vía connect), snapshots de condiciones (nombre, descripción, advance_*), cortesías (`cortesias_monto_snapshot`, `cortesias_count_snapshot`), **snapshots financieros** (`snap_precio_lista`, `snap_ajuste_cierre`, `snap_monto_bono`, `snap_total_final`), contrato (`contract_content_snapshot` con resumen financiero ya inyectado, template_*, version, signed_at), desconexión de `condiciones_comerciales`. Otras cotizaciones: `status: 'archivada'`, `archived: true`. |
| **studio_pagos** | Opcional: una fila de pago inicial (anticipo). |
| **studio_promises** | `pipeline_stage_id` = etapa con slug `'approved'`. |
| **studio_promises_tags** | Crear enlace promesa–etiqueta "Aprobado". |
| **studio_agenda** | Borrar citas `contexto: 'promise'` de la promesa; crear entrada `contexto: 'evento'` para el evento principal. |
| **studio_cotizaciones_cierre** | Eliminar el registro de la cotización que se autoriza. |

### Relaciones clave para el estado "autorizada"

- **Promesa → etapa:** `studio_promises.pipeline_stage_id` → `studio_promise_pipeline_stages` (slug `'approved'`).
- **Cotización autorizada:** `studio_cotizaciones.status = 'autorizada'`, `studio_cotizaciones.evento_id` no nulo (relación con `studio_events`).
- **Estado en app:** `determinePromiseState` usa `pipeline_stage.slug === 'approved'` y cotizaciones con status autorizado y `evento_id` para marcar state = `'autorizada'`.

---

## 5. Overlay de progreso y redirección

### Componente

- **AutorizacionProgressOverlay** (`src/components/promise/AutorizacionProgressOverlay.tsx`).
- Props: `show`, `currentTask`, `completedTasks`, `error`, `studioSlug`, `promiseId`, `onClose`.

### Condición de "completado" y redirect

- `isCompleted = completedTasks.length === TASKS.length && !error && currentTask === ''`.
- Cuando `show && isCompleted && studioSlug && promiseId`:
  - Se ejecuta `router.push(\`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada\`)`.
  - Se llama `onClose()` (limpia `isAuthorizing`, `authorizationError`, `authorizationEventoId` en el hook).

### Importante

- La redirección es **client-side** (`router.push`). El siguiente contenido que ve el usuario depende de la nueva carga de segmentos (layout + página autorizada). Si el router o el layout devuelven datos cacheados de antes de la autorización, la vista autorizada puede verse vacía o el listado puede seguir mostrando la card en "nuevo" (ver sección 9).

---

## 6. Página autorizada: carga y cadeneros

### Rutas

- **Página:** `src/app/[slug]/studio/commercial/promises/[promiseId]/autorizada/page.tsx`
- **Cliente:** `PromiseAutorizadaClient` en `.../autorizada/components/PromiseAutorizadaClient.tsx`

### Secuencia en el servidor (page.tsx)

1. **determinePromiseState(promiseId)**  
   - Si `state !== 'autorizada'` → `redirect(getPromisePathFromState(studioSlug, promiseId, state))`.  
   - Así se evita entrar a autorizada si la promesa sigue en pendiente o cierre (p. ej. por caché o race).

2. **getCotizacionAutorizadaByPromiseId(promiseId)**  
   - Busca una cotización con `promise_id`, `status` in (`autorizada`, `aprobada`, `approved`, `contract_generated`, `contract_signed`) y `evento_id` no nulo.  
   - Devuelve esa cotización como `CotizacionListItem` o null.

3. Se renderiza **PromiseAutorizadaClient** con `initialCotizacionAutorizada = cotizacionAutorizada | null`.

### Comportamiento del cliente (PromiseAutorizadaClient)

- Usa **usePromiseContext()** para `promiseData` (viene del layout, que a su vez viene de `determinePromiseState` en el layout).
- Si `!contextPromiseData || !contactId` → retorna `null` (pantalla vacía).
- Si `!cotizacionAutorizada || !cotizacionAutorizada.evento_id` → retorna `null` (pantalla vacía).
- Si todo ok: muestra dos columnas (EventInfoCard + CotizacionAutorizadaCard).

### Origen de los datos

- **Layout** `[promiseId]/layout.tsx`: ejecuta `determinePromiseState`, `getPipelineStages`, `getCotizacionesByPromiseId`. Pasa `stateData` y `initialCotizacionEnCierre` a `PromiseLayoutClient` → **PromiseProvider** (promiseData, promiseState, cotizacionEnCierre). En estado autorizada no hay cotización en cierre, así que `initialCotizacionEnCierre` es null.
- **Página autorizada:** no usa cotización del layout; usa solo `initialCotizacionAutorizada` de su propio fetch `getCotizacionAutorizadaByPromiseId`. El contexto solo aporta `promiseData` (contacto, evento, etc.) para el header y la card de info.

---

## 7. Enrutamiento y utilidades

### Determinar estado y ruta

- **determinePromiseState** (`src/lib/actions/studio/commercial/promises/promise-state.actions.ts`):  
  - Lee `studio_promises` + pipeline_stage + quotes (cotizaciones).  
  - Si `pipeline_stage.slug === 'approved'` → state puede ser `'autorizada'` si hay cotización autorizada con evento.  
  - Si no, busca cotización con status autorizado y `evento_id` → `autorizada`; si no, cotización en cierre o aprobada sin evento → `cierre`; si no → `pendiente`.

- **getPromisePathFromState** (`src/lib/utils/promise-navigation.ts`):  
  - Devuelve `/${studioSlug}/studio/commercial/promises/${promiseId}/${state}` con `state` en `'pendiente' | 'cierre' | 'autorizada'`.

### Cadeneros en páginas

- **cierre/page.tsx:** solo permite estados `cierre` o `autorizada`; si no, redirige con `getPromisePathFromState`.
- **autorizada/page.tsx:** solo permite state `autorizada`; si no, redirige con `getPromisePathFromState`.

---

## 8. Listado de promesas (Kanban) y etapa "autorizado"

### Dónde se muestra la card

- Listado principal: `/[slug]/studio/commercial/promises` (Kanban).
- Componentes: `PromisesKanban`, `PromiseKanbanCard`, etc.

### Cómo se determina "autorizado" en la card

- La etapa mostrada en la card viene de `promise.promise_pipeline_stage?.slug` (y nombre de etapa).
- Por ejemplo: `slug === 'approved'` o nombre que incluya "aprobado" se considera aprobado/autorizado.
- Los datos del Kanban se cargan en el servidor (o en cliente con fetch). Si después de `autorizarYCrearEvento` no se revalida la lista o no se refresca el cliente, la card puede seguir mostrando la etapa anterior (ej. "Cierre" / "nuevo") hasta que:
  - El usuario navegue a `/promises` y el servidor devuelva datos nuevos, o
  - Se llame `revalidatePath` para la ruta del listado o se invalide la fuente de datos del Kanban.

### Revalidación actual

- `autorizarYCrearEvento` hace `revalidatePath(\`/${studioSlug}/studio/commercial/promises/${promiseId}\`)` y paths del evento/contacto. No revalida explícitamente la ruta del listado (`/promises`). Depende del comportamiento de Next (revalidación de segmentos padres) o de un refresh del usuario.

---

## 9. Problemas conocidos y análisis

### 9.1 Contenido vacío en /autorizada tras el redirect

**Síntoma:** Tras terminar el overlay y redirigir a `.../autorizada`, la pantalla aparece vacía (sin contenido de PromiseAutorizadaClient).

**Causas posibles:**

1. **Router cache (Next.js):** Al hacer `router.push(autorizada)`, el cliente puede estar usando un payload RSC cacheado (layout o página) de cuando la promesa estaba en cierre. En ese payload:
   - El layout podría tener `state = 'cierre'` y `cotizacionEnCierre` con datos.
   - La página autorizada podría haber sido generada antes de que existiera cotización autorizada, por lo que `getCotizacionAutorizadaByPromiseId` podría devolver null en ese payload cacheado, o el cadenero de la página podría redirigir si el state cacheado no es `autorizada`.
2. **Layout y página desincronizados:** Si el layout se sirve desde caché y la página no (o al revés), el contexto podría tener `promiseData` antiguo o la página podría recibir `initialCotizacionAutorizada = null`.
3. **PromiseAutorizadaClient retorna null:** Si `!cotizacionAutorizada || !cotizacionAutorizada.evento_id` o `!contextPromiseData || !contactId`, el componente no renderiza nada.

**Recomendaciones para análisis/fix:**

- Forzar recarga de datos tras el redirect:
  - Opción A: Después de `router.push(autorizada)`, llamar `router.refresh()` para re-ejecutar segmentos de servidor y evitar caché del router.
  - Opción B: Redirigir con navegación completa: `window.location.assign(\`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada\`)` para que no se use el router cache.
- Comprobar en red que, al cargar autorizada, las llamadas a `determinePromiseState` y `getCotizacionAutorizadaByPromiseId` se ejecuten **después** de que la transacción de `autorizarYCrearEvento` haya terminado (ya garantizado por el orden en el cliente: redirect solo cuando el servidor respondió y la animación terminó).
- Revisar si la página o el layout de `[promiseId]` tienen opciones de cache (fetch o segment) que puedan servir datos viejos.

### 9.2 Card en el listado sigue en "nuevo" en vez de archivado/autorizado

**Síntoma:** Al ir a `/promises`, la promesa recién autorizada sigue apareciendo en una columna "nuevo" (o similar) en lugar de en "autorizado" / "aprobado".

**Causas posibles:**

- El listado (Kanban) se cargó antes de la autorización y no se ha revalidado o refetchado.
- La revalidación en `autorizarYCrearEvento` no incluye la ruta del listado (`/promises`), solo la del detalle de la promesa.
- El cliente no vuelve a pedir la lista al navegar de cierre → autorizada (porque no pasa por la página del listado).

**Recomendaciones:**

- Tras autorizar y redirigir, considerar `router.refresh()` para que, si el usuario vuelve al listado, los segmentos se regeneren.
- Valorar revalidar en el servidor la ruta del listado de promesas al finalizar `autorizarYCrearEvento` (p. ej. `revalidatePath(\`/${studioSlug}/studio/commercial/promises\`)`) para que la siguiente carga del Kanban sea fresca.
- O que el Kanban use una fuente de datos que se invalide (tag o query) cuando se autoriza una promesa.

---

## 10. Cancelación justificada de contratos firmados

### Contexto

Permite cancelar contratos que ya fueron firmados por el cliente, con justificación obligatoria para auditoría.

### Ubicación

- **Componente:** `ContratoSection.tsx` en `.../cierre/components/`
- **Server Action:** `actualizarContratoCierre` en `cotizaciones-cierre.actions.ts`

### Flujo de cancelación

1. **UI - Menú dropdown:**
   - Opción "Cancelar contrato" visible siempre (firmado o no)
   - Estilo crítico (rojo) para indicar acción destructiva
   - Click abre modal de confirmación

2. **Modal de justificación (si firmado):**
   - Campo `textarea` obligatorio (mínimo 10 caracteres)
   - Contador en tiempo real: `{motivoCancelacion.length}/10 caracteres mínimos`
   - Botón "Cancelar contrato" deshabilitado hasta cumplir requisito
   - Título diferenciado: "⚠️ Cancelar contrato firmado"

3. **Server Action:**
   - Parámetro `motivoCancelacion?: string` en `actualizarContratoCierre`
   - Si `isClearing && contratoEstuvoFirmado`:
     - Elimina versiones del historial (`studio_cotizaciones_cierre_contract_versions`)
     - Crea log en **studio_promise_logs**:
       - `log_type: 'contract_cancelled_after_signature'`
       - `content`: motivo ingresado por el usuario
       - `meta: { motivo_cancelacion: motivoCancelacion }`
     - Resetea firma: `contract_signed_at: null`
     - Limpia template y contenido

4. **Auditoría:**
   - Todos los contratos cancelados después de firma quedan registrados en logs
   - El motivo es trazable para revisión posterior

### Bloqueo de exclusión

- El switch "Incluir Contrato Digital" se deshabilita si el contrato está firmado
- Tooltip explica: "No se puede excluir un contrato que ya ha sido firmado por el cliente"
- Mensaje visible: "🔒 Contrato firmado por el cliente"
- Solo la cancelación explícita (con justificación) permite revertir

---

## Referencias rápidas

| Qué | Dónde |
|-----|--------|
| Botón "Autorizar y Crear Evento" | `CierreActionButtons.tsx` |
| Handler confirmación y llamada servidor | `usePromiseCierreLogic.tsx` → `handleConfirmAutorizar` |
| Server Action autorización + evento | `cotizaciones-cierre.actions.ts` → `autorizarYCrearEvento` |
| Overlay y redirect a autorizada | `AutorizacionProgressOverlay.tsx` |
| Cadenero y carga autorizada | `autorizada/page.tsx` (determinePromiseState, getCotizacionAutorizadaByPromiseId) |
| Estado de promesa | `promise-state.actions.ts` → `determinePromiseState` |
| Rutas por estado | `promise-navigation.ts` → `getPromisePathFromState` |
| Layout y contexto | `[promiseId]/layout.tsx` → `PromiseLayoutClient` → `PromiseProvider` |

---

*Para creación real del evento (studio_events, agenda, etc.) y detalles de negocio, el código fuente de `autorizarYCrearEvento` en `cotizaciones-cierre.actions.ts` es la referencia; este documento omite el detalle de librerías/components internos de creación de evento y se centra en flujo, DB, enrutamiento y análisis de fallos.*
