# 🔐 Sistema de Autenticación ZEN - Guía Definitiva

**Fuente única de verdad para autenticación en ZEN Platform**

Última actualización: 2 de febrero de 2026

---

## 📋 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Métodos de Autenticación](#métodos-de-autenticación)
3. [Configuración](#configuración)
4. [Flujo OAuth con Google](#flujo-oauth-con-google)
5. [Gestión de Sesiones](#gestión-de-sesiones)
6. [Avatar del Usuario](#avatar-del-usuario)
7. [Problemas Comunes y Soluciones](#problemas-comunes-y-soluciones)
8. [Estructura de Archivos](#estructura-de-archivos)
9. [Mejores Prácticas](#mejores-prácticas)

---

## 🏗️ Arquitectura General

### Stack Tecnológico

```
┌─────────────────────────────────────────────────────┐
│                  Supabase Auth                       │
│  - PostgreSQL + RLS (Row Level Security)            │
│  - JWT tokens en cookies HTTP                       │
│  - PKCE flow para OAuth                             │
│  - Refresh tokens automáticos                       │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              Next.js 15 + React 19                   │
│  - Server Components (datos del servidor)           │
│  - Client Components (interacción)                  │
│  - Server Actions (mutaciones)                      │
│  - Middleware (protección de rutas)                 │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                    Prisma ORM                        │
│  - Tablas: users, studio_user_profiles              │
│  - Sincronización con Supabase Auth                 │
│  - Queries optimizadas con cache                    │
└─────────────────────────────────────────────────────┘
```

### Componentes Clave

1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Provider global de autenticación
   - Hook `useAuth()` para acceder al usuario
   - Escucha cambios de sesión en tiempo real

2. **Supabase Clients**
   - **Browser** (`src/lib/supabase/browser.ts`) - Cliente para componentes cliente
   - **Server** (`src/lib/supabase/server.ts`) - Cliente para Server Components
   - **Middleware** (`src/lib/supabase/middleware.ts`) - Cliente para middleware

3. **Middleware** (`src/proxy.ts`)
   - Protección de rutas autenticadas
   - Redirección automática a login
   - Manejo de roles (SUSCRIPTOR, AGENTE, ADMIN)

---

## 🔑 Métodos de Autenticación

### 1. Login por Contraseña

**Componente:** `src/components/forms/LoginForm.tsx`

**Flujo:**

```typescript
Usuario ingresa email + password
         ↓
Server Action: loginAction()
         ↓
Supabase Auth: signInWithPassword()
         ↓
JWT almacenado en cookies HTTP
         ↓
Middleware valida sesión
         ↓
Redirect al dashboard del studio
```

**Características:**
- ✅ Checkbox "Recordarme" (persistencia de sesión)
- ✅ Validación de errores clara
- ✅ Server Action para seguridad
- ✅ Redirect inteligente post-login

**Código ejemplo:**

```typescript
// src/lib/actions/auth/login.actions.ts
export async function loginAction(formData: FormData) {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}
```

---

### 2. Login con Google OAuth

**Componente:** `src/components/forms/LoginForm.tsx`

**Flujo PKCE completo:**

```
1. Usuario hace clic en "Continuar con Google"
         ↓
2. createClient().auth.signInWithOAuth({
     provider: 'google',
     options: { 
       redirectTo: '/auth/callback?next=/dashboard'
     }
   })
         ↓
3. Redirect a Google OAuth
   - Supabase genera code_verifier (PKCE)
   - Se guarda en localStorage
   - Redirect a consent screen de Google
         ↓
4. Usuario autoriza en Google
         ↓
5. Google redirect a: /auth/callback?code=xxx
         ↓
6. Callback handler en servidor:
   - Lee code_verifier de cookies
   - exchangeCodeForSession(code)
   - Crea sesión con JWT
         ↓
7. Sincronización con BD:
   - UPSERT en users (Supabase Auth)
   - UPSERT en studio_user_profiles (Prisma)
   - Guarda avatar_url de Google
         ↓
8. Redirect al dashboard
```

**Código del callback:**

```typescript
// src/app/(auth)/auth/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    // Supabase maneja code_verifier automáticamente desde cookies
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Sesión creada exitosamente
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Error: redirect a login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

---

## ⚙️ Configuración

### Variables de Entorno

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Configuración de Google OAuth

**Google Cloud Console:**

1. Crear proyecto en [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs:
   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   ```
5. Copiar Client ID y Client Secret

**Supabase Dashboard:**

1. Authentication → Providers → Google
2. Enable Google provider
3. Pegar Client ID y Client Secret
4. Site URL: `http://localhost:3000` (dev) o `https://your-domain.com` (prod)
5. Redirect URLs: `http://localhost:3000/auth/callback`

### Next.js Config

```javascript
// next.config.mjs
export default {
  images: {
    remotePatterns: [
      { 
        protocol: 'https', 
        hostname: 'lh3.googleusercontent.com' // ✅ CRÍTICO para avatares de Google
      },
      { 
        protocol: 'https', 
        hostname: 'your-supabase-project.supabase.co' 
      },
    ],
  },
}
```

---

## 🔄 Flujo OAuth con Google (PKCE Detallado)

### ¿Qué es PKCE?

**Proof Key for Code Exchange** - Protocolo de seguridad para OAuth en aplicaciones públicas (SPAs, mobile).

**Problema que resuelve:** En aplicaciones cliente (navegador), el `client_secret` no puede mantenerse secreto. PKCE elimina la necesidad de `client_secret` usando un desafío criptográfico.

### Componentes PKCE

```
code_verifier: String aleatorio de 43-128 caracteres
         ↓
code_challenge = base64url(SHA256(code_verifier))
         ↓
Se envía code_challenge a OAuth provider
         ↓
Al recibir el código, se envía code_verifier
         ↓
Provider valida: SHA256(code_verifier) === code_challenge
```

### Implementación en ZEN

**1. Cliente Unificado**

```typescript
// src/lib/supabase/browser.ts
export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // ✅ CRÍTICO para PKCE
        // NO usar storage personalizado - localStorage nativo
      },
    }
  )

  return client
}
```

**Importante:** ❌ NO crear clientes separados para OAuth. ✅ Usar un único cliente para todo.

**2. Inicio del flujo OAuth**

```typescript
// src/components/forms/LoginForm.tsx
async function handleGoogleSignIn() {
  const supabase = createClient()
  const origin = window.location.origin
  const redirectTo = `${origin}/auth/callback?next=/dashboard`

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { 
      redirectTo,
      queryParams: {
        access_type: 'offline', // Obtener refresh token
        prompt: 'consent', // Forzar consent screen
      }
    },
  })

  if (error) {
    setError(error.message)
  }
}
```

**3. Callback del servidor**

```typescript
// src/app/(auth)/auth/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()

  // ✅ Supabase detecta code_verifier automáticamente desde cookies
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[OAuth Callback] Error:', error)
    
    if (error.code === 'flow_state_not_found') {
      // PKCE expiró (>10 minutos) o ya fue usado
      return NextResponse.redirect(`${origin}/login?error=timeout`)
    }
    
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // ✅ Sesión creada, sincronizar con BD
  if (data.user) {
    await syncUserWithDatabase(data.user)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
```

**4. Configuración del servidor**

```typescript
// src/lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
      auth: {
        persistSession: true,
        detectSessionInUrl: true, // ✅ CRÍTICO para PKCE
        flowType: 'pkce',
      },
    }
  )
}
```

---

## 👤 Avatar del Usuario

### Prioridad de Fuentes

El avatar se obtiene en este orden:

```typescript
1. studio_user_profiles.avatar_url (personalizado por estudio)
         ↓ si null
2. users.avatar_url (avatar global del usuario)
         ↓ si null
3. user.user_metadata.avatar_url (de Google OAuth)
         ↓ si null
4. user.user_metadata.picture (alternativo de Google)
         ↓ si null
5. Iniciales del nombre (fallback visual)
```

### Implementación

**Server Action:**

```typescript
// src/lib/actions/studio/account/perfil.actions.ts
export async function obtenerPerfil(studioSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const dbUser = await prisma.users.findUnique({
    where: { supabase_id: user.id },
  })
  
  const studioProfile = await prisma.studio_user_profiles.findFirst({
    where: { supabase_id: user.id, studio_id: studio.id },
  })
  
  // ✅ Prioridad de avatar
  const avatarUrl =
    (studioProfile?.avatar_url as string) ?? 
    (dbUser.avatar_url as string) ??
    user?.user_metadata?.avatar_url ??
    user?.user_metadata?.picture
  
  return {
    success: true,
    data: {
      name: studioProfile?.full_name ?? dbUser.full_name,
      email: dbUser.email,
      avatarUrl: avatarUrl ?? undefined,
    }
  }
}
```

**Componente Cliente:**

```typescript
// src/components/auth/user-avatar.tsx
export function UserAvatar({ initialUserProfile }: Props) {
  const { user, loading } = useAuth()
  
  // ✅ Renderizar con datos del servidor aunque useAuth() no tenga usuario
  // Resuelve problema de hidratación
  if (!user && !initialUserProfile) {
    return null
  }
  
  const avatarUrl =
    userProfile?.avatarUrl ?? 
    initialUserProfile?.avatarUrl ?? 
    user?.user_metadata?.avatar_url ??
    user?.user_metadata?.picture
  
  return (
    <Image
      src={avatarUrl}
      alt={userName}
      fill
      className="object-cover"
      onError={() => setImageError(true)}
      unoptimized // ✅ No optimizar URLs externas de Google
    />
  )
}
```

---

## 🔐 Gestión de Sesiones

### Configuración de Sesión

```typescript
// Tiempo de vida del JWT
JWT_EXPIRY=3600 // 1 hora

// Tiempo de inactividad antes de cierre automático
SESSION_TIMEOUT=1800 // 30 minutos (configurable por usuario)
```

### SessionTimeoutProvider

```typescript
// src/components/providers/SessionTimeoutProvider.tsx
export function SessionTimeoutProvider({ 
  children, 
  inactivityTimeout = 30 // minutos
}) {
  const [showWarning, setShowWarning] = useState(false)
  
  useEffect(() => {
    let timer: NodeJS.Timeout
    
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setShowWarning(true) // Advertencia a los 28 minutos
        
        setTimeout(async () => {
          await logout() // Cierre automático a los 30 minutos
        }, 2 * 60 * 1000) // 2 minutos de advertencia
      }, (inactivityTimeout - 2) * 60 * 1000)
    }
    
    // Eventos que resetean el timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => 
      window.addEventListener(event, resetTimer)
    )
    
    resetTimer()
    
    return () => {
      events.forEach(event => 
        window.removeEventListener(event, resetTimer)
      )
      clearTimeout(timer)
    }
  }, [inactivityTimeout])
  
  return (
    <>
      {children}
      {showWarning && <SessionExpiringModal />}
    </>
  )
}
```

### Refresh Automático de Tokens

Supabase maneja automáticamente el refresh de tokens:

```typescript
// Configuración en createClient()
{
  auth: {
    autoRefreshToken: true, // ✅ Refresh automático antes de expirar
    persistSession: true,   // ✅ Persistir sesión en localStorage
  }
}
```

**Proceso:**
1. Token JWT expira en 1 hora
2. Supabase detecta expiración 5 minutos antes
3. Usa refresh token para obtener nuevo JWT
4. Actualiza cookies automáticamente
5. Usuario no nota interrupción

---

## ⚠️ Problemas Comunes y Soluciones

### 1. "invalid request: both auth code and code verifier should be non-empty"

**Causa:** El `code_verifier` no llegó al callback del servidor.

**Solución:**
```typescript
// ✅ Asegurarse de tener detectSessionInUrl: true
// src/lib/supabase/server.ts
auth: {
  detectSessionInUrl: true, // CRÍTICO
  flowType: 'pkce',
}
```

**Verificar:**
- ✅ `detectSessionInUrl: true` en `browser.ts`, `server.ts`, y `middleware.ts`
- ✅ Usar un único `createClient()` para todo (no crear clientes separados)
- ✅ No usar storage adapter personalizado

---

### 2. Avatar de Google no se muestra

**Causa:** Dominio de Google no permitido en Next.js Image.

**Solución:**
```javascript
// next.config.mjs
images: {
  remotePatterns: [
    { 
      protocol: 'https', 
      hostname: 'lh3.googleusercontent.com' // ✅ Agregar
    },
  ],
}
```

**Verificar:**
- ✅ Fallback a `user_metadata.avatar_url` y `user_metadata.picture`
- ✅ `unoptimized` prop en `<Image>` para URLs externas
- ✅ Renderizar con `initialUserProfile` aunque `useAuth()` no tenga usuario

---

### 3. "Unique constraint failed on the fields: (email)"

**Causa:** Intentar `create` cuando el usuario ya existe en `studio_user_profiles`.

**Solución:**
```typescript
// ❌ NO hacer
await prisma.studio_user_profiles.create({ data: { email, ... } })

// ✅ Hacer
await prisma.studio_user_profiles.upsert({
  where: { email },
  update: { is_active: true },
  create: { email, studio_id, role: 'SUSCRIPTOR' },
})
```

---

### 4. Usuario no detectado en AuthContext pero sesión existe

**Causa:** Problema de hidratación - el servidor tiene sesión pero el cliente no la detecta inmediatamente.

**Solución:**
```typescript
// src/components/auth/user-avatar.tsx
// ✅ Renderizar con initialUserProfile aunque user sea null
if (!user && !initialUserProfile) {
  return null
}

// Continuar renderizando con datos del servidor
```

---

### 5. "flow_state_not_found" después de OAuth

**Causa:** El `code_verifier` expiró (>10 minutos) o ya fue usado (one-shot).

**Solución:**
```typescript
// src/app/(auth)/auth/callback/route.ts
if (error.code === 'flow_state_not_found') {
  return NextResponse.redirect(`${origin}/login?error=timeout`)
}

// Mostrar mensaje claro al usuario
"El proceso de autenticación expiró. Por favor intenta nuevamente."
```

---

### 6. Sesión se pierde al refrescar la página

**Causa:** Storage no está persistiendo la sesión correctamente.

**Solución:**
```typescript
// ✅ NO usar storage adapter personalizado
// ✅ Dejar que Supabase use localStorage nativo
{
  auth: {
    persistSession: true,
    // NO pasar storage: customStorage
  }
}
```

---

### 7. Múltiples clientes de Supabase causan inconsistencias

**Causa:** Crear clientes separados para OAuth y auth normal.

**Solución:**
```typescript
// ❌ NO hacer
const oauthClient = createOAuthClient()
const regularClient = createClient()

// ✅ Hacer
const client = createClient() // Único cliente para todo
```

---

## 📁 Estructura de Archivos

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                    # Página de login
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts                # Callback OAuth (servidor)
│   │
│   ├── [slug]/
│   │   └── studio/
│   │       ├── layout.tsx                  # Layout con AuthProvider
│   │       └── config/
│   │           └── account/
│   │               ├── page.tsx            # Página de cuenta
│   │               └── AccountContent.tsx  # Perfil + OAuth
│   │
│   └── layout.tsx                          # Root layout con AuthProvider
│
├── components/
│   ├── auth/
│   │   └── user-avatar.tsx                 # Avatar con fallbacks
│   ├── forms/
│   │   └── LoginForm.tsx                   # Form login + OAuth
│   └── providers/
│       └── SessionTimeoutProvider.tsx      # Timeout de inactividad
│
├── contexts/
│   └── AuthContext.tsx                     # Context global de auth
│
├── lib/
│   ├── actions/
│   │   ├── auth/
│   │   │   ├── login.actions.ts            # Server Action login
│   │   │   ├── logout.action.ts            # Server Action logout
│   │   │   └── user-profile.action.ts      # Obtener perfil
│   │   └── studio/
│   │       └── account/
│   │           └── perfil.actions.ts       # CRUD perfil
│   │
│   ├── supabase/
│   │   ├── browser.ts                      # Cliente navegador
│   │   ├── server.ts                       # Cliente servidor
│   │   ├── middleware.ts                   # Cliente middleware
│   │   └── storage-adapter.ts              # (deprecated - no usar)
│   │
│   └── auth/
│       ├── user-utils.ts                   # Utilities servidor
│       └── user-utils-client.ts            # Utilities cliente
│
├── middleware.ts                           # Middleware Next.js
└── proxy.ts                                # Lógica de routing y auth
```

---

## ✅ Mejores Prácticas

### 1. Cliente de Supabase

```typescript
// ✅ DO: Un único cliente para todo
const client = createClient()
await client.auth.signInWithOAuth(...)
await client.auth.signInWithPassword(...)

// ❌ DON'T: Múltiples clientes
const oauthClient = createOAuthClient()
const passwordClient = createPasswordClient()
```

### 2. Storage

```typescript
// ✅ DO: localStorage nativo de Supabase
{
  auth: {
    persistSession: true,
    // NO pasar storage personalizado
  }
}

// ❌ DON'T: Storage adapter personalizado
{
  auth: {
    storage: customStorageAdapter // Causa inconsistencias
  }
}
```

### 3. Detección de Sesión en URL

```typescript
// ✅ DO: Activar en TODOS los clientes
// browser.ts, server.ts, middleware.ts
{
  auth: {
    detectSessionInUrl: true, // CRÍTICO para PKCE
  }
}

// ❌ DON'T: Desactivar o olvidar configurar
{
  auth: {
    detectSessionInUrl: false, // Rompe OAuth
  }
}
```

### 4. Avatar de Usuario

```typescript
// ✅ DO: Múltiples fallbacks
const avatarUrl =
  studioProfile?.avatar_url ??
  dbUser.avatar_url ??
  user?.user_metadata?.avatar_url ??
  user?.user_metadata?.picture ??
  null

// ❌ DON'T: Solo una fuente
const avatarUrl = user.user_metadata.avatar_url // Puede ser null
```

### 5. Manejo de Errores

```typescript
// ✅ DO: Errores específicos con mensajes claros
if (error.code === 'flow_state_not_found') {
  return { error: 'El proceso expiró. Intenta nuevamente.' }
}
if (error.code === 'invalid_grant') {
  return { error: 'Código OAuth inválido o expirado.' }
}

// ❌ DON'T: Mensajes genéricos
return { error: error.message } // Muy técnico para usuario
```

### 6. Sincronización con BD

```typescript
// ✅ DO: upsert para evitar duplicados
await prisma.studio_user_profiles.upsert({
  where: { email },
  update: { is_active: true },
  create: { email, studio_id, role: 'SUSCRIPTOR' },
})

// ❌ DON'T: create sin verificar
await prisma.studio_user_profiles.create({ ... }) // Puede fallar
```

### 7. Redirect Post-Login

```typescript
// ✅ DO: Redirect inteligente con next parameter
const next = searchParams.get('next') ?? '/dashboard'
return NextResponse.redirect(`${origin}${next}`)

// ❌ DON'T: Redirect hardcoded
return NextResponse.redirect('/dashboard') // Pierde contexto
```

### 8. Hidratación SSR

```typescript
// ✅ DO: Renderizar con datos del servidor
if (!user && !initialUserProfile) return null
// Continuar con initialUserProfile

// ❌ DON'T: Solo confiar en useAuth()
if (!user) return null // Parpadeo en SSR
```

---

## 🔬 Testing

### Test Manual del Flujo OAuth

1. **Limpiar estado:**
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   // Borrar cookies en DevTools
   ```

2. **Login con Google:**
   - Clic en "Continuar con Google"
   - Verificar redirect a Google
   - Autorizar permisos
   - Verificar redirect a callback
   - Verificar redirect final al dashboard

3. **Verificar en DevTools:**
   - **Application → Cookies:** Buscar `sb-*-auth-token`
   - **Application → Local Storage:** Buscar claves `sb-*`
   - **Console:** No errores de PKCE

4. **Verificar avatar:**
   - Avatar de Google visible en header
   - Inspeccionar elemento: URL `https://lh3.googleusercontent.com/...`

5. **Verificar sesión persistente:**
   - Refrescar página → sesión persiste
   - Cerrar y reabrir navegador → sesión persiste

### Test de Timeouts

1. Configurar timeout corto (5 minutos)
2. No interactuar por 3 minutos → advertencia
3. No interactuar por 5 minutos → cierre automático
4. Verificar redirect a login

---

## 📚 Referencias

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication)
- [OAuth 2.0 Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

## 🔄 Historial de Cambios

**2 de febrero de 2026:**
- ✅ Unificado `createClient()` para OAuth y password
- ✅ Eliminado storage adapter personalizado
- ✅ Fix avatar de Google con fallbacks
- ✅ Fix "Unique constraint failed" con upsert
- ✅ Fix hidratación SSR en UserAvatar
- ✅ Documentación completa actualizada

---

**Última revisión:** 2 de febrero de 2026  
**Autor:** Israel Wong  
**Estado:** ✅ Producción - Funcionando correctamente
