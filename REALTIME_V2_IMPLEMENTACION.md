# Implementación Realtime v2.0.0 - Documento de Referencia

**Versión:** 2.1.0  
**Fecha:** 2025-12-18  
**Estado:** ✅ Solución Robusta Implementada (realtime.send)

---

## 📋 Resumen Ejecutivo

Se ha implementado una arquitectura unificada y robusta para Supabase Realtime que resuelve los problemas de:

- ❌ Canales privados que no se suscribían correctamente (`auth.uid() NULL`)
- ❌ Canales públicos que no recibían broadcasts
- ❌ Inconsistencias en la configuración de autenticación

**Solución Robusta v2.1.0:**

- ✅ **Migración completa a `realtime.send`** - Evita problemas de `auth.uid() NULL`
- ✅ **Canales públicos** - No requieren políticas RLS complejas
- ✅ **Fuente única de verdad** - `src/lib/realtime/core.ts`
- ✅ **Payloads compatibles** - Funciona con código existente

---

## 🏗️ Arquitectura Implementada

### Estructura de Archivos

```
src/lib/realtime/
├── core.ts                    # ✅ Fuente única de verdad (NUEVO)
│   ├── setupRealtimeAuth()    # Configuración unificada de auth
│   ├── createRealtimeChannel() # Creación unificada de canales
│   ├── RealtimeChannelPresets  # Configuraciones predefinidas
│   └── subscribeToChannel()    # Helper para suscripción
└── realtime-control.ts        # Control de features (existente)

src/hooks/
├── useCotizacionesRealtime.ts    # ✅ Refactorizado
├── useRealtimeNotifications.ts   # ✅ Refactorizado
└── usePromisesRealtime.ts        # ✅ Refactorizado

supabase/migrations/
├── 20250122000015_fix_realtime_rls_cotizaciones.sql  # ✅ Política RLS cotizaciones
└── 20250122000024_migrate_all_to_realtime_send.sql    # ✅ Migración completa a realtime.send (SOLUCIÓN ROBUSTA)
```

---

## ✅ Checklist de Implementación

### Fase 1: Base de Datos ⚠️ CRÍTICO

- [x] Crear migración completa a `realtime.send` (SOLUCIÓN ROBUSTA)
- [ ] **Aplicar migración en base de datos** ⚠️ PENDIENTE
  - Archivo: `supabase/migrations/20250122000024_migrate_all_to_realtime_send.sql`
  - Acción: Ejecutar en Supabase Dashboard SQL Editor
  - **Esta migración reemplaza los triggers anteriores y usa `realtime.send`**
- [ ] Verificar que los triggers funcionan correctamente

### Fase 2: Código ✅ COMPLETADO

- [x] Crear `src/lib/realtime/core.ts`
- [x] Refactorizar `useCotizacionesRealtime` (soporta `realtime.send`)
- [x] Refactorizar `useRealtimeNotifications` (soporta `realtime.send`)
- [x] Refactorizar `usePromisesRealtime` (soporta `realtime.send`)
- [x] Actualizar presets para usar canales públicos
- [x] Verificar que no hay errores de linting

### Fase 3: Pruebas ⚠️ PENDIENTE

- [ ] **Probar suscripción desde studio autenticado**
  - [ ] Verificar que se suscribe correctamente
  - [ ] Verificar que recibe broadcasts de cotizaciones
  - [ ] Verificar que recibe broadcasts de notificaciones
  - [ ] Verificar que recibe broadcasts de promises
- [ ] **Probar suscripción desde promise público (anónimo)**
  - [ ] Verificar que se suscribe correctamente
  - [ ] Verificar que recibe broadcasts de cotizaciones
  - [ ] Verificar que NO recibe broadcasts de notificaciones
- [ ] **Probar triggers de base de datos**
  - [ ] Crear cotización → Verificar que se emite broadcast
  - [ ] Actualizar cotización → Verificar que se emite broadcast
  - [ ] Eliminar cotización → Verificar que se emite broadcast
  - [ ] Crear notificación → Verificar que se emite broadcast
  - [ ] Crear promise → Verificar que se emite broadcast

### Fase 4: Validación de Flujo Completo ⚠️ PENDIENTE

- [ ] **Flujo: Studio crea cotización → Promise público la ve**
  1. Abrir promise público en navegador anónimo
  2. Desde studio autenticado, crear cotización
  3. Verificar que promise público recibe el broadcast
  4. Verificar que la UI se actualiza en tiempo real
- [ ] **Flujo: Promise público solicita paquete → Studio recibe notificación**
  1. Desde promise público, solicitar paquete
  2. Verificar que se crea cotización dinámica
  3. Verificar que studio recibe notificación en tiempo real
  4. Verificar que PromiseQuotesPanel se actualiza
- [ ] **Flujo: Promise público autoriza → Studio recibe notificación**
  1. Desde promise público, autorizar cotización
  2. Verificar que studio recibe notificación en tiempo real
  3. Verificar que PromiseQuotesPanelCard se actualiza
  4. Verificar que el estado cambia a "Aprobada"

---

## 🧪 Guía de Pruebas Rápida

### Prueba 1: Suscripción Studio Autenticado

**Pasos:**

1. Iniciar sesión en studio
2. Abrir `/studio/{slug}/commercial/promises/{promiseId}`
3. Abrir DevTools → Console
4. Buscar logs: `[Realtime Core] 🔐 Auth configurado`
5. Buscar logs: `[Realtime Core] ✅ Suscrito exitosamente`

**Resultado Esperado:**

- ✅ Logs muestran `hasSession: true`
- ✅ Logs muestran suscripción exitosa
- ✅ No hay errores de autenticación

---

### Prueba 2: Suscripción Promise Público (Anónimo)

**Pasos:**

1. Abrir navegador en modo incógnito (sin sesión)
2. Abrir `/{slug}/promise/{promiseId}`
3. Abrir DevTools → Console
4. Buscar logs: `[Realtime Core] 🔐 Auth configurado`
5. Buscar logs: `[Realtime Core] ✅ Suscrito exitosamente`

**Resultado Esperado:**

- ✅ Logs muestran `hasSession: false`
- ✅ Logs muestran suscripción exitosa
- ✅ No hay errores de autenticación

---

### Prueba 3: Broadcast desde Trigger

**Pasos:**

1. Abrir promise público en navegador anónimo
2. Desde studio autenticado, crear una cotización
3. Verificar logs en promise público: `[useCotizacionesRealtime] 📨 EVENTO BROADCAST GENÉRICO RECIBIDO`
4. Verificar que la UI se actualiza

**Resultado Esperado:**

- ✅ El trigger ejecuta `realtime.broadcast_changes`
- ✅ El broadcast llega a promise público
- ✅ La UI se actualiza automáticamente

---

## 🔍 Debugging

### Problemas Comunes

#### 1. "Error configurando auth"

**Causa:** `setAuth()` falló  
**Solución:** Verificar que `supabase.realtime.setAuth()` se llama correctamente

#### 2. "CHANNEL_ERROR" en suscripción

**Causa:** Política RLS bloqueando acceso  
**Solución:**

1. Verificar que la migración de RLS se aplicó correctamente
2. **Verificar que `supabase_id` en `studio_user_profiles` coincide con `auth.uid()`**
   - Ejecutar en Supabase SQL Editor:

   ```sql
   SELECT
     sup.email,
     sup.supabase_id,
     au.id as auth_user_id,
     CASE
       WHEN sup.supabase_id = au.id::text THEN '✅ Coincide'
       ELSE '❌ NO coincide - CORREGIR'
     END as status
   FROM studio_user_profiles sup
   LEFT JOIN auth.users au ON au.email = sup.email
   WHERE sup.email = 'tu-email@ejemplo.com';
   ```

   - Si no coincide, actualizar:

   ```sql
   UPDATE studio_user_profiles
   SET supabase_id = (SELECT id::text FROM auth.users WHERE email = 'tu-email@ejemplo.com')
   WHERE email = 'tu-email@ejemplo.com';
   ```

3. Verificar que el usuario tiene `is_active = true` y `studio_id` configurado

#### 3. Broadcasts no llegan

**Causa:** Trigger no se ejecuta o formato incorrecto  
**Solución:**

- Verificar logs de PostgreSQL para ver si el trigger se ejecuta
- Verificar formato del payload en el listener genérico

#### 4. Suscripción funciona pero no recibe eventos

**Causa:** Listener no está configurado correctamente  
**Solución:** Verificar que los listeners están agregados ANTES de suscribirse

---

## 📝 Logs de Referencia

### Logs Exitosos

```
[Realtime Core] 🔐 Auth configurado: { hasSession: true, requiresAuth: false }
[Realtime Core] 📡 Canal creado: { channelName: "studio:mi-estudio:cotizaciones", isPrivate: true }
[Realtime Core] 📡 Estado de suscripción: { status: "SUBSCRIBED", channelName: "studio:mi-estudio:cotizaciones" }
[Realtime Core] ✅ Suscrito exitosamente: studio:mi-estudio:cotizaciones
[useCotizacionesRealtime] 📨 EVENTO BROADCAST GENÉRICO RECIBIDO: { payload: {...} }
```

### Logs de Error

```
[Realtime Core] ❌ Error configurando auth: { error: "..." }
[Realtime Core] ❌ Error en suscripción: { status: "CHANNEL_ERROR", error: "..." }
```

---

## 🚀 Próximos Pasos (Orden de Ejecución)

1. **Aplicar migración completa a realtime.send** (CRÍTICO - SOLUCIÓN ROBUSTA Y CENTRALIZADA)

   ```sql
   -- Ejecutar en Supabase SQL Editor
   -- Archivo: supabase/migrations/20250122000024_migrate_all_to_realtime_send.sql
   ```

   **Qué hace esta migración:**
   - ✅ Actualiza trigger de **promises** → `realtime.send`
   - ✅ Actualiza trigger de **notificaciones** → `realtime.send`
   - ✅ Actualiza trigger de **cotizaciones** → `realtime.send`
   - ✅ Payloads compatibles con código existente
   - ✅ Usa canales públicos (evita problemas de `auth.uid() NULL`)

   **Ventajas:**
   - ✅ No requiere políticas RLS complejas
   - ✅ Funciona con usuarios autenticados y anónimos
   - ✅ Solución centralizada y robusta
   - ✅ Código cliente ya actualizado (hooks listos)

2. **Recargar la página** - Los hooks ya están configurados para usar canales públicos con `realtime.send`

3. **Verificar datos del usuario** (Solo si persiste el error)

   Ejecutar el script de verificación en Supabase SQL Editor:

   ```bash
   scripts/verify-realtime-user.sql
   ```

   O ejecutar manualmente:

   ```sql
   -- Verificar que supabase_id coincide con auth.uid()
   SELECT
     sup.email,
     sup.supabase_id,
     au.id as auth_user_id,
     CASE
       WHEN sup.supabase_id = au.id::text THEN '✅ OK'
       ELSE '❌ CORREGIR'
     END as status
   FROM studio_user_profiles sup
   LEFT JOIN auth.users au ON au.email = sup.email
   WHERE sup.email = 'owner@demo-studio.com';
   ```

   Si no coincide, corregir:

   ```sql
   UPDATE studio_user_profiles
   SET supabase_id = (SELECT id::text FROM auth.users WHERE email = 'owner@demo-studio.com')
   WHERE email = 'owner@demo-studio.com';
   ```

4. **Verificar configuración de Supabase Dashboard** (Solo si persiste el error)
   - Ir a **Supabase Dashboard** → **Project Settings** → **Realtime Settings**
   - Verificar si **"Private-only channels"** está habilitado
   - Si está habilitado, **deshabilitarlo temporalmente** para probar
   - **"Allow public access"** debe estar deshabilitado para canales privados

5. **Probar Prueba 1** (Studio autenticado)

6. **Probar Prueba 2** (Promise público anónimo)

7. **Probar Prueba 3** (Broadcast desde trigger)

8. **Probar Flujos Completos** (Fase 4)

9. **Monitorear logs** en producción para detectar problemas

10. **Iterar** según resultados de pruebas

---

## 📊 Matriz de Configuración

| Contexto              | Canal                         | Auth     | RLS            | Preset            |
| --------------------- | ----------------------------- | -------- | -------------- | ----------------- |
| Studio - Cotizaciones | `studio:{slug}:cotizaciones`  | Opcional | Anónimo + Auth | `cotizaciones()`  |
| Promise Público       | `studio:{slug}:cotizaciones`  | No       | Anónimo        | `cotizaciones()`  |
| Notificaciones        | `studio:{slug}:notifications` | ✅ Sí    | Solo Auth      | `notifications()` |
| Promises              | `studio:{slug}:promises`      | ✅ Sí    | Solo Auth      | `promises()`      |

---

## 📚 Referencias

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Broadcast Changes](https://supabase.com/docs/guides/realtime/broadcast)
- Archivo de reglas: `.cursor/rules/use-realtime.mdc`

---

## 🔄 Versionado

**v2.0.0** - Implementación inicial

- ✅ Utilidad centralizada
- ✅ Hooks refactorizados
- ✅ Políticas RLS actualizadas

**v2.1.0** - Solución Robusta (ACTUAL)

- ✅ Migración completa a `realtime.send`
- ✅ Canales públicos (evita `auth.uid() NULL`)
- ✅ Payloads compatibles
- ✅ Hooks actualizados para soportar ambos formatos

---

**Última actualización:** 2025-01-22  
**Mantenido por:** Equipo de Desarrollo ZEN
