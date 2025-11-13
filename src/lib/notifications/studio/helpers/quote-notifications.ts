'use server';

import { prisma } from '@/lib/prisma';
import { createStudioNotification } from '../studio-notification.service';
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from '../types';

export async function notifyQuoteApproved(
  studioId: string,
  quoteId: string,
  contactName: string,
  amount: number
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });
  
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.QUOTE_APPROVED,
    studio_id: studioId,
    title: 'Cotización autorizada',
    message: `La cotización de ${contactName} por $${amount.toLocaleString()} ha sido autorizada`,
    category: 'quotes',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/studio/builder/commercial/promises',
    route_params: {
      slug: studio?.slug,
      quote_id: quoteId,
    },
    metadata: {
      contact_name: contactName,
      amount: amount,
    },
    quote_id: quoteId,
  });
}

