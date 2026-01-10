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
 * Obtiene todos los studios activos del usuario
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

