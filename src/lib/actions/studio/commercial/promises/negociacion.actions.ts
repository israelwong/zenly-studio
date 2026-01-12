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
 * Cargar cotización completa para negociación
 * Retorna la cotización con todos sus items y datos necesarios para negociación
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
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Validar que la cotización esté en estado pendiente
    if (cotizacion.status !== 'pendiente') {
      return {
        success: false,
        error: 'Solo se pueden negociar cotizaciones en estado pendiente',
      };
    }

    // Mapear items al formato esperado
    const items: CotizacionItem[] = cotizacion.cotizacion_items
      .filter((item) => item.item_id !== null)
      .map((item) => ({
        id: item.id,
        item_id: item.item_id as string, // Ya filtrado, seguro que no es null
        quantity: item.quantity,
        unit_price: item.unit_price ?? 0,
        subtotal: item.subtotal ?? 0,
        cost: item.cost ?? null,
        expense: item.expense ?? null,
        name: item.name_snapshot || item.name || null,
        description: item.description_snapshot || item.description || null,
        category_name: item.category_name_snapshot || item.category_name || null,
        seccion_name: item.seccion_name_snapshot || item.seccion_name || null,
      }));

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
        description: cotizacion.description,
        price: cotizacion.price,
        status: cotizacion.status,
        items,
      },
    };
  } catch (error) {
    console.error('[NEGOCIACION] Error cargando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cargar cotización',
    };
  }
}

/**
 * Crear nueva cotización en negociación
 * Crea una nueva cotización independiente (no revisión) con status 'negociacion'
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

    // Obtener cotización original
    const cotizacionOriginal = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: validatedData.cotizacion_original_id,
        studio_id: studio.id,
      },
      include: {
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
          },
        },
      },
    });

    if (!cotizacionOriginal) {
      return { success: false, error: 'Cotización original no encontrada' };
    }

    if (!cotizacionOriginal.promise_id) {
      return { success: false, error: 'La cotización debe estar asociada a una promesa' };
    }

    // Validar que la cotización original esté en estado pendiente
    if (cotizacionOriginal.status !== 'pendiente') {
      return {
        success: false,
        error: 'Solo se pueden crear versiones negociadas de cotizaciones pendientes',
      };
    }

    // Calcular precio final
    const precioFinal =
      validatedData.precio_personalizado ?? cotizacionOriginal.price;

    // Obtener el order máximo para colocar la nueva cotización al final
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

    // Transacción para crear nueva cotización en negociación
    const nuevaVersion = await prisma.$transaction(async (tx) => {
      // 1. Crear nueva cotización con status 'negociacion' (no es revisión)
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
          status: 'negociacion', // Nueva cotización con status negociacion
          order: newOrder,
          // NO es revisión - no incluir revision_of_id, revision_number, revision_status
          // Campos de negociación
          negociacion_precio_personalizado: validatedData.precio_personalizado
            ? validatedData.precio_personalizado
            : null,
          negociacion_descuento_adicional: validatedData.descuento_adicional
            ? validatedData.descuento_adicional
            : null,
          negociacion_notas: validatedData.notas || null,
          negociacion_created_at: new Date(),
        },
      });

      // 2. Copiar items de la cotización original
      if (cotizacionOriginal.cotizacion_items.length > 0) {
        await tx.studio_cotizacion_items.createMany({
          data: cotizacionOriginal.cotizacion_items.map((item) => ({
            cotizacion_id: nuevaCotizacion.id,
            item_id: item.item_id,
            quantity: item.quantity,
            order: item.order,
            // Marcar items como cortesía si están en la lista
            is_courtesy: validatedData.items_cortesia.includes(item.id),
          })),
        });
      }

      // 3. Crear condición comercial temporal si se proporcionó
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

      // 4. Asignar condición comercial existente si se proporcionó
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

    // Calcular y guardar precios de los items (después de la transacción)
    if (cotizacionOriginal.cotizacion_items.length > 0) {
      await calcularYGuardarPreciosCotizacion(
        nuevaVersion.id,
        validatedData.studio_slug
      ).catch((error) => {
        console.error(
          '[NEGOCIACION] Error calculando precios en versión negociada:',
          error
        );
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

    return {
      success: true,
      data: {
        id: nuevaVersion.id,
        name: nuevaVersion.name,
        evento_id: cotizacionOriginal.evento_id || undefined,
      },
    };
  } catch (error) {
    console.error('[NEGOCIACION] Error creando versión negociada:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al crear versión negociada',
    };
  }
}

/**
 * Aplicar cambios de negociación a cotización existente
 * Actualiza la cotización actual con los cambios de negociación
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

    // Obtener cotización
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: validatedData.cotizacion_id,
        studio_id: studio.id,
      },
      include: {
        promise: {
          select: {
            id: true,
          },
        },
        cotizacion_items: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    if (!cotizacion.promise_id) {
      return { success: false, error: 'La cotización debe estar asociada a una promesa' };
    }

    // Validar que la cotización esté en estado pendiente
    if (cotizacion.status !== 'pendiente') {
      return {
        success: false,
        error: 'Solo se pueden aplicar cambios de negociación a cotizaciones pendientes',
      };
    }

    // Calcular precio final
    let precioFinal = cotizacion.price;
    if (validatedData.precio_personalizado !== null && validatedData.precio_personalizado !== undefined) {
      precioFinal = validatedData.precio_personalizado;
    }

    // Transacción para aplicar cambios
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar cotización con campos de negociación
      await tx.studio_cotizaciones.update({
        where: { id: validatedData.cotizacion_id },
        data: {
          price: precioFinal,
          status: 'negociacion', // Cambiar estado a negociación al guardar
          negociacion_precio_personalizado:
            validatedData.precio_personalizado ?? null,
          negociacion_descuento_adicional:
            validatedData.descuento_adicional ?? null,
          negociacion_notas: validatedData.notas || null,
          negociacion_created_at: new Date(),
          // Actualizar condición comercial si se proporcionó
          condiciones_comerciales_id:
            validatedData.condicion_comercial_id || undefined,
        },
      });

      // 2. Actualizar items marcados como cortesía
      const itemsIds = cotizacion.cotizacion_items.map((item) => item.id);
      for (const itemId of itemsIds) {
        await tx.studio_cotizacion_items.update({
          where: { id: itemId },
          data: {
            is_courtesy: validatedData.items_cortesia.includes(itemId),
            // Si es cortesía, establecer precio en 0
            unit_price: validatedData.items_cortesia.includes(itemId) ? 0 : undefined,
            subtotal: validatedData.items_cortesia.includes(itemId) ? 0 : undefined,
          },
        });
      }

      // 3. Eliminar condición comercial temporal existente si hay una
      await tx.studio_condiciones_comerciales_negociacion.deleteMany({
        where: {
          cotizacion_id: validatedData.cotizacion_id,
        },
      });

      // 4. Crear nueva condición comercial temporal si se proporcionó
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

    // Recalcular precios después de aplicar cambios
    await calcularYGuardarPreciosCotizacion(
      validatedData.cotizacion_id,
      validatedData.studio_slug
    ).catch((error) => {
      console.error(
        '[NEGOCIACION] Error recalculando precios después de aplicar cambios:',
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

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
        evento_id: cotizacion.evento_id || undefined,
      },
    };
  } catch (error) {
    console.error('[NEGOCIACION] Error aplicando cambios:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al aplicar cambios de negociación',
    };
  }
}
