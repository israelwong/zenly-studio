# Reporte: Sistema de Vínculos Inteligentes (Smart Catalog)

**Fecha:** 2025-01-31  
**Última actualización:** 2025-01-31  
**Estado:** Implementación completada.

---

## Progreso / Estado actual

| Área | Estado | Notas |
|------|--------|--------|
| BD: tabla `studio_item_links` | ✅ | Migración `20260131000000_add_studio_item_links` |
| API: `getServiceLinks` / `updateServiceLinks` | ✅ | `item-links.actions.ts` |
| Catálogo: configuración de vínculos | ✅ | Botón 🔗, modal, tooltip con nombres de hijos, badge en ítems “hijo” |
| Cotización: inserción en cascada | ✅ | Al agregar padre se añaden hijos (toast si hay hijos) |
| Paquete: inserción en cascada | ✅ | Mismo comportamiento que cotización |
| Cálculo cantidad efectiva (HOUR) | ✅ | Aplica a todos los ítems, incluidos vinculados |
| Soft-linking (quitar hijo sin quitar padre) | ✅ | Comportamiento por diseño |

**Contexto rápido:** Un ítem **padre** puede tener **hijos** vinculados en `studio_item_links`. Al añadir el padre en una cotización o paquete, los hijos se insertan automáticamente con cantidad 1 (solo si no estaban). El usuario puede quitar hijos sin afectar al padre.

---

## 1. Archivos modificados y creados

### Base de datos y API

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Modelo `studio_item_links` (id, studio_id, source_item_id, linked_item_id, order). Relaciones en `studio_items` (item_links_as_source, item_links_as_linked) y en `studios` (item_links). |
| `prisma/migrations/20260131000000_add_studio_item_links/migration.sql` | **Nuevo.** Creación de tabla, FKs, índice único y índices. |
| `src/lib/actions/studio/config/item-links.actions.ts` | **Nuevo.** Server Actions: `getServiceLinks(studioSlug)` → mapa padre→hijos; `updateServiceLinks(studioSlug, sourceItemId, linkedItemIds)`. |

### UI del catálogo (configuración de reglas)

| Archivo | Cambio |
|---------|--------|
| `src/app/[slug]/studio/commercial/catalogo/components/ItemLinksModal.tsx` | **Nuevo.** Modal: búsqueda, lista de ítems del catálogo (excluyendo el actual), checkboxes para elegir hijos, guardar vía `updateServiceLinks`. |
| `src/app/[slug]/studio/commercial/catalogo/components/CatalogoClient.tsx` | Estado `serviceLinksMap`, `isLinkModalOpen`, `linkModalItemId`. Carga de vínculos con `getServiceLinks` al montar. Botón 🔗 (Link2): si tiene hijos, icono en emerald y `Tooltip` con la lista de nombres vinculados; ítems que son hijos de otro muestran un badge con icono de cadena. Render de `ItemLinksModal` con ítems de la misma sección. |

### Inserción en cascada (consumo)

| Archivo | Cambio |
|---------|--------|
| `src/app/[slug]/studio/commercial/promises/components/CotizacionForm.tsx` | Estado `serviceLinksMap`; carga en paralelo con catálogo en `cargarDatos`. En `onToggleSelection`: al agregar un servicio (0→1), se añaden sus hijos del mapa con cantidad 1 solo si no estaban ya seleccionados; toast "Se han añadido servicios vinculados automáticamente" si se agregó al menos un hijo. |
| `src/app/[slug]/studio/commercial/paquetes/components/PaqueteFormularioAvanzado.tsx` | Estado `serviceLinksMap`; `useEffect` que carga `getServiceLinks(studioSlug)`. En `toggleServiceSelection`: al agregar un servicio, se añaden sus hijos (solo los no seleccionados) a `selectedServices` y a `items` con cantidad 1; mismo toast si hay hijos añadidos. |

---

## 2. Regla de flexibilidad (soft-linking)

- **Inserción:** Al agregar un ítem **Padre**, se agregan automáticamente sus ítems **Hijos** (con cantidad 1 si no estaban).
- **Borrado:** El usuario puede quitar un **Hijo** de la lista sin que se quite el **Padre**. El vínculo solo afecta la inserción inicial.

---

## 3. Cálculos y validaciones

- **calcularCantidadEfectiva:** Los ítems agregados por vínculo son parte del mismo estado `items` (cotización) o `items` + `selectedServices` (paquete). El `useEffect` que recalcula precios en ambos formularios recorre todos los ítems con cantidad > 0 y aplica `calcularCantidadEfectiva(billingType, cantidad, durationHours)`. Por tanto, los ítems vinculados tipo **HOUR** usan automáticamente las horas de la promesa/cotización (`durationHours` / `event_duration`).
- **Toast:** Se muestra *"Se han añadido servicios vinculados automáticamente"* cuando al agregar un Padre se inserta al menos un Hijo nuevo.

---

## 4. Pasos para dejar listo el entorno

1. **Aplicar migración**
   ```bash
   npx prisma migrate deploy
   ```
   O, en desarrollo:
   ```bash
   npx prisma db push
   ```

2. **Regenerar cliente Prisma** (si no se ejecutó durante el desarrollo):
   ```bash
   npx prisma generate
   ```

---

## 5. Comprobaciones sugeridas

- **Duplicación:** Agregar un Padre que tenga hijos vinculados → deben aparecer Padre + Hijos con cantidad 1. Volver a agregar el mismo Padre no debe duplicar hijos ya presentes.
- **Cálculo por horas:** Cotización con `event_duration` (o horas de la promesa) y un Padre/Hijo de tipo **HOUR** → el subtotal debe usar cantidad efectiva = cantidad × horas.
- **Soft-linking:** Quitar un Hijo de la lista (cantidad 0 o eliminar) → el Padre debe seguir en la lista.
- **Catálogo:** En la lista de servicios, el botón 🔗 abre el modal; al guardar vínculos, el badge muestra el número de hijos; al recargar, los vínculos se mantienen.

---

## 6. Resumen

- **BD:** Tabla `studio_item_links` y migración creadas.
- **API:** `getServiceLinks` y `updateServiceLinks` implementadas.
- **Catálogo:** Botón Link, modal de vínculos y badge de hijos en `CatalogoClient`.
- **Cotización y paquete:** Inserción en cascada en `onToggleSelection` y `toggleServiceSelection`, con toast y uso de `calcularCantidadEfectiva` para todos los ítems (incluidos vinculados).

---

## 7. Dónde está cada cosa (referencia rápida)

| Qué | Dónde |
|-----|--------|
| Modelo y migración | `prisma/schema.prisma` → `studio_item_links`; `prisma/migrations/20260131000000_add_studio_item_links/` |
| Server Actions | `src/lib/actions/studio/config/item-links.actions.ts` |
| Modal configurar vínculos | `src/app/[slug]/studio/commercial/catalogo/components/ItemLinksModal.tsx` |
| Catálogo: botón Link, tooltip, badge hijo | `src/app/[slug]/studio/commercial/catalogo/components/CatalogoClient.tsx` |
| Cotización: cascada al agregar servicio | `src/app/[slug]/studio/commercial/promises/components/CotizacionForm.tsx` → `onToggleSelection` + `serviceLinksMap` |
| Paquete: cascada al agregar servicio | `src/app/[slug]/studio/commercial/paquetes/components/PaqueteFormularioAvanzado.tsx` → `toggleServiceSelection` + `serviceLinksMap` |
