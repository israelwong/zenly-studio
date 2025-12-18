# Solución Alternativa: Realtime con realtime.send

**Fecha:** 2025-12-18  
**Estado:** 🔄 Solución Alternativa

---

## 🔍 Problema Actual

`auth.uid()` retorna NULL en el contexto de Realtime al evaluar políticas RLS, incluso cuando:

- ✅ El token está configurado correctamente
- ✅ La política funciona en SQL directo
- ✅ Los datos del usuario son correctos

---

## 🛠️ Solución Alternativa: Usar `realtime.send`

En lugar de `realtime.broadcast_changes` (que requiere políticas RLS estrictas), usar `realtime.send` que:

- ✅ No requiere políticas RLS tan estrictas
- ✅ Funciona con canales públicos y privados
- ✅ Permite payloads personalizados

---

## 📝 Implementación

### Paso 1: Actualizar Trigger de Promises

**Archivo:** `supabase/migrations/20250122000023_use_realtime_send_promises.sql`

**Ejecutar en Supabase SQL Editor:**

Ver el archivo: `supabase/migrations/20250122000023_use_realtime_send_promises.sql`

**Ejecutar en Supabase SQL Editor**

### Paso 2: Actualizar Cliente (YA HECHO)

**Cambios en `usePromisesRealtime.ts`:**

- ✅ Agregado listener genérico para eventos de `realtime.send`
- ✅ Handlers actualizados para soportar múltiples formatos de payload
- ✅ Compatible con `broadcast_changes` y `realtime.send`

**No se requieren cambios adicionales en el cliente.**

---

## ⚠️ Consideraciones

1. **Formato de payload compatible**: El trigger construye payload compatible con formato de `broadcast_changes`
2. **Listeners ya actualizados**: Los handlers soportan ambos formatos automáticamente
3. **Canales públicos**: `realtime.send` con `false` permite usar canales públicos, evitando problemas de RLS

## ✅ Ventajas de esta Solución

- ✅ No requiere políticas RLS complejas
- ✅ Funciona con canales públicos o privados
- ✅ Payload compatible con código existente
- ✅ No requiere cambios en el cliente (ya actualizado)

---

## 🎯 Cuándo Usar Esta Solución

- ✅ Si `auth.uid()` sigue retornando NULL después de todas las pruebas
- ✅ Si las políticas RLS no funcionan en Realtime
- ✅ Si necesitas payloads más personalizados

---

## 📚 Referencias

- [Supabase Realtime.send](https://supabase.com/docs/guides/realtime/broadcast#realtime.send)
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)

---

**Última actualización:** 2025-12-18
