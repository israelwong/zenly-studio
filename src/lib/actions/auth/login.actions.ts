'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
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

/**
 * Fallback: obtiene studio slug desde platform_user_profiles por supabase_id.
 * Útil cuando user_studio_roles no tiene fila pero el usuario sí está vinculado por perfil.
 */
export async function getStudioSlugBySupabaseId(supabaseId: string): Promise<string | null> {
  const profile = await prisma.platform_user_profiles.findFirst({
    where: { supabaseUserId: supabaseId, studio_id: { not: null } },
    include: { studio: { select: { slug: true } } },
  })
  return profile?.studio?.slug ?? null
}

/**
 * Fallback "owner check": obtiene el slug del estudio donde el usuario es OWNER (user_studio_roles.role = OWNER).
 * Prueba primero con Prisma (contexto normal). Si devuelve null (p. ej. RLS oculta filas), usa Admin client para bypass RLS.
 */
export async function getStudioSlugByOwnerId(supabaseUserId: string): Promise<string | null> {
  console.log('🔍 [Owner Check] Starting for Supabase ID:', supabaseUserId)

  try {
    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: supabaseUserId },
      select: { id: true, email: true },
    })

    console.log('👤 [Owner Check] Prisma User found:', dbUser ?? null)

    if (!dbUser) {
      console.warn('⚠️ [Owner Check] No Prisma user found for this Supabase ID. Sync might be missing.')
      return null
    }

    console.log('👤 [Owner Check] Internal user id (CUID):', dbUser.id)

    const ownerRole = await prisma.user_studio_roles.findFirst({
      where: { user_id: dbUser.id, role: 'OWNER', is_active: true },
      include: { studio: { select: { slug: true } } },
      orderBy: { accepted_at: 'desc' },
    })

    console.log('👑 [Owner Check] Owner Role found:', ownerRole ? { studio_id: ownerRole.studio_id, slug: ownerRole.studio?.slug } : null)

    if (ownerRole?.studio?.slug) {
      return ownerRole.studio.slug
    }

    console.log('🛡️ [Owner Check] Attempting Admin Fallback...')

    const admin = createAdminClient()
    const { data: roleRow, error: roleError } = await admin
      .from('user_studio_roles')
      .select('studio_id')
      .eq('user_id', dbUser.id)
      .eq('role', 'OWNER')
      .eq('is_active', true)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('🛡️ [Owner Check] Admin role query result:', { roleRow, roleError: roleError?.message })

    if (!roleRow?.studio_id) {
      console.log('🛡️ [Owner Check] Admin fallback: no role row or studio_id')
      return null
    }

    const { data: studioRow, error: studioError } = await admin
      .from('studios')
      .select('slug')
      .eq('id', roleRow.studio_id)
      .maybeSingle()

    console.log('🛡️ [Owner Check] Admin studio query result:', { studioRow, studioError: studioError?.message })

    return studioRow?.slug ?? null
  } catch (error) {
    console.error('💥 [Owner Check] Crash:', error)
    return null
  }
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

      // Rate limit (429 / Too many requests): mensaje amigable sin exponer detalle
      const msg = (error as { message?: string; status?: number }).message?.toLowerCase() ?? ''
      const status = (error as { status?: number }).status
      const isRateLimited =
        status === 429 ||
        msg.includes('too many') ||
        msg.includes('rate limit') ||
        msg.includes('demasiados intentos')
      if (isRateLimited) {
        return {
          success: false,
          error:
            'Por seguridad, hemos bloqueado los intentos temporalmente. Por favor espera un minuto.',
        }
      }

      // Registrar intento fallido si tenemos el email
      if (email) {
        try {
          const dbUser = await prisma.users.findUnique({
            where: { email },
          });
          if (dbUser) {
            await prisma.user_access_logs.create({
              data: {
                user_id: dbUser.id,
                action: 'login',
                success: false,
                ip_address: 'N/A',
                user_agent: 'N/A',
                details: {
                  provider: 'email',
                  timestamp: new Date().toISOString(),
                },
              },
            });
          }
        } catch (logError) {
          console.error('Error registrando log de login fallido:', logError);
        }
      }

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

    // Registrar login exitoso
    try {
      const dbUser = await prisma.users.findUnique({
        where: { supabase_id: data.user.id },
      });
      if (dbUser) {
        await prisma.user_access_logs.create({
          data: {
            user_id: dbUser.id,
            action: 'login',
            success: true,
            ip_address: 'N/A',
            user_agent: 'N/A',
            details: {
              provider: 'email',
              timestamp: new Date().toISOString(),
            },
          },
        });
      }
    } catch (logError) {
      console.error('Error registrando log de login:', logError);
    }

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

