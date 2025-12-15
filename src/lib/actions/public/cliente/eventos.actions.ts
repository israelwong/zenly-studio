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
        status: 'authorized',
        quotes: {
          some: {
            status: 'authorized',
          },
        },
      },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        quotes: {
          where: { status: 'authorized' },
          include: {
            items: {
              include: {
                catalog_item: {
                  select: {
                    id: true,
                    name: true,
                    catalog_category: {
                      select: {
                        id: true,
                        name: true,
                        catalog_section: {
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
              orderBy: [
                { catalog_item: { catalog_category: { catalog_section: { order: 'asc' } } } },
                { catalog_item: { catalog_category: { order: 'asc' } } },
                { catalog_item: { order: 'asc' } },
              ],
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
      const total = cotizacion.total || 0;
      const descuento = cotizacion.discount || null;
      const pagado = cotizacion.pagos.reduce((sum, pago) => sum + pago.amount, 0);
      const pendiente = total - pagado;

      // Agrupar servicios por sección -> categoría -> items
      const serviciosAgrupados = agruparServiciosPorSeccion(cotizacion.items);

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
        status: 'authorized',
      },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        quotes: {
          where: { status: 'authorized' },
          include: {
            items: {
              include: {
                catalog_item: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    catalog_category: {
                      select: {
                        id: true,
                        name: true,
                        catalog_section: {
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
              orderBy: [
                { catalog_item: { catalog_category: { catalog_section: { order: 'asc' } } } },
                { catalog_item: { catalog_category: { order: 'asc' } } },
                { catalog_item: { order: 'asc' } },
              ],
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
    const total = cotizacion.total || 0;
    const descuento = cotizacion.discount || null;
    const pagado = cotizacion.pagos.reduce((sum, pago) => sum + pago.amount, 0);
    const pendiente = total - pagado;

    // Agrupar servicios
    const serviciosAgrupados = agruparServiciosPorSeccion(cotizacion.items);

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
    const seccionId = item.catalog_item?.catalog_category?.catalog_section?.id || 'sin-seccion';
    const seccionName = item.seccion_snapshot || item.catalog_item?.catalog_category?.catalog_section?.name || 'Sin sección';
    const seccionOrder = item.catalog_item?.catalog_category?.catalog_section?.order || 999;

    const categoriaId = item.catalog_item?.catalog_category?.id || 'sin-categoria';
    const categoriaName = item.categoria_snapshot || item.catalog_item?.catalog_category?.name || 'Sin categoría';

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
      name: item.nombre_snapshot || item.catalog_item?.name || 'Servicio sin nombre',
      description: item.catalog_item?.description || null,
      price: item.unit_price || 0,
      quantity: item.quantity || 1,
    });
  });

  // Convertir Map a Array y ordenar
  return Array.from(seccionesMap.values()).sort((a, b) => a.orden - b.orden);
}

