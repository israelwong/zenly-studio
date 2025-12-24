"use server";

import { prisma } from "@/lib/prisma";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationType, StudioNotificationScope, NotificationPriority } from "@/lib/notifications/studio/types";

/**
 * Notifica al estudio cuando el cliente solicita modificación del contrato
 */
export async function notifyContractModificationRequested(
  contractId: string,
  requestId: string,
  message: string
) {
  try {
    const contract = await prisma.studio_event_contracts.findUnique({
      where: { id: contractId },
      include: {
        event: {
          include: {
            studio: {
              select: {
                id: true,
                slug: true,
              },
            },
            contact: {
              select: {
                id: true,
                name: true,
              },
            },
            promise: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!contract || !contract.event) {
      return null;
    }

    const messagePreview = message.length > 100 ? message.substring(0, 100) + "..." : message;

    return createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      type: StudioNotificationType.CONTRACT_MODIFICATION_REQUESTED,
      studio_id: contract.event.studio.id,
      title: "Cliente solicitó modificación del contrato",
      message: `${contract.event.contact.name} solicitó modificar el contrato: "${messagePreview}"`,
      category: "contracts",
      priority: NotificationPriority.HIGH,
      route: `/{slug}/studio/business/events/{event_id}`,
      route_params: {
        slug: contract.event.studio.slug,
        event_id: contract.event_id,
      },
      metadata: {
        contact_name: contract.event.contact.name,
        event_name: contract.event.promise?.name,
        message_preview: messagePreview,
      },
      contact_id: contract.event.contact_id,
      event_id: contract.event_id,
      promise_id: contract.event.promise_id,
    });
  } catch (error) {
    console.error("[notifyContractModificationRequested] Error:", error);
    return null;
  }
}

