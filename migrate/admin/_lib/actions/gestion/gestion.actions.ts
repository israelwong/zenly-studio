'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
    ActualizarEtapaEventoSchema,
    ObtenerEventosPorEtapasSchema,
    type ActualizarEtapaEventoType,
    type ObtenerEventosPorEtapasType,
    type EventoKanbanType,
    type EstadisticasColumnaType
} from './gestion.schemas';
import { COTIZACION_STATUS, PAGO_STATUS, EVENTO_STATUS } from '../../constants/status';

/**
 * Obtiene todos los eventos para el kanban con información necesaria
 */
export async function obtenerEventosKanban(data?: ObtenerEventosPorEtapasType) {
    try {
        const validated = data ? ObtenerEventosPorEtapasSchema.parse(data) : { incluirTodos: true };

        const whereClause = validated.incluirTodos
            ? {}
            : {
                EventoEtapa: {
                    posicion: {
                        in: validated.etapas || []
                    }
                }
            };

        const eventos = await prisma.evento.findMany({
            where: {
                ...whereClause,
                status: {
                    in: [EVENTO_STATUS.ACTIVE, EVENTO_STATUS.APROBADO, EVENTO_STATUS.PENDIENTE]
                }
            },
            distinct: ['id'], // Asegurar que cada evento sea único
            include: {
                Cliente: {
                    select: {
                        nombre: true
                    }
                },
                EventoTipo: {
                    select: {
                        nombre: true
                    }
                },
                EventoEtapa: {
                    select: {
                        id: true,
                        nombre: true,
                        posicion: true
                    }
                },
                Cotizacion: {
                    select: {
                        status: true,
                        precio: true,
                        Pago: {
                            where: {
                                status: PAGO_STATUS.PAID
                            },
                            select: {
                                monto: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                fecha_evento: 'asc'
            }
        });

        // Transformar datos para el kanban
        const eventosKanban: EventoKanbanType[] = eventos.map(evento => {
            const cotizacionAprobada = evento.Cotizacion.find(c => c.status === COTIZACION_STATUS.APROBADA);
            const totalPagado = cotizacionAprobada?.Pago.reduce((sum, pago) => sum + pago.monto, 0) || 0;
            const cotizacionPrecio = cotizacionAprobada?.precio || 0;
            const totalPendiente = cotizacionPrecio - totalPagado;

            return {
                id: evento.id,
                nombre: evento.nombre,
                fecha_evento: evento.fecha_evento,
                sede: evento.sede,
                clienteNombre: evento.Cliente.nombre,
                eventoTipo: evento.EventoTipo?.nombre || null,
                etapaNombre: evento.EventoEtapa?.nombre || null,
                etapaId: evento.EventoEtapa?.id || null,
                status: evento.status,
                totalPendiente: totalPendiente,
                cotizacionPrecio: cotizacionPrecio,
                totalPagado: totalPagado,
                tieneCotizacionAprobada: !!cotizacionAprobada,
            };
        });

        // Filtrar duplicados por ID (en caso de que los haya)
        const eventosUnicos = eventosKanban.filter((evento, index, array) =>
            array.findIndex(e => e.id === evento.id) === index
        );

        return {
            success: true,
            data: eventosUnicos
        };

    } catch (error) {
        console.error('Error al obtener eventos kanban:', error);
        return {
            success: false,
            error: 'Error al obtener eventos para el kanban'
        };
    }
}

/**
 * Obtiene las estadísticas por columna/etapa
 */
export async function obtenerEstadisticasColumnas(): Promise<{ success: boolean; data?: EstadisticasColumnaType[]; error?: string }> {
    try {
        const etapas = await prisma.eventoEtapa.findMany({
            orderBy: {
                posicion: 'asc'
            }
        });

        const estadisticas: EstadisticasColumnaType[] = [];

        for (const etapa of etapas) {
            const eventos = await prisma.evento.findMany({
                where: {
                    eventoEtapaId: etapa.id,
                    status: EVENTO_STATUS.ACTIVE
                },
                include: {
                    Cotizacion: {
                        where: {
                            status: COTIZACION_STATUS.APROBADA
                        },
                        select: {
                            precio: true,
                            Pago: {
                                where: {
                                    status: PAGO_STATUS.PAID
                                },
                                select: {
                                    monto: true
                                }
                            }
                        }
                    }
                }
            });

            let totalPendienteCobrar = 0;

            eventos.forEach(evento => {
                const cotizacion = evento.Cotizacion[0];
                if (cotizacion) {
                    const totalPagado = cotizacion.Pago.reduce((sum, pago) => sum + pago.monto, 0);
                    const pendiente = cotizacion.precio - totalPagado;
                    if (pendiente > 0) {
                        totalPendienteCobrar += pendiente;
                    }
                }
            });

            estadisticas.push({
                etapaId: etapa.id,
                etapaNombre: etapa.nombre,
                totalEventos: eventos.length,
                totalPendienteCobrar
            });
        }

        return {
            success: true,
            data: estadisticas
        };

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return {
            success: false,
            error: 'Error al obtener estadísticas de columnas'
        };
    }
}

/**
 * Actualiza la etapa de un evento (para drag and drop)
 */
export async function actualizarEtapaEvento(data: ActualizarEtapaEventoType) {
    try {
        const validated = ActualizarEtapaEventoSchema.parse(data);

        // Verificar que el evento existe
        const eventoExiste = await prisma.evento.findUnique({
            where: { id: validated.eventoId }
        });

        if (!eventoExiste) {
            return {
                success: false,
                error: 'Evento no encontrado'
            };
        }

        // Verificar que la etapa existe
        const etapaExiste = await prisma.eventoEtapa.findUnique({
            where: { id: validated.nuevaEtapaId }
        });

        if (!etapaExiste) {
            return {
                success: false,
                error: 'Etapa no encontrada'
            };
        }

        // Actualizar la etapa del evento
        await prisma.evento.update({
            where: { id: validated.eventoId },
            data: { eventoEtapaId: validated.nuevaEtapaId }
        });

        // Crear entrada en bitácora
        await prisma.eventoBitacora.create({
            data: {
                eventoId: validated.eventoId,
                comentario: `Evento movido a etapa: ${etapaExiste.nombre}`,
                importancia: '2'
            }
        });

        revalidatePath('/admin/dashboard/gestion');
        revalidatePath('/admin/dashboard/seguimiento');

        return {
            success: true,
            message: `Evento actualizado a etapa: ${etapaExiste.nombre}`
        };

    } catch (error) {
        console.error('Error al actualizar etapa del evento:', error);
        return {
            success: false,
            error: 'Error al actualizar la etapa del evento'
        };
    }
}

/**
 * Obtiene todas las etapas disponibles
 */
export async function obtenerEtapasGestion() {
    try {
        const etapas = await prisma.eventoEtapa.findMany({
            orderBy: {
                posicion: 'asc'
            }
        });

        return {
            success: true,
            data: etapas
        };

    } catch (error) {
        console.error('Error al obtener etapas:', error);
        return {
            success: false,
            error: 'Error al obtener etapas'
        };
    }
}

/**
 * Archiva un evento (cambia su status a archived)
 */
export async function archivarEvento(eventoId: string) {
    try {
        if (!eventoId) {
            return {
                success: false,
                error: 'ID del evento es requerido'
            };
        }

        // Verificar que el evento existe
        const eventoExiste = await prisma.evento.findUnique({
            where: { id: eventoId }
        });

        if (!eventoExiste) {
            return {
                success: false,
                error: 'El evento no existe'
            };
        }

        // Archivar el evento
        await prisma.evento.update({
            where: { id: eventoId },
            data: {
                status: EVENTO_STATUS.ARCHIVED
            }
        });

        revalidatePath('/admin/dashboard/gestion');

        return {
            success: true,
            message: 'Evento archivado correctamente'
        };

    } catch (error) {
        console.error('Error al archivar evento:', error);
        return {
            success: false,
            error: 'Error al archivar el evento'
        };
    }
}
