# Análisis: Visibilidad Pública/Privada de Condiciones Comerciales

## 📋 Resumen Ejecutivo

**Funcionalidad propuesta:** Agregar campo de visibilidad (pública/privada) a las condiciones comerciales para controlar dónde pueden ser asociadas y vistas.

- **Públicas:** Pueden asociarse a ofertas y ser visibles en promesas compartidas
- **Privadas:** Solo pueden asociarse a promesas cuando se comparten cotizaciones (NO en ofertas)

**Estado:** Análisis de impacto - Pendiente de implementación

---

## 🎯 Objetivo

Permitir que los estudios fotográficos tengan condiciones comerciales privadas que solo se muestren en el contexto de promesas compartidas, pero no en ofertas públicas. Esto permite mayor control sobre qué condiciones comerciales se exponen en diferentes contextos.

---

## 📊 Impacto en Base de Datos

### Cambio Requerido

**Tabla:** `studio_condiciones_comerciales`

**Nuevo campo:**
```prisma
is_public Boolean @default(true)
```

**Comentario:** 
- `true` = Pública: puede usarse en ofertas y promesas compartidas
- `false` = Privada: solo puede usarse en promesas compartidas (cotizaciones), NO en ofertas

### Migración

```sql
ALTER TABLE "studio_condiciones_comerciales" 
ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN "studio_condiciones_comerciales"."is_public" IS 
'Si true, puede asociarse a ofertas y promesas. Si false, solo promesas compartidas (NO ofertas)';

CREATE INDEX "studio_condiciones_comerciales_studio_id_is_public_idx" 
ON "studio_condiciones_comerciales"("studio_id", "is_public");
```

**Valor por defecto:** `true` (mantiene compatibilidad con datos existentes)

---

## 🔧 Cambios en Código

### 1. Schema Prisma (`prisma/schema.prisma`)

**Ubicación:** Línea ~2078

```prisma
model studio_condiciones_comerciales {
  // ... campos existentes
  is_public Boolean @default(true)  // NUEVO
  
  @@index([studio_id, is_public])  // NUEVO índice
}
```

### 2. Schemas de Validación (`src/lib/actions/schemas/condiciones-comerciales-schemas.ts`)

**Cambios:**
- Agregar `is_public` al `CondicionComercialSchema`
- Valor por defecto: `true`

```typescript
export const CondicionComercialSchema = z.object({
  // ... campos existentes
  is_public: z.boolean().default(true),  // NUEVO
});
```

### 3. Server Actions (`src/lib/actions/studio/config/condiciones-comerciales.actions.ts`)

#### 3.1 `obtenerTodasCondicionesComerciales`
**No requiere cambios** - Retorna todas las condiciones para gestión

#### 3.2 `obtenerCondicionesComerciales` (activas)
**No requiere cambios** - Ya filtra por `status: 'active'`

#### 3.3 Nuevas funciones de filtrado

**Crear función específica para ofertas:**
```typescript
export async function obtenerCondicionesComercialesParaOfertas(studioSlug: string) {
  // Solo condiciones públicas y activas
  const condiciones = await prisma.studio_condiciones_comerciales.findMany({
    where: {
      studio_id: studio.id,
      status: 'active',
      is_public: true,  // NUEVO filtro
    },
    // ... resto igual
  });
}
```

**Crear función para promesas (públicas + privadas):**
```typescript
export async function obtenerCondicionesComercialesParaPromesas(studioSlug: string) {
  // Públicas Y privadas (todas)
  const condiciones = await prisma.studio_condiciones_comerciales.findMany({
    where: {
      studio_id: studio.id,
      status: 'active',
      // Sin filtro de is_public - incluye todas
    },
  });
}
```

### 4. Componentes UI

#### 4.1 `CondicionesComercialesManager` 
**Archivo:** `src/components/shared/condiciones-comerciales/CondicionesComercialesManager.tsx`

**Cambios:**
- Agregar toggle/switch `is_public` en el formulario de crear/editar
- Mostrar badge o indicador visual de condición pública/privada en la lista
- Tooltip explicativo sobre qué significa cada opción

**Ubicación del cambio:** 
- Formulario de creación/edición (línea ~400-600)
- Lista de condiciones (línea ~200-400)

#### 4.2 `InfoEditor` (Ofertas)
**Archivo:** `src/app/[slug]/studio/commercial/ofertas/components/editors/InfoEditor.tsx`

**Cambios:**
- **CRÍTICO:** Filtrar condiciones comerciales para mostrar solo las públicas
- Cambiar `obtenerTodasCondicionesComerciales` por `obtenerCondicionesComercialesParaOfertas`
- Validar que no se pueda seleccionar condición privada

**Ubicación:** Línea ~766 (función `loadBusinessTerms`)

```typescript
// ANTES
const result = await obtenerTodasCondicionesComerciales(studioSlug);

// DESPUÉS
const result = await obtenerCondicionesComercialesParaOfertas(studioSlug);
```

#### 4.3 Selectores de Condiciones en Promesas

**Archivos afectados:**
- `src/app/[slug]/studio/commercial/promises/[promiseId]/components/condiciones-comerciales/CondicionComercialSelectorModal.tsx`
- `src/app/[slug]/studio/commercial/promises/[promiseId]/components/condiciones-comerciales/CondicionesComercialeSelectorSimpleModal.tsx`
- `src/app/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/negociacion/components/SelectorCondicionesComerciales.tsx`

**Cambios:**
- **NO cambiar** - Estos selectores deben mostrar TODAS las condiciones (públicas + privadas)
- Ya usan `obtenerTodasCondicionesComerciales` que está bien

#### 4.4 `PromiseShareOptionsModal`
**Archivo:** `src/app/[slug]/studio/commercial/promises/[promiseId]/components/PromiseShareOptionsModal.tsx`

**Cambios:**
- **NO requiere cambios** - El modal ya maneja `show_standard_conditions` y `show_offer_conditions`
- Las condiciones privadas se mostrarán automáticamente si están asociadas a la cotización
- El filtrado se hace en el backend (`getPublicPromiseActiveQuote`)

**Ubicación mencionada por usuario:** Línea ~225-300 (sección "Mostrar información en cotización y paquetes")

### 5. Filtrado en Vistas Públicas

#### 5.1 `getPublicPromiseActiveQuote`
**Archivo:** `src/lib/actions/public/promesas.actions.ts`

**Ubicación:** Línea ~1670-1682

**Cambios:**
- **NO requiere cambios** - Ya filtra por `type` (standard/offer) según `shareSettings`
- Las condiciones privadas se incluyen automáticamente si están asociadas a la cotización
- El filtrado actual es suficiente

**Lógica actual:**
```typescript
condicionesFiltradas = condicionesFiltradas.filter((condicion) => {
  const tipo = condicion.type || 'standard';
  if (tipo === 'standard') {
    return shareSettings.show_standard_conditions;
  } else if (tipo === 'offer') {
    return shareSettings.show_offer_conditions;
  }
  return false;
});
```

**Nota:** Las condiciones privadas asociadas a cotizaciones se muestran independientemente de este filtro, lo cual es correcto.

### 6. Validaciones

#### 6.1 Validación al asociar condición a oferta
**Archivo:** `src/lib/actions/studio/offers/offers.actions.ts`

**Ubicación:** Línea ~161, ~466

**Cambios:**
- Agregar validación para rechazar condiciones privadas en ofertas
- Retornar error claro si se intenta asociar condición privada

```typescript
// Al validar business_term_id en ofertas
if (data.business_term_id) {
  const businessTerm = await prisma.studio_condiciones_comerciales.findFirst({
    where: {
      id: data.business_term_id,
      studio_id: studio.id,
    },
  });
  
  if (!businessTerm) {
    throw new Error("Condición comercial no encontrada");
  }
  
  // NUEVA VALIDACIÓN
  if (!businessTerm.is_public) {
    throw new Error("No se pueden asociar condiciones comerciales privadas a ofertas");
  }
}
```

---

## 📁 Archivos Afectados

### Base de Datos
- [ ] `prisma/schema.prisma` - Agregar campo `is_public`
- [ ] Nueva migración SQL

### Schemas
- [ ] `src/lib/actions/schemas/condiciones-comerciales-schemas.ts` - Agregar `is_public` al schema

### Server Actions
- [ ] `src/lib/actions/studio/config/condiciones-comerciales.actions.ts` - Nueva función para ofertas
- [ ] `src/lib/actions/studio/offers/offers.actions.ts` - Validación al crear/actualizar ofertas

### Componentes UI
- [ ] `src/components/shared/condiciones-comerciales/CondicionesComercialesManager.tsx` - Toggle is_public
- [ ] `src/app/[slug]/studio/commercial/ofertas/components/editors/InfoEditor.tsx` - Filtrar solo públicas

### Tipos TypeScript
- [ ] Interfaces que usan `CondicionComercial` - Agregar `is_public?: boolean`

---

## ⚠️ Consideraciones

### Compatibilidad hacia atrás
- ✅ Valor por defecto `true` mantiene todas las condiciones existentes como públicas
- ✅ No rompe funcionalidad existente
- ✅ Migración segura sin pérdida de datos

### Validaciones necesarias
1. **Al crear/editar oferta:** Rechazar si se intenta asociar condición privada
2. **Al cambiar visibilidad:** Si una condición privada está asociada a una oferta, mostrar advertencia
3. **En UI de ofertas:** No mostrar opción de seleccionar condiciones privadas

### UX Considerations
- Mostrar badge/indicador visual claro de condición pública/privada
- Tooltip explicativo sobre qué significa cada opción
- Advertencia al cambiar de pública a privada si está asociada a ofertas

---

## 📈 Estimación de Complejidad

### Tiempo estimado: 4-6 horas

**Desglose:**
- Migración DB + Schema: 30 min
- Server Actions: 1 hora
- Componente Manager (UI): 1.5 horas
- InfoEditor (filtrado): 30 min
- Validaciones: 1 hora
- Testing: 1 hora

### Riesgo: **BAJO**
- Cambio aislado y bien definido
- Valor por defecto mantiene compatibilidad
- No afecta lógica de promesas existente

---

## 🚀 Recomendación

**Implementar ahora** - La funcionalidad es:
- ✅ Bien definida
- ✅ Bajo riesgo
- ✅ Alto valor (control granular de visibilidad)
- ✅ No rompe funcionalidad existente

**Alternativa:** Si hay prioridades más altas, puede programarse para siguiente sprint sin impacto negativo.

---

## 📝 Notas Adicionales

### Relación con `type` (standard/offer)
- `type` controla si es condición estándar o de oferta
- `is_public` controla si puede usarse en ofertas públicas
- Son conceptos complementarios pero diferentes:
  - Una condición puede ser `type: 'offer'` pero `is_public: false` (oferta privada)
  - Una condición puede ser `type: 'standard'` pero `is_public: false` (estándar privada)

### Casos de uso
1. **Condición pública estándar:** Visible en ofertas y promesas
2. **Condición privada estándar:** Solo en promesas compartidas
3. **Condición pública de oferta:** Visible en ofertas específicas y promesas
4. **Condición privada de oferta:** Solo en promesas compartidas (caso raro pero posible)

---

**Fecha de análisis:** 2026-01-24  
**Analista:** AI Assistant  
**Estado:** Pendiente de aprobación
