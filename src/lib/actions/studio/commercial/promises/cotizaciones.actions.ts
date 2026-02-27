'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { CotizacionItemType, OperationalCategory } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { withRetry } from '@/lib/database/retry-helper';
import { revalidatePath, revalidateTag } from 'next/cache';

/** Snapshot: mapeo operational_category (catálogo) → task_type (cotización) para Workflows Inteligentes */
function operationalCategoryToTaskType(oc: OperationalCategory | null): CotizacionItemType | undefined {
  if (!oc) return undefined;
  switch (oc) {
    case 'PRODUCTION': return 'OPERATION';
    case 'POST_PRODUCTION': return 'EDITING';
    case 'DELIVERY':
    case 'DIGITAL_DELIVERY':
    case 'PHYSICAL_DELIVERY': return 'DELIVERY';
    case 'LOGISTICS': return 'CUSTOM';
    default: return undefined;
  }
}
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
import { calcularPrecio, type ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';
import { COTIZACION_ITEMS_SELECT_STANDARD } from './cotizacion-structure.utils';
import { getPromiseRouteStateFromSlug, type PromiseRouteState } from '@/lib/utils/promise-navigation';
import { calcularRentabilidadGlobal } from '@/lib/utils/negociacion-calc';
import type { CotizacionItem } from '@/lib/utils/negociacion-calc';

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
  negociacion_precio_original?: number | null;
  negociacion_precio_personalizado?: number | null;
  /** Fase 11: Total a pagar (precio_final_cierre) para congruencia en listados. */
  total_a_pagar?: number;
  /** Snapshots para ResumenPago en vista Autorizada */
  precio_calculado?: number | null;
  bono_especial?: number | null;
  items_cortesia?: unknown;
  cortesias_monto_snapshot?: number | null;
  cortesias_count_snapshot?: number | null;
  /** Duración del evento en horas (para listado en card) */
  event_duration?: number | null;
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

    if (!validatedData.condiciones_visibles?.length) {
      return { success: false, error: 'Selecciona al menos una condición visible para el cliente' };
    }

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener datos del promise (sin crear evento)
    // El evento solo se crea cuando se autoriza la cotizaciรณn
    let eventTypeId: string;
    let contactId: string | null = validatedData.contact_id || null;
    let durationHours: number | null = null;

    if (validatedData.promise_id) {
      // Si hay promise_id, obtener el promise
      const promise = await prisma.studio_promises.findUnique({
        where: { id: validatedData.promise_id },
        select: {
          contact_id: true,
          event_type_id: true,
          duration_hours: true,
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      if (!promise) {
        return { success: false, error: 'Promise no encontrada' };
      }

      contactId = promise.contact_id || validatedData.contact_id || null;
      eventTypeId = promise.event_type_id || '';
      durationHours = promise.duration_hours;

      if (!eventTypeId) {
        return { success: false, error: 'El promise no tiene tipo de evento asociado' };
      }
    } else {
      // Si no hay promise_id, retornamos error ya que es requerido
      return {
        success: false,
        error: 'Se requiere un promise_id para crear la cotizaciรณn',
      };
    }

    // Validar nombre único dentro de la promise
    const nombreExistente = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise_id: validatedData.promise_id,
        name: validatedData.nombre.trim(),
        archived: false,
      },
    });

    if (nombreExistente) {
      return { success: false, error: 'Ya existe una cotización con ese nombre en esta promesa' };
    }

    // Crear cotizaciรณn SIN evento (evento_id serรก null)
    // El evento se crearรก cuando se autorice la cotizaciรณn
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
        precio_calculado: validatedData.precio_calculado != null ? validatedData.precio_calculado : null,
        status: 'pendiente',
        visible_to_client: validatedData.visible_to_client ?? false,
        event_duration: validatedData.event_duration ?? durationHours,
        items_cortesia: validatedData.items_cortesia ?? [],
        bono_especial: validatedData.bono_especial ?? 0,
        condiciones_comerciales_id: validatedData.condiciones_comerciales_id ?? null,
        condiciones_visibles: validatedData.condiciones_visibles?.length ? validatedData.condiciones_visibles : null,
      },
    });

    // Obtener catálogo para obtener billing_type de cada item
    const { obtenerCatalogo } = await import('@/lib/actions/studio/config/catalogo.actions');
    const catalogoResult = await obtenerCatalogo(validatedData.studio_slug);
    
    // Crear mapa de item_id -> billing_type
    const billingTypeMap = new Map<string, 'HOUR' | 'SERVICE' | 'UNIT'>();
    if (catalogoResult.success && catalogoResult.data) {
      catalogoResult.data.forEach(seccion => {
        seccion.categorias.forEach(categoria => {
          categoria.servicios.forEach(servicio => {
            billingTypeMap.set(servicio.id, (servicio.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT');
          });
        });
      });
    }

    // Snapshot operational_category → task_type (Fase 1.5 Integridad de la Raíz)
    const catalogItemIds = Object.entries(validatedData.items || {})
      .filter(([, q]) => q > 0)
      .map(([id]) => id);
    const catalogItemsWithCategory = catalogItemIds.length > 0
      ? await prisma.studio_items.findMany({
          where: { id: { in: catalogItemIds } },
          select: { id: true, operational_category: true },
        })
      : [];
    const taskTypeMap = new Map<string, CotizacionItemType>();
    catalogItemsWithCategory.forEach((i) => {
      const tt = operationalCategoryToTaskType(i.operational_category);
      if (tt) taskTypeMap.set(i.id, tt);
    });

    // Crear items de la cotizaciรณn (del catálogo)
    const catalogItemsToCreate = Object.entries(validatedData.items || {})
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity], index) => ({
        cotizacion_id: cotizacion.id,
        item_id: itemId,
        quantity,
        order: index,
        billing_type: billingTypeMap.get(itemId) || 'SERVICE', // Default SERVICE para compatibilidad legacy
        task_type: taskTypeMap.get(itemId) ?? undefined,
      }));

    // Obtener nombres de categoría y sección para custom items
    const categoriaIds = (validatedData.customItems || [])
      .map(item => item.categoriaId)
      .filter((id): id is string => !!id);
    
    const categoriasMap = new Map<string, { categoryName: string; sectionName: string | null }>();
    if (categoriaIds.length > 0) {
      const categorias = await prisma.studio_service_categories.findMany({
        where: { id: { in: categoriaIds } },
        include: {
          section_categories: {
            include: {
              service_sections: {
                select: { name: true },
              },
            },
          },
        },
      });
      
      categorias.forEach(categoria => {
        categoriasMap.set(categoria.id, {
          categoryName: categoria.name,
          sectionName: categoria.section_categories?.service_sections?.name || null,
        });
      });
    }

    // Crear items personalizados (custom items)
    const customItemsToCreate = (validatedData.customItems || []).map((customItem, index) => {
      const totalGastos = (customItem.expense || 0);
      const cantidadEfectiva = calcularCantidadEfectiva(
        customItem.billing_type || 'SERVICE',
        customItem.quantity,
        durationHours
      );
      
      // Obtener nombres de categoría y sección desde el mapa
      const categoriaInfo = customItem.categoriaId ? categoriasMap.get(customItem.categoriaId) : null;
      
      return {
        cotizacion_id: cotizacion.id,
        item_id: null, // ⚠️ NULL para items personalizados
        service_category_id: customItem.categoriaId || null, // Guardar categoriaId para custom items
        original_service_id: customItem.originalItemId || null, // Guardar originalItemId si es reemplazo
        quantity: customItem.quantity,
        order: catalogItemsToCreate.length + index,
        billing_type: (customItem.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
        // Datos del item personalizado
        name: customItem.name,
        description: customItem.description || null,
        unit_price: customItem.unit_price,
        cost: customItem.cost || 0,
        expense: totalGastos,
        subtotal: customItem.unit_price * cantidadEfectiva,
        is_custom: true,
        // Snapshots iguales a campos operacionales para items custom
        name_snapshot: customItem.name,
        description_snapshot: customItem.description || null,
        category_name_snapshot: categoriaInfo?.categoryName || null,
        seccion_name_snapshot: categoriaInfo?.sectionName || null,
        category_name: categoriaInfo?.categoryName || null,
        seccion_name: categoriaInfo?.sectionName || null,
        unit_price_snapshot: customItem.unit_price,
        cost_snapshot: customItem.cost || 0,
        expense_snapshot: totalGastos,
        profit_snapshot: customItem.unit_price - (customItem.cost || 0) - totalGastos,
        public_price_snapshot: customItem.unit_price,
        profit_type_snapshot: customItem.tipoUtilidad || 'servicio',
      };
    });

    const allItemsToCreate = [...catalogItemsToCreate, ...customItemsToCreate];

    if (allItemsToCreate.length > 0) {
      await prisma.studio_cotizacion_items.createMany({
        data: allItemsToCreate,
      });

      // Calcular y guardar precios de los items del catálogo (los custom ya tienen precios)
      if (catalogItemsToCreate.length > 0) {
        await calcularYGuardarPreciosCotizacion(cotizacion.id, validatedData.studio_slug).catch((error) => {
          console.error('[COTIZACIONES] Error calculando precios en creaciรณn:', error);
          // No fallar la creaciรณn si el cรกlculo de precios falla
        });
      }
    }

    // Registrar log si hay promise_id
    if (validatedData.promise_id) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        validatedData.studio_slug,
        validatedData.promise_id,
        'quotation_created',
        'user', // Asumimos que es acciรณn de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: cotizacion.name,
          price: cotizacion.price,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotizaciรณn creada:', error);
      });
    }

    revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises`);

    // Obtener cotizaciรณn con promise_id y status para redirección
    const cotizacionConPromise = await prisma.studio_cotizaciones.findUnique({
      where: { id: cotizacion.id },
      select: {
        id: true,
        name: true,
        status: true,
        promise_id: true,
        evento_id: true,
      },
    });

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
        evento_id: cotizacionConPromise?.evento_id || undefined,
        promise_id: cotizacionConPromise?.promise_id || undefined,
        status: cotizacionConPromise?.status || 'pendiente',
        cotizacion: {
          id: cotizacion.id,
          name: cotizacion.name,
          price: cotizacion.price,
          status: cotizacionConPromise?.status || 'pendiente',
          description: cotizacion.description,
          created_at: cotizacion.created_at,
          updated_at: cotizacion.updated_at,
          order: cotizacion.order,
          archived: cotizacion.archived,
        },
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error creando cotizaciรณn:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Error al crear cotizaciรณn' };
  }
}

/**
 * Obtener cotizaciones por promise_id
 */
export async function getCotizacionesByPromiseId(
  promiseId: string
): Promise<CotizacionesListResponse> {
  try {
    const cotizaciones = await withRetry(
      () => prisma.studio_cotizaciones.findMany({
      where: {
        promise_id: promiseId,
        // Incluir: pendiente, negociacion, en_cierre, archivada, cancelada
        // Excluir solo estados finales: aprobada, autorizada, approved, contract_generated, contract_signed
        OR: [
          { status: 'pendiente' },
          { status: 'negociacion' },
          { status: 'en_cierre' },
          { status: 'archivada' },
          { status: 'cancelada' },
        ],
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
        negociacion_precio_personalizado: true,
        event_duration: true,
        bono_especial: true,
        items_cortesia: true,
        cortesias_count_snapshot: true,
        cortesias_monto_snapshot: true,
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
      }),
      { maxRetries: 3, baseDelay: 1000, maxDelay: 5000 }
    );

    return {
      success: true,
      data: cotizaciones.map((cot) => {
        const negocio = (cot as { negociacion_precio_personalizado?: unknown }).negociacion_precio_personalizado;
        const totalAPagar = negocio != null && Number(negocio) > 0 ? Number(negocio) : cot.price;
        const itemsCortesia = cot.items_cortesia;
        const cortesiasCount = cot.cortesias_count_snapshot ?? (Array.isArray(itemsCortesia) ? itemsCortesia.length : 0);
        const bono = cot.bono_especial != null ? Number(cot.bono_especial) : null;
        return {
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
          negociacion_precio_personalizado: negocio != null ? Number(negocio) : null,
          total_a_pagar: totalAPagar,
          event_duration: cot.event_duration != null ? Number(cot.event_duration) : null,
          bono_especial: bono,
          items_cortesia: itemsCortesia ?? undefined,
          cortesias_count_snapshot: cortesiasCount,
          cortesias_monto_snapshot: cot.cortesias_monto_snapshot != null ? Number(cot.cortesias_monto_snapshot) : null,
        };
      }),
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
 * Obtener duration_hours de una promise
 */
export async function getPromiseDurationHours(
  promiseId: string
): Promise<{ success: boolean; duration_hours?: number | null; error?: string }> {
  try {
    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: { duration_hours: true },
    });

    if (!promise) {
      return { success: false, error: 'Promise no encontrada' };
    }

    return {
      success: true,
      duration_hours: promise.duration_hours,
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error obteniendo duration_hours:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener duration_hours',
    };
  }
}

/**
 * Actualizar solo duration_hours de la promesa (para sincronización Local vs Global desde editor de cotización).
 */
export async function updatePromiseDurationHours(
  studioSlug: string,
  promiseId: string,
  durationHours: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }
    await prisma.studio_promises.update({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      data: { duration_hours: durationHours },
    });
    return { success: true };
  } catch (error) {
    console.error('[COTIZACIONES] Error actualizando duration_hours de promesa:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar duración del evento',
    };
  }
}

/**
 * Obtener cotización autorizada con evento asociado a una promesa
 */
export async function getCotizacionAutorizadaByPromiseId(
  promiseId: string
): Promise<{
  success: boolean;
  data?: CotizacionListItem | null;
  error?: string;
}> {
  try {
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise_id: promiseId,
        status: { in: ['autorizada', 'aprobada', 'approved', 'contract_generated', 'contract_signed'] },
        evento_id: { not: null },
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
        precio_calculado: true,
        bono_especial: true,
        items_cortesia: true,
        cortesias_monto_snapshot: true,
        cortesias_count_snapshot: true,
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
    });

    if (!cotizacion) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
        price: Number(cotizacion.price),
        status: cotizacion.status,
        description: cotizacion.description,
        created_at: cotizacion.created_at,
        updated_at: cotizacion.updated_at,
        order: cotizacion.order,
        archived: cotizacion.archived,
        visible_to_client: cotizacion.visible_to_client,
        revision_of_id: cotizacion.revision_of_id,
        revision_number: cotizacion.revision_number,
        revision_status: cotizacion.revision_status,
        selected_by_prospect: cotizacion.selected_by_prospect,
        selected_at: cotizacion.selected_at,
        discount: cotizacion.discount ? Number(cotizacion.discount) : null,
        evento_id: cotizacion.evento_id,
        condiciones_comerciales_id: cotizacion.condiciones_comerciales_id,
        condiciones_comerciales: cotizacion.condiciones_comerciales,
        negociacion_precio_original: cotizacion.negociacion_precio_original !== null && cotizacion.negociacion_precio_original !== undefined
          ? Number(cotizacion.negociacion_precio_original)
          : null,
        negociacion_precio_personalizado: cotizacion.negociacion_precio_personalizado !== null && cotizacion.negociacion_precio_personalizado !== undefined
          ? Number(cotizacion.negociacion_precio_personalizado)
          : null,
        precio_calculado: cotizacion.precio_calculado != null ? Number(cotizacion.precio_calculado) : null,
        bono_especial: cotizacion.bono_especial != null ? Number(cotizacion.bono_especial) : null,
        items_cortesia: cotizacion.items_cortesia ?? undefined,
        cortesias_monto_snapshot: cotizacion.cortesias_monto_snapshot != null ? Number(cotizacion.cortesias_monto_snapshot) : null,
        cortesias_count_snapshot: cotizacion.cortesias_count_snapshot ?? null,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error obteniendo cotización autorizada:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener cotización autorizada',
    };
  }
}

/**
 * Obtener cotizaciรณn por ID con todos sus datos
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
    negociacion_precio_original?: number | null;
    negociacion_precio_personalizado?: number | null;
    event_duration?: number | null;
    precio_calculado?: number | null;
    promise_route_state?: PromiseRouteState | null;
    contact_name?: string | null;
    items_cortesia?: string[];
    bono_especial?: number;
    items: Array<{
      item_id: string | null; // null para custom items
      quantity: number;
      unit_price: number;
      subtotal: number;
      cost: number;
      expense: number;
      order: number;
      id: string;
      billing_type: 'HOUR' | 'SERVICE' | 'UNIT' | null;
      profit_type_snapshot?: string | null;
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
      // Campo para custom items (service_category_id)
      categoria_id?: string | null; // Presente solo para custom items (item_id === null)
      original_item_id?: string | null; // ID del item del catálogo que reemplaza (desde original_service_id)
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
        negociacion_precio_original: true,
        negociacion_precio_personalizado: true,
        event_duration: true,
        precio_calculado: true,
        items_cortesia: true,
        bono_especial: true,
        condiciones_visibles: true,
        condicion_comercial_negociacion: {
          select: {
            id: true,
            name: true,
            description: true,
            discount_percentage: true,
            advance_percentage: true,
            advance_type: true,
            advance_amount: true,
            is_temporary: true,
          },
        },
        promise: {
          select: {
            pipeline_stage: { select: { slug: true } },
            contact: { select: { name: true } },
          },
        },
        cotizacion_items: {
          select: {
            ...COTIZACION_ITEMS_SELECT_STANDARD,
            cost: true,
            expense: true,
            service_category_id: true, // Incluir service_category_id para custom items
            is_custom: true, // Incluir is_custom para identificar custom items
            original_service_id: true, // Incluir original_service_id para identificar reemplazos
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

    // Separar items del catálogo y custom items
    const catalogItems = cotizacion.cotizacion_items
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
        billing_type: item.billing_type,
        profit_type_snapshot: item.profit_type_snapshot ?? undefined,
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

    // Custom items (items con item_id null o is_custom true)
    const customItems = cotizacion.cotizacion_items
      .filter((item) => item.item_id === null || item.is_custom === true)
      .map((item) => ({
        item_id: null,
        quantity: item.quantity,
        unit_price: item.unit_price ?? 0,
        subtotal: item.subtotal ?? 0,
        cost: item.cost ?? 0,
        expense: item.expense ?? 0,
        order: item.order ?? 0,
        id: item.id,
        billing_type: item.billing_type,
        profit_type_snapshot: item.profit_type_snapshot ?? undefined,
        // Campos operacionales (para compatibilidad)
        name: item.name_snapshot || item.name || '',
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
        // Campo específico para custom items
        categoria_id: item.service_category_id, // Guardar categoriaId para custom items
        original_item_id: item.original_service_id, // Guardar originalItemId desde original_service_id
      }));

    // Combinar ambos tipos de items manteniendo el orden
    const itemsOrdenados = [...catalogItems, ...customItems].sort((a, b) => a.order - b.order);

    const stageSlug = cotizacion.promise?.pipeline_stage?.slug ?? null;
    const promiseRouteState: PromiseRouteState | null = stageSlug
      ? getPromiseRouteStateFromSlug(stageSlug)
      : null;

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
        negociacion_precio_original: cotizacion.negociacion_precio_original !== null && cotizacion.negociacion_precio_original !== undefined
          ? Number(cotizacion.negociacion_precio_original)
          : null,
        negociacion_precio_personalizado: cotizacion.negociacion_precio_personalizado !== null && cotizacion.negociacion_precio_personalizado !== undefined
          ? Number(cotizacion.negociacion_precio_personalizado)
          : null,
        event_duration: cotizacion.event_duration ?? null,
        precio_calculado: cotizacion.precio_calculado != null ? Number(cotizacion.precio_calculado) : null,
        items: itemsOrdenados,
        promise_route_state: promiseRouteState,
        contact_name: cotizacion.promise?.contact?.name ?? null,
        items_cortesia: Array.isArray(cotizacion.items_cortesia) ? (cotizacion.items_cortesia as string[]) : [],
        bono_especial: cotizacion.bono_especial !== null && cotizacion.bono_especial !== undefined ? Number(cotizacion.bono_especial) : 0,
        condiciones_visibles: Array.isArray(cotizacion.condiciones_visibles) ? (cotizacion.condiciones_visibles as string[]) : null,
        condicion_comercial_negociacion: cotizacion.condicion_comercial_negociacion
          ? {
              id: cotizacion.condicion_comercial_negociacion.id,
              name: cotizacion.condicion_comercial_negociacion.name,
              description: cotizacion.condicion_comercial_negociacion.description ?? null,
              discount_percentage: cotizacion.condicion_comercial_negociacion.discount_percentage != null ? Number(cotizacion.condicion_comercial_negociacion.discount_percentage) : null,
              advance_percentage: cotizacion.condicion_comercial_negociacion.advance_percentage != null ? Number(cotizacion.condicion_comercial_negociacion.advance_percentage) : null,
              advance_type: cotizacion.condicion_comercial_negociacion.advance_type ?? null,
              advance_amount: cotizacion.condicion_comercial_negociacion.advance_amount != null ? Number(cotizacion.condicion_comercial_negociacion.advance_amount) : null,
              is_temporary: cotizacion.condicion_comercial_negociacion.is_temporary ?? false,
            }
          : null,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error obteniendo cotización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener cotizaciรณn',
    };
  }
}

/**
 * Crear o actualizar la condición comercial de negociación para una cotización.
 * Solo una condición de negociación por cotización; reemplaza la anterior si existe.
 */
export async function upsertCondicionNegociacionCotizacion(
  studioSlug: string,
  cotizacionId: string,
  promiseId: string,
  data: { name: string; discount_percentage: number | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: { id: cotizacionId, studio_id: studio.id },
      select: { id: true, promise_id: true },
    });
    if (!cotizacion || cotizacion.promise_id !== promiseId) {
      return { success: false, error: 'Cotización no encontrada o no pertenece a la promesa' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.studio_condiciones_comerciales_negociacion.deleteMany({
        where: { cotizacion_id: cotizacionId },
      });
      await tx.studio_condiciones_comerciales_negociacion.create({
        data: {
          cotizacion_id: cotizacionId,
          promise_id: promiseId,
          studio_id: studio.id,
          name: data.name.trim(),
          description: null,
          discount_percentage: data.discount_percentage,
          advance_percentage: null,
          advance_type: 'percentage',
          advance_amount: null,
          metodo_pago_id: null,
          is_temporary: true,
        },
      });
      await tx.studio_cotizaciones.update({
        where: { id: cotizacionId },
        data: { condiciones_comerciales_id: null },
      });
    });
    return { success: true };
  } catch (error) {
    console.error('[COTIZACIONES] Error upsert condicion negociación:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al guardar condición de negociación',
    };
  }
}

/**
 * Eliminar la condición comercial de negociación de una cotización (si existe).
 */
export async function deleteCondicionNegociacionCotizacion(
  studioSlug: string,
  cotizacionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    await prisma.studio_condiciones_comerciales_negociacion.deleteMany({
      where: {
        cotizacion_id: cotizacionId,
        studio_id: studio.id,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('[COTIZACIONES] Error eliminando condicion negociación:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar condición de negociación',
    };
  }
}

/**
 * Eliminar cotizaciรณn
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

    // Verificar que la cotizaciรณn existe y pertenece al studio
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    // Eliminar la cotizaciรณn (los items se eliminan en cascade)
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
        'user', // Asumimos que es acciรณn de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: cotizacion.name,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotizaciรณn eliminada:', error);
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
    console.error('[COTIZACIONES] Error eliminando cotizaciรณn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar cotizaciรณn',
    };
  }
}

/**
 * Archivar cotizaciรณn
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
      return { success: false, error: 'La cotizaciรณn ya estรก archivada' };
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
    console.error('[COTIZACIONES] Error archivando cotizaciรณn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al archivar cotizaciรณn',
    };
  }
}

/**
 * Desarchivar cotizaciรณn
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
      return { success: false, error: 'La cotizaciรณn no estรก archivada' };
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
    console.error('[COTIZACIONES] Error desarchivando cotizaciรณn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desarchivar cotizaciรณn',
    };
  }
}

/**
 * Duplicar cotizaciรณn
 * 
 * NOTA: Las etiquetas (tags) pertenecen a las promesas, no a las cotizaciones.
 * La cotizaciรณn duplicada usa la misma promesa (promise_id), por lo que
 * comparte las mismas etiquetas de la promesa. No se copian etiquetas porque
 * no hay relaciรณn directa entre cotizaciones y etiquetas.
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

    // Obtener la cotizaciรณn original con sus items
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

    // Obtener el order mรกximo para colocar la duplicada al final
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

    // Generar nombre รบnico para la cotizaciรณn duplicada
    let newName = `${original.name} (Copia)`;
    let counter = 1;

    // Verificar si ya existe una cotizaciรณn con ese nombre en la promise
    while (true) {
      const existing = await prisma.studio_cotizaciones.findFirst({
        where: {
          promise_id: original.promise_id,
          name: newName,
          archived: false,
        },
      });

      if (!existing) {
        break; // Nombre รบnico encontrado
      }

      // Si existe, incrementar el contador
      counter++;
      newName = `${original.name} (Copia ${counter})`;
    }

    // Crear nueva cotizaciรณn con snapshots copiados
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
        // Duración, bono y cortesías (heredar de original)
        event_duration: original.event_duration,
        bono_especial: original.bono_especial,
        items_cortesia: original.items_cortesia,
        cortesias_monto_snapshot: original.cortesias_monto_snapshot,
        cortesias_count_snapshot: original.cortesias_count_snapshot,
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
          billing_type: item.billing_type, // Copiar billing_type del item
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

      // Recalcular precios y actualizar snapshots con datos actuales del catรกlogo
      // Esto asegura que los snapshots estรฉn sincronizados con el catรกlogo actual
      await calcularYGuardarPreciosCotizacion(nuevaCotizacion.id, studioSlug).catch((error) => {
        console.error('[COTIZACIONES] Error calculando precios en duplicaciรณn:', error);
        // No fallar la duplicaciรณn si el cรกlculo de precios falla
      });
    }

    // Registrar log si hay promise_id
    if (original.promise_id) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        studioSlug,
        original.promise_id,
        'quotation_created',
        'user', // Asumimos que es acciรณn de usuario
        null, // TODO: Obtener userId del contexto
        {
          quotationName: nuevaCotizacion.name,
          price: nuevaCotizacion.price,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[COTIZACIONES] Error registrando log de cotizaciรณn duplicada:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    // Retornar la cotización completa para actualización optimista (incl. duración, bono, cortesías para badges)
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
        event_duration: true,
        bono_especial: true,
        items_cortesia: true,
        cortesias_count_snapshot: true,
        cortesias_monto_snapshot: true,
      },
    });

    if (!cotizacionCompleta) {
      return { success: true, data: { id: nuevaCotizacion.id, name: nuevaCotizacion.name } };
    }

    const priceNum = Number(cotizacionCompleta.price);
    const itemsCortesia = cotizacionCompleta.items_cortesia;
    const cortesiasCount = cotizacionCompleta.cortesias_count_snapshot ?? (Array.isArray(itemsCortesia) ? itemsCortesia.length : 0);

    return {
      success: true,
      data: {
        id: nuevaCotizacion.id,
        name: nuevaCotizacion.name,
        cotizacion: {
          id: cotizacionCompleta.id,
          name: cotizacionCompleta.name,
          price: priceNum,
          status: cotizacionCompleta.status,
          description: cotizacionCompleta.description,
          created_at: cotizacionCompleta.created_at,
          updated_at: cotizacionCompleta.updated_at,
          order: cotizacionCompleta.order,
          archived: cotizacionCompleta.archived,
          visible_to_client: false,
          event_duration: cotizacionCompleta.event_duration != null ? Number(cotizacionCompleta.event_duration) : null,
          bono_especial: cotizacionCompleta.bono_especial != null ? Number(cotizacionCompleta.bono_especial) : null,
          items_cortesia: itemsCortesia ?? undefined,
          cortesias_count_snapshot: cortesiasCount,
          cortesias_monto_snapshot: cotizacionCompleta.cortesias_monto_snapshot != null ? Number(cotizacionCompleta.cortesias_monto_snapshot) : null,
        },
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
 * Guardar cotización como paquete (Fase 2).
 * Clona ítems de catálogo (item_id + service_category_id) a un nuevo studio_paquetes.
 * El paquete se crea con visibility: 'private' para que el socio decida si lo hace público.
 */
export async function guardarCotizacionComoPaquete(
  studioSlug: string,
  cotizacionId: string
): Promise<{ success: boolean; data?: { paqueteId: string }; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: { id: cotizacionId, studio_id: studio.id },
      include: {
        cotizacion_items: {
          where: {
            item_id: { not: null },
            service_category_id: { not: null },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    const itemsValidos = cotizacion.cotizacion_items.filter(
      (i): i is typeof i & { item_id: string; service_category_id: string } =>
        i.item_id != null && i.service_category_id != null
    );

    const maxOrderResult = await prisma.studio_paquetes.findFirst({
      where: { studio_id: studio.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const newOrder = (maxOrderResult?.order ?? -1) + 1;

    const paquete = await prisma.studio_paquetes.create({
      data: {
        studio_id: studio.id,
        event_type_id: cotizacion.event_type_id,
        name: `${cotizacion.name} (Paquete)`,
        description: cotizacion.description ?? null,
        precio: Number(cotizacion.price),
        base_hours: cotizacion.event_duration ?? null,
        visibility: 'private',
        status: 'active',
        order: newOrder,
        bono_especial: cotizacion.bono_especial ?? null,
        items_cortesia: cotizacion.items_cortesia ?? null,
      },
    });

    if (itemsValidos.length > 0) {
      await prisma.studio_paquete_items.createMany({
        data: itemsValidos.map((item, idx) => ({
          paquete_id: paquete.id,
          item_id: item.item_id!,
          service_category_id: item.service_category_id!,
          quantity: item.quantity,
          order: idx,
        })),
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/paquetes`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return { success: true, data: { paqueteId: paquete.id } };
  } catch (error) {
    console.error('[COTIZACIONES] Error guardarCotizacionComoPaquete:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el paquete desde la cotización',
    };
  }
}

/**
 * Promocionar ítem personalizado al catálogo maestro (Fase 2.1).
 * - Con cotizacion_item_id (edición): crea studio_items desde el ítem de cotización y vincula la fila.
 * - Con payload (creación): solo crea studio_items y devuelve item_id para que el form actualice estado.
 */
export async function promocionarItemAlCatalogo(
  studioSlug: string,
  options:
    | { cotizacion_item_id: string }
    | {
        name: string;
        description?: string | null;
        cost: number;
        expense: number;
        billing_type: 'HOUR' | 'SERVICE' | 'UNIT';
        categoria_id: string;
      }
): Promise<{ success: boolean; data?: { item_id: string; service_category_id: string }; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    let name: string;
    let cost: number;
    let expense: number;
    let billing_type: 'HOUR' | 'SERVICE' | 'UNIT';
    let service_category_id: string;

    if ('cotizacion_item_id' in options) {
      const row = await prisma.studio_cotizacion_items.findFirst({
        where: {
          id: options.cotizacion_item_id,
          cotizaciones: { studio_id: studio.id },
        },
        include: { cotizaciones: { select: { studio_id: true } } },
      });
      if (!row || row.item_id != null) {
        return { success: false, error: 'Ítem no encontrado o ya está en el catálogo' };
      }
      if (!row.service_category_id) {
        return { success: false, error: 'El ítem personalizado no tiene categoría asignada' };
      }
      name = (row.name_snapshot || row.name || '').trim() || 'Servicio personalizado';
      cost = Number(row.cost ?? 0);
      expense = Number(row.expense ?? 0);
      billing_type = (row.billing_type as 'HOUR' | 'SERVICE' | 'UNIT') ?? 'SERVICE';
      service_category_id = row.service_category_id;
    } else {
      name = options.name.trim() || 'Servicio personalizado';
      cost = Number(options.cost ?? 0);
      expense = Number(options.expense ?? 0);
      billing_type = options.billing_type ?? 'SERVICE';
      service_category_id = options.categoria_id;
    }

    const maxOrder = await prisma.studio_items.findFirst({
      where: { service_category_id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const newOrder = (maxOrder?.order ?? -1) + 1;

    const newItem = await prisma.studio_items.create({
      data: {
        studio_id: studio.id,
        service_category_id,
        name,
        cost,
        expense,
        billing_type,
        order: newOrder,
      },
    });

    if ('cotizacion_item_id' in options) {
      await prisma.studio_cotizacion_items.update({
        where: { id: options.cotizacion_item_id },
        data: { item_id: newItem.id, service_category_id: newItem.service_category_id },
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: { item_id: newItem.id, service_category_id: newItem.service_category_id },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error promocionarItemAlCatalogo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al guardar en catálogo',
    };
  }
}

const ActualizarItemYSnapshotSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  cost: z.number().min(0),
  tipoUtilidad: z.enum(['servicio', 'producto']).optional(),
  billing_type: z.enum(['HOUR', 'SERVICE', 'UNIT']).optional(),
  gastos: z.array(z.object({ nombre: z.string(), costo: z.number().min(0) })).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  operational_category: z.enum(['PRODUCTION', 'POST_PRODUCTION', 'DELIVERY', 'DIGITAL_DELIVERY', 'PHYSICAL_DELIVERY', 'LOGISTICS']).nullable().optional(),
  defaultDurationDays: z.number().int().min(1).optional(),
});

/**
 * Sincronización total: actualiza ítem maestro (studio_items) y snapshot (studio_cotizacion_items)
 * en una sola transacción cuando actualizarGlobal es true. Clona base_cost, utility_type,
 * expenses y calculated_price del global al snapshot.
 */
export async function actualizarItemYSnapshotCotizacion(
  studioSlug: string,
  cotizacionId: string,
  data: unknown
): Promise<{ success: boolean; data?: { unit_price: number }; error?: string }> {
  try {
    const validated = ActualizarItemYSnapshotSchema.parse(data);
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: { id: cotizacionId, studio_id: studio.id },
      include: { promise: { select: { duration_hours: true } } },
    });
    if (!cotizacion) {
      return { success: false, error: 'Cotización no encontrada' };
    }
    if (cotizacion.status === 'autorizada' || cotizacion.status === 'aprobada') {
      return { success: false, error: 'No se puede actualizar una cotización autorizada o aprobada' };
    }
    const configForm = await obtenerConfiguracionPrecios(studioSlug);
    if (!configForm) {
      return { success: false, error: 'No hay configuración de precios' };
    }
    const configPrecios: ConfiguracionPrecios = {
      utilidad_servicio: parseFloat(configForm.utilidad_servicio || '0.30'),
      utilidad_producto: parseFloat(configForm.utilidad_producto || '0.20'),
      comision_venta: parseFloat(configForm.comision_venta || '0.10'),
      sobreprecio: parseFloat(configForm.sobreprecio || '0.05'),
    };
    // Fase 5.4: Recalcular totales con datos completos del global (cost + gastos + utilidad + cronograma)
    const totalGastos = (validated.gastos || []).reduce((acc, g) => acc + g.costo, 0);
    const tipoUtilidad = validated.tipoUtilidad === 'producto' ? 'producto' : 'servicio';
    const precios = calcularPrecio(validated.cost, totalGastos, tipoUtilidad, configPrecios);
    const durationHours = cotizacion.event_duration ?? cotizacion.promise?.duration_hours ?? null;
    const billingType = (validated.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT';
    const taskType = validated.operational_category
      ? operationalCategoryToTaskType(validated.operational_category as OperationalCategory)
      : undefined;
    const internalDeliveryDays = validated.defaultDurationDays ?? undefined;

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar ítem maestro (global)
      await tx.studio_items.update({
        where: { id: validated.id },
        data: {
          name: validated.name,
          cost: validated.cost,
          ...(validated.tipoUtilidad !== undefined && {
            utility_type: validated.tipoUtilidad === 'servicio' ? 'service' : 'product',
          }),
          ...(validated.billing_type !== undefined && { billing_type: validated.billing_type }),
          ...(validated.status !== undefined && { status: validated.status }),
          ...(validated.operational_category !== undefined && { operational_category: validated.operational_category }),
          ...(validated.defaultDurationDays !== undefined && { default_duration_days: validated.defaultDurationDays }),
          ...(validated.gastos !== undefined && {
            item_expenses: {
              deleteMany: {},
              create: validated.gastos!.map((g) => ({ name: g.nombre, cost: g.costo })),
            },
          }),
        },
      });

      // 2. Snapshot: foto fiel y completa del global (precios + cronograma + gastos)
      const rows = await tx.studio_cotizacion_items.findMany({
        where: { cotizacion_id: cotizacionId, item_id: validated.id },
      });
      for (const row of rows) {
        const cantidadEfectiva = calcularCantidadEfectiva(billingType, row.quantity, durationHours);
        const subtotalRecalculado = precios.precio_final * cantidadEfectiva;
        await tx.studio_cotizacion_items.update({
          where: { id: row.id },
          data: {
            // Campos operacionales
            name: validated.name,
            cost: validated.cost,
            expense: totalGastos,
            profit_type: tipoUtilidad,
            billing_type: billingType,
            // Fase 5.4: Totales recalculados con calcularPrecio (ej. $3,235.16)
            unit_price: precios.precio_final,
            subtotal: subtotalRecalculado,
            profit: precios.utilidad_base,
            public_price: precios.precio_final,
            // Cronograma: operational_category → task_type + duración
            ...(taskType !== undefined && { task_type: taskType }),
            ...(internalDeliveryDays !== undefined && { internal_delivery_days: internalDeliveryDays }),
            // Snapshots inmutables: foto fiel de precios y metadatos
            name_snapshot: validated.name,
            cost_snapshot: validated.cost,
            expense_snapshot: totalGastos,
            unit_price_snapshot: precios.precio_final,
            profit_snapshot: precios.utilidad_base,
            public_price_snapshot: precios.precio_final,
            profit_type_snapshot: tipoUtilidad,
          },
        });
      }
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
    return { success: true, data: { unit_price: precios.precio_final } };
  } catch (error) {
    console.error('[COTIZACIONES] Error actualizarItemYSnapshotCotizacion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar ítem y snapshot',
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

    // Actualizar el orden de cada cotizaciรณn usando transacciรณn
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
 * Actualizar nombre y opcionalmente descripción de cotización
 */
export async function updateCotizacionName(
  cotizacionId: string,
  studioSlug: string,
  newName: string,
  newDescription?: string | null
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

    const data: { name: string; description?: string | null } = { name: newName.trim() };
    if (newDescription !== undefined) {
      data.description = newDescription === '' ? null : newDescription.trim() || null;
    }

    const updated = await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data,
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
        }
      ).catch((error) => {
        console.error('[COTIZACIONES] Error registrando log de cotización actualizada:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidateTag(`quote-detail-${cotizacionId}`, 'max');

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error actualizando nombre/descripción:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar nombre',
    };
  }
}

/**
 * Toggle visibilidad de cotizaciรณn para cliente
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
 * Toggle estado de negociaciรณn de cotizaciรณn
 * Cambia entre 'pendiente' y 'negociacion'
 */
export async function toggleNegociacionStatus(
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

    // Solo permitir quitar de negociaciรณn (volver a pendiente)
    // No permitir pasar a negociaciรณn desde aquรญ (eso se hace desde la ruta de negociaciรณn)
    if (cotizacion.status !== 'negociacion') {
      return { 
        success: false, 
        error: 'Solo se puede quitar de negociaciรณn a cotizaciones que estรกn en estado negociaciรณn' 
      };
    }

    const updated = await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { status: 'pendiente' },
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
          status: 'pendiente',
        }
      ).catch((error) => {
        console.error('[COTIZACIONES] Error registrando log de negociaciรณn:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
      
      // Sincronizar short URL según nuevo estado
      const { syncShortUrlRoute } = await import('./promise-short-url.actions');
      await syncShortUrlRoute(studioSlug, cotizacion.promise_id).catch((error) => {
        console.error('[COTIZACIONES] Error sincronizando short URL:', error);
      });
    }

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error cambiando estado de negociaciรณn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cambiar estado de negociaciรณn',
    };
  }
}

/**
 * Quitar cancelaciรณn de cotizaciรณn
 * Cambia el estado de 'cancelada' a 'pendiente'
 */
export async function quitarCancelacionCotizacion(
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

    // Solo permitir quitar cancelaciรณn si estรก cancelada
    if (cotizacion.status !== 'cancelada') {
      return { 
        success: false, 
        error: 'Solo se puede quitar cancelaciรณn a cotizaciones que estรกn canceladas' 
      };
    }

    const updated = await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: { status: 'pendiente' },
    });

    // Quitar etiqueta "Cancelada" de la promesa si existe
    if (cotizacion.promise_id) {
      const tagCancelada = await prisma.studio_promise_tags.findFirst({
        where: {
          studio_id: studio.id,
          OR: [{ slug: 'cancelada' }, { name: 'Cancelada' }],
          is_active: true,
        },
      });
      if (tagCancelada) {
        const relacionCancelada = await prisma.studio_promises_tags.findFirst({
          where: {
            promise_id: cotizacion.promise_id,
            tag_id: tagCancelada.id,
          },
        });
        if (relacionCancelada) {
          await prisma.studio_promises_tags.delete({
            where: { id: relacionCancelada.id },
          });
        }
      }
    }

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
          status: 'pendiente',
        }
      ).catch((error) => {
        console.error('[COTIZACIONES] Error registrando log de quitar cancelaciรณn:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
      
      // Sincronizar short URL según nuevo estado
      const { syncShortUrlRoute } = await import('./promise-short-url.actions');
      await syncShortUrlRoute(studioSlug, cotizacion.promise_id).catch((error) => {
        console.error('[COTIZACIONES] Error sincronizando short URL:', error);
      });
    }

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error quitando cancelaciรณn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al quitar cancelaciรณn',
    };
  }
}

/**
 * Actualizar cotizaciรณn completa (nombre, descripciรณn, precio, items)
 * IMPORTANTE: NO archiva otras cotizaciones - solo actualiza la cotizaciรณn actual
 * El archivado de otras cotizaciones solo ocurre cuando se autoriza una cotizaciรณn
 */
export async function updateCotizacion(
  data: UpdateCotizacionData
): Promise<CotizacionResponse> {
  try {
    const validatedData = updateCotizacionSchema.parse(data);

    if (!validatedData.condiciones_visibles?.length) {
      return { success: false, error: 'Selecciona al menos una condición visible para el cliente' };
    }

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studio_slug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener cotizaciรณn existente
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
      return { success: false, error: 'No se puede actualizar una cotizaciรณn autorizada o aprobada' };
    }

    // Validar nombre único dentro de la promise (excluyendo la cotización actual; comparar normalizado para no falsear al guardar sin cambiar nombre)
    const nombreNormalizado = validatedData.nombre.trim();
    const nombreActual = (cotizacion.name ?? '').trim();
    if (nombreNormalizado !== nombreActual) {
      const nombreExistente = await prisma.studio_cotizaciones.findFirst({
        where: {
          promise_id: cotizacion.promise_id,
          name: nombreNormalizado,
          archived: false,
          id: { not: validatedData.cotizacion_id },
        },
      });

      if (nombreExistente) {
        return { success: false, error: 'Ya existe una cotización con ese nombre en esta promesa' };
      }
    }

    // Obtener catálogo para obtener billing_type de cada item
    const { obtenerCatalogo } = await import('@/lib/actions/studio/config/catalogo.actions');
    const catalogoResult = await obtenerCatalogo(validatedData.studio_slug);
    
    // Crear mapa de item_id -> billing_type
    const billingTypeMap = new Map<string, 'HOUR' | 'SERVICE' | 'UNIT'>();
    if (catalogoResult.success && catalogoResult.data) {
      catalogoResult.data.forEach(seccion => {
        seccion.categorias.forEach(categoria => {
          categoria.servicios.forEach(servicio => {
            billingTypeMap.set(servicio.id, (servicio.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT');
          });
        });
      });
    }

    // Obtener duration_hours para calcular cantidad efectiva de custom items
    const durationHours = cotizacion.event_duration ?? null;

    // Snapshot operational_category → task_type (Fase 1.5 Integridad de la Raíz)
    const catalogItemIdsUpdate = Object.entries(validatedData.items || {})
      .filter(([, q]) => q > 0)
      .map(([id]) => id);
    const catalogItemsWithCategoryUpdate = catalogItemIdsUpdate.length > 0
      ? await prisma.studio_items.findMany({
          where: { id: { in: catalogItemIdsUpdate } },
          select: { id: true, operational_category: true },
        })
      : [];
    const taskTypeMapUpdate = new Map<string, CotizacionItemType>();
    catalogItemsWithCategoryUpdate.forEach((i) => {
      const tt = operationalCategoryToTaskType(i.operational_category);
      if (tt) taskTypeMapUpdate.set(i.id, tt);
    });

    // Preparar items del catálogo antes de la transacciรณn
    const catalogItemsToCreate = Object.entries(validatedData.items || {})
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity], index) => ({
        cotizacion_id: validatedData.cotizacion_id,
        item_id: itemId,
        quantity,
        order: index,
        billing_type: billingTypeMap.get(itemId) || 'SERVICE', // Default SERVICE para compatibilidad legacy
        task_type: taskTypeMapUpdate.get(itemId) ?? undefined,
      }));

    // Obtener nombres de categoría y sección para custom items
    const categoriaIds = (validatedData.customItems || [])
      .map(item => item.categoriaId)
      .filter((id): id is string => !!id);
    
    const categoriasMap = new Map<string, { categoryName: string; sectionName: string | null }>();
    if (categoriaIds.length > 0) {
      const categorias = await prisma.studio_service_categories.findMany({
        where: { id: { in: categoriaIds } },
        include: {
          section_categories: {
            include: {
              service_sections: {
                select: { name: true },
              },
            },
          },
        },
      });
      
      categorias.forEach(categoria => {
        categoriasMap.set(categoria.id, {
          categoryName: categoria.name,
          sectionName: categoria.section_categories?.service_sections?.name || null,
        });
      });
    }

    // Preparar items personalizados
    const customItemsToCreate = (validatedData.customItems || []).map((customItem, index) => {
      const totalGastos = (customItem.expense || 0);
      const cantidadEfectiva = calcularCantidadEfectiva(
        customItem.billing_type || 'SERVICE',
        customItem.quantity,
        durationHours
      );
      
      // Obtener nombres de categoría y sección desde el mapa
      const categoriaInfo = customItem.categoriaId ? categoriasMap.get(customItem.categoriaId) : null;
      
      return {
        cotizacion_id: validatedData.cotizacion_id,
        item_id: null, // ⚠️ NULL para items personalizados
        service_category_id: customItem.categoriaId || null, // Guardar categoriaId para custom items
        original_service_id: customItem.originalItemId || null, // Guardar originalItemId si es reemplazo
        quantity: customItem.quantity,
        order: catalogItemsToCreate.length + index,
        billing_type: (customItem.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
        // Datos del item personalizado
        name: customItem.name,
        description: customItem.description || null,
        unit_price: customItem.unit_price,
        cost: customItem.cost || 0,
        expense: totalGastos,
        subtotal: customItem.unit_price * cantidadEfectiva,
        is_custom: true,
        // Snapshots iguales a campos operacionales para items custom
        name_snapshot: customItem.name,
        description_snapshot: customItem.description || null,
        category_name_snapshot: categoriaInfo?.categoryName || null,
        seccion_name_snapshot: categoriaInfo?.sectionName || null,
        category_name: categoriaInfo?.categoryName || null,
        seccion_name: categoriaInfo?.sectionName || null,
        unit_price_snapshot: customItem.unit_price,
        cost_snapshot: customItem.cost || 0,
        expense_snapshot: totalGastos,
        profit_snapshot: customItem.unit_price - (customItem.cost || 0) - totalGastos,
        public_price_snapshot: customItem.unit_price,
        profit_type_snapshot: customItem.tipoUtilidad || 'servicio',
      };
    });

    const allItemsToCreate = [...catalogItemsToCreate, ...customItemsToCreate];

    // Transacciรณn para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar cotizaciรณn
      const updateData: {
        name: string;
        description: string | null;
        price: number;
        precio_calculado?: number | null;
        visible_to_client?: boolean;
        event_duration?: number | null;
        updated_at: Date;
        items_cortesia: string[];
        bono_especial: number;
        condiciones_comerciales_id?: string | null;
        condiciones_visibles?: string[] | null;
      } = {
        name: validatedData.nombre,
        description: validatedData.descripcion || null,
        price: validatedData.precio,
        updated_at: new Date(),
        items_cortesia: validatedData.items_cortesia ?? [],
        bono_especial: validatedData.bono_especial ?? 0,
      };
      if (validatedData.precio_calculado !== undefined) {
        updateData.precio_calculado = validatedData.precio_calculado;
      }

      if (validatedData.condiciones_comerciales_id !== undefined) {
        let condicionId = validatedData.condiciones_comerciales_id ?? null;
        if (condicionId) {
          const existe = await tx.studio_condiciones_comerciales.findFirst({
            where: { id: condicionId, studio_id: studio.id },
            select: { id: true },
          });
          if (!existe) condicionId = null;
        }
        updateData.condiciones_comerciales_id = condicionId;
      }
      if (validatedData.condiciones_visibles !== undefined) {
        updateData.condiciones_visibles = validatedData.condiciones_visibles?.length ? validatedData.condiciones_visibles : null;
      }

      // Solo actualizar visible_to_client si se proporciona explícitamente
      if (validatedData.visible_to_client !== undefined) {
        updateData.visible_to_client = validatedData.visible_to_client;
      }

      // Solo actualizar event_duration si se proporciona explícitamente
      if (validatedData.event_duration !== undefined) {
        updateData.event_duration = validatedData.event_duration;
      }

      await tx.studio_cotizaciones.update({
        where: { id: validatedData.cotizacion_id },
        data: updateData,
      });

      // 2. Eliminar items existentes
      await tx.studio_cotizacion_items.deleteMany({
        where: {
          cotizacion_id: validatedData.cotizacion_id,
        },
      });

      // 3. Crear nuevos items (catálogo + custom)
      if (allItemsToCreate.length > 0) {
        await tx.studio_cotizacion_items.createMany({
          data: allItemsToCreate,
        });
      }

      // NOTA: No archivamos otras cotizaciones aqu?
      // El archivado solo ocurre cuando se autoriza una cotización (en autorizarCotizacion)
    });

    // Calcular y guardar precios de los items del catálogo (los custom ya tienen precios)
    if (catalogItemsToCreate.length > 0) {
      await calcularYGuardarPreciosCotizacion(
        validatedData.cotizacion_id, 
        validatedData.studio_slug,
        validatedData.itemOverrides
      ).catch((error) => {
        console.error('[COTIZACIONES] Error calculando precios:', error);
        // No fallar la actualizaciรณn si el cรกlculo de precios falla
      });
    }

    // Obtener cotizaciรณn actualizada con promise_id para redirección
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
        promise_id: true,
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
    revalidateTag(`quote-detail-${validatedData.cotizacion_id}`, 'max');
    if (cotizacion.promise_id) {
      revalidatePath(`/${validatedData.studio_slug}/studio/commercial/promises/${cotizacion.promise_id}`);
      // Las revisiones ahora se manejan como cotizaciones normales (flujo legacy eliminado)
    }

    return {
      success: true,
      data: {
        id: updated!.id,
        name: updated!.name,
        promise_id: updated!.promise_id || undefined,
        status: updated!.status,
        cotizacion: updated!,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error actualizando cotizaciรณn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar cotizaciรณn',
    };
  }
}

/**
 * Autorizar cotizaciรณn (NUEVO FLUJO - NO crea evento, solo cambia estado)
 * 
 * CAMBIO IMPORTANTE: Ahora solo marca la cotizaciรณn como "contract_pending"
 * El evento se crearรก DESPUร�S de que el cliente firme el contrato
 * 
 * Flujo:
 * 1. Validar cotizaciรณn y promesa
 * 2. Cambiar status a "contract_pending" 
 * 3. Mover promesa a etapa "approved"
 * 4. El cliente debe confirmar datos y firmar contrato
 * 5. El studio autoriza evento manualmente despuรฉs de firma
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

    // Obtener cotizaciรณn con relaciones
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
      return { success: false, error: 'La cotizaciรณn ya estรก autorizada' };
    }

    if (cotizacion.status === 'contract_pending' || cotizacion.status === 'contract_generated' || cotizacion.status === 'contract_signed') {
      return { success: false, error: 'La cotizaciรณn ya estรก en proceso de contrato' };
    }

    const contactId = cotizacion.contact_id || cotizacion.promise?.contact_id;
    if (!contactId) {
      return { success: false, error: 'La cotizaciรณn no tiene contacto asociado' };
    }

    // Validaciรณn: event_date debe existir antes de autorizar
    if (!cotizacion.promise?.event_date) {
      return {
        success: false,
        error: 'Debes confirmar la fecha del evento antes de autorizar la cotizaciรณn. Ve a la promesa y define la fecha del evento.'
      };
    }

    // promise_id es requerido
    if (!validatedData.promise_id) {
      return {
        success: false,
        error: 'Se requiere una promesa para autorizar la cotizaciรณn',
      };
    }

    // Verificar si ya existe un evento (para casos legacy o importaciรณn)
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
      return { success: false, error: 'No se encontrรณ la etapa de aprobaciรณn en el pipeline de promesas' };
    }

    // Transacciรณn para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar cotizaciรณn a "contract_pending" (NO crear evento todavรญa)
      await tx.studio_cotizaciones.update({
        where: { id: validatedData.cotizacion_id },
        data: {
          status: 'contract_pending', // Nuevo estado: esperando contrato
          condiciones_comerciales_id: validatedData.condiciones_comerciales_id,
          updated_at: new Date(),
          // NO asignar evento_id todavรญa
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

      // 3. Obtener etapa anterior antes de actualizar
      const promesaAnterior = await tx.studio_promises.findUnique({
        where: { id: validatedData.promise_id },
        select: {
          pipeline_stage_id: true,
          pipeline_stage: {
            select: { slug: true },
          },
        },
      });

      // 3.1. Mover promesa a etapa "approved"
      await tx.studio_promises.update({
        where: { id: validatedData.promise_id },
        data: {
          pipeline_stage_id: etapaAprobado.id,
          updated_at: new Date(),
        },
      });

      // 3.2. Registrar cambio en historial
      if (promesaAnterior && promesaAnterior.pipeline_stage_id !== etapaAprobado.id) {
        const { logPromiseStatusChange } = await import('./promise-status-history.actions');
        await logPromiseStatusChange({
          promiseId: validatedData.promise_id,
          fromStageId: promesaAnterior.pipeline_stage_id,
          toStageId: etapaAprobado.id,
          fromStageSlug: promesaAnterior.pipeline_stage?.slug || null,
          toStageSlug: 'approved',
          userId: null, // TODO: Obtener userId del contexto
          reason: "Autorización de cotización",
          metadata: {
            trigger: "quote_authorized",
            cotizacion_id: validatedData.cotizacion_id,
            monto: validatedData.monto,
          },
        }).catch((error) => {
          console.error('[AUTORIZACION] Error registrando historial:', error);
        });
      }

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
    }, {
      maxWait: 10000, // 10 segundos para iniciar la transacción
      timeout: 15000, // 15 segundos para completar la transacción (aumentado para operaciones complejas)
    });

    // Obtener la cotizaciรณn actualizada
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

    // Sincronizar short URL según nuevo estado
    const { syncShortUrlRoute } = await import('./promise-short-url.actions');
    await syncShortUrlRoute(validatedData.studio_slug, validatedData.promise_id).catch((error) => {
      console.error('[AUTORIZACION] Error sincronizando short URL:', error);
    });

    return {
      success: true,
      data: {
        id: cotizacionActualizada?.id || validatedData.cotizacion_id,
        name: cotizacionActualizada?.name || '',
        evento_id: eventoIdFinal || undefined,
      },
    };
  } catch (error) {
    console.error('[AUTORIZACION] Error autorizando cotizaciรณn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al autorizar cotizaciรณn',
    };
  }
}

/**
 * Cancela solo una cotizaciรณn autorizada/aprobada
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

    // Solo se pueden cancelar cotizaciones autorizadas, aprobadas o en cierre
    const estadosCancelables = ['aprobada', 'autorizada', 'approved', 'en_cierre'];
    if (!estadosCancelables.includes(cotizacion.status)) {
      return { success: false, error: 'Solo se pueden cancelar cotizaciones autorizadas, aprobadas o en cierre' };
    }

    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: {
        status: 'cancelada',
        selected_by_prospect: false, // Resetear flag de autorización
        evento_id: null, // Liberar relaciรณn con evento
        discount: null, // Limpiar descuento al cancelar
        updated_at: new Date(),
      },
    });

    // Sincronizar pipeline stage de la promesa
    if (cotizacion.promise_id) {
      const { syncPromisePipelineStageFromQuotes } = await import('./promise-pipeline-sync.actions');
      await syncPromisePipelineStageFromQuotes(cotizacion.promise_id, studio.id, null).catch((error) => {
        console.error('[COTIZACIONES] Error sincronizando pipeline:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
      
      // Sincronizar short URL según nuevo estado
      const { syncShortUrlRoute } = await import('./promise-short-url.actions');
      await syncShortUrlRoute(studioSlug, cotizacion.promise_id).catch((error) => {
        console.error('[COTIZACIONES] Error sincronizando short URL:', error);
      });
    }

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error cancelando cotizaciรณn:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar cotizaciรณn',
    };
  }
}

/**
 * Cancela una cotizaciรณn y elimina el evento asociado
 * - Cancela la cotizaciรณn
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
      // 1. Cancelar cotizaciรณn
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
          // Verificar si hay nรณminas pendientes asociadas al evento
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
              `No se puede eliminar el evento. Hay ${nominasPendientes.length} nรณmina(s) pendiente(s) asociada(s). Por favor, procesa o cancela las nรณminas pendientes antes de eliminar el evento.`
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
    }, {
      maxWait: 10000, // 10 segundos para iniciar la transacción
      timeout: 15000, // 15 segundos para completar la transacción
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
    }
    if (eventoId) {
      revalidatePath(`/${studioSlug}/studio/business/events`);
      revalidatePath(`/${studioSlug}/studio/business/events/${eventoId}`);
    }
    // Agenda ahora es un sheet, no necesita revalidaciรณn de ruta

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error cancelando cotizaciรณn y evento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar cotizaciรณn y evento',
    };
  }
}

/**
 * Datos para el modal Confirmar Cierre: condiciones disponibles + cotización (negociación, precio).
 */
export async function getDatosConfirmarCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<{
  success: boolean;
  data?: {
    cotizacion: {
      id: string;
      name: string;
      price: number;
      promise_id: string | null;
      /** Precio de lista (antes de descuentos de negociación). */
      precio_calculado: number | null;
      /** Descuento en monto por negociación (bono + cortesías). */
      bono_especial: number | null;
      /** Monto total de ítems marcados como cortesía. */
      cortesias_monto: number;
      /** Cantidad de ítems cortesía. */
      cortesias_count: number;
      /** IDs de condiciones visibles para esta cotización (relevancia). */
      condiciones_visibles: string[] | null;
      condicion_comercial_negociacion?: {
        id: string;
        name: string;
        advance_type: string | null;
        advance_percentage: number | null;
        advance_amount: number | null;
        discount_percentage: number | null;
      } | null;
      condiciones_comerciales_id: string | null;
      condiciones_comerciales?: { id: string; name: string; advance_type: string | null; advance_percentage: number | null; advance_amount: number | null; discount_percentage: number | null } | null;
    };
    condiciones: Array<{
      id: string;
      name: string;
      description: string | null;
      advance_type: string | null;
      advance_percentage: number | null;
      advance_amount: number | null;
      discount_percentage: number | null;
      type: string | null;
      is_public: boolean;
    }>;
  };
  error?: string;
}> {
  try {
    const { obtenerCondicionesComerciales } = await import('@/lib/actions/studio/config/condiciones-comerciales.actions');
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const [cotizacionRow, condResult] = await Promise.all([
      prisma.studio_cotizaciones.findFirst({
        where: { id: cotizacionId, studio_id: studio.id },
        select: {
          id: true,
          name: true,
          price: true,
          promise_id: true,
          precio_calculado: true,
          bono_especial: true,
          condiciones_visibles: true,
          items_cortesia: true,
          condiciones_comerciales_id: true,
          cotizacion_items: {
            select: {
              id: true,
              item_id: true,
              subtotal: true,
              unit_price: true,
              quantity: true,
              is_courtesy: true,
              unit_price_snapshot: true,
              public_price_snapshot: true,
            },
          },
          condicion_comercial_negociacion: {
            select: {
              id: true,
              name: true,
              advance_type: true,
              advance_percentage: true,
              advance_amount: true,
              discount_percentage: true,
            },
          },
          condiciones_comerciales: {
            select: {
              id: true,
              name: true,
              advance_type: true,
              advance_percentage: true,
              advance_amount: true,
              discount_percentage: true,
            },
          },
        },
      }),
      obtenerCondicionesComerciales(studioSlug),
    ]);

    if (!cotizacionRow) return { success: false, error: 'Cotización no encontrada' };
    if (!condResult.success || !condResult.data) return { success: false, error: condResult.error || 'Error al cargar condiciones' };

    const condiciones = condResult.data.map((c: { id: string; name: string; description?: string | null; advance_type?: string | null; advance_percentage?: number | null; advance_amount?: unknown; discount_percentage?: number | null; type?: string | null; is_public?: boolean }) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      advance_type: c.advance_type ?? null,
      advance_percentage: c.advance_percentage ?? null,
      advance_amount: c.advance_amount != null ? Number(c.advance_amount) : null,
      discount_percentage: c.discount_percentage ?? null,
      type: c.type ?? null,
      is_public: c.is_public !== false,
    }));

    const condicionesVisibles = Array.isArray(cotizacionRow.condiciones_visibles)
      ? (cotizacionRow.condiciones_visibles as string[])
      : null;

    const itemsCortesiaArr = Array.isArray(cotizacionRow.items_cortesia) ? (cotizacionRow.items_cortesia as string[]) : [];
    const itemsCortesiaIds = new Set(itemsCortesiaArr);
    const allItems = cotizacionRow.cotizacion_items ?? [];
    let cortesias_monto = 0;
    let cortesias_count = 0;
    for (const i of allItems) {
      const esCortesia = i.is_courtesy === true || itemsCortesiaIds.has(i.id) || (i.item_id != null && itemsCortesiaIds.has(i.item_id));
      if (!esCortesia) continue;
      cortesias_count += 1;
      const qty = i.quantity ?? 1;
      const precioUnit = Number(i.unit_price ?? 0);
      const snapshot = Number((i as { unit_price_snapshot?: number }).unit_price_snapshot ?? 0);
      const publicSnapshot = Number((i as { public_price_snapshot?: number }).public_price_snapshot ?? 0);
      const valorComercial = precioUnit > 0 ? precioUnit * qty : (snapshot > 0 ? snapshot : publicSnapshot) * qty;
      cortesias_monto += valorComercial > 0 ? valorComercial : Number(i.subtotal ?? 0);
    }

    return {
      success: true,
      data: {
        cotizacion: {
          id: cotizacionRow.id,
          name: cotizacionRow.name,
          price: Number(cotizacionRow.price),
          promise_id: cotizacionRow.promise_id,
          precio_calculado: cotizacionRow.precio_calculado != null ? Number(cotizacionRow.precio_calculado) : null,
          bono_especial: cotizacionRow.bono_especial != null ? Number(cotizacionRow.bono_especial) : null,
          cortesias_monto,
          cortesias_count,
          condiciones_visibles: condicionesVisibles?.length ? condicionesVisibles : null,
          condicion_comercial_negociacion: cotizacionRow.condicion_comercial_negociacion
            ? {
                id: cotizacionRow.condicion_comercial_negociacion.id,
                name: cotizacionRow.condicion_comercial_negociacion.name,
                advance_type: cotizacionRow.condicion_comercial_negociacion.advance_type,
                advance_percentage: cotizacionRow.condicion_comercial_negociacion.advance_percentage,
                advance_amount: cotizacionRow.condicion_comercial_negociacion.advance_amount != null ? Number(cotizacionRow.condicion_comercial_negociacion.advance_amount) : null,
                discount_percentage: cotizacionRow.condicion_comercial_negociacion.discount_percentage,
              }
            : null,
          condiciones_comerciales_id: cotizacionRow.condiciones_comerciales_id,
          condiciones_comerciales: cotizacionRow.condiciones_comerciales
            ? {
                id: cotizacionRow.condiciones_comerciales.id,
                name: cotizacionRow.condiciones_comerciales.name,
                advance_type: cotizacionRow.condiciones_comerciales.advance_type,
                advance_percentage: cotizacionRow.condiciones_comerciales.advance_percentage,
                advance_amount: cotizacionRow.condiciones_comerciales.advance_amount != null ? Number(cotizacionRow.condiciones_comerciales.advance_amount) : null,
                discount_percentage: cotizacionRow.condiciones_comerciales.discount_percentage,
              }
            : null,
        },
        condiciones,
      },
    };
  } catch (error) {
    console.error('[getDatosConfirmarCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cargar datos',
    };
  }
}

/**
 * Elimina la condición pactada (studio_condiciones_comerciales_negociacion) de esta cotización
 * cuando el usuario cierra el modal de confirmación de cierre sin confirmar (Cancelar / cerrar).
 * Evita condiciones huérfanas en el flujo de cierre.
 */
export async function limpiarCondicionPactadaAlCancelarCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    await prisma.studio_condiciones_comerciales_negociacion.deleteMany({
      where: {
        cotizacion_id: cotizacionId,
        studio_id: studio.id,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('[limpiarCondicionPactadaAlCancelarCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al limpiar condición',
    };
  }
}

/**
 * Actualiza el anticipo (advance_type, advance_percentage, advance_amount) en la condición de
 * negociación asociada a la cotización. Si no existe fila, crea una (nombre desde condición estándar o "Ajuste cierre").
 * Usado al confirmar el ajuste de anticipo en ConfirmarCierreModal.
 */
export async function actualizarAnticipoCondicionNegociacionCierre(
  studioSlug: string,
  cotizacionId: string,
  payload: { advance_type: 'percentage' | 'fixed_amount'; advance_percentage: number | null; advance_amount: number | null },
  nombreCondicion?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: { id: cotizacionId, promise: { studio_id: studio.id } },
      select: { promise_id: true },
    });
    if (!cotizacion?.promise_id) return { success: false, error: 'Cotización no encontrada' };

    const existing = await prisma.studio_condiciones_comerciales_negociacion.findUnique({
      where: { cotizacion_id: cotizacionId },
    });

    const advanceType = payload.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage';
    const advancePercentage = payload.advance_type === 'percentage' && payload.advance_percentage != null ? payload.advance_percentage : null;
    const advanceAmount = payload.advance_type === 'fixed_amount' && payload.advance_amount != null ? new Prisma.Decimal(payload.advance_amount) : null;

    if (existing) {
      await prisma.studio_condiciones_comerciales_negociacion.update({
        where: { id: existing.id },
        data: {
          advance_type: advanceType,
          advance_percentage: advancePercentage,
          advance_amount: advanceAmount,
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.studio_condiciones_comerciales_negociacion.create({
        data: {
          cotizacion_id: cotizacionId,
          promise_id: cotizacion.promise_id,
          studio_id: studio.id,
          name: nombreCondicion ?? 'Ajuste cierre',
          advance_type: advanceType,
          advance_percentage: advancePercentage,
          advance_amount: advanceAmount,
          is_temporary: true,
        },
      });
    }
    return { success: true };
  } catch (error) {
    console.error('[actualizarAnticipoCondicionNegociacionCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar anticipo',
    };
  }
}

/**
 * Auditoría de rentabilidad para el modal Confirmar Cierre (Solo Studio).
 * Pasamanos a calcularRentabilidadGlobal (SSOT); sin lógica de cálculo propia.
 */
export async function getAuditoriaRentabilidadCierre(
  studioSlug: string,
  cotizacionId: string
): Promise<{
  success: boolean;
  data?: { utilidadNeta: number; margenPorcentaje: number };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const [cotizacionRow, configRow] = await Promise.all([
      prisma.studio_cotizaciones.findFirst({
        where: { id: cotizacionId, promise: { studio_id: studio.id } },
        select: {
          price: true,
          event_duration: true,
          cotizacion_items: {
            select: {
              id: true,
              item_id: true,
              quantity: true,
              unit_price: true,
              subtotal: true,
              cost: true,
              expense: true,
              billing_type: true,
            },
          },
        },
      }),
      prisma.studio_configuraciones.findFirst({
        where: { studio_id: studio.id, status: 'active' },
        orderBy: { updated_at: 'desc' },
        select: { sales_commission: true },
      }),
    ]);

    if (!cotizacionRow) return { success: false, error: 'Cotización no encontrada' };

    const items: CotizacionItem[] = (cotizacionRow.cotizacion_items ?? []).map((i) => ({
      id: i.id,
      item_id: i.item_id,
      quantity: i.quantity ?? 1,
      unit_price: Number(i.unit_price ?? 0),
      subtotal: Number(i.subtotal ?? 0),
      cost: i.cost != null ? Number(i.cost) : null,
      expense: i.expense != null ? Number(i.expense) : null,
      billing_type: (i.billing_type as 'HOUR' | 'SERVICE' | 'UNIT') ?? 'SERVICE',
    }));

    const comisionRaw = configRow?.sales_commission ?? 0;
    const comisionVentaRatio = comisionRaw > 1 ? comisionRaw / 100 : comisionRaw;
    const precioFinalCierre = Number(cotizacionRow.price);
    const eventDuration = cotizacionRow.event_duration != null ? Number(cotizacionRow.event_duration) : null;

    const resultado = calcularRentabilidadGlobal({
      items,
      event_duration: eventDuration,
      precioFinalCierre,
      comisionVentaRatio,
    });

    return {
      success: true,
      data: {
        utilidadNeta: resultado.utilidadNeta,
        margenPorcentaje: resultado.margenPorcentaje,
      },
    };
  } catch (error) {
    console.error('[getAuditoriaRentabilidadCierre] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al calcular auditoría',
    };
  }
}

/** Opciones al pasar a cierre: condición estándar y/o ajuste de negociación (Fase 11.4) */
export interface PasarACierreOptions {
  condiciones_comerciales_id?: string | null;
  condicion_negociacion_ajuste?: {
    name: string;
    advance_type: 'percentage' | 'fixed_amount';
    advance_percentage?: number | null;
    advance_amount?: number | null;
    discount_percentage?: number | null;
  };
}

/**
 * Pasa una cotizaciรณn al estado "en_cierre"
 * - Cambia el status a 'en_cierre'
 * - Guarda el estado anterior (pendiente o negociacion) para poder restaurarlo al cancelar
 * - Solo puede haber una cotizaciรณn en cierre a la vez por promesa
 * - Si options.condiciones_comerciales_id: vincula esa condición al registro de cierre.
 * - Si options.condicion_negociacion_ajuste: crea/actualiza condición de negociación para la cotización y no vincula condición estándar.
 */
export async function pasarACierre(
  studioSlug: string,
  cotizacionId: string,
  options?: PasarACierreOptions
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

    // Verificar que la cotización NO esté ya en cierre
    if (cotizacion.status === 'en_cierre') {
      return { success: false, error: 'Esta cotización ya está en proceso de cierre' };
    }

    // Verificar que la cotización esté en estado pendiente o negociación
    if (cotizacion.status !== 'pendiente' && cotizacion.status !== 'negociacion') {
      return { success: false, error: 'Solo se pueden pasar a cierre cotizaciones pendientes o en negociación' };
    }

    // Verificar que no haya otra cotizaciรณn en cierre en la misma promesa
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
        error: 'Ya existe otra cotizaciรณn en proceso de cierre. Cancela el cierre de la otra cotizaciรณn primero.' 
      };
    }

    const condicionId = options?.condiciones_comerciales_id ?? null;
    const ajuste = options?.condicion_negociacion_ajuste;

    await prisma.$transaction(async (tx) => {
      // 0. Si hay ajuste de negociación: crear/actualizar condición de negociación para esta cotización
      if (ajuste && cotizacion.promise_id) {
        await tx.studio_condiciones_comerciales_negociacion.deleteMany({
          where: { cotizacion_id: cotizacionId },
        });
        await tx.studio_condiciones_comerciales_negociacion.create({
          data: {
            cotizacion_id: cotizacionId,
            promise_id: cotizacion.promise_id,
            studio_id: studio.id,
            name: ajuste.name.trim(),
            description: null,
            discount_percentage: ajuste.discount_percentage ?? null,
            advance_type: ajuste.advance_type === 'fixed_amount' ? 'fixed_amount' : 'percentage',
            advance_percentage: ajuste.advance_type === 'percentage' && ajuste.advance_percentage != null ? ajuste.advance_percentage : null,
            advance_amount: ajuste.advance_type === 'fixed_amount' && ajuste.advance_amount != null ? new Prisma.Decimal(ajuste.advance_amount) : null,
            metodo_pago_id: null,
            is_temporary: true,
          },
        });
        await tx.studio_cotizaciones.update({
          where: { id: cotizacionId },
          data: { condiciones_comerciales_id: null, updated_at: new Date() },
        });
      }

      // 1. Pasar cotizaciรณn a cierre
      const previousStatus = cotizacion.status;
      
      await tx.studio_cotizaciones.update({
        where: { id: cotizacionId },
        data: {
          status: 'en_cierre',
          selected_by_prospect: false,
          selected_at: new Date(),
          updated_at: new Date(),
        },
      });

      // 2. Crear/actualizar registro de cierre con condición si se proporcionó (y no es ajuste negociación)
      const registroCondicionId = ajuste ? null : condicionId;
      const registroCondicionDefinidas = !!registroCondicionId || !!ajuste;

      await tx.studio_cotizaciones_cierre.upsert({
        where: { cotizacion_id: cotizacionId },
        create: {
          cotizacion_id: cotizacionId,
          previous_status: previousStatus,
          condiciones_comerciales_id: registroCondicionId,
          condiciones_comerciales_definidas: registroCondicionDefinidas,
        },
        update: {
          previous_status: previousStatus,
          condiciones_comerciales_id: registroCondicionId,
          condiciones_comerciales_definidas: registroCondicionDefinidas,
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

      // 3. Archivar las demás cotizaciones de la misma promesa (homólogo al flujo público)
      // Así listados y pipeline solo consideran la cotización en cierre; al cancelar cierre se desarchivan.
      if (cotizacion.promise_id) {
        await tx.studio_cotizaciones.updateMany({
          where: {
            promise_id: cotizacion.promise_id,
            id: { not: cotizacionId },
            status: { in: ['pendiente', 'negociacion'] },
            archived: false,
          },
          data: {
            archived: true,
            updated_at: new Date(),
          },
        });
      }
    });

    // Sincronizar pipeline stage de la promesa
    if (cotizacion.promise_id) {
      const { syncPromisePipelineStageFromQuotes } = await import('./promise-pipeline-sync.actions');
      await syncPromisePipelineStageFromQuotes(cotizacion.promise_id, studio.id, null).catch((error) => {
        console.error('[COTIZACIONES] Error sincronizando pipeline:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidateTag(`promises-list-${studioSlug}`, 'max'); // Invalidar caché de lista (con studioSlug para aislamiento entre tenants)
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
      // ⚠️ CRÍTICO: Invalidar layout de rutas públicas para forzar frescura
      revalidatePath(`/${studioSlug}/promise/${cotizacion.promise_id}`, 'layout');
      revalidatePath(`/${studioSlug}/promise/${cotizacion.promise_id}/pendientes`, 'layout');
      revalidatePath(`/${studioSlug}/promise/${cotizacion.promise_id}/cierre`, 'layout');
      // Invalidar tag específico para forzar revalidación del estado de la promesa
      revalidateTag(`promise-state-${cotizacion.promise_id}`, 'max');
      revalidateTag(`public-promise-route-state-${studioSlug}-${cotizacion.promise_id}`, 'max');
    }

    return {
      success: true,
      data: {
        id: cotizacion.id,
        name: cotizacion.name,
      },
    };
  } catch (error) {
    console.error('[COTIZACIONES] Error pasando cotizaciรณn a cierre:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al pasar cotizaciรณn a cierre',
    };
  }
}

/**
 * Cancela el proceso de cierre de una cotizaciรณn
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

    // Verificar que la cotizaciรณn estรฉ en cierre
    if (cotizacion.status !== 'en_cierre') {
      return { success: false, error: 'Solo se pueden cancelar cotizaciones en proceso de cierre' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Obtener el estado anterior guardado en el registro de cierre
      const registroCierre = await tx.studio_cotizaciones_cierre.findUnique({
        where: { cotizacion_id: cotizacionId },
        select: { previous_status: true },
      });

      // 2. Restaurar el estado anterior (pendiente o negociacion)
      // Si no hay registro o no tiene previous_status, usar 'pendiente' por defecto
      const statusToRestore = registroCierre?.previous_status || 'pendiente';

      await tx.studio_cotizaciones.update({
        where: { id: cotizacionId },
        data: {
          status: statusToRestore,
          selected_by_prospect: false,
          selected_at: null,
          updated_at: new Date(),
        },
      });

      // 3. Eliminar registro de cierre
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
    }, {
      maxWait: 10000, // 10 segundos para iniciar la transacción
      timeout: 15000, // 15 segundos para completar la transacción
    });

    // Sincronizar pipeline stage de la promesa
    // Esto actualizará el pipeline a "pending" o "negotiation" según el estado de las cotizaciones
    if (cotizacion.promise_id) {
      const { syncPromisePipelineStageFromQuotes } = await import('./promise-pipeline-sync.actions');
      await syncPromisePipelineStageFromQuotes(cotizacion.promise_id, studio.id, null).catch((error) => {
        console.error('[COTIZACIONES] Error sincronizando pipeline al cancelar cierre:', error);
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    if (cotizacion.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}`);
      // ⚠️ CRÍTICO: Invalidar caché de route state público para evitar bucle infinito
      // Cuando se cancela el cierre, el status cambia a pendiente pero el caché puede seguir mostrando en_cierre
      revalidateTag(`public-promise-route-state-${studioSlug}-${cotizacion.promise_id}`, 'max');
      
      // Sincronizar short URL según nuevo estado
      const { syncShortUrlRoute } = await import('./promise-short-url.actions');
      await syncShortUrlRoute(studioSlug, cotizacion.promise_id).catch((error) => {
        console.error('[COTIZACIONES] Error sincronizando short URL:', error);
      });
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

