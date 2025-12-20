'use server';

import { prisma } from '@/lib/prisma';
import { createStudioNotification } from '../studio-notification.service';
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from '../types';

export async function notifyQuoteApproved(
  studioId: string,
  quoteId: string,
  contactName: string,
  amount: number,
  eventoId?: string | null,
  promiseId?: string | null
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });

  // Si hay eventoId, la ruta debe apuntar al evento, sino a la promesa
  const route = eventoId
    ? '/{slug}/studio/business/events/{event_id}'
    : promiseId
      ? '/{slug}/studio/commercial/promises/{promise_id}'
      : '/{slug}/studio/commercial/promises';

  const routeParams: Record<string, string | null | undefined> = {
    slug: studio?.slug,
  };

  if (eventoId) {
    routeParams.event_id = eventoId;
  } else if (promiseId) {
    routeParams.promise_id = promiseId;
  } else {
    routeParams.quote_id = quoteId;
  }

  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.QUOTE_APPROVED,
    studio_id: studioId,
    title: 'Cotización autorizada',
    message: `La cotización de ${contactName} por $${amount.toLocaleString()} ha sido autorizada`,
    category: 'quotes',
    priority: NotificationPriority.HIGH,
    route,
    route_params: routeParams,
    metadata: {
      contact_name: contactName,
      amount: amount,
    },
    quote_id: quoteId,
    event_id: eventoId || undefined,
    promise_id: promiseId || undefined,
  });
}

