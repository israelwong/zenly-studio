# Revisión: Desacoplamiento de Identidad y Recursos

## Objetivo
Permitir que un usuario autenticado con Cuenta A pueda conectar Google Calendar/Drive de Cuenta B al Studio, sin causar errores de permisos o bucles de redirección.

## Cambios Implementados

### 1. Refactor de `procesarUsuarioOAuth` ✅

**Archivo:** `src/lib/actions/auth/oauth.actions.ts`

**Cambios:**
- ✅ Token Bridge ahora extrae el email de Google desde `provider_token` (no del usuario Supabase)
- ✅ Token Bridge es explícitamente opcional: solo guarda si el studio NO tiene tokens ya configurados
- ✅ `google_oauth_email` almacenado es el email de Google (puede ser diferente al email del usuario)

**Código clave:**
```typescript
// Extraer email de Google desde provider_token
if (session.provider_token) {
  const userInfoResponse = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    { headers: { Authorization: `Bearer ${session.provider_token}` } }
  );
  const userInfo = await userInfoResponse.json();
  googleEmail = userInfo.email || email; // Fallback al email del usuario
}
```

### 2. Nueva Función: `vincularRecursoGoogle` ✅

**Archivo:** `src/lib/actions/auth/oauth.actions.ts`

**Propósito:** Vincular recursos de Google a un Studio independientemente de la cuenta de sesión.

**Características:**
- ✅ Obtiene email de Google desde `provider_token`
- ✅ Encripta `refresh_token` con `encryptToken()`
- ✅ Sobrescribe conexión existente (el usuario está explícitamente reconectando)
- ✅ No crea/actualiza usuario (solo actualiza tokens del Studio)

### 3. Callback Distingue Entre Login y Vinculación ✅

**Archivo:** `src/app/(auth)/auth/callback/route.ts`

**Cambios:**
- ✅ Lee `state` parameter para identificar el tipo de flujo
- ✅ Si `state.type === 'link_resource'`: Llama a `vincularRecursoGoogle()`
- ✅ Si no hay state o es login: Llama a `procesarUsuarioOAuth()`
- ✅ Redirecciones apropiadas según el flujo

**Flujo de Vinculación:**
1. Usuario hace click en "Conectar Calendar" (ya autenticado)
2. Se genera `state` con `{ type: 'link_resource', studioSlug }`
3. OAuth redirige a `/auth/callback?code=...&state=...`
4. Callback detecta `link_resource` y llama a `vincularRecursoGoogle()`
5. Redirige a `/studio/config/integraciones?success=google_connected`

### 4. Server Action Cliente para Vinculación ✅

**Archivo:** `src/lib/actions/auth/oauth-client.actions.ts`

**Función:** `iniciarVinculacionRecursoGoogleClient(studioSlug)`

**Uso:**
```typescript
'use client';
import { iniciarVinculacionRecursoGoogleClient } from '@/lib/actions/auth/oauth-client.actions';

// En un componente cliente
const handleConnectGoogle = async () => {
  const result = await iniciarVinculacionRecursoGoogleClient(studioSlug);
  if (!result.success) {
    // Manejar error
  }
  // La redirección ocurre automáticamente
};
```

**Características:**
- ✅ Fuerza `prompt: 'consent'` para obtener `refresh_token`
- ✅ Fuerza `access_type: 'offline'`
- ✅ Pasa `state` en queryParams para identificar flujo
- ✅ Scopes correctos (Drive + Calendar)

### 5. Verificación de Integraciones ✅

**Confirmado:**
- ✅ `getGoogleCalendarClient()` usa `google_oauth_refresh_token` del studio
- ✅ `getGoogleDriveClient()` usa `google_oauth_refresh_token` del studio
- ✅ `sync-manager.ts` usa `google_oauth_email` del studio
- ✅ Todas las integraciones usan tokens del studio, no del usuario

## Validaciones Realizadas

### ✅ Modelos Prisma
- `studios.google_oauth_email` es la fuente de verdad para integraciones
- `studios.google_oauth_refresh_token` es independiente del email del usuario
- Las funciones de sincronización usan siempre el token guardado en el Studio

### ✅ Token Bridge
- Es opcional: solo guarda si el studio NO tiene tokens ya configurados
- Respeta conexiones existentes (no sobrescribe)
- Extrae email de Google correctamente desde `provider_token`

### ✅ Seguridad
- ✅ Siempre usa `encryptToken()` para guardar `refresh_token`
- ✅ Nunca loguea tokens en consola
- ✅ Tokens vienen de Supabase (seguro, servidor)

### ✅ Middleware
- ✅ `/auth/callback` está en rutas públicas
- ✅ No causa bucles de redirección

## Recomendación de UX

**Banner ZEN para Conectar Calendar:**

```tsx
// En la sección de Calendario cuando no hay cuenta conectada
<ZenCard>
  <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
    <p className="text-sm text-zinc-300 mb-3">
      Conecta tu cuenta de Google Calendar para sincronizar tus tareas.
      Puedes usar una cuenta diferente a la de tu acceso actual.
    </p>
    <ZenButton
      onClick={() => iniciarVinculacionRecursoGoogleClient(studioSlug)}
      variant="primary"
    >
      Conectar Calendar
    </ZenButton>
  </div>
</ZenCard>
```

## Flujos Soportados

### Flujo 1: Login con Google (Token Bridge Opcional)
1. Usuario nuevo hace click en "Continuar con Google"
2. Autoriza en Google
3. Callback procesa usuario y crea/actualiza en `users` y `studio_user_profiles`
4. Si tiene studio y NO tiene tokens: Token Bridge guarda tokens automáticamente
5. Si tiene studio y YA tiene tokens: No sobrescribe (respeta conexión existente)
6. Redirige a dashboard u onboarding

### Flujo 2: Vinculación de Recurso Independiente
1. Usuario autenticado (Cuenta A) va a Configuración > Integraciones
2. Hace click en "Conectar Calendar"
3. Se inicia OAuth con `state` indicando `link_resource`
4. Usuario autoriza con Cuenta B (diferente a Cuenta A)
5. Callback detecta `link_resource` y llama a `vincularRecursoGoogle()`
6. Se guardan tokens de Cuenta B en el Studio
7. Redirige a página de integraciones con éxito

### Flujo 3: Reconexión Manual
1. Usuario autenticado (Cuenta A) tiene Calendar conectado (Cuenta B)
2. Quiere cambiar a Cuenta C
3. Hace click en "Reconectar Calendar"
4. Mismo flujo que Vinculación de Recurso
5. Sobrescribe tokens existentes (explícito)

## Resultado Esperado

✅ **El sistema permite que `Studio.google_oauth_email` sea distinto a `User.email` sin causar errores de permisos o bucles de redirección.**

✅ **Las integraciones usan siempre los tokens del Studio, independientemente de la cuenta de sesión del usuario.**

✅ **El Token Bridge es opcional y respeta conexiones existentes.**

✅ **Los usuarios pueden conectar Calendar/Drive de cualquier cuenta de Google al Studio.**

