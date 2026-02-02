# Auditoría: Scopes y Simulación de Identidad OAuth

**Objetivo:** Verificar que la "llave" de Google encaje en la "cerradura" de la base de datos sin permisos innecesarios y que el mapeo de identidad sea correcto.

---

## 1. Auditoría de Scopes en Código

### LoginForm.tsx

- **Llamada:** `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
- **Scopes explícitos:** Ninguno. No se pasa `scopes` en `options`.
- **Comportamiento:** Supabase usa por defecto los scopes básicos de Google para identidad: **email** y **profile** (nombre, imagen).
- **Conclusión:** ✅ Correcto. No se piden scopes de Drive ni Calendar en el login.

### oauth.actions.ts

- **Login OAuth:** No se invoca `signInWithOAuth` aquí; solo se procesa el usuario tras el callback. Los scopes del login se definen únicamente en `LoginForm.tsx`.
- **vincularRecursoGoogle / iniciarVinculacionRecursoGoogle:** Usan scopes de Drive y Calendar solo para el flujo de **vinculación de recurso** (conectar Calendar/Drive a un estudio), no para el inicio de sesión.
- **Conclusión:** ✅ Los scopes de Drive/Calendar están aislados al flujo de integraciones, no al login.

**Regla cumplida:** Para inicio de sesión solo se usan email y profile. Drive y Calendar no se piden en esta etapa.

---

## 2. Simulación del Objeto de Usuario (user_metadata → users)

### Origen de datos

- `user`: objeto `User` de Supabase Auth (tras `exchangeCodeForSession`).
- `user.user_metadata`: rellenado por Google con los scopes **email** y **profile**.

### Mapeo en `procesarUsuarioOAuth`

| Campo en `users` | Origen en `user` / `user_metadata` | Código |
|------------------|-----------------------------------|--------|
| **email** | `user.email` (Supabase lo normaliza desde Google) | `const email = user.email` |
| **full_name** | `user_metadata.full_name` \|\| `user_metadata.name` \|\| `user_metadata.display_name` \|\| `email.split('@')[0]` | Líneas 71-75 |
| **avatar_url** | `user_metadata.avatar_url` \|\| `user_metadata.picture` \|\| `null` | Línea 76 |
| **email_verified** | `user.email_confirmed_at` (Supabase) | En `update`/`create`: `user.email_confirmed_at ? true : undefined` |
| **supabase_id** | `user.id` | `const supabaseId = user.id` |

### Nombres que devuelve Google con scope profile

Con solo **email** y **profile**, Google suele enviar en el id_token / user_metadata:

- `name` o `full_name`: nombre completo
- `picture` o `avatar_url`: URL de la foto
- `email`: correo (también en `user.email`)

El código contempla `full_name`, `name`, `display_name` y `avatar_url`, `picture`, por lo que el mapeo es robusto frente a variaciones de nombres de campo.

---

## 3. Verificación de la "Fusión" de Cuentas

### Escenario

Usuario ya existe en `users` con **email** (creado con contraseña, `supabase_id` = A). Entra con Google y Supabase devuelve el mismo **email** pero **supabase_id** = B.

### Comportamiento anterior (bug)

- Se hacía `users.upsert({ where: { supabase_id: B }, create: { ... } })`.
- No existía fila con `supabase_id = B`, así que se ejecutaba **create** con el mismo `email` → violación de UNIQUE en `email` y fallo.

### Comportamiento actual (corregido)

Dentro de la transacción:

1. **users**
   - Si existe fila con `supabase_id = supabaseId` → **update** (nombre, avatar, email_verified).
   - Si no, pero existe fila con `email` → **update** de esa fila: se asigna el nuevo `supabase_id` (B) y se actualizan nombre/avatar/email_verified. **Fusión correcta.**
   - Si no existe por supabase_id ni por email → **create** (solo para casos permitidos por la política de “solo existentes”, p. ej. usuario solo en `studio_user_profiles`).

2. **studio_user_profiles**
   - Si existe perfil por **email** (`existingLegacy`) → **update** de ese perfil: se setea `supabase_id`, `full_name`, `avatar_url`, `email`. Evita duplicados por email.
   - Si no existe por email pero sí por `supabase_id` → **update**.
   - Si no existe ni por email ni por supabase_id → **create**.

**Conclusión:** ✅ Si el usuario ya existe en `users` por email (creado con contraseña), la lógica actual **vincula** el nuevo `supabase_id` de Google al registro existente y no crea uno duplicado.

---

## 4. Mapeo de Roles Post-OAuth

### Dónde se determina el estudio

En `procesarUsuarioOAuth`, tras asegurar el usuario en `users` y `studio_user_profiles`:

1. Se obtiene `dbUser` con `prisma.users.findUnique({ where: { supabase_id: supabaseId }, select: { id: true } })`.
2. Se consulta **user_studio_roles**:
   - `user_studio_roles.findFirst({ where: { user_id: dbUser.id, is_active: true }, include: { studio: { select: { id, slug, google_oauth_refresh_token } } }, orderBy: { accepted_at: 'desc' } })`.

### Criterio cuando hay varios estudios

- **Orden:** `accepted_at: 'desc'`.
- **Significado:** Se elige el estudio con el rol activo más recientemente **aceptado** (último studio con el que el usuario aceptó/activó su rol).
- **Redirección:** `redirectPath = \`/${studioRole.studio.slug}/studio\`` (y `studioSlug` en el resultado).

**Nota:** La metadata de Supabase (`user_metadata.studio_slug`, `role`) no se actualiza en este flujo desde `oauth.actions.ts`. Esa actualización ocurre en otros puntos (p. ej. signup/onboarding o al cambiar de estudio). El redirect post-OAuth se basa directamente en la consulta a `user_studio_roles`, no en la metadata actual del JWT.

**Resumen:** ✅ Tras un login OAuth exitoso, el sistema usa **user_studio_roles** para decidir a qué estudio enviar al usuario. Con varios estudios, el criterio es **el rol activo con `accepted_at` más reciente**.

---

## 5. Cambios Realizados en Esta Auditoría

- **Fusión de cuentas en `procesarUsuarioOAuth`:**
  - En **users:** si existe por email pero no por `supabase_id`, se actualiza esa fila con el nuevo `supabase_id` (y datos de perfil) en lugar de hacer upsert solo por `supabase_id` (que provocaba create y error de UNIQUE).
  - En **studio_user_profiles:** si existe perfil por email, siempre se actualiza ese registro (incl. `supabase_id`) para alinearlo con la fusión en `users` y evitar duplicados.

---

## Referencia rápida

| Tema | Estado |
|------|--------|
| Scopes en login (solo email + profile) | ✅ |
| Mapeo user_metadata → users (full_name, avatar_url, email) | ✅ |
| Fusión cuenta contraseña + Google (mismo email) | ✅ Corregido |
| Estudio elegido vía user_studio_roles | ✅ |
| Criterio multi-estudio | `accepted_at: 'desc'` |
