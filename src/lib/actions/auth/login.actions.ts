'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getRedirectPathForUser } from '@/lib/auth/redirect-utils'
import { getDefaultRoute } from '@/types/auth'
import { prisma } from '@/lib/prisma'

interface LoginResult {
  success: boolean
  error?: string
  redirectTo?: string
}

const RESTRICTED_MESSAGE =
  'Acceso restringido. El registro de nuevos estudios estará disponible próximamente.'

/**
 * Comprueba si un usuario ya existe en nuestra tabla users (por supabase_id)
 */
export async function checkUserExists(supabaseId: string): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { supabase_id: supabaseId },
    select: { id: true },
  })
  return !!user
}

/**
 * Resuelve la ruta de redirección desde la DB cuando user_metadata no tiene role/studio_slug.
 * Si no hay estudio asociado (user_studio_roles), devuelve /onboarding.
 */
export async function resolveRedirectFromDb(supabaseId: string): Promise<string> {
  const dbUser = await prisma.users.findUnique({
    where: { supabase_id: supabaseId },
    select: { id: true },
  })
  if (!dbUser) return '/onboarding'

  const platformRole = await prisma.user_platform_roles.findFirst({
    where: { user_id: dbUser.id, is_active: true },
    select: { role: true },
    orderBy: { granted_at: 'desc' },
  })
  const role = platformRole?.role?.toLowerCase() ?? 'suscriptor'

  if (role === 'super_admin') return getDefaultRoute('super_admin')
  if (role === 'agente') return getDefaultRoute('agente')

  const studioRole = await prisma.user_studio_roles.findFirst({
    where: { user_id: dbUser.id, is_active: true },
    include: { studio: { select: { slug: true } } },
    orderBy: { accepted_at: 'desc' },
  })
  const studioSlug = studioRole?.studio?.slug
  if (studioSlug) return getDefaultRoute('suscriptor', studioSlug)

  return '/onboarding'
}

/** Para uso en LoginForm: resuelve redirect desde DB (p. ej. cuando metadata no tiene role/studio_slug). */
export async function getRedirectAfterLogin(supabaseUserId: string): Promise<{ redirectTo: string }> {
  const redirectTo = await resolveRedirectFromDb(supabaseUserId)
  return { redirectTo }
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('❌ Login error:', error.message)
      return { success: false, error: error.message }
    }

    if (!data.user) {
      return { success: false, error: 'No se pudo obtener información del usuario' }
    }

    const exists = await checkUserExists(data.user.id)
    if (!exists) {
      await supabase.auth.signOut()
      return { success: false, error: RESTRICTED_MESSAGE }
    }

    console.log('[Login Action] Usuario autenticado:', data.user.id)

    let redirectPath: string | null = null
    const redirectResult = getRedirectPathForUser(data.user)

    if (redirectResult.shouldRedirect && redirectResult.redirectPath) {
      redirectPath = redirectResult.redirectPath
    } else {
      redirectPath = await resolveRedirectFromDb(data.user.id)
    }

    console.log('✅ Login exitoso:', data.user.email, '→ Redirect a:', redirectPath)

    revalidatePath('/', 'layout')

    return { success: true, redirectTo: redirectPath }
  } catch (error) {
    console.error('❌ Error en loginAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

