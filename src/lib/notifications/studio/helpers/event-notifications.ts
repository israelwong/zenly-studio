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
    route: '/{slug}/studio/business/events/{event_id}',
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
    route: '/{slug}/studio/business/events/{event_id}',
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
    route: '/{slug}/studio/business/events/{event_id}',
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

/**
 * Notifica al estudio que hay promesas afectadas (misma fecha) tras un booking exitoso.
 * El estudio puede usar la lista para enviar "Fecha ya no disponible" a esos prospectos.
 */
export async function notifyCapacityAffectedPromises(
  studioId: string,
  eventId: string,
  eventName: string,
  affectedPromiseIds: Array<{ id: string }>
) {
  if (affectedPromiseIds.length === 0) return;
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });
  const count = affectedPromiseIds.length;
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.CAPACITY_AFFECTED_PROMISES,
    studio_id: studioId,
    title: 'Fecha ya reservada: revisa promesas con misma fecha',
    message: `Se autorizó "${eventName}". ${count} promesa${count === 1 ? ' tiene' : 's tienen'} la misma fecha sin disponibilidad. Puedes avisar a esos prospectos que la fecha no está disponible.`,
    category: 'events',
    priority: NotificationPriority.MEDIUM,
    route: '/{slug}/studio/commercial/promises',
    route_params: { slug: studio?.slug },
    metadata: {
      event_name: eventName,
      affected_promise_ids: affectedPromiseIds.map((p) => p.id),
    },
    event_id: eventId,
  });
}

