"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from "@/lib/notifications/studio/types";
import { getPromiseShareSettings } from "@/lib/actions/studio/commercial/promises/promise-share-settings.actions";
import { getDefaultContractTemplate, createDefaultTemplateForStudio } from "@/lib/actions/studio/business/contracts/templates.actions";
import { getPromiseContractData } from "@/lib/actions/studio/business/contracts/renderer.actions";
import { renderContractContent } from "@/lib/actions/studio/business/contracts/renderer.actions";
import { getPublicDateAvailability } from "./promesas.actions";

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
  contractGenerated?: boolean;
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
        cotizacion_cierre: {
          select: {
            condiciones_comerciales_id: true,
          },
        },
        condicion_comercial_negociacion: {
          select: {
            id: true,
            name: true,
            description: true,
            advance_percentage: true,
            advance_type: true,
            advance_amount: true,
            discount_percentage: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return {
        success: false,
        error: "Cotización no encontrada o no disponible",
      };
    }

    // 1.5. Comprobar disponibilidad de la fecha (max_events_per_day) antes de continuar
    const dateAvailability = await getPublicDateAvailability(studioSlug, promiseId);
    if (dateAvailability.success && dateAvailability.available === false) {
      return {
        success: false,
        error: "DATE_OCCUPIED",
      };
    }

    // 2. Fase 29.10.1: PRIORIDAD 1 - Condición de NEGOCIACIÓN (personalizada, ej: $5,000 fijos)
    let condicionComercialInfo = null;
    let metodoPagoInfo = null;
    let condicionComercialIdFinal: string | null = null;

    // PASO 0: MÁXIMA PRIORIDAD - Condición de NEGOCIACIÓN (monto personalizado)
    const condicionNegociacion = cotizacion.condicion_comercial_negociacion;
    
    if (condicionNegociacion) {
      condicionComercialInfo = {
        id: condicionNegociacion.id,
        name: condicionNegociacion.name,
        description: condicionNegociacion.description,
        advance_percentage: condicionNegociacion.advance_percentage,
        advance_type: condicionNegociacion.advance_type,
        advance_amount: condicionNegociacion.advance_amount ? Number(condicionNegociacion.advance_amount) : null,
        discount_percentage: condicionNegociacion.discount_percentage,
      };
      
      // ⚠️ IMPORTANTE: Las condiciones de negociación NO tienen ID en studio_condiciones_comerciales
      // Son registros temporales en studio_condiciones_comerciales_negociacion
      // Por lo tanto, condicionComercialIdFinal debe ser NULL para el cierre
      condicionComercialIdFinal = null;
    }

    // PASO 1: Verificar si ya existe una condición pactada en el registro de cierre
    const condicionPactadaId = !condicionNegociacion ? cotizacion.cotizacion_cierre?.condiciones_comerciales_id : null;
    
    if (condicionPactadaId) {
      const condicionPactada = await prisma.studio_condiciones_comerciales.findUnique({
        where: { id: condicionPactadaId },
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

      if (condicionPactada) {
        condicionComercialInfo = condicionPactada;
        condicionComercialIdFinal = condicionPactada.id;
      } else {
        console.error('[autorizarCotizacionPublica] Condición pactada no existe:', condicionPactadaId);
        return {
          success: false,
          error: "Error de configuración: La condición comercial pactada no existe. Contacta al estudio.",
        };
      }
    }

    // PASO 2: Si no hay condición de negociación ni pactada, usar la que viene del parámetro (flujo nuevo)
    if (!condicionNegociacion && !condicionComercialIdFinal && condicionesComercialesId) {
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

      if (condicionComercial) {
        condicionComercialInfo = condicionComercial;
        condicionComercialIdFinal = condicionComercial.id;
      }
    }

    // PASO 3: Fallback SOLO si no hay condición de negociación, pactada ni del parámetro
    if (!condicionNegociacion && !condicionComercialIdFinal) {
      const defaultCondicion = await prisma.studio_condiciones_comerciales.findFirst({
        where: {
          studio_id: promise.studio.id,
          status: 'active',
        },
        orderBy: [
          { type: 'asc' }, // 'standard' primero
          { created_at: 'asc' },
        ],
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

      if (defaultCondicion) {
        condicionComercialInfo = defaultCondicion;
        condicionComercialIdFinal = defaultCondicion.id;
      }
    }

    // Obtener método de pago si aplica
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

    // 3. Actualizar cotización: pasar a en_cierre y crear registro temporal
    // Las condiciones comerciales se guardan SOLO en la tabla temporal (studio_cotizaciones_cierre)
    try {
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

        // 3.2. Crear registro de cierre con condición comercial VALIDADA (Fase 29.9.5: checkin_completed = true cuando el cliente completa el flujo)
        // Fase 29.9.11: Usar condicionComercialIdFinal que ya fue validado
        await tx.studio_cotizaciones_cierre.upsert({
          where: { cotizacion_id: cotizacionId },
          create: {
            cotizacion_id: cotizacionId,
            condiciones_comerciales_id: condicionComercialIdFinal,
            condiciones_comerciales_definidas: !!condicionComercialIdFinal,
            checkin_completed: true,
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
            condiciones_comerciales_id: condicionComercialIdFinal,
            condiciones_comerciales_definidas: !!condicionComercialIdFinal,
            checkin_completed: true,
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
    } catch (transactionError) {
      console.error('[autorizarCotizacionPublica] Error en transacción de cierre:', transactionError);
      
      // Fase 29.9.11: Mensaje amigable para errores de foreign key
      if (transactionError instanceof Error && 
          transactionError.message.includes('Foreign key constraint')) {
        return {
          success: false,
          error: "Error de configuración comercial. Contacta al estudio para verificar las condiciones comerciales.",
        };
      }
      
      return {
        success: false,
        error: "Error al procesar la solicitud de cierre. Por favor, intenta de nuevo.",
      };
    }

    // 3.4. Sincronizar pipeline stage de la promesa a "closing"
    // La cotización está en 'en_cierre', así que la sincronización debe detectar y actualizar a 'closing'
    try {
      const { syncPromisePipelineStageFromQuotes } = await import('../studio/commercial/promises/promise-pipeline-sync.actions');
      await syncPromisePipelineStageFromQuotes(promiseId, promise.studio.id, null).catch(() => {
        // Error silenciado
      });
    } catch (error) {
      // Error al importar - silenciado
    }

    // 3.5. Fase 29.9.6: Si auto_generate_contract, esperar a que el contrato esté en DB antes de devolver éxito
    const shareSettings = await getPromiseShareSettings(studioSlug, promiseId);
    const autoGenerateContract = shareSettings.success && shareSettings.data?.auto_generate_contract;
    let contractGenerated = false;

    if (autoGenerateContract) {
      let templateResult = await getDefaultContractTemplate(studioSlug, promise.event_type_id || undefined);
      if (!templateResult.success) {
        const createResult = await createDefaultTemplateForStudio(studioSlug);
        if (createResult.success && createResult.data) {
          templateResult = { success: true, data: createResult.data };
        } else {
          console.error('[autorizarCotizacionPublica] Fallo al crear plantilla:', createResult.error);
        }
      }

      if (!templateResult.success || !templateResult.data) {
        console.error('[autorizarCotizacionPublica] No hay plantilla disponible');
        return {
          success: false,
          error: "No se encontró una plantilla de contrato por defecto para el estudio. El estudio debe configurar una plantilla activa.",
        };
      }

      const template = templateResult.data;
      if (!template?.id || !template?.content) {
        console.error('[autorizarCotizacionPublica] Plantilla inválida');
        return {
          success: false,
          error: "La plantilla de contrato está incompleta. Contacta al estudio para que configure una plantilla válida.",
        };
      }

      try {
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
            const renderResult = await renderContractContent(
              template.content,
              contractDataResult.data,
              contractDataResult.data.condicionesData
            );

            if (renderResult.success && renderResult.data) {
              await prisma.$transaction(async (tx) => {
                await tx.studio_cotizaciones_cierre.update({
                  where: { cotizacion_id: cotizacionId },
                  data: {
                    contract_template_id: template.id,
                    contract_content: renderResult.data,
                    contrato_definido: true,
                    updated_at: new Date(),
                  },
                });
                await tx.studio_cotizaciones.update({
                  where: { id: cotizacionId },
                  data: { updated_at: new Date() },
                });
              });
              // Fase 29.9.10: Verificación síncrona — leer de DB antes de devolver éxito
              const savedCierre = await prisma.studio_cotizaciones_cierre.findUnique({
                where: { cotizacion_id: cotizacionId },
                select: {
                  contract_template_id: true,
                  contract_content: true,
                  contrato_definido: true,
                },
              });
              
              if (!savedCierre?.contract_template_id || savedCierre.contract_content == null || savedCierre.contract_content.trim() === '') {
                console.error('[autorizarCotizacionPublica] Verificación falló: contrato no escrito en DB');
                return {
                  success: false,
                  error: "El contrato no se escribió correctamente en la base de datos. Reintenta o contacta al estudio.",
                };
              }
              contractGenerated = true;
              console.log('[autorizarCotizacionPublica] ✅ Contrato generado:', { 
                templateId: template.id, 
                contentLength: savedCierre.contract_content?.length ?? 0
              });
            } else {
              console.error('[autorizarCotizacionPublica] Error al renderizar contrato');
              return {
                success: false,
                error: "No se pudo generar el contenido del contrato. Revisa los datos del cliente y la plantilla.",
              };
            }
          } else {
            console.error('[autorizarCotizacionPublica] Error al obtener datos del contrato');
            return {
              success: false,
              error: "No se pudieron obtener los datos para el contrato. Verifica nombre, dirección y datos del evento.",
            };
          }
      } catch (genError) {
        const message = genError instanceof Error ? genError.message : "Error al generar contrato";
        console.error('[autorizarCotizacionPublica] Error en generación:', genError);
        return {
          success: false,
          error: `Error al generar el contrato: ${message}`,
        };
      }
    }

    // ⚠️ OPTIMIZACIÓN: Notificaciones y logs se ejecutan RÁPIDO (~200ms)
    // Contrato tarda ~10s, por eso está en async arriba
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
        condiciones_comerciales_id: condicionComercialIdFinal || null,
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
        origin_context: "PROMISE",
        metadata: {
          action: "cotizacion_contratacion_solicitada",
          cotizacion_id: cotizacionId,
          cotizacion_name: cotizacion.name,
          cotizacion_price: cotizacion.price ?? 0,
          precio_base: precioBase,
          precio_con_descuento: precioConDescuento,
          anticipo: anticipo,
          diferido: diferido,
          condiciones_comerciales_id: condicionComercialIdFinal || null,
          condiciones_comerciales_metodo_pago_id: condicionesComercialesMetodoPagoId || null,
          condicion_comercial_name: condicionComercialInfo?.name || null,
          metodo_pago_name: metodoPagoInfo || null,
        },
      },
    });

    // 8. Sincronizar short URL según nuevo estado
    const { syncShortUrlRoute } = await import('../studio/commercial/promises/promise-short-url.actions');
    await syncShortUrlRoute(studioSlug, promiseId).catch(() => {
      // Error silenciado
    });

    // ⚠️ OPTIMIZED: Solo revalidar rutas relevantes
    // Usuario navega a /cierre, no necesita revalidar /pendientes
    
    // ⚠️ OPTIMIZACIÓN: Revalidación diferida para no interferir con Authorization Lock
    // NO revalidar durante el proceso de autorización para evitar desmontar el PromisePageProvider
    // El frontend hará la revalidación DESPUÉS de la transición manual
    
    // Solo mantener tags para invalidación futura (cuando el usuario navegue manualmente)
    revalidateTag(`public-promise-cierre-${studioSlug}-${promiseId}`, 'max');

    return {
      success: true,
      contractGenerated,
      data: { cotizacionId, message: "Solicitud enviada exitosamente" },
    };
  } catch (error) {
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
    const templateResult = await getDefaultContractTemplate(studioSlug);
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

/**
 * Fase 29.9.7: Regenerar contenido del contrato cuando está vacío (registros "huecos").
 * Si cierre tiene contract_content null, intenta generar con la plantilla del estudio.
 */
export async function regenerateContractContentIfEmpty(
  studioSlug: string,
  cotizacionId: string,
  promiseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: "Studio no encontrado" };

    const cierre = await prisma.studio_cotizaciones_cierre.findFirst({
      where: {
        cotizacion_id: cotizacionId,
        cotizacion: { studio_id: studio.id, promise_id: promiseId },
      },
      include: {
        condiciones_comerciales: true,
        cotizacion: { select: { promise_id: true, promise: { select: { event_type_id: true } } } },
      },
    });
    if (!cierre) return { success: false, error: "Registro de cierre no encontrado" };
    if (cierre.contract_content != null && cierre.contract_content.trim() !== "") {
      return { success: true };
    }

    // Fase 29.9.9: Si template_id en cierre es null, obligar a usar plantilla por defecto
    let template: { id: string; content: string };
    const templateIdToUse = cierre.contract_template_id ?? null;
    if (templateIdToUse) {
      const t = await prisma.studio_contract_templates.findUnique({
        where: { id: templateIdToUse, studio_id: studio.id },
        select: { id: true, content: true },
      });
      if (!t?.id || !t?.content) {
        return { success: false, error: "No se encontró una plantilla de contrato por defecto para el estudio" };
      }
      template = { id: t.id, content: t.content };
    } else {
      let templateResult = await getDefaultContractTemplate(studioSlug, cierre.cotizacion?.promise?.event_type_id ?? undefined);
      if (!templateResult.success || !templateResult.data) {
        const createResult = await createDefaultTemplateForStudio(studioSlug);
        if (createResult.success && createResult.data) templateResult = { success: true, data: createResult.data };
      }
      if (!templateResult.success || !templateResult.data || !templateResult.data?.id || !templateResult.data?.content) {
        return { success: false, error: "No se encontró una plantilla de contrato por defecto para el estudio" };
      }
      template = { id: templateResult.data.id, content: templateResult.data.content };
    }

    const condicion = cierre.condiciones_comerciales;
    const condicionInfo = condicion ? {
      id: condicion.id,
      name: condicion.name,
      description: condicion.description ?? null,
      discount_percentage: condicion.discount_percentage ?? null,
      advance_percentage: condicion.advance_percentage ?? null,
      advance_type: condicion.advance_type ?? null,
      advance_amount: condicion.advance_amount ?? null,
    } : undefined;

    const contractDataResult = await getPromiseContractData(studioSlug, promiseId, cotizacionId, condicionInfo);
    if (!contractDataResult.success || !contractDataResult.data) {
      return { success: false, error: contractDataResult.error ?? "Error al obtener datos para el contrato" };
    }

    const renderResult = await renderContractContent(
      template.content,
      contractDataResult.data,
      contractDataResult.data.condicionesData
    );
    if (!renderResult.success || !renderResult.data) {
      return { success: false, error: "Error al renderizar el contenido del contrato" };
    }

    await prisma.studio_cotizaciones_cierre.update({
      where: { cotizacion_id: cotizacionId },
      data: {
        contract_template_id: template.id,
        contract_content: renderResult.data,
        contrato_definido: true,
        updated_at: new Date(),
      },
    });
    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { updated_at: new Date() },
    });

    console.log('[regeneratePublicContract] ✅ Contrato regenerado:', { templateId: template.id, contentLength: renderResult.data.length });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al regenerar contenido del contrato",
    };
  }
}
