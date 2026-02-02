/**
 * SUPABASE CLIENT - BROWSER
 * Cliente singleton para el navegador con persistencia automática
 * Respeta la preferencia "rememberMe" del usuario
 * 
 * IMPORTANTE: Un solo cliente para todo (auth normal y OAuth)
 * El storage adapter maneja PKCE automáticamente
 */

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'
import { createRememberMeStorage } from './storage-adapter'

let client: SupabaseClient | undefined


/**
 * Origen para redirectTo de OAuth. Usa localhost en lugar de 127.0.0.1
 * para no duplicar cookies entre ambos hosts.
 */
export function getOAuthOrigin(): string {
  if (typeof window === 'undefined') return ''
  const { hostname, port, protocol } = window.location
  if (hostname === '127.0.0.1') {
    return `${protocol}//localhost${port ? ':' + port : ''}`
  }
  return window.location.origin
}

export function createClient() {
  // Si ya existe, devolverlo
  if (client) {
    return client
  }

  // IMPORTANTE: Usar localStorage directamente (sin storage adapter personalizado)
  // El storage adapter con rememberMe causaba inconsistencias entre OAuth y auth normal
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // NO usar storage personalizado - dejar que Supabase use localStorage nativo
      },
    }
  )

  console.log('[Supabase Client] ✅ Cliente creado con localStorage nativo')
  return client
}
