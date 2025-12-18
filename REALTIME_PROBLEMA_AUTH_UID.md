# Problema: auth.uid() NULL en Realtime RLS Policies

**Fecha:** 2025-12-18  
**Estado:** 🔴 Problema Identificado

---

## 📋 Diagnóstico

### ✅ Lo que funciona:

- Token JWT correcto: `tokenSub: "673b55f9-1053-42a0-bd80-931ad203c1b6"`
- Política RLS funciona en SQL directo: `✅ Acceso PERMITIDO`
- Datos del usuario correctos: `supabase_id` coincide con `auth.uid()`
- `setAuth()` se llama correctamente con token válido

### ❌ Lo que NO funciona:

- Realtime rechaza suscripción: `"Unauthorized: You do not have permissions to read from this Channel topic"`
- `auth.uid()` retorna NULL en el contexto de Realtime al evaluar políticas RLS

---

## 🔍 Causa Raíz

**Problema conocido de Supabase Realtime:** `auth.uid()` puede retornar NULL en el contexto de Realtime incluso cuando:

- El token está configurado con `setAuth()`
- El token es válido y no está expirado
- La política RLS funciona cuando se prueba directamente en SQL

Esto ocurre porque Realtime evalúa las políticas RLS en un contexto diferente al de las consultas SQL normales.

---

## 🛠️ Soluciones Posibles

### Solución 1: Verificar Configuración de Supabase Dashboard ⚠️

1. Ir a **Supabase Dashboard** → **Project Settings** → **Realtime Settings**
2. Verificar configuración:
   - **"Private-only channels"**: Si está habilitado, puede estar bloqueando acceso
   - **"Allow public access"**: Debe estar deshabilitado para canales privados
3. Si "Private-only channels" está habilitado, puede estar causando el problema

### Solución 2: Usar `realtime.send` en lugar de `broadcast_changes` 🔄

**Ventaja:** `realtime.send` no requiere políticas RLS tan estrictas  
**Desventaja:** Requiere cambiar los triggers de la base de datos

**Implementación:**

```sql
-- En lugar de realtime.broadcast_changes
PERFORM realtime.send(
  'studio:' || studio_slug || ':promises',
  'INSERT',
  jsonb_build_object(
    'id', NEW.id,
    'studio_id', NEW.studio_id,
    -- ... otros campos
  ),
  false  -- No requiere canal privado
);
```

### Solución 3: Política RLS más permisiva (TEMPORAL) ⚠️

**Solo para desarrollo/testing:**

```sql
CREATE POLICY "allow_promises_broadcasts_dev" ON realtime.messages
FOR SELECT TO authenticated
USING (topic LIKE 'studio:%:promises');
```

**⚠️ ADVERTENCIA:** Esto permite acceso a TODOS los usuarios autenticados, no solo del studio. Solo usar para testing.

### Solución 4: Esperar más tiempo después de setAuth() ⏳

Aumentar el tiempo de espera después de `setAuth()`:

```typescript
await supabase.realtime.setAuth(accessToken);
await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 segundo
```

---

## 🧪 Pruebas Realizadas

### Test 1: Política RLS Directa ✅

```sql
SELECT * FROM test_realtime_policy_as_user('owner@demo-studio.com', 'studio:demo-studio:promises');
-- Resultado: ✅ PERMITIDO
```

### Test 2: Verificación de Datos ✅

```sql
-- Verificación directa
-- Resultado: ✅ supabase_id coincide con auth_user_id
```

### Test 3: Suscripción desde Cliente ❌

```javascript
// Resultado: ❌ "Unauthorized"
// auth.uid() retorna NULL en contexto de Realtime
```

---

## 📝 Próximos Pasos Recomendados

1. **Verificar configuración de Supabase Dashboard** (Solución 1)
   - Es la causa más probable
   - No requiere cambios de código

2. **Si Solución 1 no funciona, considerar Solución 2**
   - Cambiar triggers a `realtime.send`
   - Más trabajo pero más confiable

3. **Como último recurso, Solución 3 (solo dev)**
   - Política permisiva temporal
   - Para poder continuar desarrollo mientras se resuelve

---

## 🔗 Referencias

- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [GitHub Issue: auth.uid() returns null in Realtime](https://github.com/supabase/supabase/issues/37320)
- [Supabase Realtime RLS Policies](https://supabase.com/docs/guides/realtime/broadcast)

---

**Última actualización:** 2025-12-18
