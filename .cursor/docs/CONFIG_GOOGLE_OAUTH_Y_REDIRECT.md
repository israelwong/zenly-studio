# Configuración: Variables de Entorno y Google OAuth Redirect

Para evitar "Redirect URI mismatch" o "Missing Keys" en el login con Google.

---

## 1. Variables de Entorno Requeridas

### Supabase (obligatorias para auth)

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (ej. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública |

**Dónde revisar:** `.env.local` o el archivo donde cargues las keys (por ejemplo en Vercel: Settings > Environment Variables).  
**Referencia:** `.env.example` incluye estas dos en la sección SUPABASE.

### Sincronía con Supabase Dashboard

- **Auth > URL Configuration:**  
  - **Site URL:** debe ser la URL base de tu app (ej. `http://localhost:3000` en dev, `https://tudominio.com` en prod).  
  - **Redirect URLs:** debe incluir la URL exacta a la que Supabase redirige tras el OAuth (ver sección 2).

- **Auth > Providers > Google:**  
  - Client ID y Client Secret son los de Google Cloud Console.  
  - No hace falta duplicar variables de Google en tu `.env` para el **login** con Google; Supabase usa las que configuras en el Dashboard.  
  - Las variables `GOOGLE_*` del `.env` se usan para otras integraciones (Drive, Calendar, Picker, etc.), no para el flujo de login con Supabase.

---

## 2. URL de Redirección

### Qué usa el código

- **LoginForm.tsx (login con Google):**  
  `redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentPath)}``  
  Es decir: **origen + `/auth/callback`** (los query params `next` pueden variar).

- **oauth.actions.ts (vinculación de recurso):**  
  `redirectTo = `${baseUrl}/auth/callback`` con `baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'`.

### Qué configurar

**En Supabase Dashboard (Authentication > URL Configuration > Redirect URLs):**

Añade exactamente las URLs a las que tu app puede recibir el redirect tras el login:

- Desarrollo: `http://localhost:3000/auth/callback`
- Producción: `https://tudominio.com/auth/callback`

Puedes usar wildcard solo si Supabase lo permite (ej. `https://*.tudominio.com/auth/callback`); si no, añade cada dominio explícitamente.

**En Google Cloud Console (APIs & Services > Credentials > tu OAuth 2.0 Client ID > Authorized redirect URIs):**

Aquí **no** va la URL de tu app. Google redirige primero a Supabase. Debes poner la URI de callback de **Supabase**:

- `https://<PROJECT_REF>.supabase.co/auth/v1/callback`

Sustituye `<PROJECT_REF>` por el ID de tu proyecto Supabase (lo ves en la URL del proyecto en el Dashboard, o en `NEXT_PUBLIC_SUPABASE_URL`: `https://PROJECT_REF.supabase.co`).

Ejemplo:  
`https://abcdefghijk.supabase.co/auth/v1/callback`

**Resumen:**

| Dónde | URL a configurar |
|-------|-------------------|
| Supabase Dashboard > Redirect URLs | `https://tudominio.com/auth/callback` (y localhost en dev) |
| Google Cloud > Authorized redirect URIs | `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |

---

## 3. Comprobación Rápida

1. **Keys:** En tu entorno de ejecución, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están definidas y son las del proyecto correcto.
2. **Supabase Redirect URLs:** Incluyen `http://localhost:3000/auth/callback` (dev) y/o `https://tudominio.com/auth/callback` (prod).
3. **Google redirect URI:** Una sola entrada con `https://<PROJECT_REF>.supabase.co/auth/v1/callback` (sin barra final, sin query params).

Con esto se evitan errores de "Redirect URI mismatch" y "Missing Keys" en el login real.
