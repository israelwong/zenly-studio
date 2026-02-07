'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { logPromiseAction } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';
import { incrementAgendaSubjectTemplateUsage } from '@/lib/actions/shared/agenda-subject-templates.actions';
import { toUtcDateOnly } from '@/lib/utils/date-only';

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
    location_name: z.string().optional(),
    location_address: z.string().optional(),
    location_url: z.string().optional(),
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
    location_name?: string | null;
    location_address?: string | null;
    location_url?: string | null;
    // Datos relacionados
    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    contact_avatar_url?: string | null;
    event_name?: string | null;
    event_type_name?: string | null;
    event_location?: string | null;
    promise_status?: string | null;
    evento_status?: string | null;
    // Indica si es una fecha pendiente de confirmar (fecha de interés sin agendamiento)
    is_pending_date?: boolean;
    // Indica si es una fecha de evento confirmada (defined_date sin agendamiento)
    is_confirmed_event_date?: boolean;
    // Indica si la fecha está caducada (fecha pasada)
    is_expired?: boolean;
    // Indica si es la fecha principal del evento (event_date de la promesa)
    is_main_event_date?: boolean;
    // Google Calendar sync
    google_event_id?: string | null;
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
// HELPER FUNCTIONS
// =============================================================================

/**
 * Construye metadata según el tipo de agenda
 */
function construirMetadataAgenda(params: {
  contexto: 'promise' | 'evento';
  type_scheduling?: 'presencial' | 'virtual' | null;
  isMainEventDate?: boolean;
  scheduler_task_id?: string;
}): Record<string, unknown> {
  const { contexto, type_scheduling, isMainEventDate, scheduler_task_id } = params;

  // 1. PROMESA FECHA EVENTO (NO Google Calendar)
  if (contexto === 'promise' && !type_scheduling) {
    return {
      agenda_type: 'event_date',
      sync_google: false,
    };
  }

  // 2. PROMESA CITA PRESENCIAL/VIRTUAL (SÍ Google Calendar - Principal)
  if (contexto === 'promise' && type_scheduling) {
    return {
      agenda_type: 'commercial_appointment',
      sync_google: true,
      google_calendar_type: 'primary',
    };
  }

  // 3. EVENTO ASIGNADO (SÍ Google Calendar - Principal)
  if (contexto === 'evento' && !type_scheduling && isMainEventDate) {
    return {
      agenda_type: 'main_event_date',
      sync_google: true,
      google_calendar_type: 'primary',
      is_main_event_date: true,
    };
  }

  // 4. EVENTO CITA PRESENCIAL/VIRTUAL (SÍ Google Calendar - Principal)
  if (contexto === 'evento' && type_scheduling) {
    return {
      agenda_type: 'event_appointment',
      sync_google: true,
      google_calendar_type: 'primary',
    };
  }

  // 5. EVENTO TAREA PERSONAL (SÍ Google Calendar - Secundario)
  if (contexto === 'evento' && scheduler_task_id) {
    return {
      agenda_type: 'scheduler_task',
      sync_google: true,
      google_calendar_type: 'secondary',
      scheduler_task_id,
    };
  }

  // Default: evento sin tipo específico
  if (contexto === 'evento') {
    return {
      agenda_type: 'main_event_date',
      sync_google: true,
      google_calendar_type: 'primary',
      is_main_event_date: isMainEventDate || false,
    };
  }

  // Fallback
  return {
    agenda_type: 'event_date',
    sync_google: false,
  };
}

/**
 * Obtiene metadata de agenda, calculándolo si no existe (backward compatibility)
 */
function obtenerMetadataAgenda(agenda: {
  contexto: string | null;
  type_scheduling: string | null;
  evento_id: string | null;
  promise_id: string | null;
  date: Date | null;
  metadata: unknown;
  eventos?: {
    promise?: {
      event_date: Date | null;
    } | null;
  } | null;
}): Record<string, unknown> {
  // Si ya tiene metadata, retornarlo
  if (agenda.metadata && typeof agenda.metadata === 'object') {
    const existingMetadata = agenda.metadata as Record<string, unknown>;
    return existingMetadata;
  }

  // Calcular metadata dinámicamente
  const contexto = (agenda.contexto as 'promise' | 'evento') || 'promise';
  const typeScheduling = (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null;
  
  // Determinar si es fecha principal del evento
  let isMainEventDate = false;
  if (contexto === 'evento' && agenda.eventos?.promise?.event_date && agenda.date) {
    const eventMainDateOnly = new Date(Date.UTC(
      new Date(agenda.eventos.promise.event_date).getUTCFullYear(),
      new Date(agenda.eventos.promise.event_date).getUTCMonth(),
      new Date(agenda.eventos.promise.event_date).getUTCDate()
    ));
    const agendaDateOnly = new Date(Date.UTC(
      new Date(agenda.date).getUTCFullYear(),
      new Date(agenda.date).getUTCMonth(),
      new Date(agenda.date).getUTCDate()
    ));
    isMainEventDate = eventMainDateOnly.getTime() === agendaDateOnly.getTime();
  }

  const calculatedMetadata = construirMetadataAgenda({
    contexto,
    type_scheduling: typeScheduling,
    isMainEventDate,
  });
  
  return calculatedMetadata;
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Obtener agenda unificada (SOLO studio_agenda como fuente única)
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
                        id: true,
                        status: true,
                        contact_id: true,
                        promise_id: true,
                        google_event_id: true,
                        event_type: {
                            select: {
                                name: true,
                            },
                        },
                        promise: {
                            select: {
                                name: true,
                                event_date: true,
                            },
                        },
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
                date: 'asc',
            },
        });

        // Filtrar duplicados: si hay múltiples agendas para el mismo evento_id con la misma fecha (solo fecha, sin hora),
        // mantener solo la más reciente
        const agendasUnicas = agendas.reduce((acc, agenda) => {
            if (agenda.evento_id && agenda.date) {
                // Normalizar fecha para comparación usando UTC
                const fechaNormalizada = new Date(Date.UTC(
                    new Date(agenda.date).getUTCFullYear(),
                    new Date(agenda.date).getUTCMonth(),
                    new Date(agenda.date).getUTCDate()
                ));
                
                const key = `${agenda.evento_id}-${fechaNormalizada.getTime()}`;
                const existente = acc.get(key);
                
                if (!existente || (agenda.created_at && existente.created_at && agenda.created_at > existente.created_at)) {
                    acc.set(key, agenda);
                }
            } else {
                // Si no tiene evento_id o fecha, agregar directamente
                acc.set(agenda.id, agenda);
            }
            return acc;
        }, new Map());

        const items: AgendaItem[] = Array.from(agendasUnicas.values()).map((agenda) => {
            // Determinar si es fecha principal del evento comparando con event_date de la promesa usando métodos UTC
            const eventMainDate = agenda.eventos?.promise?.event_date;
            const agendaDate = agenda.date ? new Date(agenda.date) : null;
            
            let isMainEventDate = false;
            if (eventMainDate && agendaDate && agenda.contexto === 'evento') {
                // Comparar solo fechas (sin hora) usando métodos UTC
                const eventMainDateOnly = new Date(Date.UTC(
                    new Date(eventMainDate).getUTCFullYear(),
                    new Date(eventMainDate).getUTCMonth(),
                    new Date(eventMainDate).getUTCDate()
                ));
                const agendaDateOnly = new Date(Date.UTC(
                    agendaDate.getUTCFullYear(),
                    agendaDate.getUTCMonth(),
                    agendaDate.getUTCDate()
                ));
                isMainEventDate = eventMainDateOnly.getTime() === agendaDateOnly.getTime();
            }

            // BACKWARD COMPATIBILITY: Si no tiene metadata, calcularlo dinámicamente
            const metadata = obtenerMetadataAgenda({
                contexto: agenda.contexto,
                type_scheduling: agenda.type_scheduling,
                evento_id: agenda.evento_id,
                promise_id: agenda.promise_id,
                date: agenda.date,
                metadata: agenda.metadata,
                eventos: agenda.eventos,
            });
            

            // Normalizar fecha usando UTC antes de retornar para evitar problemas de zona horaria
            let fechaNormalizada: Date;
            if (agenda.date) {
                const fecha = agenda.date instanceof Date ? agenda.date : new Date(agenda.date);
                fechaNormalizada = new Date(Date.UTC(
                    fecha.getUTCFullYear(),
                    fecha.getUTCMonth(),
                    fecha.getUTCDate(),
                    12, 0, 0
                ));
            } else {
                fechaNormalizada = new Date();
            }

            const item = {
                id: agenda.id,
                date: fechaNormalizada,
                time: agenda.time,
                address: agenda.location_address ?? agenda.address,
                concept: agenda.concept,
                description: agenda.description,
                link_meeting_url: agenda.location_url ?? agenda.link_meeting_url,
                location_name: agenda.location_name ?? null,
                location_address: agenda.location_address ?? null,
                location_url: agenda.location_url ?? null,
                type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
                status: agenda.status,
                contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
                promise_id: agenda.promise_id,
                evento_id: agenda.evento_id,
                metadata: metadata as Record<string, unknown> | null, // ✅ Usar metadata calculado, no el raw
                created_at: agenda.created_at || null,
                updated_at: agenda.updated_at || null,
                contact_name: agenda.promise?.contact?.name || agenda.eventos?.contact?.name || null,
                contact_phone: agenda.promise?.contact?.phone || agenda.eventos?.contact?.phone || null,
                // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
                contact_email: agenda.promise?.contact?.email || agenda.eventos?.contact?.email || null,
                // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
                contact_avatar_url: agenda.promise?.contact?.avatar_url || agenda.eventos?.contact?.avatar_url || null,
                event_name: agenda.eventos?.promise?.name || null,
                event_type_name: agenda.eventos?.event_type?.name || null,
                promise_status: agenda.promise_id ? 'pending' : null,
                evento_status: agenda.eventos?.status || null,
                is_pending_date: false,
                is_main_event_date: isMainEventDate || false,
            };
            
            return item;
        });

        // Obtener todas las promesas con fechas de interés (solo las que NO están en etapa "approved")
        // IMPORTANTE: Solo mostrar tentative_dates si NO tienen event_date definido
        // Si tienen event_date, ya no son "tentativas", son confirmadas
        const allPromisesWithDates = await prisma.studio_promises.findMany({
            where: {
                studio_id: studio.id,
                tentative_dates: { not: null },
                event_date: null, // Solo mostrar tentative_dates si NO hay event_date
                OR: [
                    { pipeline_stage_id: null },
                    {
                        pipeline_stage: {
                            slug: { not: 'approved' },
                        },
                    },
                ],
            },
            select: {
                id: true,
                tentative_dates: true,
                created_at: true,
                updated_at: true,
                contact: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                        avatar_url: true,
                    },
                },
                event_type: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Obtener fechas de agendamientos confirmados por promesa
        const agendasByPromise = await prisma.studio_agenda.findMany({
            where: {
                studio_id: studio.id,
                promise_id: { not: null },
                date: { not: null },
            },
            select: {
                promise_id: true,
                date: true,
            },
        });

        // Crear un mapa de fechas de agendamiento por promesa (normalizar a fecha sin hora usando UTC)
        const agendaDatesByPromise = new Map<string, Set<string>>();
        const promisesWithAgendaIds = new Set<string>(); // IDs de promesas que tienen agendamientos (cualquier contexto)
        
        // Incluir promise_id de TODOS los agendamientos (tanto 'promise' como 'evento')
        for (const agenda of agendasUnicas.values()) {
            if (agenda.promise_id) {
                promisesWithAgendaIds.add(agenda.promise_id);
            }
        }
        
        // También procesar agendasByPromise para el mapa de fechas
        for (const agenda of agendasByPromise) {
            if (agenda.promise_id && agenda.date) {
                const date = new Date(agenda.date);
                // Normalizar usando UTC para evitar problemas de zona horaria
                const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
                if (!agendaDatesByPromise.has(agenda.promise_id)) {
                    agendaDatesByPromise.set(agenda.promise_id, new Set());
                }
                agendaDatesByPromise.get(agenda.promise_id)!.add(dateKey);
            }
        }

        // Crear items para fechas de interés pendientes
        // Mostrar todas las fechas de interés, excepto las que coinciden con fechas de agendamiento
        const pendingDateItems: AgendaItem[] = [];
        for (const promise of allPromisesWithDates) {
            if (promise.tentative_dates && Array.isArray(promise.tentative_dates)) {
                const dates = promise.tentative_dates as string[];
                const agendaDates = agendaDatesByPromise.get(promise.id) || new Set();
                
                // Eliminar duplicados normalizando fechas a YYYY-MM-DD
                const uniqueDates = new Set<string>();
                const normalizedDates: Array<{ original: string; normalized: string; date: Date }> = [];
                
                for (const dateStr of dates) {
                    try {
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                            // Normalizar fecha usando UTC para evitar problemas de zona horaria
                            const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
                            
                            // Solo agregar si no está duplicada
                            if (!uniqueDates.has(dateKey)) {
                                uniqueDates.add(dateKey);
                                normalizedDates.push({ original: dateStr, normalized: dateKey, date });
                            }
                        }
                    } catch (error) {
                        console.error('[AGENDA_UNIFIED] Error parsing date:', dateStr, error);
                    }
                }
                
                // Procesar solo fechas únicas
                for (const { original: dateStr, normalized: dateKey, date } of normalizedDates) {
                    // Solo mostrar si NO coincide con una fecha de agendamiento
                    if (!agendaDates.has(dateKey)) {
                        // Verificar si la fecha está caducada (pasada) usando UTC
                        const today = new Date();
                        const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
                        const isExpired = dateKey < todayKey;

                        const pendingItem: AgendaItem = {
                            id: `pending-${promise.id}-${dateKey}`,
                            date,
                            time: null,
                            address: null,
                            concept: promise.contact?.name || 'Fecha de interés',
                            description: null,
                            link_meeting_url: null,
                            type_scheduling: null,
                            status: 'pending',
                            contexto: 'promise',
                            promise_id: promise.id,
                            evento_id: null,
                            metadata: null,
                            created_at: promise.created_at || null,
                            updated_at: promise.updated_at || null,
                            contact_name: promise.contact?.name || null,
                            contact_phone: promise.contact?.phone || null,
                            contact_email: promise.contact?.email || null,
                            contact_avatar_url: promise.contact?.avatar_url || null,
                            event_name: null,
                            event_type_name: promise.event_type?.name || null,
                            promise_status: 'pending',
                            evento_status: null,
                            is_pending_date: true,
                            is_expired: isExpired,
                        };
                        
                        // Calcular metadata para el item
                        pendingItem.metadata = obtenerMetadataAgenda({
                            contexto: pendingItem.contexto,
                            type_scheduling: pendingItem.type_scheduling,
                            evento_id: pendingItem.evento_id,
                            promise_id: pendingItem.promise_id,
                            date: pendingItem.date,
                            metadata: pendingItem.metadata,
                            eventos: [],
                        });
                        
                        pendingDateItems.push(pendingItem);
                    }
                }
            }
        }

        // Obtener promesas con fecha de evento confirmada (event_date o defined_date) que no tengan agendamiento
        // Solo las que NO están en etapa "approved"
        // Mostrar event_date si existe, sino mostrar defined_date
        const promisesWithDefinedDate = await prisma.studio_promises.findMany({
            where: {
                studio_id: studio.id,
                OR: [
                    { event_date: { not: null } },
                    { defined_date: { not: null } },
                ],
                AND: [
                    {
                        OR: [
                            { pipeline_stage_id: null },
                            {
                                pipeline_stage: {
                                    slug: { not: 'approved' },
                                },
                            },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                event_date: true,
                defined_date: true,
                created_at: true,
                updated_at: true,
                contact: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                        avatar_url: true,
                    },
                },
                event_type: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Filtrar promesas con event_date o defined_date que no tienen agendamiento confirmado
        const confirmedEventDateItems: AgendaItem[] = [];
        for (const promise of promisesWithDefinedDate) {
            // Usar event_date si existe, sino usar defined_date
            const fechaConfirmada = promise.event_date || promise.defined_date;
            
            if (fechaConfirmada && !promisesWithAgendaIds.has(promise.id)) {
                // Normalizar fecha usando UTC
                const eventDate = new Date(fechaConfirmada);
                const today = new Date();
                const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
                const eventDateKey = `${eventDate.getUTCFullYear()}-${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}-${String(eventDate.getUTCDate()).padStart(2, '0')}`;
                const isExpired = eventDateKey < todayKey;

                // Normalizar fecha a mediodía UTC para evitar problemas de zona horaria
                const fechaNormalizada = new Date(Date.UTC(
                    eventDate.getUTCFullYear(),
                    eventDate.getUTCMonth(),
                    eventDate.getUTCDate(),
                    12, 0, 0
                ));

                const confirmedItem: AgendaItem = {
                    id: `confirmed-${promise.id}-${eventDateKey}`,
                    date: fechaNormalizada,
                    time: null,
                    address: null,
                    concept: promise.contact?.name || 'Fecha de evento',
                    description: null,
                    link_meeting_url: null,
                    type_scheduling: null,
                    status: 'confirmed',
                    contexto: 'promise',
                    promise_id: promise.id,
                    evento_id: null,
                    metadata: null,
                    created_at: promise.created_at || null,
                    updated_at: promise.updated_at || null,
                    contact_name: promise.contact?.name || null,
                    contact_phone: promise.contact?.phone || null,
                    contact_email: promise.contact?.email || null,
                    contact_avatar_url: promise.contact?.avatar_url || null,
                    event_name: null,
                    event_type_name: promise.event_type?.name || null,
                    promise_status: 'pending',
                    evento_status: null,
                    is_pending_date: false,
                    is_confirmed_event_date: true,
                    is_expired: isExpired,
                };
                
                // Calcular metadata para el item
                confirmedItem.metadata = obtenerMetadataAgenda({
                    contexto: confirmedItem.contexto,
                    type_scheduling: confirmedItem.type_scheduling,
                    evento_id: confirmedItem.evento_id,
                    promise_id: confirmedItem.promise_id,
                    date: confirmedItem.date,
                    metadata: confirmedItem.metadata,
                    eventos: [],
                });
                
                confirmedEventDateItems.push(confirmedItem);
            }
        }

        // Combinar agendamientos confirmados con fechas pendientes y fechas de evento confirmadas
        const allItems = [...items, ...pendingDateItems, ...confirmedEventDateItems];

        // Eliminar duplicados finales: mismo promise_id/evento_id + misma fecha normalizada
        const itemsUnicos = new Map<string, AgendaItem>();
        for (const item of allItems) {
            // Asegurar que el item tenga metadata
            if (!item.metadata || (typeof item.metadata === 'object' && Object.keys(item.metadata).length === 0)) {
                item.metadata = obtenerMetadataAgenda({
                    contexto: item.contexto,
                    type_scheduling: item.type_scheduling,
                    evento_id: item.evento_id,
                    promise_id: item.promise_id,
                    date: item.date,
                    metadata: item.metadata,
                    eventos: [],
                });
            }
            
            // Crear clave única basada en contexto, ID y fecha normalizada usando UTC
            const fechaNormalizada = item.date instanceof Date ? item.date : new Date(item.date);
            const fechaKey = `${fechaNormalizada.getUTCFullYear()}-${String(fechaNormalizada.getUTCMonth() + 1).padStart(2, '0')}-${String(fechaNormalizada.getUTCDate()).padStart(2, '0')}`;
            
            let key: string;
            if (item.evento_id) {
                // Para eventos: evento_id + fecha
                key = `evento-${item.evento_id}-${fechaKey}`;
            } else if (item.promise_id) {
                // Para promesas: promise_id + fecha + tipo (para diferenciar pending_date de confirmed_date)
                const tipo = item.is_pending_date ? 'pending' : item.is_confirmed_event_date ? 'confirmed' : 'agenda';
                key = `promise-${item.promise_id}-${fechaKey}-${tipo}`;
            } else {
                // Si no tiene ID, usar el ID del item
                key = `item-${item.id}-${fechaKey}`;
            }
            
            // Solo agregar si no existe o si este es más reciente
            const existente = itemsUnicos.get(key);
            if (!existente || (item.created_at && existente.created_at && item.created_at > existente.created_at)) {
                itemsUnicos.set(key, item);
            }
        }

        const finalItems = Array.from(itemsUnicos.values()).sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
            const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
            return dateA - dateB;
        });

        // Verificación final: asegurar que todos los items tengan metadata válido
        for (const item of finalItems) {
            if (!item.metadata || (typeof item.metadata === 'object' && (!item.metadata.agenda_type))) {
                item.metadata = obtenerMetadataAgenda({
                    contexto: item.contexto,
                    type_scheduling: item.type_scheduling,
                    evento_id: item.evento_id,
                    promise_id: item.promise_id,
                    date: item.date,
                    metadata: item.metadata,
                    eventos: [],
                });
            }
        }

        return {
            success: true,
            data: finalItems,
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
                        id: true,
                        status: true,
                        promise_id: true,
                        google_event_id: true,
                        event_type: {
                            select: {
                                name: true,
                            },
                        },
                        promise: {
                            select: {
                                name: true,
                                event_date: true,
                            },
                        },
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
        });

        if (!agenda) {
            return { success: false, error: 'Agendamiento no encontrado' };
        }

        // Determinar si es fecha principal del evento
        const eventMainDate = agenda.eventos?.promise?.event_date;
        const agendaDate = agenda.date ? new Date(agenda.date) : null;
        const isMainEventDate = eventMainDate && agendaDate && 
            new Date(eventMainDate).toDateString() === agendaDate.toDateString() &&
            agenda.contexto === 'evento';

        const rawMetadata = agenda.metadata as Record<string, unknown> | null;
        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.location_address ?? agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.location_url ?? agenda.link_meeting_url,
            location_name: agenda.location_name ?? null,
            location_address: agenda.location_address ?? null,
            location_url: agenda.location_url ?? null,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: rawMetadata,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || agenda.eventos?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || agenda.eventos?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || agenda.eventos?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || agenda.eventos?.contact?.avatar_url || null,
            event_name: agenda.eventos?.promise?.name || null,
            event_type_name: agenda.eventos?.event_type?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            evento_status: agenda.eventos?.status || null,
            is_main_event_date: isMainEventDate || false,
            google_event_id: agenda.eventos?.google_event_id || null,
        };
        // Retrocompatibilidad: asegurar agenda_type para registros antiguos sin metadata
        if (!rawMetadata || (typeof rawMetadata === 'object' && !rawMetadata.agenda_type)) {
            item.metadata = obtenerMetadataAgenda({
                contexto: item.contexto as 'promise' | 'evento',
                type_scheduling: item.type_scheduling,
                evento_id: agenda.evento_id,
                promise_id: agenda.promise_id,
                date: agenda.date,
                metadata: rawMetadata,
                eventos: agenda.eventos,
            });
        }

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

        const rawMetadata = agenda.metadata as Record<string, unknown> | null;
        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.location_address ?? agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.location_url ?? agenda.link_meeting_url,
            location_name: agenda.location_name ?? null,
            location_address: agenda.location_address ?? null,
            location_url: agenda.location_url ?? null,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: 'promise',
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: rawMetadata,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || agenda.eventos?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || agenda.eventos?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || agenda.eventos?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || agenda.eventos?.contact?.avatar_url || null,
            promise_status: 'pending',
        };
        // Retrocompatibilidad: asegurar agenda_type para registros antiguos sin metadata
        if (!rawMetadata || (typeof rawMetadata === 'object' && !rawMetadata.agenda_type)) {
            item.metadata = obtenerMetadataAgenda({
                contexto: 'promise',
                type_scheduling: item.type_scheduling,
                evento_id: null,
                promise_id: item.promise_id,
                date: item.date,
                metadata: rawMetadata,
                eventos: null,
            });
        }

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
 * Obtener agendamientos por evento_id
 */
export async function obtenerAgendamientosPorEvento(
    studioSlug: string,
    eventoId: string
): Promise<AgendaListResponse> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const agendas = await prisma.studio_agenda.findMany({
            where: {
                studio_id: studio.id,
                evento_id: eventoId,
                contexto: 'evento',
            },
            include: {
                eventos: {
                    select: {
                        id: true,
                        status: true,
                        promise_id: true,
                        event_type: {
                            select: {
                                name: true,
                            },
                        },
                        promise: {
                            select: {
                                name: true,
                                event_date: true,
                            },
                        },
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
                date: 'asc',
            },
        });

        const items: AgendaItem[] = agendas.map((agenda) => {
            const eventMainDate = agenda.eventos?.promise?.event_date;
            const agendaDate = agenda.date ? new Date(agenda.date) : null;
            const isMainEventDate = eventMainDate && agendaDate &&
                new Date(eventMainDate).toDateString() === agendaDate.toDateString();
            const rawMetadata = agenda.metadata as Record<string, unknown> | null;

            const item: AgendaItem = {
                id: agenda.id,
                date: agenda.date || new Date(),
                time: agenda.time,
                address: agenda.location_address ?? agenda.address,
                concept: agenda.concept,
                description: agenda.description,
                link_meeting_url: agenda.location_url ?? agenda.link_meeting_url,
                location_name: agenda.location_name ?? null,
                location_address: agenda.location_address ?? null,
                location_url: agenda.location_url ?? null,
                type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
                status: agenda.status,
                contexto: 'evento',
                promise_id: agenda.promise_id,
                evento_id: agenda.evento_id,
                metadata: rawMetadata,
                created_at: agenda.created_at || null,
                updated_at: agenda.updated_at || null,
                contact_name: agenda.eventos?.contact?.name || null,
                contact_phone: agenda.eventos?.contact?.phone || null,
                contact_email: agenda.eventos?.contact?.email || null,
                contact_avatar_url: agenda.eventos?.contact?.avatar_url || null,
                event_name: agenda.eventos?.promise?.name || null,
                event_type_name: agenda.eventos?.event_type?.name || null,
                evento_status: agenda.eventos?.status || null,
                is_main_event_date: isMainEventDate || false,
                google_event_id: agenda.eventos?.google_event_id || null,
            };
            // Retrocompatibilidad: asegurar agenda_type para registros antiguos sin metadata
            if (!rawMetadata || (typeof rawMetadata === 'object' && !rawMetadata.agenda_type)) {
                item.metadata = obtenerMetadataAgenda({
                    contexto: 'evento',
                    type_scheduling: item.type_scheduling,
                    evento_id: agenda.evento_id,
                    promise_id: agenda.promise_id,
                    date: agenda.date,
                    metadata: rawMetadata,
                    eventos: agenda.eventos,
                });
            }
            return item;
        });

        return {
            success: true,
            data: items,
        };
    } catch (error) {
        console.error('[AGENDA_UNIFIED] Error obteniendo agendamientos por evento:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener agendamientos',
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

        // Validar que evento_id existe si se proporciona y obtener datos del evento para mejorar concepto
        let eventoData: { event_type_name: string | null; event_name: string | null } | null = null;
        if (validatedData.evento_id) {
            const evento = await prisma.studio_events.findUnique({
                where: { id: validatedData.evento_id },
                select: { 
                    studio_id: true,
                    event_type: {
                        select: {
                            name: true,
                        },
                    },
                    promise: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            if (!evento || evento.studio_id !== studio.id) {
                return { success: false, error: 'Evento no encontrado o no pertenece al studio' };
            }

            eventoData = {
                event_type_name: evento.event_type?.name || null,
                event_name: evento.promise?.name || null,
            };
        }

        // Mejorar concepto si no se proporciona y hay evento
        let concept = validatedData.concept;
        if (!concept && validatedData.evento_id && eventoData) {
            const eventTypeName = eventoData.event_type_name;
            const eventName = eventoData.event_name;
            
            if (eventName && eventTypeName) {
                concept = `${eventName} (${eventTypeName})`;
            } else if (eventName) {
                concept = eventName;
            } else if (eventTypeName) {
                concept = eventTypeName;
            }
        }

        // Calcular metadata automáticamente si no se proporciona
        let metadataToSave: Prisma.InputJsonValue | undefined;
        if (validatedData.metadata) {
            metadataToSave = validatedData.metadata as Prisma.InputJsonValue;
        } else {
            // Calcular metadata basándose en contexto y type_scheduling
            // Necesitamos determinar si es fecha principal del evento para eventos
            let isMainEventDate = false;
            if (validatedData.contexto === 'evento' && validatedData.evento_id) {
                const evento = await prisma.studio_events.findUnique({
                    where: { id: validatedData.evento_id },
                    select: {
                        promise: {
                            select: {
                                event_date: true,
                            },
                        },
                    },
                });
                if (evento?.promise?.event_date && validatedData.date) {
                    const eventMainDateOnly = new Date(Date.UTC(
                        new Date(evento.promise.event_date).getUTCFullYear(),
                        new Date(evento.promise.event_date).getUTCMonth(),
                        new Date(evento.promise.event_date).getUTCDate()
                    ));
                    const agendaDateOnly = new Date(Date.UTC(
                        new Date(validatedData.date).getUTCFullYear(),
                        new Date(validatedData.date).getUTCMonth(),
                        new Date(validatedData.date).getUTCDate()
                    ));
                    isMainEventDate = eventMainDateOnly.getTime() === agendaDateOnly.getTime();
                }
            }
            
            const calculatedMetadata = construirMetadataAgenda({
                contexto: validatedData.contexto,
                type_scheduling: validatedData.type_scheduling || null,
                isMainEventDate,
            });
            metadataToSave = calculatedMetadata as Prisma.InputJsonValue;
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
                concept: concept || null,
                description: validatedData.description || null,
                link_meeting_url: validatedData.link_meeting_url || null,
                type_scheduling: validatedData.type_scheduling || null,
                agenda_tipo: validatedData.agenda_tipo || null,
                location_name: validatedData.location_name || null,
                location_address: validatedData.location_address || null,
                location_url: validatedData.location_url || null,
                user_id: validatedData.user_id || null,
                metadata: metadataToSave,
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
                        id: true,
                        status: true,
                        promise_id: true,
                        event_type: {
                            select: {
                                name: true,
                            },
                        },
                        promise: {
                            select: {
                                name: true,
                                event_date: true,
                            },
                        },
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
        });

        // Determinar si es fecha principal del evento
        const eventMainDate = agenda.eventos?.promise?.event_date;
        const agendaDate = agenda.date ? new Date(agenda.date) : null;
        const isMainEventDate = eventMainDate && agendaDate && 
            new Date(eventMainDate).toDateString() === agendaDate.toDateString() &&
            agenda.contexto === 'evento';

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.location_address ?? agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.location_url ?? agenda.link_meeting_url,
            location_name: agenda.location_name ?? null,
            location_address: agenda.location_address ?? null,
            location_url: agenda.location_url ?? null,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: (() => {
                // Asegurar que el metadata esté presente (si no está, calcularlo)
                let itemMetadata: Record<string, unknown> | null = agenda.metadata as Record<string, unknown> | null;
                if (!itemMetadata || (typeof itemMetadata === 'object' && !itemMetadata.agenda_type)) {
                    itemMetadata = obtenerMetadataAgenda({
                        contexto: agenda.contexto,
                        type_scheduling: agenda.type_scheduling,
                        evento_id: agenda.evento_id,
                        promise_id: agenda.promise_id,
                        date: agenda.date,
                        metadata: agenda.metadata,
                        eventos: agenda.eventos,
                    });
                }
                return itemMetadata;
            })(),
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_name: agenda.promise?.contact?.name || agenda.eventos?.contact?.name || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_phone: agenda.promise?.contact?.phone || agenda.eventos?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || agenda.eventos?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || agenda.eventos?.contact?.avatar_url || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            event_name: agenda.eventos?.promise?.name || null,
            event_type_name: agenda.eventos?.event_type?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            evento_status: agenda.eventos?.status || null,
            is_main_event_date: isMainEventDate || false,
            google_event_id: agenda.eventos?.google_event_id || null,
        };

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

        if (agenda.concept?.trim()) {
            await incrementAgendaSubjectTemplateUsage(studio.id, agenda.concept.trim());
        }

        // Log si está asociado a una promesa (solo log, sin notificación)
        if (agenda.promise_id) {
            const originContext = validatedData.contexto === 'evento' ? 'EVENT' : 'PROMISE';
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
                },
                originContext
            ).catch((error) => {
                console.error('[AGENDA_UNIFIED] Error creando log:', error);
            });
        }

        // Sincronizar con Google Calendar según metadata
        const agendaMetadata = agenda.metadata as Record<string, unknown> | null;
        if (agendaMetadata?.sync_google === true && agendaMetadata?.google_calendar_type === 'primary') {
            if (agenda.evento_id && isMainEventDate) {
                try {
                    const { tieneGoogleCalendarHabilitado, sincronizarEventoPrincipalEnBackground } =
                        await import('@/lib/integrations/google/clients/calendar/helpers');
                    
                    if (await tieneGoogleCalendarHabilitado(studioSlug)) {
                        sincronizarEventoPrincipalEnBackground(agenda.evento_id, studioSlug);
                    }
                } catch (error) {
                    console.error(
                        '[Google Calendar] Error sincronizando evento en crearAgendamiento (no crítico):',
                        error
                    );
                }
            }
            // TODO: Implementar sincronización para citas comerciales (promise + type_scheduling)
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
            const evento = await prisma.studio_events.findUnique({
                where: { id: updateData.evento_id },
                select: { studio_id: true },
            });

            if (!evento || evento.studio_id !== studio.id) {
                return { success: false, error: 'Evento no encontrado o no pertenece al studio' };
            }
        }

        const updatePayload: Prisma.studio_agendaUpdateInput = {};

        // Normalizar fecha usando UTC si se está actualizando
        if (updateData.date) {
            updatePayload.date = toUtcDateOnly(updateData.date) || updateData.date;
        }
        if (updateData.time !== undefined) updatePayload.time = updateData.time || null;
        if (updateData.address !== undefined) updatePayload.address = updateData.address || null;
        if (updateData.concept !== undefined) updatePayload.concept = updateData.concept || null;
        if (updateData.description !== undefined) updatePayload.description = updateData.description || null;
        if (updateData.link_meeting_url !== undefined) updatePayload.link_meeting_url = updateData.link_meeting_url || null;
        if (updateData.type_scheduling !== undefined) updatePayload.type_scheduling = updateData.type_scheduling || null;
        if (updateData.location_name !== undefined) updatePayload.location_name = updateData.location_name || null;
        if (updateData.location_address !== undefined) updatePayload.location_address = updateData.location_address || null;
        if (updateData.location_url !== undefined) updatePayload.location_url = updateData.location_url || null;
        if (updateData.agenda_tipo !== undefined) updatePayload.agenda_tipo = updateData.agenda_tipo || null;
        if (updateData.user_id !== undefined) updatePayload.user_id = updateData.user_id || null;
        if (updateData.contexto) updatePayload.contexto = updateData.contexto;
        if (updateData.promise_id !== undefined) updatePayload.promise_id = updateData.promise_id || null;
        if (updateData.evento_id !== undefined) updatePayload.evento_id = updateData.evento_id || null;
        if (updateData.status !== undefined) updatePayload.status = updateData.status;

        // Recalcular metadata si cambian campos relevantes o si no se proporciona metadata explícitamente
        const contextoFinal = updateData.contexto || existing.contexto;
        const typeSchedulingFinal = updateData.type_scheduling !== undefined ? updateData.type_scheduling : existing.type_scheduling;
        const eventoIdFinal = updateData.evento_id !== undefined ? updateData.evento_id : existing.evento_id;
        const fechaFinal = updateData.date || existing.date;

        // Si se proporciona metadata explícitamente, usarla
        if (updateData.metadata !== undefined) {
            updatePayload.metadata = updateData.metadata ? (updateData.metadata as Prisma.InputJsonValue) : null;
        } else {
            // Recalcular metadata si cambian campos que afectan el tipo de agenda
            const necesitaRecalcular = 
                updateData.contexto !== undefined ||
                updateData.type_scheduling !== undefined ||
                updateData.evento_id !== undefined ||
                updateData.date !== undefined;

            if (necesitaRecalcular) {
                // Determinar si es fecha principal del evento
                let isMainEventDate = false;
                if (eventoIdFinal && fechaFinal && contextoFinal === 'evento') {
                    const evento = await prisma.studio_events.findUnique({
                        where: { id: eventoIdFinal },
                        select: {
                            promise: {
                                select: {
                                    event_date: true,
                                },
                            },
                        },
                    });
                    
                    if (evento?.promise?.event_date) {
                        const eventMainDateOnly = new Date(Date.UTC(
                            new Date(evento.promise.event_date).getUTCFullYear(),
                            new Date(evento.promise.event_date).getUTCMonth(),
                            new Date(evento.promise.event_date).getUTCDate()
                        ));
                        const agendaDateOnly = new Date(Date.UTC(
                            new Date(fechaFinal).getUTCFullYear(),
                            new Date(fechaFinal).getUTCMonth(),
                            new Date(fechaFinal).getUTCDate()
                        ));
                        isMainEventDate = eventMainDateOnly.getTime() === agendaDateOnly.getTime();
                    }
                }

                const nuevoMetadata = construirMetadataAgenda({
                    contexto: contextoFinal as 'promise' | 'evento',
                    type_scheduling: typeSchedulingFinal as 'presencial' | 'virtual' | null,
                    isMainEventDate,
                });
                updatePayload.metadata = nuevoMetadata as Prisma.InputJsonValue;
            }
        }

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
                        id: true,
                        status: true,
                        promise_id: true,
                        event_type: {
                            select: {
                                name: true,
                            },
                        },
                        promise: {
                            select: {
                                name: true,
                                event_date: true,
                            },
                        },
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
        });

        // Determinar si es fecha principal del evento
        const eventMainDate = agenda.eventos?.promise?.event_date;
        const agendaDate = agenda.date ? new Date(agenda.date) : null;
        const isMainEventDate = eventMainDate && agendaDate && 
            new Date(eventMainDate).toDateString() === agendaDate.toDateString() &&
            agenda.contexto === 'evento';

        const item: AgendaItem = {
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.location_address ?? agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.location_url ?? agenda.link_meeting_url,
            location_name: agenda.location_name ?? null,
            location_address: agenda.location_address ?? null,
            location_url: agenda.location_url ?? null,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_name: agenda.promise?.contact?.name || agenda.eventos?.contact?.name || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_phone: agenda.promise?.contact?.phone || agenda.eventos?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || agenda.eventos?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || agenda.eventos?.contact?.avatar_url || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            event_name: agenda.eventos?.promise?.name || null,
            event_type_name: agenda.eventos?.event_type?.name || null,
            promise_status: agenda.promise_id ? 'pending' : null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            evento_status: agenda.eventos?.status || null,
            is_main_event_date: isMainEventDate || false,
            google_event_id: agenda.eventos?.google_event_id || null,
        };

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

        if (agenda.concept?.trim()) {
            await incrementAgendaSubjectTemplateUsage(studio.id, agenda.concept.trim());
        }

        // Log si está asociado a una promesa
        if (agenda.promise_id) {
            const wasCancelled = updateData.status === 'cancelado';
            const action: 'agenda_updated' | 'agenda_cancelled' = wasCancelled ? 'agenda_cancelled' : 'agenda_updated';
            const originContext = agenda.evento_id ? 'EVENT' : 'PROMISE';
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
                },
                originContext
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
                        id: true,
                        status: true,
                        promise_id: true,
                        event_type: {
                            select: {
                                name: true,
                            },
                        },
                        promise: {
                            select: {
                                name: true,
                            },
                        },
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
                date: 'asc',
            },
        });

        const items: AgendaItem[] = agendas.map((agenda) => ({
            id: agenda.id,
            date: agenda.date || new Date(),
            time: agenda.time,
            address: agenda.location_address ?? agenda.address,
            concept: agenda.concept,
            description: agenda.description,
            link_meeting_url: agenda.location_url ?? agenda.link_meeting_url,
            location_name: agenda.location_name ?? null,
            location_address: agenda.location_address ?? null,
            location_url: agenda.location_url ?? null,
            type_scheduling: (agenda.type_scheduling as 'presencial' | 'virtual' | null) || null,
            status: agenda.status,
            contexto: (agenda.contexto as 'promise' | 'evento' | null) || null,
            promise_id: agenda.promise_id,
            evento_id: agenda.evento_id,
            metadata: agenda.metadata as Record<string, unknown> | null,
            created_at: agenda.created_at || null,
            updated_at: agenda.updated_at || null,
            contact_name: agenda.promise?.contact?.name || agenda.eventos?.contact?.name || null,
            contact_phone: agenda.promise?.contact?.phone || agenda.eventos?.contact?.phone || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_email: agenda.promise?.contact?.email || agenda.eventos?.contact?.email || null,
            // @ts-expect-error - Prisma includes relations but TypeScript doesn't infer them
            contact_avatar_url: agenda.promise?.contact?.avatar_url || agenda.eventos?.contact?.avatar_url || null,
            event_name: agenda.eventos?.promise?.name || null,
            event_type_name: agenda.eventos?.event_type?.name || null,
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

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

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

/**
 * Obtener conteo de agendamientos futuros (excluyendo promesas de evento - event_date)
 * Solo cuenta: citas comerciales, citas de eventos y fechas de eventos
 */
export async function getAgendaCount(studioSlug: string): Promise<{
    success: boolean;
    count?: number;
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

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Obtener todas las agendas futuras para filtrar
        const agendas = await prisma.studio_agenda.findMany({
            where: {
                studio_id: studio.id,
                date: {
                    gte: now,
                },
            },
            select: {
                id: true,
                contexto: true,
                type_scheduling: true,
                metadata: true,
            },
        });

        // Filtrar usando la misma lógica que getCachedAgendaEvents
        const filteredCount = agendas.filter(agenda => {
            // Estrategia de filtrado: verificar metadata primero, luego contexto
            const metadata = agenda.metadata as Record<string, unknown> | null;
            const agendaType = metadata?.agenda_type as string | undefined;
            
            // 1. Si tiene metadata con agenda_type, usarlo directamente
            if (agendaType) {
                // Excluir solo event_date (fechas de promesa sin cita)
                if (agendaType === 'event_date') {
                    return false;
                }
                // Incluir todos los demás tipos: commercial_appointment, main_event_date, event_appointment, scheduler_task
                return true;
            }
            
            // 2. Si no tiene metadata, calcular basado en contexto y type_scheduling
            // Promesa sin type_scheduling = fecha de evento (excluir)
            if (agenda.contexto === 'promise' && !agenda.type_scheduling) {
                return false;
            }
            
            // Promesa con type_scheduling = cita comercial (incluir)
            if (agenda.contexto === 'promise' && agenda.type_scheduling) {
                return true;
            }
            
            // Todos los eventos se incluyen
            if (agenda.contexto === 'evento') {
                return true;
            }
            
            // Por seguridad, excluir otros casos
            return false;
        }).length;

        return { success: true, count: filteredCount };
    } catch (error) {
        console.error('[AGENDA] Error obteniendo conteo:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

