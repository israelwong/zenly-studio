'use server';

import {
  getClientNotifications,
  getUnreadCount,
  markAsRead,
  markAsClicked,
  deleteNotification,
  getNotificationsHistory,
} from '@/lib/notifications/client/studio-client-notification.service';

/**
 * Obtiene notificaciones del cliente
 */
export async function getClientNotificationsAction(
  studioSlug: string,
  contactId: string,
  options?: {
    limit?: number;
    unreadOnly?: boolean;
  }
) {
  // Obtener studio_id desde slug
  const { prisma } = await import('@/lib/prisma');
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!studio) {
    return {
      success: false,
      error: 'Studio no encontrado',
    };
  }

  const notifications = await getClientNotifications(contactId, studio.id, options);

  return {
    success: true,
    data: notifications,
  };
}

/**
 * Obtiene conteo de notificaciones no leídas
 */
export async function getUnreadNotificationsCount(studioSlug: string, contactId: string) {
  const { prisma } = await import('@/lib/prisma');
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!studio) {
    return {
      success: false,
      error: 'Studio no encontrado',
    };
  }

  const count = await getUnreadCount(contactId, studio.id);

  return {
    success: true,
    data: count,
  };
}

/**
 * Marca notificación como leída
 */
export async function markNotificationAsRead(notificationId: string, contactId: string) {
  await markAsRead(notificationId, contactId);
  return { success: true };
}

/**
 * Marca notificación como clickeada
 */
export async function markNotificationAsClicked(notificationId: string, contactId: string) {
  await markAsClicked(notificationId, contactId);
  return { success: true };
}

/**
 * Elimina notificación
 */
export async function deleteNotificationAction(notificationId: string, contactId: string) {
  await deleteNotification(notificationId, contactId);
  return { success: true };
}

/**
 * Obtiene historial de notificaciones
 */
export async function getNotificationsHistoryAction(
  studioSlug: string,
  contactId: string,
  options?: {
    period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
    category?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }
) {
  const { prisma } = await import('@/lib/prisma');
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!studio) {
    return {
      success: false,
      error: 'Studio no encontrado',
    };
  }

  const result = await getNotificationsHistory(contactId, studio.id, options);

  return {
    success: true,
    data: result,
  };
}

