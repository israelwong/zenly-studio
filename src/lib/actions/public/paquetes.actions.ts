"use server";

import { prisma } from "@/lib/prisma";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from "@/lib/notifications/studio/types";

/**
 * Solicitar información sobre un paquete desde página pública
 */
export async function solicitarPaquetePublico(
  promiseId: string,
  paqueteId: string,
  studioSlug: string,
  condicionesComercialesId?: string | null,
  condicionesComercialesMetodoPagoId?: string | null
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

    // 3. Obtener información de la condición comercial seleccionada (si existe)
    let condicionComercialInfo = null;
    let metodoPagoInfo = null;

    if (condicionesComercialesId) {
      const condicionComercial = await prisma.studio_condiciones_comerciales.findUnique({
        where: { id: condicionesComercialesId },
        select: {
          id: true,
          name: true,
          description: true,
          advance_percentage: true,
          discount_percentage: true,
        },
      });

      condicionComercialInfo = condicionComercial;

      if (condicionesComercialesMetodoPagoId) {
        const metodoPago = await prisma.studio_condiciones_comerciales_metodo_pago.findUnique({
          where: { id: condicionesComercialesMetodoPagoId },
          include: {
            metodos_pago: {
              select: {
                payment_method_name: true,
              },
            },
          },
        });

        metodoPagoInfo = metodoPago?.metodos_pago?.payment_method_name || null;
      }
    }

    // 4. Construir mensaje con información de condición comercial
    let mensajeNotificacion = `${promise.contact.name} solicita contratar el paquete "${paquete.name}"`;
    let contenidoLog = `Cliente solicitó contratación del paquete: "${paquete.name}"`;

    if (condicionComercialInfo) {
      mensajeNotificacion += ` con condici?n comercial: "${condicionComercialInfo.name}"`;
      contenidoLog += ` con condici?n comercial: "${condicionComercialInfo.name}"`;

      if (metodoPagoInfo) {
        mensajeNotificacion += ` (M?todo de pago: ${metodoPagoInfo})`;
        contenidoLog += ` (M?todo de pago: ${metodoPagoInfo})`;
      }

      if (condicionComercialInfo.advance_percentage) {
        mensajeNotificacion += ` - Anticipo: ${condicionComercialInfo.advance_percentage}%`;
      }

      if (condicionComercialInfo.discount_percentage) {
        mensajeNotificacion += ` - Descuento: ${condicionComercialInfo.discount_percentage}%`;
      }
    }

    // 5. Crear notificación para el estudio
    await createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      studio_id: promise.studio.id,
      type: StudioNotificationType.PROMISE_UPDATED,
      title: "Solicitud de contratación de paquete",
      message: mensajeNotificacion,
      priority: NotificationPriority.MEDIUM,
      contact_id: promise.contact.id,
      promise_id: promiseId,
      paquete_id: paqueteId,
      metadata: {
        paquete_id: paqueteId,
        paquete_name: paquete.name,
        package_price: paquete.precio ?? undefined,
        condiciones_comerciales_id: condicionesComercialesId || null,
        condiciones_comerciales_metodo_pago_id: condicionesComercialesMetodoPagoId || null,
        condicion_comercial_name: condicionComercialInfo?.name || null,
        metodo_pago_name: metodoPagoInfo || null,
        action_type: "paquete_contratacion_solicitada",
      },
    });

    // 6. Agregar log a la promesa
    await prisma.studio_promise_logs.create({
      data: {
        promise_id: promiseId,
        user_id: null,
        content: contenidoLog,
        log_type: "system",
        metadata: {
          action: "paquete_contratacion_solicitada",
          paquete_id: paqueteId,
          paquete_name: paquete.name,
          paquete_price: paquete.precio ?? null,
          condiciones_comerciales_id: condicionesComercialesId || null,
          condiciones_comerciales_metodo_pago_id: condicionesComercialesMetodoPagoId || null,
          condicion_comercial_name: condicionComercialInfo?.name || null,
          metodo_pago_name: metodoPagoInfo || null,
        },
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
