'use server'
import { prisma } from '@/lib/prisma';
import { EventosConDetallesArraySchema, EventoConDetalles, EventosPorEtapaArraySchema, EventoPorEtapa } from './evento.schemas';
import { EVENTO_STATUS } from '../../constants/status';

/**
 * Obtiene los eventos que pertenecen a una o más etapas específicas,
 * incluyendo detalles de las relaciones (Cliente, EventoTipo, EventoEtapa).
 * Los datos son validados contra el esquema de Zod.
 *
 * @param etapaIds - Un array de IDs de las etapas de evento.
 * @returns Una promesa que resuelve a un array de eventos con detalles.
 */
export async function getEventosConDetallesPorEtapa(etapaIds: string[]): Promise<EventoConDetalles[]> {
    try {
        const eventos = await prisma.evento.findMany({
            where: {
                eventoEtapaId: {
                    in: etapaIds,
                },
                status: {
                    not: EVENTO_STATUS.ARCHIVED // Excluir solo eventos archivados
                }
            },
            include: {
                Cliente: {
                    select: { nombre: true },
                },
                EventoTipo: {
                    select: { nombre: true },
                },
                EventoEtapa: {
                    select: { nombre: true, posicion: true },
                },
            },
            orderBy: {
                fecha_evento: 'asc', // Ordenamos por la fecha más próxima
            },
        });

        // Validar los datos con Zod antes de retornarlos
        const validatedEventos = EventosConDetallesArraySchema.safeParse(eventos);

        if (!validatedEventos.success) {
            console.error('Error de validación de Zod:', validatedEventos.error.flatten().fieldErrors);
            throw new Error('Los datos de los eventos no pasaron la validación.');
        }

        return validatedEventos.data;
    } catch (error) {
        console.error('Error al obtener eventos con detalles:', error);
        // Podríamos retornar un array vacío o relanzar el error dependiendo del caso de uso
        return [];
    }
}

/**
 * Obtiene los eventos pendientes que pertenecen a una o más etapas específicas por posición.
 * Simplificado para mostrar solo eventos con status pendiente.
 *
 * @param etapas - Un array de posiciones de las etapas de evento.
 * @param incluirArchivados - Si incluir eventos archivados (opcional, por defecto false)
 * @returns Una promesa que resuelve a un array de eventos.
 */
export async function getEventosPendientesPorEtapa(etapas: number[], incluirArchivados: boolean = false): Promise<EventoPorEtapa[]> {
    try {
        const whereConditions: any = {
            EventoEtapa: {
                posicion: {
                    in: etapas
                }
            }
        };

        // Si no incluir archivados, mostrar solo eventos activos/pendientes
        if (!incluirArchivados) {
            whereConditions.status = {
                in: [
                    EVENTO_STATUS.PENDIENTE,
                    EVENTO_STATUS.APROBADO,
                    EVENTO_STATUS.ACTIVE // Legacy status
                ]
            };
        } else {
            // Si incluir archivados, mostrar todos incluyendo archivados
            whereConditions.status = {
                in: [
                    EVENTO_STATUS.PENDIENTE,
                    EVENTO_STATUS.APROBADO,
                    EVENTO_STATUS.ARCHIVADO,
                    EVENTO_STATUS.ACTIVE,   // Legacy status
                    EVENTO_STATUS.ARCHIVED  // Legacy status
                ]
            };
        }

        const eventos = await prisma.evento.findMany({
            where: whereConditions,
            include: {
                EventoTipo: {
                    select: {
                        nombre: true
                    }
                },
                Cliente: {
                    select: {
                        nombre: true,
                        telefono: true
                    }
                },
                EventoEtapa: {
                    select: {
                        nombre: true,
                        posicion: true
                    }
                },
                Cotizacion: {
                    select: {
                        id: true,
                        precio: true,
                        status: true,
                        dias_minimos_contratacion: true,
                        Pago: {
                            select: {
                                id: true,
                                monto: true,
                                createdAt: true
                            }
                        }
                    }
                },
                EventoBitacora: {
                    select: {
                        comentario: true,
                        importancia: true,
                        createdAt: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                },
                Agenda: {
                    select: {
                        status: true,
                        fecha: true
                    },
                    take: 1
                },
                User: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: {
                fecha_evento: 'asc'
            }
        });

        const eventosConTotalPagado = eventos.map(evento => {
            const totalPagado = evento.Cotizacion.reduce((acc, cotizacion) => {
                const totalPagos = cotizacion.Pago.reduce((sum, pago) => sum + pago.monto, 0);
                return acc + totalPagos;
            }, 0);

            return {
                ...evento,
                total_pagado: totalPagado
            };
        });

        // Validar los datos con Zod antes de retornarlos
        const validatedEventos = EventosPorEtapaArraySchema.safeParse(eventosConTotalPagado);

        if (!validatedEventos.success) {
            console.error('🔍 Errores de validación Zod:', validatedEventos.error.flatten().fieldErrors);
            // Temporalmente devolver datos sin validar para debug
            return eventosConTotalPagado as EventoPorEtapa[];
        }

        return validatedEventos.data;
    } catch (error) {
        console.error('Error al obtener eventos pendientes por etapa:', error);
        return [];
    }
}

/**
 * Función original mantenida para compatibilidad
 */
export async function getEventosPorEtapaConCotizaciones(etapas: number[]): Promise<EventoPorEtapa[]> {
    // Redirigir a la nueva función simplificada
    return getEventosPendientesPorEtapa(etapas, false);
}
