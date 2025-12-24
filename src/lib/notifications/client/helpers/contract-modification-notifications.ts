"use server";

import { prisma } from "@/lib/prisma";
import { createClientNotification } from "@/lib/notifications/client/studio-client-notification.service";
import { ClientNotificationType, NotificationPriority } from "@/lib/notifications/client/types";

/**
 * Notifica al cliente cuando el estudio responde a su solicitud de modificación
 */
export async function notifyContractModificationResponded(
  contractId: string,
  requestId: string,
  status: "approved" | "rejected",
  response?: string
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

    const studioSlug = contract.event.studio.slug;
    const title = status === "approved" 
      ? "Modificación de contrato aprobada" 
      : "Modificación de contrato rechazada";
    const message = status === "approved"
      ? "El estudio aprobó tu solicitud de modificación del contrato"
      : response 
        ? `El estudio rechazó tu solicitud: ${response.substring(0, 100)}${response.length > 100 ? "..." : ""}`
        : "El estudio rechazó tu solicitud de modificación del contrato";

    return createClientNotification({
      type: status === "approved" 
        ? ClientNotificationType.CONTRACT_MODIFICATION_APPROVED 
        : ClientNotificationType.CONTRACT_MODIFICATION_REJECTED,
      studio_id: contract.event.studio_id,
      contact_id: contract.event.contact_id,
      title,
      message,
      category: "contracts",
      priority: NotificationPriority.HIGH,
      route: "/{slug}/cliente/{clientId}/{eventId}/contrato",
      route_params: {
        slug: studioSlug,
        clientId: contract.event.contact_id,
        eventId: contract.event_id,
      },
      metadata: {
        contract_version: contract.version,
        request_status: status,
        response: response || undefined,
      },
      event_id: contract.event_id,
      contract_id: contractId,
      promise_id: contract.event.promise_id,
    });
  } catch (error) {
    console.error("[notifyContractModificationResponded] Error:", error);
    return null;
  }
}

