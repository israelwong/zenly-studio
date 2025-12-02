// Ruta: app/admin/_lib/actions/agenda/agenda.actions.ts

'use server'

import { prisma } from '@/lib/prisma';
import { AGENDA_STATUS } from '../../constants/status';
import {
    AgendaCreateSchema,
    AgendaUpdateSchema,
    AgendaBusquedaSchema,
    AgendaStatusSchema,
    type AgendaCreateForm,
    type AgendaUpdateForm,
    type AgendaBusquedaForm,
    type AgendaStatusForm
} from './agenda.schemas';
import { revalidatePath } from 'next/cache';

// Obtener todas las agendas con paginación y filtros
export async function obtenerAgendasConFiltros(params?: AgendaBusquedaForm) {
    try {
        const validatedParams = AgendaBusquedaSchema.parse(params || {});
        const { search, status, agendaTipo, eventoId, fechaDesde, fechaHasta, page, limit } = validatedParams;

        const skip = (page - 1) * limit;

        // Construir condiciones de búsqueda
        const where: any = {};

        if (search) {
            where.OR = [
                { concepto: { contains: search, mode: 'insensitive' } },
                {
                    Evento: {
                        nombre: { contains: search, mode: 'insensitive' }
                    }
                },
                {
                    User: {
                        username: { contains: search, mode: 'insensitive' }
                    }
                }
            ];
        }

        if (status) {
            where.status = status;
        }

        if (agendaTipo) {
            where.agendaTipo = agendaTipo;
        }

        if (eventoId) {
            where.eventoId = eventoId;
        }

        if (fechaDesde || fechaHasta) {
            where.fecha = {};
            if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
            if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
        }

        // Ejecutar consultas en paralelo
        const [agendas, total] = await Promise.all([
            prisma.agenda.findMany({
                where,
                include: {
                    Evento: {
                        select: {
                            id: true,
                            nombre: true,
                            EventoTipo: {
                                select: {
                                    nombre: true,
                                }
                            }
                        }
                    },
                    User: {
                        select: {
                            id: true,
                            username: true,
                        }
                    }
                },
                orderBy: [
                    { fecha: 'asc' },
                    { hora: 'asc' },
                ],
                skip,
                take: limit,
            }),
            prisma.agenda.count({ where }),
        ]);

        return {
            success: true,
            data: agendas,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            }
        };
    } catch (error) {
        console.error('Error al obtener agendas:', error);
        return {
            success: false,
            message: 'Error al obtener la lista de agendas',
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
}

// Obtener agenda por ID
export async function obtenerAgenda(id: string) {
    try {
        const agenda = await prisma.agenda.findUnique({
            where: { id },
            include: {
                Evento: {
                    select: {
                        id: true,
                        nombre: true,
                        EventoTipo: {
                            select: {
                                nombre: true,
                            }
                        }
                    }
                },
                User: {
                    select: {
                        id: true,
                        username: true,
                    }
                }
            }
        });

        if (!agenda) {
            return {
                success: false,
                message: 'Agenda no encontrada'
            };
        }

        return {
            success: true,
            data: agenda
        };
    } catch (error) {
        console.error('Error al obtener agenda:', error);
        return {
            success: false,
            message: 'Error al obtener la agenda',
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
}

// Crear nueva agenda
export async function crearAgenda(data: AgendaCreateForm) {
    try {
        const validatedData = AgendaCreateSchema.parse(data);

        const nuevaAgenda = await prisma.agenda.create({
            data: {
                fecha: new Date(validatedData.fecha),
                hora: validatedData.hora,
                concepto: validatedData.concepto || null,
                agendaTipo: validatedData.agendaTipo,
                eventoId: validatedData.eventoId,
                userId: validatedData.userId,
                status: validatedData.status,
                // id and updatedAt are omitted so Prisma will auto-generate them
            },
            include: {
                Evento: {
                    select: {
                        nombre: true,
                    }
                },
                User: {
                    select: {
                        username: true,
                    }
                }
            }
        });

        revalidatePath('/admin/dashboard/agenda');

        return {
            success: true,
            data: nuevaAgenda,
            message: 'Agenda creada exitosamente'
        };
    } catch (error) {
        console.error('Error al crear agenda:', error);
        return {
            success: false,
            message: 'Error al crear la agenda',
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
}

// Actualizar agenda
export async function actualizarAgenda(data: AgendaUpdateForm) {
    try {
        const validatedData = AgendaUpdateSchema.parse(data);
        const { id, ...updateData } = validatedData;

        const agendaActualizada = await prisma.agenda.update({
            where: { id },
            data: {
                ...updateData,
                fecha: updateData.fecha ? new Date(updateData.fecha) : undefined,
            },
            include: {
                Evento: {
                    select: {
                        nombre: true,
                    }
                },
                User: {
                    select: {
                        username: true,
                    }
                }
            }
        });

        revalidatePath('/admin/dashboard/agenda');

        return {
            success: true,
            data: agendaActualizada,
            message: 'Agenda actualizada exitosamente'
        };
    } catch (error) {
        console.error('Error al actualizar agenda:', error);
        return {
            success: false,
            message: 'Error al actualizar la agenda',
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
}

// Cambiar status de agenda
export async function cambiarStatusAgenda(data: AgendaStatusForm) {
    try {
        const validatedData = AgendaStatusSchema.parse(data);

        const agendaActualizada = await prisma.agenda.update({
            where: { id: validatedData.id },
            data: {
                status: validatedData.status,
            },
            include: {
                Evento: {
                    select: {
                        nombre: true,
                    }
                }
            }
        });

        revalidatePath('/admin/dashboard/agenda');

        return {
            success: true,
            data: agendaActualizada,
            message: `Agenda marcada como ${validatedData.status}`
        };
    } catch (error) {
        console.error('Error al cambiar status de agenda:', error);
        return {
            success: false,
            message: 'Error al cambiar el status de la agenda',
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
}

// Eliminar agenda
export async function eliminarAgenda(id: string) {
    try {
        await prisma.agenda.delete({
            where: { id }
        });

        revalidatePath('/admin/dashboard/agenda');

        return {
            success: true,
            message: 'Agenda eliminada exitosamente'
        };
    } catch (error) {
        console.error('Error al eliminar agenda:', error);
        return {
            success: false,
            message: 'Error al eliminar la agenda',
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
}

// Obtener agendas pendientes (para el componente actual)
export async function obtenerAgendasPendientes() {
    try {
        const agendas = await prisma.agenda.findMany({
            where: {
                status: AGENDA_STATUS.PENDIENTE
            },
            include: {
                Evento: {
                    select: {
                        nombre: true,
                        EventoTipo: {
                            select: {
                                nombre: true,
                            }
                        }
                    }
                },
                User: {
                    select: {
                        username: true,
                    }
                }
            },
            orderBy: [
                { fecha: 'asc' },
                { hora: 'asc' },
            ]
        });

        return {
            success: true,
            data: agendas
        };
    } catch (error) {
        console.error('Error al obtener agendas pendientes:', error);
        return {
            success: false,
            message: 'Error al obtener agendas pendientes',
            error: error instanceof Error ? error.message : 'Error desconocido'
        };
    }
}

// =====================================
// CREAR AGENDA PARA EVENTO (Compatibilidad)
// =====================================

export async function crearAgendaEvento(agenda: any) {
    try {
        await prisma.agenda.create({
            data: {
                concepto: agenda.concepto,
                descripcion: agenda.descripcion,
                googleMapsUrl: agenda.googleMapsUrl,
                direccion: agenda.direccion,
                fecha: agenda.fecha,
                hora: agenda.hora,
                eventoId: agenda.eventoId ?? '',
                userId: agenda.userId ?? '',
                agendaTipo: agenda.agendaTipo,
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error al crear la agenda del evento:', (error as Error).message);
        throw error;
    }
}

// ====== FUNCIONES MIGRADAS DESDE ROOT/agenda.actions.ts ======

export async function verificarDisponibilidadFechaRootLegacy(fecha: Date, eventoIdExcluir?: string) {
    try {
        // Convertir fecha a inicio y fin del día para búsqueda
        const inicioDelDia = new Date(fecha)
        inicioDelDia.setHours(0, 0, 0, 0)

        const finDelDia = new Date(fecha)
        finDelDia.setHours(23, 59, 59, 999)

        // Buscar eventos en agenda para esa fecha (excluyendo el evento actual si se especifica)
        const eventosEnFecha = await prisma.agenda.findMany({
            where: {
                fecha: {
                    gte: inicioDelDia,
                    lte: finDelDia
                },
                ...(eventoIdExcluir && {
                    eventoId: {
                        not: eventoIdExcluir
                    }
                }),
                status: {
                    not: 'CANCELADO' // No contar eventos cancelados
                }
            },
            include: {
                Evento: {
                    select: {
                        nombre: true,
                        EventoTipo: {
                            select: {
                                nombre: true
                            }
                        }
                    }
                }
            }
        })

        return {
            disponible: eventosEnFecha.length === 0,
            eventosEnFecha: eventosEnFecha
        }
    } catch (error) {
        console.error('Error al verificar disponibilidad de fecha:', error)
        throw error
    }
}

export async function obtenerAgendaConEventosRootLegacy() {
    try {
        const agenda = await prisma.agenda.findMany({
            include: {
                Evento: {
                    include: {
                        EventoTipo: true,
                        Cotizacion: {
                            include: {
                                Pago: true
                            }
                        }
                    }
                },
                User: true
            }
        });
        return agenda;
    } catch (error) {
        console.error('Error al obtener la agenda con eventos:', error);
        throw error;
    }
}

export async function obtenerAgendaDeEventoRootLegacy(eventoId: string) {
    try {
        return await prisma.agenda.findMany({
            where: { eventoId },
            orderBy: {
                fecha: 'asc'
            }
        });
    } catch (error) {
        console.error('Error al obtener la agenda del evento:', error);
        throw error;
    }
}

export async function eliminarAgendaEventoRootLegacy(agendaId: string) {
    try {
        await prisma.agenda.delete({
            where: { id: agendaId }
        });
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar la agenda del evento:', error);
        throw error;
    }
}

export async function actualizarStatusAgendaActividadRootLegacy(agendaId: string, status: string) {
    try {
        await prisma.agenda.update({
            where: { id: agendaId },
            data: { status }
        });
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar el status de la agenda:', error);
        throw error;
    }
}

export async function actualizarAgendaEventoRootLegacy(agenda: any) {
    try {
        await prisma.agenda.update({
            where: { id: agenda.id },
            data: {
                concepto: agenda.concepto,
                descripcion: agenda.descripcion,
                googleMapsUrl: agenda.googleMapsUrl,
                direccion: agenda.direccion,
                fecha: agenda.fecha,
                hora: agenda.hora,
                agendaTipo: agenda.agendaTipo,
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar la agenda del evento:', error);
        throw error;
    }
}

// ========================================
// FUNCIONES PARA FECHAS TENTATIVAS
// ========================================

/**
 * Confirma una fecha tentativa, cambiando el status de 'por_confirmar' a 'confirmado'
 */
export async function confirmarFechaTentativa(eventoId: string) {
    try {
        const agenda = await prisma.agenda.findFirst({
            where: {
                eventoId,
                status: AGENDA_STATUS.POR_CONFIRMAR
            }
        });

        if (!agenda) {
            throw new Error('No se encontró una agenda con fecha tentativa para este evento');
        }

        await prisma.agenda.update({
            where: { id: agenda.id },
            data: { status: AGENDA_STATUS.CONFIRMADO }
        });

        return { success: true, message: 'Fecha confirmada exitosamente' };
    } catch (error) {
        console.error('Error confirmando fecha tentativa:', error);
        throw error;
    }
}

/**
 * Verifica si una fecha está disponible para agendar
 * (no hay otras agendas confirmadas en la misma fecha)
 */
export async function verificarDisponibilidadFecha(fecha: Date, eventoIdExcluir?: string) {
    try {
        const fechaInicio = new Date(fecha);
        fechaInicio.setHours(0, 0, 0, 0);

        const fechaFin = new Date(fecha);
        fechaFin.setHours(23, 59, 59, 999);

        const agendas = await prisma.agenda.findMany({
            where: {
                fecha: {
                    gte: fechaInicio,
                    lte: fechaFin
                },
                status: {
                    not: AGENDA_STATUS.CANCELADO
                },
                ...(eventoIdExcluir ? { eventoId: { not: eventoIdExcluir } } : {})
            },
            include: {
                Evento: {
                    select: {
                        id: true,
                        nombre: true
                    }
                }
            }
        });

        const disponible = agendas.length === 0;

        return {
            disponible,
            agendas: agendas.map(agenda => ({
                id: agenda.id,
                eventoId: agenda.eventoId,
                eventoNombre: agenda.Evento?.nombre,
                status: agenda.status,
                hora: agenda.hora
            }))
        };
    } catch (error) {
        console.error('Error verificando disponibilidad de fecha:', error);
        throw error;
    }
}

/**
 * Actualiza la fecha de un evento y su agenda correspondiente
 * Incluye validación de disponibilidad
 */
export async function actualizarFechaEvento(eventoId: string, nuevaFecha: Date, confirmarFecha: boolean = false) {
    try {
        // Verificar disponibilidad
        const disponibilidad = await verificarDisponibilidadFecha(nuevaFecha, eventoId);

        if (!disponibilidad.disponible) {
            return {
                success: false,
                message: 'La fecha seleccionada no está disponible',
                conflictos: disponibilidad.agendas
            };
        }

        // Actualizar fecha del evento
        await prisma.evento.update({
            where: { id: eventoId },
            data: { fecha_evento: nuevaFecha }
        });

        // Actualizar agenda asociada
        const agenda = await prisma.agenda.findFirst({
            where: { eventoId }
        });

        if (agenda) {
            await prisma.agenda.update({
                where: { id: agenda.id },
                data: {
                    fecha: nuevaFecha,
                    status: confirmarFecha ? AGENDA_STATUS.CONFIRMADO : AGENDA_STATUS.POR_CONFIRMAR
                }
            });
        }

        return {
            success: true,
            message: `Fecha ${confirmarFecha ? 'confirmada' : 'actualizada como tentativa'} exitosamente`
        };
    } catch (error) {
        console.error('Error actualizando fecha del evento:', error);
        throw error;
    }
}
