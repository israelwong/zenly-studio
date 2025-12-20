"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from "@/lib/notifications/studio/types";
import { calcularYGuardarPreciosCotizacion } from "@/lib/actions/studio/commercial/promises/cotizacion-pricing";

/**
 * Pre-autorizar paquete desde página pública
 * Crea cotización dinámicamente desde el paquete y marca como pre-autorizada
 * La autorización final es manual por parte del estudio
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

    // 2. Validar que el paquete existe y está activo, obtener con items
    const paquete = await prisma.studio_paquetes.findFirst({
      where: {
        id: paqueteId,
        studio_id: promise.studio.id,
        status: "active",
      },
      include: {
        paquete_items: {
          where: {
            status: "active",
            visible_to_client: true,
          },
          include: {
            items: {
              select: {
                id: true,
                name: true,
                cost: true,
                expense: true,
                utility_type: true,
              },
            },
            service_categories: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        event_types: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!paquete) {
      return {
        success: false,
        error: "Paquete no encontrado o no disponible",
      };
    }

    if (!paquete.paquete_items || paquete.paquete_items.length === 0) {
      return {
        success: false,
        error: "El paquete no tiene items disponibles",
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

    // 4. Obtener o crear evento asociado a la promesa
    let evento = await prisma.studio_events.findUnique({
      where: { promise_id: promiseId },
    });

    if (!evento) {
      if (!promise.contact.id) {
        return {
          success: false,
          error: "El promise no tiene contacto asociado",
        };
      }

      evento = await prisma.studio_events.create({
        data: {
          studio_id: promise.studio.id,
          contact_id: promise.contact.id,
          promise_id: promiseId,
          event_type_id: promise.event_type_id || (paquete.event_types?.id || null),
          event_date: promise.event_date || new Date(),
          status: 'ACTIVE',
        },
      });
    }

    const eventTypeId = evento.event_type_id || promise.event_type_id || (paquete.event_types?.id || null);
    if (!eventTypeId) {
      return {
        success: false,
        error: "El evento no tiene tipo de evento asociado",
      };
    }

    // 5. Obtener order máximo para la nueva cotización
    const maxOrder = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise_id: promiseId,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    });

    const newOrder = (maxOrder?.order ?? -1) + 1;

    // 6. Crear cotización desde el paquete
    const cotizacion = await prisma.studio_cotizaciones.create({
      data: {
        studio_id: promise.studio.id,
        evento_id: evento.id,
        event_type_id: eventTypeId,
        promise_id: promiseId,
        contact_id: promise.contact.id,
        name: paquete.name,
        description: paquete.description,
        price: paquete.precio || 0,
        status: 'pendiente',
        visible_to_client: true,
        paquete_id: paqueteId,
        condiciones_comerciales_id: condicionesComercialesId || null,
        condiciones_comerciales_metodo_pago_id: condicionesComercialesMetodoPagoId || null,
        selected_by_prospect: true,
        selected_at: new Date(),
        order: newOrder,
      },
    });

    // 7. Crear items de cotización desde items del paquete
    const cotizacionItems = paquete.paquete_items
      .filter((item) => item.item_id) // Solo items con item_id válido
      .map((item, index) => ({
        cotizacion_id: cotizacion.id,
        item_id: item.item_id!,
        service_category_id: item.service_category_id,
        quantity: item.quantity,
        order: index,
      }));

    if (cotizacionItems.length > 0) {
      await prisma.studio_cotizacion_items.createMany({
        data: cotizacionItems,
      });

      // Calcular y guardar precios de los items
      await calcularYGuardarPreciosCotizacion(cotizacion.id, studioSlug).catch(() => {
        // No fallar la creación si el cálculo de precios falla
      });
    }

    // Revalidar paths para refrescar datos en el panel
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    // 8. Calcular precio final con descuentos y anticipos
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    };

    // Precio base del paquete
    const precioBase = paquete.precio || 0;

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

    // 9. Construir mensaje con información completa de precio y condición comercial
    let mensajeNotificacion = `${promise.contact.name} pre-autorizó el paquete "${paquete.name}" (cotización creada)`;
    let contenidoLog = `Cliente pre-autorizó el paquete: "${paquete.name}" - Cotización creada automáticamente`;

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

    // 9. Crear notificación para el estudio con route a la promesa
    await createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      studio_id: promise.studio.id,
      type: StudioNotificationType.QUOTE_APPROVED,
      title: "Paquete pre-autorizado por prospecto (cotización creada)",
      message: mensajeNotificacion,
      priority: NotificationPriority.HIGH,
      contact_id: promise.contact.id,
      promise_id: promiseId,
      quote_id: cotizacion.id,
      paquete_id: paqueteId,
      route: '/{slug}/studio/commercial/promises/{promise_id}',
      route_params: {
        slug: promise.studio.slug,
        promise_id: promiseId,
      },
      metadata: {
        cotizacion_id: cotizacion.id,
        cotizacion_name: cotizacion.name,
        cotizacion_price: cotizacion.price ?? 0,
        paquete_id: paqueteId,
        paquete_name: paquete.name,
        package_price: paquete.precio ?? undefined,
        condiciones_comerciales_id: condicionesComercialesId || null,
        condiciones_comerciales_metodo_pago_id: condicionesComercialesMetodoPagoId || null,
        condicion_comercial_name: condicionComercialInfo?.name || null,
        metodo_pago_name: metodoPagoInfo || null,
        action_type: "paquete_pre_autorizado_cotizacion_creada",
      },
    });

    // 11. Agregar log a la promesa
    await prisma.studio_promise_logs.create({
      data: {
        promise_id: promiseId,
        user_id: null,
        content: contenidoLog,
        log_type: "system",
        metadata: {
          action: "paquete_pre_autorizado_cotizacion_creada",
          cotizacion_id: cotizacion.id,
          cotizacion_name: cotizacion.name,
          cotizacion_price: cotizacion.price ?? 0,
          paquete_id: paqueteId,
          paquete_name: paquete.name,
          paquete_price: paquete.precio ?? null,
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
        cotizacionId: cotizacion.id,
        paqueteId,
        message: "Cotización creada y pre-autorizada exitosamente",
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
