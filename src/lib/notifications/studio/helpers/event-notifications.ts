'use server';

import { prisma } from '@/lib/prisma';
import { createStudioNotification } from '../studio-notification.service';
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from '../types';

export async function notifyEventApproved(
  studioId: string,
  eventId: string,
  eventName: string
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });
  
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.EVENT_APPROVED,
    studio_id: studioId,
    title: 'Evento aprobado',
    message: `El evento "${eventName}" ha sido aprobado`,
    category: 'events',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/studio/builder/business/events/{event_id}',
    route_params: {
      slug: studio?.slug,
      event_id: eventId,
    },
    metadata: {
      event_name: eventName,
    },
    event_id: eventId,
  });
}

export async function notifyEventCreated(
  studioId: string,
  eventId: string,
  eventName: string
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });
  
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.EVENT_CREATED,
    studio_id: studioId,
    title: 'Nuevo evento creado',
    message: `Se creó un nuevo evento: "${eventName}"`,
    category: 'events',
    priority: NotificationPriority.MEDIUM,
    route: '/{slug}/studio/builder/business/events/{event_id}',
    route_params: {
      slug: studio?.slug,
      event_id: eventId,
    },
    metadata: {
      event_name: eventName,
    },
    event_id: eventId,
  });
}

export async function notifyEventCancelled(
  studioId: string,
  eventId: string,
  eventName: string
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });
  
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.EVENT_CANCELLED,
    studio_id: studioId,
    title: 'Evento cancelado',
    message: `El evento "${eventName}" ha sido cancelado`,
    category: 'events',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/studio/builder/business/events/{event_id}',
    route_params: {
      slug: studio?.slug,
      event_id: eventId,
    },
    metadata: {
      event_name: eventName,
    },
    event_id: eventId,
  });
}

