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
        discount: true,
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

    // 4. Calcular precio final con descuentos y anticipos
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    };

    // Precio base (con descuento de cotización si aplica)
    const precioBase = cotizacion.discount
      ? cotizacion.price - (cotizacion.price * cotizacion.discount) / 100
      : cotizacion.price;

    // Precio con descuento de condición comercial
    const descuentoCondicion = condicionComercialInfo?.discount_percentage ?? 0;
    const precioConDescuento = descuentoCondicion > 0
      ? precioBase - (precioBase * descuentoCondicion) / 100
      : precioBase;

    // Calcular anticipo
    const advanceType = condicionComercialInfo?.advance_type || 'percentage';
    const anticipo = advanceType === 'fixed_amount' && condicionComercialInfo?.advance_amount
      ? condicionComercialInfo.advance_amount
      : (condicionComercialInfo?.advance_percentage ?? 0) > 0
        ? (precioConDescuento * (condicionComercialInfo.advance_percentage ?? 0)) / 100
        : 0;
    const diferido = precioConDescuento - anticipo;

    // 5. Construir mensaje con información completa de precio y condición comercial
    let mensajeNotificacion = `${promise.contact.name} pre-autorizó la cotización "${cotizacion.name}"`;
    let contenidoLog = `Cliente pre-autorizó la cotización: "${cotizacion.name}"`;

    // Agregar información de precio
    mensajeNotificacion += ` - Total: ${formatPrice(precioConDescuento)}`;
    contenidoLog += ` - Total: ${formatPrice(precioConDescuento)}`;

    if (condicionComercialInfo) {
      mensajeNotificacion += ` con condición comercial: "${condicionComercialInfo.name}"`;
      contenidoLog += ` con condición comercial: "${condicionComercialInfo.name}"`;

      if (metodoPagoInfo) {
        mensajeNotificacion += ` (Método de pago: ${metodoPagoInfo})`;
        contenidoLog += ` (Método de pago: ${metodoPagoInfo})`;
      }

      if (descuentoCondicion > 0) {
        mensajeNotificacion += ` - Descuento adicional: ${descuentoCondicion}%`;
        contenidoLog += ` - Descuento adicional: ${descuentoCondicion}%`;
      }

      if (anticipo > 0) {
        if (advanceType === 'fixed_amount') {
          mensajeNotificacion += ` - Anticipo: ${formatPrice(anticipo)}`;
          contenidoLog += ` - Anticipo: ${formatPrice(anticipo)}`;
        } else {
          mensajeNotificacion += ` - Anticipo: ${condicionComercialInfo.advance_percentage}% (${formatPrice(anticipo)})`;
          contenidoLog += ` - Anticipo: ${condicionComercialInfo.advance_percentage}% (${formatPrice(anticipo)})`;
        }
        mensajeNotificacion += ` - Diferido: ${formatPrice(diferido)}`;
        contenidoLog += ` - Diferido: ${formatPrice(diferido)}`;
      }
    }

    // 6. Crear notificación para el estudio con route a la promesa
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
        precio_base: precioBase,
        precio_con_descuento: precioConDescuento,
        anticipo: anticipo,
        diferido: diferido,
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
          precio_base: precioBase,
          precio_con_descuento: precioConDescuento,
          anticipo: anticipo,
          diferido: diferido,
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
