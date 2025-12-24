'use server';

import { prisma } from '@/lib/prisma';
import { createClientNotification } from '../studio-client-notification.service';
import { ClientNotificationType, NotificationPriority } from '../types';
import { createStudioNotification } from '@/lib/notifications/studio/studio-notification.service';
import { StudioNotificationScope, StudioNotificationType } from '@/lib/notifications/studio/types';

/**
 * Notifica cuando un contrato está disponible para revisión
 */
export async function notifyContractAvailable(
  contractId: string,
  contractVersion: number
) {
  // Obtener datos del contrato, evento y contacto
  const contract = await prisma.studio_event_contracts.findUnique({
    where: { id: contractId },
    include: {
      event: {
        include: {
          studio: {
            select: { id: true, slug: true },
          },
          contact: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!contract || !contract.event) {
    return null;
  }

  const { event } = contract;
  const studioSlug = event.studio.slug;

  return createClientNotification({
    type: ClientNotificationType.CONTRACT_AVAILABLE,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Contrato disponible para revisión',
    message: `Hay un contrato disponible para que lo revises y autorices (Versión ${contractVersion})`,
    category: 'contracts',
    priority: NotificationPriority.URGENT,
    route: '/{slug}/cliente/{clientId}/{eventId}/contrato',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    metadata: {
      contract_version: contractVersion,
    },
    event_id: event.id,
    contract_id: contractId,
    promise_id: event.promise_id,
  });
}

/**
 * Notifica al cliente que el studio solicita cancelar contrato
 */
export async function notifyContractCancellationRequestedByStudio(
  contractId: string,
  reason: string
) {
  const contract = await prisma.studio_event_contracts.findUnique({
    where: { id: contractId },
    include: {
      event: {
        include: {
          studio: {
            select: { id: true, slug: true },
          },
          contact: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!contract || !contract.event) {
    return null;
  }

  const { event } = contract;
  const studioSlug = event.studio.slug;

  return createClientNotification({
    type: ClientNotificationType.CONTRACT_CANCELLATION_REQUESTED_BY_STUDIO,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Solicitud de cancelación de contrato',
    message: `El estudio ha solicitado cancelar el contrato. Motivo: ${reason}`,
    category: 'contracts',
    priority: NotificationPriority.URGENT,
    route: '/{slug}/cliente/{clientId}/{eventId}/contrato',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    metadata: {
      cancellation_reason: reason,
    },
    event_id: event.id,
    contract_id: contractId,
    promise_id: event.promise_id,
  });
}

/**
 * Notifica al studio que el cliente solicita cancelar contrato
 */
export async function notifyContractCancellationRequestedByClient(
  contractId: string,
  reason: string
) {
  const contract = await prisma.studio_event_contracts.findUnique({
    where: { id: contractId },
    include: {
      event: {
        include: {
          studio: {
            select: { id: true, slug: true },
          },
        },
      },
    },
  });

  if (!contract || !contract.event) {
    return null;
  }

  const { event } = contract;
  const studioSlug = event.studio.slug;

  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.CONTRACT_CANCELLATION_REQUESTED_BY_CLIENT,
    studio_id: event.studio_id,
    title: 'Solicitud de cancelación de contrato',
    message: `El cliente ha solicitado cancelar el contrato. Motivo: ${reason}`,
    category: 'contracts',
    priority: 'URGENT',
    route: '/{slug}/studio/business/events/{event_id}',
    route_params: {
      slug: studioSlug,
      event_id: event.id,
    },
    metadata: {
      cancellation_reason: reason,
    },
    event_id: event.id,
  });
}

/**
 * Notifica que la cancelación fue confirmada
 */
export async function notifyContractCancellationConfirmed(contractId: string) {
  const contract = await prisma.studio_event_contracts.findUnique({
    where: { id: contractId },
    include: {
      event: {
        include: {
          studio: {
            select: { id: true, slug: true },
          },
          contact: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!contract || !contract.event) {
    return null;
  }

  const { event } = contract;
  const studioSlug = event.studio.slug;

  // Notificar al cliente
  await createClientNotification({
    type: ClientNotificationType.CONTRACT_CANCELLATION_CONFIRMED,
    studio_id: event.studio_id,
    contact_id: event.contact_id,
    title: 'Contrato cancelado',
    message: 'El contrato ha sido cancelado por mutuo acuerdo',
    category: 'contracts',
    priority: NotificationPriority.HIGH,
    route: '/{slug}/cliente/{clientId}/{eventId}/contrato',
    route_params: {
      slug: studioSlug,
      clientId: event.contact_id,
      eventId: event.id,
    },
    event_id: event.id,
    contract_id: contractId,
    promise_id: event.promise_id,
  });

  // Notificar al studio
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.CONTRACT_CANCELLATION_CONFIRMED,
    studio_id: event.studio_id,
    title: 'Contrato cancelado',
    message: 'El contrato ha sido cancelado por mutuo acuerdo',
    category: 'contracts',
    priority: 'HIGH',
    route: '/{slug}/studio/business/events/{event_id}',
    route_params: {
      slug: studioSlug,
      event_id: event.id,
    },
    event_id: event.id,
  });
}

/**
 * Notifica que la cancelación fue rechazada
 */
export async function notifyContractCancellationRejected(
  contractId: string,
  rejectedBy: 'studio' | 'client'
) {
  const contract = await prisma.studio_event_contracts.findUnique({
    where: { id: contractId },
    include: {
      event: {
        include: {
          studio: {
            select: { id: true, slug: true },
          },
          contact: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!contract || !contract.event) {
    return null;
  }

  const { event } = contract;
  const studioSlug = event.studio.slug;

  if (rejectedBy === 'client') {
    // Cliente rechazó, notificar al studio
    return createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      type: StudioNotificationType.CONTRACT_CANCELLATION_REJECTED,
      studio_id: event.studio_id,
      title: 'Cancelación rechazada',
      message: 'El cliente ha rechazado la solicitud de cancelación del contrato',
      category: 'contracts',
      priority: 'MEDIUM',
      route: '/{slug}/studio/business/events/{event_id}',
      route_params: {
        slug: studioSlug,
        event_id: event.id,
      },
      event_id: event.id,
    });
  } else {
    // Studio rechazó, notificar al cliente
    return createClientNotification({
      type: ClientNotificationType.CONTRACT_CANCELLATION_REJECTED,
      studio_id: event.studio_id,
      contact_id: event.contact_id,
      title: 'Cancelación rechazada',
      message: 'El estudio ha rechazado la solicitud de cancelación del contrato',
      category: 'contracts',
      priority: NotificationPriority.MEDIUM,
      route: '/{slug}/cliente/{clientId}/{eventId}/contrato',
      route_params: {
        slug: studioSlug,
        clientId: event.contact_id,
        eventId: event.id,
      },
      event_id: event.id,
      contract_id: contractId,
      promise_id: event.promise_id,
    });
  }
}

