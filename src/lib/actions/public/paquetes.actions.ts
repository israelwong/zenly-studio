"use server";

import { prisma } from "@/lib/prisma";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope } from "@/lib/notifications/studio/types";

/**
 * Solicitar información sobre un paquete desde página pública
 */
export async function solicitarPaquetePublico(
  promiseId: string,
  paqueteId: string,
  studioSlug: string
) {
  try {
    // 1. Validar que la promesa existe
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

    // 2. Validar que el paquete existe y está activo
    const paquete = await prisma.studio_paquetes.findFirst({
      where: {
        id: paqueteId,
        studio_id: promise.studio.id,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        precio: true,
        description: true,
      },
    });

    if (!paquete) {
      return {
        success: false,
        error: "Paquete no encontrado o no disponible",
      };
    }

    // 3. Crear notificación para el estudio
    await createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      studio_id: promise.studio.id,
      type: "commercial",
      title: "Solicitud de paquete",
      message: `${promise.contact.name} está interesado en el paquete "${paquete.name}"`,
      priority: "MEDIUM",
      contact_id: promise.contact.id,
      promise_id: promiseId,
      metadata: {
        paquete_id: paqueteId,
        paquete_name: paquete.name,
        paquete_price: paquete.precio,
        action_type: "paquete_solicitado",
      },
    });

    return {
      success: true,
      data: {
        paqueteId,
        message: "Solicitud enviada exitosamente",
      },
    };
  } catch (error) {
    console.error("Error al solicitar paquete:", error);
    return {
      success: false,
      error: "Error al enviar la solicitud",
    };
  }
}
