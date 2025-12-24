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
                id: true,
                item_id: true,
                name: true,
                description: true,
                unit_price: true,
                quantity: true,
                order: true,
                category_name: true,
                seccion_name: true,
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
                id: true,
                item_id: true,
                name: true,
                description: true,
                unit_price: true,
                quantity: true,
                order: true,
                category_name: true,
                seccion_name: true,
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
 * Usa la estructura de la cotización (snapshots guardados)
 * Mantiene el orden de los items según el campo 'order' de cotizacion_items
 * (Igual que en ResumenCotizacion.tsx)
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
  }>
): PublicSeccionData[] {
  // Los items ya vienen ordenados por order: 'asc' desde la consulta
  // Agrupar por sección y categoría usando los snapshots guardados
  const seccionesMap = new Map<string, PublicSeccionData>();

  items.forEach((item) => {
    if (!item.item_id) return;

    const seccionName = item.seccion_name || 'Sin sección';
    const categoriaName = item.category_name || 'Sin categoría';

    // Obtener o crear sección
    if (!seccionesMap.has(seccionName)) {
      seccionesMap.set(seccionName, {
        id: seccionName,
        nombre: seccionName,
        orden: 0, // No importa el orden numérico, mantenemos orden de inserción
        categorias: [],
      });
    }

    const seccion = seccionesMap.get(seccionName)!;

    // Buscar o crear categoría
    let categoria = seccion.categorias.find((cat) => cat.nombre === categoriaName);
    if (!categoria) {
      categoria = {
        id: categoriaName,
        nombre: categoriaName,
        orden: 0, // No importa el orden numérico, mantenemos orden de inserción
        servicios: [],
      };
      seccion.categorias.push(categoria);
    }

    // Agregar servicio manteniendo el orden de los items (order de cotizacion_items)
    categoria.servicios.push({
      id: item.item_id,
      name: item.name || 'Servicio sin nombre',
      description: item.description,
      price: item.unit_price,
      quantity: item.quantity,
    });
  });

  // Convertir Map a Array manteniendo el orden de inserción
  return Array.from(seccionesMap.values());
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

    // Guardar valores anteriores
    const oldValues: Record<string, unknown> = {
      name: promise.name,
      event_location: promise.event_location,
    };

    // Actualizar solo los campos proporcionados
    const updateData: { name?: string | null; event_location?: string | null } = {};
    if (data.name !== undefined) {
      updateData.name = data.name?.trim() || null;
    }
    if (data.event_location !== undefined) {
      updateData.event_location = data.event_location?.trim() || null;
    }

    const updatedPromise = await prisma.studio_promises.update({
      where: { id: promiseId },
      data: updateData,
      select: {
        name: true,
        event_location: true,
      },
    });

    // Detectar campos cambiados y enviar notificación
    if (promise.event?.id) {
      const fieldsChanged: string[] = [];
      const newValues: Record<string, unknown> = {};

      if (oldValues.name !== updatedPromise.name) {
        fieldsChanged.push('name');
        newValues.name = updatedPromise.name;
      }
      if (oldValues.event_location !== updatedPromise.event_location) {
        fieldsChanged.push('event_location');
        newValues.event_location = updatedPromise.event_location;
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

