"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from "@/lib/notifications/studio/types";
import { getPromiseShareSettings } from "@/lib/actions/studio/commercial/promises/promise-share-settings.actions";
import { getDefaultContractTemplate, createDefaultTemplateForStudio } from "@/lib/actions/studio/business/contracts/templates.actions";
import { getPromiseContractData } from "@/lib/actions/studio/business/contracts/renderer.actions";
import { renderContractContent } from "@/lib/actions/studio/business/contracts/renderer.actions";

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

    // 6. Crear cotización desde el paquete y pasar a en_cierre
    // También archivar otras cotizaciones pendientes y crear registro de cierre
    const cotizacion = await prisma.$transaction(async (tx) => {
      // 6.1. Crear cotización
      const nuevaCotizacion = await tx.studio_cotizaciones.create({
        data: {
          studio_id: promise.studio.id,
          evento_id: evento.id,
          event_type_id: eventTypeId,
          promise_id: promiseId,
          contact_id: promise.contact.id,
          name: paquete.name,
          description: paquete.description,
          price: paquete.precio || 0,
          status: 'en_cierre',
          visible_to_client: true,
          paquete_id: paqueteId,
          condiciones_comerciales_id: condicionesComercialesId || null,
          condiciones_comerciales_metodo_pago_id: condicionesComercialesMetodoPagoId || null,
          selected_by_prospect: true,
          selected_at: new Date(),
          order: newOrder,
        },
      });

      // 6.2. Crear items de cotización desde items del paquete
      const cotizacionItems = paquete.paquete_items
        .filter((item) => item.item_id) // Solo items con item_id válido
        .map((item, index) => ({
          cotizacion_id: nuevaCotizacion.id,
          item_id: item.item_id!,
          service_category_id: item.service_category_id,
          quantity: item.quantity,
          order: index,
        }));

      if (cotizacionItems.length > 0) {
        await tx.studio_cotizacion_items.createMany({
          data: cotizacionItems,
        });
      }

      // 6.3. Crear registro de cierre con condición comercial seleccionada por el prospecto
      await tx.studio_cotizaciones_cierre.create({
        data: {
          cotizacion_id: nuevaCotizacion.id,
          condiciones_comerciales_id: condicionesComercialesId || null,
          condiciones_comerciales_definidas: !!condicionesComercialesId,
          // Limpiar otros campos para empezar limpio
          contract_template_id: null,
          contract_content: null,
          contrato_definido: false,
          pago_registrado: false,
          pago_concepto: null,
          pago_monto: null,
          pago_fecha: null,
          pago_metodo_id: null,
        },
      });

      // 6.4. Archivar todas las demás cotizaciones pendientes de la misma promesa
      await tx.studio_cotizaciones.updateMany({
        where: {
          promise_id: promiseId,
          id: { not: nuevaCotizacion.id },
          status: 'pendiente',
          archived: false,
        },
        data: {
          archived: true,
          updated_at: new Date(),
        },
      });

      return nuevaCotizacion;
    });

    // Calcular y guardar precios de los items (fuera de la transacción para no bloquear)
    // Import dinámico para evitar problemas de HMR
    try {
      const { calcularYGuardarPreciosCotizacion } = await import("@/lib/actions/studio/commercial/promises/cotizacion-pricing");
      await calcularYGuardarPreciosCotizacion(cotizacion.id, studioSlug).catch(() => {
        // No fallar la creación si el cálculo de precios falla
      });
    } catch (error) {
      // No fallar la creación si el import o cálculo de precios falla
      console.warn("[solicitarPaquetePublico] Error al calcular precios:", error);
    }

    // 7. Verificar si se debe generar contrato automáticamente
    const shareSettings = await getPromiseShareSettings(studioSlug, promiseId);
    const autoGenerateContract = shareSettings.success && shareSettings.data?.auto_generate_contract;

    if (autoGenerateContract) {
      try {
        // Obtener plantilla por defecto
        const eventTypeId = promise.event_type_id || (paquete.event_types?.id || null);
        let templateResult = await getDefaultContractTemplate(studioSlug, eventTypeId || undefined);
        
        // Si no existe, intentar crear una
        if (!templateResult.success) {
          const createResult = await createDefaultTemplateForStudio(studioSlug);
          if (createResult.success && createResult.data) {
            templateResult = { success: true, data: createResult.data };
          }
        }

        if (templateResult.success && templateResult.data) {
          const template = templateResult.data;

          // Obtener datos de la promesa para renderizar el contrato
          const contractDataResult = await getPromiseContractData(
            studioSlug,
            promiseId,
            cotizacion.id,
            condicionComercialInfo ? {
              id: condicionComercialInfo.id,
              name: condicionComercialInfo.name,
              description: condicionComercialInfo.description || null,
              discount_percentage: condicionComercialInfo.discount_percentage || null,
              advance_percentage: condicionComercialInfo.advance_percentage || null,
              advance_type: condicionComercialInfo.advance_type || null,
              advance_amount: condicionComercialInfo.advance_amount || null,
            } : undefined
          );

          if (contractDataResult.success && contractDataResult.data) {
            // Renderizar contenido del contrato
            const renderResult = await renderContractContent(
              template.content,
              contractDataResult.data,
              contractDataResult.data.condicionesData
            );

            if (renderResult.success && renderResult.data) {
              // Guardar en studio_cotizaciones_cierre con template_id y contenido renderizado
              // NO crear evento ni contrato en studio_event_contracts todavía
              // Mantener status en 'en_cierre' (no cambiar a 'contract_generated')
              await prisma.studio_cotizaciones_cierre.update({
                where: { cotizacion_id: cotizacion.id },
                data: {
                  contract_template_id: template.id,
                  contract_content: renderResult.data,
                  contrato_definido: true,
                },
              });
            }
          }
        }
      } catch (error) {
        // Si falla la generación automática, no fallar toda la operación
        // Solo loguear el error y continuar
        console.error('[solicitarPaquetePublico] Error al generar contrato automáticamente:', error);
      }
    }

    // Revalidar paths para refrescar datos en el panel
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    
    // ⚠️ TAREA 4: Invalidación granular de caché
    const { revalidateTag } = await import('next/cache');
    revalidateTag(`public-promise-route-state-${studioSlug}-${promiseId}`);
    revalidateTag(`public-promise-pendientes-${studioSlug}-${promiseId}`);

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
    const advancePercentage = condicionComercialInfo?.advance_percentage ?? 0;
    const advanceAmount = condicionComercialInfo?.advance_amount ?? null;
    let anticipo = 0;
    if (advanceType === 'fixed_amount' && advanceAmount !== null) {
      anticipo = advanceAmount;
    } else if (advancePercentage > 0) {
      anticipo = (precioConDescuento * advancePercentage) / 100;
    }
    const diferido = precioConDescuento - anticipo;

    // 9. Construir mensaje con información completa de precio y condición comercial
    let mensajeNotificacion = `${promise.contact.name} autorizó el paquete "${paquete.name}" (cotización creada) - En proceso de cierre`;
    let contenidoLog = `Cliente autorizó el paquete: "${paquete.name}" - Cotización creada automáticamente y pasó a proceso de cierre`;

    // Agregar información de precio
    mensajeNotificacion += ` - Total: ${formatPrice(precioConDescuento)}`;
    contenidoLog += ` - Total: ${formatPrice(precioConDescuento)}`;

    if (condicionComercialInfo) {
      mensajeNotificacion += ` con condición comercial: "${condicionComercialInfo?.name}"`;
      contenidoLog += ` con condición comercial: "${condicionComercialInfo?.name}"`;

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
          mensajeNotificacion += ` - Anticipo: ${advancePercentage}% (${formatPrice(anticipo)})`;
          contenidoLog += ` - Anticipo: ${advancePercentage}% (${formatPrice(anticipo)})`;
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
      title: "Paquete autorizado - Cotización en proceso de cierre",
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
