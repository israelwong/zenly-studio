"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from "@/lib/notifications/studio/types";

/**
 * Solicitar personalización de cotización o paquete
 * Crea notificación y log en promesa
 */
export async function solicitarPersonalizacion(
  promiseId: string,
  itemId: string,
  itemType: 'cotizacion' | 'paquete',
  mensaje: string,
  studioSlug: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Validar que la promesa existe y obtener datos necesarios
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio: {
          slug: studioSlug,
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        event_type: {
          select: {
            name: true,
          },
        },
        studio: {
          select: {
            id: true,
            studio_name: true,
            slug: true,
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada",
      };
    }

    // 2. Obtener información del item (cotización o paquete)
    let itemName = '';
    if (itemType === 'cotizacion') {
      const cotizacion = await prisma.studio_cotizaciones.findUnique({
        where: { id: itemId },
        select: { name: true },
      });
      itemName = cotizacion?.name || 'Cotización';
    } else {
      const paquete = await prisma.studio_paquetes.findUnique({
        where: { id: itemId },
        select: { name: true },
      });
      itemName = paquete?.name || 'Paquete';
    }

    // 3. Crear notificación para el estudio con route a la promesa
    const mensajeNotificacion = `${promise.contact.name} solicita personalizar "${itemName}" para su ${promise.event_type?.name || 'evento'}${mensaje ? `: ${mensaje}` : ''}`;

    await createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      studio_id: promise.studio.id,
      type: StudioNotificationType.PROMISE_UPDATED,
      title: `Solicitud de personalización - ${promise.contact.name}`,
      message: mensajeNotificacion,
      priority: NotificationPriority.MEDIUM,
      contact_id: promise.contact.id,
      promise_id: promiseId,
      route: '/{slug}/studio/commercial/promises/{promise_id}',
      route_params: {
        slug: promise.studio.slug,
        promise_id: promiseId,
      },
      metadata: {
        item_id: itemId,
        item_type: itemType,
        item_name: itemName,
        mensaje: mensaje || null,
        action_type: "personalizacion_solicitada",
      },
    });

    // 4. Agregar log a la promesa en studio_promise_logs
    const contenidoLog = `Cliente solicitó personalización de ${itemType}: "${itemName}"${mensaje ? ` - Mensaje: ${mensaje}` : ''}`;

    await prisma.studio_promise_logs.create({
      data: {
        promise_id: promiseId,
        user_id: null,
        content: contenidoLog,
        log_type: "system",
        metadata: {
          action: "personalizacion_solicitada",
          item_id: itemId,
          item_type: itemType,
          item_name: itemName,
          mensaje: mensaje || null,
        },
      },
    });

    // 5. Revalidar rutas
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("[solicitarPersonalizacion] Error:", error);
    return {
      success: false,
      error: "Error al procesar solicitud",
    };
  }
}


