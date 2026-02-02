# Auditoría: Esquema Prisma, Identidad, Estudios y Multi-tenencia

**Objetivo:** Entender la arquitectura de datos actual y la separación entre Administrador (plataforma) y Suscriptores (estudios).

**Fuente:** `prisma/schema.prisma` + código de auth/signup/proxy.

**Fecha:** 2026-01-31

---

## 1. Definición de tablas clave

### 1.1 `users`

```prisma
model users {
  id                String                  @id @default(cuid())
  supabase_id       String                  @unique   // ← Enlace con Supabase Auth
  email             String                  @unique
  full_name         String?
  avatar_url        String?
  phone             String?
  is_active         Boolean                 @default(true)
  email_verified    Boolean                 @default(false)
  created_at        DateTime                @default(now())
  updated_at        DateTime                @updatedAt
  access_logs       user_access_logs[]
  platform_roles    user_platform_roles[]   // ← Rol a nivel plataforma
  security_settings user_security_settings?
  studio_roles      user_studio_roles[]     // ← Vinculación usuario ↔ estudio(s)

  @@index([email])
  @@index([supabase_id])
  @@index([is_active])
}
```

- **Identidad global:** Una fila por persona que puede iniciar sesión (Supabase Auth → `supabase_id`).
- **Sin `studio_id`:** El usuario no “pertenece” a un solo estudio; la relación es N:M vía `user_studio_roles`.

---

### 1.2 `studios`

```prisma
model studios {
  id                          String    @id @default(cuid())
  studio_name                  String
  slug                        String    @unique
  email                       String    @unique
  // ... stripe, subscription, etc. ...
  google_oauth_refresh_token  String?
  google_oauth_email           String?
  google_oauth_scopes         String?
  is_google_connected          Boolean   @default(false)
  google_integrations_config   Json?
  google_calendar_secondary_id String?
  google_oauth_name            String?
  // ... relaciones ...
}
```

- **Contenedor del estudio:** Toda la configuración comercial, suscripción y **integraciones Google** está en `studios`.
- **Integraciones Google:** Confirmado: `google_oauth_*` y `google_integrations_config` solo existen en `studios`. No hay tokens Google a nivel `users` ni en otras tablas para este flujo.

---

### 1.3 `user_studio_roles`

```prisma
model user_studio_roles {
  id                        String     @id @default(cuid())
  user_id                   String     // → users.id
  studio_id                 String     // → studios.id
  role                      StudioRole
  permissions               Json?
  is_active                 Boolean    @default(true)
  invited_at                DateTime   @default(now())
  invited_by                String?
  accepted_at               DateTime?
  revoked_at                DateTime?
  google_contact_id         String?
  studio                    studios    @relation(...)
  user                      users      @relation(...)

  @@unique([user_id, studio_id, role])
  @@index([user_id, is_active])
  @@index([studio_id, is_active])
  @@index([user_id, studio_id, is_active])
}
```

- **Vinculación usuario ↔ estudio:** Un usuario puede tener varias filas (uno o más roles por estudio).
- **Quién entra a qué estudio:** La lógica de “redirect tras login” y “acceso a /[slug]/studio” usa esta tabla (vía `users` + `user_studio_roles`) y/o `user_metadata.studio_slug` en Supabase (ver proxy).

---

### 1.4 `user_platform_roles`

```prisma
model user_platform_roles {
  id         String       @id @default(cuid())
  user_id    String       // → users.id
  role       PlatformRole
  is_active  Boolean      @default(true)
  granted_at DateTime     @default(now())
  granted_by String?
  revoked_at DateTime?
  user       users        @relation(...)

  @@unique([user_id, role])
  @@index([user_id, is_active])
  @@index([role, is_active])
}
```

- **Sin `studio_id`:** Rol a nivel **plataforma** (admin, agente, suscriptor), no por estudio.
- **Enum:** `PlatformRole`: SUPER_ADMIN, AGENTE, SUSCRIPTOR.

---

### 1.5 `studio_user_profiles`

```prisma
model studio_user_profiles {
  id            String    @id @default(cuid())
  email         String    @unique
  supabase_id   String?   @unique
  role          UserRole  // ← UserRole (SUPER_ADMIN | AGENTE | SUSCRIPTOR | ...)
  studio_id      String?
  avatar_url    String?
  full_name     String?
  is_active     Boolean   @default(true)
  // ... relaciones a platform_activities, notifications, etc. ...
  studio        studios?  @relation(...)

  @@index([email])
  @@index([supabase_id])
  @@index([role])
  @@index([studio_id])
}
```

- **Doble uso:** Perfil por email/supabase_id con rol de **plataforma** (`UserRole`) y opcionalmente `studio_id`. Usado en signup (createAuthUser crea aquí con role SUSCRIPTOR), notificaciones, bitácora de leads, etc.
- **No es la tabla de acceso a estudios:** El acceso a “qué estudio puede ver este usuario” está en `user_studio_roles` (y en metadata `studio_slug` en el proxy). `studio_user_profiles.studio_id` se actualiza en onboarding pero no se usa en proxy para autorizar rutas.

---

## 2. Relación identidad vs estudio

### 2.1 Cómo se vincula un usuario a uno o varios estudios

| Mecanismo | Tabla / Origen | Uso en código |
|-----------|----------------|---------------|
| **Rol por estudio** | `user_studio_roles` (user_id, studio_id, role) | `procesarUsuarioOAuth`: redirect a `/{slug}/studio` según primer `user_studio_roles` activo. Integraciones Google, notificaciones, etc. |
| **Metadata de sesión** | Supabase Auth `user_metadata.studio_slug` | Proxy: suscriptor/studio_owner solo puede entrar a `/[studio_slug]/studio` si `studio_slug === user_metadata.studio_slug`. |
| **Perfil legacy** | `studio_user_profiles.studio_id` | Signup/onboarding actualiza este campo; no se usa en proxy para decidir acceso a ruta. |

Conclusión: **La vinculación “oficial” es `user_studio_roles`.** El proxy hoy depende de `user_metadata.studio_slug` (que se escribe en onboarding), no de una consulta a `user_studio_roles`. Si un usuario tiene varios estudios en `user_studio_roles`, el redirect post-login usa el primero encontrado; el proxy solo permite el slug que está en metadata.

### 2.2 ¿`studios` es el contenedor único de integraciones Google?

**Sí.** En el esquema:

- Tokens y config Google están solo en `studios`: `google_oauth_refresh_token`, `google_oauth_email`, `google_oauth_scopes`, `google_oauth_name`, `is_google_connected`, `google_integrations_config`, `google_calendar_secondary_id`.
- `platform_config` tiene solo client id/secret/redirect (config global OAuth).
- No hay campos de integración Google en `users`, `user_platform_roles`, `user_studio_roles` ni `studio_user_profiles`.

---

## 3. Diferenciación de roles

### 3.1 PlatformRole (tabla `user_platform_roles`)

- **Alcance:** Toda la plataforma (sin `studio_id`).
- **Valores:** SUPER_ADMIN, AGENTE, SUSCRIPTOR.
- **Uso en proxy:** `user_metadata.role` (string: `super_admin`, `agente`, `suscriptor`, `studio_owner`).  
  - `super_admin` → acceso total.  
  - `agente` → solo rutas `/agente`.  
  - `suscriptor` / `studio_owner` → solo rutas `/[slug]/studio` y `/[slug]/profile/edit`, y solo si el slug coincide con `user_metadata.studio_slug`.

### 3.2 StudioRole (tabla `user_studio_roles`)

- **Alcance:** Un estudio concreto (`studio_id`).
- **Valores:** OWNER, ADMIN, MANAGER, PHOTOGRAPHER, EDITOR, ASSISTANT, PROVIDER, CLIENT.
- **Uso:** Integraciones Google (OWNER/ADMIN para conectar/desconectar), notificaciones por estudio, tareas/eventos asignados, etc. **No** se usa en el proxy para permitir o denegar `/[slug]/studio`; el proxy solo mira `user_metadata.role` y `user_metadata.studio_slug`.

### 3.3 UserRole (en `studio_user_profiles` y `platform_user_profiles`)

- **Alcance:** Perfil de usuario (plataforma o “legacy” por estudio).
- **Valores:** Incluye SUPER_ADMIN, AGENTE, SUSCRIPTOR, PERSONAL_SUSCRIPTOR, CLIENTE_SUSCRIPTOR.
- **Uso:** Signup asigna SUSCRIPTOR; notificaciones y actividades; no sustituye la comprobación de acceso a estudio en proxy.

Resumen: **PlatformRole** = qué tipo de usuario es en la plataforma (admin/agente/suscriptor). **StudioRole** = qué rol tiene dentro de un estudio concreto (owner, admin, fotógrafo, etc.). **UserRole** = usado en perfiles (studio_user_profiles/platform_user_profiles), alineado conceptualmente con “tipo de cuenta” en la plataforma.

---

## 4. Multi-tenencia (aislamiento de datos)

### 4.1 Patrón en el esquema

- Casi todas las tablas de negocio del estudio tienen **`studio_id`** y relación a `studios` (condiciones comerciales, cotizaciones, promesas, eventos, contactos, items, etc.).
- Las consultas en server actions suelen filtrar por `studio_id` o por `slug` (que resuelve a un único `studios.id`).
- No hay `studio_id` en `users` ni en `user_platform_roles`, por diseño: el aislamiento es “cada recurso pertenece a un estudio”, no “cada usuario pertenece a un estudio”.

### 4.2 ¿Un estudio puede acceder a datos de otro?

- **En el esquema:** No. No hay FK ni relaciones que permitan que un `studio_id` apunte a datos de otro estudio; cada fila tiene un solo `studio_id`.
- **En la aplicación:** Depende de que todas las lecturas/escrituras pasen por `studio_id` (o slug → studio_id) y que el middleware/actions comprueben que el usuario tiene permiso para **ese** estudio (hoy vía metadata; idealmente vía `user_studio_roles`). El proxy actual restringe el slug al `studio_slug` del usuario, lo que aísla por estudio en la ruta; falta consolidar que ese slug provenga siempre de una comprobación contra `user_studio_roles` para evitar desajustes.

---

## 5. Reporte de auditoría: SUPER_ADMIN vs SUSCRIPTOR al crear estudio

### 5.1 Flujo actual de creación de estudio

- **Origen:** `createStudioAndSubscription(userId, data)` en `signup.actions.ts`.
- **Llamada típica:** Usuario ya autenticado (Supabase Auth), desde `setup-studio` (onboarding), con `userId = supabase_id`.

Pasos relevantes en código:

1. Comprobar si se permiten nuevos estudios (`areNewStudiosAllowed()`).
2. Comprobar que el slug no exista (`studios.findUnique`).
3. **Crear studio:** `prisma.studios.create({ data: { name, slug, slogan, logo_url, is_active } })`.  
  - **Inconsistencia con el esquema:** En Prisma el modelo tiene `studio_name` y `email` (obligatorios). El código usa `name` (no existe en el modelo) y no envía `email`. Esto provocaría error en runtime a menos que exista otro flujo o que el esquema haya sido distinto en el pasado.
4. **Actualizar perfiles:** `studio_user_profiles.updateMany({ where: { supabase_id: userId }, data: { studio_id: studio.id } })`.  
  - Solo tiene efecto si ya existe un `studio_user_profiles` con ese `supabase_id` (p. ej. creado en `createAuthUser` o en `procesarUsuarioOAuth`).
5. Crear suscripción FREE, `studio_modules` (módulos core), métodos de pago sembrados, aviso de privacidad.
6. **Actualizar metadata:** `supabase.auth.updateUser({ data: { studio_slug: validated.studio_slug } })`.  
  - Es lo que el proxy usa para permitir acceso a `/[slug]/studio`.

**No se crea:**

- Ningún registro en `user_studio_roles` (no se asigna StudioRole OWNER al usuario en este estudio).
- Ningún registro en `user_platform_roles` (no se asigna PlatformRole SUSCRIPTOR en este flujo; el rol de plataforma viene de metadata o de otro flujo).

### 5.2 ¿Qué pasa cuando un SUPER_ADMIN crea un estudio?

- **En el código actual:** No hay rama específica para SUPER_ADMIN en `createStudioAndSubscription`. Cualquier usuario que llegue a esta acción (con `userId` de Supabase) sigue el mismo flujo: crear studio, actualizar `studio_user_profiles`, crear suscripción y módulos, actualizar `user_metadata.studio_slug`.
- **En la base de datos:**  
  - Se crea una fila en `studios`.  
  - Se actualiza `studio_user_profiles` del usuario con `studio_id` del nuevo estudio (si ya tenía perfil).  
  - **No** se crea `user_studio_roles` (por tanto, no hay OWNER explícito en BD para ese estudio).  
  - **No** se crea ni actualiza `user_platform_roles` en esta función.
- **Diferencia de comportamiento:** Si Israel (SUPER_ADMIN) y un suscriptor usan el mismo formulario de setup-studio, ambos ejecutan la misma lógica. La única diferencia sería:
  - Quién está autenticado (`user_metadata.role` = super_admin vs suscriptor).
  - En proxy: SUPER_ADMIN puede entrar a **cualquier** `/[slug]/studio` porque `checkRouteAccess('super_admin', pathname)` devuelve `true` para todo. El suscriptor solo puede entrar al `/[slug]/studio` cuyo slug coincida con su `user_metadata.studio_slug`.

### 5.3 ¿Cómo se diferencia de un SUSCRIPTOR estándar?

| Aspecto | SUPER_ADMIN | SUSCRIPTOR |
|--------|-------------|------------|
| **Crear estudio** | Mismo `createStudioAndSubscription`; mismo resultado en BD. | Igual. |
| **Acceso a rutas** | Proxy: puede acceder a cualquier path (admin, agente, **cualquier** slug/studio). | Solo `/agente` denegado; solo `/[slug]/studio` y `/[slug]/profile/edit` donde `slug === user_metadata.studio_slug`. |
| **Origen del rol** | Debe tener `user_metadata.role === 'super_admin'` (o equivalente); típicamente asignado fuera de este flujo, no en signup.actions). | Signup/oauth suelen dejar `suscriptor` / `studio_owner` en metadata; no se escribe `user_platform_roles` en createStudioAndSubscription. |

Conclusión: La **separación** entre Administrador y Suscriptor se hace en el **proxy** (y en lógica que use `user_metadata.role` o `user_platform_roles`), no en el flujo de creación de estudio. La BD no distingue “quién” creó el estudio; solo que existe un `studios` y que el usuario tiene su metadata actualizada. Para que quede trazabilidad y control por rol, convendría:

- Crear `user_studio_roles` (OWNER) al crear el estudio.
- Asegurar que el slug permitido en proxy se derive de `user_studio_roles` (y opcionalmente de metadata) para alinear BD y rutas.
- Corregir `studios.create` para usar `studio_name` y `email` según el esquema actual.

---

## 6. Resumen de hallazgos

| Tema | Estado |
|------|--------|
| **Identidad ↔ estudio** | Vinculación por `user_studio_roles`; proxy usa `user_metadata.studio_slug`; `studio_user_profiles.studio_id` es legacy/onboarding. |
| **Google en estudios** | Correcto: solo en `studios`; un estudio no puede ver tokens de otro. |
| **PlatformRole vs StudioRole** | Claros en esquema; proxy solo usa rol de plataforma (metadata); StudioRole usado en integraciones y notificaciones. |
| **Multi-tenencia** | Esquema aísla por `studio_id`; falta reforzar comprobación de acceso por `user_studio_roles` en proxy. |
| **Crear estudio** | Mismo flujo para cualquier usuario; no se crea `user_studio_roles`; `studios.create` usa campos que no coinciden con el esquema (`name` vs `studio_name`, falta `email`). |
| **SUPER_ADMIN vs SUSCRIPTOR** | Diferencia solo en proxy (acceso total vs solo su slug); no en la creación del estudio ni en tablas de roles en este flujo. |
