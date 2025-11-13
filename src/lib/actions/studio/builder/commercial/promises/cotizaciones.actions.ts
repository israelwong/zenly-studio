'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  createCotizacionSchema,
  updateCotizacionSchema,
  autorizarCotizacionSchema,
  type CreateCotizacionData,
  type UpdateCotizacionData,
  type CotizacionResponse,
  type AutorizarCotizacionData,
} from '@/lib/actions/schemas/cotizaciones-schemas';

export interface CotizacionListItem {
  id: string;
  name: string;
  price: number;
  status: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  order: number | null;
  archived: boolean;
}

export interface CotizacionesListResponse {
  success: boolean;
  data?: CotizacionListItem[];
  error?: string;
}

export async function createCotizacion(
  data: CreateCotizacionData
): Promise<CotizacionResponse> {
  try {
    const validatedData = createCotizacionSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener o crear evento
    let eventoId: string;
    let eventTypeId: string;
    let contactId: string | null = validatedData.contact_id || null;
    let contact: { id: string; name: string; phone: string; email: string | null } | null = null;

    if (validatedData.promise_id) {
      // Si hay promise_id, obtener el promise y su evento asociado
      const promise = await prisma.studio_promises.findUnique({
        where: { id: validatedData.promise_id },
        include: {
          contact: true,
          event: true,
        },
      });

      if (!promise) {
        return { success: false, error: 'Promise no encontrada' };
      }

      contactId = promise.contact_id || validatedData.contact_id || null;
      contact = promise.contact;

      // Buscar evento existente asociado al promise
      let evento = await prisma.studio_events.findUnique({
        where: { promise_id: validatedData.promise_id },
      });

      if (!evento) {
        // Crear evento si no existe
        if (!contactId || !contact) {
          return { success: false, error: 'El promise no tiene contacto asociado' };
        }

        // Crear evento usando contact_id directamente
        evento = await prisma.studio_events.create({
          data: {
            studio_id: studio.id,
            contact_id: contactId,
            promise_id: validatedData.promise_id,
            event_type_id: promise.event_type_id || null,
            event_date: promise.defined_date || new Date(),
            name: 'Pendiente',
            status: 'active',
          },
        });
      }

      eventoId = evento.id;
      eventTypeId = evento.event_type_id || promise.event_type_id || '';

      if (!eventTypeId) {
        return { success: false, error: 'El evento no tiene tipo de evento asociado' };
      }
    } else {
      // Si no hay promise_id, necesitamos crear un evento básico
      // Por ahora, retornamos error ya que es requerido
      return {
        success: false,
        error: 'Se requiere un promise_id para crear la cotización',
      };
    }

    // Crear cotización
    const cotizacion = await prisma.studio_cotizaciones.create({
      data: {
        studio_id: studio.id,
        evento_id: eventoId,
        event_type_id: eventTypeId,
        promise_id: validatedData.promise_id || null,
        contact_id: contactId,
        name: validatedData.nombre,
        description: validatedData.descripcion || null,
        price: validatedData.precio,
        status: 'pendiente',
        visible_to_client: true,
      },
    });

    // Crear items de la cotización
    const itemsToCreate = Object.entries(validatedData.items)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity], index) => ({
        cotizacion_id: cotizacion.id,
        item_id: itemId,
        quantity,
        position: index,
      }));

    if (itemsToCreate.length > 0) {
      await prisma.studio_cotizacion_items.createMany({
        data: itemsToCreate,
      });
    }

    // Registrar log si hay promise_id
    if (validatedData.promise_id) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        validatedData.studio_slug,
        validatedData.promise_id,
        'quotation_created',
        'user', // Asumimos que es acción de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: cotizacion.name,
          price: cotizacion.price,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotización creada:', error);
      });
    }

    revalidatePath(`/${validatedData.studio_slug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error creando cotización:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Error al crear cotización' };
  }
}

/**
 * Obtener cotizaciones por promise_id
 */
export async function getCotizacionesByPromiseId(
  promiseId: string
): Promise<CotizacionesListResponse> {
  try {
    const cotizaciones = await prisma.studio_cotizaciones.findMany({
      where: {
        promise_id: promiseId,
      },
      select: {
        id: true,
        name: true,
        price: true,
        status: true,
        description: true,
        created_at: true,
        updated_at: true,
        order: true,
        archived: true,
      },
      orderBy: [
        { archived: 'asc' }, // No archivadas primero
        { order: 'asc' },
        { created_at: 'desc' },
      ],
    });

    return {
      success: true,
      data: cotizaciones.map((cot) => ({
        id: cot.id,
        name: cot.name,
        price: cot.price,
        status: cot.status,
        description: cot.description,
        created_at: cot.created_at,
        updated_at: cot.updated_at,
        order: cot.order,
        archived: cot.archived,
      })),
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error obteniendo cotizaciones:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener cotizaciones',
    };
  }
}

/**
 * Obtener cotización por ID con todos sus datos
 */
export async function getCotizacionById(
  cotizacionId: string,
  studioSlug: string
): Promise<{
  success: boolean;
  data?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    promise_id: string | null;
    contact_id: string | null;
    evento_id: string | null;
    items: Array<{
      item_id: string;
      quantity: number;
    }>;
  };
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
      include: {
        cotizacion_items: {
          select: {
            item_id: true,
            quantity: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
        description: cotizacion.description,
        price: cotizacion.price,
        status: cotizacion.status,
        promise_id: cotizacion.promise_id,
        contact_id: cotizacion.contact_id,
        evento_id: cotizacion.evento_id,
        items: cotizacion.cotizacion_items.map((item) => ({
          item_id: item.item_id,
          quantity: item.quantity,
        })),
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error obteniendo cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener cotización',
    };
  }
}

/**
 * Eliminar cotización
 */
export async function deleteCotizacion(
  cotizacionId: string,
  studioSlug: string
): Promise<CotizacionResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la cotización existe y pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Eliminar la cotización (los items se eliminan en cascade)
    await prisma.studio_cotizaciones.delete({
      where: { id: cotizacionId },
    });

    // Registrar log si hay promise_id
    if (cotizacion.promise_id) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        studioSlug,
        cotizacion.promise_id,
        'quotation_deleted',
        'user', // Asumimos que es acción de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: cotizacion.name,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotización eliminada:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: {
        id: cotizacionId,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error eliminando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar cotización',
    };
  }
}

/**
 * Archivar cotización
 */
export async function archiveCotizacion(
  cotizacionId: string,
  studioSlug: string
): Promise<CotizacionResponse> {
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
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    if (cotizacion.archived) {
      return { success: false, error: 'La cotización ya está archivada' };
    }

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { archived: true },
    });

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: {
        id: cotizacionId,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error archivando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al archivar cotización',
    };
  }
}

/**
 * Desarchivar cotización
 */
export async function unarchiveCotizacion(
  cotizacionId: string,
  studioSlug: string
): Promise<CotizacionResponse> {
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
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    if (!cotizacion.archived) {
      return { success: false, error: 'La cotización no está archivada' };
    }

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { archived: false },
    });

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: {
        id: cotizacionId,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error desarchivando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desarchivar cotización',
    };
  }
}

/**
 * Duplicar cotización
 * 
 * NOTA: Las etiquetas (tags) pertenecen a las promesas, no a las cotizaciones.
 * La cotización duplicada usa la misma promesa (promise_id), por lo que
 * comparte las mismas etiquetas de la promesa. No se copian etiquetas porque
 * no hay relación directa entre cotizaciones y etiquetas.
 */
export async function duplicateCotizacion(
  cotizacionId: string,
  studioSlug: string
): Promise<CotizacionResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener la cotización original con sus items
    const original = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
      include: {
        cotizacion_items: true,
      },
    });

    if (!original) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Obtener el order máximo para colocar la duplicada al final
    const maxOrder = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise_id: original.promise_id,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    });

    const newOrder = (maxOrder?.order ?? -1) + 1;

    // Generar nombre único para la cotización duplicada
    let newName = `${original.name} (Copia)`;
    let counter = 1;
    
    // Verificar si ya existe una cotización con ese nombre en la promise
    while (true) {
      const existing = await prisma.studio_cotizaciones.findFirst({
        where: {
          promise_id: original.promise_id,
          name: newName,
          archived: false,
        },
      });

      if (!existing) {
        break; // Nombre único encontrado
      }

      // Si existe, incrementar el contador
      counter++;
      newName = `${original.name} (Copia ${counter})`;
    }

    // Crear nueva cotización
    const nuevaCotizacion = await prisma.studio_cotizaciones.create({
      data: {
        studio_id: original.studio_id,
        evento_id: original.evento_id,
        event_type_id: original.event_type_id,
        promise_id: original.promise_id,
        contact_id: original.contact_id,
        name: newName,
        description: original.description,
        price: original.price,
        status: 'pendiente',
        visible_to_client: original.visible_to_client,
        condiciones_comerciales_id: original.condiciones_comerciales_id,
        archived: false,
        order: newOrder,
      },
    });

    // Duplicar items
    if (original.cotizacion_items.length > 0) {
      await prisma.studio_cotizacion_items.createMany({
        data: original.cotizacion_items.map((item) => ({
          cotizacion_id: nuevaCotizacion.id,
          item_id: item.item_id,
          service_category_id: item.service_category_id,
          quantity: item.quantity,
          position: item.position,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          name: item.name,
          description: item.description,
          cost: item.cost,
          expense: item.expense,
          profit: item.profit,
          public_price: item.public_price,
          profit_type: item.profit_type,
          category_name: item.category_name,
          seccion_name: item.seccion_name,
          is_custom: item.is_custom,
        })),
      });
    }

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    // Retornar la cotización completa para actualización optimista
    const cotizacionCompleta = await prisma.studio_cotizaciones.findUnique({
      where: { id: nuevaCotizacion.id },
      select: {
        id: true,
        name: true,
        price: true,
        status: true,
        description: true,
        created_at: true,
        updated_at: true,
        order: true,
        archived: true,
      },
    });

    return {
      success: true,
      data: {
        id: nuevaCotizacion.id,
        name: nuevaCotizacion.name,
        ...(cotizacionCompleta && {
          cotizacion: {
            id: cotizacionCompleta.id,
            name: cotizacionCompleta.name,
            price: cotizacionCompleta.price,
            status: cotizacionCompleta.status,
            description: cotizacionCompleta.description,
            created_at: cotizacionCompleta.created_at,
            updated_at: cotizacionCompleta.updated_at,
            order: cotizacionCompleta.order,
            archived: cotizacionCompleta.archived,
          },
        }),
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error duplicando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al duplicar cotización',
    };
  }
}

/**
 * Reordenar cotizaciones
 */
export async function reorderCotizaciones(
  studioSlug: string,
  cotizacionIds: string[]
): Promise<CotizacionResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    if (!cotizacionIds || cotizacionIds.length === 0) {
      return { success: false, error: 'No hay cotizaciones para reordenar' };
    }

    // Verificar que todas las cotizaciones existan y pertenezcan al studio
    const existingCotizaciones = await prisma.studio_cotizaciones.findMany({
      where: {
        id: { in: cotizacionIds },
        studio_id: studio.id,
      },
      select: { id: true },
    });

    if (existingCotizaciones.length !== cotizacionIds.length) {
      return { success: false, error: 'Algunas cotizaciones no fueron encontradas' };
    }

    // Actualizar el orden de cada cotización usando transacción
    await prisma.$transaction(
      cotizacionIds.map((id, index) =>
        prisma.studio_cotizaciones.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: {
        id: cotizacionIds[0] || '',
        name: 'Reordenado',
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error reordenando cotizaciones:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reordenar cotizaciones',
    };
  }
}

/**
 * Actualizar nombre de cotización
 */
export async function updateCotizacionName(
  cotizacionId: string,
  studioSlug: string,
  newName: string
): Promise<CotizacionResponse> {
  try {
    if (!newName.trim()) {
      return { success: false, error: 'El nombre no puede estar vacío' };
    }

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
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    const updated = await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { name: newName.trim() },
    });

    // Registrar log si hay promise_id
    if (cotizacion.promise_id) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        studioSlug,
        cotizacion.promise_id,
        'quotation_updated',
        'user', // Asumimos que es acción de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: updated.name,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotización actualizada:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error actualizando nombre:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar nombre',
    };
  }
}

/**
 * Actualizar cotización completa (nombre, descripción, precio, items)
 * Archiva automáticamente las otras cotizaciones de la promesa
 */
export async function updateCotizacion(
  data: UpdateCotizacionData
): Promise<CotizacionResponse> {
  try {
    const validatedData = updateCotizacionSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener cotización existente
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: validatedData.cotizacion_id,
        studio_id: studio.id,
      },
      include: {
        cotizacion_items: true,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // No permitir actualizar si está autorizada o aprobada
    if (cotizacion.status === 'autorizada' || cotizacion.status === 'aprobada') {
      return { success: false, error: 'No se puede actualizar una cotización autorizada o aprobada' };
    }

    // Obtener otras cotizaciones de la promesa para archivar
    const otrasCotizaciones = cotizacion.promise_id
      ? await prisma.studio_cotizaciones.findMany({
          where: {
            promise_id: cotizacion.promise_id,
            id: {
              not: validatedData.cotizacion_id,
            },
            archived: false,
          },
          select: {
            id: true,
          },
        })
      : [];

    // Transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar cotización
      await tx.studio_cotizaciones.update({
        where: { id: validatedData.cotizacion_id },
        data: {
          name: validatedData.nombre,
          description: validatedData.descripcion || null,
          price: validatedData.precio,
          updated_at: new Date(),
        },
      });

      // 2. Eliminar items existentes
      await tx.studio_cotizacion_items.deleteMany({
        where: {
          cotizacion_id: validatedData.cotizacion_id,
        },
      });

      // 3. Crear nuevos items
      const itemsToCreate = Object.entries(validatedData.items)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity], index) => ({
          cotizacion_id: validatedData.cotizacion_id,
          item_id: itemId,
          quantity,
          position: index,
        }));

      if (itemsToCreate.length > 0) {
        await tx.studio_cotizacion_items.createMany({
          data: itemsToCreate,
        });
      }

      // 4. Archivar las otras cotizaciones de la promesa
      if (otrasCotizaciones.length > 0) {
        await tx.studio_cotizaciones.updateMany({
          where: {
            id: {
              in: otrasCotizaciones.map((c) => c.id),
            },
          },
          data: {
            archived: true,
            updated_at: new Date(),
          },
        });
      }
    });

    // Obtener cotización actualizada
    const updated = await prisma.studio_cotizaciones.findUnique({
      where: { id: validatedData.cotizacion_id },
      select: {
        id: true,
        name: true,
        price: true,
        status: true,
        description: true,
        created_at: true,
        updated_at: true,
        order: true,
        archived: true,
      },
    });

    // Registrar log si hay promise_id
    if (cotizacion.promise_id && updated) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        validatedData.studio_slug,
        cotizacion.promise_id,
        'quotation_updated',
        'user',
        null,
        {
          quotationName: updated.name,
        }
      ).catch((error) => {
        console.error('[COTIZACIONES] Error registrando log:', error);
      });
    }

    revalidatePath(`/${validatedData.studio_slug}/studio/builder/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${validatedData.studio_slug}/studio/builder/commercial/promises/${cotizacion.promise_id}`);
    }

    return {
      success: true,
      data: {
        id: updated!.id,
        name: updated!.name,
        cotizacion: updated!,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error actualizando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar cotización',
    };
  }
}

/**
 * Autorizar cotización (simplificado - solo autoriza, no registra pagos)
 */
export async function autorizarCotizacion(
  data: AutorizarCotizacionData
): Promise<CotizacionResponse> {
  try {
    const validatedData = autorizarCotizacionSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener cotización con relaciones
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: validatedData.cotizacion_id,
        studio_id: studio.id,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
        promise: {
          select: {
            id: true,
            contact_id: true,
            event_type_id: true,
            event_location: true,
            defined_date: true,
            tentative_dates: true,
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        condiciones_comerciales: true,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    if (cotizacion.status === 'autorizada' || cotizacion.status === 'aprobada') {
      return { success: false, error: 'La cotización ya está autorizada' };
    }

    const contactId = cotizacion.contact_id || cotizacion.promise?.contact_id;
    if (!contactId) {
      return { success: false, error: 'La cotización no tiene contacto asociado' };
    }

    // Verificar si ya existe un evento asociado a esta cotización o promise
    // Buscar tanto eventos activos como cancelados para poder reactivarlos
    // Priorizar búsqueda por promise_id si existe, ya que es más específico
    const eventoExistente = await prisma.studio_events.findFirst({
      where: {
        studio_id: studio.id,
        OR: [
          // Buscar por cotizacion_id (puede estar en evento activo o cancelado)
          { cotizacion_id: validatedData.cotizacion_id },
          // Buscar por promise_id si existe (más específico)
          ...(validatedData.promise_id ? [{ promise_id: validatedData.promise_id }] : []),
        ],
      },
      select: {
        id: true,
        status: true,
      },
      orderBy: [
        // Priorizar eventos activos sobre cancelados
        { status: 'asc' },
        // Si hay múltiples, tomar el más reciente
        { updated_at: 'desc' },
      ],
    });

    // Obtener la primera etapa de eventos (Planeación) para asignar al evento
    const primeraEtapa = await prisma.studio_events_stage.findFirst({
      where: {
        studio_id: studio.id,
        is_active: true,
        slug: 'planeacion',
      },
      orderBy: {
        order: 'asc',
      },
    });

    if (!primeraEtapa) {
      return { success: false, error: 'No se encontró la etapa inicial de eventos' };
    }

    // Obtener fecha del evento: priorizar defined_date, luego primera fecha de tentative_dates
    let eventDate: Date = new Date();
    if (cotizacion.promise?.defined_date) {
      eventDate = cotizacion.promise.defined_date;
    } else if (cotizacion.promise?.tentative_dates) {
      const tentativeDates = cotizacion.promise.tentative_dates as string[] | null;
      if (tentativeDates && tentativeDates.length > 0) {
        // Tomar la primera fecha de interés
        const firstDate = new Date(tentativeDates[0]);
        if (!isNaN(firstDate.getTime())) {
          eventDate = firstDate;
        }
      }
    }

    // Determinar evento existente o crear uno nuevo
    let eventoId: string | null = null;
    
    if (eventoExistente) {
      // Actualizar evento existente (puede estar cancelado y necesitar reactivación)
      eventoId = eventoExistente.id;
      
      // Preparar datos de actualización (solo campos que pueden cambiar)
      const updateData: {
        cotizacion_id: string;
        event_stage_id: string;
        contract_value: number;
        pending_amount: number;
        event_date: Date;
        status: string;
        updated_at: Date;
        promise_id?: string | null;
      } = {
        cotizacion_id: validatedData.cotizacion_id,
        event_stage_id: primeraEtapa.id,
        contract_value: validatedData.monto,
        pending_amount: validatedData.monto,
        event_date: eventDate, // Usar fecha de interés
        status: 'active', // Reactivar si estaba cancelado
        updated_at: new Date(),
      };

      // Solo actualizar promise_id si viene y no causa conflicto
      if (validatedData.promise_id) {
        updateData.promise_id = validatedData.promise_id;
      }

      await prisma.studio_events.update({
        where: { id: eventoId },
        data: updateData,
      });
    } else {
      // Crear nuevo evento solo si no existe uno con el promise_id
      const eventTypeId = cotizacion.promise?.event_type_id || cotizacion.event_type_id || null;
      // La dirección se obtiene del contacto si está disponible
      const address = cotizacion.contact?.address || cotizacion.promise?.contact?.address || null;
      // El lugar del evento se obtiene de la promesa si está disponible
      const eventLocation = cotizacion.promise?.event_location || null;

      const nuevoEvento = await prisma.studio_events.create({
        data: {
          studio_id: studio.id,
          contact_id: contactId,
          promise_id: validatedData.promise_id || null,
          cotizacion_id: validatedData.cotizacion_id,
          event_type_id: eventTypeId,
          event_stage_id: primeraEtapa.id,
          name: cotizacion.name || 'Pendiente',
          event_date: eventDate,
          address: address,
          sede: eventLocation, // Usar sede para el lugar del evento
          status: 'active',
          contract_value: validatedData.monto,
          pending_amount: validatedData.monto,
        },
      });

      eventoId = nuevoEvento.id;
    }

    // Obtener etapa "aprobado" del pipeline de promises
    const etapaAprobado = validatedData.promise_id
      ? await prisma.studio_promise_pipeline_stages.findFirst({
          where: {
            studio_id: studio.id,
            slug: 'approved',
            is_active: true,
          },
        })
      : null;

    // Obtener todas las cotizaciones de la promesa para archivar las otras
    const otrasCotizaciones = validatedData.promise_id
      ? await prisma.studio_cotizaciones.findMany({
          where: {
            promise_id: validatedData.promise_id,
            id: {
              not: validatedData.cotizacion_id,
            },
            archived: false,
          },
          select: {
            id: true,
          },
        })
      : [];

    // Transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar cotización autorizada a "aprobada"
      const result = await tx.studio_cotizaciones.update({
        where: { id: validatedData.cotizacion_id },
        data: {
          status: 'aprobada' as const,
          condiciones_comerciales_id: validatedData.condiciones_comerciales_id,
          evento_id: eventoId,
          updated_at: new Date(),
          payment_promise_date: new Date(),
          payment_registered: false,
        },
      });

      // 2. Archivar las otras cotizaciones de la promesa (marcar como archivadas)
      if (otrasCotizaciones.length > 0) {
        await tx.studio_cotizaciones.updateMany({
          where: {
            id: {
              in: otrasCotizaciones.map((c) => c.id),
            },
          },
          data: {
            archived: true,
            updated_at: new Date(),
          },
        });
      }

      // 3. Cambiar etapa de la promesa a "aprobado"
      if (validatedData.promise_id && etapaAprobado) {
        await tx.studio_promises.update({
          where: { id: validatedData.promise_id },
          data: {
            pipeline_stage_id: etapaAprobado.id,
            updated_at: new Date(),
          },
        });

        // 4. Eliminar etiqueta "Cancelada" si existe
        const tagCancelada = await tx.studio_promise_tags.findUnique({
          where: {
            studio_id_slug: {
              studio_id: studio.id,
              slug: 'cancelada',
            },
          },
        });

        if (tagCancelada) {
          const relacionCancelada = await tx.studio_promises_tags.findFirst({
            where: {
              promise_id: validatedData.promise_id,
              tag_id: tagCancelada.id,
            },
          });

          if (relacionCancelada) {
            await tx.studio_promises_tags.delete({
              where: { id: relacionCancelada.id },
            });
          }
        }
      }

      // 5. Convertir agendamiento de promesa a agendamiento de evento
      if (eventoId && validatedData.promise_id) {
        // Obtener el evento con su fecha
        const evento = await tx.studio_events.findUnique({
          where: { id: eventoId },
          select: {
            event_date: true,
            name: true,
            address: true,
          },
        });

        if (evento && evento.event_date) {
          // Obtener TODOS los agendamientos asociados a la promesa
          const agendamientosPromesa = await tx.studio_agenda.findMany({
            where: {
              promise_id: validatedData.promise_id,
              studio_id: studio.id,
            },
            orderBy: {
              created_at: 'desc',
            },
          });

          // Verificar si ya existe un agendamiento para este evento
          const agendamientoEventoExistente = await tx.studio_agenda.findFirst({
            where: {
              evento_id: eventoId,
            },
          });

          // Identificar el agendamiento principal a convertir (el primero o el que tenga fecha definida)
          const agendamientoPrincipal = agendamientosPromesa.find(
            (a) => a.date !== null
          ) || agendamientosPromesa[0];

          if (agendamientoPrincipal) {
            // Convertir el agendamiento principal de promesa a evento
            await tx.studio_agenda.update({
              where: { id: agendamientoPrincipal.id },
              data: {
                promise_id: null,
                evento_id: eventoId,
                contexto: 'evento',
                agenda_tipo: 'evento',
                date: evento.event_date,
                concept: evento.name || 'Fecha del evento',
                description: evento.address || null,
                address: evento.address || null,
                updated_at: new Date(),
              },
            });

            // Eliminar TODOS los demás agendamientos de la promesa (fechas de interés adicionales)
            if (agendamientosPromesa.length > 1) {
              await tx.studio_agenda.deleteMany({
                where: {
                  promise_id: validatedData.promise_id,
                  studio_id: studio.id,
                  id: {
                    not: agendamientoPrincipal.id,
                  },
                },
              });
            }
          } else if (!agendamientoEventoExistente) {
            // Si no hay agendamiento de promesa, crear uno nuevo para el evento
            await tx.studio_agenda.create({
              data: {
                studio_id: studio.id,
                evento_id: eventoId,
                contexto: 'evento',
                date: evento.event_date,
                concept: evento.name || 'Fecha del evento',
                description: evento.address || null,
                address: evento.address || null,
                status: 'pendiente',
                agenda_tipo: 'evento',
              },
            });
          } else {
            // Si ya existe agendamiento del evento, solo actualizar con la fecha del evento
            await tx.studio_agenda.update({
              where: { id: agendamientoEventoExistente.id },
              data: {
                date: evento.event_date,
                concept: evento.name || 'Fecha del evento',
                description: evento.address || null,
                address: evento.address || null,
                updated_at: new Date(),
              },
            });
          }

          // Asegurar que se eliminen TODOS los agendamientos restantes de la promesa
          // (por si acaso quedó alguno después de la conversión)
          await tx.studio_agenda.deleteMany({
            where: {
              promise_id: validatedData.promise_id,
              studio_id: studio.id,
            },
          });
        }
      } else if (eventoId) {
        // Si no hay promise_id pero sí eventoId, solo crear/actualizar agendamiento del evento
        const evento = await tx.studio_events.findUnique({
          where: { id: eventoId },
          select: {
            event_date: true,
            name: true,
            address: true,
          },
        });

        if (evento && evento.event_date) {
          const agendamientoExistente = await tx.studio_agenda.findFirst({
            where: {
              evento_id: eventoId,
            },
          });

          if (!agendamientoExistente) {
            await tx.studio_agenda.create({
              data: {
                studio_id: studio.id,
                evento_id: eventoId,
                contexto: 'evento',
                date: evento.event_date,
                concept: evento.name || 'Fecha del evento',
                description: evento.address || null,
                address: evento.address || null,
                status: 'pendiente',
                agenda_tipo: 'evento',
              },
            });
          } else {
            await tx.studio_agenda.update({
              where: { id: agendamientoExistente.id },
              data: {
                date: evento.event_date,
                concept: evento.name || 'Fecha del evento',
                description: evento.address || null,
                address: evento.address || null,
                updated_at: new Date(),
              },
            });
          }
        }
      }
    });

    // Obtener la cotización actualizada para el log
    const result = await prisma.studio_cotizaciones.findUnique({
      where: { id: validatedData.cotizacion_id },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    // Registrar log en promise si existe
    if (validatedData.promise_id && result) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        validatedData.studio_slug,
        validatedData.promise_id,
        'quotation_authorized',
        'user',
        null,
        {
          quotationName: result.name,
          amount: validatedData.monto,
          eventId: eventoId,
        }
      ).catch((error) => {
        console.error('[AUTORIZACION] Error registrando log:', error);
      });
    }

    revalidatePath(`/${validatedData.studio_slug}/studio/builder/commercial/promises`);
    revalidatePath(`/${validatedData.studio_slug}/studio/builder/commercial/promises/${validatedData.promise_id}`);
    revalidatePath(`/${validatedData.studio_slug}/studio/builder/business/events`);
    revalidatePath(`/${validatedData.studio_slug}/studio/dashboard/agenda`); // Revalidar calendario
    if (eventoId) {
      revalidatePath(`/${validatedData.studio_slug}/studio/builder/business/events/${eventoId}`);
    }

    return {
      success: true,
      data: {
        id: result.id,
        name: result.name,
        evento_id: eventoId || undefined,
      },
    };
  } catch (error) {
    console.error('[AUTORIZACION] Error autorizando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al autorizar cotización',
    };
  }
}

