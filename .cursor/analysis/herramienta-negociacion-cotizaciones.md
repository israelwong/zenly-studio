# Herramienta de Negociación para Cotizaciones en Promises

## 📋 Contexto y Caso de Uso

### Problema Identificado
Un prospecto revisa condiciones comerciales con 10% de descuento y pregunta si puede negociar el precio o un descuento adicional. Aunque es un caso poco frecuente (primera vez en 10 años), puede ocurrir a otros estudios y requiere una herramienta que:

1. **Clarifique la utilidad** antes de tomar decisiones comerciales
2. **Permita crear condiciones especiales** específicas para esta promesa (no generales)
3. **Simule precios personalizados** mostrando impacto en utilidad
4. **Permita marcar items como cortesía** (contabiliza pero no se cobra)
5. **Genere versiones editables** de la cotización negociada

### Objetivo Final
Finalizar el proceso con una cotización personalizada que pueda ser editada o generada como versión, facilitando la presentación de ofertas especiales al prospecto.

---

## 🎯 Propuesta de Solución

### Arquitectura de Navegación

**Opción 1: Botón a nivel de cotización (RECOMENDADO)**
- Botón "Negociar" en cada card de cotización (`PromiseQuotesPanelCard`)
- Al hacer click, abre nueva ruta dedicada: `/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/negociacion`

**Opción 2: Icono a nivel de item**
- Icono de negociación en cada item dentro de la cotización
- Abre modal/sheet con herramientas de negociación para ese item específico

**Decisión:** Implementar **Opción 1** como solución principal, ya que permite negociar la cotización completa de manera holística.

---

## 🛠️ Funcionalidades Propuestas

### 1. Simulación de Condiciones Comerciales

**Descripción:** Aplicar condiciones comerciales existentes o crear nuevas específicas para esta promesa, mostrando impacto en utilidad.

**UI/UX:**
```
┌─────────────────────────────────────────┐
│ Condiciones Comerciales                  │
├─────────────────────────────────────────┤
│ [ ] Usar condición existente             │
│     ┌─────────────────────────────────┐ │
│     │ [Dropdown: Condiciones...]      │ │
│     └─────────────────────────────────┘ │
│                                          │
│ [✓] Crear condición especial            │
│     ┌─────────────────────────────────┐ │
│     │ Nombre: [Oferta Especial...]   │ │
│     │ Descuento: [15]%                │ │
│     │ Anticipo: [50]%                 │ │
│     │ Método pago: [Efectivo]         │ │
│     └─────────────────────────────────┘ │
│                                          │
│ ⚠️ Esta condición solo aplica a esta    │
│    promesa y no se guarda como general │
└─────────────────────────────────────────┘
```

**Funcionalidad:**
- Selector de condiciones comerciales existentes
- Opción para crear condición temporal (solo para esta promesa)
- Cálculo automático de impacto en precio final y utilidad
- Preview en tiempo real del precio con descuento aplicado

**Cálculos:**
```typescript
// Precio base de cotización
const precioBase = cotizacion.price;

// Aplicar descuento de condición comercial
const descuentoPorcentaje = condicionComercial.discount_percentage || 0;
const descuentoMonto = precioBase * (descuentoPorcentaje / 100);
const precioConDescuento = precioBase - descuentoMonto;

// Calcular utilidad impactada
const costoTotal = sum(cotizacion.items.map(i => i.cost * i.quantity));
const gastoTotal = sum(cotizacion.items.map(i => i.expense * i.quantity));
const utilidadOriginal = precioBase - (costoTotal + gastoTotal);
const utilidadConDescuento = precioConDescuento - (costoTotal + gastoTotal);
const impactoUtilidad = utilidadOriginal - utilidadConDescuento;
```

---

### 2. Simulación de Precio Personalizado

**Descripción:** Establecer un precio final personalizado y ver cómo afecta la utilidad.

**UI/UX:**
```
┌─────────────────────────────────────────┐
│ Precio Personalizado                    │
├─────────────────────────────────────────┤
│ Precio sugerido: $15,000.00 MXN        │
│                                          │
│ Precio negociado: [$14,500.00] MXN      │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Impacto en Utilidad                 │ │
│ │                                     │ │
│ │ Utilidad original:    $4,500.00    │ │
│ │ Utilidad negociada:   $4,000.00    │ │
│ │ Diferencia:           -$500.00      │ │
│ │                                     │ │
│ │ Margen original:      30.0%        │ │
│ │ Margen negociado:     27.6%        │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [✓] Aplicar precio personalizado        │
└─────────────────────────────────────────┘
```

**Funcionalidad:**
- Input numérico para precio personalizado
- Validación: precio no puede ser menor a costo + gasto
- Cálculo automático de utilidad y margen
- Indicadores visuales:
  - Verde: margen aceptable (>20%)
  - Amarillo: margen bajo (10-20%)
  - Rojo: margen crítico (<10%)

**Validaciones:**
```typescript
const costoTotal = sum(items.map(i => i.cost * i.quantity));
const gastoTotal = sum(items.map(i => i.expense * i.quantity));
const precioMinimo = costoTotal + gastoTotal;

if (precioPersonalizado < precioMinimo) {
  // Mostrar advertencia: precio por debajo de costos
}
```

---

### 3. Items como Cortesía

**Descripción:** Seleccionar items que se incluyen en la cotización pero no se cobran (contabiliza para costos pero precio = 0).

**UI/UX:**
```
┌─────────────────────────────────────────┐
│ Items de Cortesía                        │
├─────────────────────────────────────────┤
│ Selecciona items para incluir sin cargo │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ [✓] Album Digital (x1)             │ │
│ │     Precio: $2,500.00 → $0.00       │ │
│ │     Costo: $500.00 (se mantiene)    │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ [ ] Video Highlights (x1)           │ │
│ │     Precio: $3,000.00               │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Total cortesías: $2,500.00              │
│ Impacto utilidad: -$2,000.00            │
└─────────────────────────────────────────┘
```

**Funcionalidad:**
- Lista de items de la cotización con checkbox
- Al marcar como cortesía:
  - `unit_price` → 0
  - `subtotal` → 0
  - `cost` y `expense` se mantienen (para contabilidad)
- Badge visual indicando "Cortesía" en items seleccionados
- Cálculo de impacto total en utilidad

**Lógica:**
```typescript
// Al marcar item como cortesía
item.unit_price = 0;
item.subtotal = 0;
item.is_courtesy = true; // Nuevo campo

// Recalcular precio total
const precioTotal = sum(
  items.map(i => i.is_courtesy ? 0 : i.subtotal)
);

// Recalcular utilidad
const utilidad = precioTotal - (costoTotal + gastoTotal);
```

---

### 4. Vista Comparativa Antes/Después

**Descripción:** Mostrar comparación lado a lado entre cotización original y negociada.

**UI/UX:**
```
┌─────────────────────────────────────────────────────────┐
│ Comparación: Original vs Negociada                      │
├──────────────────────┬──────────────────────────────────┤
│ ORIGINAL              │ NEGOCIADA                        │
├──────────────────────┼──────────────────────────────────┤
│ Precio: $15,000.00    │ Precio: $14,500.00              │
│ Descuento: $0.00      │ Descuento: $500.00 (3.3%)       │
│                       │                                  │
│ Costos: $10,000.00    │ Costos: $10,000.00              │
│ Gastos: $500.00       │ Gastos: $500.00                 │
│                       │                                  │
│ Utilidad: $4,500.00   │ Utilidad: $4,000.00             │
│ Margen: 30.0%         │ Margen: 27.6%                   │
│                       │                                  │
│ Items: 8              │ Items: 8 (1 cortesía)           │
└──────────────────────┴──────────────────────────────────┘
```

---

### 5. Generación de Versión Negociada

**Descripción:** Crear una nueva versión de la cotización con los cambios aplicados.

**Opciones:**

**A) Editar cotización existente**
- Aplicar cambios directamente a la cotización actual
- Mantener historial mediante snapshots

**B) Crear nueva versión (RECOMENDADO)**
- Generar nueva cotización basada en la original
- Relación: `revision_of_id` apunta a la original
- Estado: `pending_revision` o `negociada`
- Permite comparar versiones fácilmente

**UI/UX:**
```
┌─────────────────────────────────────────┐
│ Finalizar Negociación                    │
├─────────────────────────────────────────┤
│ [✓] Crear nueva versión negociada        │
│     Nombre: [Cotización Básica - Oferta│
│            Especial]                     │
│                                          │
│ [ ] Aplicar cambios a cotización actual │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Resumen de cambios:                 │ │
│ │ • Descuento: 3.3%                   │ │
│ │ • Precio personalizado: $14,500.00   │ │
│ │ • 1 item como cortesía               │ │
│ │ • Utilidad impactada: -$500.00      │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [Guardar y Compartir] [Cancelar]        │
└─────────────────────────────────────────┘
```

---

## 🎨 Diseño UI/UX Detallado

### Estructura de la Página de Negociación

```
┌─────────────────────────────────────────────────────────────┐
│ ← Volver a Promesa    Cotización: [Nombre]                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 📊 Vista Comparativa                                    │ │
│ │ [Original] [Negociada]                                  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────┐ ┌─────────────────────────────────┐ │
│ │ 💰 Precio            │ │ 🎁 Condiciones Comerciales     │ │
│ │                      │ │                                │ │
│ │ Precio base: ...    │ │ [Selector condiciones...]      │ │
│ │ Precio negociado:   │ │                                │ │
│ │ [Input]             │ │ [Crear condición especial]     │ │
│ │                      │ │                                │ │
│ │ Utilidad: ...      │ │ Descuento: [Input]%            │ │
│ │ Margen: ...         │ │ Anticipo: [Input]%             │ │
│ └──────────────────────┘ └─────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🎁 Items de Cortesía                                    │ │
│ │                                                          │ │
│ │ [Lista de items con checkboxes]                        │ │
│ │                                                          │ │
│ │ Total cortesías: $X,XXX.XX                             │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Impacto en Utilidad                                  │ │
│ │                                                          │ │
│ │ Utilidad original:    $X,XXX.XX                        │ │
│ │ Utilidad negociada:    $X,XXX.XX                       │ │
│ │ Diferencia:            -$XXX.XX                         │ │
│ │                                                          │ │
│ │ Margen original:       XX.X%                           │
│ │ Margen negociado:      XX.X%                           │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│                    [Guardar Versión] [Cancelar]            │
└─────────────────────────────────────────────────────────────┘
```

### Componentes ZEN a Utilizar

- `ZenCard`, `ZenCardHeader`, `ZenCardContent` - Contenedores principales
- `ZenInput` - Inputs numéricos para precios y porcentajes
- `ZenButton` - Botones de acción
- `ZenBadge` - Indicadores de estado (cortesía, margen)
- `ZenDropdownMenu` - Selector de condiciones comerciales
- `ZenDialog` - Modales de confirmación
- `ZenCheckbox` - Selección de items como cortesía

---

## 📊 Modelo de Datos

### Nuevos Campos Propuestos

**Tabla: `studio_cotizaciones`**
```prisma
// Campos existentes se mantienen
// Nuevos campos para negociación:
negociacion_precio_personalizado Decimal? // Precio negociado manualmente
negociacion_descuento_adicional Decimal? // Descuento adicional aplicado
negociacion_condicion_especial_id String? // ID de condición especial temporal
negociacion_notas Text? // Notas sobre la negociación
```

**Tabla: `studio_cotizacion_items`**
```prisma
// Nuevo campo:
is_courtesy Boolean @default(false) // Si el item es cortesía (no se cobra)
```

**Tabla: `studio_condiciones_comerciales` (nueva tabla temporal)**
```prisma
model studio_condiciones_comerciales_negociacion {
  id String @id @default(cuid())
  cotizacion_id String
  promise_id String
  name String // Nombre de la condición especial
  discount_percentage Decimal?
  advance_percentage Decimal?
  advance_type String?
  advance_amount Decimal?
  metodo_pago_id String?
  is_temporary Boolean @default(true) // Solo para esta promesa
  created_at DateTime @default(now())
  
  @@unique([cotizacion_id])
  @@index([promise_id])
}
```

---

## 🔄 Flujo de Trabajo

### 1. Acceso a Negociación
```
Usuario en PromiseQuotesPanelCard
  → Click en botón "Negociar"
  → Navega a /promises/[promiseId]/cotizacion/[cotizacionId]/negociacion
  → Carga cotización original con todos sus items
```

### 2. Aplicar Cambios
```
Usuario modifica:
  → Condiciones comerciales (existente o nueva)
  → Precio personalizado
  → Items como cortesía
  
Sistema calcula en tiempo real:
  → Precio final
  → Utilidad impactada
  → Margen de ganancia
```

### 3. Vista Previa
```
Usuario revisa:
  → Comparación antes/después
  → Impacto en utilidad
  → Validaciones (margen mínimo, etc.)
```

### 4. Finalizar
```
Usuario selecciona:
  → Crear nueva versión negociada
  → O aplicar cambios a cotización actual
  
Sistema:
  → Crea nueva cotización con cambios aplicados
  → Guarda relación con original (revision_of_id)
  → Establece estado apropiado
  → Recalcula precios y utilidades
```

---

## ✅ Funcionalidades Implementadas vs Propuestas

### ✅ Implementadas (Existentes)
- Sistema de cotizaciones con items
- Cálculo de precios basado en costos y utilidad
- Condiciones comerciales generales
- Sistema de revisiones de cotizaciones
- Cálculo de utilidad y márgenes

### 🆕 Propuestas (Nuevas)
- [ ] Botón "Negociar" en `PromiseQuotesPanelCard`
- [ ] Ruta dedicada `/negociacion`
- [ ] Simulador de condiciones comerciales específicas
- [ ] Simulador de precio personalizado con impacto en utilidad
- [ ] Selector de items como cortesía
- [ ] Vista comparativa antes/después
- [ ] Generación de versión negociada
- [ ] Validaciones de margen mínimo
- [ ] Indicadores visuales de impacto

---

## 🎯 Consideraciones Técnicas

### Cálculos de Utilidad
- Usar función existente `calcularPrecio()` para mantener consistencia
- Recalcular utilidad cuando se aplican descuentos o cortesías
- Validar que precio final no sea menor a costo + gasto

### Persistencia
- Las condiciones comerciales temporales se guardan en tabla dedicada
- Los items marcados como cortesía se guardan con `is_courtesy = true`
- La nueva versión negociada se crea como revisión de la original

### Validaciones
- Precio personalizado >= costo total + gasto total
- Descuento adicional no puede hacer precio negativo
- Al menos un item debe tener precio > 0 (no todos pueden ser cortesía)

### Performance
- Cálculos en tiempo real usando `useMemo` para evitar recálculos innecesarios
- Debounce en inputs numéricos para evitar cálculos excesivos
- Carga lazy de datos de condiciones comerciales

---

## 📝 Próximos Pasos

1. **Fase 1: UI Base**
   - Crear ruta `/negociacion`
   - Implementar layout básico con secciones
   - Integrar componentes ZEN

2. **Fase 2: Simuladores**
   - Implementar simulador de condiciones comerciales
   - Implementar simulador de precio personalizado
   - Agregar cálculos en tiempo real

3. **Fase 3: Items Cortesía**
   - Agregar campo `is_courtesy` a items
   - Implementar selector de items
   - Recalcular precios con cortesías

4. **Fase 4: Generación de Versión**
   - Implementar creación de versión negociada
   - Guardar relación con original
   - Aplicar cambios a nueva cotización

5. **Fase 5: Validaciones y UX**
   - Agregar validaciones de margen mínimo
   - Mejorar indicadores visuales
   - Agregar tooltips y ayuda contextual

---

## 🎨 Mockups de Referencia

### Botón "Negociar" en Card
```
┌─────────────────────────────────────┐
│ Cotización Básica          $15,000 │
│ [Pendiente]                         │
│                                     │
│ [👁️] [⋮] [Negociar] ← Nuevo botón  │
└─────────────────────────────────────┘
```

### Indicadores de Impacto
```
Margen: 27.6% 🟢 (Aceptable)
Margen: 15.2% 🟡 (Bajo)
Margen: 8.5%  🔴 (Crítico)
```

---

## 📚 Referencias

- Sistema de cálculo de precios: `src/lib/actions/studio/catalogo/calcular-precio.ts`
- Condiciones comerciales: `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts`
- Estructura de cotizaciones: `src/app/[slug]/studio/commercial/promises/[promiseId]/components/cotizaciones/`

---

**Documento creado:** 2025-01-09
**Última actualización:** 2025-01-09
