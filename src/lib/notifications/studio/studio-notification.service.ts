'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { CreateStudioNotificationInput, StudioNotificationScope } from './types';

/**
 * Crea notificación para todos los usuarios activos del estudio
 */
async function createStudioScopeNotification(
  input: CreateStudioNotificationInput,
  route: string | null
) {
  // Obtener todos los usuarios activos del estudio
  const users = await prisma.studio_user_profiles.findMany({
    where: {
      studio_id: input.studio_id,
      is_active: true,
    },
    select: { id: true },
  });

  // Crear notificación para cada usuario
  const notifications = await Promise.all(
    users.map(user =>
      prisma.studio_notifications.create({
        data: {
          scope: StudioNotificationScope.STUDIO,
          studio_id: input.studio_id,
          user_id: user.id,
          type: input.type,
          title: input.title,
          message: input.message,
          category: input.category || 'general',
          priority: input.priority || 'MEDIUM',
          route,
          route_params: input.route_params as Prisma.InputJsonValue,
          metadata: input.metadata as Prisma.InputJsonValue,
          promise_id: input.promise_id,
          event_id: input.event_id,
          payment_id: input.payment_id,
          paquete_id: input.paquete_id,
          contact_id: input.contact_id,
          lead_id: input.lead_id,
          agenda_id: input.agenda_id,
        },
      })
    )
  );

  // El trigger de base de datos maneja el broadcast automáticamente

  return notifications;
}

/**
 * Crea notificación para un usuario específico
 */
async function createUserNotification(
  input: CreateStudioNotificationInput,
  route: string | null
) {
  if (!input.user_id) {
    throw new Error('user_id requerido para notificaciones de usuario');
  }

  const notification = await prisma.studio_notifications.create({
    data: {
      scope: StudioNotificationScope.USER,
      studio_id: input.studio_id,
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      message: input.message,
      category: input.category || 'general',
      priority: input.priority || 'MEDIUM',
      route,
      route_params: input.route_params as Prisma.InputJsonValue,
      metadata: input.metadata as Prisma.InputJsonValue,
      promise_id: input.promise_id,
      event_id: input.event_id,
      payment_id: input.payment_id,
      paquete_id: input.paquete_id,
      contact_id: input.contact_id,
      lead_id: input.lead_id,
      agenda_id: input.agenda_id,
    },
  });

  // El trigger de base de datos maneja el broadcast automáticamente

  return notification;
}

/**
 * Crea notificación para usuarios con un rol específico
 */
async function createRoleNotification(
  input: CreateStudioNotificationInput,
  route: string | null
) {
  if (!input.role) {
    throw new Error('role requerido para notificaciones por rol');
  }

  // Obtener usuarios con el rol específico en el estudio
  const userRoles = await prisma.user_studio_roles.findMany({
    where: {
      studio_id: input.studio_id,
      role: input.role,
      is_active: true,
    },
    select: { user_id: true },
  });

  const userIds = userRoles.map(ur => ur.user_id);

  if (userIds.length === 0) {
    return [];
  }

  // Obtener perfiles de usuario activos
  const users = await prisma.studio_user_profiles.findMany({
    where: {
      id: { in: userIds },
      is_active: true,
    },
    select: { id: true },
  });

  // Crear notificación para cada usuario
  const notifications = await Promise.all(
    users.map(user =>
      prisma.studio_notifications.create({
        data: {
          scope: StudioNotificationScope.ROLE,
          studio_id: input.studio_id,
          user_id: user.id,
          role: input.role,
          type: input.type,
          title: input.title,
          message: input.message,
          category: input.category || 'general',
          priority: input.priority || 'MEDIUM',
          route,
          route_params: input.route_params as Prisma.InputJsonValue,
          metadata: input.metadata as Prisma.InputJsonValue,
          promise_id: input.promise_id,
          event_id: input.event_id,
          payment_id: input.payment_id,
          paquete_id: input.paquete_id,
          contact_id: input.contact_id,
          lead_id: input.lead_id,
          agenda_id: input.agenda_id,
        },
      })
    )
  );

  // El trigger de base de datos maneja el broadcast automáticamente

  return notifications;
}

/**
 * Crea una notificación según su scope
 * IMPORTANTE: No construimos la ruta aquí, guardamos el template y route_params
 * La ruta se construye en el cliente cuando el usuario hace click
 */
export async function createStudioNotification(input: CreateStudioNotificationInput) {
  // NO construir la ruta aquí, guardar el template y params tal cual
  // La ruta se construirá en el cliente usando buildRoute
  const route: string | null = input.route ?? null;

  if (input.scope === StudioNotificationScope.STUDIO) {
    return createStudioScopeNotification(input, route);
  }

  if (input.scope === StudioNotificationScope.USER) {
    return createUserNotification(input, route);
  }

  if (input.scope === StudioNotificationScope.ROLE) {
    return createRoleNotification(input, route);
  }

  // Si el scope no es válido, lanzar error
  throw new Error(`Scope inválido: ${input.scope}`);
}

/**
 * Marca notificación como leída
 */
export async function markAsRead(notificationId: string, userId: string) {
  return prisma.studio_notifications.updateMany({
    where: {
      id: notificationId,
      user_id: userId,
    },
    data: {
      is_read: true,
      read_at: new Date(),
    },
  });
}

/**
 * Marca notificación como clickeada y leída
 */
export async function markAsClicked(notificationId: string, userId: string) {
  return prisma.studio_notifications.updateMany({
    where: {
      id: notificationId,
      user_id: userId,
    },
    data: {
      clicked_at: new Date(),
      is_read: true,
      read_at: new Date(),
    },
  });
}

/**
 * Obtiene notificaciones de un usuario
 */
export async function getUserNotifications(
  userId: string,
  studioId: string,
  options?: {
    limit?: number;
    unreadOnly?: boolean;
  }
) {
  return prisma.studio_notifications.findMany({
    where: {
      user_id: userId,
      studio_id: studioId,
      is_active: true,
      ...(options?.unreadOnly && { is_read: false }),
    },
    orderBy: { created_at: 'desc' },
    take: options?.limit || 50,
  });
}

/**
 * Obtiene conteo de notificaciones no leídas
 */
export async function getUnreadCount(userId: string, studioId: string) {
  return prisma.studio_notifications.count({
    where: {
      user_id: userId,
      studio_id: studioId,
      is_active: true,
      is_read: false,
    },
  });
}

/**
 * Elimina/desactiva una notificación
 */
export async function deleteNotification(notificationId: string, userId: string) {
  return prisma.studio_notifications.updateMany({
    where: {
      id: notificationId,
      user_id: userId,
    },
    data: {
      is_active: false,
    },
  });
}


