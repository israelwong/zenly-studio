# CotizacionDetailSheet — Vista previa y detalle de cotización (SSOT)

**Componente que abre:** `CotizacionDetailSheet` (`src/components/promise/CotizacionDetailSheet.tsx`)  
**Trigger del botón "Vista previa":** Bloque compartido `CommercialConfigActionButtons` dentro de `CommercialConfigSidebar` (`src/components/shared/commercial/CommercialConfigSidebar.tsx`).

Documento de arquitectura del sheet/drawer que muestra la cotización completa (servicios, condiciones comerciales, desglose de precio, términos). Se abre desde el botón **"Vista previa"** del sidebar en editores de cotización/paquete, y también desde listados públicos (clic en una cotización). Es la **misma** UI para vista prospecto y para vista previa desde Studio.

---

## 1. Trigger: botón "Vista previa" y flujo de apertura

### 1.1 Dónde está el botón

El botón "Vista previa" (ZenButton, estilo emerald, icono Eye) se renderiza en el **sidebar de configuración** cuando el padre pasa `onRequestPreview` al bloque de acciones:

- **CommercialConfigSidebar** recibe `actionButtons: React.ReactNode`.
- Ese nodo suele ser **CommercialConfigActionButtons**, que recibe entre otras:
  - `onRequestPreview?: () => void` — si está definido, se muestra el botón "Vista previa".
  - `loading`, `isDisabled` — deshabilitan el botón mientras se guarda o cuando no se puede previsualizar.

Snippet del botón (CommercialConfigSidebar.tsx):

```tsx
{onRequestPreview && (
  <ZenButton
    type="button"
    variant="outline"
    onClick={onRequestPreview}
    disabled={loading || isDisabled}
    className="w-full gap-1.5 border-emerald-600/50 text-emerald-400 hover:bg-emerald-500/10 ..."
  >
    <Eye className="h-3.5 w-3.5" />
    Vista previa
  </ZenButton>
)}
```

### 1.2 Cómo se abre el sheet (editor cotización / paquete)

En **EditarCotizacionClient** y **NuevaCotizacionClient**:

1. **CotizacionForm** recibe:
   - `getPreviewDataRef`: ref donde el form escribe `getPreviewData` (función que devuelve `PublicCotizacion | null` con datos actuales del formulario).
   - `onRequestPreview`: callback que el sidebar invoca al hacer clic en "Vista previa".

2. **CotizacionForm** implementa `getPreviewData()`: construye un objeto `PublicCotizacion` en tiempo real (secciones, categorías, servicios, precios, cortesías, bono, condiciones visibles, etc.) sin guardar en BD. Asigna `getPreviewDataRef.current = getPreviewData` en un efecto.

3. Al hacer clic en "Vista previa", el padre ejecuta por ejemplo:
   ```ts
   const handleOpenPreview = () => {
     const data = previewDataRef.current?.() ?? null;
     if (!data) {
       toast.info('Completa los datos de la cotización para ver la vista previa');
       return;
     }
     setPreviewCotizacion(data);
     setIsPreviewOpen(true);
   };
   ```
4. Se renderiza `<CotizacionDetailSheet cotizacion={previewCotizacion} isOpen={isPreviewOpen} onClose={...} ... />`.

**Validación para abrir:** Si `getPreviewDataRef.current?.()` devuelve `null` (p. ej. catálogo vacío o sin servicioMap), no se abre el sheet y se muestra un toast pidiendo completar datos. En **CotizacionForm**, `getPreviewData` devuelve `null` cuando `!catalogo.length || !servicioMap.size`.

### 1.3 Cierre: "Ver cotización" en pantalla de cierre

En la **pantalla de cierre** (`PromiseCierreClient`) no se usa CotizacionDetailSheet para "Vista previa". El botón "Ver cotización" de la tarjeta abre un **ZenDialog** que envuelve **ResumenCotizacion** (datos ya guardados + resumenCierreOverride). Es otro flujo; la documentación de ResumenCotizacion y del modal de cierre está en [flujo-cierre-cotizacion.md](../flows/flujo-cierre-cotizacion.md).

---

## 2. Props de CotizacionDetailSheet (CotizacionDetailSheetProps)

| Prop | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `cotizacion` | `PublicCotizacion` | Sí | Datos de la cotización (servicios, precios, cortesías, bono, condiciones_visibles, condicion_comercial_negociacion, etc.). En vista previa desde editor viene de `getPreviewData()`; en público/evento viene de la API. |
| `isOpen` | boolean | Sí | Controla visibilidad del sheet. |
| `onClose` | `() => void` | Sí | Callback al cerrar (overlay o botón Cerrar). El padre debe poner `isOpen=false` y opcionalmente limpiar `previewCotizacion`. |
| `promiseId` | string | Sí | ID de la promesa (para autorización, realtime, links). En vista previa de paquete sin promesa se puede pasar `"preview"`. |
| `studioSlug` | string | Sí | Slug del estudio (para cargar condiciones, términos, autorizar). |
| `condicionesComerciales` | ver interfaz | No | Condiciones pre-cargadas; si no se pasan, el sheet llama a `obtenerCondicionesComercialesParaCotizacion(studioSlug, cotizacion.condiciones_visibles)`. |
| `terminosCondiciones` | ver interfaz | No | Términos pre-cargados; si no, `obtenerTerminosCondicionesPublicos(studioSlug)`. |
| `showCategoriesSubtotals` | boolean | No | Default `false`. Si true, muestra subtotales por categoría. |
| `showItemsPrices` | boolean | No | Default `false`. Si true, muestra precios por ítem. |
| `showStandardConditions` | boolean | No | Default `true`. Incluir condiciones estándar en la lista mostrada. |
| `showOfferConditions` | boolean | No | Default `false`. Incluir condiciones tipo oferta. |
| `showPackages` | boolean | No | Default `false`. Mostrar bloque de paquetes. |
| `paquetes` | `Array<{id, cover_url}>` | No | Lista de paquetes para enlaces. |
| `autoGenerateContract` | boolean | No | Default `false`. Para flujo de autorización. |
| `mostrarBotonAutorizar` | boolean | No | Default `true`. En vista previa Studio se pasa `false`; en vista pública depende de `share_settings.allow_online_authorization`. |
| `promiseData` | objeto | No | Datos de contacto/evento pre-cargados para el modal de autorización. |
| `dateSoldOut` | boolean | No | Default `false`. Bloquea autorización si el día está vendido. |
| `condicionesVisiblesIds` | `string[] \| null` | No | Si la cotización tiene `condiciones_visibles`, filtrar condiciones por estos IDs. |
| **`isPreviewMode`** | boolean | No | Default `false`. **true** = abierto desde editor Studio (vista previa). Oculta botón Autorizar; si además se pasa `studioFooterActions`, muestra footer con Guardar borrador, Publicar, Guardar como paquete, Cerrar. No suscribe actualizaciones Realtime de cotización. |
| `hideFinancialSections` | boolean | No | Default `false`. Si true, oculta precio/condiciones/términos (solo inspección de servicios). |
| **`studioFooterActions`** | objeto \| null | No | Solo relevante con **isPreviewMode**. Objeto con: `onSaveDraft`, `onSavePublish`, `onGuardarComoPaquete`, `loading`, `savingIntent`, `isSavingAsPaquete`, `isEditMode`, `saveDisabledTitle`, `condicionIdsVisiblesSize`. Si se pasa, el footer del sheet muestra esos botones (paridad con el sidebar). |

---

## 3. Comportamiento interno (condiciones, validaciones, datos)

### 3.1 Carga de condiciones y términos

- Si al abrir (`isOpen` pasa a true) el padre ya pasó `condicionesComercialesIniciales` o `terminosCondicionesIniciales`, se usan y no se hace fetch.
- Si no, se llama a:
  - `obtenerCondicionesComercialesParaCotizacion(studioSlug, cotizacion.condiciones_visibles ?? undefined)`
  - `obtenerTerminosCondicionesPublicos(studioSlug)`
- **Estado de carga:** Mientras `loadingCondiciones === true`, la sección "Condiciones Comerciales" muestra un **skeleton** (2 bloques tipo card + bloque de resumen) en lugar de renderizar todas las condiciones y luego ocultar las no visibles. Esto evita el parpadeo al abrir el sheet.
- **Filtro de condiciones mostradas:** Solo se muestran condiciones con `is_public !== false`. Si la cotización tiene `condiciones_visibles` (array de IDs), se filtra la lista de condiciones por esos IDs (prioriza `condicionesVisiblesIds` prop, luego `currentCotizacion.condiciones_visibles`); si no, se usan `showStandardConditions` y `showOfferConditions` por tipo. La condición de negociación (`condicion_comercial_negociacion`) se muestra siempre si existe y se coloca primera.

### 3.2 Selección de condición y precio

- El usuario debe elegir una condición comercial para ver anticipo/diferido y, en modo público, para habilitar "Autorizar".
- **Auto-selección:** Si hay exactamente una condición en `condicionesAMostrar` y ninguna seleccionada, se selecciona esa y su primer método de pago si aplica.
- **Cálculo de precio:** `calculatePriceWithCondition()` usa la condición seleccionada: precio base (precio lista − cortesías − bono), descuento % de la condición, anticipo (% o monto fijo), diferido. Se usa en PrecioDesglose y en el modal Autorizar.
- **Total a pagar (SSOT):** `getPrecioFinalCierre(cotizacion, fallbackCalculado)` busca en orden: 1) `cotizacion.totalAPagar` (motor de cotización), 2) `cotizacion.negociacion_precio_personalizado`, 3) fallback calculado. En vista previa desde editor, `totalAPagar` viene del campo "Precio Final de Cierre"; desde pendientes/cierre se calcula con `calculateCotizacionTotals` en el servidor.

### 3.3 Realtime (solo cuando no es vista previa)

- Si **isPreviewMode === false**, el sheet se suscribe a `useCotizacionesRealtime(studioSlug, promiseId, onCotizacionUpdated)`. Cuando la cotización actual se actualiza en BD, se vuelve a cargar la cotización vía `getPublicPromisePendientes` y se actualiza el estado local (`setCurrentCotizacion`). Hay throttling (mínimo 1 s entre actualizaciones) y solo se reacciona si el sheet está abierto y el ID coincide.

### 3.4 Bloqueo de scroll y portal

- Cuando `isOpen`, se hace `document.body.style.overflow = 'hidden'`; al desmontar o cerrar se restaura.
- El contenido del sheet se renderiza con `createPortal(sheetContent, document.body)` para que quede por encima de todo (z-index 10000 overlay + sheet).

### 3.5 Footer según modo

- **isPreviewMode && studioFooterActions:** Footer con botones Guardar cambios / Publicar, Guardar como paquete, Cerrar. Los botones de guardado se deshabilitan si `condicionIdsVisiblesSize === 0` (debe haber al menos una condición visible).
- **isPreviewMode sin studioFooterActions:** Solo botón Cerrar.
- **Modo público (!isPreviewMode):** Botón Cerrar y botón "Autorizar" (si `mostrarBotonAutorizar`). "Autorizar" está deshabilitado si no hay `selectedCondicionId`.

---

## 4. Dónde se usa

| Ubicación | Cómo se abre | Props relevantes |
|-----------|--------------|-------------------|
| **EditarCotizacionClient** | Botón "Vista previa" del sidebar → `handleOpenPreview` → `getPreviewDataRef.current?.()` → `CotizacionDetailSheet` con `cotizacion={previewCotizacion}` (incluye `totalAPagar` del campo "Precio Final de Cierre"), `isPreviewMode`, `studioFooterActions` (refs a saveHandlers). | `promiseId`, `studioSlug`, `showItemsPrices`/`showCategoriesSubtotals` desde shareSettings. |
| **NuevaCotizacionClient** | Igual que EditarCotizacionClient: `onRequestPreview` + `getPreviewDataRef` desde CotizacionForm. | Similar; sin `isEditMode` en footer. |
| **PromiseQuotesPanelCard** (pendientes) | Botón "Vista previa" → `getQuoteDetailForPreview(studioSlug, cotizacion.id)` → server action que calcula `totalAPagar` con motor de cotización → `CotizacionDetailSheet` con `isPreviewMode`, sin footer de acciones. | `promiseId`, `studioSlug`, `isLoadingPreview` (skeleton mientras carga). |
| **PaqueteFormularioAvanzado** | Botón "Vista previa" en CommercialConfigActionButtons → `onRequestPreview={() => setPreviewOpen(true)}`. La cotización de preview es un `PublicCotizacion` sintético construido desde nombre, precio, horas, ítems del paquete. | `promiseId="preview"`, `studioSlug`, `isPreviewMode`; sin `studioFooterActions`. |
| **CotizacionesSection** (vista promesa) | Clic en una cotización de la lista → `setSelectedCotizacion(cotizacion)` → sheet con esa cotización. | Datos desde API; no es vista previa. |
| **ComparadorButton** | Al elegir una cotización en el comparador → mismo patrón. | `paquetes` para enlaces. |
| **PublicQuoteAuthorizedView** | Al abrir "Servicios" o equivalente → `setShowServicesSheet(true)` con la cotización autorizada. | `mostrarBotonAutorizar={false}`. |
| **PromiseCierreClient** | No usa CotizacionDetailSheet para "Ver cotización"; usa ZenDialog + ResumenCotizacion con `resumenCierreOverride` (total negociado cuando existe). | — |

---

## 5. Resumen de condiciones y validaciones

- **Para que el botón "Vista previa" abra el sheet en editores:** El padre debe pasar `onRequestPreview` y el ref `getPreviewDataRef` debe estar poblado por CotizacionForm. `getPreviewData()` debe devolver un `PublicCotizacion` no nulo (catálogo y servicioMap no vacíos) con `totalAPagar` explícito (valor del campo "Precio Final de Cierre"); si devuelve null, se muestra toast y no se abre.
- **Dentro del sheet:** Condiciones mostradas = solo públicas; si hay `condiciones_visibles`, filtrar por esos IDs. Skeleton mientras `loadingCondiciones === true`. Autorizar (modo público) requiere `selectedCondicionId`. Footer de estudio (guardar/publicar) requiere `condicionIdsVisiblesSize > 0`.
- **Cierre:** Al cerrar, el padre debe poner `isOpen=false` y, en vista previa, limpiar el estado de la cotización de preview para no dejar datos obsoletos en el siguiente open.
- **Paridad de total:** Editor, pendientes y cierre muestran el mismo total en el sheet gracias a `totalAPagar` (motor de cotización) o `negociacion_precio_personalizado` cuando existe.

---

## 6. Diseño del bloque "Total a pagar"

En la parte superior del sheet (antes de "Servicios Incluidos"), se muestra el bloque de precio con fondo emerald:

- **Etiqueta:** "Total a pagar" (texto pequeño emerald-200/70).
- **Línea de montos:** Si hay concesiones (cortesías, bono, descuento), primero el **precio de lista tachado** (`text-zinc-400 line-through font-normal text-2xl`), luego el **total a pagar** en emerald y bold (`text-2xl font-bold text-emerald-300`), ambos en la misma línea con `flex flex-wrap items-baseline gap-2`.
- Si no hay concesiones, solo se muestra el total a pagar.
- A la derecha (si aplica): badge "Basado en [nombre del paquete]" cuando `cotizacion.paquete_origen` existe.

Este diseño reemplaza el layout previo (precio de lista en fila separada arriba, total abajo).

---

## 7. Relación con otros documentos

- **Flujo cierre y modal "Ver cotización":** [flujo-cierre-cotizacion.md](../flows/flujo-cierre-cotizacion.md) § 6 (modal "Ver cotización" usa ResumenCotizacion en ZenDialog con `resumenCierreOverride`, no CotizacionDetailSheet).
- **Resumen financiero dentro del sheet:** [resumen-pago.md](./resumen-pago.md); el sheet usa PrecioDesglose (que a su vez puede usar ResumenPago).
- **Sidebar y botones de acción:** `CommercialConfigSidebar` y `CommercialConfigActionButtons` en `src/components/shared/commercial/CommercialConfigSidebar.tsx`.
- **Motor de cotización:** `calculateCotizacionTotals` en `src/lib/utils/cotizacion-calculation-engine.ts` (SSOT para `totalAPagar`).
