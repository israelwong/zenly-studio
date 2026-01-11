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
  visible_to_client: boolean;
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

    // Obtener datos del promise (sin crear evento)
    // El evento solo se crea cuando se autoriza la cotización
    let eventTypeId: string;
    let contactId: string | null = validatedData.contact_id || null;

    if (validatedData.promise_id) {
      // Si hay promise_id, obtener el promise
      const promise = await prisma.studio_promises.findUnique({
        where: { id: validatedData.promise_id },
        include: {
          contact: true,
        },
      });

      if (!promise) {
        return { success: false, error: 'Promise no encontrada' };
      }

      contactId = promise.contact_id || validatedData.contact_id || null;
      eventTypeId = promise.event_type_id || '';

      if (!eventTypeId) {
        return { success: false, error: 'El promise no tiene tipo de evento asociado' };
      }
    } else {
      // Si no hay promise_id, retornamos error ya que es requerido
      return {
        success: false,
        error: 'Se requiere un promise_id para crear la cotización',
      };
    }

    // Crear cotización SIN evento (evento_id será null)
    // El evento se creará cuando se autorice la cotización
    const cotizacion = await prisma.studio_cotizaciones.create({
      data: {
        studio_id: studio.id,
        evento_id: null, // No crear evento al crear cotización
        event_type_id: eventTypeId,
        promise_id: validatedData.promise_id || null,
        contact_id: contactId,
        name: validatedData.nombre,
        description: validatedData.descripcion || null,
        price: validatedData.precio,
        status: 'pendiente',
        visible_to_client: validatedData.visible_to_client ?? true,
      },
    });

    // Crear items de la cotización
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

      // Calcular y guardar precios de los items (después de crear los items)
      await calcularYGuardarPreciosCotizacion(cotizacion.id, validatedData.studio_slug).catch((error) => {
        console.error('[COTIZACIONES] Error calculando precios en creación:', error);
        // No fallar la creación si el cálculo de precios falla
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

    revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises`);

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
        archived: false, // Excluir cotizaciones archivadas
        status: { not: 'archivada' }, // También excluir por status
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
        visible_to_client: true,
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
        visible_to_client: cot.visible_to_client,
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
      order: number;
      id: string;
      // Campos operacionales (para compatibilidad)
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      // Snapshots raw (para usar con función centralizada)
      name_snapshot?: string | null;
      description_snapshot?: string | null;
      category_name_snapshot?: string | null;
      seccion_name_snapshot?: string | null;
      // Campos operacionales raw (fallback)
      name_raw?: string | null;
      description_raw?: string | null;
      category_name_raw?: string | null;
      seccion_name_raw?: string | null;
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
        visible_to_client: true,
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
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Los items ya vienen ordenados por order: "asc" desde la consulta
    // Devolver items con snapshots para que componentes cliente puedan usar función centralizada
    const itemsOrdenados = cotizacion.cotizacion_items
      .filter((item) => item.item_id !== null)
      .map((item) => ({
        item_id: item.item_id!,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        cost: item.cost ?? 0,
        expense: item.expense ?? 0,
        order: item.order ?? 0,
        id: item.id,
        // Campos operacionales (para compatibilidad)
        name: item.name_snapshot || item.name,
        description: item.description_snapshot || item.description,
        category_name: item.category_name_snapshot || item.category_name,
        seccion_name: item.seccion_name_snapshot || item.seccion_name,
        // Snapshots raw (para usar con función centralizada)
        name_snapshot: item.name_snapshot,
        description_snapshot: item.description_snapshot,
        category_name_snapshot: item.category_name_snapshot,
        seccion_name_snapshot: item.seccion_name_snapshot,
        // Campos operacionales raw (fallback)
        name_raw: item.name,
        description_raw: item.description,
        category_name_raw: item.category_name,
        seccion_name_raw: item.seccion_name,
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
        visible_to_client: cotizacion.visible_to_client,
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

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

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

    if (cotizacion.status === 'archivada') {
      return { success: false, error: 'La cotización ya está archivada' };
    }

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { 
        status: 'archivada',
        archived: true, // Mantener compatibilidad con campo legacy
      },
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

    if (cotizacion.status !== 'archivada') {
      return { success: false, error: 'La cotización no está archivada' };
    }

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { 
        status: 'pendiente',
        archived: false, // Mantener compatibilidad con campo legacy
      },
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

    // Crear nueva cotización con snapshots copiados
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
        visible_to_client: false, // Duplicadas siempre ocultas inicialmente (studio las editará)
        condiciones_comerciales_id: original.condiciones_comerciales_id,
        archived: false,
        order: newOrder,
        // Snapshots de condiciones comerciales (copiar de original)
        condiciones_comerciales_name_snapshot: original.condiciones_comerciales_name_snapshot,
        condiciones_comerciales_description_snapshot: original.condiciones_comerciales_description_snapshot,
        condiciones_comerciales_advance_percentage_snapshot: original.condiciones_comerciales_advance_percentage_snapshot,
        condiciones_comerciales_advance_type_snapshot: original.condiciones_comerciales_advance_type_snapshot,
        condiciones_comerciales_advance_amount_snapshot: original.condiciones_comerciales_advance_amount_snapshot,
        condiciones_comerciales_discount_percentage_snapshot: original.condiciones_comerciales_discount_percentage_snapshot,
        // Snapshots de contrato (copiar de original)
        contract_template_id_snapshot: original.contract_template_id_snapshot,
        contract_template_name_snapshot: original.contract_template_name_snapshot,
        contract_content_snapshot: original.contract_content_snapshot,
        contract_version_snapshot: original.contract_version_snapshot,
        contract_signed_at_snapshot: original.contract_signed_at_snapshot,
        contract_signed_ip_snapshot: original.contract_signed_ip_snapshot,
      },
    });

    // Duplicar items con snapshots copiados
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
          // Campos operacionales (mutables)
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
          // Snapshots (inmutables - copiar de original)
          name_snapshot: item.name_snapshot,
          description_snapshot: item.description_snapshot,
          category_name_snapshot: item.category_name_snapshot,
          seccion_name_snapshot: item.seccion_name_snapshot,
          cost_snapshot: item.cost_snapshot,
          expense_snapshot: item.expense_snapshot,
          unit_price_snapshot: item.unit_price_snapshot,
          profit_snapshot: item.profit_snapshot,
          public_price_snapshot: item.public_price_snapshot,
          profit_type_snapshot: item.profit_type_snapshot,
        })),
      });

      // Recalcular precios y actualizar snapshots con datos actuales del catálogo
      // Esto asegura que los snapshots estén sincronizados con el catálogo actual
      await calcularYGuardarPreciosCotizacion(nuevaCotizacion.id, studioSlug).catch((error) => {
        console.error('[COTIZACIONES] Error calculando precios en duplicación:', error);
        // No fallar la duplicación si el cálculo de precios falla
      });
    }

    // Registrar log si hay promise_id
    if (original.promise_id) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        studioSlug,
        original.promise_id,
        'quotation_created',
        'user', // Asumimos que es acción de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: nuevaCotizacion.name,
          price: nuevaCotizacion.price,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotización duplicada:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

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
 * Toggle visibilidad de cotización para cliente
 */
export async function toggleCotizacionVisibility(
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

    const updated = await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { visible_to_client: !cotizacion.visible_to_client },
    });

    // Registrar log si hay promise_id
    if (cotizacion.promise_id) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        studioSlug,
        cotizacion.promise_id,
        'quotation_updated',
        'user',
        null,
        {
          quotationName: updated.name,
          visibleToClient: updated.visible_to_client,
        }
      ).catch((error) => {
        console.error('[COTIZACIONES] Error registrando log de visibilidad:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
    }

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error cambiando visibilidad:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cambiar visibilidad',
    };
  }
}

/**
 * Actualizar cotización completa (nombre, descripción, precio, items)
 * IMPORTANTE: NO archiva otras cotizaciones - solo actualiza la cotización actual
 * El archivado de otras cotizaciones solo ocurre cuando se autoriza una cotización
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

    // No permitir actualizar si est? autorizada o aprobada
    if (cotizacion.status === 'autorizada' || cotizacion.status === 'aprobada') {
      return { success: false, error: 'No se puede actualizar una cotización autorizada o aprobada' };
    }

    // Preparar items antes de la transacción
    const itemsToCreate = Object.entries(validatedData.items)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity], index) => ({
        cotizacion_id: validatedData.cotizacion_id,
        item_id: itemId,
        quantity,
        order: index,
      }));

    // Transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar cotización
      await tx.studio_cotizaciones.update({
        where: { id: validatedData.cotizacion_id },
        data: {
          name: validatedData.nombre,
          description: validatedData.descripcion || null,
          price: validatedData.precio,
          visible_to_client: validatedData.visible_to_client !== undefined ? validatedData.visible_to_client : undefined,
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
      // El archivado solo ocurre cuando se autoriza una cotización (en autorizarCotizacion)
    });

    // Calcular y guardar precios de los items (después de la transacción)
    if (itemsToCreate.length > 0) {
      await calcularYGuardarPreciosCotizacion(validatedData.cotizacion_id, validatedData.studio_slug).catch((error) => {
        console.error('[COTIZACIONES] Error calculando precios:', error);
        // No fallar la actualización si el cálculo de precios falla
      });
    }

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
      // Revalidar ruta de revisión si es una revisión
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
    console.error('[COTIZACIONES] Error actualizando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar cotización',
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
    console.error('[AUTORIZACION] Error autorizando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al autorizar cotización',
    };
  }
}

/**
 * Cancela solo una cotización autorizada/aprobada
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
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Solo se pueden cancelar cotizaciones autorizadas o aprobadas
    if (cotizacion.status !== 'aprobada' && cotizacion.status !== 'autorizada') {
      return { success: false, error: 'Solo se pueden cancelar cotizaciones autorizadas o aprobadas' };
    }

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: {
        status: 'cancelada',
        evento_id: null, // Liberar relación con evento
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
    console.error('[COTIZACIONES] Error cancelando cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar cotización',
    };
  }
}

/**
 * Cancela una cotización y elimina el evento asociado
 * - Cancela la cotización
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
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Solo se pueden cancelar cotizaciones autorizadas o aprobadas
    if (cotizacion.status !== 'aprobada' && cotizacion.status !== 'autorizada') {
      return { success: false, error: 'Solo se pueden cancelar cotizaciones autorizadas o aprobadas' };
    }

    const eventoId = cotizacion.evento_id;

    await prisma.$transaction(async (tx) => {
      // 1. Cancelar cotización
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
    // Agenda ahora es un sheet, no necesita revalidación de ruta

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error cancelando cotización y evento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar cotización y evento',
    };
  }
}

/**
 * Pasa una cotización al estado "en_cierre"
 * - Cambia el status a 'en_cierre'
 * - Archiva todas las demás cotizaciones pendientes de la misma promesa
 * - Solo puede haber una cotización en cierre a la vez por promesa
 */
export async function pasarACierre(
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
      include: {
        promise: true,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Verificar que la cotización esté pendiente
    if (cotizacion.status !== 'pendiente') {
      return { success: false, error: 'Solo se pueden pasar a cierre cotizaciones pendientes' };
    }

    // Verificar que no haya otra cotización en cierre en la misma promesa
    const otraCotizacionEnCierre = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise_id: cotizacion.promise_id,
        id: { not: cotizacionId },
        status: 'en_cierre',
      },
    });

    if (otraCotizacionEnCierre) {
      return { 
        success: false, 
        error: 'Ya existe otra cotización en proceso de cierre. Cancela el cierre de la otra cotización primero.' 
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Pasar cotización a cierre
      // Si se pasa manualmente desde el panel, es cliente creado manualmente (selected_by_prospect: false)
      // Si viene del flujo público, ya tiene selected_by_prospect: true
      await tx.studio_cotizaciones.update({
        where: { id: cotizacionId },
        data: {
          status: 'en_cierre',
          selected_by_prospect: false, // Cliente creado manualmente, no requiere firma de contrato
          selected_at: new Date(),
          updated_at: new Date(),
        },
      });

      // 2. Crear registro de cierre limpio (resetear si ya existe)
      await tx.studio_cotizaciones_cierre.upsert({
        where: { cotizacion_id: cotizacionId },
        create: {
          cotizacion_id: cotizacionId,
        },
        update: {
          // Limpiar todos los campos si el registro ya existía
          condiciones_comerciales_id: null,
          condiciones_comerciales_definidas: false,
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

      // 3. Archivar todas las demás cotizaciones pendientes de la misma promesa
      await tx.studio_cotizaciones.updateMany({
        where: {
          promise_id: cotizacion.promise_id,
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
    console.error('[COTIZACIONES] Error pasando cotización a cierre:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al pasar cotización a cierre',
    };
  }
}

/**
 * Cancela el proceso de cierre de una cotización
 * - Cambia el status de 'en_cierre' a 'pendiente'
 * - Desarchivar otras cotizaciones archivadas de la misma promesa (opcional)
 */
export async function cancelarCierre(
  studioSlug: string,
  cotizacionId: string,
  desarchivarOtras: boolean = false
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
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Verificar que la cotización esté en cierre
    if (cotizacion.status !== 'en_cierre') {
      return { success: false, error: 'Solo se pueden cancelar cotizaciones en proceso de cierre' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Regresar cotización a pendiente y limpiar selected_by_prospect
      await tx.studio_cotizaciones.update({
        where: { id: cotizacionId },
        data: {
          status: 'pendiente',
          selected_by_prospect: false,
          selected_at: null,
          updated_at: new Date(),
        },
      });

      // 2. Eliminar registro de cierre
      await tx.studio_cotizaciones_cierre.deleteMany({
        where: { cotizacion_id: cotizacionId },
      });

      // 3. Opcionalmente desarchivar otras cotizaciones
      if (desarchivarOtras && cotizacion.promise_id) {
        await tx.studio_cotizaciones.updateMany({
          where: {
            promise_id: cotizacion.promise_id,
            id: { not: cotizacionId },
            archived: true,
            status: 'pendiente',
          },
          data: {
            archived: false,
            updated_at: new Date(),
          },
        });
      }
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
    console.error('[COTIZACIONES] Error cancelando cierre:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar cierre',
    };
  }
}

