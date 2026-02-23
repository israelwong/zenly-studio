'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  crearVersionNegociadaSchema,
  aplicarCambiosNegociacionSchema,
  type CrearVersionNegociadaData,
  type AplicarCambiosNegociacionData,
  type CotizacionResponse,
  type CondicionComercialTemporal,
} from '@/lib/actions/schemas/cotizaciones-schemas';
import { calcularYGuardarPreciosCotizacion } from './cotizacion-pricing';
import { COTIZACION_ITEMS_SELECT_STANDARD } from './cotizacion-structure.utils';
import type { CotizacionCompleta, CotizacionItem } from '@/lib/utils/negociacion-calc';

/**
 * Cargar cotizaci?n completa para negociaci?n
 * Retorna la cotizaci?n con todos sus items y datos necesarios para negociaci?n
 */
export async function loadCotizacionParaNegociacion(
  cotizacionId: string,
  studioSlug: string
): Promise<{
  success: boolean;
  data?: CotizacionCompleta;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        status: true,
        promise_id: true,
        visible_to_client: true,
        event_duration: true,
        condiciones_comerciales_id: true,
        negociacion_precio_original: true,
        negociacion_precio_personalizado: true,
        negociacion_descuento_adicional: true,
        negociacion_notas: true,
        bono_especial: true,
        cotizacion_items: {
          select: {
            ...COTIZACION_ITEMS_SELECT_STANDARD,
            cost: true,
            expense: true,
            is_courtesy: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        condicion_comercial_negociacion: {
          select: {
            id: true,
            name: true,
            description: true,
            discount_percentage: true,
            advance_percentage: true,
            advance_type: true,
            advance_amount: true,
            metodo_pago_id: true,
            is_temporary: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    // Validar que la cotizaci?n est? en estado pendiente o negociacion
    // Permitir cargar cotizaciones en negociaci?n para poder editarlas
    if (cotizacion.status !== 'pendiente' && cotizacion.status !== 'negociacion') {
      return {
        success: false,
        error: 'Solo se pueden negociar cotizaciones en estado pendiente o negociaci?n',
      };
    }

    // Mapear TODOS los ítems (catálogo + custom) para que coste/gasto no se subestimen
    const items: CotizacionItem[] = cotizacion.cotizacion_items.map((item) => ({
      id: item.id,
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: item.unit_price ?? 0,
      subtotal: item.subtotal ?? 0,
      cost: item.cost ?? null,
      expense: item.expense ?? null,
      name: item.name_snapshot || item.name || null,
      description: item.description_snapshot || item.description || null,
      category_name: item.category_name_snapshot || item.category_name || null,
      seccion_name: item.seccion_name_snapshot || item.seccion_name || null,
      is_courtesy: item.is_courtesy || false,
      billing_type: item.billing_type ?? null,
    }));

    // Obtener condición comercial temporal si existe
    const condicionTemporal = cotizacion.condicion_comercial_negociacion;

    // Determinar precio original: usar negociacion_precio_original si existe, sino usar price
    // Esto asegura que siempre tengamos el precio original para cálculos y presentación
    const precioOriginal = cotizacion.negociacion_precio_original 
      ? Number(cotizacion.negociacion_precio_original)
      : cotizacion.price; // Fallback para negociaciones antiguas sin precio original guardado

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
        description: cotizacion.description,
        price: cotizacion.price, // Precio actual (negociado si está en negociación)
        precioOriginal, // Precio original antes de negociar
        status: cotizacion.status,
        visible_to_client: cotizacion.visible_to_client ?? false,
        event_duration: cotizacion.event_duration ?? null,
        items,
        // Datos de negociación guardados (si la cotización ya está en negociación)
        negociacion_precio_original: precioOriginal,
        negociacion_precio_personalizado: cotizacion.negociacion_precio_personalizado 
          ? Number(cotizacion.negociacion_precio_personalizado) 
          : null,
        negociacion_descuento_adicional: cotizacion.negociacion_descuento_adicional 
          ? Number(cotizacion.negociacion_descuento_adicional) 
          : null,
        negociacion_notas: cotizacion.negociacion_notas || null,
        condiciones_comerciales_id: cotizacion.condiciones_comerciales_id || null,
        bono_especial: cotizacion.bono_especial != null ? Number(cotizacion.bono_especial) : null,
        condicion_comercial_temporal: condicionTemporal ? {
          name: condicionTemporal.name,
          description: condicionTemporal.description || null,
          discount_percentage: condicionTemporal.discount_percentage 
            ? Number(condicionTemporal.discount_percentage) 
            : null,
          advance_percentage: condicionTemporal.advance_percentage 
            ? Number(condicionTemporal.advance_percentage) 
            : null,
          advance_type: condicionTemporal.advance_type || null,
          advance_amount: condicionTemporal.advance_amount 
            ? Number(condicionTemporal.advance_amount) 
            : null,
          metodo_pago_id: condicionTemporal.metodo_pago_id || null,
        } : null,
      },
    };
  } catch (error) {
    console.error('[NEGOCIACION] Error cargando cotizaci?n:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cargar cotizaci?n',
    };
  }
}

/**
 * Crear nueva cotizaci?n en negociaci?n
 * Crea una nueva cotizaci?n independiente (no revisi?n) con status 'negociacion'
 */
export async function crearVersionNegociada(
  data: CrearVersionNegociadaData
): Promise<CotizacionResponse> {
  try {
    const validatedData = crearVersionNegociadaSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener cotizaci?n original (select explícito incl. event_duration para clonar en versión negociada)
    const cotizacionOriginal = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: validatedData.cotizacion_original_id,
        studio_id: studio.id,
      },
      select: {
        event_duration: true,
        promise_id: true,
        contact_id: true,
        event_type_id: true,
        name: true,
        description: true,
        price: true,
        order: true,
        status: true,
        studio_id: true,
        visible_to_client: true,
        promise: {
          select: {
            id: true,
            contact_id: true,
          },
        },
        cotizacion_items: {
          select: {
            id: true,
            item_id: true,
            quantity: true,
            order: true,
            billing_type: true,
            profit_type_snapshot: true,
          },
        },
      },
    });

    if (!cotizacionOriginal) {
      return { success: false, error: 'Cotizaci?n original no encontrada' };
    }

    if (!cotizacionOriginal.promise_id) {
      return { success: false, error: 'La cotizaci?n debe estar asociada a una promesa' };
    }

    // Validar que la cotizaci?n original est? en estado pendiente
    if (cotizacionOriginal.status !== 'pendiente') {
      return {
        success: false,
        error: 'Solo se pueden crear versiones negociadas de cotizaciones pendientes',
      };
    }

    // Calcular precio final
    const precioFinal =
      validatedData.precio_personalizado ?? cotizacionOriginal.price;

    // Obtener el order m?ximo para colocar la nueva cotizaci?n al final
    const maxOrder = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise_id: cotizacionOriginal.promise_id,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    });

    const newOrder = (maxOrder?.order ?? -1) + 1;

    // Clon exacto: nueva cotización en negociación; la original permanece intacta en pendiente (rollback)
    const nuevaVersion = await prisma.$transaction(async (tx) => {
      // 1. Crear nueva cotizaci?n con status 'negociacion' (no es revisi?n)
      const nuevaCotizacion = await tx.studio_cotizaciones.create({
        data: {
          studio_id: studio.id,
          promise_id: cotizacionOriginal.promise_id,
          contact_id:
            cotizacionOriginal.contact_id ||
            cotizacionOriginal.promise?.contact_id ||
            null,
          event_type_id: cotizacionOriginal.event_type_id,
          name: validatedData.nombre,
          description: validatedData.descripcion || null,
          price: precioFinal,
          status: 'negociacion', // Nueva cotizaci?n con status negociacion
          order: newOrder,
          visible_to_client: validatedData.visible_to_client ?? false,
          selected_by_prospect: false, // IMPORTANTE: Cotizaciones en negociaci?n NO est?n autorizadas por el prospecto
          // NO es revisi?n - no incluir revision_of_id, revision_number, revision_status
          // Campos de negociaci?n
          negociacion_precio_original: cotizacionOriginal.price, // Guardar precio original de la cotización base
          negociacion_precio_personalizado: validatedData.precio_personalizado
            ? validatedData.precio_personalizado
            : null,
          negociacion_descuento_adicional: validatedData.descuento_adicional
            ? validatedData.descuento_adicional
            : null,
          negociacion_notas: validatedData.notas || null,
          negociacion_created_at: new Date(),
          event_duration: cotizacionOriginal.event_duration ?? null, // Heredar duración del evento de la cotización original
        },
      });

      // 2. Copiar items de la cotizaci?n original
      if (cotizacionOriginal.cotizacion_items.length > 0) {
        await tx.studio_cotizacion_items.createMany({
          data: cotizacionOriginal.cotizacion_items.map((item) => ({
            cotizacion_id: nuevaCotizacion.id,
            item_id: item.item_id,
            quantity: item.quantity,
            order: item.order,
            billing_type: item.billing_type, // Copiar billing_type del item
            // Priorizar snapshot del original; default 'servicio' solo si es nulo
            profit_type_snapshot: item.profit_type_snapshot ?? 'servicio',
            is_courtesy: validatedData.items_cortesia.includes(item.id),
          })),
        });
      }

      // 3. Crear condici?n comercial temporal si se proporcion?
      if (validatedData.condicion_comercial_temporal) {
        await tx.studio_condiciones_comerciales_negociacion.create({
          data: {
            cotizacion_id: nuevaCotizacion.id,
            promise_id: cotizacionOriginal.promise_id,
            studio_id: studio.id,
            name: validatedData.condicion_comercial_temporal.name,
            description:
              validatedData.condicion_comercial_temporal.description || null,
            discount_percentage:
              validatedData.condicion_comercial_temporal.discount_percentage ||
              null,
            advance_percentage:
              validatedData.condicion_comercial_temporal.advance_percentage ||
              null,
            advance_type:
              validatedData.condicion_comercial_temporal.advance_type || null,
            advance_amount:
              validatedData.condicion_comercial_temporal.advance_amount || null,
            metodo_pago_id:
              validatedData.condicion_comercial_temporal.metodo_pago_id || null,
            is_temporary: true,
          },
        });
      }

      // 4. Asignar condici?n comercial existente si se proporcion?
      if (validatedData.condicion_comercial_id) {
        await tx.studio_cotizaciones.update({
          where: { id: nuevaCotizacion.id },
          data: {
            condiciones_comerciales_id: validatedData.condicion_comercial_id,
          },
        });
      }

      return nuevaCotizacion;
    });

    // Calcular y guardar precios de los items (despu?s de la transacci?n)
    if (cotizacionOriginal.cotizacion_items.length > 0) {
      await calcularYGuardarPreciosCotizacion(
        nuevaVersion.id,
        validatedData.studio_slug
      ).catch((error) => {
        console.error(
          '[NEGOCIACION] Error calculando precios en versi?n negociada:',
          error
        );
      });
    }

    // Sincronizar pipeline stage de la promesa
    if (cotizacionOriginal.promise_id) {
      const { syncPromisePipelineStageFromQuotes } = await import('./promise-pipeline-sync.actions');
      await syncPromisePipelineStageFromQuotes(cotizacionOriginal.promise_id, studio.id, null).catch((error) => {
        console.error('[NEGOCIACION] Error sincronizando pipeline:', error);
      });
    }

    // Revalidar paths
    revalidatePath(
      `/${validatedData.studio_slug}/studio/commercial/promises/${cotizacionOriginal.promise_id}`
    );
    if (cotizacionOriginal.evento_id) {
      revalidatePath(
        `/${validatedData.studio_slug}/studio/business/events/${cotizacionOriginal.evento_id}`
      );
    }

    // DTO con ancla y delta: negociacion_precio_original ya guardado en nuevaVersion
    const ancla = nuevaVersion.negociacion_precio_original != null
      ? Number(nuevaVersion.negociacion_precio_original)
      : null;
    const precioFinalDto = nuevaVersion.price != null ? Number(nuevaVersion.price) : null;
    const delta = ancla != null && precioFinalDto != null ? ancla - precioFinalDto : null;

    return {
      success: true,
      data: {
        id: nuevaVersion.id,
        name: nuevaVersion.name,
        evento_id: cotizacionOriginal.evento_id ?? undefined,
        negociacion_precio_original: ancla ?? undefined,
        negociacion_precio_personalizado: precioFinalDto ?? undefined,
        delta: delta ?? undefined,
      },
    };
  } catch (error) {
    console.error('[NEGOCIACION] Error creando versi?n negociada:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al crear versi?n negociada',
    };
  }
}

/**
 * Aplicar cambios de negociaci?n a cotizaci?n existente
 * Actualiza la cotizaci?n actual con los cambios de negociaci?n
 */
export async function aplicarCambiosNegociacion(
  data: AplicarCambiosNegociacionData
): Promise<CotizacionResponse> {
  try {
    const validatedData = aplicarCambiosNegociacionSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener cotizaci?n (evento_id para revalidatePath; name para DTO)
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: validatedData.cotizacion_id,
        studio_id: studio.id,
      },
      select: {
        id: true,
        name: true,
        price: true,
        status: true,
        promise_id: true,
        evento_id: true,
        negociacion_created_at: true,
        negociacion_precio_original: true,
        cotizacion_items: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    if (!cotizacion.promise_id) {
      return { success: false, error: 'La cotizaci?n debe estar asociada a una promesa' };
    }

    // Validar que la cotizaci?n est? en estado pendiente o negociacion
    if (cotizacion.status !== 'pendiente' && cotizacion.status !== 'negociacion') {
      return {
        success: false,
        error: 'Solo se pueden aplicar cambios de negociaci?n a cotizaciones pendientes o en negociaci?n',
      };
    }

    // Calcular precio final
    let precioFinal = cotizacion.price;
    if (validatedData.precio_personalizado !== null && validatedData.precio_personalizado !== undefined) {
      precioFinal = validatedData.precio_personalizado;
    }

    // Transacci?n para aplicar cambios
    await prisma.$transaction(async (tx) => {
      // Preparar datos de actualización
      const updateData: any = {
        price: precioFinal, // Precio negociado (lo que pagará el cliente)
        status: 'negociacion', // Cambiar estado a negociaci?n al guardar
        selected_by_prospect: false, // IMPORTANTE: Asegurar que no est? autorizada por prospecto
        negociacion_precio_personalizado:
          validatedData.precio_personalizado ?? null,
        negociacion_descuento_adicional:
          validatedData.descuento_adicional ?? null,
        negociacion_notas: validatedData.notas || null,
        // Actualizar condici?n comercial si se proporcion?
        condiciones_comerciales_id:
          validatedData.condicion_comercial_id || undefined,
      };

      // Actualizar visible_to_client si se proporciona
      if (validatedData.visible_to_client !== undefined) {
        updateData.visible_to_client = validatedData.visible_to_client;
      }

      // Solo establecer negociacion_created_at si no existe (primera vez que se guarda como negociación)
      if (!cotizacion.negociacion_created_at) {
        updateData.negociacion_created_at = new Date();
      }

      // Solo establecer negociacion_precio_original si no existe (preservar precio original)
      // Si ya existe, mantenerlo para que los cálculos siempre se hagan sobre el precio original
      if (!cotizacion.negociacion_precio_original) {
        // Si viene de 'pendiente', guardar el precio actual como original
        // Si ya está en 'negociacion', el precio original ya debería estar guardado
        updateData.negociacion_precio_original = cotizacion.price;
      }

      // 1. Actualizar cotizaci?n con campos de negociaci?n
      await tx.studio_cotizaciones.update({
        where: { id: validatedData.cotizacion_id },
        data: updateData,
      });

      // 2. Actualizar items marcados como cortes?a
      const itemsIds = cotizacion.cotizacion_items.map((item) => item.id);
      for (const itemId of itemsIds) {
        await tx.studio_cotizacion_items.update({
          where: { id: itemId },
          data: {
            is_courtesy: validatedData.items_cortesia.includes(itemId),
            // Si es cortes?a, establecer precio en 0
            unit_price: validatedData.items_cortesia.includes(itemId) ? 0 : undefined,
            subtotal: validatedData.items_cortesia.includes(itemId) ? 0 : undefined,
          },
        });
      }

      // 3. Eliminar condici?n comercial temporal existente si hay una
      await tx.studio_condiciones_comerciales_negociacion.deleteMany({
        where: {
          cotizacion_id: validatedData.cotizacion_id,
        },
      });

      // 4. Crear nueva condici?n comercial temporal si se proporcion?
      if (validatedData.condicion_comercial_temporal) {
        await tx.studio_condiciones_comerciales_negociacion.create({
          data: {
            cotizacion_id: validatedData.cotizacion_id,
            promise_id: cotizacion.promise_id,
            studio_id: studio.id,
            name: validatedData.condicion_comercial_temporal.name,
            description:
              validatedData.condicion_comercial_temporal.description || null,
            discount_percentage:
              validatedData.condicion_comercial_temporal.discount_percentage ||
              null,
            advance_percentage:
              validatedData.condicion_comercial_temporal.advance_percentage ||
              null,
            advance_type:
              validatedData.condicion_comercial_temporal.advance_type || null,
            advance_amount:
              validatedData.condicion_comercial_temporal.advance_amount || null,
            metodo_pago_id:
              validatedData.condicion_comercial_temporal.metodo_pago_id || null,
            is_temporary: true,
          },
        });
      }
    });

    // Sincronizar pipeline stage de la promesa
    if (cotizacion.promise_id) {
      const { syncPromisePipelineStageFromQuotes } = await import('./promise-pipeline-sync.actions');
      await syncPromisePipelineStageFromQuotes(cotizacion.promise_id, studio.id, null).catch((error) => {
        console.error('[NEGOCIACION] Error sincronizando pipeline:', error);
      });
    }

    // Recalcular precios despu?s de aplicar cambios
    await calcularYGuardarPreciosCotizacion(
      validatedData.cotizacion_id,
      validatedData.studio_slug
    ).catch((error) => {
      console.error(
        '[NEGOCIACION] Error recalculando precios despu?s de aplicar cambios:',
        error
      );
    });

    // Revalidar paths
    revalidatePath(
      `/${validatedData.studio_slug}/studio/commercial/promises/${cotizacion.promise_id}`
    );
    if (cotizacion.evento_id) {
      revalidatePath(
        `/${validatedData.studio_slug}/studio/business/events/${cotizacion.evento_id}`
      );
    }

    // Re-leer cotización para DTO con ancla y delta (valores ya persistidos)
    const actualizada = await prisma.studio_cotizaciones.findUnique({
      where: { id: validatedData.cotizacion_id },
      select: {
        negociacion_precio_original: true,
        price: true,
      },
    });
    const ancla = actualizada?.negociacion_precio_original != null
      ? Number(actualizada.negociacion_precio_original)
      : null;
    const precioFinalDto = actualizada?.price != null ? Number(actualizada.price) : null;
    const delta = ancla != null && precioFinalDto != null ? ancla - precioFinalDto : null;

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
        evento_id: cotizacion.evento_id ?? undefined,
        negociacion_precio_original: ancla ?? undefined,
        negociacion_precio_personalizado: precioFinalDto ?? undefined,
        delta: delta ?? undefined,
      },
    };
  } catch (error) {
    console.error('[NEGOCIACION] Error aplicando cambios:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al aplicar cambios de negociaci?n',
    };
  }
}
