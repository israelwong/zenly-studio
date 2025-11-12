'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  createCotizacionSchema,
  autorizarCotizacionSchema,
  type CreateCotizacionData,
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
        contact: true,
        promise: {
          include: {
            contact: true,
          },
        },
        eventos: true,
        condiciones_comerciales: true,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    if (cotizacion.status === 'autorizada') {
      return { success: false, error: 'La cotización ya está autorizada' };
    }

    const contactId = cotizacion.contact_id || cotizacion.promise?.contact_id;
    if (!contactId) {
      return { success: false, error: 'La cotización no tiene contacto asociado' };
    }

    // Determinar evento existente o datos para crear uno nuevo
    let eventoId: string | null = null;
    const eventoExistente = cotizacion.eventos?.[0];
    
    if (eventoExistente) {
      eventoId = eventoExistente.id;
    } else {
      // Datos para crear evento nuevo (se implementará después)
      const eventTypeId = cotizacion.promise?.event_type_id || null;
      const eventDate = cotizacion.promise?.defined_date || new Date();
      const clienteId = cotizacion.promise?.contact?.id || null;

      console.log('[AUTORIZACION] Datos para crear/actualizar evento:', {
        studio_id: studio.id,
        promise_id: validatedData.promise_id,
        event_type_id: eventTypeId,
        event_date: eventDate,
        cliente_id: clienteId,
        contact_id: contactId,
        name: cotizacion.name || 'Pendiente',
        address: cotizacion.promise?.address || null,
        status: 'active',
      });
    }

    // Datos a actualizar en cotización
    const updateData = {
      status: 'autorizada' as const,
      condiciones_comerciales_id: validatedData.condiciones_comerciales_id,
      updated_at: new Date(),
      payment_promise_date: new Date(), // Por defecto es promesa de pago
      payment_registered: false,
    };

    console.log('[AUTORIZACION] Datos a actualizar en cotización:', {
      cotizacion_id: validatedData.cotizacion_id,
      updateData,
      monto: validatedData.monto,
      condiciones_comerciales: cotizacion.condiciones_comerciales?.name,
    });

    // Datos para actualizar promise (si existe)
    if (validatedData.promise_id) {
      console.log('[AUTORIZACION] Datos para actualizar promise:', {
        promise_id: validatedData.promise_id,
        // Se podría actualizar el stage_id aquí si es necesario
      });
    }

    // Por ahora solo actualizamos la cotización (el CRUD completo se implementará después)
    const result = await prisma.studio_cotizaciones.update({
      where: { id: validatedData.cotizacion_id },
      data: updateData,
    });

    // Registrar log en promise si existe
    if (validatedData.promise_id) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        validatedData.studio_slug,
        validatedData.promise_id,
        'quotation_authorized_promise',
        'user',
        null,
        {
          quotationName: result.name,
          amount: validatedData.monto,
        }
      ).catch((error) => {
        console.error('[AUTORIZACION] Error registrando log:', error);
      });
    }

    revalidatePath(`/${validatedData.studio_slug}/studio/builder/commercial/promises`);
    revalidatePath(`/${validatedData.studio_slug}/studio/builder/commercial/promises/${validatedData.promise_id}`);

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

