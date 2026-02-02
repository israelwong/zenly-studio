# Problema: Google OAuth PKCE - Cookie code_verifier Vacía

## Descripción del Problema

Al iniciar sesión con Google OAuth usando Supabase Auth, el flujo PKCE falla porque la cookie `code_verifier` llega vacía al callback del servidor, causando el error:

```
Error [AuthApiError]: invalid request: both auth code and code verifier should be non-empty
```

## Flujo Actual

1. **Cliente (`LoginForm.tsx`)**: Usuario hace clic en "Iniciar sesión con Google"
2. **Supabase Auth**: Genera `code_verifier` y lo guarda en `localStorage` (clave: `sb-{project-ref}-auth-token-code-verifier`)
3. **Redirección**: Supabase redirige a Google OAuth
4. **Google**: Usuario autoriza y Google redirige de vuelta a `/auth/callback?code=...`
5. **Servidor (`/auth/callback/route.ts`)**: Intenta leer `code_verifier` de cookies HTTP para `exchangeCodeForSession`
6. **❌ FALLO**: La cookie existe pero está **vacía** (`valueLength: 0`)

## Evidencia del Problema

### Logs del Servidor (callback)

```
🍪 [OAuth Callback] Cookies presentes: [
  'sb-fhwfdwrrnwkbnwxabkcq-auth-token-code-verifier',  // ← Cookie existe
  'sb-fhwfdwrrnwkbnwxabkcq-auth-token.0',
  'sb-fhwfdwrrnwkbnwxabkcq-auth-token.1'
]
🔐 [OAuth Callback] Cookie PKCE: {
  name: 'sb-fhwfdwrrnwkbnwxabkcq-auth-token-code-verifier',
  hasValue: false,        // ← Vacía
  valueLength: 0,          // ← Sin valor
  isEmpty: true
}
❌ [OAuth Callback] ERROR CRÍTICO: Code verifier está VACÍO
```

## Intentos de Solución Realizados

### 1. Interceptor de `localStorage.setItem`

**Archivo**: `src/lib/supabase/browser.ts`

- Intercepta `Storage.prototype.setItem` y `localStorage.setItem`
- Sincroniza automáticamente `code_verifier` de `localStorage` a cookies HTTP cuando Supabase lo guarda
- Usa `SameSite=None; Secure` para HTTPS y `SameSite=Lax` para HTTP
- **Resultado**: La cookie se crea pero llega vacía al servidor

### 2. Sincronización Manual Post-OAuth

**Archivo**: `src/components/forms/LoginForm.tsx`

- Después de `signInWithOAuth`, espera 200ms y lee `code_verifier` directamente de `localStorage`
- Sincroniza manualmente a cookies HTTP antes de la redirección
- **Resultado**: No hay logs del navegador disponibles para verificar si se ejecuta

### 3. Configuración de Cookies

- `SameSite=None; Secure` para HTTPS (redirecciones cross-domain)
- `SameSite=Lax` para HTTP (desarrollo)
- `max-age=600` (10 minutos)
- `path=/`

## Archivos Clave

### Cliente

- `src/components/forms/LoginForm.tsx` - Formulario de login con botón Google OAuth
- `src/lib/supabase/browser.ts` - Cliente Supabase con interceptor PKCE
- `src/lib/supabase/storage-adapter.ts` - Storage adapter con sincronización PKCE

### Servidor

- `src/app/(auth)/auth/callback/route.ts` - Callback que procesa el código OAuth
- `src/lib/supabase/middleware.ts` - Middleware de Supabase

## Hipótesis del Problema

1. **Redirección Cross-Domain**: Google redirige de vuelta y las cookies con `SameSite=Lax` no se envían en redirecciones cross-site
2. **Timing**: El `code_verifier` se guarda después de que ya se creó la cookie vacía
3. **Encoding**: El valor del `code_verifier` se está codificando/decodificando incorrectamente
4. **Supabase Internals**: Supabase puede estar usando un método diferente para guardar el `code_verifier` que no estamos interceptando

## Información Técnica

- **Stack**: Next.js 15, Supabase Auth, TypeScript
- **OAuth Provider**: Google
- **PKCE Flow**: Requerido por Supabase Auth
- **Entorno**: Desarrollo (HTTP localhost) y Producción (HTTPS)

## Integraciones Exitosas de Referencia

El proyecto tiene integraciones exitosas con Google (Calendar, Drive, Contacts) que usan **OAuth directo con Google** (sin Supabase Auth), por lo que no requieren PKCE:

- `src/lib/integrations/google/auth/calendar.actions.ts`
- `src/lib/integrations/google/auth/drive.actions.ts`
- `src/lib/integrations/google/auth/contacts.actions.ts`

Estas funcionan porque intercambian el `code` directamente con Google usando `client_id` y `client_secret`, sin necesidad de `code_verifier`.

## Preguntas para Investigar

1. ¿Cómo maneja Supabase SSR el `code_verifier` internamente?
2. ¿Hay alguna forma de pasar el `code_verifier` en el `state` de OAuth en lugar de cookies?
3. ¿Podemos usar el mismo enfoque de OAuth directo que las integraciones pero para autenticación de usuario?
4. ¿El problema es específico de desarrollo (HTTP) o también ocurre en producción (HTTPS)?

## Próximos Pasos Sugeridos

1. Verificar logs del navegador para ver si el interceptor se ejecuta y si la sincronización manual funciona
2. Investigar si Supabase tiene alguna configuración específica para PKCE en SSR
3. Considerar usar OAuth directo con Google para login (como las integraciones) y luego crear la sesión de Supabase manualmente
4. Verificar si el problema persiste en producción (HTTPS) vs desarrollo (HTTP)
