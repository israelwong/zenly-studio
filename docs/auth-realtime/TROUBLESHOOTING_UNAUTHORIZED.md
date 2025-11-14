# Troubleshooting: Error "Unauthorized" en Realtime

## 🔴 Error
```
Unauthorized: You do not have permissions to read from this Channel topic: studio:demo-studio:notifications
```

## 🔍 Pasos de Diagnóstico

### Paso 1: Verificar que las políticas RLS existen

Ejecuta en Supabase SQL Editor:

```sql
SELECT policyname, cmd, qual::text 
FROM pg_policies 
WHERE tablename = 'messages' 
AND policyname LIKE '%studio_notifications%';
```

**Resultado esperado:** Deberías ver 2 políticas:
- `studio_notifications_can_read_broadcasts` (SELECT)
- `studio_notifications_can_write_broadcasts` (INSERT)

**Si no aparecen:** Ejecuta `VERIFICAR_POLITICAS_RLS.sql` completo.

---

### Paso 2: Verificar que el usuario tiene `supabase_id`

Ejecuta en Supabase SQL Editor (reemplaza el email con el tuyo):

```sql
SELECT 
    email,
    supabase_id,
    studio_id,
    is_active
FROM studio_user_profiles 
WHERE email = 'owner@demo-studio.com';
```

**Resultado esperado:**
- `supabase_id` NO debe ser NULL
- `studio_id` debe coincidir con el studio que estás usando
- `is_active` debe ser `true`

**Si `supabase_id` es NULL:**
1. Ejecuta el script de migración: `npx tsx prisma/migrate-existing-users.ts`
2. O ejecuta manualmente:
```sql
UPDATE studio_user_profiles sup
SET supabase_id = u.supabase_id
FROM users u
WHERE sup.email = u.email
AND sup.supabase_id IS NULL;
```

---

### Paso 3: Verificar que `supabase_id` coincide con `auth.uid()`

Ejecuta en Supabase SQL Editor:

```sql
SELECT 
    sup.email,
    sup.supabase_id,
    au.id as auth_user_id,
    CASE 
        WHEN au.id::text = sup.supabase_id THEN '✅ Coincide'
        ELSE '❌ No coincide - PROBLEMA'
    END as verificacion
FROM studio_user_profiles sup
LEFT JOIN auth.users au ON au.email = sup.email
WHERE sup.email = 'owner@demo-studio.com';
```

**Resultado esperado:** "✅ Coincide"

**Si no coincide:**
- El `supabase_id` está mal poblado
- Ejecuta el script de migración nuevamente
- O actualiza manualmente:
```sql
UPDATE studio_user_profiles sup
SET supabase_id = au.id::text
FROM auth.users au
WHERE sup.email = au.email
AND sup.supabase_id != au.id::text;
```

---

### Paso 4: Probar la política manualmente

Ejecuta en Supabase SQL Editor (como el usuario autenticado):

```sql
-- Esto simula lo que hace la política RLS
SELECT 
    'studio:demo-studio:notifications' as topic,
    auth.uid()::text as mi_auth_uid,
    EXISTS (
        SELECT 1 FROM studio_user_profiles sup
        JOIN studios s ON s.id = sup.studio_id
        WHERE sup.supabase_id = auth.uid()::text
        AND sup.is_active = true
        AND s.slug = 'demo-studio'
    ) as tengo_acceso;
```

**Resultado esperado:** `tengo_acceso` debe ser `true`

**Si es `false`:**
- Verifica que el `supabase_id` en `studio_user_profiles` coincide con `auth.uid()`
- Verifica que `is_active = true`
- Verifica que el `slug` del studio es correcto

---

### Paso 5: Verificar logs en el navegador

Abre la consola del navegador (F12) y busca estos logs:

1. **Sesión activa:**
```
[useStudioNotifications] ✅ Sesión activa encontrada: { userId: "...", email: "..." }
```

2. **Perfil encontrado:**
```
[useStudioNotifications] 📋 Perfil encontrado: { hasSupabaseId: true, supabaseIdMatch: true }
```

3. **Error de autorización:**
```
[useStudioNotifications] 🔴 ERROR DE AUTORIZACIÓN RLS
```

**Si ves el error de autorización:**
- Revisa los pasos anteriores
- Verifica que las políticas RLS están aplicadas
- Verifica que el usuario tiene `supabase_id` correcto

---

### Paso 6: Recrear políticas RLS (si todo lo anterior falla)

Ejecuta en Supabase SQL Editor:

```sql
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "studio_notifications_can_read_broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "studio_notifications_can_write_broadcasts" ON realtime.messages;

-- Crear políticas nuevamente
CREATE POLICY "studio_notifications_can_read_broadcasts" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'studio:%:notifications' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);

CREATE POLICY "studio_notifications_can_write_broadcasts" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  topic LIKE 'studio:%:notifications' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);
```

---

## ✅ Checklist de Verificación

Antes de reportar el problema, verifica:

- [ ] Políticas RLS existen en `realtime.messages`
- [ ] Usuario tiene `supabase_id` en `studio_user_profiles`
- [ ] `supabase_id` coincide con `auth.users.id`
- [ ] `is_active = true` en `studio_user_profiles`
- [ ] `studio_id` es correcto en `studio_user_profiles`
- [ ] El `slug` del studio es correcto
- [ ] La prueba manual de la política devuelve `true`
- [ ] Logs en consola muestran sesión activa

---

## 🐛 Problemas Comunes

### Problema 1: `supabase_id` es NULL
**Solución:** Ejecuta `npx tsx prisma/migrate-existing-users.ts`

### Problema 2: `supabase_id` no coincide con `auth.uid()`
**Solución:** Actualiza manualmente con el SQL del Paso 3

### Problema 3: Políticas RLS no existen
**Solución:** Ejecuta `VERIFICAR_POLITICAS_RLS.sql` completo

### Problema 4: Usuario no tiene acceso al studio
**Solución:** Verifica `user_studio_roles` y ejecuta `getCurrentUserId` para crear el perfil

---

## 📞 Si el problema persiste

1. Ejecuta `DIAGNOSTICO_REALTIME.sql` completo
2. Copia todos los resultados
3. Revisa los logs de la consola del navegador
4. Verifica que estás usando el usuario correcto (`owner@demo-studio.com`)

