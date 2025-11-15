/**
 * SINGLETON SUPABASE CLIENT
 * 
 * UN SOLO cliente para toda la aplicación
 * Evita múltiples instancias y problemas de sesión
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'zen-auth-token',
      flowType: 'pkce',
    },
  })

  return supabaseInstance
}

// Export también como createClient para compatibilidad
export const createClient = getSupabaseClient

