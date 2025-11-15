# 🔧 FIX: Error CHANNEL_ERROR en Notificaciones Realtime

## ❌ ERROR

```
[useStudioNotifications] Error en canal: undefined
CHANNEL_ERROR
```

## 🔍 CAUSA

La tabla `studio_notifications` **NO tiene RLS habilitado** ni políticas configuradas.

Cuando el hook intenta suscribirse a un canal privado (`private: true`), Realtime requiere:
1. ✅ RLS habilitado en la tabla
2. ✅ Políticas que permitan SELECT
3. ✅ Tabla agregada a `supabase_realtime` publication

**Actualmente:**
- ❌ No hay RLS en `studio_notifications`
- ❌ No hay políticas
- ❌ No está en publication de Realtime

---

## ✅ SOLUCIÓN

### Ejecutar SQL en Supabase Dashboard

**Archivo:** `scripts/fix-studio-notifications-rls.sql`

**Pasos:**
1. Supabase Dashboard → SQL Editor → New Query
2. Copiar contenido de `scripts/fix-studio-notifications-rls.sql`
3. RUN
4. Verificar resultado de las queries de verificación

---

## 📝 QUÉ HACE EL SQL

### 1. Habilitar RLS
```sql
ALTER TABLE studio_notifications ENABLE ROW LEVEL SECURITY;
```

### 2. Políticas

**Lectura (SELECT):**
```sql
CREATE POLICY "studio_notifications_read_own" ON studio_notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid()::text);
```
- Usuarios solo leen **sus propias** notificaciones

**Actualización (UPDATE):**
```sql
CREATE POLICY "studio_notifications_update_own" ON studio_notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid()::text);
```
- Usuarios solo actualizan **sus propias** notificaciones

**Inserción (INSERT):**
```sql
CREATE POLICY "studio_notifications_insert_system" ON studio_notifications
FOR INSERT TO authenticated
WITH CHECK (true);
```
- Permitir que el sistema cree notificaciones

### 3. Habilitar Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE studio_notifications;
```
- Agregar tabla a la publicación de Realtime

---

## 🧪 VERIFICACIÓN

Después de ejecutar el SQL, verifica:

### 1. Políticas creadas
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'studio_notifications';
```

**Resultado esperado:**
```
studio_notifications_read_own      | SELECT
studio_notifications_update_own    | UPDATE
studio_notifications_insert_system | INSERT
```

### 2. Realtime habilitado
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'studio_notifications';
```

**Resultado esperado:**
```
studio_notifications
```

### 3. Probar en UI

Refrescar el navegador y verificar console:
```
✅ [useStudioNotifications] ✅ Suscrito exitosamente a notificaciones Realtime
```

---

## 🔄 FLUJO CORRECTO

**Antes (error):**
```
Hook intenta suscribirse → CHANNEL_ERROR → undefined
```

**Después (correcto):**
```
1. Hook se suscribe al canal privado
2. Realtime verifica RLS policies
3. User tiene permiso (policy: user_id = auth.uid())
4. ✅ SUBSCRIBED
5. Recibe notificaciones en tiempo real
```

---

## 📚 REFERENCIAS

- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)

---

**Ejecuta el SQL y las notificaciones funcionarán! 🚀**

