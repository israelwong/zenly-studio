"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from "@/lib/notifications/studio/types";

/**
 * Pre-autorizar cotización desde página pública
 * Asocia condición comercial y marca como pre-autorizada (selected_by_prospect)
 * La autorización final es manual por parte del estudio
 */
export async function autorizarCotizacionPublica(
  promiseId: string,
  cotizacionId: string,
  studioSlug: string,
  condicionesComercialesId?: string | null,
  condicionesComercialesMetodoPagoId?: string | null
): Promise<{
  success: boolean;
  data?: {
    cotizacionId: string;
    message: string;
  };
  error?: string;
}> {
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
      },
    });

    if (!cotizacion) {
      return {
        success: false,
        error: "Cotización no encontrada o no disponible",
      };
    }

    // 2. Obtener información de la condición comercial seleccionada (si existe)
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
          advance_type: true,
          advance_amount: true,
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

    // 3. Actualizar cotización: asociar condición comercial y marcar como pre-autorizada
    const updatedCotizacion = await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: {
        condiciones_comerciales_id: condicionesComercialesId || null,
        condiciones_comerciales_metodo_pago_id: condicionesComercialesMetodoPagoId || null,
        selected_by_prospect: true,
        selected_at: new Date(),
      },
    });

    // Revalidar paths para refrescar datos en el panel
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    // 4. Construir mensaje con información de condición comercial
    let mensajeNotificacion = `${promise.contact.name} pre-autorizó la cotización "${cotizacion.name}"`;
    let contenidoLog = `Cliente pre-autorizó la cotización: "${cotizacion.name}"`;

    if (condicionComercialInfo) {
      mensajeNotificacion += ` con condición comercial: "${condicionComercialInfo.name}"`;
      contenidoLog += ` con condición comercial: "${condicionComercialInfo.name}"`;

      if (metodoPagoInfo) {
        mensajeNotificacion += ` (Método de pago: ${metodoPagoInfo})`;
        contenidoLog += ` (Método de pago: ${metodoPagoInfo})`;
      }

      if (condicionComercialInfo.advance_type === 'fixed_amount' && condicionComercialInfo.advance_amount) {
        mensajeNotificacion += ` - Anticipo: $${condicionComercialInfo.advance_amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else if (condicionComercialInfo.advance_type === 'percentage' && condicionComercialInfo.advance_percentage) {
        mensajeNotificacion += ` - Anticipo: ${condicionComercialInfo.advance_percentage}%`;
      }

      if (condicionComercialInfo.discount_percentage) {
        mensajeNotificacion += ` - Descuento: ${condicionComercialInfo.discount_percentage}%`;
      }
    }

    // 5. Crear notificación para el estudio con route a la promesa
    await createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      studio_id: promise.studio.id,
      type: StudioNotificationType.QUOTE_APPROVED,
      title: "Solicitud de contratación de cotización",
      message: mensajeNotificacion,
      priority: NotificationPriority.HIGH,
      contact_id: promise.contact.id,
      promise_id: promiseId,
      quote_id: cotizacionId,
      route: '/{slug}/studio/commercial/promises/{promise_id}',
      route_params: {
        slug: promise.studio.slug,
        promise_id: promiseId,
      },
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

    // 6. Agregar log a la promesa
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
