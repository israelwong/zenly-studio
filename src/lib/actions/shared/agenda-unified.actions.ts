'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { logPromiseAction } from '@/lib/actions/studio/builder/commercial/promises/promise-logs.actions';

// =============================================================================
// SCHEMAS
// =============================================================================

const createAgendaSchema = z.object({
    contexto: z.enum(['promise', 'evento']),
    promise_id: z.string().optional(),
    evento_id: z.string().optional(),
    date: z.coerce.date(),
    time: z.string().optional(),
    address: z.string().optional(),
    concept: z.string().optional(),
    description: z.string().optional(),
    link_meeting_url: z.string().optional(),
    type_scheduling: z.enum(['presencial', 'virtual']).optional(),
    agenda_tipo: z.string().optional(),
    user_id: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateAgendaSchema = createAgendaSchema.partial().extend({
    id: z.string(),
    status: z.enum(['pendiente', 'confirmado', 'cancelado', 'completado']).optional(),
});

const getAgendaUnifiedSchema = z.object({
    filtro: z.enum(['all', 'promises', 'eventos']).optional().default('all'),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});

// =============================================================================
// TYPES
// =============================================================================

export type CreateAgendaData = z.infer<typeof createAgendaSchema>;
export type UpdateAgendaData = z.infer<typeof updateAgendaSchema>;
export type GetAgendaUnifiedParams = z.infer<typeof getAgendaUnifiedSchema>;

export interface AgendaItem {
    id: string;
    date: Date;
    time?: string | null;
    address?: string | null;
    concept?: string | null;
    description?: string | null;
    link_meeting_url?: string | null;
    type_scheduling?: 'presencial' | 'virtual' | null;
    status: string;
    contexto: 'promise' | 'evento' | null;
    promise_id?: string | null;
    evento_id?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at?: Date | null;
    updated_at?: Date | null;
    // Datos relacionados
    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    contact_avatar_url?: string | null;
    event_name?: string | null;
    promise_status?: string | null;
    evento_status?: string | null;
}

export interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface AgendaListResponse {
    success: boolean;
    data?: AgendaItem[];
    error?: string;
}

export interface AgendaResponse {
    success: boolean;
    data?: AgendaItem;
    error?: string;
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Obtener agenda unificada (promises + eventos)
 */
export async function obtenerAgendaUnificada(
    studioSlug: string,
    params?: GetAgendaUnifiedParams
): Promise<AgendaListResponse> {
    try {
        const validatedParams = getAgendaUnifiedSchema.parse(params || {});
        const { filtro, startDate, endDate } = validatedParams;

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Construir where clause
        const where: {
            studio_id: string;
            date?: { gte?: Date; lte?: Date };
            contexto?: string | null;
            OR?: Array<{ contexto: string | null }>;
        } = {
            studio_id: studio.id,
        };

        // Filtro por contexto
        if (filtro === 'promises') {
            where.contexto = 'promise';
        } else if (filtro === 'eventos') {
            where.contexto = 'evento';
        }

        // Filtro por rango de fechas
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = startDate;
            if (endDate) where.date.lte = endDate;
        }

        const agendas = await prisma.studio_agenda.findMany({
            where,
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                eventos: {
                    select: {
                        name: true,
                        status: true,
                        cliente_id: true,
                    },
                },
            },
            orderBy: {
                date: 'asc',
            },
        });

        const items: AgendaItem[] = agendas.map((agenda) => ({
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.link_meeting_url,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || null,
            event_name: agenda.eventos?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            evento_status: agenda.eventos?.status || null,
        }));

        return {
            success: true,
            data: items,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error obteniendo agenda:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener agenda',
        };
    }
}

/**
 * Obtener agendamiento por ID
 */
export async function obtenerAgendamientoPorId(
    studioSlug: string,
    agendaId: string
): Promise<AgendaResponse> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const agenda = await prisma.studio_agenda.findFirst({
            where: {
                id: agendaId,
                studio_id: studio.id,
            },
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                eventos: {
                    select: {
                        name: true,
                        status: true,
                    },
                },
            },
        });

        if (!agenda) {
            return { success: false, error: 'Agendamiento no encontrado' };
        }

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.link_meeting_url,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || null,
            event_name: agenda.eventos?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            evento_status: agenda.eventos?.status || null,
        };

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error obteniendo agendamiento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener agendamiento',
        };
    }
}

/**
 * Obtener agendamiento por promise_id
 */
export async function obtenerAgendamientoPorPromise(
    studioSlug: string,
    promiseId: string
): Promise<AgendaResponse> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const agenda = await prisma.studio_agenda.findFirst({
            where: {
                studio_id: studio.id,
                promise_id: promiseId,
                contexto: 'promise',
            },
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        if (!agenda) {
            return { success: true, data: undefined };
        }

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.link_meeting_url,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: 'promise',
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || null,
            promise_status: 'pending',
        };

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error obteniendo agendamiento por promise:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener agendamiento',
        };
    }
}

/**
 * Crear agendamiento
 */
export async function crearAgendamiento(
    studioSlug: string,
    data: CreateAgendaData
): Promise<AgendaResponse> {
    try {
        const validatedData = createAgendaSchema.parse(data);

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Validar que al menos uno de promise_id o evento_id esté presente
        if (!validatedData.promise_id && !validatedData.evento_id) {
            return { success: false, error: 'Debe especificar promise_id o evento_id' };
        }

        // Validar que promise_id existe si se proporciona
        if (validatedData.promise_id) {
            const promise = await prisma.studio_promises.findUnique({
                where: { id: validatedData.promise_id },
                select: { studio_id: true },
            });

            if (!promise || promise.studio_id !== studio.id) {
                return { success: false, error: 'Promise no encontrada o no pertenece al studio' };
            }
        }

        // Validar que evento_id existe si se proporciona
        if (validatedData.evento_id) {
            const evento = await prisma.studio_eventos.findUnique({
                where: { id: validatedData.evento_id },
                select: { studio_id: true },
            });

            if (!evento || evento.studio_id !== studio.id) {
                return { success: false, error: 'Evento no encontrado o no pertenece al studio' };
            }
        }

        const agenda = await prisma.studio_agenda.create({
            data: {
                studio_id: studio.id,
                contexto: validatedData.contexto,
                promise_id: validatedData.promise_id || null,
                evento_id: validatedData.evento_id || null,
                date: validatedData.date,
                time: validatedData.time || null,
                address: validatedData.address || null,
                concept: validatedData.concept || null,
                description: validatedData.description || null,
                link_meeting_url: validatedData.link_meeting_url || null,
                type_scheduling: validatedData.type_scheduling || null,
                agenda_tipo: validatedData.agenda_tipo || null,
                user_id: validatedData.user_id || null,
                metadata: validatedData.metadata ? (validatedData.metadata as Prisma.InputJsonValue) : undefined,
                status: 'pendiente',
            },
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                eventos: {
                    select: {
                        name: true,
                        status: true,
                    },
                },
            },
        });

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.link_meeting_url,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_name: agenda.promise?.contact?.name || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            event_name: agenda.eventos?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            evento_status: agenda.eventos?.status || null,
        };

        revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
        revalidatePath(`/${studioSlug}/studio/builder/commercial/agendamiento`);

        // Log si está asociado a una promesa
        if (agenda.promise_id) {
            await logPromiseAction(
                studioSlug,
                agenda.promise_id,
                'agenda_created',
                'user',
                validatedData.user_id || null,
                {
                    date: agenda.date.toISOString(),
                    time: agenda.time,
                    concept: agenda.concept,
                    type_scheduling: agenda.type_scheduling,
                }
            ).catch((error) => {
                console.error('[AGENDA_UNIFIED] Error creando log:', error);
            });
        }

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error creando agendamiento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear agendamiento',
        };
    }
}

/**
 * Actualizar agendamiento
 */
export async function actualizarAgendamiento(
    studioSlug: string,
    data: UpdateAgendaData
): Promise<AgendaResponse> {
    try {
        const validatedData = updateAgendaSchema.parse(data);
        const { id, ...updateData } = validatedData;

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que el agendamiento existe y pertenece al studio
        const existing = await prisma.studio_agenda.findFirst({
            where: {
                id,
                studio_id: studio.id,
            },
        });

        if (!existing) {
            return { success: false, error: 'Agendamiento no encontrado' };
        }

        // Validar promise_id si se proporciona
        if (updateData.promise_id) {
            const promise = await prisma.studio_promises.findUnique({
                where: { id: updateData.promise_id },
                select: { studio_id: true },
            });

            if (!promise || promise.studio_id !== studio.id) {
                return { success: false, error: 'Promise no encontrada o no pertenece al studio' };
            }
        }

        // Validar evento_id si se proporciona
        if (updateData.evento_id) {
            const evento = await prisma.studio_eventos.findUnique({
                where: { id: updateData.evento_id },
                select: { studio_id: true },
            });

            if (!evento || evento.studio_id !== studio.id) {
                return { success: false, error: 'Evento no encontrado o no pertenece al studio' };
            }
        }

        const updatePayload: Prisma.studio_agendaUpdateInput = {};

        if (updateData.date) updatePayload.date = updateData.date;
        if (updateData.time !== undefined) updatePayload.time = updateData.time || null;
        if (updateData.address !== undefined) updatePayload.address = updateData.address || null;
        if (updateData.concept !== undefined) updatePayload.concept = updateData.concept || null;
        if (updateData.description !== undefined) updatePayload.description = updateData.description || null;
        if (updateData.link_meeting_url !== undefined) updatePayload.link_meeting_url = updateData.link_meeting_url || null;
        if (updateData.type_scheduling !== undefined) updatePayload.type_scheduling = updateData.type_scheduling || null;
        if (updateData.agenda_tipo !== undefined) updatePayload.agenda_tipo = updateData.agenda_tipo || null;
        if (updateData.user_id !== undefined) updatePayload.user_id = updateData.user_id || null;
        if (updateData.metadata !== undefined) {
            updatePayload.metadata = updateData.metadata ? (updateData.metadata as Prisma.InputJsonValue) : null;
        }
        if (updateData.contexto) updatePayload.contexto = updateData.contexto;
        if (updateData.promise_id !== undefined) updatePayload.promise_id = updateData.promise_id || null;
        if (updateData.evento_id !== undefined) updatePayload.evento_id = updateData.evento_id || null;
        if (updateData.status !== undefined) updatePayload.status = updateData.status;

        const agenda = await prisma.studio_agenda.update({
            where: { id },
            data: updatePayload,
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                eventos: {
                    select: {
                        name: true,
                        status: true,
                    },
                },
            },
        });

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.link_meeting_url,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_name: agenda.promise?.contact?.name || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            event_name: agenda.eventos?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            evento_status: agenda.eventos?.status || null,
        };

        revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
        revalidatePath(`/${studioSlug}/studio/builder/commercial/agendamiento`);

        // Log si está asociado a una promesa
        if (agenda.promise_id) {
            const wasCancelled = updateData.status === 'cancelado';
            const action: 'agenda_updated' | 'agenda_cancelled' = wasCancelled ? 'agenda_cancelled' : 'agenda_updated';
            
            await logPromiseAction(
                studioSlug,
                agenda.promise_id,
                action,
                'user',
                updateData.user_id || null,
                {
                    date: agenda.date.toISOString(),
                    time: agenda.time,
                    concept: agenda.concept,
                    type_scheduling: agenda.type_scheduling,
                }
            ).catch((error) => {
                console.error('[AGENDA_UNIFIED] Error creando log:', error);
            });
        }

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error actualizando agendamiento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar agendamiento',
        };
    }
}

/**
 * Verificar disponibilidad de fecha
 */
export async function verificarDisponibilidadFecha(
    studioSlug: string,
    fecha: Date,
    excludeAgendaId?: string,
    excludePromiseId?: string,
    excludeEventoId?: string
): Promise<ActionResponse<AgendaItem[]>> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Normalizar fecha (solo día, sin hora)
        const fechaInicio = new Date(fecha);
        fechaInicio.setHours(0, 0, 0, 0);

        const fechaFin = new Date(fecha);
        fechaFin.setHours(23, 59, 59, 999);

        const where: Prisma.studio_agendaWhereInput = {
            studio_id: studio.id,
            date: {
                gte: fechaInicio,
                lte: fechaFin,
            },
            status: {
                not: 'cancelado',
            },
        };

        // Excluir agendamiento actual si se está editando
        if (excludeAgendaId) {
            where.id = { not: excludeAgendaId };
        }

        // Excluir promise_id o evento_id si se está creando/actualizando
        if (excludePromiseId) {
            where.promise_id = { not: excludePromiseId };
        }
        if (excludeEventoId) {
            where.evento_id = { not: excludeEventoId };
        }

        const agendas = await prisma.studio_agenda.findMany({
            where,
            include: {
                promise: {
                    include: {
                        contact: {
                            select: {
                                name: true,
                                phone: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
                eventos: {
                    select: {
                        name: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                date: 'asc',
            },
        });

        const items: AgendaItem[] = agendas.map((agenda) => ({
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.link_meeting_url,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || null,
            event_name: agenda.eventos?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            evento_status: agenda.eventos?.status || null,
        }));

        return {
            success: true,
            data: items,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error verificando disponibilidad:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al verificar disponibilidad',
        };
    }
}

/**
 * Eliminar agendamiento
 */
export async function eliminarAgendamiento(
    studioSlug: string,
    agendaId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const existing = await prisma.studio_agenda.findFirst({
            where: {
                id: agendaId,
                studio_id: studio.id,
            },
            select: {
                promise_id: true,
                date: true,
                time: true,
                concept: true,
                type_scheduling: true,
            },
        });

        if (!existing) {
            return { success: false, error: 'Agendamiento no encontrado' };
        }

        await prisma.studio_agenda.delete({
            where: { id: agendaId },
        });

        // Log si está asociado a una promesa
        if (existing.promise_id) {
            await logPromiseAction(
                studioSlug,
                existing.promise_id,
                'agenda_cancelled',
                'user',
                null,
                {
                    date: existing.date?.toISOString(),
                    time: existing.time,
                    concept: existing.concept,
                    type_scheduling: existing.type_scheduling,
                }
            ).catch((error) => {
                console.error('[AGENDA_UNIFIED] Error creando log:', error);
            });
        }

        revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
        revalidatePath(`/${studioSlug}/studio/builder/commercial/agendamiento`);

        return {
            success: true,
            data: { deleted: true },
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error eliminando agendamiento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al eliminar agendamiento',
        };
    }
}

