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

    return createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      type: StudioNotificationType.CLIENT_PROFILE_UPDATED,
      studio_id: contact.studio_id,
      title: "Cliente actualizó datos de contacto",
      message: `${contact.name} actualizó su ${fieldsDisplay}`,
      category: "contacts",
      priority: NotificationPriority.MEDIUM,
      route: `/{slug}/studio/commercial/contacts/{contact_id}`,
      route_params: {
        slug: contact.studio.slug,
        contact_id: contactId,
      },
      metadata: {
        contact_name: contact.name,
        fields_changed: fieldsChanged,
        old_values: oldValues,
        new_values: newValues,
      },
      contact_id: contactId,
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

    const fieldsDisplay = fieldsChanged.map((field) => {
      const fieldNames: Record<string, string> = {
        name: "nombre del evento",
        event_location: "sede del evento",
      };
      return fieldNames[field] || field;
    }).join(", ");

    return createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      type: StudioNotificationType.CLIENT_EVENT_INFO_UPDATED,
      studio_id: event.studio_id,
      title: "Cliente actualizó datos del evento",
      message: `${event.contact.name} actualizó ${fieldsDisplay} del evento "${event.promise?.name || 'Sin nombre'}"`,
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

