"use server";

import { prisma } from "@/lib/prisma";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope } from "@/lib/notifications/studio/types";

/**
 * Autorizar cotización desde página pública
 */
export async function autorizarCotizacionPublica(
  promiseId: string,
  cotizacionId: string,
  studioSlug: string
) {
  try {
    // 1. Validar que la promesa y cotización existen
    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        studio: {
          select: {
            id: true,
            studio_name: true,
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

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        promise_id: promiseId,
        visible_to_client: true,
        archived: false,
      },
      select: {
        id: true,
        name: true,
        price: true,
        selected_by_prospect: true,
      },
    });

    if (!cotizacion) {
      return {
        success: false,
        error: "Cotización no encontrada o no disponible",
      };
    }

    // 2. Verificar si ya fue seleccionada
    if (cotizacion.selected_by_prospect) {
      return {
        success: false,
        error: "Esta cotización ya ha sido autorizada previamente",
      };
    }

    // 3. Actualizar cotización como seleccionada
    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: {
        selected_by_prospect: true,
        selected_at: new Date(),
      },
    });

    // 4. Crear notificación para el estudio
    await createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      studio_id: promise.studio.id,
      type: "commercial",
      title: "Cotización autorizada",
      message: `${promise.contact.name} ha autorizado la cotización "${cotizacion.name}"`,
      priority: "HIGH",
      contact_id: promise.contact.id,
      promise_id: promiseId,
      metadata: {
        cotizacion_id: cotizacionId,
        cotizacion_name: cotizacion.name,
        cotizacion_price: cotizacion.price,
        action_type: "cotizacion_autorizada",
      },
    });

    return {
      success: true,
      data: {
        cotizacionId,
        message: "Cotización autorizada exitosamente",
      },
    };
  } catch (error) {
    console.error("Error al autorizar cotización:", error);
    return {
      success: false,
      error: "Error al autorizar la cotización",
    };
  }
}

