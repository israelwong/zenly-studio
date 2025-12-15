"use server";

import { prisma } from "@/lib/prisma";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from "@/lib/notifications/studio/types";

/**
 * Autorizar cotizaci?n desde p?gina p?blica
 */
export async function autorizarCotizacionPublica(
  promiseId: string,
  cotizacionId: string,
  studioSlug: string,
  condicionesComercialesId?: string | null,
  condicionesComercialesMetodoPagoId?: string | null
) {
  try {
    // 1. Validar que la promesa y cotizaci?n existen
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
        error: "Cotizaci?n no encontrada o no disponible",
      };
    }

    // 2. Verificar si ya fue seleccionada
    if (cotizacion.selected_by_prospect) {
      return {
        success: false,
        error: "Esta cotizaci?n ya ha sido autorizada previamente",
      };
    }

    // 3. Obtener informaci?n de la condici?n comercial seleccionada (si existe)
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

    // 4. Actualizar cotizaci?n como seleccionada
    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: {
        selected_by_prospect: true,
        selected_at: new Date(),
        condiciones_comerciales_id: condicionesComercialesId || null,
        condiciones_comerciales_metodo_pago_id: condicionesComercialesMetodoPagoId || null,
      },
    });

    // 5. Construir mensaje con informaci?n de condici?n comercial
    let mensajeNotificacion = `${promise.contact.name} solicita contratar la cotizaci?n "${cotizacion.name}"`;
    let contenidoLog = `Cliente solicit? contrataci?n de la cotizaci?n: "${cotizacion.name}"`;

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

    // 6. Crear notificaci?n para el estudio
    await createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      studio_id: promise.studio.id,
      type: StudioNotificationType.QUOTE_APPROVED,
      title: "Solicitud de contrataci?n de cotizaci?n",
      message: mensajeNotificacion,
      priority: NotificationPriority.HIGH,
      contact_id: promise.contact.id,
      promise_id: promiseId,
      quote_id: cotizacionId,
      metadata: {
        cotizacion_id: cotizacionId,
        cotizacion_name: cotizacion.name,
        cotizacion_price: cotizacion.price ?? 0,
        condiciones_comerciales_id: condicionesComercialesId || null,
        condiciones_comerciales_metodo_pago_id: condicionesComercialesMetodoPagoId || null,
        condicion_comercial_name: condicionComercialInfo?.name || null,
        metodo_pago_name: metodoPagoInfo || null,
        action_type: "cotizacion_contratacion_solicitada",
      },
    });

    // 7. Agregar log a la promesa
    await prisma.studio_promise_logs.create({
      data: {
        promise_id: promiseId,
        user_id: null,
        content: contenidoLog,
        log_type: "system",
        metadata: {
          action: "cotizacion_contratacion_solicitada",
          cotizacion_id: cotizacionId,
          cotizacion_name: cotizacion.name,
          cotizacion_price: cotizacion.price ?? 0,
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
        cotizacionId,
        message: "Solicitud enviada exitosamente",
      },
    };
  } catch (error) {
    console.error("Error al solicitar contratación:", error);
    return {
      success: false,
      error: "Error al enviar la solicitud",
    };
  }
}
