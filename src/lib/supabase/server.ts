import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Crea un cliente de Supabase optimizado para el servidor
 * Configuración robusta con timeouts y manejo de errores
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Validar variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            const baseOptions = {
              path: '/',
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production',
            }
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...baseOptions, ...options })
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      // Configuración optimizada para producción
      auth: {
        persistSession: false, // No persistir sesiones en servidor
        autoRefreshToken: false, // No auto-refresh en servidor
        detectSessionInUrl: false, // No detectar sesión en URL
      },
      // Configuración de timeouts
      global: {
        headers: {
          'X-Client-Info': 'prosocial-platform-server',
        },
      },
    }
  )
}
