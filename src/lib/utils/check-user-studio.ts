'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user-utils';

/**
 * Verifica a qué studio será redirigido el usuario después del login
 * 
 * @returns El slug del studio activo más reciente, o null si no tiene studio
 */
export async function getActiveStudioSlug(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return null;
    }

    // Buscar studio activo en user_studio_roles (misma lógica que en procesarUsuarioOAuth)
    const studioRole = await prisma.user_studio_roles.findFirst({
      where: {
        user_id: user.id,
        is_active: true,
      },
      include: {
        studio: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: {
        accepted_at: 'desc', // Último studio aceptado
      },
    });

    return studioRole?.studio?.slug || null;
  } catch (error) {
    console.error('[getActiveStudioSlug] Error:', error);
    return null;
  }
}

/**
 * Verifica si el usuario será redirigido a prosocial después del login
 * 
 * @returns true si será redirigido a prosocial, false en caso contrario
 */
export async function willRedirectToProsocial(): Promise<boolean> {
  const activeStudioSlug = await getActiveStudioSlug();
  return activeStudioSlug === 'prosocial';
}

/**
 * Obtiene todos los studios activos del usuario (usa sesión desde cookies).
 * 
 * @returns Array con los slugs de todos los studios activos del usuario
 */
export async function getUserActiveStudios(): Promise<string[]> {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return [];
    }

    const studioRoles = await prisma.user_studio_roles.findMany({
      where: {
        user_id: user.id,
        is_active: true,
      },
      include: {
        studio: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: {
        accepted_at: 'desc',
      },
    });

    return studioRoles.map(role => role.studio.slug).filter(Boolean);
  } catch (error) {
    console.error('[getUserActiveStudios] Error:', error);
    return [];
  }
}

/**
 * Obtiene los slugs de studios activos por supabase_id (para uso en callback OAuth,
 * donde la sesión aún no está en cookies).
 */
export async function getActiveStudioSlugsBySupabaseId(
  supabaseUserId: string
): Promise<string[]> {
  try {
    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: supabaseUserId },
      select: { id: true },
    });
    if (!dbUser) return [];

    const studioRoles = await prisma.user_studio_roles.findMany({
      where: {
        user_id: dbUser.id,
        is_active: true,
      },
      include: {
        studio: { select: { slug: true } },
      },
      orderBy: { accepted_at: 'desc' },
    });
    return studioRoles.map(r => r.studio.slug).filter(Boolean);
  } catch (error) {
    console.error('[getActiveStudioSlugsBySupabaseId] Error:', error);
    return [];
  }
}

/**
 * Verifica si un usuario es Owner o Admin de un studio
 * 
 * @param userId ID del usuario
 * @param studioId ID del studio
 * @returns true si el usuario es OWNER o ADMIN, false en caso contrario
 */
export async function isStudioOwnerOrAdmin(
  userId: string,
  studioId: string
): Promise<boolean> {
  try {
    const role = await prisma.user_studio_roles.findFirst({
      where: {
        user_id: userId,
        studio_id: studioId,
        role: { in: ['OWNER', 'ADMIN'] },
        is_active: true,
      },
      select: {
        id: true,
      },
    });
    return !!role;
  } catch (error) {
    console.error('[isStudioOwnerOrAdmin] Error:', error);
    return false;
  }
}

