'use server';

import { prisma } from '@/lib/prisma';
import { createStudioNotification } from '../studio-notification.service';
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from '../types';

export async function notifyPromiseCreated(
  studioId: string,
  promiseId: string,
  contactName: string,
  eventType: string | null,
  eventDate: string | null
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });

  // Construir mensaje detallado
  let message = `Nueva promesa registrada para ${contactName}`;
  if (eventType) {
    message += ` - ${eventType}`;
  }
  if (eventDate) {
    const date = new Date(eventDate);
    const formattedDate = date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    message += ` (${formattedDate})`;
  }
  
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.PROMISE_CREATED,
    studio_id: studioId,
    title: 'Nueva promesa creada',
    message,
    category: 'promises',
    priority: NotificationPriority.MEDIUM,
    route: '/{slug}/studio/commercial/promises/{promise_id}',
    route_params: {
      slug: studio?.slug,
      promise_id: promiseId,
    },
    metadata: {
      contact_name: contactName,
      event_type: eventType,
      event_date: eventDate,
    },
    promise_id: promiseId,
  });
}

