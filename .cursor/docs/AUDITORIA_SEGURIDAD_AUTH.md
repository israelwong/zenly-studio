# Auditoría Técnica: Seguridad y Flujo de Autenticación (ZEN Platform)

**Archivos revisados:** `app/(auth)/auth/callback/route.ts`, `lib/actions/auth/oauth.actions.ts`, `.env.example` (`.env.local` no versionado).

---

## 1. Coherencia de Entorno (Local vs Prod)

### redirectTo en el flujo de login

| Origen | Cómo se genera | Coherencia |
|--------|----------------|------------|
| **LoginForm.tsx** (login con Google) | `redirectTo = \`${window.location.origin}/auth/callback?next=...\`` | ✅ Dinámico: usa el origin del navegador (localhost en dev, dominio real en prod). |
| **oauth.actions.ts** (`iniciarVinculacionRecursoGoogle`) | `baseUrl = process.env.NEXT_PUBLIC_APP_URL \|\| 'http://localhost:3000'` | ⚠️ Depende de variable de entorno: en producción debe existir `NEXT_PUBLIC_APP_URL` con el dominio real. |

**Conclusión:** El login con Google no requiere cambios manuales entre entornos. La vinculación de recurso (Drive/Calendar) sí depende de `NEXT_PUBLIC_APP_URL` en prod; conviene documentarlo en el setup y en `.env.example` (ya está).

El callback **no construye** `redirectTo`; solo recibe la petición en `/auth/callback` y usa `request.url` (y por tanto `request.nextUrl.origin` implícito) para construir URLs de redirección internas, por lo que el origen es siempre el de la petición (coherente con local/prod).

---

## 2. Auditoría de Seguridad (Open Redirect)

### Función `isValidInternalUrl` (actualizada)

- **Bloqueos aplicados:**
  - URLs que empiezan por `//` (protocol-relative, p. ej. `//evil.com/path`).
  - Presencia de `://` salvo que el host resuelto sea **localhost**, **127.0.0.1** o el **mismo host** que `allowedOrigin`.
  - Caracteres peligrosos: `<`, `>`, `javascript:`.
- **Origen permitido:** Se pasa `allowedOrigin = new URL(request.url).origin` desde `getSafeRedirectUrl`, de modo que en producción solo se aceptan rutas relativas o URLs absolutas cuyo host coincida con el dominio de la app (o localhost en dev).

**Comportamiento resumido:**

- Rutas relativas que empiezan por `/`: válidas; si al resolverlas con `allowedOrigin` el host no es el permitido, se rechazan.
- URLs absolutas con `http://` o `https://`: solo válidas si el host es `localhost`, `127.0.0.1` o el host de `allowedOrigin`.

Con esto se evita redirigir a protocolos externos salvo que el host sea estrictamente el de la app o localhost.

---

## 3. Consistencia de Roles (Post-Login)

### Flujo en `procesarUsuarioOAuth`

1. **Solo usuarios existentes:** Se comprueba existencia en `users` (por `supabase_id` o `email`) o en `studio_user_profiles` (por `email`). Si no existe → `restricted: true` (no se crea usuario nuevo).
2. **Transacción atómica:** En una sola `prisma.$transaction` se crean/actualizan:
   - `users` (por supabase_id o fusión por email).
   - `studio_user_profiles` (por email o supabase_id).
3. **Rol de plataforma (añadido en esta auditoría):** Tras obtener `dbUser`, se hace **upsert** en `user_platform_roles` con rol **SUSCRIPTOR** y `is_active: true`. Así, todo usuario que pase el filtro “existente” tiene al menos SUSCRIPTOR antes de cualquier redirección.
4. **Estudio:** Se consulta `user_studio_roles` (activos, ordenados por `accepted_at` desc) para decidir `redirectPath` o `needsOnboarding`.

**Orden garantizado:** users + studio_user_profiles (transacción) → user_platform_roles (SUSCRIPTOR) → lectura de user_studio_roles → redirección. No se redirige sin haber asegurado el rol de plataforma.

---

## 4. Reporte de Estado para Análisis

### ¿Discrepancia entre URIs en código y paneles Google/Supabase?

- **Código:**
  - Login: el cliente envía a Supabase `redirectTo = origin + '/auth/callback'` (ej. `http://localhost:3000/auth/callback` o `https://tudominio.com/auth/callback`).
  - Supabase redirige al usuario a esa URL tras el OAuth.
- **Paneles:**
  - **Supabase Dashboard > Redirect URLs:** Debe incluir exactamente esas URLs (ej. `http://localhost:3000/auth/callback`, `https://tudominio.com/auth/callback`).
  - **Google Cloud Console > Authorized redirect URIs:** Debe ser la de **Supabase**, no la de la app: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.

Si en Google está la URI de Supabase y en Supabase están las URIs de la app, **no hay discrepancia** con lo que hace el código. Cualquier error “Redirect URI mismatch” suele deberse a que en Google figure la URL de la app en lugar de la de Supabase, o a que en Supabase falte la URL de la app (incluido el puerto en localhost).

### ¿El intercambio de código (Exchange Code) maneja correctamente el flujo PKCE en localhost?

- El callback usa `createServerClient` de `@supabase/ssr` con las **cookies del request** (incluidas las de PKCE: `code_verifier`, `code_challenge`).
- Se llama a `supabase.auth.exchangeCodeForSession(code)`; Supabase usa el `code_verifier` de las cookies para validar el flujo PKCE.
- En localhost las cookies se envían correctamente al mismo origen (`http://localhost:3000`), por lo que el code_verifier está disponible en el request del callback.

**Requisito:** Que el usuario llegue al callback en la **misma** ventana/origen en que inició el login (sin cambios de dominio/puerto). Si se usa localhost, no hay problema; si se usan varios dominios (ej. app en un dominio y callback en otro), habría que asegurar que las cookies se compartan o que el flujo sea el mismo origen. En la configuración típica (todo en localhost:3000 o todo en el mismo dominio en prod), **el intercambio de código y PKCE funcionan correctamente en localhost**.

### ¿Qué sucede si un usuario de Google no tiene ningún estudio asociado?

1. **Usuario no existente (no está en `users` ni en `studio_user_profiles`):**  
   Se devuelve `restricted: true`, se hace `signOut` en el callback y se redirige a `/login?error=restricted` con el mensaje de “registro próximamente”. No se crea usuario.

2. **Usuario existente pero sin filas en `user_studio_roles`:**  
   Tras crear/actualizar `users` y `studio_user_profiles`, asegurar SUSCRIPTOR en `user_platform_roles` y consultar `user_studio_roles`, la consulta no devuelve ningún estudio.  
   Entonces `studioRole` es `null`, y `procesarUsuarioOAuth` devuelve:
   - `success: true`
   - `needsOnboarding: true`
   - sin `redirectPath` ni `studioSlug`

3. **En el callback:**  
   Como `result.needsOnboarding === true`, se redirige a **`/onboarding/setup-studio`**. Esa ruta está bloqueada con la pantalla “En construcción”, por lo que el usuario ve ese mensaje en lugar del formulario de crear estudio.

**Resumen:** Usuario de Google sin estudio → login exitoso, rol SUSCRIPTOR asignado, redirección a `/onboarding/setup-studio` → ve “En construcción” (no puede crear estudio hasta que se habilite el registro).

---

## 5. Cambios Aplicados en Esta Auditoría

1. **`isValidInternalUrl`:**  
   - Rechazo explícito de URLs que empiezan por `//`.  
   - Para URLs con `://`, solo se aceptan hosts `localhost`, `127.0.0.1` o el host de `allowedOrigin` (origen de la petición).  
   - `getSafeRedirectUrl` pasa `origin = new URL(request.url).origin` a `isValidInternalUrl`.

2. **`procesarUsuarioOAuth`:**  
   - Tras obtener `dbUser` y antes de consultar `user_studio_roles`, se añade upsert en `user_platform_roles` con rol `SUSCRIPTOR` y `is_active: true`, garantizando consistencia de roles antes de cualquier redirección.

3. **Documentación:**  
   - Este documento resume coherencia de entorno, open redirect, roles y respuestas a las tres preguntas del reporte de estado.
