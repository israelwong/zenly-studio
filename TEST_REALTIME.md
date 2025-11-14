# Test de Realtime - Verificación

## ✅ Políticas RLS Aplicadas

Las políticas RLS se han aplicado correctamente. Ahora vamos a verificar que Realtime funciona.

## 🧪 Pasos para Verificar

### 1. Verificar que el usuario tiene `supabase_id`

Ejecuta en Supabase SQL Editor:

```sql
SELECT email, supabase_id, studio_id, is_active 
FROM studio_user_profiles 
WHERE supabase_id IS NOT NULL;
```

Deberías ver al menos `owner@demo-studio.com` con su `supabase_id` poblado.

### 2. Verificar políticas RLS creadas

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'messages' 
AND policyname LIKE '%studio_notifications%';
```

Deberías ver 2 políticas:
- `studio_notifications_can_read_broadcasts` (SELECT)
- `studio_notifications_can_write_broadcasts` (INSERT)

### 3. Probar Realtime en el navegador

1. **Inicia sesión:**
   - Email: `owner@demo-studio.com`
   - Password: `Owner123!`
   - URL: `http://localhost:3000/demo-studio/studio`

2. **Abre la consola del navegador** (F12 > Console)

3. **Busca estos logs:**
   ```
   [useStudioNotifications] ✅ Sesión activa encontrada
   [useStudioNotifications] ✅ Autenticación Realtime configurada
   [useStudioNotifications] ✅ Suscrito exitosamente a notificaciones Realtime
   ```

4. **Si ves estos logs, Realtime está funcionando correctamente** ✅

### 4. Probar creación de notificación en tiempo real

Para probar que las notificaciones llegan en tiempo real, puedes:

**Opción A: Crear una notificación manualmente en SQL**

```sql
-- Obtener el studio_id y user_id primero
SELECT id FROM studios WHERE slug = 'demo-studio';
SELECT id FROM studio_user_profiles WHERE email = 'owner@demo-studio.com';

-- Crear notificación de prueba (reemplaza los IDs)
INSERT INTO studio_notifications (
  studio_id,
  user_id,
  type,
  title,
  message,
  category,
  is_active,
  is_read
) VALUES (
  'demo-studio-id',  -- Reemplaza con el studio_id real
  'ID_DEL_USUARIO',  -- Reemplaza con el user_id de studio_user_profiles
  'INFO',
  'Notificación de Prueba',
  'Esta es una notificación de prueba para verificar Realtime',
  'general',
  true,
  false
);
```

**Opción B: Usar la aplicación**

- Crea una promesa, evento, o cualquier acción que genere una notificación
- La notificación debería aparecer automáticamente en el dropdown sin recargar

### 5. Verificar logs en consola

Cuando se cree una notificación, deberías ver en la consola:

```
[useStudioNotifications] 🔔 Evento INSERT recibido: {...}
[useStudioNotifications] ✅ Nueva notificación recibida: {...}
[useStudioNotifications] ➕ Agregando nueva notificación a la lista
[useStudioNotifications] 📈 Incrementando contador de no leídas
```

## 🐛 Troubleshooting

### Si no ves los logs de suscripción:

1. **Verifica que estás autenticado:**
   ```javascript
   // En la consola del navegador
   const supabase = await import('@/lib/supabase/client').then(m => m.createClient());
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Session:', session);
   ```

2. **Verifica que el usuario tiene supabase_id:**
   ```sql
   SELECT email, supabase_id 
   FROM studio_user_profiles 
   WHERE email = 'owner@demo-studio.com';
   ```

3. **Verifica que las políticas RLS están activas:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'messages' 
   AND policyname LIKE '%studio_notifications%';
   ```

### Si ves error "Unauthorized":

1. Verifica que el usuario tiene `supabase_id` poblado
2. Verifica que `studio_id` está correcto en `studio_user_profiles`
3. Verifica que el `slug` del studio coincide con el canal Realtime

### Si no llegan notificaciones en tiempo real:

1. Verifica que el trigger está activo:
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname = 'studio_notifications_realtime_trigger';
   ```

2. Verifica que el trigger se ejecuta:
   ```sql
   -- Crear una notificación y verificar logs
   INSERT INTO studio_notifications (...);
   ```

## ✅ Checklist de Verificación

- [ ] Políticas RLS creadas correctamente
- [ ] Usuario tiene `supabase_id` poblado
- [ ] Logs de suscripción aparecen en consola
- [ ] Notificaciones llegan en tiempo real
- [ ] Contador de no leídas se actualiza automáticamente

## 📝 Notas

- Las políticas RLS solo permiten acceso a usuarios autenticados con `supabase_id` válido
- El canal Realtime es: `studio:{slug}:notifications`
- Los eventos son: `INSERT`, `UPDATE`, `DELETE`
- El trigger se ejecuta automáticamente en cambios a `studio_notifications`

