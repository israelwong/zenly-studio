# Solución: Snapshots en Cotizaciones

**Fecha:** Enero 4, 2026  
**Problema:** Items de cotizaciones mostraban "Servicio migrado" en previews y contratos  
**Estado:** ✅ RESUELTO

---

## 🔍 Problema Identificado

### Síntomas
- Preview de cotizaciones mostraba "Servicio migrado" en lugar de nombres de items
- Contratos renderizados mostraban "Servicio migrado"
- Secciones y categorías se veían correctamente
- Solo los nombres de items estaban afectados

### Causa Raíz
**Cotizaciones antiguas NO tenían snapshots guardados en la base de datos.**

Al crear cotizaciones, el flujo era:
1. Crear cotización ✅
2. Crear items con `createMany` (solo `item_id`, `quantity`, `order`) ✅
3. Llamar a `calcularYGuardarPreciosCotizacion` para guardar snapshots ❌ **FALLABA SILENCIOSAMENTE**

El error se capturaba pero no se propagaba:
```typescript
await calcularYGuardarPreciosCotizacion(...).catch(() => {
  // No fallar la creación si el cálculo de precios falla
});
```

**Resultado:** Items sin snapshots → `name_snapshot` = null → Fallback a "Servicio migrado"

---

## ✅ Solución Implementada

### 1. Verificación del Flujo de Creación

**Archivos verificados:**
- `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts` (línea 166)
- `src/lib/actions/public/paquetes.actions.ts` (línea 272)

**Ambos archivos SÍ llaman a `calcularYGuardarPreciosCotizacion` correctamente.**

### 2. Función de Cálculo de Precios y Snapshots

**Archivo:** `src/lib/actions/studio/commercial/promises/cotizacion-pricing.ts`

**La función `calcularYGuardarPreciosCotizacion` guarda AMBOS:**
- **Campos operacionales** (mutables): `name`, `description`, `category_name`, `seccion_name`, etc.
- **Snapshots** (inmutables): `name_snapshot`, `description_snapshot`, `category_name_snapshot`, `seccion_name_snapshot`, etc.

```typescript
await prisma.studio_cotizacion_items.update({
  where: { id: item.id },
  data: {
    // Campos operacionales (mutables)
    name: datosCatalogo.nombre,
    description: datosCatalogo.descripcion,
    category_name: datosCatalogo.categoria,
    seccion_name: datosCatalogo.seccion,
    cost: datosCatalogo.costo || 0,
    expense: datosCatalogo.gasto || 0,
    unit_price: precios.precio_final,
    subtotal: precios.precio_final * item.quantity,
    profit: precios.utilidad_base,
    public_price: precios.precio_final,
    profit_type: tipoUtilidadFinal,
    // Snapshots (inmutables - estructura jerárquica completa)
    name_snapshot: datosCatalogo.nombre,
    description_snapshot: datosCatalogo.descripcion,
    category_name_snapshot: datosCatalogo.categoria,
    seccion_name_snapshot: datosCatalogo.seccion,
    cost_snapshot: datosCatalogo.costo || 0,
    expense_snapshot: datosCatalogo.gasto || 0,
    unit_price_snapshot: precios.precio_final,
    profit_snapshot: precios.utilidad_base,
    public_price_snapshot: precios.precio_final,
    profit_type_snapshot: tipoUtilidadFinal,
  },
});
```

### 3. Uso de Función Centralizada para Renderizado

**Archivo:** `src/lib/actions/public/promesas.actions.ts`

**Usa `construirEstructuraJerarquicaCotizacion` que prioriza snapshots:**

```typescript
const estructura = construirEstructuraJerarquicaCotizacion(
  cot.cotizacion_items.map(item => ({
    item_id: item.item_id!,
    quantity: item.quantity,
    name_snapshot: item.name_snapshot,      // ⭐ Priorizar snapshots
    description_snapshot: item.description_snapshot,
    category_name_snapshot: item.category_name_snapshot,
    seccion_name_snapshot: item.seccion_name_snapshot,
    name: item.name,                        // Fallback
    description: item.description,
    // ...
  })),
  options
);
```

### 4. Componente de Renderizado

**Archivo:** `src/components/promise/PublicServiciosTree.tsx`

```typescript
// Usar snapshots con fallback
<h6>{servicio.name_snapshot || servicio.name}</h6>
<p>{servicio.description_snapshot || servicio.description}</p>
```

### 5. Script de Migración para Datos Antiguos

**Archivo:** `scripts/fix-missing-snapshots.ts`

```bash
npx tsx scripts/fix-missing-snapshots.ts
```

**Resultado:** Actualizó registros antiguos con snapshots faltantes.

### 6. Fix de Status en Generación Automática de Contratos

**Problema adicional encontrado:**
- Al generar contrato automáticamente, el status cambiaba a `contract_generated`
- Esto causaba que la cotización NO apareciera en `PromiseClosingProcessSection`
- Y SÍ apareciera incorrectamente en `PromiseQuotesPanel`

**Solución:**
- Mantener status en `en_cierre` cuando se genera contrato automáticamente
- El campo `contrato_definido` en `studio_cotizaciones_cierre` indica si el contrato fue generado

**Archivos corregidos:**
- `src/lib/actions/public/cotizaciones.actions.ts` (línea 228-235)
- `src/lib/actions/public/paquetes.actions.ts` (línea 325-335)

**Antes (❌):**
```typescript
await prisma.studio_cotizaciones.update({
  where: { id: cotizacionId },
  data: {
    status: 'contract_generated', // ❌ Causaba problemas de filtrado
  },
});
```

**Después (✅):**
```typescript
// Mantener status en 'en_cierre' (no cambiar a 'contract_generated')
// Solo actualizar studio_cotizaciones_cierre
await prisma.studio_cotizaciones_cierre.update({
  where: { cotizacion_id: cotizacionId },
  data: {
    contract_template_id: template.id,
    contract_content: renderResult.data,
    contrato_definido: true, // ✅ Este campo indica que el contrato fue generado
  },
});
```

---

## 🧪 Verificación

### Flujo de Creación desde Estudio
1. Crear cotización desde paquete o personalizada
2. `calcularYGuardarPreciosCotizacion` se ejecuta automáticamente
3. Snapshots se guardan correctamente
4. Preview muestra nombres correctos

### Flujo de Autorización desde Público
1. Prospecto autoriza cotización o paquete
2. Se crea cotización con `status: 'en_cierre'`
3. `calcularYGuardarPreciosCotizacion` se ejecuta automáticamente
4. Snapshots se guardan correctamente
5. Si `auto_generate_contract` está activo, se genera contrato
6. Status permanece en `en_cierre` (NO cambia a `contract_generated`)
7. Preview muestra nombres correctos

### Logs de Verificación
```
[PRICING] Iniciando cálculo para cotización cmXXXXX
[PRICING] Configuración de precios obtenida
[PRICING] Catálogo obtenido: X secciones
[PRICING] Items encontrados: X
[PRICING] Item actualizado: Nombre del servicio
[PRICING] Proceso completado: X/X items actualizados
```

---

## 📋 Checklist de Prevención

Para evitar este problema en el futuro:

- [x] `calcularYGuardarPreciosCotizacion` se llama en `createCotizacion`
- [x] `calcularYGuardarPreciosCotizacion` se llama en `updateCotizacion`
- [x] `calcularYGuardarPreciosCotizacion` se llama en `solicitarPaquetePublico`
- [x] `calcularYGuardarPreciosCotizacion` se llama en `autorizarCotizacionPublica`
- [x] Función centralizada `construirEstructuraJerarquicaCotizacion` se usa en todos los renders
- [x] Componentes de renderizado usan `name_snapshot || name` como fallback
- [x] Status permanece en `en_cierre` al generar contrato automáticamente
- [x] Script de migración disponible para datos antiguos

---

## 🎯 Fuente de Verdad

**Documento principal:** `.cursor/docs/cotizaciones-estructura-jerarquica.md`

**Función centralizada:** `construirEstructuraJerarquicaCotizacion` en `cotizacion-structure.utils.ts`

**Principio:** Los snapshots son inmutables y representan el estado de la cotización en el momento de su creación.

---

**Documento creado:** Enero 4, 2026  
**Última actualización:** Enero 4, 2026  
**Estado:** Documentado y verificado ✅

