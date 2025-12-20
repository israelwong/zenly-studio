/**
 * SUPABASE CLIENT - BROWSER
 * Cliente singleton para el navegador con persistencia automática
 * Respeta la preferencia "rememberMe" del usuario
 */

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'
import { createRememberMeStorage } from './storage-adapter'

let client: SupabaseClient | undefined

export function createClient() {
  // Si ya existe, devolverlo
  if (client) {
    return client
  }

  // Crear storage adapter que respeta preferencia rememberMe
  const storage = createRememberMeStorage()

  // Crear nuevo cliente con persistencia habilitada y storage personalizado
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: storage,
      }
    }
  )

  return client
}
