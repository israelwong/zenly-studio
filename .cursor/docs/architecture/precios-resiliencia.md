# 📐 Documentación Maestra: Arquitectura de Precios y Resiliencia (Zenly POZ)

**Última actualización**: 2026-01-28  
**Estado**: ✅ Implementado y Validado  
**Principio Rector**: UI "Tonta", Servidor Inteligente (SSoT)

---

## 1. Filosofía del Sistema: Single Source of Truth (SSoT)

Para eliminar inconsistencias, el sistema se rige por la regla de que **la lógica de negocio nunca vive en el cliente**. El servidor calcula, decide y resuelve el precio final; el cliente solo aplica la máscara visual de moneda.

### Principios Fundamentales

- ✅ **Servidor decide**: Toda la lógica de cálculo y decisión está en el backend
- ✅ **Cliente renderiza**: El frontend solo formatea el precio recibido
- ✅ **Sin duplicación**: No hay lógica de negocio dispersa en componentes UI
- ✅ **Consistencia garantizada**: El mismo paquete siempre muestra el mismo precio

---

## 2. El Motor de Precios (`package-price-engine.ts`)

Este es el **"Cerebro"** del sistema. Centraliza todas las reglas de negocio de los paquetes en una única función pura.

**Ubicación**: `src/lib/utils/package-price-engine.ts`

### 🧠 Reglas de Decisión

#### Normalización Defensiva
Si las horas del evento son `null`, `0` o `undefined`, el sistema cae automáticamente en el **Precio Personalizado del paquete** (exacto, sin charm).

#### Match de Horas
- **Si Horas Evento === Horas Base Paquete** → Precio Personalizado Exacto (Sin redondeo)
- **Si las horas difieren** → Precio Recalculado + Charm Rounding

#### Redondeo Charm
Reutiliza la utilidad global `roundPrice` de `src/lib/utils/price-rounding.ts` para asegurar que las terminaciones en `.99` sean consistentes en todo el ecosistema.

### Interfaz del Engine

```typescript
interface PackagePriceEngineInput {
  paquete: {
    id: string;
    precio: number; // Precio personalizado del paquete
    base_hours: number | null;
  };
  eventDurationHours: number | null;
  paqueteItems: Array<{...}>; // Items del paquete
  catalogo: Array<{...}>; // Catálogo completo
  configPrecios: {...}; // Configuración de precios del studio
}

interface PackagePriceEngineOutput {
  finalPrice: number; // Precio final a usar (ya con charm si aplica)
  basePrice: number; // Precio base (personalizado del paquete)
  recalculatedPrice: number; // Precio recalculado (si aplica)
  hoursMatch: boolean; // Si las horas coinciden
  priceSource: 'personalized' | 'recalculated' | 'base'; // Origen del precio
}
```

### Lógica de Decisión (5 Casos)

1. **Horas coinciden + Precio personalizado válido** → Precio Personalizado Exacto
2. **Horas diferentes + Precio personalizado válido** → Precio Recalculado + Charm
3. **Sin horas evento + Precio personalizado válido** → Precio Personalizado Exacto
4. **Sin precio personalizado + Recalculado válido** → Precio Recalculado + Charm
5. **Fallback** → Precio base del paquete (sin charm)

---

## 3. El Formateador Visual (`package-price-formatter.ts`)

La interfaz ya no realiza comparaciones ni redondeos. Recibe el `finalPrice` (número) y aplica formato de moneda.

**Ubicación**: `src/lib/utils/package-price-formatter.ts`

### Uso en UI

Se utiliza la función `formatPackagePriceSimple(price)` para unificar el renderizado en:
- Vitrina Pública (`PaquetesSection`)
- Comparador (`ComparadorSheet`)
- Detalle (`PaqueteDetailSheet`)
- Resumen de Autorización (`Step3Summary`)

### Implementación

```typescript
export function formatPackagePriceSimple(price: number): string {
  return formatPackagePrice({ price });
}

// Internamente usa Intl.NumberFormat con locale 'es-MX' y currency 'MXN'
```

---

## 4. Puntos de Salida y Congruencia (Sincronización 360°)

El precio es consistente en los siguientes **4 nodos críticos** del funnel:

### 4.1 Vitrina Pública
**Componente**: `PaquetesSection.tsx`  
**Fuente**: `getPublicPromiseAvailablePackages()`  
**Formato**: `formatPackagePriceSimple(paquete.price)`

### 4.2 Análisis Comparativo
**Componente**: `ComparadorSheet.tsx`  
**Fuente**: `getPublicPromiseData()`  
**Formato**: `formatPackagePriceSimple(paquete.price)`

### 4.3 Resumen de Autorización
**Componente**: `Step3Summary.tsx` y `AutorizarCotizacionModal.tsx`  
**Fuente**: `getPublicPromisePendientes()`  
**Formato**: `formatPackagePriceSimple(paquete.price)`

### 4.4 Snapshot Legal
**Componente**: Contrato PDF (`renderer.actions.ts`)  
**Fuente**: `cotizacion.price` (directo de DB, sin recálculo)  
**Formato**: Precio exacto del snapshot

**⚠️ CRÍTICO**: El contrato PDF lee el precio directamente de la base de datos (`cotizacion.price`), bloqueando cualquier recálculo futuro.

---

## 5. Capa de Resiliencia y Estabilidad (DB Retry)

Debido a la alta carga de consultas paralelas (`Promise.all`), se implementó una capa de defensa para evitar errores de conexión.

**Ubicación**: `src/lib/database/retry-helper.ts`

### 🛡️ Mecanismo de Recuperación

#### Retry Helper
Implementa un **Exponential Backoff** que captura errores transitorios de Postgres:
- `terminating connection`
- `database system is shutting down`
- `DriverAdapterError`
- `connection terminated`

#### Configuración
- **Reintentos**: 3 automáticos
- **Delay base**: 1 segundo
- **Delay máximo**: 5 segundos
- **Jitter**: ±25% para evitar thundering herd

#### Pooler Optimizado
- **Desarrollo**: 5 conexiones simultáneas (reducido para evitar saturación en Hot Reload)
- **Producción**: 20 conexiones simultáneas
- **Serverless (pgbouncer)**: 1 conexión

#### Timeouts Ajustados
- **Desarrollo**: 10s idle, 20s connection, 20s statement
- **Producción**: 30s idle, 20s connection, 30s statement

### Server Actions con Retry

Las siguientes acciones críticas implementan retry automático:
- ✅ `determinePromiseState()` - Layout de promesas
- ✅ `getPipelineStages()` - Pipeline stages
- ✅ `getCotizacionesByPromiseId()` - Lista de cotizaciones
- ✅ `getPromiseViewStats()` - Analytics de vistas

---

## 📊 Matriz de Casos de Uso

| Escenario | Fuente de Precio | Formato Final | Ejemplo |
|-----------|------------------|---------------|---------|
| Horas coinciden (7h vs 7h) | Personalizado (DB) | Exacto | $18,000 |
| Horas difieren (8h vs 7h) | Recalculado (Engine) | Charm | $18,099 |
| Sin horas evento | Personalizado (DB) | Exacto | $18,000 |
| Cotización Manual | Negociado (DB) | Exacto | $25,000 |
| Error de Red/DB | Retry Handler | Recuperación automática | Reintento 1-3 |

---

## 🏗️ Arquitectura del Flujo

```
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Backend)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  package-price-engine.ts                         │   │   │
│  │  - Calcula precio final                          │   │
│  │  - Decide charm rounding                          │   │
│  │  - Retorna: { finalPrice, priceSource }          │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Server Actions                                   │   │
│  │  - getPublicPromiseAvailablePackages              │   │
│  │  - getPublicPromisePendientes                     │   │
│  │  - getPublicPromiseData                           │   │
│  │  Retornan: PublicPaquete con price resuelto       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Frontend)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  package-price-formatter.ts                      │   │
│  │  - Solo formatea el precio recibido              │   │
│  │  - NO calcula, NO decide charm                   │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Componentes UI                                  │   │
│  │  - PaquetesSection                                │   │
│  │  - PaqueteDetailSheet                             │   │
│  │  - ComparadorSheet                                │   │
│  │  Solo renderizan: formatPackagePriceSimple()     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos Completo

### 1. Request del Cliente
```
Cliente → Server Action (getPublicPromiseAvailablePackages)
```

### 2. Procesamiento en Servidor
```
Server Action → calculatePackagePrice() → Engine
Engine → Compara horas → Decide precio → Aplica charm si necesario
Engine → Retorna finalPrice resuelto
```

### 3. Respuesta al Cliente
```
Server Action → Retorna PublicPaquete { price: finalPrice }
```

### 4. Renderizado en UI
```
Componente → Recibe paquete.price (número)
Componente → formatPackagePriceSimple(paquete.price)
Componente → Renderiza string formateado
```

---

## ✅ Validaciones Implementadas

### Alcance Restringido
- ✅ Engine procesa **EXCLUSIVAMENTE** paquetes
- ✅ Cotizaciones manuales mantienen precio exacto (sin charm)

### Normalización Defensiva
- ✅ Manejo robusto de `null`, `0`, `undefined` en horas
- ✅ Fallback automático a precio personalizado

### Consistencia de Redondeo
- ✅ Reutiliza `roundPrice` existente (no duplica lógica)
- ✅ Charm aplicado solo cuando corresponde

### Resiliencia
- ✅ Retry automático para errores transitorios
- ✅ Pool optimizado según entorno
- ✅ Timeouts ajustados para desarrollo/producción

---

## 📁 Archivos Clave

### Core Engine
- `src/lib/utils/package-price-engine.ts` - Motor de decisión
- `src/lib/utils/package-price-formatter.ts` - Formateador visual

### Server Actions
- `src/lib/actions/public/promesas.actions.ts` - Acciones públicas (usa engine)
- `src/lib/actions/studio/commercial/promises/promise-state.actions.ts` - Estado de promesas (con retry)
- `src/lib/actions/studio/commercial/promises/promise-pipeline-stages.actions.ts` - Pipeline (con retry)
- `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts` - Cotizaciones (con retry)
- `src/lib/actions/studio/commercial/promises/promise-analytics.actions.ts` - Analytics (con retry)

### Componentes UI
- `src/components/promise/PaquetesSection.tsx` - Vitrina pública
- `src/components/promise/PaqueteDetailSheet.tsx` - Detalle de paquete
- `src/components/promise/ComparadorSheet.tsx` - Comparador
- `src/components/promise/shared/PrecioDesglose.tsx` - Desglose de precios

### Resiliencia
- `src/lib/database/retry-helper.ts` - Helper de reintentos
- `src/lib/prisma.ts` - Configuración de pool de conexiones

### Tipos
- `src/types/public-promise.ts` - Tipos públicos (PublicPaquete sin use_charm_rounding)

---

## 🧪 Testing

### Tests Unitarios
**Ubicación**: `src/lib/utils/__tests__/package-price-engine.test.ts`

**Escenarios cubiertos**:
- ✅ Match de horas → Precio exacto
- ✅ Mismatch de horas → Precio + charm
- ✅ Sin horas → Precio personalizado
- ✅ Sin precio personalizado → Recalculado + charm
- ✅ Edge cases (horas en 0, null, etc.)
- ✅ Billing types (HOUR vs SERVICE)

---

## 🎯 Resultado Final

**Sistema unificado con**:
- ✅ SSoT en servidor (engine centralizado)
- ✅ UI "tonta" (solo formatea)
- ✅ Consistencia garantizada (mismo precio en todos los puntos)
- ✅ Resiliencia (retry automático)
- ✅ Mantenibilidad (lógica centralizada)

**Principio cumplido**: El cliente no sabe NADA de la lógica de horas o charm. Solo recibe un número (`price`) listo para ser formateado.

---

## 📝 Notas de Mantenimiento

### Agregar Nuevo Punto de Salida
1. Usar `formatPackagePriceSimple(paquete.price)` directamente
2. NO agregar lógica condicional de charm
3. NO calcular precios localmente

### Modificar Lógica de Precios
1. Editar `package-price-engine.ts` únicamente
2. Los cambios se propagan automáticamente a todos los puntos de salida
3. Actualizar tests en `package-price-engine.test.ts`

### Debugging
- Los logs temporales fueron eliminados
- Para debugging, agregar logs temporales en el engine (no en UI)
- Remover logs después de verificar

---

**Última revisión**: 2026-01-28  
**Mantenido por**: Sistema Zenly POZ
