'use server';

/**
 * Server Actions para manejo de eventos del cliente
 * Adaptado de migrate/cliente/_lib/actions/evento.actions.ts
 */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { ClientEvent, ClientEventDetail, ApiResponse } from '@/types/client';
import type { PublicSeccionData } from '@/types/public-promise';
import { construirEstructuraJerarquicaCotizacion, COTIZACION_ITEMS_SELECT_STANDARD } from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';

/**
 * Obtiene todos los eventos contratados del cliente (promesas autorizadas)
 */
export async function obtenerEventosCliente(contactId: string): Promise<ApiResponse<ClientEvent[]>> {
  try {
    const promises = await prisma.studio_promises.findMany({
      where: {
        contact_id: contactId,
        quotes: {
          some: {
            status: { in: ['aprobada', 'autorizada', 'approved'] },
          },
        },
      },
      select: {
        id: true,
        name: true,
        event_date: true,
        event_location: true,
        studio: {
          select: {
            slug: true,
          },
        },
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        quotes: {
          where: { status: { in: ['aprobada', 'autorizada', 'approved'] } },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discount: true,
            status: true,
            cotizacion_items: {
              select: {
                ...COTIZACION_ITEMS_SELECT_STANDARD,
                subtotal: true,
              },
              orderBy: { order: 'asc' },
            },
            pagos: {
              where: {
                status: { in: ['paid', 'completed'] },
              },
              select: {
                amount: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { event_date: 'desc' },
    });

    // Obtener catálogos únicos por studio para evitar consultas duplicadas
    const studioSlugs = new Set(promises.map(p => p.studio.slug));
    const catalogosMap = new Map<string, SeccionData[]>();

    for (const slug of studioSlugs) {
      const catalogoResult = await obtenerCatalogo(slug, false);
      if (catalogoResult.success && catalogoResult.data) {
        catalogosMap.set(slug, catalogoResult.data);
      }
    }

    const eventos = await Promise.all(promises.map(async (promise) => {
      const cotizacion = promise.quotes[0];

      if (!cotizacion) {
        return null;
      }

      // Calcular totales
      // El descuento viene como monto absoluto en $ (no como factor decimal)
      const precioBase = cotizacion.price || 0;
      const descuento = cotizacion.discount || null;
      const descuentoEnDolares = descuento || 0;
      const total = precioBase - descuentoEnDolares;
      const pagado = cotizacion.pagos.reduce((sum, pago) => sum + Number(pago.amount), 0);
      const pendiente = total - pagado;

      // Agrupar servicios usando la estructura de la cotización (como en ResumenCotizacion.tsx)
      // Los items ya vienen ordenados por order: 'asc' desde la consulta
      // Usamos los snapshots guardados (seccion_name, category_name) para agrupar
      const serviciosAgrupados = agruparServiciosPorCotizacion(cotizacion.cotizacion_items);

      return {
        id: promise.id,
        name: promise.name,
        event_date: promise.event_date?.toISOString() || '',
        event_location: promise.event_location,
        event_type: promise.event_type,
        cotizacion: {
          id: cotizacion.id,
          status: cotizacion.status,
          total,
          pagado,
          pendiente,
          descuento,
          servicios: serviciosAgrupados,
        },
      };
    }));

    const eventosFiltrados: ClientEvent[] = eventos.filter((evento): evento is ClientEvent => evento !== null);

    return {
      success: true,
      data: eventosFiltrados,
    };
  } catch (error) {
    console.error('[obtenerEventosCliente] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener eventos',
    };
  }
}

/**
 * Obtiene el detalle completo de un evento
 * Acepta tanto event_id (studio_events) como promise_id (studio_promises)
 */
export async function obtenerEventoDetalle(eventIdOrPromiseId: string, contactId: string): Promise<ApiResponse<ClientEventDetail>> {
  try {
    let promiseId = eventIdOrPromiseId;

    // Verificar si es un event_id (studio_events) o promise_id (studio_promises)
    const event = await prisma.studio_events.findUnique({
      where: { id: eventIdOrPromiseId },
      select: {
        id: true,
        promise_id: true,
        contact_id: true,
        stage_id: true,
        stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
            stage_type: true,
          },
        },
      },
    });

    if (event) {
      // Es un event_id, usar el promise_id asociado
      if (event.contact_id !== contactId) {
        return {
          success: false,
          message: 'No tienes acceso a este evento',
        };
      }
      promiseId = event.promise_id;
    }

    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        contact_id: contactId,
        quotes: {
          some: {
            status: { in: ['aprobada', 'autorizada', 'approved'] },
          },
        },
      },
      select: {
        id: true,
        name: true,
        event_date: true,
        event_location: true,
        address: true,
        studio: {
          select: {
            slug: true,
          },
        },
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            stage_id: true,
            stage: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
                order: true,
                stage_type: true,
              },
            },
          },
        },
        quotes: {
          where: { status: { in: ['aprobada', 'autorizada', 'approved'] } },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discount: true,
            status: true,
            cotizacion_items: {
              select: {
                ...COTIZACION_ITEMS_SELECT_STANDARD,
                subtotal: true,
              },
              orderBy: { order: 'asc' },
            },
            pagos: {
              where: {
                status: { in: ['paid', 'completed'] },
              },
              select: {
                amount: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!promise || !promise.quotes || promise.quotes.length === 0) {
      return {
        success: false,
        message: 'Evento no encontrado',
      };
    }

    // Procesar todas las cotizaciones aprobadas
    const cotizaciones = promise.quotes.map((cotizacion) => {
      // Calcular totales por cotización
      const precioBase = cotizacion.price || 0;
      const descuento = cotizacion.discount || null;
      const descuentoEnDolares = descuento || 0;
      const total = precioBase - descuentoEnDolares;
      const pagado = cotizacion.pagos.reduce((sum, pago) => sum + Number(pago.amount), 0);
      const pendiente = total - pagado;

      // Agrupar servicios usando la estructura de la cotización
      const serviciosAgrupados = agruparServiciosPorCotizacion(cotizacion.cotizacion_items);

      return {
        id: cotizacion.id,
        name: cotizacion.name,
        status: cotizacion.status,
        total,
        pagado,
        pendiente,
        descuento,
        descripcion: cotizacion.description,
        servicios: serviciosAgrupados,
      };
    });

    // Calcular totales consolidados (suma de todas las cotizaciones)
    const totalConsolidado = cotizaciones.reduce((sum, cot) => sum + cot.total, 0);
    const pagadoConsolidado = cotizaciones.reduce((sum, cot) => sum + cot.pagado, 0);
    const pendienteConsolidado = cotizaciones.reduce((sum, cot) => sum + cot.pendiente, 0);
    const descuentoConsolidado = cotizaciones.reduce((sum, cot) => sum + (cot.descuento || 0), 0);

    // Obtener pipeline stage del evento (si existe)
    const pipelineStage = promise.event?.stage ? {
      id: promise.event.stage.id,
      name: promise.event.stage.name,
      slug: promise.event.stage.slug,
      color: promise.event.stage.color,
      order: promise.event.stage.order,
      stage_type: promise.event.stage.stage_type,
    } : null;

    const eventoDetalle: ClientEventDetail = {
      id: promise.id,
      name: promise.name,
      event_date: promise.event_date?.toISOString() || '',
      event_location: promise.event_location,
      address: promise.address,
      event_type: promise.event_type,
      cotizaciones,
      total: totalConsolidado,
      pagado: pagadoConsolidado,
      pendiente: pendienteConsolidado,
      descuento: descuentoConsolidado > 0 ? descuentoConsolidado : null,
      pipeline_stage: pipelineStage,
    };

    return {
      success: true,
      data: eventoDetalle,
    };
  } catch (error) {
    console.error('[obtenerEventoDetalle] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener detalle del evento',
    };
  }
}

/**
 * Agrupa items de cotización por sección -> categoría -> items
 * Usa la función centralizada construirEstructuraJerarquicaCotizacion
 * y adapta el formato a PublicSeccionData[]
 */
function agruparServiciosPorCotizacion(
  items: Array<{
    id: string;
    item_id: string | null;
    name: string | null;
    description: string | null;
    unit_price: number;
    quantity: number;
    order: number;
    category_name: string | null;
    seccion_name: string | null;
    // Snapshots (si están disponibles)
    name_snapshot?: string | null;
    description_snapshot?: string | null;
    category_name_snapshot?: string | null;
    seccion_name_snapshot?: string | null;
    subtotal?: number;
  }>
): PublicSeccionData[] {
  // Filtrar items sin item_id
  const itemsFiltrados = items.filter(item => item.item_id !== null);

  // Usar función centralizada para construir estructura jerárquica
  const estructura = construirEstructuraJerarquicaCotizacion(
    itemsFiltrados.map(item => ({
      item_id: item.item_id!,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal ?? (item.unit_price * item.quantity),
      order: item.order,
      // Snapshots primero, luego campos operacionales
      name_snapshot: item.name_snapshot,
      description_snapshot: item.description_snapshot,
      category_name_snapshot: item.category_name_snapshot,
      seccion_name_snapshot: item.seccion_name_snapshot,
      name: item.name,
      description: item.description,
      category_name: item.category_name,
      seccion_name: item.seccion_name,
      id: item.id,
    })),
    {
      incluirPrecios: true,
      incluirDescripciones: true,
      ordenarPor: 'insercion', // Mantener orden de inserción para cliente
    }
  );

  // Convertir formato de EstructuraJerarquica a PublicSeccionData[]
  return estructura.secciones.map(seccion => ({
    id: seccion.nombre,
    nombre: seccion.nombre,
    orden: seccion.orden,
    categorias: seccion.categorias.map(categoria => ({
      id: categoria.nombre,
      nombre: categoria.nombre,
      orden: categoria.orden,
      servicios: categoria.items.map(item => ({
        id: item.item_id || item.id || '',
        name: item.nombre,
        description: item.descripcion || null,
        price: item.unit_price,
        quantity: item.cantidad,
      })),
    })),
  }));
}

/**
 * Actualizar información básica del evento (nombre y sede)
 * Solo permite actualizar si el cliente tiene acceso al evento
 */
export async function actualizarEventoInfo(
  promiseId: string,
  contactId: string,
  data: { name?: string | null; event_location?: string | null }
): Promise<ApiResponse<{ name: string | null; event_location: string | null }>> {
  try {
    // Verificar que el cliente tenga acceso al evento
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        contact_id: contactId,
        quotes: {
          some: {
            status: { in: ['aprobada', 'autorizada', 'approved'] },
          },
        },
      },
      include: {
        event: {
          select: {
            id: true,
          },
        },
        studio: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        message: 'No tienes acceso a este evento',
      };
    }

    // Guardar valores anteriores (normalizados para comparación)
    const normalizeValue = (value: string | null | undefined): string | null => {
      if (value === null || value === undefined) return null;
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    };

    const oldName = normalizeValue(promise.name);
    const oldLocation = normalizeValue(promise.event_location);

    const oldValues: Record<string, unknown> = {
      name: oldName,
      event_location: oldLocation,
    };

    // Actualizar solo los campos proporcionados
    const updateData: { name?: string | null; event_location?: string | null } = {};
    if (data.name !== undefined) {
      updateData.name = normalizeValue(data.name);
    }
    if (data.event_location !== undefined) {
      updateData.event_location = normalizeValue(data.event_location);
    }

    const updatedPromise = await prisma.studio_promises.update({
      where: { id: promiseId },
      data: updateData,
      select: {
        name: true,
        event_location: true,
      },
    });

    // Normalizar valores actualizados para comparación
    const newName = normalizeValue(updatedPromise.name);
    const newLocation = normalizeValue(updatedPromise.event_location);

    // Detectar campos cambiados y enviar notificación
    // Solo detectar cambios en campos que realmente se intentaron actualizar
    if (promise.event?.id) {
      const fieldsChanged: string[] = [];
      const newValues: Record<string, unknown> = {};

      // Solo verificar name si se intentó actualizar
      if (data.name !== undefined) {
        if (oldName !== newName) {
          fieldsChanged.push('name');
          newValues.name = newName;
        }
      }

      // Solo verificar event_location si se intentó actualizar
      if (data.event_location !== undefined) {
        if (oldLocation !== newLocation) {
          fieldsChanged.push('event_location');
          newValues.event_location = newLocation;
        }
      }

      // Enviar notificación si hay cambios
      if (fieldsChanged.length > 0) {
        try {
          const { notifyClientEventInfoUpdated } = await import('@/lib/notifications/studio/helpers/client-updates-notifications');
          await notifyClientEventInfoUpdated(promise.event.id, fieldsChanged, oldValues, newValues);
        } catch (error) {
          console.error('[actualizarEventoInfo] Error enviando notificación:', error);
          // No fallar la actualización si falla la notificación
        }
      }

      // Revalidar páginas relacionadas con el evento
      if (promise.studio?.slug) {
        revalidatePath(`/${promise.studio.slug}/cliente/${contactId}/${promise.event.id}`, 'page');
        revalidatePath(`/${promise.studio.slug}/cliente/${contactId}/${promiseId}`, 'page');
      }
    }

    return {
      success: true,
      data: {
        name: updatedPromise.name,
        event_location: updatedPromise.event_location,
      },
    };
  } catch (error) {
    console.error('[actualizarEventoInfo] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al actualizar el evento',
    };
  }
}

