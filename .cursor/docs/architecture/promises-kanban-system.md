# Sistema Kanban de Promesas — Documentación de Referencia

Documento técnico de referencia (SSoT) para el Kanban de promesas comerciales: arquitectura de columnas, estados terminales, identidad visual y persistencia de UI.

---

## 1. Arquitectura de Columnas

### Etapas activas vs columna virtual

El Kanban distingue dos tipos de columnas:

| Tipo | Origen | Comportamiento |
|------|--------|----------------|
| **Etapas activas** | BD (`promise_pipeline_stages`), filtradas por `!isTerminalStage(slug)` | Una columna por etapa: Pendiente, Negociación, Cierre. Cada promesa se asigna por `promise_pipeline_stage_id`. |
| **Columna virtual "Historial"** | Solo en frontend | Agrupa **todas** las promesas en estado terminal (aprobadas, archivadas, canceladas) en una sola columna al final del board. |

- **ID de la columna virtual:** `historial-virtual`
- **Slug:** `historial`
- La columna Historial **no existe en BD**. Es una vista agregada para simplificar el board.
- Visibilidad: controlada por el toggle "Mostrar Historial" (oculta por defecto). Ver [Persistencia de UI](#5-persistencia-de-ui).

**Origen de datos:** `src/app/[slug]/studio/commercial/promises/components/PromisesKanban.tsx` — `visibleStages` (useMemo que concatena etapas activas + etapa virtual cuando `showHistorial` es true).

---

## 2. Lógica de Estados Terminales

### Slugs considerados terminales

El sistema trata como **terminal** (cierre del pipeline) los siguientes slugs:

| Categoría | Slugs |
|-----------|--------|
| Aprobado | `approved`, `aprobada`, `autorizada` |
| Cancelado | `canceled`, `cancelado` |
| Archivado | `archived`, `archivado` |

**Implementación:** `src/lib/utils/pipeline-stage-names.ts`

- `isTerminalStage(slug: string): boolean` — retorna `true` si el slug está en el set de terminales.
- Las promesas con `promise_pipeline_stage.slug` terminal se agrupan en la clave `historial-virtual` en `promisesByStage` y se muestran solo en la columna Historial cuando está visible.

En BD cada promesa sigue teniendo **un solo** `promise_pipeline_stage_id` (approved, archived o canceled); la agrupación en "Historial" es solo visual en el Kanban.

---

## 3. Sistema de Identidad Visual (Jerarquía de Tinte)

El color de la tarjeta (fondo y borde) sigue una jerarquía clara para que sea obvio **por qué** una tarjeta se ve verde, roja, gris o de otro color.

### Prioridad del color

1. **Prioridad 1 — Estado terminal**  
   Si la promesa está en una etapa terminal, se usa el color de esa etapa (no el de las etiquetas):
   - **Aprobado:** `#10B981` (verde)
   - **Cancelado:** `#EF4444` (rojo)
   - **Archivado:** `#71717a` (gris)
   - Implementación: `getTerminalColor(slug)` en `pipeline-stage-names.ts`.

2. **Prioridad 2 — Etiquetas**  
   Si la promesa **no** es terminal y tiene al menos una etiqueta, se usa el color de la **primera etiqueta** (`finalTags[0].color`).

3. **Sin color**  
   Si no es terminal y no tiene etiquetas: estilos por defecto (`bg-zinc-900`, borde zinc).

Así, una tarjeta verde es **siempre** una promesa aprobada; una tarjeta con color de tag es una promesa activa con esa etiqueta.

### Aplicación de estilos

- **Fondo:** color con opacidad ~8% → en hex: `${color}14`
- **Borde:** color con opacidad ~20% → en hex: `${color}33`
- **Pills de etiquetas:** diseño "full rounded" (pills redondeados), máximo 3 visibles + contador "+N" si hay más.

**Implementación:** `src/app/[slug]/studio/commercial/promises/components/PromiseKanbanCard.tsx` — cálculo de `terminalColor` / `primaryTag` y aplicación a `cardStyles` y clases.

---

## 4. Interacción (Drag & Drop)

### Drop en la columna "Historial"

La columna virtual `historial-virtual` es droppable. Al **soltar** una tarjeta sobre ella:

1. El frontend recibe `over.id === 'historial-virtual'`.
2. Se **mapea** a la etapa real de cierre por defecto: **archived**.
3. Se busca en `pipelineStages` la etapa con `slug === 'archived'` y se usa su `id` para la llamada a la API.
4. Se llama a `movePromise(studioSlug, { promise_id, new_stage_id: archivedStage.id })`.

En resumen: **soltar en Historial = mover a "Archivado" en BD**. No se escribe nunca `historial-virtual` en la base de datos.

Las validaciones de negocio (por ejemplo, no pasar de Cierre a Aprobado directamente, o restricciones cuando hay evento) se aplican igual; el mapeo a `archived` ocurre después de resolver el drop en la columna virtual.

**Implementación:** `PromisesKanban.tsx` — `handleDragEnd`: cuando `newStageId === 'historial-virtual'`, se sustituye por el `id` de la etapa `archived` antes de actualizar estado y llamar a la API.

---

## 5. Persistencia de UI

- **Toggle "Mostrar Historial":** controla si la columna virtual Historial se muestra al final del Kanban.
- **Valor por defecto:** columna **oculta** (`showHistorial === false`).
- **Persistencia:** `localStorage` con clave `kanban-show-historial-${studioSlug}`.
- Al cargar el Kanban se lee esa clave; si no existe, se usa `false`.

Así cada estudio mantiene su preferencia de mostrar u ocultar Historial sin afectar la BD.

---

## Resumen rápido para desarrolladores

| Pregunta | Respuesta |
|----------|-----------|
| ¿Por qué una tarjeta es verde? | Está en etapa **aprobada** (prioridad de tinte por estado terminal). |
| ¿Por qué una tarjeta tiene color de tag? | Es etapa **activa** y tiene al menos una etiqueta; se usa el color del primer tag. |
| ¿Por qué "desapareció" de su columna original? | Si estaba en aprobado/archivado/cancelado, ahora se muestra en la columna **Historial** cuando el toggle está activo; en BD sigue en su misma etapa. |
| ¿Qué se guarda al soltar en Historial? | Siempre la etapa **archived** (`slug === 'archived'`); el ID es el de esa etapa en BD. |

---

*Referencia de código: `PromisesKanban.tsx`, `PromiseKanbanCard.tsx`, `pipeline-stage-names.ts`, `PromiseDetailHeader.tsx`.*
