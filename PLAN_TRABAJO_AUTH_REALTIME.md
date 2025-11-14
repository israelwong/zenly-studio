# Plan de Trabajo: Autenticación Supabase Auth y Realtime

## 🔍 Análisis del Problema Actual

### Problema Principal
Las políticas RLS de Realtime fallan porque:
1. **`studio_user_profiles` no tiene relación directa con `auth.users`**
   - Solo tiene `email` (único)
   - No tiene `supabase_id` o `auth_user_id`
   - Las políticas RLS buscan por email en lugar de usar `auth.uid()`

2. **Flujo de autenticación incompleto**
   - No hay onboarding que cree estudio + usuario en Supabase Auth
   - El proceso actual crea usuarios pero no garantiza la relación correcta
   - `getCurrentUserId` busca por email, no por `supabase_id`

3. **Usuario de prueba funciona** porque:
   - El seed crea usuarios en Supabase Auth correctamente
   - Asocia `users.supabase_id` con `auth.users.id`
   - Pero `studio_user_profiles` sigue sin relación directa

---

## 📋 Plan de Trabajo

### FASE 1: Corregir Relación de Autenticación (CRÍTICO - Para Realtime)

#### 1.1 Agregar `supabase_id` a `studio_user_profiles`
**Objetivo:** Conectar directamente `studio_user_profiles` con `auth.users`

**Cambios necesarios:**
- [ ] Migración: Agregar columna `supabase_id` (UUID, nullable, unique) a `studio_user_profiles`
- [ ] Actualizar Prisma schema: `supabase_id String? @unique @map("supabase_id")`
- [ ] Índice: `@@index([supabase_id])` para performance

**Archivos a modificar:**
- `prisma/schema.prisma` - Agregar campo `supabase_id`
- Nueva migración SQL para agregar columna
- `src/lib/actions/studio/notifications/notifications.actions.ts` - Actualizar `getCurrentUserId`

#### 1.2 Corregir Políticas RLS de Realtime
**Objetivo:** Usar `auth.uid()` directamente en lugar de buscar por email

**Cambios necesarios:**
- [ ] Actualizar política `studio_notifications_can_read_broadcasts`:
  ```sql
  WHERE sup.supabase_id = auth.uid()
  ```
- [ ] Actualizar política `studio_notifications_can_write_broadcasts`:
  ```sql
  WHERE sup.supabase_id = auth.uid()
  ```
- [ ] Agregar índice: `CREATE INDEX idx_studio_user_profiles_supabase_id ON studio_user_profiles(supabase_id)`

**Archivos a modificar:**
- `supabase/migrations/20250120000000_studio_notifications_realtime_trigger.sql`

#### 1.3 Actualizar `getCurrentUserId` para usar `supabase_id`
**Objetivo:** Simplificar la lógica y usar relación directa

**Cambios necesarios:**
- [ ] Obtener `auth.uid()` directamente
- [ ] Buscar `studio_user_profiles` por `supabase_id` en lugar de email
- [ ] Crear perfil si no existe usando `supabase_id`

**Archivos a modificar:**
- `src/lib/actions/studio/notifications/notifications.actions.ts`

---

### FASE 2: Flujo de Onboarding Completo

#### 2.1 Crear Landing Page
**Objetivo:** Página de entrada para prospectos

**Componentes necesarios:**
- [ ] Landing page con CTA "Crea tu cuenta gratis"
- [ ] Ruta: `/` o `/landing` (pública, sin auth)

**Archivos a crear:**
- `src/app/(public)/landing/page.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/CTASection.tsx`

#### 2.2 Crear Onboarding 2 Pasos
**Objetivo:** Proceso de registro que crea estudio + usuario en Supabase Auth

**Paso 1: Datos Básicos**
- [ ] Formulario con: nombre, correo electrónico
- [ ] Validación de email único
- [ ] Ruta: `/onboarding/paso-1`

**Paso 2: Datos del Negocio**
- [ ] Formulario con: nombre del negocio, descripción, logo (opcional)
- [ ] Generar slug único del estudio
- [ ] Ruta: `/onboarding/paso-2`

**Al completar Paso 2:**
1. Crear usuario en Supabase Auth (`supabase.auth.signUp`)
2. Crear registro en `users` con `supabase_id`
3. Crear `studio` con slug generado
4. Crear `studio_user_profiles` con `supabase_id` del usuario
5. Crear `user_studio_roles` (OWNER)
6. Redirigir a `/[slug]/studio`

**Archivos a crear:**
- `src/app/(public)/onboarding/paso-1/page.tsx`
- `src/app/(public)/onboarding/paso-2/page.tsx`
- `src/lib/actions/onboarding/create-studio-account.ts` (Server Action)
- `src/components/onboarding/Step1Form.tsx`
- `src/components/onboarding/Step2Form.tsx`

#### 2.3 Server Action: `createStudioAccount`
**Objetivo:** Centralizar la lógica de creación de cuenta completa

**Funcionalidad:**
```typescript
async function createStudioAccount(data: {
  // Paso 1
  nombre: string;
  email: string;
  password: string;
  // Paso 2
  nombreNegocio: string;
  descripcion?: string;
  logoUrl?: string;
}) {
  // 1. Crear usuario en Supabase Auth
  // 2. Crear registro en users
  // 3. Crear studio
  // 4. Crear studio_user_profiles con supabase_id
  // 5. Crear user_studio_roles
  // 6. Retornar studio slug
}
```

**Archivos a crear:**
- `src/lib/actions/onboarding/create-studio-account.ts`

---

### FASE 3: Actualizar Flujo de Login Existente

#### 3.1 Asegurar que `studio_user_profiles` tenga `supabase_id`
**Objetivo:** Migrar usuarios existentes

**Cambios necesarios:**
- [ ] Script de migración: Actualizar `studio_user_profiles` existentes
  ```sql
  UPDATE studio_user_profiles sup
  SET supabase_id = u.supabase_id
  FROM users u
  WHERE sup.email = u.email
  AND sup.supabase_id IS NULL;
  ```

**Archivos a crear:**
- `supabase/migrations/[timestamp]_add_supabase_id_to_studio_user_profiles.sql`

#### 3.2 Actualizar `getCurrentUserId` para crear perfil si falta
**Objetivo:** Asegurar que siempre exista `studio_user_profiles` con `supabase_id`

**Lógica:**
- Si no existe perfil → crearlo con `supabase_id`
- Si existe pero sin `supabase_id` → actualizarlo

---

### FASE 4: Testing y Validación

#### 4.1 Probar Realtime con usuario nuevo
- [ ] Crear cuenta vía onboarding
- [ ] Verificar que Realtime funciona inmediatamente
- [ ] Crear notificación y verificar que llega en tiempo real

#### 4.2 Probar Realtime con usuario existente
- [ ] Migrar usuario de prueba
- [ ] Verificar que Realtime funciona después de migración
- [ ] Verificar políticas RLS

#### 4.3 Validar flujo completo
- [ ] Landing → Onboarding → Studio
- [ ] Login existente → Studio
- [ ] Verificar que todas las rutas funcionan

---

## 🎯 Prioridades

### CRÍTICO (Hacer primero)
1. ✅ Agregar `supabase_id` a `studio_user_profiles`
2. ✅ Corregir políticas RLS para usar `auth.uid()`
3. ✅ Actualizar `getCurrentUserId` para usar `supabase_id`

### IMPORTANTE (Siguiente)
4. Crear flujo de onboarding completo
5. Migrar usuarios existentes

### NICE TO HAVE (Después)
6. Landing page mejorada
7. Validaciones adicionales en onboarding

---

## 📝 Notas Técnicas

### Relación de Tablas (Después de cambios)
```
auth.users (Supabase Auth)
  ↓ supabase_id
users (tabla principal)
  ↓ user_id
user_studio_roles
  ↓ studio_id
studios
  ↓ studio_id
studio_user_profiles
  ↑ supabase_id (NUEVO - relación directa con auth.users)
```

### Política RLS Corregida
```sql
CREATE POLICY "studio_notifications_can_read_broadcasts" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'studio:%:notifications' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()  -- ← CAMBIO PRINCIPAL
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);
```

---

## ⚠️ Consideraciones

1. **Migración de datos:** Los usuarios existentes necesitan `supabase_id` poblado
2. **Backward compatibility:** Asegurar que usuarios sin `supabase_id` aún funcionen (temporalmente)
3. **Validación:** El onboarding debe validar email único antes de crear cuenta
4. **Slug único:** Generar slug único para estudios durante onboarding
5. **Password:** Requerir contraseña fuerte en onboarding (mínimo 8 caracteres)

---

## 🚀 Orden de Implementación Recomendado

1. **Día 1:** FASE 1 completa (Corregir Realtime)
2. **Día 2:** FASE 2.3 (Server Action de creación)
3. **Día 3:** FASE 2.1 y 2.2 (Onboarding UI)
4. **Día 4:** FASE 3 (Migración y actualización)
5. **Día 5:** FASE 4 (Testing)

---

## ✅ Checklist de Implementación

### FASE 1: Realtime
- [ ] Migración: Agregar `supabase_id` a `studio_user_profiles`
- [ ] Actualizar Prisma schema
- [ ] Corregir políticas RLS
- [ ] Actualizar `getCurrentUserId`
- [ ] Probar Realtime funciona

### FASE 2: Onboarding
- [ ] Landing page
- [ ] Paso 1 del onboarding
- [ ] Paso 2 del onboarding
- [ ] Server Action `createStudioAccount`
- [ ] Integración completa

### FASE 3: Migración
- [ ] Script de migración de usuarios existentes
- [ ] Actualizar lógica de creación de perfiles
- [ ] Validar usuarios existentes funcionan

### FASE 4: Testing
- [ ] Test flujo completo onboarding
- [ ] Test Realtime con usuario nuevo
- [ ] Test Realtime con usuario migrado
- [ ] Test login existente

