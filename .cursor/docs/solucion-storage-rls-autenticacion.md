# Solución: Error RLS en Storage Uploads y Problemas de Autenticación

**Fecha:** 9 de enero de 2026  
**Problema:** Error `StorageApiError: new row violates row-level security policy` al subir archivos a Supabase Storage  
**Estado:** ✅ Resuelto

---

## 📋 Resumen Ejecutivo

Después de unificar el cliente Supabase a un singleton usando `@supabase/ssr`, se presentaron dos problemas principales:

1. **Error RLS en Storage**: Las políticas RLS no verificaban acceso al studio específico, solo autenticación general
2. **Problemas de autenticación**: Múltiples usuarios en Supabase Auth (email/password y Google OAuth) causaban sesiones desincronizadas

---

## 🔍 Problema Detallado

### Síntomas

- Error al subir archivos: `StorageApiError: new row violates row-level security policy`
- Usuario autenticado correctamente pero sin permisos para subir
- Múltiples usuarios en Supabase Auth con diferentes métodos de autenticación
- Sesiones desincronizadas entre cliente SSR y cliente de Storage

### Contexto Técnico

**Antes:**
- Se usaba `createClient` de `@supabase/supabase-js` directamente en `useMediaUpload.ts`
- Funcionaba correctamente porque leía la sesión de `localStorage`

**Después:**
- Se unificó a singleton usando `createBrowserClient` de `@supabase/ssr`
- El cliente SSR maneja sesiones principalmente con cookies HTTP
- Las políticas RLS solo verificaban `auth.role() = 'authenticated'`, no acceso específico al studio

### Causa Raíz

1. **Políticas RLS insuficientes**: Solo verificaban autenticación general, no acceso al studio específico del path
2. **Múltiples instancias de cliente**: Se creaban dos clientes Supabase que competían por el mismo storage
3. **Sesiones desincronizadas**: El cliente SSR y el cliente de Storage leían sesiones diferentes

---

## ✅ Solución Implementada

### 1. Unificación del Cliente Supabase

**Archivo:** `src/hooks/useMediaUpload.ts`

**Cambio:** Usar directamente el cliente SSR singleton en lugar de crear un cliente separado

```typescript
// ❌ ANTES: Cliente separado que causaba múltiples instancias
const getSupabaseClient = () => {
  const storage = createRememberMeStorage();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, storage: storage }
  });
};

// ✅ DESPUÉS: Usar cliente SSR singleton directamente
const supabase = createBrowserClient();
```

**Beneficios:**
- Evita múltiples instancias de GoTrueClient
- Sesión sincronizada entre toda la aplicación
- Menos código y más mantenible

### 2. Establecimiento Explícito de Sesión

**Archivo:** `src/hooks/useMediaUpload.ts`

**Cambio:** Establecer explícitamente la sesión antes de subir archivos

```typescript
// Verificar que haya sesión antes de subir
let { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (sessionError || !session?.access_token) {
  toast.error("Debes estar autenticado para subir archivos");
  return [];
}

// 🔧 CRÍTICO: Establecer explícitamente la sesión para asegurar que el token se incluya en las requests de Storage
const { error: setSessionError } = await supabase.auth.setSession({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
});

if (setSessionError) {
  console.warn('[useMediaUpload] Error al establecer sesión:', setSessionError);
} else {
  // Re-leer la sesión después de establecerla para asegurar que está sincronizada
  const { data: { session: updatedSession } } = await supabase.auth.getSession();
  if (updatedSession) {
    session = updatedSession;
  }
}
```

**Razón:** El cliente SSR puede no sincronizar automáticamente la sesión en todas las requests de Storage, especialmente después de cambios de autenticación.

### 3. Políticas RLS Mejoradas

**Archivo:** `supabase/migrations/20260109000005_create_storage_helper_function.sql`  
**Archivo:** `supabase/migrations/20260109000006_fix_storage_rls_with_helper.sql`

**Cambio:** Crear función helper y actualizar políticas RLS para verificar acceso específico al studio

#### Función Helper

```sql
CREATE OR REPLACE FUNCTION public.user_has_studio_access(studio_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM studios s
    WHERE s.slug = studio_slug
    AND (
      -- Verificar acceso a través de user_studio_roles
      EXISTS (
        SELECT 1 
        FROM user_studio_roles usr
        JOIN users u ON u.id = usr.user_id
        WHERE u.supabase_id = auth.uid()::text
        AND usr.studio_id = s.id
        AND usr.is_active = true
      )
      -- O verificar acceso a través de studio_user_profiles
      OR EXISTS (
        SELECT 1 
        FROM studio_user_profiles sup
        WHERE sup.supabase_id = auth.uid()::text
        AND sup.studio_id = s.id
        AND sup.is_active = true
      )
    )
  );
$$;
```

#### Política RLS Actualizada

```sql
CREATE POLICY "Allow authenticated users to upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Studio' 
  AND (storage.foldername(name))[1] = 'studios'
  -- Usar función helper para verificar acceso al studio específico
  AND public.user_has_studio_access((storage.foldername(name))[2]::text)
);
```

**Razón:** 
- Las políticas anteriores solo verificaban `auth.role() = 'authenticated'`
- No verificaban que el usuario tuviera acceso al studio específico del path (`studios/{studioSlug}/...`)
- La función helper encapsula la lógica de verificación y soporta múltiples métodos de acceso (user_studio_roles y studio_user_profiles)

### 4. Optimización de Re-renders

**Archivo:** `src/components/profile/sheets/PostEditorSheet.tsx`

**Cambios:**
- Eliminados efectos duplicados para generar slug
- Unificada validación de slug en un solo efecto
- Removida dependencia innecesaria `formData.media.length` de `handleDropFiles`
- Removida dependencia problemática `generateMissingThumbnails` del efecto de carga

---

## 📁 Archivos Modificados

### Código

1. **`src/hooks/useMediaUpload.ts`**
   - Unificado para usar cliente SSR singleton
   - Agregado establecimiento explícito de sesión
   - Limpiados logs de debugging

2. **`src/components/profile/sheets/PostEditorSheet.tsx`**
   - Optimizados efectos para reducir re-renders
   - Limpiados logs de debugging

### Migraciones SQL

1. **`supabase/migrations/20260109000005_create_storage_helper_function.sql`**
   - Crea función `public.user_has_studio_access()` para verificar acceso a studio

2. **`supabase/migrations/20260109000006_fix_storage_rls_with_helper.sql`**
   - Actualiza políticas RLS para usar la función helper
   - Verifica acceso específico al studio del path

### Migraciones de Diagnóstico (No aplicadas en producción)

- `20260109000000_fix_storage_rls_studio_access.sql` - Versión inicial (reemplazada)
- `20260109000001_fix_storage_rls_studio_access_v2.sql` - Versión con fallback (reemplazada)
- `20260109000002_debug_storage_rls.sql` - Queries de diagnóstico
- `20260109000003_fix_storage_rls_simplified.sql` - Política temporal simplificada
- `20260109000004_fix_storage_rls_final.sql` - Versión optimizada (reemplazada)

---

## 🔐 Problema de Autenticación: Múltiples Usuarios

### Contexto

El usuario tenía:
- Cuenta con credenciales: `owner@demo-studio.com`
- Cuenta de Google OAuth: `ing.israel.wong@gmail.com`
- Intentó sincronizar Google Auth con Supabase Auth

### Problema

Supabase Auth **NO vincula automáticamente** cuentas OAuth con cuentas de email/password, incluso si tienen el mismo email. Cada método de autenticación crea un usuario separado en Supabase Auth.

### Solución

1. **Verificación de acceso**: Las políticas RLS ahora verifican acceso a través de `user_studio_roles` O `studio_user_profiles`, independientemente del método de autenticación
2. **Cliente unificado**: Usar el mismo cliente SSR singleton evita sesiones desincronizadas
3. **Establecimiento explícito**: Establecer la sesión explícitamente antes de operaciones críticas asegura que el token se incluya correctamente

### Recomendación Futura

Si se necesita vincular cuentas OAuth con cuentas de email/password:
- Usar `supabase.auth.linkIdentity()` después del login
- O implementar lógica personalizada para vincular usuarios por email

---

## 🧪 Verificación

### Query de Diagnóstico

Para verificar acceso del usuario a un studio:

```sql
-- Verificar acceso del usuario al studio 'prosocial'
SELECT 
  'user_studio_roles' as source,
  u.id as user_id,
  u.email,
  u.supabase_id,
  s.id as studio_id,
  s.slug as studio_slug,
  usr.role,
  usr.is_active
FROM users u
LEFT JOIN user_studio_roles usr ON usr.user_id = u.id
LEFT JOIN studios s ON s.id = usr.studio_id
WHERE u.supabase_id = 'USER_SUPABASE_ID'
  AND s.slug = 'STUDIO_SLUG'
  AND usr.is_active = true

UNION ALL

SELECT 
  'studio_user_profiles' as source,
  u.id as user_id,
  u.email,
  u.supabase_id,
  s.id as studio_id,
  s.slug as studio_slug,
  NULL as role,
  sup.is_active
FROM users u
LEFT JOIN studio_user_profiles sup ON sup.supabase_id = u.supabase_id
LEFT JOIN studios s ON s.id = sup.studio_id
WHERE u.supabase_id = 'USER_SUPABASE_ID'
  AND s.slug = 'STUDIO_SLUG'
  AND sup.is_active = true;
```

### Probar Función Helper

```sql
-- Probar la función helper directamente
SELECT public.user_has_studio_access('STUDIO_SLUG') as has_access;
```

---

## 📝 Notas Importantes

### Storage RLS en Supabase

- Las políticas RLS en Storage tienen limitaciones con subconsultas complejas
- Usar funciones helper (`SECURITY DEFINER`) puede mejorar el rendimiento
- Las funciones helper se ejecutan con privilegios del creador, lo que ayuda con la evaluación

### Cliente SSR vs Cliente JS

- **`@supabase/ssr`**: Maneja sesiones principalmente con cookies HTTP, mejor para SSR
- **`@supabase/supabase-js`**: Lee sesiones de `localStorage`, mejor para client-side puro
- **Recomendación**: Usar cliente SSR singleton en toda la aplicación para consistencia

### Path de Storage

El path de Storage sigue el formato:
```
studios/{studioSlug}/{category}/{subcategory?}/{filename}
```

Ejemplo:
```
studios/prosocial/posts/content/image-1234567890-abc123.jpg
```

La política RLS extrae el `studioSlug` usando `(storage.foldername(name))[2]`.

---

## 🚀 Pasos para Aplicar en Nuevo Entorno

1. **Ejecutar migraciones SQL** (en orden):
   ```sql
   -- 1. Crear función helper
   -- Ejecutar: 20260109000005_create_storage_helper_function.sql
   
   -- 2. Actualizar políticas RLS
   -- Ejecutar: 20260109000006_fix_storage_rls_with_helper.sql
   ```

2. **Verificar que el código use cliente SSR singleton**:
   - `src/hooks/useMediaUpload.ts` debe usar `createBrowserClient()` directamente
   - No crear clientes separados con `createClient` de `@supabase/supabase-js`

3. **Verificar acceso del usuario**:
   - El usuario debe tener registro en `user_studio_roles` O `studio_user_profiles`
   - El registro debe tener `is_active = true`
   - El `studio_id` debe corresponder al `studioSlug` del path

---

## 🔗 Referencias

- [Supabase Storage RLS Documentation](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions)
- [Supabase SSR Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Auth: Linking Accounts](https://supabase.com/docs/guides/auth/auth-deep-dive/auth-deep-dive-jwts#linking-accounts)

---

## 📌 Checklist de Resolución

- [x] Unificado cliente Supabase a singleton SSR
- [x] Agregado establecimiento explícito de sesión antes de uploads
- [x] Creada función helper para verificar acceso a studio
- [x] Actualizadas políticas RLS para verificar acceso específico
- [x] Optimizados re-renders en PostEditorSheet
- [x] Limpiados logs de debugging
- [x] Documentada solución completa

---

**Última actualización:** 9 de enero de 2026

