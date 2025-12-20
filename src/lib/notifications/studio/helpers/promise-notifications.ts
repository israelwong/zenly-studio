'use server';

import { prisma } from '@/lib/prisma';
import { createStudioNotification } from '../studio-notification.service';
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from '../types';

export async function notifyPromiseCreated(
  studioId: string,
  promiseId: string,
  contactName: string,
  eventType: string | null,
  eventDate: string | null,
  isTest: boolean = false,
  showPackages: boolean = false
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });

  // Construir mensaje detallado
  let message = isTest
    ? `Promesa de prueba registrada para ${contactName}`
    : `Nueva promesa registrada para ${contactName}`;

  if (eventType) {
    message += ` - ${eventType}`;
  }
  if (eventDate) {
    // Parsear fecha de forma segura (sin cambios por zona horaria)
    let date: Date;
    const dateMatch = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      date = new Date(eventDate);
    }
    const formattedDate = date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    message += ` (${formattedDate})`;
  }

  // Agregar información sobre paquetes si aplica
  if (showPackages) {
    message += `. Se mostrarán paquetes disponibles al prospecto.`;
  }

  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.PROMISE_CREATED,
    studio_id: studioId,
    title: isTest ? 'Promesa de prueba creada' : 'Nueva promesa creada',
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
      is_test: isTest,
      show_packages: showPackages,
    },
    promise_id: promiseId,
  });
}

