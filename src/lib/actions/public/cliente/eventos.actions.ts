'use server';

/**
 * Server Actions para manejo de eventos del cliente
 * Adaptado de migrate/cliente/_lib/actions/evento.actions.ts
 */

import { prisma } from '@/lib/prisma';
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
              include: {
                items: {
                  select: {
                    id: true,
                    name: true,
                    service_categories: {
                      select: {
                        id: true,
                        name: true,
                        section_categories: {
                          select: {
                            id: true,
                            service_sections: {
                              select: {
                                id: true,
                                name: true,
                                order: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
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
          take: 1,
        },
      },
      orderBy: { event_date: 'desc' },
    });

    const eventos: ClientEvent[] = promises.map((promise) => {
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

      // Agrupar servicios por sección -> categoría -> items
      const serviciosAgrupados = agruparServiciosPorSeccion(cotizacion.cotizacion_items);

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
    }).filter((evento): evento is ClientEvent => evento !== null);

    return {
      success: true,
      data: eventos,
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
 */
export async function obtenerEventoDetalle(promiseId: string, contactId: string): Promise<ApiResponse<ClientEventDetail>> {
  try {
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
              include: {
                items: {
                  select: {
                    id: true,
                    name: true,
                    service_categories: {
                      select: {
                        id: true,
                        name: true,
                        section_categories: {
                          select: {
                            id: true,
                            service_sections: {
                              select: {
                                id: true,
                                name: true,
                                order: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
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
          take: 1,
        },
      },
    });

    if (!promise || !promise.quotes[0]) {
      return {
        success: false,
        message: 'Evento no encontrado',
      };
    }

    const cotizacion = promise.quotes[0];

    // Calcular totales
    // El descuento viene como monto absoluto en $ (no como factor decimal)
    const precioBase = cotizacion.price || 0;
    const descuento = cotizacion.discount || null;
    const descuentoEnDolares = descuento || 0;
    const total = precioBase - descuentoEnDolares;
    const pagado = cotizacion.pagos.reduce((sum, pago) => sum + Number(pago.amount), 0);
    const pendiente = total - pagado;

    // Agrupar servicios
    const serviciosAgrupados = agruparServiciosPorSeccion(cotizacion.cotizacion_items);

    const eventoDetalle: ClientEventDetail = {
      id: promise.id,
      name: promise.name,
      event_date: promise.event_date?.toISOString() || '',
      event_location: promise.event_location,
      address: promise.address,
      event_type: promise.event_type,
      cotizacion: {
        id: cotizacion.id,
        status: cotizacion.status,
        total,
        pagado,
        pendiente,
        descuento,
        descripcion: cotizacion.description,
        servicios: serviciosAgrupados,
      },
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
 * Retorna estructura compatible con PublicServiciosTree
 */
function agruparServiciosPorSeccion(items: any[]): PublicSeccionData[] {
  const seccionesMap = new Map<string, PublicSeccionData>();

  items.forEach((item) => {
    // Usar snapshots si existen, sino usar relaciones
    const seccionId = item.items?.service_categories?.section_categories?.service_sections?.id ||
      item.seccion_name_snapshot || 'sin-seccion';
    const seccionName = item.seccion_name_snapshot ||
      item.items?.service_categories?.section_categories?.service_sections?.name ||
      'Sin sección';
    const seccionOrder = item.items?.service_categories?.section_categories?.service_sections?.order || 999;

    const categoriaId = item.items?.service_categories?.id ||
      item.category_name_snapshot || 'sin-categoria';
    const categoriaName = item.category_name_snapshot ||
      item.items?.service_categories?.name || 'Sin categoría';

    // Obtener o crear sección
    if (!seccionesMap.has(seccionId)) {
      seccionesMap.set(seccionId, {
        id: seccionId,
        nombre: seccionName,
        orden: seccionOrder,
        categorias: [],
      });
    }

    const seccion = seccionesMap.get(seccionId)!;

    // Buscar o crear categoría
    let categoria = seccion.categorias.find((cat) => cat.id === categoriaId);
    if (!categoria) {
      categoria = {
        id: categoriaId,
        nombre: categoriaName,
        orden: 0,
        servicios: [],
      };
      seccion.categorias.push(categoria);
    }

    // Agregar servicio
    categoria.servicios.push({
      id: item.id,
      name: item.name_snapshot || item.name || item.items?.name || 'Servicio sin nombre',
      description: item.description_snapshot || item.description || item.items?.description || null,
      price: item.unit_price_snapshot || item.unit_price || 0,
      quantity: item.quantity || 1,
    });
  });

  // Convertir Map a Array y ordenar
  return Array.from(seccionesMap.values()).sort((a, b) => a.orden - b.orden);
}

