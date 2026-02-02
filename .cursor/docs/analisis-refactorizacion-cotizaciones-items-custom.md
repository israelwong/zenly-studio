# Análisis: Refactorización del Módulo de Cotizaciones - Items Custom "Al Vuelo"

**Fecha:** 2026-01-26  
**Rama:** `260119-studio-dyamic_billing`  
**Objetivo:** Identificar componentes, flujos y esquemas para permitir agregar ítems custom directamente en cotizaciones sin que existan en el catálogo.

---

## 📋 ÍNDICE

1. [Mapeo de UI](#1-mapeo-de-ui)
2. [Flujo de Importación de Paquetes](#2-flujo-de-importación-de-paquetes)
3. [Arquitectura de Items Custom](#3-arquitectura-de-items-custom)
4. [Lógica de Cálculo Dinámico](#4-lógica-de-cálculo-dinámico)
5. [Propuesta de Implementación](#5-propuesta-de-implementación)

---

## 1. MAPEO DE UI

### 1.1 Componente Principal: `CotizacionForm.tsx`

**Ubicación:** `src/app/[slug]/studio/commercial/promises/components/CotizacionForm.tsx`

**Responsabilidades:**
- Formulario de creación/edición de cotizaciones
- Gestión de estado de items seleccionados (`items: { [servicioId: string]: number }`)
- Carga de catálogo y configuración de precios
- Cálculo de precios en tiempo real
- Integración con paquetes (importación)

**Estructura de Estado:**
```typescript
const [items, setItems] = useState<{ [servicioId: string]: number }>({});
const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
const [configuracionPrecios, setConfiguracionPrecios] = useState<ConfiguracionPrecios | null>(null);
```

**Componente de Selección de Items:**
- Usa `CatalogoServiciosTree` (componente compartido)
- Ubicación: `src/components/shared/catalogo/CatalogoServiciosTree.tsx`
- Permite seleccionar servicios del catálogo con controles de cantidad
- Soporta filtrado por texto
- Muestra badges de tipo (Servicio/Producto) y billing_type (HOUR/UNIT/SERVICE)

**Flujo Actual de Agregado de Items:**
1. Usuario busca/selecciona servicio del catálogo
2. Click en servicio → se agrega a `items` con cantidad inicial 1
3. Controles +/- ajustan cantidad en `items[servicioId]`
4. Cálculo de precio se actualiza automáticamente

---

## 2. FLUJO DE IMPORTACIÓN DE PAQUETES

### 2.1 Importación desde Paquete

**Ubicación:** `CotizacionForm.tsx` líneas 168-192

**Flujo:**
```typescript
// Si hay packageId, cargar datos del paquete
if (packageId) {
  const paqueteResult = await obtenerPaquetePorId(packageId);
  if (paqueteResult.success && paqueteResult.data) {
    const paquete = paqueteResult.data;
    setNombre(paquete.name || '');
    setDescripcion(paquete.description || '');
    setPrecioPersonalizado(paquete.precio || '');

    // Cargar items del paquete
    if (paquete.paquete_items && paquete.paquete_items.length > 0) {
      const paqueteItems: { [id: string]: number } = {};
      paquete.paquete_items.forEach(item => {
        if (item.item_id) {
          paqueteItems[item.item_id] = item.quantity;
        }
      });
      setItems(paqueteItems);
    }
  }
}
```

**Observaciones:**
- Solo importa items que tienen `item_id` válido
- Replica cantidades del paquete
- No crea items custom durante la importación

### 2.2 Creación desde Paquete (Portal Público)

**Ubicación:** `src/lib/actions/public/paquetes.actions.ts` - `solicitarPaquetePublico()`

**Flujo:**
1. Prospecto selecciona paquete en portal público
2. Se crea cotización con `status: 'en_cierre'`
3. Se crean `studio_cotizacion_items` desde `paquete.paquete_items`
4. Solo items con `item_id` válido se replican

**Código relevante:**
```typescript
const cotizacionItems = paquete.paquete_items
  .filter((item) => item.item_id) // Solo items con item_id válido
  .map((item, index) => ({
    cotizacion_id: nuevaCotizacion.id,
    item_id: item.item_id!,
    service_category_id: item.service_category_id,
    quantity: item.quantity,
    order: index,
  }));
```

---

## 3. ARQUITECTURA DE ITEMS CUSTOM

### 3.1 Estructura de `studio_cotizacion_items`

**Ubicación:** `prisma/schema.prisma` líneas 2260-2319

**Campos Clave:**
```prisma
model studio_cotizacion_items {
  id                         String                        @id @default(cuid())
  cotizacion_id              String
  item_id                    String?                       // ⚠️ OPCIONAL - Permite items sin catálogo
  service_category_id        String?                       // ⚠️ OPCIONAL
  quantity                   Int                           @default(1)
  
  // Campos operacionales (mutables)
  name                       String?                       // ✅ Nombre del item
  description                String?                       // ✅ Descripción
  unit_price                 Float                         @default(0)
  subtotal                   Float                         @default(0)
  cost                       Float?                        @default(0)
  expense                    Float?                        @default(0)
  profit                     Float?                        @default(0)
  public_price               Float?                        @default(0)
  profit_type                String?                       @default("servicio")
  category_name              String?
  seccion_name               String?
  
  // Flag para identificar items custom
  is_custom                  Boolean                       @default(false)  // ✅ EXISTE
  
  // Snapshots (inmutables, para auditoría)
  name_snapshot              String                        @default("Servicio migrado")
  // ... otros campos _snapshot
}
```

### 3.2 Capacidad Actual para Items Custom

**✅ SOPORTE EXISTENTE:**
- `item_id` es **opcional** (`String?`) → Permite items sin referencia al catálogo
- `is_custom` existe como campo booleano
- Campos `name`, `description`, `unit_price`, `cost`, etc. permiten datos manuales
- `service_category_id` es opcional

**⚠️ LIMITACIONES ACTUALES:**
- `createCotizacion()` solo acepta `items: { [itemId: string]: number }` → Solo items del catálogo
- `CotizacionForm` solo permite seleccionar del catálogo
- No hay UI para crear items custom "al vuelo"
- No se valida ni persiste `is_custom` en creación

---

## 4. LÓGICA DE CÁLCULO DINÁMICO

### 4.1 Uso de `calcularCantidadEfectiva`

**✅ YA IMPLEMENTADO EN:**
- `src/lib/actions/studio/commercial/promises/cotizacion-pricing.ts`
  - Función: `calcularYGuardarPreciosCotizacion()` (línea 117)
  - Función: `guardarEstructuraCotizacionAutorizada()` (línea 117)
- `src/lib/utils/paquetes-calc.ts` - `calcularPrecioPaquete()`

**❌ NO IMPLEMENTADO EN:**
- `CotizacionForm.tsx` - El cálculo de precios en tiempo real NO usa `calcularCantidadEfectiva`
- Solo calcula `precio_unitario * cantidad` sin considerar `billing_type` ni `event_duration`

**Código Actual en CotizacionForm:**
```typescript
// Línea ~300-400 (aproximada)
serviciosSeleccionados.forEach(s => {
  subtotal += (s.precioUnitario || 0) * s.cantidad; // ❌ No usa calcularCantidadEfectiva
  totalCosto += (s.costo || 0) * s.cantidad;
  totalGasto += (s.gasto || 0) * s.cantidad;
});
```

**Debería ser:**
```typescript
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';

// Obtener event_duration de promise o cotización
const durationHours = promise?.duration_hours ?? cotizacion?.event_duration ?? null;

serviciosSeleccionados.forEach(s => {
  const billingType = (s.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
  const cantidadEfectiva = calcularCantidadEfectiva(billingType, s.cantidad, durationHours);
  
  subtotal += (s.precioUnitario || 0) * cantidadEfectiva;
  totalCosto += (s.costo || 0) * cantidadEfectiva;
  totalGasto += (s.gasto || 0) * cantidadEfectiva;
});
```

---

## 5. PROPUESTA DE IMPLEMENTACIÓN

### 5.1 Cambios en UI (`CotizacionForm.tsx`)

#### 5.1.1 Agregar Botón "Nuevo Item Custom"

**Ubicación:** Junto al buscador de servicios (similar a como se hizo en paquetes)

**Componente:**
```typescript
<ZenButton
  type="button"
  variant="outline"
  size="md"
  onClick={handleCreateCustomItem}
  className="gap-2"
>
  <Plus className="w-4 h-4" />
  Nuevo Item Custom
</ZenButton>
```

#### 5.1.2 Modal para Crear Item Custom

**Componente Nuevo:** `CustomItemModal.tsx`

**Campos Requeridos:**
- Nombre (requerido)
- Descripción (opcional)
- Tipo de Utilidad: Servicio / Producto (requerido)
- Tipo de Facturación: HOUR / SERVICE / UNIT (requerido, solo si es Servicio)
- Costo (requerido, número)
- Gasto (opcional, número, default 0)
- Cantidad inicial (requerido, default 1)

**Validación:**
- Si Tipo de Utilidad = "Producto" → Tipo de Facturación = "UNIT" (automático)
- Costo >= 0
- Gasto >= 0
- Cantidad >= 1

#### 5.1.3 Estado para Items Custom

**Agregar al estado:**
```typescript
interface CustomItem {
  id: string; // ID temporal (ej: `custom-${Date.now()}`)
  name: string;
  description?: string;
  tipoUtilidad: 'servicio' | 'producto';
  billing_type: 'HOUR' | 'SERVICE' | 'UNIT';
  cost: number;
  gasto: number;
  quantity: number;
  isCustom: true;
}

const [customItems, setCustomItems] = useState<Map<string, CustomItem>>(new Map());
```

**Combinar con items del catálogo:**
```typescript
// Para cálculo de precios
const allItems = useMemo(() => {
  const catalogItems = Object.entries(items)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => ({
      id: itemId,
      quantity: qty,
      isCustom: false,
      ...servicioMap.get(itemId)
    }));
  
  const customItemsList = Array.from(customItems.values())
    .map(item => ({
      id: item.id,
      quantity: item.quantity,
      isCustom: true,
      ...item
    }));
  
  return [...catalogItems, ...customItemsList];
}, [items, customItems, servicioMap]);
```

#### 5.1.4 Visualización de Items Custom en Lista

**Modificar `CatalogoServiciosTree` o crear sección separada:**

**Opción A:** Agregar sección "Items Custom" al final del árbol
**Opción B:** Mostrar items custom mezclados con el catálogo (marcados con badge "Custom")

**Recomendación:** Opción A (sección separada) para claridad visual

**Badge Visual:**
```typescript
<ZenBadge variant="outline" className="border-purple-600 text-purple-400">
  Custom
</ZenBadge>
```

### 5.2 Cambios en Server Actions

#### 5.2.1 Actualizar Schema de Creación

**Archivo:** `src/lib/actions/schemas/cotizaciones-schemas.ts`

**Cambio:**
```typescript
export const createCotizacionSchema = z.object({
  studio_slug: z.string().min(1, 'Studio slug requerido'),
  promise_id: z.string().cuid().optional().nullable(),
  contact_id: z.string().cuid().optional().nullable(),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  precio: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  items: z.record(z.string(), z.number().int().min(1)), // Items del catálogo
  customItems: z.array(z.object({  // ✅ NUEVO
    name: z.string().min(1, 'Nombre requerido'),
    description: z.string().optional(),
    tipoUtilidad: z.enum(['servicio', 'producto']),
    billing_type: z.enum(['HOUR', 'SERVICE', 'UNIT']),
    cost: z.number().min(0),
    gasto: z.number().min(0).default(0),
    quantity: z.number().int().min(1),
  })).optional().default([]),
  visible_to_client: z.boolean().optional().default(false),
});
```

#### 5.2.2 Actualizar `createCotizacion()`

**Archivo:** `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts`

**Cambios:**
```typescript
export async function createCotizacion(
  data: CreateCotizacionData
): Promise<CotizacionResponse> {
  // ... código existente hasta crear cotización ...

  // Crear items del catálogo (existente)
  const itemsToCreate = Object.entries(validatedData.items)
    .filter(([, quantity]) => quantity > 0)
    .map(([itemId, quantity], index) => ({
      cotizacion_id: cotizacion.id,
      item_id: itemId,
      quantity,
      order: index,
      is_custom: false, // ✅ Explícito
    }));

  // ✅ NUEVO: Crear items custom
  const customItemsToCreate = (validatedData.customItems || []).map((customItem, index) => {
    // Calcular precio unitario usando calcularPrecio
    const tipoUtilidad = customItem.tipoUtilidad === 'servicio' ? 'servicio' : 'producto';
    const precios = calcularPrecio(
      customItem.cost,
      customItem.gasto,
      tipoUtilidad,
      configPrecios // Necesitamos obtener configPrecios aquí
    );

    return {
      cotizacion_id: cotizacion.id,
      item_id: null, // ✅ NULL para items custom
      service_category_id: null, // ✅ NULL para items custom
      quantity: customItem.quantity,
      order: itemsToCreate.length + index,
      is_custom: true, // ✅ Flag explícito
      name: customItem.name,
      description: customItem.description || null,
      cost: customItem.cost,
      expense: customItem.gasto,
      unit_price: precios.precio_final,
      profit: precios.utilidad_base,
      public_price: precios.precio_final,
      profit_type: tipoUtilidad,
      // Calcular subtotal usando calcularCantidadEfectiva
      subtotal: precios.precio_final * calcularCantidadEfectiva(
        customItem.billing_type,
        customItem.quantity,
        durationHours
      ),
    };
  });

  // Crear todos los items (catálogo + custom)
  const allItemsToCreate = [...itemsToCreate, ...customItemsToCreate];
  
  if (allItemsToCreate.length > 0) {
    await prisma.studio_cotizacion_items.createMany({
      data: allItemsToCreate,
    });

    // Calcular y guardar precios (ya maneja items custom si tienen datos)
    await calcularYGuardarPreciosCotizacion(cotizacion.id, validatedData.studio_slug);
  }

  // ... resto del código ...
}
```

#### 5.2.3 Actualizar `calcularYGuardarPreciosCotizacion()`

**Archivo:** `src/lib/actions/studio/commercial/promises/cotizacion-pricing.ts`

**Cambios necesarios:**
```typescript
// En el loop de items (línea ~87)
for (const item of items) {
  let datosCatalogo: DatosCatalogo | null = null;
  
  if (item.item_id) {
    // Item del catálogo - obtener datos del mapa
    datosCatalogo = catalogoMap.get(item.item_id);
  } else if (item.is_custom && item.name && item.cost !== null) {
    // ✅ Item custom - usar datos del item mismo
    datosCatalogo = {
      nombre: item.name,
      costo: item.cost || 0,
      gasto: item.expense || 0,
      tipoUtilidad: item.profit_type || 'servicio',
      seccion: item.seccion_name || 'Custom',
      categoria: item.category_name || 'Custom',
      billingType: // ⚠️ NECESITAMOS AGREGAR billing_type a studio_cotizacion_items
        // Por ahora, inferir desde otros campos o agregar campo
    };
  }
  
  if (!datosCatalogo) {
    console.warn(`[PRICING] Item ${item.id} sin datos válidos`);
    continue;
  }
  
  // ... resto del cálculo ...
}
```

**⚠️ PROBLEMA:** `studio_cotizacion_items` NO tiene campo `billing_type`

**Solución:** Agregar campo `billing_type` a `studio_cotizacion_items`:
```prisma
model studio_cotizacion_items {
  // ... campos existentes ...
  billing_type               BillingType?                  // ✅ NUEVO
}
```

### 5.3 Cambios en Base de Datos

#### 5.3.1 Migración SQL

**Archivo:** `supabase/migrations/YYYYMMDDHHMMSS_add_billing_type_to_cotizacion_items.sql`

```sql
-- Agregar billing_type a studio_cotizacion_items
ALTER TABLE public.studio_cotizacion_items
ADD COLUMN IF NOT EXISTS billing_type "BillingType";

-- Comentario
COMMENT ON COLUMN public.studio_cotizacion_items.billing_type IS 
'Tipo de facturación del ítem: HOUR (multiplica por duración), SERVICE (precio fijo), UNIT (precio por unidad). NULL para items legacy.';
```

#### 5.3.2 Actualizar Prisma Schema

```prisma
model studio_cotizacion_items {
  // ... campos existentes ...
  billing_type               BillingType?                  // ✅ NUEVO
  // ... resto de campos ...
}
```

### 5.4 Actualizar Cálculo en Tiempo Real (`CotizacionForm.tsx`)

**Importar utilidad:**
```typescript
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';
```

**Obtener duration_hours:**
```typescript
// En el useEffect de cálculo de precios
const [durationHours, setDurationHours] = useState<number | null>(null);

// Cargar desde promise o cotización
useEffect(() => {
  if (promiseId) {
    // Obtener promise.duration_hours
    // O usar cotizacion.event_duration si está en modo edición
  }
}, [promiseId, cotizacionId]);
```

**Actualizar cálculo:**
```typescript
// En el useMemo de cálculo de precios
serviciosSeleccionados.forEach(s => {
  const billingType = s.billing_type || 'SERVICE';
  const cantidadEfectiva = calcularCantidadEfectiva(
    billingType,
    s.cantidad,
    durationHours
  );
  
  subtotal += (s.precioUnitario || 0) * cantidadEfectiva;
  totalCosto += (s.costo || 0) * cantidadEfectiva;
  totalGasto += (s.gasto || 0) * cantidadEfectiva;
});
```

---

## 6. RESUMEN DE ARCHIVOS CLAVE

### 6.1 Componentes UI
- ✅ `src/app/[slug]/studio/commercial/promises/components/CotizacionForm.tsx` - Formulario principal
- ✅ `src/components/shared/catalogo/CatalogoServiciosTree.tsx` - Selector de servicios
- 🆕 `src/components/shared/cotizaciones/CustomItemModal.tsx` - Modal para crear item custom (CREAR)

### 6.2 Server Actions
- ✅ `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts` - `createCotizacion()`, `updateCotizacion()`
- ✅ `src/lib/actions/studio/commercial/promises/cotizacion-pricing.ts` - `calcularYGuardarPreciosCotizacion()`
- ✅ `src/lib/actions/schemas/cotizaciones-schemas.ts` - Schemas de validación

### 6.3 Utilidades
- ✅ `src/lib/utils/dynamic-billing-calc.ts` - `calcularCantidadEfectiva()` (YA EXISTE)

### 6.4 Base de Datos
- ✅ `prisma/schema.prisma` - Modelo `studio_cotizacion_items`
- 🆕 Migración SQL para agregar `billing_type` a `studio_cotizacion_items`

---

## 7. CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Base de Datos
- [ ] Crear migración SQL para agregar `billing_type` a `studio_cotizacion_items`
- [ ] Actualizar `prisma/schema.prisma`
- [ ] Ejecutar migración en Supabase
- [ ] Generar Prisma Client

### Fase 2: Schemas y Validación
- [ ] Actualizar `createCotizacionSchema` para incluir `customItems`
- [ ] Actualizar `updateCotizacionSchema` (si aplica)
- [ ] Crear schema para `CustomItem`

### Fase 3: UI - Modal de Item Custom
- [ ] Crear componente `CustomItemModal.tsx`
- [ ] Integrar botón "Nuevo Item Custom" en `CotizacionForm`
- [ ] Agregar estado `customItems` en `CotizacionForm`
- [ ] Crear sección visual para items custom en la lista

### Fase 4: Cálculo en Tiempo Real
- [ ] Importar `calcularCantidadEfectiva` en `CotizacionForm`
- [ ] Obtener `duration_hours` desde promise/cotización
- [ ] Actualizar cálculo de precios para usar `calcularCantidadEfectiva`
- [ ] Incluir items custom en el cálculo

### Fase 5: Server Actions
- [ ] Actualizar `createCotizacion()` para crear items custom
- [ ] Actualizar `updateCotizacion()` para manejar items custom
- [ ] Actualizar `calcularYGuardarPreciosCotizacion()` para items custom
- [ ] Asegurar que `billing_type` se persista correctamente

### Fase 6: Testing
- [ ] Probar creación de cotización con items custom
- [ ] Probar edición de cotización con items custom
- [ ] Probar cálculo dinámico con items HOUR
- [ ] Probar importación de paquete + items custom
- [ ] Verificar que items custom se muestran correctamente en resumen

---

## 8. NOTAS ADICIONALES

### 8.1 Compatibilidad con Items Legacy
- Items existentes sin `billing_type` deben tratarse como `SERVICE` (default)
- `calcularCantidadEfectiva()` ya maneja `null` como fallback

### 8.2 Items Custom en Edición
- Al editar cotización, items custom deben cargarse en `customItems`
- Permitir editar/eliminar items custom
- Mantener `item_id: null` para items custom

### 8.3 Visualización en Resumen
- Items custom deben mostrarse con badge "Custom"
- Mantener misma estructura visual que items del catálogo
- Mostrar `billing_type` badge si es servicio

---

**Fin del Documento**
