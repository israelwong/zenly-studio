# Arquitectura de Validación y Redireccionamiento de Promesas

## 📋 Resumen

Sistema de redirección automática basado en el estado de las cotizaciones asociadas a una promesa. Funciona en dos niveles:
1. **Validación inicial (SSR)**: Al acceder a la ruta raíz, determina la ruta correcta
2. **Redirección en tiempo real (Client)**: Cuando cambia el estatus de una cotización, redirige automáticamente

---

## 🏗️ Arquitectura

### 1. Ruta Raíz: `/promise/[promiseId]`

**Componente**: `PromiseRedirectHandler.tsx`

**Propósito**: Validación inicial al acceder a la ruta raíz sin subruta específica.

**Flujo**:
```
Usuario accede a /promise/[promiseId]
  ↓
PromiseRedirectHandler se monta
  ↓
Consulta API: /api/promise/[slug]/[promiseId]/redirect
  ↓
API usa determinePromiseRoute() para determinar ruta
  ↓
Redirige a: /pendientes | /negociacion | /cierre | /cliente
```

**Lógica de prioridad** (en `determinePromiseRoute`):
1. **Negociación** (prioridad más alta): Si hay cotización con `status === 'negociacion'` y `selected_by_prospect !== true`
2. **Cierre**: Si hay cotización con `status === 'en_cierre'` o `status === 'cierre'`
3. **Pendientes** (default): Si todas las cotizaciones están pendientes o no hay cotizaciones

**Archivos relacionados**:
- `/app/[slug]/promise/[promiseId]/page.tsx` - Renderiza `PromiseRedirectHandler`
- `/app/api/promise/[slug]/[promiseId]/redirect/route.ts` - API que determina la ruta
- `/lib/utils/public-promise-routing.ts` - Función `determinePromiseRoute()`

---

### 2. Subrutas: Cada una maneja su propia redirección

Cada subruta (`/pendientes`, `/cierre`, `/negociacion`) tiene su propia lógica de redirección usando hooks de realtime.

#### 2.1 `/pendientes` - PendientesPageClient

**Ubicación**: `/app/[slug]/promise/[promiseId]/pendientes/PendientesPageClient.tsx`

**Lógica de redirección**:
- **Escucha**: `useCotizacionesRealtime` hook
- **Si cambia a cierre** → Redirige a `/cierre`
- **Si cambia a negociación** → Redirige a `/negociacion`
- **Otros cambios** → No redirige (notificaciones deshabilitadas)

**Implementación**:
```typescript
// Método 1: Callback directo del hook (puede no ejecutarse si hay múltiples instancias)
useCotizacionesRealtime({
  onCotizacionUpdated: handleCotizacionUpdated, // Redirige si status === 'en_cierre'
});

// Método 2: Evento personalizado (respaldo)
useEffect(() => {
  window.addEventListener('cotizacion-cambio-estatus', handleStatusChange);
  // Redirige si status === 'en_cierre'
}, []);
```

**Problema actual**: El callback directo no se ejecuta (solo se ejecuta el de `CotizacionesSectionRealtime`), por eso se usa el evento personalizado como respaldo.

---

#### 2.2 `/cierre` - PublicQuoteAuthorizedView

**Ubicación**: `/components/promise/PublicQuoteAuthorizedView.tsx`

**Lógica de redirección**:
- **Escucha**: `useCotizacionesRealtime` hook
- **Si cambia a pendiente/negociación** → Redirige según `determinePromiseRoute()`
- **Notificaciones**: Solo para insert/delete de cotizaciones, NO para cambios de estatus

**Implementación**:
```typescript
useCotizacionesRealtime({
  onCotizacionUpdated: handleContractUpdated,
  // Si oldStatus === 'en_cierre' && newStatus === 'pendiente' → redirige
});
```

---

#### 2.3 `/negociacion` - NegociacionView

**Ubicación**: `/app/[slug]/promise/[promiseId]/negociacion/NegociacionView.tsx`

**Lógica de redirección**:
- **Escucha**: `useCotizacionesRealtime` hook
- **Si cambia a cierre** → Redirige a `/cierre`
- **Si cambia a pendiente** → Redirige a `/pendientes`

**Implementación**:
```typescript
useCotizacionesRealtime({
  onCotizacionUpdated: handleCotizacionUpdated,
  // Usa checkAndRedirect() para determinar ruta
});
```

---

## 🔄 Flujo de Redirección en Tiempo Real

### Escenario: Usuario en `/pendientes`, cotización cambia a cierre

```
1. Estudio cambia estatus de cotización: pendiente → en_cierre
   ↓
2. Supabase Realtime emite evento UPDATE
   ↓
3. useCotizacionesRealtime (en CotizacionesSectionRealtime) detecta el cambio
   ↓
4. CotizacionesSectionRealtime.handleCotizacionUpdated() se ejecuta
   ↓
5. Detecta status === 'en_cierre'
   ↓
6. Emite evento personalizado: 'cotizacion-cambio-estatus'
   ↓
7. PendientesPageClient escucha el evento
   ↓
8. Verifica: normalizedStatus === 'en_cierre' && !currentPath.includes('/cierre')
   ↓
9. Ejecuta: router.push('/cierre')
```

---

## ⚠️ Problema Actual

### Síntoma
Cuando una cotización cambia de `pendiente` a `en_cierre`, **NO se redirige automáticamente** a `/cierre`.

### Evidencia en Logs
```
[useCotizacionesRealtime] Evento de cierre detectado: 
  {status: 'en_cierre', statusChanged: true, oldStatus: 'pendiente'}
[useCotizacionesRealtime] Llamando onUpdatedRef.current: 
  {hasCallback: true, changeInfo: {...}}
[useCotizacionesRealtime] Ejecutando callback onCotizacionUpdated
[CotizacionesSectionRealtime] Sin información de cambios, verificando antes de recargar
[useCotizacionesRealtime] Callback ejecutado exitosamente
```

**Observaciones**:
- ✅ El hook detecta el cambio correctamente
- ✅ El callback se ejecuta en `CotizacionesSectionRealtime`
- ❌ El callback de `PendientesPageClient` **NO se ejecuta**
- ❌ No se ve el log `[PendientesPageClient] 📢📢📢 Evento cotizacion-cambio-estatus recibido`
- ❌ No se ve el log `[PendientesPageClient] 🚀🚀🚀 REDIRIGIENDO A CIERRE`

### Causa Raíz

**Múltiples instancias del hook `useCotizacionesRealtime`**:
1. Una instancia en `PendientesPageClient`
2. Otra instancia en `CotizacionesSectionRealtime` (componente hijo)

**Problema**: Cuando hay múltiples instancias del hook escuchando el mismo canal de Supabase Realtime, solo una recibe el evento. En este caso, solo `CotizacionesSectionRealtime` recibe el evento.

### Solución Implementada (Parcial)

Se implementó un **evento personalizado** como respaldo:
- `CotizacionesSectionRealtime` emite `cotizacion-cambio-estatus` cuando detecta cambio a cierre
- `PendientesPageClient` escucha ese evento y redirige

**Pero el evento tampoco se está recibiendo**, lo que sugiere que:
1. El evento no se está emitiendo correctamente, o
2. El listener no está configurado correctamente, o
3. Hay algún bloqueo que impide la ejecución

---

## 🔍 Análisis del Código Actual

### PendientesPageClient.tsx

**Líneas 272-316**: Listener del evento personalizado
```typescript
useEffect(() => {
  const handleStatusChange = (event: CustomEvent) => {
    // Debería ejecutarse cuando CotizacionesSectionRealtime emite el evento
    // Pero NO se ejecuta según los logs
  };
  window.addEventListener('cotizacion-cambio-estatus', handleStatusChange);
}, [dependencies]);
```

**Líneas 377-465**: Handler directo del hook
```typescript
const handleCotizacionUpdated = useCallback((cotizacionId, changeInfo) => {
  // Lógica para redirigir si status === 'en_cierre'
  // Pero este callback NO se ejecuta
}, [dependencies]);
```

**Líneas 583-604**: Configuración del hook
```typescript
useCotizacionesRealtime({
  onCotizacionUpdated: (cotizacionId, changeInfo) => {
    // Este callback debería ejecutarse pero NO lo hace
    handleCotizacionUpdated(cotizacionId, changeInfo);
  },
});
```

### CotizacionesSectionRealtime.tsx

**Líneas 187-219**: Handler que detecta cambio a cierre
```typescript
const handleCotizacionUpdated = useCallback((cotizacionId, payload) => {
  const changeInfo = p?.changeInfo || p;
  const normalizedStatus = changeInfo?.status === 'cierre' ? 'en_cierre' : changeInfo?.status;
  
  if (normalizedStatus === 'en_cierre') {
    // Emite evento personalizado
    window.dispatchEvent(new CustomEvent('cotizacion-cambio-estatus', {
      detail: { cotizacionId, changeInfo: {...} }
    }));
    return; // NO procesa más
  }
}, []);
```

**Problema**: El evento se emite, pero `PendientesPageClient` no lo recibe.

---

## 🎯 Requisitos

### Comportamiento Esperado

1. **Usuario en `/pendientes`**:
   - Escucha cambios de estatus en tiempo real
   - Si cambia a `en_cierre` → Redirige automáticamente a `/cierre` (sin refrescar)
   - Si cambia a `negociacion` → Redirige automáticamente a `/negociacion`
   - Otros cambios → No redirige (notificaciones opcionales, actualmente deshabilitadas)

2. **Usuario en `/cierre`**:
   - Escucha cambios de estatus en tiempo real
   - Si cambia a `pendiente` → Redirige automáticamente a `/pendientes`
   - Si cambia a `negociacion` → Redirige automáticamente a `/negociacion`
   - ✅ **FUNCIONA CORRECTAMENTE** (según el usuario)

3. **Usuario en `/negociacion`**:
   - Escucha cambios de estatus en tiempo real
   - Si cambia a `pendiente` → Redirige automáticamente a `/pendientes`
   - Si cambia a `en_cierre` → Redirige automáticamente a `/cierre`

### Notificaciones

- **En `/pendientes`**: Deshabilitadas para evitar conflictos con redirección
- **En `/cierre`**: Solo para insert/delete de cotizaciones, NO para cambios de estatus

---

## 🐛 Problema Detallado

### Logs Esperados (NO aparecen)

```
[CotizacionesSectionRealtime] ⚠️⚠️⚠️ STATUS EN_CIERRE detectado, emitiendo evento INMEDIATAMENTE
[CotizacionesSectionRealtime] ✅ Evento emitido exitosamente
[PendientesPageClient] 📢📢📢📢📢 Evento cotizacion-cambio-estatus recibido (RESPALDO)
[PendientesPageClient] 🚀🚀🚀 REDIRIGIENDO A CIERRE (desde evento personalizado)
```

### Logs Reales (Aparecen)

```
[useCotizacionesRealtime] Evento de cierre detectado
[useCotizacionesRealtime] Llamando onUpdatedRef.current
[useCotizacionesRealtime] Ejecutando callback onCotizacionUpdated
[CotizacionesSectionRealtime] Sin información de cambios, verificando antes de recargar
[useCotizacionesRealtime] Callback ejecutado exitosamente
```

**Falta**:
- ❌ Log de emisión del evento personalizado
- ❌ Log de recepción del evento en PendientesPageClient
- ❌ Log de redirección

### Posibles Causas

1. **El evento no se emite**: El código que emite el evento no se ejecuta
2. **El listener no está activo**: El `useEffect` no se monta o se desmonta
3. **El evento se emite antes del listener**: Race condition
4. **Bloqueo por navegación**: `getIsNavigating()` retorna `true` y bloquea la redirección
5. **Bloqueo por autorización**: `isAuthorizationInProgress` está en `true`

---

## 📝 Archivos Clave

### Validación Inicial (SSR)
- `/app/[slug]/promise/[promiseId]/page.tsx` - Renderiza PromiseRedirectHandler
- `/app/[slug]/promise/[promiseId]/PromiseRedirectHandler.tsx` - Componente de redirect inicial
- `/app/api/promise/[slug]/[promiseId]/redirect/route.ts` - API de redirect
- `/lib/utils/public-promise-routing.ts` - Lógica de determinación de ruta

### Redirección en Tiempo Real (Client)
- `/app/[slug]/promise/[promiseId]/pendientes/PendientesPageClient.tsx` - Lógica de redirección en pendientes
- `/app/[slug]/promise/[promiseId]/cierre/CierrePageDeferred.tsx` - Renderiza PublicQuoteAuthorizedView
- `/components/promise/PublicQuoteAuthorizedView.tsx` - Lógica de redirección en cierre
- `/app/[slug]/promise/[promiseId]/negociacion/NegociacionView.tsx` - Lógica de redirección en negociación
- `/components/promise/CotizacionesSectionRealtime.tsx` - Emite eventos personalizados
- `/hooks/useCotizacionesRealtime.ts` - Hook de realtime que detecta cambios

---

## 🔧 Soluciones Propuestas (No Implementadas)

### Opción 1: Usar un único hook compartido
- Crear un contexto que comparta una única instancia del hook
- Todas las subrutas usan el mismo hook
- Problema: Requiere refactorización significativa

### Opción 2: Mejorar el evento personalizado
- Asegurar que el evento se emita correctamente
- Verificar que el listener esté activo
- Agregar más logs para debuggear
- Problema: Ya se intentó, no funciona

### Opción 3: Usar un store global (Zustand/Context)
- Estado global para cambios de estatus
- Todas las subrutas suscritas al mismo store
- Problema: Requiere nueva dependencia y refactorización

### Opción 4: Simplificar - Solo un listener en PendientesPageClient
- Eliminar el hook de CotizacionesSectionRealtime para cambios de estatus
- Solo PendientesPageClient escucha cambios de estatus
- CotizacionesSectionRealtime solo maneja actualizaciones locales
- Problema: Requiere refactorización de CotizacionesSectionRealtime

---

## 📊 Estado Actual

| Componente | Hook Realtime | Evento Personalizado | Redirección Funciona |
|------------|---------------|---------------------|---------------------|
| PendientesPageClient | ✅ Configurado | ✅ Listener activo | ❌ NO funciona |
| CotizacionesSectionRealtime | ✅ Recibe eventos | ✅ Emite evento | N/A (no redirige) |
| PublicQuoteAuthorizedView | ✅ Configurado | N/A | ✅ Funciona (cierre→pendiente) |
| NegociacionView | ✅ Configurado | N/A | ✅ Funciona |

---

## 🎯 Próximos Pasos Sugeridos

1. **Verificar que el evento se emita**: Agregar log justo antes de `window.dispatchEvent()`
2. **Verificar que el listener esté activo**: Agregar log en el `useEffect` del listener
3. **Verificar bloqueos**: Revisar `getIsNavigating()` y `isAuthorizationInProgress`
4. **Simplificar**: Considerar eliminar el hook de `CotizacionesSectionRealtime` para cambios de estatus
5. **Debugging**: Agregar más logs estratégicos para rastrear el flujo completo

---

## 📚 Referencias

- Hook de Realtime: `/hooks/useCotizacionesRealtime.ts`
- Utilidad de routing: `/lib/utils/public-promise-routing.ts`
- Componente de pendientes: `/app/[slug]/promise/[promiseId]/pendientes/PendientesPageClient.tsx`
- Componente de cierre: `/components/promise/PublicQuoteAuthorizedView.tsx`
- Componente de negociación: `/app/[slug]/promise/[promiseId]/negociacion/NegociacionView.tsx`
