# Plan de Trabajo: Sign in with Google

## Objetivo

Implementar autenticación social con Google para permitir registro rápido y acceso directo a Studios existentes.

## Resumen Ejecutivo

### Cambios Clave Confirmados

1. ✅ **`studio_user_profiles` NO es legacy** - Se usa activamente (136 referencias, RLS habilitado)
2. ✅ **Estrategia dual**: Escribir en AMBOS modelos (`users` y `studio_user_profiles`) para mantener integridad
3. ✅ **Token Bridge (El Golpe Maestro)**: Capturar `provider_refresh_token` de la sesión de Supabase para eliminar paso de "Conectar Calendario"
4. ✅ **Middleware**: Agregar `/auth/callback` y `/onboarding` a rutas públicas en `src/proxy.ts`
5. ✅ **Onboarding**: Crear página simple hardcoded con diseño ZEN en `/onboarding/setup-studio`
6. ✅ **Scopes**: Formato string separado por espacios (correcto para Supabase)
7. ✅ **Ignorar**: `/api/auth/google/callback` (es para integración Drive, no confundir)

### Valor Agregado Principal

El **Token Bridge** elimina completamente la fricción de conectar Google Calendar manualmente. Al capturar el `provider_refresh_token` durante el login OAuth, el usuario nuevo que se registra con Google automáticamente tiene Calendar conectado sin pasos adicionales.

---

## Análisis del Estado Actual

### Infraestructura Existente

- ✅ Supabase Auth configurado (`src/lib/supabase/browser.ts`, `server.ts`)
- ✅ Tabla `users` en Prisma con `supabase_id`, `email`, `full_name`, `avatar_url`
- ✅ Tabla `user_studio_roles` para relación usuario-estudio
- ✅ Tabla `studios` con campos Google OAuth (`google_oauth_refresh_token`, `google_oauth_email`, `google_oauth_scopes`)
- ✅ Scopes de Google ya definidos: `drive.readonly`, `calendar`, `calendar.events`
- ✅ Función `getRedirectPathForUser()` para redirecciones inteligentes
- ✅ Ruta `/api/auth/google/callback` existe pero es para integración Drive (no confundir)

### Flujo Actual de Signup

1. Usuario crea cuenta en Supabase Auth
2. Se crea registro en `studio_user_profiles` (modelo activo, usado por Realtime/RLS)
3. Se crea registro en `users` (modelo nuevo, usado en algunas acciones)
4. Se crea `user_studio_roles` al crear studio
5. Trigger de Supabase sincroniza `auth.users` → `studio_user_profiles` automáticamente

### Puntos de Atención

- ⚠️ **IMPORTANTE**: `studio_user_profiles` NO es legacy - se usa activamente (136 referencias)
  - Tiene RLS habilitado
  - Se usa en notifications, payroll, payments, finanzas
  - Tiene trigger de sincronización automática desde Supabase Auth
- ⚠️ Existen dos modelos de usuarios: `studio_user_profiles` (activo) y `users` (nuevo)
- ⚠️ La ruta `/api/auth/google/callback` es para Drive, necesitamos `/auth/callback` para Supabase Auth
- ⚠️ No existe ruta de onboarding `/(onboarding)/setup-studio` - crear página simple hardcoded con diseño ZEN
- ⚠️ Middleware (`src/proxy.ts`) NO incluye `/auth/callback` ni `/onboarding` en rutas públicas - AGREGAR

---

## Tareas de Implementación

### 1. Configuración del Cliente (Auth UI)

**Archivo:** `src/components/forms/LoginForm.tsx`

**Cambios:**

- Agregar botón "Continuar con Google" usando `ZenButton`
- Implementar `handleGoogleSignIn()` que llama a `supabase.auth.signInWithOAuth()`
- Configurar scopes: `['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']`
- Redirect URL: `${window.location.origin}/auth/callback`

**Código:**

```typescript
const handleGoogleSignIn = async () => {
  setError("");
  setLoading(true);

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent", // Forzar consent para obtener refresh_token
        },
        scopes:
          "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // No hacer setLoading(false) aquí - la redirección ocurre automáticamente
  } catch (err) {
    console.error("Google OAuth error:", err);
    setError(
      err instanceof Error ? err.message : "Error al iniciar sesión con Google"
    );
    setLoading(false);
  }
};
```

**Nota sobre Scopes:**

- Supabase acepta scopes como string separado por espacios (formato correcto)
- Los scopes deben coincidir exactamente con los usados en integración Drive/Calendar

**Nota sobre `prompt: 'consent'`:**

- **CRÍTICO**: `prompt: 'consent'` es obligatorio para obtener `refresh_token` en primera conexión
- Esto pedirá permiso al usuario cada vez (UX trade-off necesario)
- En el futuro, si ya tienes el token, podrías cambiar a `select_account` para mejor UX
- Para el flujo de "primera conexión" y Token Bridge, `consent` es obligatorio

---

### 2. Ruta de Callback de Supabase Auth

**Archivo:** `src/app/(auth)/auth/callback/route.ts` (NUEVO)

**Responsabilidades:**

- Intercambiar código de Supabase por sesión
- Obtener usuario autenticado
- Llamar a Server Action `procesarUsuarioOAuth()` para:
  - Crear/actualizar usuario en Prisma
  - Extraer `full_name` y `avatar_url` de `user_metadata`
  - Verificar si tiene studio asociado
  - Redirigir según estado (onboarding vs dashboard)

**Estructura:**

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_cancelled", request.url)
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.user || !data.session) {
      return NextResponse.redirect(
        new URL("/login?error=auth_failed", request.url)
      );
    }

    // Procesar usuario OAuth (pasar usuario Y sesión para Token Bridge)
    const result = await procesarUsuarioOAuth(data.user, data.session);

    // Redirigir según resultado
    if (result.needsOnboarding) {
      return NextResponse.redirect(
        new URL("/onboarding/setup-studio", request.url)
      );
    }

    if (result.redirectPath) {
      return NextResponse.redirect(new URL(result.redirectPath, request.url));
    }

    // Fallback
    return NextResponse.redirect(
      new URL("/login?error=processing_failed", request.url)
    );
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
```

**Nota:** Es crítico pasar `data.session` a `procesarUsuarioOAuth()` porque ahí están los tokens (`provider_refresh_token`).

---

### 3. Server Action: Procesar Usuario OAuth

**Archivo:** `src/lib/actions/auth/oauth.actions.ts` (NUEVO)

**Funciones:**

- `procesarUsuarioOAuth(user: User, session: Session)`: Función principal (recibe sesión para Token Bridge)
- `obtenerOActualizarUsuario(supabaseUser)`: Crear/actualizar en AMBOS modelos (`users` y `studio_user_profiles`)
- `verificarStudioUsuario(userId)`: Buscar en `user_studio_roles` el último studio activo
- `guardarTokensGoogle(studioId, session)`: Guardar tokens en `studios` si no existen (Token Bridge)

**Lógica Dual (users + studio_user_profiles):**

1. Extraer datos de `user_metadata` (full_name, avatar_url, email)
2. **PRIORIDAD: Escribir en AMBOS modelos para mantener integridad**
   - **OPCIÓN A (Recomendada)**: Usar `prisma.$transaction()` para garantizar atomicidad
     - Si uno falla, ambos fallan (integridad garantizada)
   - **OPCIÓN B**: Try-catch específico para cada escritura (resiliencia manual)
     - Aceptable dado que es sincronización desde callback de Auth
   - Buscar o crear usuario en `users` por `supabase_id`
   - Buscar o crear usuario en `studio_user_profiles` por `supabase_id` o `email`
   - Si usuario legacy existe (por email) pero sin `supabase_id`, actualizar `supabase_id`
3. Si no existe en ninguno, crear en ambos con datos de Google
4. Si existe, actualizar `full_name` y `avatar_url` si están vacíos (en ambos modelos)
5. Buscar en `user_studio_roles` si tiene studio activo
6. Si tiene studio, obtener `slug` y retornar ruta de dashboard
7. Si no tiene studio, retornar `needsOnboarding: true`
8. **TOKEN BRIDGE (Punto Crítico)**: Extraer tokens de Google de la sesión para guardar en `studios` (si aplica)

**Código de ejemplo con transacción:**

```typescript
await prisma.$transaction(async (tx) => {
  // Crear/actualizar en users
  const dbUser = await tx.users.upsert({
    where: { supabase_id: supabaseUser.id },
    update: {
      /* ... */
    },
    create: {
      /* ... */
    },
  });

  // Crear/actualizar en studio_user_profiles
  await tx.studio_user_profiles.upsert({
    where: { supabase_id: supabaseUser.id },
    update: {
      /* ... */
    },
    create: {
      /* ... */
    },
  });

  return dbUser;
});
```

**Retorno:**

```typescript
{
  success: boolean
  needsOnboarding?: boolean
  redirectPath?: string
  studioSlug?: string
  error?: string
}
```

---

### 4. Persistencia de Tokens Google (Calendar Bridge) - EL GOLPE MAESTRO

**Archivo:** `src/lib/actions/auth/oauth.actions.ts` (función adicional)

**Funcionalidad CRÍTICA:**

- En `procesarUsuarioOAuth()`, después de verificar studio:
  - Si el usuario tiene studio y la sesión incluye `provider_token` y `provider_refresh_token`:
    - Buscar el studio del usuario desde `user_studio_roles`
    - Si el studio NO tiene `google_oauth_refresh_token`:
      - **Extraer `provider_refresh_token` de `session.provider_refresh_token`** (viene de Supabase)
      - Encriptar `provider_refresh_token` usando `encryptToken()` de `@/lib/utils/encryption`
      - Guardar en `studios.google_oauth_refresh_token`
      - Guardar scopes en `studios.google_oauth_scopes` como JSON string
      - Guardar email en `studios.google_oauth_email`
      - Marcar `is_google_connected = true`
      - Configurar `google_integrations_config` con drive y calendar habilitados

**Código de ejemplo:**

```typescript
// En procesarUsuarioOAuth, después de encontrar studio
if (studioId && session?.provider_refresh_token) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { google_oauth_refresh_token: true },
  });

  if (studio && !studio.google_oauth_refresh_token) {
    const encryptedToken = await encryptToken(session.provider_refresh_token);
    const scopes = [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];

    await prisma.studios.update({
      where: { id: studioId },
      data: {
        google_oauth_refresh_token: encryptedToken,
        google_oauth_email: user.email,
        google_oauth_scopes: JSON.stringify(scopes),
        is_google_connected: true,
        google_integrations_config: {
          drive: { enabled: true },
          calendar: { enabled: true },
        },
      },
    });
  }
}
```

**Nota:** Solo guardar si el studio no tiene tokens ya configurados (no sobrescribir conexión existente).
**Beneficio:** Elimina completamente el paso de "Configuración > Conectar Calendario" para usuarios nuevos.

---

### 5. Ruta de Onboarding (Hardcoded Simple)

**Archivo:** `src/app/(onboarding)/setup-studio/page.tsx` (NUEVO)

**Requisitos:**

- Página simple hardcoded con diseño ZEN
- Formulario básico para crear studio (similar a signup step 2)
- Usar componentes ZEN Design System (`ZenButton`, `ZenInput`, `ZenCard`)
- Usar Server Action `createStudioAndSubscription()` existente de `@/lib/actions/auth/signup.actions`
- Redirigir a `/[slug]/studio/dashboard` después de crear

**Estructura:**

- Layout simple centrado
- Formulario con campos: `studio_name`, `studio_slug`, `studio_slogan` (opcional)
- Validación básica
- Loading state durante creación
- Manejo de errores

**Nota:** El usuario ya está autenticado (viene de OAuth), solo necesita crear el studio.

---

### 6. Actualización de Redirect Utils

**Archivo:** `src/lib/auth/redirect-utils.ts`

**Cambio:** Asegurar que `getRedirectPathForUser()` maneje correctamente usuarios sin `studio_slug` en metadata pero con `user_studio_roles` activo.

**Lógica adicional:**

- Si usuario tiene rol `suscriptor` pero no `studio_slug` en metadata:
  - Buscar en `user_studio_roles` el último studio activo (usando `user_id` desde `users` o `studio_user_profiles`)
  - Obtener `slug` del studio desde la relación
  - Usar ese `slug` para redirección

**Nota:** Esto es importante para usuarios que se autentican con Google pero no tienen `studio_slug` en metadata de Supabase.

---

## Flujo Completo

### Usuario Nuevo (Sin Studio)

1. Click en "Continuar con Google"
2. Autoriza en Google (con scopes Drive + Calendar)
3. Callback `/auth/callback` recibe código
4. Supabase intercambia código por sesión
5. `procesarUsuarioOAuth()` detecta que no tiene studio
6. Redirige a `/onboarding/setup-studio`
7. Usuario completa setup de studio
8. Redirige a `/[slug]/studio/dashboard`

### Usuario Existente (Con Studio)

1. Click en "Continuar con Google"
2. Autoriza en Google
3. Callback procesa usuario
4. `procesarUsuarioOAuth()` encuentra `user_studio_roles` activo
5. Obtiene `slug` del último studio activo
6. Intenta guardar tokens Google si no existen
7. Redirige a `/[slug]/studio/dashboard`

---

## Archivos a Crear/Modificar

### Nuevos

- `src/app/(auth)/auth/callback/route.ts` - Callback de Supabase Auth
- `src/lib/actions/auth/oauth.actions.ts` - Server Actions para OAuth
- `src/app/(onboarding)/setup-studio/page.tsx` - Página de onboarding simple

### Modificar

- `src/components/forms/LoginForm.tsx` - Agregar botón "Continuar con Google"
- `src/lib/auth/redirect-utils.ts` - Mejorar búsqueda de studio desde `user_studio_roles`
- `src/proxy.ts` - Agregar `/auth/callback` y `/onboarding` a rutas públicas

---

## Consideraciones Técnicas

### Scopes de Google

- Usar los mismos scopes que integración Drive/Calendar para evitar pedir permisos dos veces
- Scopes: `drive.readonly`, `calendar`, `calendar.events`
- Formato: String separado por espacios (Supabase lo acepta así)
- **CRÍTICO**: Verificar en Supabase Dashboard > Authentication > Providers > Google:
  - Client ID/Secret coinciden con los de Calendar
  - "Skip nonce check" activado si usas flujos personalizados

### Manejo de Errores

- Usuario cancela OAuth → Redirigir a `/login?error=oauth_cancelled`
- Error en intercambio de código → Redirigir a `/login?error=auth_failed`
- Error al procesar usuario → Log error y redirigir a `/login?error=processing_failed`
- Mostrar mensajes de error amigables en LoginForm

### Seguridad

- **CRÍTICO - ESTÁNDAR MÍNIMO**: El uso de `encryptToken()` es vital
  - Dado que vas a guardar un `refresh_token` que da acceso a Google Calendar y Drive
  - La encriptación en reposo es el estándar mínimo de seguridad que la app debe tener
  - Usar `encryptToken()` de `@/lib/utils/encryption` (AES-256-GCM)
- Validar que `provider_token` y `provider_refresh_token` vengan de Supabase (no confiar en client)
- Los tokens vienen en `session.provider_refresh_token` de Supabase (seguro, viene del servidor)
- No sobrescribir tokens existentes en studio (solo guardar si `google_oauth_refresh_token` es null)
- Nunca loggear tokens en consola o logs de producción

### Middleware y Rutas Públicas

- **CRÍTICO - PUNTO DONDE LA MAYORÍA FALLA**: Agregar `/auth/callback` y `/onboarding` a `reservedPaths` en `src/proxy.ts`
- De lo contrario, el usuario entrará en bucle de redirección antes de que la sesión se establezca completamente
- El proceso de autenticación debe completarse ANTES de que el middleware intente validar una sesión que aún se está intercambiando
- Actualizar función `isReservedPath()` para incluir estas rutas:
  ```typescript
  const reservedPaths = [
    "/admin",
    "/agente",
    "/api",
    "/login",
    "/sign-up",
    "/signin",
    "/signup",
    "/forgot-password",
    "/update-password",
    "/error",
    "/redirect",
    "/sign-up-success",
    "/complete-profile",
    "/confirm",
    "/unauthorized",
    "/protected",
    "/about",
    "/pricing",
    "/contact",
    "/features",
    "/blog",
    "/help",
    "/docs",
    "/demo",
    "/terms",
    "/privacy",
    "/_next",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/auth/callback", // NUEVO - Callback de Supabase Auth
    "/onboarding", // NUEVO - Rutas de onboarding
  ];
  ```

### Performance

- Usar índices existentes en `user_studio_roles` para búsqueda rápida
- Cachear resultado de búsqueda de studio si es posible
- Escribir en ambos modelos (`users` y `studio_user_profiles`) en paralelo si es posible

### Dualidad de Modelos (users vs studio_user_profiles)

- **Estrategia**: Escribir en AMBOS modelos para mantener integridad
- **Recomendación**: Usar `prisma.$transaction()` para garantizar atomicidad
  - Si uno falla, ambos fallan (integridad garantizada)
  - Alternativa: Try-catch específico para cada escritura (resiliencia manual aceptable)
- Si usuario legacy existe (por email) pero sin `supabase_id`, actualizar `supabase_id`
- Priorizar modelo `users` para nuevas funcionalidades, pero mantener `studio_user_profiles` sincronizado
- El trigger de Supabase puede ayudar, pero no confiar solo en él para OAuth
- El sistema depende de ambos para RLS y funcionalidades legacy

---

## Testing Checklist

- [ ] Usuario nuevo puede registrarse con Google
- [ ] Usuario existente puede iniciar sesión con Google
- [ ] Redirección correcta a onboarding para usuarios nuevos
- [ ] Redirección correcta a dashboard para usuarios existentes
- [ ] Tokens de Google se guardan correctamente (si aplica)
- [ ] Perfil de usuario se sincroniza con datos de Google
- [ ] Manejo de errores funciona correctamente
- [ ] No se sobrescriben tokens existentes en studio

---

## Notas Finales

- Mantener compatibilidad con flujo de signup existente
- No romper autenticación por email/password
- **NO migrar `studio_user_profiles` a `users`** - ambos modelos son activos y necesarios
- El trigger de Supabase sincroniza `auth.users` → `studio_user_profiles`, pero para OAuth debemos escribir en ambos manualmente
- Documentar en README o docs internos el flujo de OAuth
- **El Token Bridge es el valor agregado principal** - elimina fricción de conectar Calendar manualmente

## Checklist de Configuración Supabase

Antes de implementar, verificar en Supabase Dashboard:

- [ ] Google Provider está habilitado
- [ ] Client ID y Client Secret coinciden con los de Calendar
- [ ] Redirect URL configurada: `https://tu-dominio.com/auth/callback`
- [ ] "Skip nonce check" activado (si aplica)
- [ ] Scopes configurados correctamente en el provider

## Puntos Críticos de Implementación (Revisión Final)

### 1. Token Bridge (UX de Nivel Superior)

- ✅ `prompt: 'consent'` es obligatorio para obtener `refresh_token` en primera conexión
- ⚠️ Trade-off UX: Pedirá permiso al usuario cada vez (necesario para Token Bridge)
- 💡 Futuro: Si ya tienes el token, cambiar a `select_account` para mejor UX
- ✅ Para flujo de "primera conexión", `consent` es obligatorio

### 2. Integridad de Modelos (Dualidad)

- ✅ Escribir en `users` y `studio_user_profiles` simultáneamente
- ✅ **Recomendado**: Usar `prisma.$transaction()` para atomicidad
- ✅ Alternativa: Try-catch específico para cada escritura (resiliencia manual)
- ✅ El sistema depende de ambos para RLS y funcionalidades legacy

### 3. Middleware (Punto Donde la Mayoría Falla)

- ✅ Agregar `/auth/callback` y `/onboarding` a rutas reservadas/públicas
- ✅ Garantizar que el proceso de autenticación se complete ANTES de validar sesión
- ✅ Evitar bucles de redirección por validación prematura de sesión

### 4. Seguridad de Tokens (Estándar Mínimo)

- ✅ `encryptToken()` es vital - encriptación en reposo es estándar mínimo
- ✅ `refresh_token` da acceso a Google Calendar y Drive - debe estar encriptado
- ✅ Usar AES-256-GCM (ya implementado en `@/lib/utils/encryption`)
- ✅ Nunca loggear tokens en consola o logs de producción
