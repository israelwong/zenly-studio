'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  createCotizacionSchema,
  updateCotizacionSchema,
  autorizarCotizacionSchema,
  crearRevisionCotizacionSchema,
  autorizarRevisionCotizacionSchema,
  type CreateCotizacionData,
  type UpdateCotizacionData,
  type CotizacionResponse,
  type AutorizarCotizacionData,
  type CrearRevisionCotizacionData,
  type AutorizarRevisionCotizacionData,
} from '@/lib/actions/schemas/cotizaciones-schemas';
import { guardarEstructuraCotizacionAutorizada, calcularYGuardarPreciosCotizacion } from './cotizacion-pricing';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { COTIZACION_ITEMS_SELECT_STANDARD } from './cotizacion-structure.utils';

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
  revision_of_id?: string | null;
  revision_number?: number | null;
  revision_status?: string | null;
  selected_by_prospect?: boolean;
  selected_at?: Date | null;
  discount?: number | null;
  evento_id?: string | null;
  condiciones_comerciales_id?: string | null;
  condiciones_comerciales?: {
    id: string;
    name: string;
    discount_percentage: number | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
  } | null;
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
            status: 'ACTIVE',
          },
        });
      }

      eventoId = evento.id;
      eventTypeId = evento.event_type_id || promise.event_type_id || '';

      if (!eventTypeId) {
        return { success: false, error: 'El evento no tiene tipo de evento asociado' };
      }
    } else {
      // Si no hay promise_id, necesitamos crear un evento b?sico
      // Por ahora, retornamos error ya que es requerido
      return {
        success: false,
        error: 'Se requiere un promise_id para crear la cotizaci?n',
      };
    }

    // Crear cotizaci?n
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

    // Crear items de la cotizaci?n
    const itemsToCreate = Object.entries(validatedData.items)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity], index) => ({
        cotizacion_id: cotizacion.id,
        item_id: itemId,
        quantity,
        order: index,
      }));

    if (itemsToCreate.length > 0) {
      await prisma.studio_cotizacion_items.createMany({
        data: itemsToCreate,
      });

      // Calcular y guardar precios de los items (despu?s de crear los items)
      await calcularYGuardarPreciosCotizacion(cotizacion.id, validatedData.studio_slug).catch((error) => {
        console.error('[COTIZACIONES] Error calculando precios en creaci?n:', error);
        // No fallar la creaci?n si el c?lculo de precios falla
      });
    }

    // Registrar log si hay promise_id
    if (validatedData.promise_id) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        validatedData.studio_slug,
        validatedData.promise_id,
        'quotation_created',
        'user', // Asumimos que es acci?n de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: cotizacion.name,
          price: cotizacion.price,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotizaci?n creada:', error);
      });
    }

    revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises`);

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error creando cotizaci?n:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Error al crear cotizaci?n' };
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
        revision_of_id: true,
        revision_number: true,
        revision_status: true,
        selected_by_prospect: true,
        selected_at: true,
        discount: true,
        evento_id: true,
        condiciones_comerciales_id: true,
        condiciones_comerciales: {
          select: {
            id: true,
            name: true,
            discount_percentage: true,
            advance_percentage: true,
            advance_type: true,
            advance_amount: true,
          },
        },
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
        revision_of_id: cot.revision_of_id,
        revision_number: cot.revision_number,
        revision_status: cot.revision_status,
        selected_by_prospect: cot.selected_by_prospect,
        selected_at: cot.selected_at,
        discount: cot.discount,
        evento_id: cot.evento_id,
        condiciones_comerciales_id: cot.condiciones_comerciales_id,
        condiciones_comerciales: cot.condiciones_comerciales,
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
 * Obtener cotizaci?n por ID con todos sus datos
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
    revision_of_id?: string | null;
    revision_number?: number | null;
    revision_status?: string | null;
    condiciones_comerciales_id?: string | null;
    condiciones_comerciales_metodo_pago_id?: string | null;
    selected_by_prospect?: boolean;
    selected_at?: Date | null;
    items: Array<{
      item_id: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      cost: number;
      expense: number;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
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
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        status: true,
        promise_id: true,
        contact_id: true,
        evento_id: true,
        revision_of_id: true,
        revision_number: true,
        revision_status: true,
        condiciones_comerciales_id: true,
        condiciones_comerciales_metodo_pago_id: true,
        selected_by_prospect: true,
        selected_at: true,
        cotizacion_items: {
          select: {
            ...COTIZACION_ITEMS_SELECT_STANDARD,
            cost: true,
            expense: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    // Los items ya vienen ordenados por order: "asc" desde la consulta
    // Usar snapshots primero, luego campos operacionales como fallback
    const itemsOrdenados = cotizacion.cotizacion_items
      .filter((item) => item.item_id !== null)
      .map((item) => ({
        item_id: item.item_id!,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        cost: item.cost ?? 0,
        expense: item.expense ?? 0,
        // Usar snapshots primero, luego campos operacionales
        name: item.name_snapshot || item.name,
        description: item.description_snapshot || item.description,
        category_name: item.category_name_snapshot || item.category_name,
        seccion_name: item.seccion_name_snapshot || item.seccion_name,
      }));

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
        revision_of_id: cotizacion.revision_of_id,
        revision_number: cotizacion.revision_number,
        revision_status: cotizacion.revision_status,
        condiciones_comerciales_id: cotizacion.condiciones_comerciales_id,
        condiciones_comerciales_metodo_pago_id: cotizacion.condiciones_comerciales_metodo_pago_id,
        selected_by_prospect: cotizacion.selected_by_prospect,
        selected_at: cotizacion.selected_at,
        items: itemsOrdenados,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error obteniendo cotizaci?n:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener cotizaci?n',
    };
  }
}

/**
 * Eliminar cotizaci?n
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

    // Verificar que la cotizaci?n existe y pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    // Eliminar la cotizaci?n (los items se eliminan en cascade)
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
        'user', // Asumimos que es acci?n de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: cotizacion.name,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotizaci?n eliminada:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: {
        id: cotizacionId,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error eliminando cotizaci?n:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar cotizaci?n',
    };
  }
}

/**
 * Archivar cotizaci?n
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
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    if (cotizacion.archived) {
      return { success: false, error: 'La cotizaci?n ya est? archivada' };
    }

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { archived: true },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: {
        id: cotizacionId,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error archivando cotizaci?n:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al archivar cotizaci?n',
    };
  }
}

/**
 * Desarchivar cotizaci?n
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
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    if (!cotizacion.archived) {
      return { success: false, error: 'La cotizaci?n no est? archivada' };
    }

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { archived: false },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: {
        id: cotizacionId,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error desarchivando cotizaci?n:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desarchivar cotizaci?n',
    };
  }
}

/**
 * Duplicar cotizaci?n
 * 
 * NOTA: Las etiquetas (tags) pertenecen a las promesas, no a las cotizaciones.
 * La cotizaci?n duplicada usa la misma promesa (promise_id), por lo que
 * comparte las mismas etiquetas de la promesa. No se copian etiquetas porque
 * no hay relaci?n directa entre cotizaciones y etiquetas.
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

    // Obtener la cotizaci?n original con sus items
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
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    // Obtener el order m?ximo para colocar la duplicada al final
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

    // Generar nombre ?nico para la cotizaci?n duplicada
    let newName = `${original.name} (Copia)`;
    let counter = 1;

    // Verificar si ya existe una cotizaci?n con ese nombre en la promise
    while (true) {
      const existing = await prisma.studio_cotizaciones.findFirst({
        where: {
          promise_id: original.promise_id,
          name: newName,
          archived: false,
        },
      });

      if (!existing) {
        break; // Nombre ?nico encontrado
      }

      // Si existe, incrementar el contador
      counter++;
      newName = `${original.name} (Copia ${counter})`;
    }

    // Crear nueva cotizaci?n
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

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    // Retornar la cotizaci?n completa para actualizaci?n optimista
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
        revision_of_id: true,
        revision_number: true,
        revision_status: true,
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
    console.error('[COTIZACIONES] Error duplicando cotizaci?n:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al duplicar cotizaci?n',
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

    // Actualizar el orden de cada cotizaci?n usando transacci?n
    await prisma.$transaction(
      cotizacionIds.map((id, index) =>
        prisma.studio_cotizaciones.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

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
 * Actualizar nombre de cotizaci?n
 */
export async function updateCotizacionName(
  cotizacionId: string,
  studioSlug: string,
  newName: string
): Promise<CotizacionResponse> {
  try {
    if (!newName.trim()) {
      return { success: false, error: 'El nombre no puede estar vac?o' };
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
      return { success: false, error: 'Cotizaci?n no encontrada' };
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
        'user', // Asumimos que es acci?n de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: updated.name,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotizaci?n actualizada:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

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
 * Actualizar cotizaci?n completa (nombre, descripci?n, precio, items)
 * IMPORTANTE: NO archiva otras cotizaciones - solo actualiza la cotizaci?n actual
 * El archivado de otras cotizaciones solo ocurre cuando se autoriza una cotizaci?n
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

    // Obtener cotizaci?n existente
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
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    // No permitir actualizar si est? autorizada o aprobada
    if (cotizacion.status === 'autorizada' || cotizacion.status === 'aprobada') {
      return { success: false, error: 'No se puede actualizar una cotizaci?n autorizada o aprobada' };
    }

    // Preparar items antes de la transacci?n
    const itemsToCreate = Object.entries(validatedData.items)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity], index) => ({
        cotizacion_id: validatedData.cotizacion_id,
        item_id: itemId,
        quantity,
        order: index,
      }));

    // Transacci?n para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar cotizaci?n
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
      if (itemsToCreate.length > 0) {
        await tx.studio_cotizacion_items.createMany({
          data: itemsToCreate,
        });
      }

      // NOTA: No archivamos otras cotizaciones aqu?
      // El archivado solo ocurre cuando se autoriza una cotizaci?n (en autorizarCotizacion)
    });

    // Calcular y guardar precios de los items (despu?s de la transacci?n)
    if (itemsToCreate.length > 0) {
      await calcularYGuardarPreciosCotizacion(validatedData.cotizacion_id, validatedData.studio_slug).catch((error) => {
        console.error('[COTIZACIONES] Error calculando precios:', error);
        // No fallar la actualizaci?n si el c?lculo de precios falla
      });
    }

    // Obtener cotizaci?n actualizada
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
        revision_of_id: true,
        revision_number: true,
        revision_status: true,
        selected_by_prospect: true,
        selected_at: true,
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

    revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises/${cotizacion.promise_id}`);
      // Revalidar ruta de revisi?n si es una revisi?n
      if (cotizacion.revision_of_id) {
        revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises/${cotizacion.promise_id}/cotizacion/${validatedData.cotizacion_id}/revision`);
      }
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
    console.error('[COTIZACIONES] Error actualizando cotizaci?n:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar cotizaci?n',
    };
  }
}

/**
 * Autorizar cotización (NUEVO FLUJO - NO crea evento, solo cambia estado)
 * 
 * CAMBIO IMPORTANTE: Ahora solo marca la cotización como "contract_pending"
 * El evento se creará DESPUÉS de que el cliente firme el contrato
 * 
 * Flujo:
 * 1. Validar cotización y promesa
 * 2. Cambiar status a "contract_pending" 
 * 3. Mover promesa a etapa "approved"
 * 4. El cliente debe confirmar datos y firmar contrato
 * 5. El studio autoriza evento manualmente después de firma
 */
export async function autorizarCotizacion(
  data: AutorizarCotizacionData
): Promise<CotizacionResponse> {
  try {
    const validatedData = autorizarCotizacionSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { 
        id: true,
        config: {
          select: {
            require_contract_before_event: true,
          }
        }
      },
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
            event_date: true,
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

    if (cotizacion.status === 'contract_pending' || cotizacion.status === 'contract_generated' || cotizacion.status === 'contract_signed') {
      return { success: false, error: 'La cotización ya está en proceso de contrato' };
    }

    const contactId = cotizacion.contact_id || cotizacion.promise?.contact_id;
    if (!contactId) {
      return { success: false, error: 'La cotización no tiene contacto asociado' };
    }

    // Validación: event_date debe existir antes de autorizar
    if (!cotizacion.promise?.event_date) {
      return {
        success: false,
        error: 'Debes confirmar la fecha del evento antes de autorizar la cotización. Ve a la promesa y define la fecha del evento.'
      };
    }

    // promise_id es requerido
    if (!validatedData.promise_id) {
      return {
        success: false,
        error: 'Se requiere una promesa para autorizar la cotización',
      };
    }

    // Verificar si ya existe un evento (para casos legacy o importación)
    const eventoExistente = await prisma.studio_events.findFirst({
      where: {
        studio_id: studio.id,
        OR: [
          { cotizacion_id: validatedData.cotizacion_id },
          { promise_id: validatedData.promise_id },
        ],
      },
      select: {
        id: true,
      },
    });

    let eventoId: string | null = eventoExistente?.id || null;

    // Obtener etapa "aprobado" del pipeline de promises
    const etapaAprobado = await prisma.studio_promise_pipeline_stages.findFirst({
      where: {
        studio_id: studio.id,
        slug: 'approved',
        is_active: true,
      },
    });

    if (!etapaAprobado) {
      return { success: false, error: 'No se encontró la etapa de aprobación en el pipeline de promesas' };
    }

    // Transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar cotización a "contract_pending" (NO crear evento todavía)
      await tx.studio_cotizaciones.update({
        where: { id: validatedData.cotizacion_id },
        data: {
          status: 'contract_pending', // Nuevo estado: esperando contrato
          condiciones_comerciales_id: validatedData.condiciones_comerciales_id,
          updated_at: new Date(),
          // NO asignar evento_id todavía
        },
      });

      // 2. Archivar otras cotizaciones de la misma promesa
      const otrasCotizaciones = await tx.studio_cotizaciones.findMany({
        where: {
          promise_id: validatedData.promise_id,
          id: { not: validatedData.cotizacion_id },
          archived: false,
          status: { not: 'cancelada' },
        },
        select: { id: true },
      });

      if (otrasCotizaciones.length > 0) {
        await tx.studio_cotizaciones.updateMany({
          where: {
            id: { in: otrasCotizaciones.map((c) => c.id) },
          },
          data: {
            archived: true,
            updated_at: new Date(),
          },
        });
        console.log(`[AUTORIZACION] ${otrasCotizaciones.length} cotizaciones archivadas automáticamente.`);
      }

      // 3. Mover promesa a etapa "approved"
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
    });

    // Obtener la cotización actualizada
    const cotizacionActualizada = await prisma.studio_cotizaciones.findUnique({
      where: { id: validatedData.cotizacion_id },
      select: {
        id: true,
        name: true,
        status: true,
        evento_id: true,
      },
    });

    const eventoIdFinal = eventoId;

    // Registrar log en promise
    if (cotizacionActualizada) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        validatedData.studio_slug,
        validatedData.promise_id,
        'quotation_authorized',
        'user',
        null,
        {
          quotationName: cotizacionActualizada.name,
          amount: validatedData.monto,
          status: 'contract_pending',
        }
      ).catch((error) => {
        console.error('[AUTORIZACION] Error registrando log:', error);
      });
    }

    // Revalidar rutas
    revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises`);
    revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises/${validatedData.promise_id}`);

    return {
      success: true,
      data: {
        id: cotizacionActualizada?.id || validatedData.cotizacion_id,
        name: cotizacionActualizada?.name || '',
        evento_id: eventoIdFinal || undefined,
      },
    };
  } catch (error) {
    console.error('[AUTORIZACION] Error autorizando cotizaci?n:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al autorizar cotizaci?n',
    };
  }
}

/**
 * Cancela solo una cotizaci?n autorizada/aprobada
 * - Cambia status a "cancelada"
 * - Libera evento_id si existe
 */
export async function cancelarCotizacion(
  studioSlug: string,
  cotizacionId: string
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
        promise: {
          studio_id: studio.id,
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    // Solo se pueden cancelar cotizaciones autorizadas o aprobadas
    if (cotizacion.status !== 'aprobada' && cotizacion.status !== 'autorizada') {
      return { success: false, error: 'Solo se pueden cancelar cotizaciones autorizadas o aprobadas' };
    }

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: {
        status: 'cancelada',
        evento_id: null, // Liberar relaci?n con evento
        discount: null, // Limpiar descuento al cancelar
        updated_at: new Date(),
      },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
    }

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error cancelando cotizaci?n:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar cotizaci?n',
    };
  }
}

/**
 * Cancela una cotizaci?n y elimina el evento asociado
 * - Cancela la cotizaci?n
 * - Elimina el evento si existe y no tiene otras cotizaciones autorizadas
 */
export async function cancelarCotizacionYEvento(
  studioSlug: string,
  cotizacionId: string
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
        promise: {
          studio_id: studio.id,
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotizaci?n no encontrada' };
    }

    // Solo se pueden cancelar cotizaciones autorizadas o aprobadas
    if (cotizacion.status !== 'aprobada' && cotizacion.status !== 'autorizada') {
      return { success: false, error: 'Solo se pueden cancelar cotizaciones autorizadas o aprobadas' };
    }

    const eventoId = cotizacion.evento_id;

    await prisma.$transaction(async (tx) => {
      // 1. Cancelar cotizaci?n
      await tx.studio_cotizaciones.update({
        where: { id: cotizacionId },
        data: {
          status: 'cancelada',
          evento_id: null,
          discount: null, // Limpiar descuento al cancelar
          updated_at: new Date(),
        },
      });

      // 2. Si hay evento asociado, verificar si tiene otras cotizaciones autorizadas
      if (eventoId) {
        const otrasCotizacionesAutorizadas = await tx.studio_cotizaciones.findFirst({
          where: {
            evento_id: eventoId,
            id: { not: cotizacionId },
            status: {
              in: ['aprobada', 'autorizada'],
            },
          },
        });

        // Solo eliminar evento si no tiene otras cotizaciones autorizadas
        if (!otrasCotizacionesAutorizadas) {
          // Verificar si hay nóminas pendientes asociadas al evento
          const nominasPendientes = await tx.studio_nominas.findMany({
            where: {
              evento_id: eventoId,
              status: 'pendiente',
            },
            include: {
              personal: {
                select: {
                  name: true,
                },
              },
            },
          });

          if (nominasPendientes.length > 0) {
            throw new Error(
              `No se puede eliminar el evento. Hay ${nominasPendientes.length} nómina(s) pendiente(s) asociada(s). Por favor, procesa o cancela las nóminas pendientes antes de eliminar el evento.`
            );
          }

          // Eliminar agendamiento asociado al evento
          await tx.studio_agenda.deleteMany({
            where: {
              evento_id: eventoId,
            },
          });

          // Eliminar evento
          await tx.studio_events.delete({
            where: { id: eventoId },
          });
        }
      }
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
    }
    if (eventoId) {
      revalidatePath(`/${studioSlug}/studio/business/events`);
      revalidatePath(`/${studioSlug}/studio/business/events/${eventoId}`);
    }
    revalidatePath(`/${studioSlug}/studio/dashboard/agenda`);

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error cancelando cotizaci?n y evento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar cotizaci?n y evento',
    };
  }
}

