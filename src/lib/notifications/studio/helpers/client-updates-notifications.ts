"use server";

import { prisma } from "@/lib/prisma";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationType, StudioNotificationScope, NotificationPriority } from "@/lib/notifications/studio/types";

/**
 * Notifica al estudio cuando el cliente actualiza sus datos de contacto
 */
export async function notifyClientProfileUpdated(
  contactId: string,
  fieldsChanged: string[],
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
) {
  try {
    const contact = await prisma.studio_contacts.findUnique({
      where: { id: contactId },
      select: {
        studio_id: true,
        name: true,
        studio: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!contact) {
      return null;
    }

    const fieldsDisplay = fieldsChanged.map((field) => {
      const fieldNames: Record<string, string> = {
        name: "nombre",
        phone: "teléfono",
        email: "email",
        address: "dirección",
        avatar_url: "foto de perfil",
      };
      return fieldNames[field] || field;
    }).join(", ");

    // Buscar el evento más reciente asociado a este contacto para redirigir a su página
    const event = await prisma.studio_events.findFirst({
      where: {
        contact_id: contactId,
        studio_id: contact.studio_id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      type: StudioNotificationType.CLIENT_PROFILE_UPDATED,
      studio_id: contact.studio_id,
      title: "Cliente actualizó datos de contacto",
      message: `${contact.name} actualizó su ${fieldsDisplay}`,
      category: "contacts",
      priority: NotificationPriority.MEDIUM,
      // Redirigir a la página del evento si existe, sino no incluir ruta
      route: event ? `/{slug}/studio/business/events/{event_id}` : null,
      route_params: event ? {
        slug: contact.studio.slug,
        event_id: event.id,
      } : null,
      metadata: {
        contact_name: contact.name,
        fields_changed: fieldsChanged,
        old_values: oldValues,
        new_values: newValues,
      },
      contact_id: contactId,
      event_id: event?.id || null,
    });
  } catch (error) {
    console.error("[notifyClientProfileUpdated] Error:", error);
    return null;
  }
}

/**
 * Notifica al estudio cuando el cliente actualiza datos del evento
 */
export async function notifyClientEventInfoUpdated(
  eventId: string,
  fieldsChanged: string[],
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
) {
  try {
    const event = await prisma.studio_events.findUnique({
      where: { id: eventId },
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
    });

    if (!event) {
      return null;
    }

    // Construir mensaje detallado con valores antiguos y nuevos
    const messageParts: string[] = [];
    
    fieldsChanged.forEach((field) => {
      const fieldNames: Record<string, string> = {
        name: "nombre",
        event_location: "sede",
      };
      const fieldDisplay = fieldNames[field] || field;
      
      const oldValue = oldValues[field];
      const newValue = newValues[field];
      
      // Formatear valores para mostrar
      const formatValue = (value: unknown): string => {
        if (value === null || value === undefined || value === '') return 'vacío';
        return String(value);
      };
      
      const oldValueDisplay = formatValue(oldValue);
      const newValueDisplay = formatValue(newValue);
      
      if (oldValueDisplay === 'vacío') {
        messageParts.push(`${fieldDisplay} a "${newValueDisplay}"`);
      } else if (newValueDisplay === 'vacío') {
        messageParts.push(`${fieldDisplay} de "${oldValueDisplay}" a vacío`);
      } else {
        messageParts.push(`${fieldDisplay} de "${oldValueDisplay}" a "${newValueDisplay}"`);
      }
    });
    
    const fieldsMessage = messageParts.join(", ");
    const eventName = event.promise?.name || 'Sin nombre';
    
    // Construir mensaje: "actualizó [campo] del evento '[nombre]'"
    const message = `${event.contact.name} actualizó ${fieldsMessage} del evento "${eventName}"`;

    return createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      type: StudioNotificationType.CLIENT_EVENT_INFO_UPDATED,
      studio_id: event.studio_id,
      title: "Cliente actualizó datos del evento",
      message,
      category: "events",
      priority: NotificationPriority.MEDIUM,
      route: `/{slug}/studio/business/events/{event_id}`,
      route_params: {
        slug: event.studio.slug,
        event_id: eventId,
      },
      metadata: {
        contact_name: event.contact.name,
        event_name: event.promise?.name,
        fields_changed: fieldsChanged,
        old_values: oldValues,
        new_values: newValues,
      },
      contact_id: event.contact_id,
      event_id: eventId,
      promise_id: event.promise_id,
    });
  } catch (error) {
    console.error("[notifyClientEventInfoUpdated] Error:", error);
    return null;
  }
}

/**
 * Notifica al estudio cuando el cliente firma el contrato digitalmente
 */
export async function notifyContractSigned(
  contractId: string
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

    const { event } = contract;
    const clientName = event.contact.name;

    return createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      type: StudioNotificationType.CONTRACT_SIGNED,
      studio_id: event.studio_id,
      title: "Contrato firmado digitalmente",
      message: `${clientName} ha firmado su contrato digitalmente`,
      category: "contracts",
      priority: NotificationPriority.HIGH,
      route: `/{slug}/studio/business/events/{event_id}`,
      route_params: {
        slug: event.studio.slug,
        event_id: event.id,
      },
      metadata: {
        contact_name: clientName,
        event_name: event.promise?.name,
        contract_version: contract.version,
      },
      contact_id: event.contact_id,
      event_id: event.id,
      promise_id: event.promise_id,
    });
  } catch (error) {
    console.error("[notifyContractSigned] Error:", error);
    return null;
  }
}

