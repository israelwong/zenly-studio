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

    // 3. Actualizar cotización: pasar a en_cierre y crear registro temporal
    // Las condiciones comerciales se guardan SOLO en la tabla temporal (studio_cotizaciones_cierre)
    await prisma.$transaction(async (tx) => {
      // 3.1. Actualizar cotización a en_cierre (SIN guardar condiciones aquí)
      await tx.studio_cotizaciones.update({
        where: { id: cotizacionId },
        data: {
          selected_by_prospect: true,
          selected_at: new Date(),
          status: 'en_cierre',
          updated_at: new Date(),
        },
      });

      // 3.2. Crear registro de cierre con condición comercial seleccionada por el prospecto
      await tx.studio_cotizaciones_cierre.upsert({
        where: { cotizacion_id: cotizacionId },
        create: {
          cotizacion_id: cotizacionId,
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
        update: {
          // Actualizar condición comercial seleccionada por el prospecto
          condiciones_comerciales_id: condicionesComercialesId || null,
          condiciones_comerciales_definidas: !!condicionesComercialesId,
          // Limpiar solo campos de contrato y pago si ya existía (mantener condición comercial)
          contract_template_id: null,
          contract_content: null,
          contrato_definido: false,
          pago_registrado: false,
          pago_concepto: null,
          pago_monto: null,
          pago_fecha: null,
          pago_metodo_id: null,
          updated_at: new Date(),
        },
      });

      // 3.3. Archivar todas las demás cotizaciones pendientes de la misma promesa
      await tx.studio_cotizaciones.updateMany({
        where: {
          promise_id: promiseId,
          id: { not: cotizacionId },
          status: 'pendiente',
          archived: false,
        },
        data: {
          archived: true,
          updated_at: new Date(),
        },
      });
    });

    // 3.4. Sincronizar pipeline stage de la promesa a "closing"
    // La cotización está en 'en_cierre', así que la sincronización debe detectar y actualizar a 'closing'
    try {
      const { syncPromisePipelineStageFromQuotes } = await import('../studio/commercial/promises/promise-pipeline-sync.actions');
      await syncPromisePipelineStageFromQuotes(promiseId, promise.studio.id, null).catch((error) => {
        console.error('[autorizarCotizacionPublica] Error sincronizando pipeline:', error);
      });
    } catch (error) {
      console.error('[autorizarCotizacionPublica] Error al importar syncPromisePipelineStageFromQuotes:', error);
    }

    // 3.5. Verificar si se debe generar contrato automáticamente
    const shareSettings = await getPromiseShareSettings(studioSlug, promiseId);
    const autoGenerateContract = shareSettings.success && shareSettings.data?.auto_generate_contract;

    if (autoGenerateContract) {
      try {
        // Obtener plantilla por defecto
        let templateResult = await getDefaultContractTemplate(studioSlug, promise.event_type_id || undefined);
        
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
            cotizacionId,
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
                where: { cotizacion_id: cotizacionId },
                data: {
                  contract_template_id: template.id,
                  contract_content: renderResult.data,
                  contrato_definido: true,
                },
              });
              
              // ✅ ACTUALIZAR updated_at de cotización para disparar Realtime
              // Esto permite que la página de cierre escuche cuando se genera el contrato
              await prisma.studio_cotizaciones.update({
                where: { id: cotizacionId },
                data: {
                  updated_at: new Date(),
                },
              });
            }
          }
        }
      } catch (error) {
        // Si falla la generación automática, no fallar toda la operación
        // Solo loguear el error y continuar
        console.error('[autorizarCotizacionPublica] Error al generar contrato automáticamente:', error);
      }
    }

    // Revalidar paths y caché para refrescar datos en el panel
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/promise/${promiseId}`, 'layout'); // ⚠️ CRÍTICO: Invalidar layout para forzar frescura
    revalidatePath(`/${studioSlug}/promise/${promiseId}/pendientes`, 'layout');
    revalidatePath(`/${studioSlug}/promise/${promiseId}/cierre`, 'layout');
    revalidatePath(`/${studioSlug}/promise/${promiseId}/negociacion`, 'layout');
    
    // ⚠️ TAREA 4: Invalidación granular de caché
    revalidateTag(`public-promise-${studioSlug}-${promiseId}`, 'max');
    revalidateTag(`public-promise-route-state-${studioSlug}-${promiseId}`, 'max');
    revalidateTag(`public-promise-negociacion-${studioSlug}-${promiseId}`, 'max');
    revalidateTag(`public-promise-cierre-${studioSlug}-${promiseId}`, 'max');

    // Sincronizar short URL según nuevo estado
    const { syncShortUrlRoute } = await import('../studio/commercial/promises/promise-short-url.actions');
    await syncShortUrlRoute(studioSlug, promiseId).catch((error) => {
      console.error('[autorizarCotizacionPublica] Error sincronizando short URL:', error);
    });

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
    const advancePercentage = condicionComercialInfo?.advance_percentage ?? 0;
    const advanceAmount = condicionComercialInfo?.advance_amount ?? null;
    const anticipo = advanceType === 'fixed_amount' && advanceAmount
      ? advanceAmount
      : advancePercentage > 0
        ? (precioConDescuento * advancePercentage) / 100
        : 0;
    const diferido = precioConDescuento - anticipo;

    // 5. Construir mensaje con información completa de precio y condición comercial
    let mensajeNotificacion = `${promise.contact.name} autorizó la cotización "${cotizacion.name}" - En proceso de cierre`;
    let contenidoLog = `Cliente autorizó la cotización: "${cotizacion.name}" - Pasó a proceso de cierre`;

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

/**
 * Regenerar contrato cuando el cliente actualiza sus datos
 * Solo funciona si el contrato ya está generado y no está firmado
 */
export async function regeneratePublicContract(
  studioSlug: string,
  promiseId: string,
  cotizacionId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    // Verificar que la cotización existe y tiene contrato generado
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
        promise_id: promiseId,
      },
      include: {
        cotizacion_cierre: {
          include: {
            condiciones_comerciales: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return {
        success: false,
        error: "Cotización no encontrada",
      };
    }

    // Verificar que el contrato está generado pero no firmado
    if (cotizacion.status !== 'contract_generated' && cotizacion.status !== 'en_cierre') {
      return {
        success: false,
        error: "El contrato no está disponible para regeneración",
      };
    }

    if (cotizacion.cotizacion_cierre?.contract_signed_at) {
      return {
        success: false,
        error: "No se puede regenerar un contrato firmado",
      };
    }

    // Verificar que hay contrato definido
    if (!cotizacion.cotizacion_cierre?.contrato_definido || !cotizacion.cotizacion_cierre?.contract_template_id) {
      return {
        success: false,
        error: "No hay contrato generado para regenerar",
      };
    }

    // Obtener la plantilla del contrato
    const templateResult = await getDefaultContractTemplate(studio.id);
    if (!templateResult.success || !templateResult.data) {
      return {
        success: false,
        error: "No se encontró la plantilla del contrato",
      };
    }

    const template = templateResult.data;

    // Obtener condiciones comerciales si existen
    const condicionComercial = cotizacion.cotizacion_cierre?.condiciones_comerciales;
    const condicionComercialInfo = condicionComercial ? {
      id: condicionComercial.id,
      name: condicionComercial.name,
      description: condicionComercial.description || null,
      discount_percentage: condicionComercial.discount_percentage || null,
      advance_percentage: condicionComercial.advance_percentage || null,
      advance_type: condicionComercial.advance_type || null,
      advance_amount: condicionComercial.advance_amount || null,
    } : undefined;

    // Obtener datos actualizados de la promesa para renderizar el contrato
    const contractDataResult = await getPromiseContractData(
      studioSlug,
      promiseId,
      cotizacionId,
      condicionComercialInfo
    );

    if (!contractDataResult.success || !contractDataResult.data) {
      return {
        success: false,
        error: contractDataResult.error || "Error al obtener datos del contrato",
      };
    }

    // Renderizar contenido del contrato con datos actualizados
    const renderResult = await renderContractContent(
      template.content,
      contractDataResult.data,
      contractDataResult.data.condicionesData
    );

    if (!renderResult.success || !renderResult.data) {
      return {
        success: false,
        error: renderResult.error || "Error al renderizar contrato",
      };
    }

    const renderedContent = renderResult.data;
    const currentVersion = cotizacion.cotizacion_cierre?.contract_version || 1;
    const newVersion = currentVersion + 1;

    // Guardar versión anterior antes de actualizar (solo si no existe ya)
    const existingPreviousVersion = await prisma.studio_cotizaciones_cierre_contract_versions.findFirst({
      where: {
        cotizacion_id: cotizacionId,
        version: currentVersion,
      },
    });

    if (!existingPreviousVersion && cotizacion.cotizacion_cierre?.contract_content) {
      await prisma.studio_cotizaciones_cierre_contract_versions.create({
        data: {
          cotizacion_id: cotizacionId,
          version: currentVersion,
          content: cotizacion.cotizacion_cierre.contract_content,
          change_type: "AUTO_REGENERATE",
          change_reason: "Regeneración automática por actualización de datos del cliente",
        },
      });
    }

    // Actualizar el contenido del contrato y la versión en studio_cotizaciones_cierre
    await prisma.studio_cotizaciones_cierre.update({
      where: { cotizacion_id: cotizacionId },
      data: {
        contract_content: renderedContent,
        contract_version: newVersion,
      },
    });

    // Crear nueva versión (solo si no existe ya)
    const existingNewVersion = await prisma.studio_cotizaciones_cierre_contract_versions.findFirst({
      where: {
        cotizacion_id: cotizacionId,
        version: newVersion,
      },
    });

    if (!existingNewVersion) {
      await prisma.studio_cotizaciones_cierre_contract_versions.create({
        data: {
          cotizacion_id: cotizacionId,
          version: newVersion,
          content: renderedContent,
          change_type: "AUTO_REGENERATE",
          change_reason: "Regeneración automática por actualización de datos del cliente",
        },
      });
    }

    // Revalidar paths y caché
    revalidatePath(`/${studioSlug}/promise/${promiseId}`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    revalidateTag(`public-promise-${studioSlug}-${promiseId}`, 'max');

    return {
      success: true,
    };
  } catch (error) {
    console.error("[regeneratePublicContract] Error:", error);
    return {
      success: false,
      error: "Error al regenerar contrato",
    };
  }
}
