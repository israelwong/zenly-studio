'use server';

import { prisma } from '@/lib/prisma';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAsClicked,
  deleteNotification,
} from '@/lib/notifications/studio';
import { createClient } from '@/lib/supabase/server';

interface GetNotificationsParams {
  studioSlug: string;
  userId: string;
  limit?: number;
  unreadOnly?: boolean;
}

export async function getStudioNotifications({
  studioSlug,
  userId,
  limit = 50,
  unreadOnly = false,
}: GetNotificationsParams) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const notifications = await getUserNotifications(
      userId,
      studio.id,
      { limit, unreadOnly }
    );

    return {
      success: true,
      data: notifications,
    };
  } catch (error) {
    console.error('[getStudioNotifications] Error:', error);
    return {
      success: false,
      error: 'Error al obtener notificaciones',
    };
  }
}

export async function getUnreadNotificationsCount(studioSlug: string, userId: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const count = await getUnreadCount(userId, studio.id);

    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error('[getUnreadNotificationsCount] Error:', error);
    return {
      success: false,
      error: 'Error al obtener conteo de notificaciones',
    };
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    await markAsRead(notificationId, userId);
    return { success: true };
  } catch (error) {
    console.error('[markNotificationAsRead] Error:', error);
    return { success: false, error: 'Error al marcar notificación como leída' };
  }
}

export async function markNotificationAsClicked(notificationId: string, userId: string) {
  try {
    await markAsClicked(notificationId, userId);
    return { success: true };
  } catch (error) {
    console.error('[markNotificationAsClicked] Error:', error);
    return { success: false, error: 'Error al marcar notificación como clickeada' };
  }
}

export async function deleteNotificationAction(notificationId: string, userId: string) {
  try {
    await deleteNotification(notificationId, userId);
    return { success: true };
  } catch (error) {
    console.error('[deleteNotificationAction] Error:', error);
    return { success: false, error: 'Error al eliminar notificación' };
  }
}

export async function getCurrentUserId(studioSlug: string) {
  try {
    // Verificar autenticación básica (solo para saber que está logueado)
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Obtener studio por slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Buscar usuario autenticado en users
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: authUser.email },
          { supabase_id: authUser.id },
        ],
      },
      select: { id: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'Usuario no encontrado en la base de datos' };
    }

    // Obtener la relación usuario-estudio desde user_studio_roles
    const userStudioRole = await prisma.user_studio_roles.findFirst({
      where: {
        user_id: user.id,
        studio_id: studio.id,
        is_active: true,
      },
      select: { 
        id: true,
        user: {
          select: { email: true },
        },
      },
    });

    if (!userStudioRole) {
      return { success: false, error: 'Usuario no tiene acceso a este estudio' };
    }

    // Buscar o crear studio_user_profiles usando el email del usuario
    let userProfile = await prisma.studio_user_profiles.findUnique({
      where: {
        email: user.email,
      },
      select: { id: true, studio_id: true },
    });

    // Si no existe, crearlo
    if (!userProfile) {
      userProfile = await prisma.studio_user_profiles.create({
        data: {
          email: user.email,
          studio_id: studio.id,
          role: 'SUSCRIPTOR',
          is_active: true,
        },
        select: { id: true, studio_id: true },
      });
    } else if (!userProfile.studio_id) {
      // Si existe pero sin studio_id, actualizarlo
      userProfile = await prisma.studio_user_profiles.update({
        where: { id: userProfile.id },
        data: {
          studio_id: studio.id,
        },
        select: { id: true, studio_id: true },
      });
    }

    return {
      success: true,
      data: userProfile.id,
    };
  } catch (error) {
    console.error('[getCurrentUserId] Error:', error);
    return { success: false, error: 'Error al obtener ID de usuario' };
  }
}

