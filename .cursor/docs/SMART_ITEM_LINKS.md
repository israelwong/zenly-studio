# ZEN Platform V2.0 - Master Doc: Vínculos Inteligentes (Smart Item Links)

## 1. Propósito

Optimizar la velocidad de cotización y creación de paquetes permitiendo que ciertos ítems (Servicios o Productos) actúen como "disparadores" de otros. Si un ítem Padre es seleccionado, sus ítems Hijos asociados se agregan o seleccionan automáticamente.

---

## 2. Arquitectura de Datos

### 2.1 Tabla y modelo

- **Tabla:** `studio_item_links` (Prisma: `item_links` / modelo `studio_item_links`)
- **Estructura:**
  - `source_item_id` (Padre/Disparador)
  - `linked_item_id` (Hijo/Asociado)
  - `studio_id` (Contexto del estudio)
  - `order` (opcional, para orden de hijos)
- **Regla de Negocio:** Solo se permite vincular ítems que pertenezcan a la **misma sección** del catálogo para mantener la coherencia operativa.

### 2.2 Migración

- **Migración:** `prisma/migrations/20260131000000_add_studio_item_links/migration.sql`
- Creación de tabla, FKs, índice único `(studio_id, source_item_id, linked_item_id)` e índices por `studio_id` y `source_item_id`.

### 2.3 Server Actions

- **Archivo:** `src/lib/actions/studio/config/item-links.actions.ts`
- **Funciones:**
  - **`getServiceLinks(studioSlug)`** → Devuelve un mapa `source_item_id → linked_item_id[]` (padre → hijos).
  - **`updateServiceLinks(studioSlug, sourceItemId, linkedItemIds)`** → Actualiza los vínculos de un padre (reemplaza la lista de hijos).
  - **`clearAllLinksForItem(studioSlug, itemId)`** → Rompe todos los vínculos donde el ítem sea padre o hijo.

---

## 3. UX en Catálogo

### 3.1 SmartLinkBar (barra flotante)

- **Activación:** Botón "Activar Smart Link" en la parte inferior del catálogo (centrado, fixed bottom).
- **Renderizado:** La barra se renderiza con **React Portal** (`createPortal(..., document.body)`) para escapar del layout del estudio (`main` con `overflow-y-auto` y ancestros con `overflow-hidden`). Así la barra siempre es visible en viewport y no queda recortada. Solo se monta en cliente (`mounted`) para evitar uso de `document` en SSR.
- **Estilo:** Contenedor con efecto cristal espejo: `backdrop-blur-xl`, gradiente semitransparente (`from-white/25` → `to-emerald-900/60`), borde `border-white/25`. Botón "Activar Smart Link" con fondo translúcido y sombra interior para reflejo.
- **Modo Selección:** Al activarse, el clic en una fila de ítem **no** abre el modal de edición; en su lugar hace **toggle** de selección para definir/editar el grupo (padre + hijos).
- **Flujo:** El usuario selecciona varios ítems → elige cuál es el padre → confirma. Se llama `updateServiceLinks` con el padre y la lista de hijos.

### 3.2 Badges esmeralda

- **Identificación:** Los ítems vinculados muestran un **Badge Esmeralda** (🔗) con el nombre corto del grupo o del ítem padre.
- **Padre:** Muestra el nombre del primer hijo vinculado (o "vínculos") en el badge.
- **Hijo:** Muestra el nombre del padre en el badge.
- **Acceso rápido:** Clic en el badge activa el modo edición de ese vínculo (carga el grupo en la SmartLinkBar) sin abrir el modal de edición del ítem.
- **Romper vínculo:** Botón X en el badge llama a `clearAllLinksForItem` para ese ítem.

### 3.3 Efecto hover (resaltado por grupo)

- **Comportamiento:** Al pasar el cursor sobre cualquier ítem de un grupo, **todos los miembros del grupo** (Padre e Hijos) se resaltan con un fondo `bg-emerald-500/15`.
- **Implementación:** En `CatalogSortableItem`, `onMouseEnter` llama a `onHoverGroup(groupIds)` con los IDs del grupo; `onMouseLeave` llama a `onHoverGroup(null)`. El overlay verde tiene `pointer-events-none` y `z-0` para no bloquear clics.
- **Cálculo del grupo:** `getGroupIds(itemId)` devuelve el array de IDs (padre + todos los hijos) a partir de `serviceLinksMap` y `linkedIdsSet`.

### 3.4 Archivos de UI en catálogo

| Qué | Archivo |
|-----|---------|
| Estado, sensores DnD, modales, SmartLinkBar | `src/app/[slug]/studio/commercial/catalogo/components/CatalogoClient.tsx` |
| Fila de ítem (badge, overlay, clic, hover) | `src/app/[slug]/studio/commercial/catalogo/components/CatalogSortableItem.tsx` |
| Modal configurar vínculos (lista de ítems, checkboxes) | `src/app/[slug]/studio/commercial/catalogo/components/ItemLinksModal.tsx` |
| Barra flotante modo selección / confirmar grupo | `src/app/[slug]/studio/commercial/catalogo/components/SmartLinkBar.tsx` |

---

## 4. Lógica de Inserción (Soft-linking)

### 4.1 Filosofía

- **Soft-linking:** El vínculo solo dispara la **inserción inicial**. El usuario puede desmarcar o eliminar un ítem Hijo sin que se elimine el ítem Padre.
- **Selección activa:** Cuando el usuario selecciona un ítem Padre (checkbox o botón agregar), el sistema consulta el mapa de vínculos (`serviceLinksMap`).
- **Auto-agregación:** Todos los `linked_item_id` asociados se insertan en la lista con **cantidad 1** si no estaban ya presentes.
- **Toast:** Si se añade al menos un hijo, se muestra "Se han añadido servicios vinculados automáticamente".

### 4.2 Cotizaciones

- **Archivo:** `src/app/[slug]/studio/commercial/promises/components/CotizacionForm.tsx`
- **Punto de inserción:** En `onToggleSelection`, al agregar un servicio (cantidad 0 → 1), se recorren los hijos de ese servicio en `serviceLinksMap` y se añaden con cantidad 1 solo si no estaban ya en `items`.
- **Cálculo de horas:** Los ítems vinculados tipo **HOUR** usan automáticamente la duración del evento (`event_duration` de la cotización o `duration_hours` de la promesa) vía `calcularCantidadEfectiva(billingType, cantidad, durationHours)` en el recálculo de precios.

### 4.3 Paquetes

- **Archivo:** `src/app/[slug]/studio/commercial/paquetes/components/PaqueteFormularioAvanzado.tsx`
- **Punto de inserción:** En `toggleServiceSelection`, al agregar un servicio se añaden sus hijos (solo los no seleccionados) a `selectedServices` y a `items` con cantidad 1. Mismo toast si hay hijos añadidos.
- **Cálculo de horas:** Si el ítem vinculado es tipo **HOUR**, hereda la duración del evento/promesa configurada en el formulario (`base_hours` o equivalente).

### 4.4 Utilidad de cantidad efectiva

- **Archivo:** `src/lib/utils/dynamic-billing-calc.ts` → `calcularCantidadEfectiva(billingType, quantity, durationHours)`.
- Usado en cotización y paquete para subtotales y totales; aplica a todos los ítems (incluidos los agregados por vínculo).

---

## 5. Mantenimiento: Editar o Romper Vínculos

### 5.1 Editar vínculos de un ítem (cambiar hijos)

1. **Desde el catálogo:** Clic en el badge esmeralda del ítem padre → se activa la SmartLinkBar con ese grupo cargado. Ajustar la selección y confirmar.
2. **Alternativa:** Abrir el modal de vínculos (ItemLinksModal) desde el botón 🔗 si existe en la fila del ítem; elegir/desmarcar hijos y guardar vía `updateServiceLinks`.

### 5.2 Romper todos los vínculos de un ítem

- Clic en el botón **X** del badge esmeralda en la fila del ítem. Llama a `clearAllLinksForItem(studioSlug, itemId)` y actualiza `serviceLinksMap` en el cliente.

### 5.3 Aplicar migración y regenerar cliente

```bash
npx prisma migrate deploy
# o en desarrollo:
npx prisma db push

npx prisma generate
```

---

## 6. Archivos Clave (Referencia Rápida)

| Área | Archivo |
|------|---------|
| Server Actions vínculos | `src/lib/actions/studio/config/item-links.actions.ts` |
| UI Catálogo (estado, SmartLinkBar, modales) | `src/app/[slug]/studio/commercial/catalogo/components/CatalogoClient.tsx` |
| Componente fila ítem (badge, overlay, hover) | `src/app/[slug]/studio/commercial/catalogo/components/CatalogSortableItem.tsx` |
| Modal configurar vínculos | `src/app/[slug]/studio/commercial/catalogo/components/ItemLinksModal.tsx` |
| Barra flotante Smart Link | `src/app/[slug]/studio/commercial/catalogo/components/SmartLinkBar.tsx` |
| Cotización: inserción en cascada | `src/app/[slug]/studio/commercial/promises/components/CotizacionForm.tsx` |
| Paquete: inserción en cascada | `src/app/[slug]/studio/commercial/paquetes/components/PaqueteFormularioAvanzado.tsx` |
| Cálculo cantidad efectiva / billing | `src/lib/utils/dynamic-billing-calc.ts` |
| Modelo y migración | `prisma/schema.prisma` → `studio_item_links`; `prisma/migrations/20260131000000_add_studio_item_links/` |

---

## 7. Comprobaciones Sugeridas

- **Duplicación:** Agregar un Padre con hijos vinculados → deben aparecer Padre + Hijos con cantidad 1. Volver a agregar el mismo Padre no debe duplicar hijos ya presentes.
- **Cálculo por horas:** Cotización con `event_duration` y un Padre/Hijo tipo **HOUR** → el subtotal debe usar cantidad efectiva = cantidad × horas.
- **Soft-linking:** Quitar un Hijo de la lista (cantidad 0 o eliminar) → el Padre debe seguir en la lista.
- **Catálogo:** Hover sobre un ítem vinculado → todos los del grupo se resaltan en verde. Clic en la fila (fuera del badge y del menú) abre el modal de edición. Clic en el badge activa edición del vínculo.
