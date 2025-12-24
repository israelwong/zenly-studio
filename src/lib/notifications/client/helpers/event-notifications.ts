'use server';

import { prisma } from '@/lib/prisma';
import { createClientNotification } from '../studio-client-notification.service';
import { ClientNotificationType, NotificationPriority } from '../types';

// Mapeo de slugs a mensajes personalizados (igual que en EstatusEntregablesCard)
function getStageDisplayName(slug: string | null, name: string): string {
  if (!slug) return name;
  
  const slugLower = slug.toLowerCase();
  
  if (slugLower === 'planeacion' || slugLower === 'planning') {
    return 'Planeación';
  }
  if (slugLower === 'produccion' || slugLower === 'production') {
    return 'Cobertura del evento';
  }
  if (slugLower === 'revision' || slugLower === 'review') {
    return 'Revisión interna';
  }
  if (slugLower === 'entrega' || slugLower === 'delivery') {
    return 'Preparando entrega';
  }
  if (slugLower === 'archivado' || slugLower === 'archived') {
    return 'Entregado';
  }
  
  return name;
}

/**
 * Notifica cuando cambia la etapa/estatus de un evento
 */
export async function notifyEventStageChanged(
  eventId: string,
  newStageName: string,
  previousStageName?: string
) {
  // Obtener datos del evento y contacto
  const event = await prisma.studio_events.findUnique({
    where: { id: eventId },
    include: {
      studio: {
        select: { id: true, slug: true },
      },
      contact: {
        select: { id: true },
      },
      stage: {
        select: { name: true, slug: true },
      },
    },
  });

  if (!event) {
    return null;
  }

  const studioSlug = event.studio.slug;
  const eventName = event.promise?.name || 'tu evento';

  // Obtener stage anterior para su slug
  let previousStageSlug: string | null = null;
  if (previousStageName) {
    const previousStage = await prisma.studio_manager_pipeline_stages.findFirst({
      where: {
        studio_id: event.studio_id,
        name: previousStageName,
      },
      select: { slug: true },
    });
    previousStageSlug = previousStage?.slug || null;
  }

  // Usar labels personalizadas
  const newStageDisplayName = getStageDisplayName(event.stage?.slug || null, newStageName);
  const previousStageDisplayName = previousStageName 
    ? getStageDisplayName(previousStageSlug, previousStageName)
    : undefined;

  let message = `El estatus de "${eventName}" cambió a "${newStageDisplayName}"`;
  if (previousStageDisplayName) {
    message = `El estatus de "${eventName}" cambió de "${previousStageDisplayName}" a "${newStageDisplayName}"`;
  }

  return createClientNotification({
    type: ClientNotificationType.EVENT_STAGE_CHANGED,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Cambio de estatus del evento',
    message,
    category: 'events',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/cliente/{clientId}/{eventId}',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    metadata: {
      event_name: eventName,
      event_stage: newStageDisplayName,
      event_stage_previous: previousStageDisplayName,
    },
    event_id: eventId,
    promise_id: event.promise_id,
  });
}

