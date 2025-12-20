'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getRedirectPathForUser } from '@/lib/auth/redirect-utils'

interface LoginResult {
  success: boolean
  error?: string
  redirectTo?: string
}

/**
 * Server Action para login
 * Maneja autenticación, verificación de sesión y redirect en el servidor
 */
export async function loginAction(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const supabase = await createClient()

    // Intentar login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('❌ Login error:', error.message)
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No se pudo obtener información del usuario',
      }
    }

    // Usar función única de verdad para determinar ruta de redirección
    const redirectResult = getRedirectPathForUser(data.user)

    if (!redirectResult.shouldRedirect || !redirectResult.redirectPath) {
      console.error('❌ No se pudo determinar ruta de redirección')
      return {
        success: false,
        error: 'No se pudo determinar la ruta de redirección',
      }
    }

    const redirectPath = redirectResult.redirectPath

    console.log('✅ Login exitoso:', data.user.email)
    console.log('✅ Redirect a:', redirectPath)

    // Revalidar todas las rutas para asegurar que el middleware detecte la sesión
    revalidatePath('/', 'layout')

    // Retornar éxito y ruta para que el cliente haga hard redirect
    // Esto asegura que las cookies se sincronicen correctamente
    return {
      success: true,
      redirectTo: redirectPath,
    }

  } catch (error) {
    console.error('❌ Error en loginAction:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

