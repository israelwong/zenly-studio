# 📋 Arquitectura: Renderizado Unificado de Contratos

**Última actualización**: 2026-01-29  
**Estado**: Implementado y Validado  
**Principio**: "Fidelidad Total" - Lo que el cliente autoriza es exactamente lo que firma.

---

## 0. Flujo de generación y regeneración del contrato

El contrato se **genera** o **regenera** en varios momentos del ciclo de vida del cierre. En todos los casos se usan las mismas funciones de datos y renderizado.

### Flujo de datos (backend)

```
getPromiseContractData(studioSlug, promiseId, cotizacionId, condicionComercial?)
  → Enriquecimiento (billing_type, cantidadEfectiva, snapshots)
  → EventContractData

renderContractContent(templateContent, contractData, condicionesData)
  → HTML del contrato
```

- **getPromiseContractData**: obtiene promesa, cotización, items con snapshots, condiciones comerciales, datos bancarios; enriquece con `billing_type` y cantidades; retorna estructura lista para render.
- **renderContractContent**: recibe HTML de la plantilla y datos; sustituye placeholders; retorna HTML final.

### Quién llama a qué

| Origen | Acción | Función principal | Incrementa versión |
|--------|--------|-------------------|---------------------|
| **Pasar a cierre / guardar contrato (Studio)** | Primera generación o actualización | Lógica en `cotizaciones-cierre.actions.ts` (actualizarContratoCierre, etc.) | Sí |
| **Prospecto edita datos (modal público)** | Regenerar con datos nuevos | `regeneratePublicContract` (`src/lib/actions/public/cotizaciones.actions.ts`) | Sí |
| **Studio: botón Regenerar** | Regenerar desde cierre | `regenerateStudioContract` (`cotizaciones-cierre.actions.ts`) | Sí |
| **Firma (público)** | Solo persiste firma | `signPublicContract` (`src/lib/actions/public/contracts.actions.ts`) | No |

### Versión del contrato

- **Tabla**: `studio_cotizaciones_cierre.contract_version` (entero, default 1).
- **Historial**: `studio_cotizaciones_cierre_contract_versions` (version, content, change_type, change_reason).
- **change_type**: `AUTO_REGENERATE` (prospecto actualizó datos), `STUDIO_REGENERATE` / `MANUAL_EDIT` (estudio).
- Cuando el prospecto actualiza datos y hay contrato no firmado, `regeneratePublicContract` incrementa `contract_version`, guarda snapshot de la versión anterior y crea entrada con `change_reason: "Regeneración automática por actualización de datos del cliente"`.

---

## 1. El Traductor Universal (`contract-item-formatter.ts`)

Para evitar que la web y el PDF hablen idiomas distintos, toda la lógica de descripción de ítems se ha centralizado en `src/lib/utils/contract-item-formatter.ts`.

### 🛠️ Reglas de Identidad (Matriz de Formato)

El renderizado se basa estrictamente en el `billing_type` del catálogo:

| Tipo de Cobro | Formato Visual | Ejemplo | Lógica |
|---------------|----------------|---------|--------|
| **HOUR** | `x[N] /hrs` | `x8 /hrs` | Siempre muestra la cantidad efectiva (Base × Horas). |
| **SERVICE** | `x[N]` | `x1`, `x2` | Siempre muestra la cantidad (incluyendo x1) para máxima claridad legal. |
| **UNIT** | `x[N]` | `x1`, `x10` | Siempre muestra la cantidad para control de inventario. |

### 📐 Principio de Inventario Completo

**Filosofía**: En la industria de eventos, el cliente no solo compra "un servicio", está comprando un inventario de promesas. Cuando el cliente ve el `x1` explícito, psicológicamente siente que el contrato ha sido auditado y que cada línea tiene una cantidad asignada, eliminando cualquier espacio para la interpretación o el "yo pensé que incluía más".

**Implementación**: Todas las cantidades se muestran explícitamente, incluso si es `x1`. Esto convierte el contrato en una lista de verificación perfecta donde el ojo del cliente no se detiene en líneas vacías preguntando "¿Y aquí cuántos son?".

### 🔧 Función Central: `formatItemQuantity()`

```typescript
export function formatItemQuantity({
  quantity,
  billingType,
  eventDurationHours = null,
  cantidadEfectiva,
}: FormatItemQuantityInput): FormatItemQuantityOutput
```

**Parámetros**:
- `quantity`: Cantidad base del item
- `billingType`: Tipo de facturación (`'HOUR' | 'SERVICE' | 'UNIT'`)
- `eventDurationHours`: Horas del evento (requerido para HOUR)
- `cantidadEfectiva`: Cantidad efectiva pre-calculada (opcional)

**Retorno**:
- `displayText`: Texto formateado para mostrar (ej: `"x8 /hrs"` o `"x1"`)
- `quantityBase`: Cantidad base
- `quantityEffective`: Cantidad efectiva calculada
- `hasHours`: Si tiene horas asociadas
- `hours`: Horas de duración (si aplica)

---

## 2. El Ducto de Datos (Backend Enrichment)

El motor de renderizado (`renderer.actions.ts`) ha sido blindado para asegurar que los metadatos lleguen al PDF.

### 🔄 Enriquecimiento de Datos

Las funciones `getPromiseContractData()` y `getEventContractData()` ahora realizan un "Join" lógico con el catálogo para inyectar el `billing_type` y la `cantidadEfectiva` antes de pasar los datos al generador de HTML.

**Proceso**:
1. Construye `billingTypeMap` desde `cotizacion_items[].billing_type` (snapshot)
2. Si falta información, consulta el catálogo completo como fallback
3. Calcula `cantidadEfectiva` para items tipo HOUR usando `calcularCantidadEfectiva()`
4. Inyecta `billing_type`, `cantidad` (base) y `cantidadEfectiva` en cada servicio

**Archivo**: `src/lib/actions/studio/business/contracts/renderer.actions.ts`

### 🛡️ Resiliencia (Fallback)

Si por alguna razón un ítem no tiene un tipo definido, el sistema asume `'SERVICE'` por defecto, evitando que el renderizado falle o quede vacío.

```typescript
const billingType = itemId ? (billingTypeMap.get(itemId) || 'SERVICE') : 'SERVICE';
```

---

## 3. Puntos de Congruencia (Efecto Espejo)

La misma función de formateo (`formatItemQuantity`) es consumida por tres frentes distintos:

### 3.1 Generación de PDF (Backend)

**Archivo**: `src/lib/actions/studio/business/contracts/renderer.actions.ts`  
**Función**: `renderServiciosBlock()`

El backend procesa el HTML final para el documento legal usando la misma lógica unificada.

### 3.2 Preview en Studio (Admin)

**Archivo**: `src/app/[slug]/studio/config/contratos/components/utils/contract-renderer.ts`  
**Función**: `renderCotizacionBlock()`

Los administradores ven la misma tabla que verá el cliente, asegurando WYSIWYG (What You See Is What You Get).

### 3.3 Portal del Cliente

**Archivo**: `src/components/shared/contracts/ContractPreview.tsx`  
**Hook**: `useContractRenderer()`

El cliente consulta su contrato firmado con la misma nomenclatura que vio en el preview y que aparece en el PDF.

---

## 4. Persistencia Legal (Snapshots)

El renderizado de contratos **no vuelve a calcular** precios ni cantidades dinámicas.

### 🔒 Principio de Inmutabilidad

El contrato se alimenta de los **Snapshots** creados en el momento de la autorización de la cotización:

- `name_snapshot`: Nombre del servicio al momento de autorización
- `description_snapshot`: Descripción al momento de autorización
- `unit_price_snapshot`: Precio unitario al momento de autorización
- `billing_type`: Tipo de facturación (persistido en `cotizacion_items`)
- `category_name_snapshot`: Nombre de categoría al momento de autorización

### ✅ Garantía de Fidelidad

Esto garantiza que si el precio de un servicio cambia en el catálogo meses después, el contrato firmado permanezca inalterado y fiel al acuerdo original.

**Regla de Oro**: El contrato es un snapshot inmutable del acuerdo en el momento de la autorización.

---

## 5. Tipos y Estructuras

### 5.1 `ContractService` (Actualizado)

**Archivo**: `src/types/contracts.ts`

```typescript
export interface ContractService {
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad?: number; // Cantidad base (para SERVICE/UNIT) o cantidad efectiva (para HOUR)
  horas?: number; // Horas de duración para servicios tipo HOUR
  billing_type?: 'HOUR' | 'SERVICE' | 'UNIT'; // Tipo de facturación del catálogo
  cantidadEfectiva?: number; // Cantidad efectiva calculada (para HOUR: cantidad * horas)
}
```

**Nota**: Todos los campos adicionales son opcionales para mantener compatibilidad hacia atrás.

### 5.2 `CotizacionRenderData`

**Archivo**: `src/app/[slug]/studio/config/contratos/components/types.ts`

```typescript
export interface CotizacionRenderData {
  secciones: Array<{
    nombre: string;
    orden: number;
    categorias: Array<{
      nombre: string;
      orden: number;
      items: Array<{
        nombre: string;
        descripcion?: string;
        cantidad: number; // Cantidad base para display
        cantidadEfectiva?: number; // Cantidad efectiva calculada
        subtotal: number;
        horas?: number; // Horas de duración para servicios tipo HOUR
        billing_type?: 'HOUR' | 'SERVICE' | 'UNIT'; // Tipo de facturación
      }>;
    }>;
  }>;
  total: number;
}
```

---

## 6. Flujo Completo de Renderizado

### 6.1 Preparación de Datos (Backend)

```
1. getPromiseContractData() / getEventContractData()
   ↓
2. Construye billingTypeMap desde snapshots
   ↓
3. Si falta información, consulta catálogo (fallback)
   ↓
4. Calcula cantidadEfectiva para items tipo HOUR
   ↓
5. Inyecta billing_type, cantidad, cantidadEfectiva en servicios
   ↓
6. Retorna EventContractData con servicios enriquecidos
```

### 6.2 Renderizado (Frontend/Backend)

```
1. renderServiciosBlock() / renderCotizacionBlock()
   ↓
2. Itera sobre servicios
   ↓
3. Para cada servicio, llama formatItemQuantity()
   ↓
4. formatItemQuantity() decide el formato según billing_type
   ↓
5. Genera HTML con displayText unificado
   ↓
6. Retorna HTML listo para PDF/Preview/Portal
```

---

## 7. Casos de Uso y Ejemplos

### 7.1 Item HOUR con 8 horas de evento

**Input**:
```typescript
{
  quantity: 1,
  billingType: 'HOUR',
  eventDurationHours: 8
}
```

**Output**:
```typescript
{
  displayText: 'x8 /hrs',
  quantityBase: 1,
  quantityEffective: 8,
  hasHours: true,
  hours: 8
}
```

**Renderizado**: `Fotógrafo x8 /hrs`

---

### 7.2 Item SERVICE con cantidad 1

**Input**:
```typescript
{
  quantity: 1,
  billingType: 'SERVICE'
}
```

**Output**:
```typescript
{
  displayText: 'x1',
  quantityBase: 1,
  quantityEffective: 1,
  hasHours: false
}
```

**Renderizado**: `Álbum de lujo x1`

**Nota**: Se muestra `x1` explícitamente para inventario completo.

---

### 7.3 Item UNIT con cantidad 10

**Input**:
```typescript
{
  quantity: 10,
  billingType: 'UNIT'
}
```

**Output**:
```typescript
{
  displayText: 'x10',
  quantityBase: 10,
  quantityEffective: 10,
  hasHours: false
}
```

**Renderizado**: `Fotografías impresas x10`

---

## 8. Beneficios de la Arquitectura Unificada

### ✅ Consistencia Total
- Mismo formato en PDF, Preview y Portal
- Eliminación de discrepancias visuales

### ✅ Mantenibilidad
- Lógica centralizada en una sola función
- Cambios futuros se propagan automáticamente

### ✅ Claridad Legal
- Inventario completo con cantidades explícitas
- Eliminación de ambigüedades

### ✅ Resiliencia
- Fallback seguro a 'SERVICE' si falta información
- Sistema nunca falla por datos incompletos

### ✅ Fidelidad
- Snapshots inmutables garantizan que el contrato refleje el acuerdo original
- Precios y cantidades no cambian después de la autorización

---

## 9. Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/lib/utils/contract-item-formatter.ts` | Función unificada de formateo |
| `src/lib/actions/studio/business/contracts/renderer.actions.ts` | Preparación de datos y renderizado backend |
| `src/app/[slug]/studio/config/contratos/components/utils/contract-renderer.ts` | Renderizado frontend (Preview) |
| `src/types/contracts.ts` | Tipos TypeScript actualizados |

---

## 10. Casos de uso del flujo de contrato

| Caso | Cuándo | Qué se ejecuta | Versión |
|------|--------|----------------|---------|
| **Generación inicial** | Estudio define plantilla/condiciones y guarda contrato o pasa a cierre | Lógica en `cotizaciones-cierre.actions.ts`: `getPromiseContractData` + `renderContractContent` → UPDATE `studio_cotizaciones_cierre` | 1 (o se mantiene si ya existía) |
| **Prospecto edita datos** | Cliente abre modal "Actualizar mis datos" en vista pública y guarda; hay contrato generado y no firmado | 1) `updatePublicPromiseData` (actualiza contacto y promesa; escribe en `studio_promise_logs`: "{nombre} actualizó sus datos para contrato"). 2) `regeneratePublicContract` (obtiene datos frescos, renderiza, incrementa versión, guarda en `studio_cotizaciones_cierre_contract_versions` con `AUTO_REGENERATE`) | Se incrementa |
| **Estudio regenera** | En vista cierre, botón "Regenerar" (contrato no firmado o confirmación si está firmado) | `regenerateStudioContract`: `getPromiseContractData` + `renderContractContent` → snapshot versión actual → UPDATE cierre con nuevo contenido y `contract_version + 1`; si estaba firmado, `contract_signed_at = null`; log en `studio_promise_logs` | Se incrementa |
| **Firma** | Cliente confirma firma en modal público | `signPublicContract`: UPDATE `contract_signed_at`, notificación, log; no modifica contenido ni versión | No cambia |

---

## 11. Funciones clave del flujo

| Función | Archivo | Uso |
|---------|---------|-----|
| **getPromiseContractData** | `src/lib/actions/studio/business/contracts/renderer.actions.ts` | Obtiene y enriquece datos de promesa/cotización para render (snapshots, billing_type, condiciones). Usada por generación inicial, regeneración pública y regeneración studio. |
| **renderContractContent** | `src/lib/actions/studio/business/contracts/renderer.actions.ts` | Renderiza HTML del contrato a partir de plantilla y datos. Usada en todos los flujos de generación/regeneración. |
| **regeneratePublicContract** | `src/lib/actions/public/cotizaciones.actions.ts` | Regenera contrato cuando el prospecto actualizó datos (solo si no firmado). Incrementa versión, guarda historial con `AUTO_REGENERATE`. |
| **regenerateStudioContract** | `src/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions.ts` | Regenera contrato desde Studio (botón Regenerar). Incrementa versión, invalida firma si existía, log en promise_logs. |
| **updatePublicPromiseData** | `src/lib/actions/public/promesas.actions.ts` | Actualiza contacto y promesa desde modal público; crea log "X actualizó sus datos para contrato". No toca el contrato; la regeneración la dispara el cliente en `PublicQuoteAuthorizedView` tras éxito. |
| **signPublicContract** | `src/lib/actions/public/contracts.actions.ts` | Persiste firma (`contract_signed_at`), notificación y log. No modifica contenido ni versión. |

---

## 12. Checklist de Validación

### ✅ Implementación
- [x] Función `formatItemQuantity()` creada y documentada
- [x] `getPromiseContractData()` enriquece datos con `billing_type`
- [x] `getEventContractData()` enriquece datos con `billing_type`
- [x] `renderServiciosBlock()` usa `formatItemQuantity()`
- [x] `renderCotizacionBlock()` usa `formatItemQuantity()`
- [x] Tipos `ContractService` actualizados

### ✅ Reglas de Negocio
- [x] HOUR siempre muestra `x[N] /hrs` (incluso si es 1)
- [x] SERVICE siempre muestra `x[N]` (incluso si es 1)
- [x] UNIT siempre muestra `x[N]` (incluso si es 1)
- [x] Fallback a 'SERVICE' si `billing_type` no está disponible

### ✅ Validación de Puntos de Uso
- [x] PDF generado muestra cantidades correctas
- [x] Preview en Studio muestra cantidades correctas
- [x] Portal del Cliente muestra cantidades correctas

---

**Última actualización**: 2026-01-29  
**Estado**: Implementado y Validado  
**Mantenido por**: Arquitectura ZEN
