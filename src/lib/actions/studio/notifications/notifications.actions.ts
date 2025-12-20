'use server';

import { prisma } from '@/lib/prisma';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAsClicked,
  deleteNotification,
  getNotificationsHistory,
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

export async function getStudioNotificationsHistory({
  studioSlug,
  userId,
  options,
}: {
  studioSlug: string;
  userId: string;
  options?: {
    includeInactive?: boolean;
    period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
    category?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  };
}) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const result = await getNotificationsHistory(userId, studio.id, options);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[getStudioNotificationsHistory] Error:', error);
    return {
      success: false,
      error: 'Error al obtener historial de notificaciones',
    };
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


    // Buscar studio_user_profiles directamente por supabase_id (más eficiente)
    let userProfile = await prisma.studio_user_profiles.findFirst({
      where: {
        supabase_id: authUser.id,
        studio_id: studio.id,
        is_active: true,
      },
      select: { id: true, studio_id: true, email: true, supabase_id: true },
    });

    // Si no existe, buscar usuario en users para obtener email y crear perfil
    if (!userProfile) {
      const user = await prisma.users.findFirst({
        where: {
          supabase_id: authUser.id,
        },
        select: { id: true, email: true },
      });

      if (!user) {
        return { success: false, error: 'Usuario no encontrado en la base de datos' };
      }

      // Verificar que el usuario tenga acceso al studio
      const userStudioRole = await prisma.user_studio_roles.findFirst({
        where: {
          user_id: user.id,
          studio_id: studio.id,
          is_active: true,
        },
      });

      if (!userStudioRole) {
        return { success: false, error: 'Usuario no tiene acceso a este estudio' };
      }

      // Crear studio_user_profiles con supabase_id
      // IMPORTANTE: Asegurar que supabase_id sea string (no UUID)
      userProfile = await prisma.studio_user_profiles.create({
        data: {
          email: user.email,
          supabase_id: authUser.id, // Ya es string desde Supabase
          studio_id: studio.id,
          role: 'SUSCRIPTOR',
          is_active: true,
        },
        select: { id: true, studio_id: true, email: true, supabase_id: true },
      });

      console.log('[getCurrentUserId] ✅ Perfil creado:', {
        id: userProfile.id,
        email: user.email,
        supabase_id: userProfile.supabase_id,
        studio_id: studio.id,
      });
    } else {
      // Verificar que el perfil existente tenga supabase_id correcto
      if (!userProfile.supabase_id || userProfile.supabase_id !== authUser.id) {
        // Actualizar supabase_id si no coincide
        await prisma.studio_user_profiles.update({
          where: { id: userProfile.id },
          data: { supabase_id: authUser.id },
        });
      }
    }

    // Verificar que el perfil tenga todos los campos necesarios
    const fullProfile = await prisma.studio_user_profiles.findUnique({
      where: { id: userProfile.id },
      select: { id: true, supabase_id: true, studio_id: true, is_active: true, email: true },
    });

    if (!fullProfile || !fullProfile.supabase_id || !fullProfile.is_active) {
      return {
        success: false,
        error: `Perfil incompleto: supabase_id=${!!fullProfile?.supabase_id}, is_active=${fullProfile?.is_active}`
      };
    }

    // Verificación final: asegurar que supabase_id coincide exactamente
    if (fullProfile.supabase_id !== authUser.id) {
      return {
        success: false,
        error: `supabase_id no coincide: perfil=${fullProfile.supabase_id}, auth=${authUser.id}`
      };
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

