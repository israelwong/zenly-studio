'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  createPromiseSchema,
  updatePromiseSchema,
  getPromisesSchema,
  movePromiseSchema,
  type CreatePromiseData,
  type UpdatePromiseData,
  type GetPromisesParams,
  type MovePromiseData,
  type PromisesListResponse,
  type PromiseResponse,
  type PromiseWithContact,
  type ActionResponse,
} from '@/lib/actions/schemas/promises-schemas';
import { z } from 'zod';
import { toUtcDateOnly, dateToDateOnlyString } from '@/lib/utils/date-only';

/**
 * Obtener promises con pipeline stages
 */
export async function getPromises(
  studioSlug: string,
  params: GetPromisesParams
): Promise<PromisesListResponse> {
  try {
    const validatedParams = getPromisesSchema.parse(params);
    const { page, limit, search, pipeline_stage_id } = validatedParams;

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // NUEVA ARQUITECTURA: Query directa a promesas (no a contactos)
    const where: Prisma.studio_promisesWhereInput = {
      studio_id: studio.id,
      // Filtrar por pipeline_stage si se especifica
      ...(pipeline_stage_id && { pipeline_stage_id }),
    };

    // Si hay búsqueda, filtrar por datos del contacto
    if (search) {
      where.contact = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // ✅ PASO 3: Unificar queries - Ejecutar count() y findMany() en paralelo
    const countPromise = prisma.studio_promises.count({ 
      where,
      // ✅ Usará el índice idx_studio_promises_kanban_master (studio_id, pipeline_stage_id, is_test)
    });

    // ✅ OPTIMIZACIÓN CRÍTICA: Solo traer campos necesarios para el Kanban
    const promisesPromise = prisma.studio_promises.findMany({
      where,
      select: {
        // ✅ Campos básicos de la promesa
        id: true,
        studio_id: true,
        name: true,
        event_date: true,
        defined_date: true,
        tentative_dates: true,
        event_location: true,
        duration_hours: true,
        pipeline_stage_id: true,
        event_type_id: true,
        event_location_id: true,
        is_test: true,
        updated_at: true,
        // ✅ Contact: Solo campos usados en la card
        contact: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            updated_at: true, // Para "Últ. interacción"
          },
        },
        // ✅ Pipeline stage: Solo campos usados
        pipeline_stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
          },
        },
        // ✅ Event type: Solo nombre
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        // ✅ Event: Solo para validación (no se muestra en card)
        event: {
          select: {
            id: true,
            status: true,
            promise_id: true,
            cotizacion_id: true,
            cotizacion: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        // ✅ Logs: Solo el último (usado en card)
        logs: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            created_at: true,
          },
        },
        // ✅ Tags: Solo campos usados en card (id, name, color)
        tags: {
          where: {
            tag: {
              is_active: true, // Solo tags activos
            },
          },
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                slug: true, // Para filtrado si es necesario
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        // ✅ Quotes: Solo count (no necesitamos los objetos completos)
        quotes: {
          where: {
            archived: false,
            status: { not: 'archivada' },
          },
          select: {
            id: true, // Solo para contar
          },
        },
        // ✅ Agenda: Solo el último con campos mínimos (usado en card)
        agenda: {
          select: {
            id: true,
            type_scheduling: true,
            date: true,
            time: true,
            address: true,
            link_meeting_url: true,
            concept: true,
          },
          orderBy: { date: 'desc' },
          take: 1,
          // ✅ OPTIMIZACIÓN: No traer relaciones pesadas de agenda
        },
        // ✅ Offer: Solo campos usados en card
        offer: {
          select: {
            id: true,
            name: true,
            business_term: {
              select: {
                discount_percentage: true,
                advance_percentage: true,
              },
            },
          },
        },
        // ✅ Reminder: Traer siempre (filtrar por is_completed en el mapeo para mejor performance)
        reminder: {
          select: {
            id: true,
            subject_id: true,
            subject_text: true,
            description: true,
            reminder_date: true,
            is_completed: true,
            completed_at: true,
            created_at: true,
            updated_at: true,
            subject: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // ✅ PASO 3: Ejecutar ambas queries en paralelo (Promise.all)
    const [promises, total] = await Promise.all([
      promisesPromise,
      countPromise,
    ]);

    // ✅ OPTIMIZACIÓN: Mapear promesas a PromiseWithContact
    const mappedPromises = promises.map((promise): PromiseWithContact => {
      // ✅ Mapear tags (ya filtrados por is_active en la query)
      const tags = promise.tags?.map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug,
        color: pt.tag.color,
        description: null, // No se usa en card
        order: 0, // No se usa en card
        is_active: true, // Ya filtrado
        created_at: new Date(), // No se usa en card
        updated_at: new Date(), // No se usa en card
      })) || [];

      // Validar que el evento realmente pertenezca a esta promesa Y tenga cotización autorizada
      // Un evento solo es válido si tiene una cotización autorizada/aprobada asociada
      let validEvent = null;
      if (promise.event) {
        // Validación 1: el evento debe tener el promise_id correcto
        const hasCorrectPromiseId = promise.event.promise_id === promise.id;

        // Validación 2: el evento debe tener cotización autorizada/aprobada
        const cotizacionStatus = promise.event.cotizacion?.status;
        const hasAuthorizedCotizacion = promise.event.cotizacion_id &&
          cotizacionStatus &&
          ['autorizada', 'aprobada', 'approved'].includes(cotizacionStatus.toLowerCase());

        if (hasCorrectPromiseId && hasAuthorizedCotizacion) {
          validEvent = {
            id: promise.event.id,
            status: promise.event.status,
          };
        } else {
          // No asignar el evento si no cumple las condiciones
          validEvent = null;
        }
      }

      return {
        id: promise.contact.id,
        promise_id: promise.id,
        studio_id: promise.studio_id,
        name: promise.contact.name,
        phone: '', // ✅ No se usa en card del kanban - valor por defecto
        email: null, // ✅ No se usa en card del kanban
        address: null, // ✅ No se usa en card del kanban
        avatar_url: promise.contact.avatar_url,
        status: 'prospecto', // ✅ No se usa en card del kanban - valor por defecto
        event_type_id: promise.event_type_id,
        event_name: promise.name || null,
        event_location: promise.event_location || null,
        event_location_id: promise.event_location_id ?? null,
        duration_hours: promise.duration_hours || null,
        interested_dates: promise.tentative_dates
          ? (promise.tentative_dates as string[])
          : null,
        // Normalizar event_date: convertir Date a string YYYY-MM-DD antes de serializar
        event_date: promise.event_date
          ? dateToDateOnlyString(promise.event_date)
          : null,
        // Normalizar defined_date también
        defined_date: promise.defined_date
          ? dateToDateOnlyString(promise.defined_date)
          : null,
        promise_pipeline_stage_id: promise.pipeline_stage_id,
        is_test: promise.is_test || false,
        acquisition_channel_id: null, // ✅ No se usa en card del kanban
        social_network_id: null, // ✅ No se usa en card del kanban
        referrer_contact_id: null, // ✅ No se usa en card del kanban
        referrer_name: null, // ✅ No se usa en card del kanban
        created_at: promise.contact.updated_at || promise.updated_at || new Date(), // ✅ Valor por defecto
        updated_at: promise.contact.updated_at || promise.updated_at, // Usado para "Últ. interacción"
        event_type: promise.event_type || null,
        promise_pipeline_stage: promise.pipeline_stage || null,
        last_log: promise.logs?.[0] || null,
        tags: tags.length > 0 ? tags : undefined,
        cotizaciones_count: promise.quotes?.length || 0,
        event: validEvent,
        agenda: promise.agenda?.[0] || null,
        offer: promise.offer ? {
          id: promise.offer.id,
          name: promise.offer.name,
          slug: '', // No se usa en card
          business_term: promise.offer.business_term ? {
            id: '', // No se usa en card
            name: '', // No se usa en card
            discount_percentage: promise.offer.business_term.discount_percentage,
            advance_percentage: promise.offer.business_term.advance_percentage,
          } : null,
        } : null,
        // ✅ Reminder: Incluir solo si existe y NO está completado (filtrar en mapeo)
        reminder: promise.reminder && !promise.reminder.is_completed ? {
          id: promise.reminder.id,
          studio_id: promise.studio_id,
          promise_id: promise.id,
          subject_id: promise.reminder.subject_id,
          subject_text: promise.reminder.subject_text,
          description: promise.reminder.description,
          reminder_date: promise.reminder.reminder_date,
          is_completed: promise.reminder.is_completed,
          completed_at: promise.reminder.completed_at,
          completed_by_user_id: null, // No se usa en card
          metadata: null, // No se usa en card
          created_at: promise.reminder.created_at,
          updated_at: promise.reminder.updated_at,
          subject: promise.reminder.subject,
          completed_by: null, // No se usa en card
        } : null,
      };
    });

    return {
      success: true,
      data: {
        promises: mappedPromises,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('[PROMISES] Error obteniendo promises:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtener una promesa por ID en formato PromiseWithContact
 */
export async function getPromiseByIdAsPromiseWithContact(
  studioSlug: string,
  promiseId: string
): Promise<ActionResponse<PromiseWithContact>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
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
            avatar_url: true,
            status: true,
            acquisition_channel_id: true,
            social_network_id: true,
            referrer_contact_id: true,
            referrer_name: true,
            created_at: true,
            updated_at: true,
            acquisition_channel: {
              select: {
                name: true,
              },
            },
            social_network: {
              select: {
                name: true,
              },
            },
          },
        },
        pipeline_stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
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
            status: true,
            promise_id: true, // Incluir promise_id para validación explícita
            cotizacion_id: true, // Incluir cotizacion_id para validar que tenga cotización autorizada
            cotizacion: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        logs: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            created_at: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
                description: true,
                order: true,
                is_active: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        quotes: {
          where: {
            archived: false,
            status: { not: 'archivada' },
          },
          select: {
            id: true,
          },
        },
        agenda: {
          select: {
            id: true,
            type_scheduling: true,
            date: true,
            time: true,
            address: true,
            link_meeting_url: true,
            concept: true,
          },
          orderBy: { date: 'desc' },
          take: 1,
        },
        offer: {
          select: {
            id: true,
            name: true,
            slug: true,
            business_term: {
              select: {
                id: true,
                name: true,
                discount_percentage: true,
                advance_percentage: true,
              },
            },
          },
        },
      },
    });

    if (!promise) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Mapear tags activos
    const tags = promise.tags
      ?.filter((pt) => pt.tag.is_active)
      .map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug,
        color: pt.tag.color,
        description: pt.tag.description,
        order: pt.tag.order,
        is_active: pt.tag.is_active,
        created_at: pt.tag.created_at,
        updated_at: pt.tag.updated_at,
      })) || [];

    // Validar que el evento tenga cotización autorizada (misma lógica que en getPromises)
    let validEvent = null;
    if (promise.event) {
      const hasCorrectPromiseId = promise.event.promise_id === promise.id;
      const cotizacionStatus = promise.event.cotizacion?.status;
      const hasAuthorizedCotizacion = promise.event.cotizacion_id &&
        cotizacionStatus &&
        ['autorizada', 'aprobada', 'approved'].includes(cotizacionStatus.toLowerCase());

      if (hasCorrectPromiseId && hasAuthorizedCotizacion) {
        validEvent = {
          id: promise.event.id,
          status: promise.event.status,
        };
      }
    }

    const promiseWithContact: PromiseWithContact = {
      id: promise.contact.id,
      promise_id: promise.id,
      studio_id: promise.studio_id,
      name: promise.contact.name,
      phone: promise.contact.phone,
      email: promise.contact.email,
      address: promise.contact.address || null,
      avatar_url: promise.contact.avatar_url,
      status: promise.contact.status,
      event_type_id: promise.event_type_id,
      event_name: promise.name || null,
      event_location: promise.event_location || null,
      event_location_id: promise.event_location_id ?? null,
      duration_hours: promise.duration_hours || null,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      // Normalizar event_date a string YYYY-MM-DD antes de serializar
      event_date: promise.event_date
        ? dateToDateOnlyString(promise.event_date)
        : null,
      // Normalizar defined_date también
      defined_date: promise.defined_date
        ? dateToDateOnlyString(promise.defined_date)
        : null,
      promise_pipeline_stage_id: promise.pipeline_stage_id,
      is_test: promise.is_test || false,
      acquisition_channel_id: promise.contact.acquisition_channel_id,
      acquisition_channel_name: promise.contact.acquisition_channel?.name || null,
      social_network_id: promise.contact.social_network_id,
      social_network_name: promise.contact.social_network?.name || null,
      referrer_contact_id: promise.contact.referrer_contact_id,
      referrer_name: promise.contact.referrer_name,
      created_at: promise.contact.created_at,
      updated_at: promise.updated_at,
      event_type: promise.event_type || null,
      promise_pipeline_stage: promise.pipeline_stage || null,
      last_log: promise.logs?.[0] || null,
      tags: tags.length > 0 ? tags : undefined,
      cotizaciones_count: promise.quotes?.length || 0,
      event: validEvent,
      agenda: promise.agenda?.[0] || null,
      offer: promise.offer ? {
        id: promise.offer.id,
        name: promise.offer.name,
        slug: promise.offer.slug,
        business_term: promise.offer.business_term ? {
          id: promise.offer.business_term.id,
          name: promise.offer.business_term.name,
          discount_percentage: promise.offer.business_term.discount_percentage,
          advance_percentage: promise.offer.business_term.advance_percentage,
        } : null,
      } : null,
    };

    return {
      success: true,
      data: promiseWithContact,
    };
  } catch (error) {
    console.error('[PROMISES] Error obteniendo promesa por ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crear nueva promise
 */
export async function createPromise(
  studioSlug: string,
  data: CreatePromiseData
): Promise<PromiseResponse> {
  try {
    const validatedData = createPromiseSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Validaciones condicionales para canal de adquisición
    if (validatedData.acquisition_channel_id) {
      const channel = await prisma.platform_acquisition_channels.findUnique({
        where: { id: validatedData.acquisition_channel_id },
        select: { name: true },
      });

      if (channel) {
        const channelNameLower = channel.name.toLowerCase();
        const isRedSocial = channelNameLower.includes('red') || channelNameLower.includes('social');
        const isReferido = channelNameLower.includes('referido') || channelNameLower.includes('referral');

        if (isRedSocial && !validatedData.social_network_id) {
          return { success: false, error: 'Debes seleccionar una red social cuando el canal es "Redes Sociales"' };
        }

        if (isReferido && !validatedData.referrer_id && !validatedData.referrer_contact_id && !validatedData.referrer_name) {
          return { success: false, error: 'Debes especificar el referido cuando el canal es "Referidos"' };
        }
      }
    }

    // ✅ Obtener etapa con order 0 (primera posición) por defecto si no se especifica
    let stageId = validatedData.promise_pipeline_stage_id;
    if (!stageId) {
      // Buscar el stage con order 0 específicamente (primera posición del pipeline)
      const nuevoStage = await prisma.studio_promise_pipeline_stages.findFirst({
        where: {
          studio_id: studio.id,
          is_active: true,
          order: 0, // ✅ Específicamente order 0
        },
        select: { id: true },
      });
      
      // Si no hay stage con order 0, buscar el de order más bajo como fallback
      if (!nuevoStage) {
        const fallbackStage = await prisma.studio_promise_pipeline_stages.findFirst({
          where: {
            studio_id: studio.id,
            is_active: true,
          },
          orderBy: {
            order: 'asc', // Obtener el stage con el order más bajo
          },
          select: { id: true },
        });
        stageId = fallbackStage?.id || undefined;
      } else {
        stageId = nuevoStage.id;
      }
    }

    // Crear o encontrar contacto
    const contact = await prisma.studio_contacts.upsert({
      where: {
        studio_id_phone: {
          studio_id: studio.id,
          phone: validatedData.phone,
        },
      },
      update: {
        name: validatedData.name,
        email: validatedData.email || null,
        address: validatedData.address && validatedData.address.trim() !== '' ? validatedData.address.trim() : null,
        status: 'prospecto',
        acquisition_channel_id: validatedData.acquisition_channel_id || null,
        social_network_id: validatedData.social_network_id || null,
        referrer_contact_id: validatedData.referrer_contact_id || null,
        referrer_name: validatedData.referrer_name || null,
      },
      create: {
        studio_id: studio.id,
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        address: validatedData.address && validatedData.address.trim() !== '' ? validatedData.address.trim() : null,
        status: 'prospecto',
        acquisition_channel_id: validatedData.acquisition_channel_id || null,
        social_network_id: validatedData.social_network_id || null,
        referrer_contact_id: validatedData.referrer_contact_id || null,
        referrer_name: validatedData.referrer_name || null,
      },
    });

    // Crear promesa asociada
    // event_location es opcional, puede ser null si está vacío
    const eventLocation = validatedData.event_type_id && validatedData.event_location
      ? validatedData.event_location.trim() || null
      : null;

    // duration_hours solo se guarda si hay event_type_id (igual que event_location)
    const durationHours = validatedData.event_type_id && validatedData.duration_hours
      ? validatedData.duration_hours
      : null;

    // Parsear fecha en UTC (sin cambios por zona horaria)
    // VALIDACIÓN ESTRICTA: Solo aceptar una fecha y guardarla en event_date
    // El schema ya normaliza a array de máximo 1 elemento
    let eventDate: Date | null = null;
    const interestedDatesArray = Array.isArray(validatedData.interested_dates)
      ? validatedData.interested_dates
      : validatedData.interested_dates
        ? [validatedData.interested_dates]
        : [];

    // Validar que solo haya una fecha (el schema ya lo garantiza, pero doble validación)
    if (interestedDatesArray.length > 1) {
      console.warn('[createPromise] Múltiples fechas detectadas, usando solo la primera');
    }

    if (interestedDatesArray.length >= 1) {
      const dateString = interestedDatesArray[0];
      eventDate = toUtcDateOnly(dateString);
    }

    const promise = await prisma.studio_promises.create({
      data: {
        studio_id: studio.id,
        contact_id: contact.id,
        event_type_id: validatedData.event_type_id || null,
        event_location: eventLocation,
        event_location_id: validatedData.event_location_id ?? null,
        name: validatedData.event_name?.trim() || null,
        duration_hours: durationHours,
        pipeline_stage_id: stageId,
        // ⚠️ DEPRECATED: status removido - usar pipeline_stage_id en su lugar
        event_date: eventDate, // ✅ Guardar directamente en event_date (solo una fecha permitida)
        tentative_dates: Prisma.JsonNull, // ✅ Ya no usar tentative_dates, solo event_date
        // Campos de atribución de comisiones
        sales_agent_id: validatedData.sales_agent_id || null,
        referrer_id: validatedData.referrer_id || null,
        referrer_type: validatedData.referrer_type || null,
        // Notas contextuales
        notes: validatedData.notes?.trim() || null,
      },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        pipeline_stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
          },
        },
      },
    });

    const promiseWithContact: PromiseWithContact = {
      id: contact.id,
      promise_id: promise.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address || null,
      avatar_url: contact.avatar_url,
      status: contact.status,
      event_type_id: promise.event_type_id,
      event_name: promise.name || null,
      event_location: promise.event_location || null,
      event_location_id: promise.event_location_id ?? null,
      duration_hours: promise.duration_hours || null,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      event_date: promise.event_date
        ? dateToDateOnlyString(promise.event_date)
        : null,
      defined_date: promise.defined_date
        ? dateToDateOnlyString(promise.defined_date)
        : null,
      promise_pipeline_stage_id: promise.pipeline_stage_id,
      is_test: promise.is_test, // ✅ Incluir flag de prueba
      acquisition_channel_id: contact.acquisition_channel_id,
      social_network_id: contact.social_network_id,
      referrer_contact_id: contact.referrer_contact_id,
      referrer_name: contact.referrer_name,
      notes: promise.notes,
      created_at: contact.created_at,
      updated_at: promise.updated_at,
      event_type: promise.event_type || null,
      promise_pipeline_stage: promise.pipeline_stage || null,
      last_log: null,
    };

    // Revalidar tanto la lista como la página individual de la promesa
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promise.id}`);
    revalidateTag(`promises-list-${studioSlug}`, 'max'); // Invalidar caché de lista (con studioSlug para aislamiento entre tenants)

    // Crear log automático de creación de promesa
    try {
      const { logPromiseAction } = await import('./promise-logs.actions');

      // Obtener nombre del canal de adquisición
      let channelName = 'canal desconocido';
      if (validatedData.acquisition_channel_id) {
        const channel = await prisma.platform_acquisition_channels.findUnique({
          where: { id: validatedData.acquisition_channel_id },
          select: { name: true },
        });
        if (channel) {
          channelName = channel.name;
        }
      }

      await logPromiseAction(
        studioSlug,
        promise.id,
        'promise_created',
        'system',
        null,
        {
          contactName: contact.name,
          channelName: channelName,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[PROMISES] Error registrando log de promesa creada:', error);
      });
    } catch (logError) {
      console.error('[PROMISES] Error creando log de promesa:', logError);
      // No fallar la creación de la promesa si falla el log
    }


    return {
      success: true,
      data: promiseWithContact,
    };
  } catch (error) {
    console.error('[PROMISES] Error creando promise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear promise',
    };
  }
}

/**
 * Actualizar promise
 */
export async function updatePromise(
  studioSlug: string,
  data: UpdatePromiseData
): Promise<PromiseResponse> {
  try {
    const validatedData = updatePromiseSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener datos anteriores del contacto para comparar cambios y validaciones
    const oldContact = await prisma.studio_contacts.findUnique({
      where: { id: validatedData.id },
      select: {
        name: true,
        phone: true,
        email: true,
        acquisition_channel_id: true,
        social_network_id: true,
        referrer_contact_id: true,
        referrer_name: true,
      },
    });

    if (!oldContact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    // Validaciones condicionales para canal de adquisición
    // Solo validar si se está cambiando el canal o si el canal actual requiere campos adicionales
    const acquisitionChannelId = validatedData.acquisition_channel_id ?? oldContact.acquisition_channel_id;
    if (acquisitionChannelId) {
      const channel = await prisma.platform_acquisition_channels.findUnique({
        where: { id: acquisitionChannelId },
        select: { name: true },
      });

      if (channel) {
        const channelNameLower = channel.name.toLowerCase();
        const isRedSocial = channelNameLower.includes('red') || channelNameLower.includes('social');
        const isReferido = channelNameLower.includes('referido') || channelNameLower.includes('referral');

        // Para red social: validar solo si se está cambiando el canal o si no hay red social guardada
        if (isRedSocial) {
          const socialNetworkId = validatedData.social_network_id ?? oldContact.social_network_id;
          if (!socialNetworkId) {
            return { success: false, error: 'Debes seleccionar una red social cuando el canal es "Redes Sociales"' };
          }
        }

        // Para referido: considerar referrer_id (nuevo) o referrer_contact_id / referrer_name (contacto)
        if (isReferido) {
          const referrerId = validatedData.referrer_id;
          const referrerContactId = validatedData.referrer_contact_id ?? oldContact.referrer_contact_id;
          const referrerName = validatedData.referrer_name ?? oldContact.referrer_name;
          if (!referrerId && !referrerContactId && !referrerName) {
            return { success: false, error: 'Debes especificar el referido cuando el canal es "Referidos"' };
          }
        }
      }
    }

    // Validar que el teléfono no esté en uso por otro contacto del mismo estudio
    if (validatedData.phone !== oldContact.phone) {
      const existingContact = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          phone: validatedData.phone,
          id: { not: validatedData.id }, // Excluir el contacto actual
        },
        select: { id: true },
      });

      if (existingContact) {
        return { success: false, error: 'Este teléfono ya está registrado para otro contacto en este estudio' };
      }
    }

    // Detectar cambios
    const changes: string[] = [];
    if (oldContact.name !== validatedData.name) {
      changes.push(`nombre: "${oldContact.name}" → "${validatedData.name}"`);
    }
    if (oldContact.phone !== validatedData.phone) {
      changes.push(`teléfono: "${oldContact.phone}" → "${validatedData.phone}"`);
    }
    if (oldContact.email !== validatedData.email) {
      changes.push(`email: "${oldContact.email || '(sin email)'}" → "${validatedData.email || '(sin email)'}"`);
    }

    // Actualizar contacto
    const addressToSave = validatedData.address && validatedData.address.trim() !== '' ? validatedData.address.trim() : null;

    const contact = await prisma.studio_contacts.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email,
        address: addressToSave,
        acquisition_channel_id: validatedData.acquisition_channel_id || null,
        social_network_id: validatedData.social_network_id || null,
        referrer_contact_id: validatedData.referrer_contact_id || null,
        referrer_name: validatedData.referrer_name || null,
      },
    });

    // Obtener o crear promesa más reciente
    const latestPromise = await prisma.studio_promises.findFirst({
      where: { contact_id: validatedData.id },
      orderBy: { created_at: 'desc' },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        pipeline_stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
          },
        },
      },
    });

    // Actualizar o crear promesa
    let promise;
    if (latestPromise) {
      // event_location es opcional, puede ser null si está vacío
      const eventLocationUpdate = validatedData.event_type_id && validatedData.event_location !== undefined
        ? (validatedData.event_location?.trim() || null)
        : validatedData.event_location !== undefined ? validatedData.event_location || null : undefined;

      // Construir objeto data condicionalmente usando tipo específico de Prisma
      const updateData: Prisma.studio_promisesUpdateInput = {};

      if (validatedData.event_type_id !== undefined) {
        updateData.event_type = validatedData.event_type_id
          ? { connect: { id: validatedData.event_type_id } }
          : { disconnect: true };
      }

      if (eventLocationUpdate !== undefined) {
        updateData.event_location = eventLocationUpdate;
      }

      if (validatedData.event_location_id !== undefined) {
        updateData.event_location_ref = validatedData.event_location_id
          ? { connect: { id: validatedData.event_location_id } }
          : { disconnect: true };
      }

      // Sincronizar event_location con el nombre actual de la locación si hay event_location_id (evitar desfase tras editar locación)
      const effectiveLocationId = validatedData.event_location_id ?? latestPromise.event_location_id;
      if (effectiveLocationId) {
        const locationRecord = await prisma.studio_locations.findUnique({
          where: { id: effectiveLocationId },
          select: { name: true },
        });
        if (locationRecord) {
          const currentName = (validatedData.event_location?.trim() ?? latestPromise.event_location ?? '') || '';
          if (locationRecord.name !== currentName) {
            updateData.event_location = locationRecord.name;
          }
        }
      }

      // Usar set para campos opcionales que pueden ser null
      if (validatedData.event_name !== undefined) {
        const eventNameValue = validatedData.event_name?.trim() || null;
        updateData.name = eventNameValue;
      }

      // duration_hours solo se guarda si hay event_type_id (igual que event_location)
      if (validatedData.duration_hours !== undefined) {
        // Si hay event_type_id y duration_hours tiene valor, guardarlo
        // Si hay event_type_id pero duration_hours es null, guardar null (limpiar)
        // Si no hay event_type_id, siempre guardar null
        const durationHoursUpdate = validatedData.event_type_id
          ? (validatedData.duration_hours ?? null)
          : null;
        updateData.duration_hours = durationHoursUpdate;
      }

      if (validatedData.promise_pipeline_stage_id !== undefined) {
        updateData.pipeline_stage = validatedData.promise_pipeline_stage_id
          ? { connect: { id: validatedData.promise_pipeline_stage_id } }
          : { disconnect: true };
      }

      if (validatedData.interested_dates !== undefined) {
        updateData.tentative_dates = validatedData.interested_dates
          ? (validatedData.interested_dates as Prisma.InputJsonValue)
          : Prisma.DbNull;

        // Si hay una sola fecha, guardarla también como event_date
        if (validatedData.interested_dates && validatedData.interested_dates.length === 1) {
          const dateString = validatedData.interested_dates[0];
          updateData.event_date = toUtcDateOnly(dateString);
        } else if (validatedData.interested_dates && validatedData.interested_dates.length === 0) {
          // Si se eliminan todas las fechas, limpiar event_date
          updateData.event_date = null;
        } else if (validatedData.interested_dates && validatedData.interested_dates.length > 1) {
          // Si hay múltiples fechas, limpiar event_date (solo usar tentative_dates)
          updateData.event_date = null;
        }
      }

      // Campos de atribución de comisiones
      if (validatedData.sales_agent_id !== undefined) {
        updateData.sales_agent = validatedData.sales_agent_id
          ? { connect: { id: validatedData.sales_agent_id } }
          : { disconnect: true };
      }
      if (validatedData.referrer_id !== undefined) {
        updateData.referrer_id = validatedData.referrer_id || null;
      }
      if (validatedData.referrer_type !== undefined) {
        updateData.referrer_type = validatedData.referrer_type || null;
      }
      // Notas contextuales
      if (validatedData.notes !== undefined) {
        updateData.notes = validatedData.notes?.trim() || null;
      }

      // Solo actualizar si hay cambios en los datos de la promesa
      if (Object.keys(updateData).length > 0) {
        promise = await prisma.studio_promises.update({
          where: { id: latestPromise.id },
          data: updateData as Prisma.studio_promisesUpdateInput,
          include: {
            event_type: {
              select: {
                id: true,
                name: true,
              },
            },
            pipeline_stage: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
                order: true,
              },
            },
          },
        });
      } else {
        // Si no hay cambios en la promesa, usar la promesa existente
        promise = latestPromise;
      }
    } else {
      // Crear nueva promesa si no existe
      const stageId = validatedData.promise_pipeline_stage_id ||
        (await prisma.studio_promise_pipeline_stages.findFirst({
          where: {
            studio_id: contact.studio_id,
            slug: 'pending',
            is_active: true,
          },
          select: { id: true },
        }))?.id || null;

      // event_location es opcional, puede ser null si está vacío
      const eventLocationCreate = validatedData.event_type_id && validatedData.event_location
        ? validatedData.event_location.trim() || null
        : null;

      // Parsear fecha en UTC (sin cambios por zona horaria)
      let eventDateCreate: Date | null = null;
      if (validatedData.interested_dates && validatedData.interested_dates.length === 1) {
        const dateString = validatedData.interested_dates[0];
        eventDateCreate = toUtcDateOnly(dateString);
      }

      // duration_hours solo se guarda si hay event_type_id (igual que event_location)
      const durationHoursCreate = validatedData.event_type_id && validatedData.duration_hours
        ? validatedData.duration_hours
        : null;

      promise = await prisma.studio_promises.create({
        data: {
          studio_id: contact.studio_id,
          contact_id: contact.id,
          event_type_id: validatedData.event_type_id || null,
          event_location: eventLocationCreate,
          event_location_id: validatedData.event_location_id ?? null,
          name: validatedData.event_name?.trim() || null,
          duration_hours: durationHoursCreate,
          pipeline_stage_id: stageId,
          // ⚠️ DEPRECATED: status removido - usar pipeline_stage_id en su lugar
          event_date: eventDateCreate,
          tentative_dates: validatedData.interested_dates
            ? (validatedData.interested_dates as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          // Campos de atribución de comisiones
          sales_agent_id: validatedData.sales_agent_id || null,
          referrer_id: validatedData.referrer_id || null,
          referrer_type: validatedData.referrer_type || null,
          // Notas contextuales
          notes: validatedData.notes?.trim() || null,
        },
        include: {
          event_type: {
            select: {
              id: true,
              name: true,
            },
          },
          pipeline_stage: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
              order: true,
            },
          },
        },
      });
    }

    // Registrar log si hubo cambios en los datos del contacto
    if (changes.length > 0) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        studioSlug,
        promise.id,
        'contact_updated',
        'user', // Asumimos que es acción de usuario
        null, // TODO: Obtener userId del contexto
        {
          changes,
        }
      ).catch((error) => {
        // No fallar si el log falla, solo registrar error
        console.error('[PROMISES] Error registrando log de actualización de contacto:', error);
      });
    }

    // Registrar log si hubo cambios en atribución de comisiones
    const attributionChanges: string[] = [];
    if (latestPromise && validatedData.sales_agent_id !== undefined) {
      const oldSalesAgentId = latestPromise.sales_agent_id;
      if (oldSalesAgentId !== validatedData.sales_agent_id) {
        // Obtener nombres de los agentes para el log
        let oldName = 'Ninguno';
        let newName = 'Ninguno';
        if (oldSalesAgentId) {
          const oldAgent = await prisma.studio_users.findUnique({
            where: { id: oldSalesAgentId },
            select: { full_name: true },
          });
          oldName = oldAgent?.full_name || 'Desconocido';
        }
        if (validatedData.sales_agent_id) {
          const newAgent = await prisma.studio_users.findUnique({
            where: { id: validatedData.sales_agent_id },
            select: { full_name: true },
          });
          newName = newAgent?.full_name || 'Desconocido';
        }
        attributionChanges.push(`Agente de ventas: "${oldName}" → "${newName}"`);
      }
    }
    if (latestPromise && (validatedData.referrer_id !== undefined || validatedData.referrer_type !== undefined)) {
      const oldReferrerId = latestPromise.referrer_id;
      const oldReferrerType = latestPromise.referrer_type;
      const newReferrerId = validatedData.referrer_id ?? oldReferrerId;
      const newReferrerType = validatedData.referrer_type ?? oldReferrerType;
      
      if (oldReferrerId !== newReferrerId || oldReferrerType !== newReferrerType) {
        let oldReferrerName = 'Ninguno';
        let newReferrerName = 'Ninguno';
        
        if (oldReferrerId && oldReferrerType) {
          if (oldReferrerType === 'STAFF') {
            const oldStaff = await prisma.studio_users.findUnique({
              where: { id: oldReferrerId },
              select: { full_name: true },
            }).catch(() => null) || await prisma.studio_crew_members.findUnique({
              where: { id: oldReferrerId },
              select: { name: true },
            }).catch(() => null);
            oldReferrerName = oldStaff?.full_name || oldStaff?.name || 'Desconocido';
          } else if (oldReferrerType === 'CONTACT') {
            const oldContact = await prisma.studio_contacts.findUnique({
              where: { id: oldReferrerId },
              select: { name: true },
            }).catch(() => null);
            oldReferrerName = oldContact?.name || 'Desconocido';
          }
        }
        
        if (newReferrerId && newReferrerType) {
          if (newReferrerType === 'STAFF') {
            const newStaff = await prisma.studio_users.findUnique({
              where: { id: newReferrerId },
              select: { full_name: true },
            }).catch(() => null) || await prisma.studio_crew_members.findUnique({
              where: { id: newReferrerId },
              select: { name: true },
            }).catch(() => null);
            newReferrerName = newStaff?.full_name || newStaff?.name || 'Desconocido';
          } else if (newReferrerType === 'CONTACT') {
            const newContact = await prisma.studio_contacts.findUnique({
              where: { id: newReferrerId },
              select: { name: true },
            }).catch(() => null);
            newReferrerName = newContact?.name || 'Desconocido';
          }
        }
        
        attributionChanges.push(`Referido por: "${oldReferrerName}" (${oldReferrerType || 'N/A'}) → "${newReferrerName}" (${newReferrerType || 'N/A'})`);
      }
    }
    
    if (attributionChanges.length > 0) {
      const { logPromiseAction } = await import('./promise-logs.actions');
      await logPromiseAction(
        studioSlug,
        promise.id,
        'attribution_updated',
        'user',
        null,
        {
          changes: attributionChanges,
        }
      ).catch((error) => {
        console.error('[PROMISES] Error registrando log de atribución:', error);
      });
    }

    const promiseWithContact: PromiseWithContact = {
      id: contact.id,
      promise_id: promise.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address || null,
      avatar_url: contact.avatar_url,
      status: contact.status,
      event_type_id: promise.event_type_id,
      event_name: promise.name || null,
      event_location: promise.event_location || null,
      event_location_id: promise.event_location_id ?? null,
      duration_hours: promise.duration_hours || null,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      // Normalizar event_date a string YYYY-MM-DD antes de serializar
      event_date: promise.event_date
        ? dateToDateOnlyString(promise.event_date)
        : null,
      // Normalizar defined_date también
      defined_date: promise.defined_date
        ? dateToDateOnlyString(promise.defined_date)
        : null,
      promise_pipeline_stage_id: promise.pipeline_stage_id,
      is_test: promise.is_test,
      acquisition_channel_id: contact.acquisition_channel_id,
      social_network_id: contact.social_network_id,
      referrer_contact_id: contact.referrer_contact_id,
      referrer_name: contact.referrer_name,
      notes: promise.notes,
      created_at: contact.created_at,
      updated_at: promise.updated_at,
      event_type: promise.event_type || null,
      promise_pipeline_stage: promise.pipeline_stage || null,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidateTag(`promises-list-${studioSlug}`, 'max'); // Invalidar caché de lista (con studioSlug para aislamiento entre tenants)

    return {
      success: true,
      data: promiseWithContact,
    };
  } catch (error) {
    console.error('[PROMISES] Error actualizando promise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar promise',
    };
  }
}

/**
 * Mover promise entre etapas del pipeline
 */
export async function movePromise(
  studioSlug: string,
  data: MovePromiseData
): Promise<PromiseResponse> {
  try {
    const validatedData = movePromiseSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la etapa existe
    const stage = await prisma.studio_promise_pipeline_stages.findUnique({
      where: { id: validatedData.new_stage_id },
      select: { studio_id: true, name: true, slug: true, is_active: true },
    });

    if (!stage) {
      console.error('[PROMISES] Etapa no encontrada:', validatedData.new_stage_id);
      return { 
        success: false, 
        error: 'La etapa seleccionada no existe o fue eliminada. Por favor, recarga la página y selecciona otra etapa.' 
      };
    }

    if (stage.studio_id !== studio.id) {
      return { 
        success: false, 
        error: 'La etapa seleccionada no pertenece a este estudio. Por favor, selecciona una etapa válida.' 
      };
    }

    if (!stage.is_active) {
      return { 
        success: false, 
        error: `La etapa "${stage.name}" está desactivada. Por favor, selecciona una etapa activa.` 
      };
    }

    // Obtener promesa con etapa actual y evento asociado
    let promise = await prisma.studio_promises.findUnique({
      where: { id: validatedData.promise_id },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        pipeline_stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
          },
        },
        event: {
          select: {
            id: true,
            status: true,
            promise_id: true, // Incluir promise_id para validación explícita
            cotizacion_id: true, // Incluir cotizacion_id para validar que tenga cotización autorizada
            cotizacion: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!promise) {
      return { success: false, error: 'Promise no encontrada' };
    }

    // Guardar etapa anterior para el historial
    const oldStageId = promise.pipeline_stage_id;
    const oldStageSlug = promise.pipeline_stage?.slug || null;
    const oldStageName = promise.pipeline_stage?.name || 'desconocida';

    // Obtener nueva etapa con slug
    const newStage = await prisma.studio_promise_pipeline_stages.findUnique({
      where: { id: validatedData.new_stage_id },
      select: { name: true, slug: true },
    });

    if (!newStage) {
      return { success: false, error: 'Etapa destino no encontrada' };
    }

    const newStageName = newStage.name;
    const newStageSlug = newStage.slug;

    // Restricción: Si la promesa está en "approved" y tiene evento asociado CON cotización autorizada,
    // solo se puede mover a "archived"
    // Un evento solo es válido si tiene una cotización autorizada/aprobada asociada
    const eventId = promise.event?.id;
    const hasEventId = Boolean(
      eventId &&
      typeof eventId === 'string' &&
      eventId.trim() !== ''
    );

    // Validar que el evento tenga cotización autorizada
    const cotizacionStatus = promise.event?.cotizacion?.status;
    const hasAuthorizedCotizacion = Boolean(
      promise.event?.cotizacion_id &&
      cotizacionStatus &&
      ['autorizada', 'aprobada', 'approved'].includes(cotizacionStatus.toLowerCase())
    );

    const hasValidEvent = hasEventId && hasAuthorizedCotizacion;

    if (
      promise.pipeline_stage?.slug === 'approved' &&
      hasValidEvent &&
      newStageSlug !== 'archived'
    ) {
      return {
        success: false,
        error: 'Esta promesa tiene un evento asociado. Solo puede archivarse.',
      };
    }

    // Actualizar promesa
    const updatedPromise = await prisma.studio_promises.update({
      where: { id: promise.id },
      data: {
        pipeline_stage_id: validatedData.new_stage_id,
      },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        pipeline_stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
          },
        },
        event: {
          select: {
            id: true,
            status: true,
            promise_id: true,
            cotizacion_id: true,
            cotizacion: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });
    promise = updatedPromise;

    // Obtener contacto asociado
    const contact = await prisma.studio_contacts.findUnique({
      where: { id: promise.contact_id },
    });

    if (!contact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    // Validar que el evento tenga cotización autorizada (misma lógica que en getPromises)
    let validEvent = null;
    if (promise.event) {
      const hasCorrectPromiseId = promise.event.promise_id === promise.id;
      const cotizacionStatus = promise.event.cotizacion?.status;
      const hasAuthorizedCotizacion = promise.event.cotizacion_id &&
        cotizacionStatus &&
        ['autorizada', 'aprobada', 'approved'].includes(cotizacionStatus.toLowerCase());

      if (hasCorrectPromiseId && hasAuthorizedCotizacion) {
        validEvent = {
          id: promise.event.id,
          status: promise.event.status,
        };
      }
    }

    // Registrar cambio de etapa en el historial
    const { logPromiseStatusChange } = await import('./promise-status-history.actions');
    await logPromiseStatusChange({
      promiseId: promise.id,
      fromStageId: oldStageId,
      toStageId: validatedData.new_stage_id,
      fromStageSlug: oldStageSlug,
      toStageSlug: newStageSlug,
      userId: null, // TODO: Obtener userId del contexto
      reason: "Cambio manual en kanban",
      metadata: {
        trigger: "manual_move",
        from_stage_name: oldStageName,
        to_stage_name: newStageName,
      },
    }).catch((error) => {
      // No fallar si el log falla, solo registrar error
      console.error('[PROMISES] Error registrando historial de cambio de etapa:', error);
    });

    // También mantener el log genérico para compatibilidad
    const { logPromiseAction } = await import('./promise-logs.actions');
    await logPromiseAction(
      studioSlug,
      promise.id,
      'stage_change',
      'user',
      null,
      {
        from: oldStageName,
        to: newStageName,
      }
    ).catch((error) => {
      console.error('[PROMISES] Error registrando log de cambio de etapa:', error);
    });

    const promiseWithContact: PromiseWithContact = {
      id: contact.id,
      promise_id: promise.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address || null,
      avatar_url: contact.avatar_url,
      status: contact.status,
      event_type_id: promise.event_type_id,
      event_name: promise.name || null,
      event_location: promise.event_location || null,
      event_location_id: promise.event_location_id ?? null,
      duration_hours: promise.duration_hours || null,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      event_date: promise.event_date
        ? dateToDateOnlyString(promise.event_date)
        : null,
      defined_date: promise.defined_date
        ? dateToDateOnlyString(promise.defined_date)
        : null,
      promise_pipeline_stage_id: promise.pipeline_stage_id,
      is_test: promise.is_test, // ✅ Incluir flag de prueba
      acquisition_channel_id: contact.acquisition_channel_id,
      social_network_id: contact.social_network_id,
      referrer_contact_id: contact.referrer_contact_id,
      referrer_name: contact.referrer_name,
      notes: promise.notes,
      created_at: contact.created_at,
      updated_at: promise.updated_at,
      event_type: promise.event_type || null,
      promise_pipeline_stage: promise.pipeline_stage || null,
      event: validEvent,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidateTag(`promises-list-${studioSlug}`, 'max'); // Invalidar caché de lista (con studioSlug para aislamiento entre tenants)

    return {
      success: true,
      data: promiseWithContact,
    };
  } catch (error) {
    console.error('[PROMISES] Error moviendo promise:', error);
    console.error('[PROMISES] Data recibida:', { studioSlug, data });
    
    // Manejar errores de validación de Zod
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: string[]; message: string; code: string }> };
      const issue = zodError.issues[0];
      
      if (issue?.path.includes('new_stage_id')) {
        // Log detallado para debugging
        console.error('[PROMISES] Error de validación de new_stage_id:', {
          issue,
          receivedValue: data.new_stage_id,
          receivedType: typeof data.new_stage_id,
          receivedLength: data.new_stage_id?.length,
        });
        
        const errorType = issue.code === 'invalid_format' || issue.message?.includes('CUID') || issue.message?.includes('UUID')
          ? 'El formato del ID de etapa no es válido (debe ser un CUID o UUID). Esto puede ocurrir si la etapa fue eliminada o si hay un problema con los datos.'
          : 'El ID de etapa proporcionado no es válido';
        return {
          success: false,
          error: `Error de validación: ${errorType}. Por favor, recarga la página y selecciona una etapa válida del menú. Si el problema persiste, contacta al soporte.`,
        };
      }
      if (issue?.path.includes('promise_id')) {
        return {
          success: false,
          error: 'Error de validación: El ID de promesa no es válido.',
        };
      }
      return {
        success: false,
        error: `Error de validación: ${issue?.message || 'Datos inválidos'}`,
      };
    }
    
    // Manejar otros errores
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      error: `Error del sistema: ${errorMessage}. Si el problema persiste, contacta al soporte.`,
    };
  }
}

/**
 * Archivar promesa (mover a pipeline stage "archived").
 * Si se pasa archiveReason, se registra en la bitácora.
 */
export async function archivePromise(
  studioSlug: string,
  promiseId: string,
  options?: { archiveReason?: string }
): Promise<PromiseResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: { studio_id: true },
    });

    if (!promise || promise.studio_id !== studio.id) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Buscar o crear stage "archived"
    let archivedStage = await prisma.studio_promise_pipeline_stages.findFirst({
      where: {
        studio_id: studio.id,
        slug: 'archived',
      },
    });

    if (!archivedStage) {
      // Crear stage "archived" si no existe
      const maxOrder = await prisma.studio_promise_pipeline_stages.findFirst({
        where: { studio_id: studio.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      archivedStage = await prisma.studio_promise_pipeline_stages.create({
        data: {
          studio_id: studio.id,
          name: 'Archivado',
          slug: 'archived',
          color: '#6B7280', // Gris
          order: (maxOrder?.order || 0) + 1,
          is_system: true,
          is_active: true,
        },
      });
    }

    // Mover promesa al stage "archived"
    const updatedPromise = await prisma.studio_promises.update({
      where: { id: promiseId },
      data: { pipeline_stage_id: archivedStage.id },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        pipeline_stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
          },
        },
      },
    });

    // Obtener contacto asociado
    const contact = await prisma.studio_contacts.findUnique({
      where: { id: updatedPromise.contact_id },
    });

    if (!contact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    // Registrar archivo en el log (con motivo si se proporciona)
    const { logPromiseAction } = await import('./promise-logs.actions');
    const metadata = options?.archiveReason?.trim() ? { reason: options.archiveReason!.trim() } : undefined;
    await logPromiseAction(
      studioSlug,
      promiseId,
      'archived',
      'user',
      null,
      metadata
    ).catch((error) => {
      // No fallar si el log falla, solo registrar error
      console.error('[PROMISES] Error registrando log de archivo:', error);
    });

    const promiseWithContact: PromiseWithContact = {
      id: contact.id,
      promise_id: updatedPromise.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address || null,
      avatar_url: contact.avatar_url,
      status: contact.status,
      event_type_id: updatedPromise.event_type_id,
      event_name: updatedPromise.name || null,
      event_location: updatedPromise.event_location || null,
      event_location_id: updatedPromise.event_location_id ?? null,
      duration_hours: updatedPromise.duration_hours || null,
      interested_dates: updatedPromise.tentative_dates
        ? (updatedPromise.tentative_dates as string[])
        : null,
      event_date: updatedPromise.event_date
        ? dateToDateOnlyString(updatedPromise.event_date)
        : null,
      defined_date: updatedPromise.defined_date
        ? dateToDateOnlyString(updatedPromise.defined_date)
        : null,
      promise_pipeline_stage_id: updatedPromise.pipeline_stage_id,
      is_test: updatedPromise.is_test || false,
      acquisition_channel_id: contact.acquisition_channel_id,
      social_network_id: contact.social_network_id,
      referrer_contact_id: contact.referrer_contact_id,
      referrer_name: contact.referrer_name,
      notes: promise.notes,
      created_at: contact.created_at,
      updated_at: updatedPromise.updated_at,
      event_type: updatedPromise.event_type || null,
      promise_pipeline_stage: updatedPromise.pipeline_stage || null,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidateTag(`promises-list-${studioSlug}`, 'max'); // Invalidar caché de lista (con studioSlug para aislamiento entre tenants)
    return {
      success: true,
      data: promiseWithContact,
    };
  } catch (error) {
    console.error('[PROMISES] Error archivando promise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al archivar promesa',
    };
  }
}

/**
 * Desarchivar promesa (mover a primera etapa activa)
 */
export async function unarchivePromise(
  studioSlug: string,
  promiseId: string
): Promise<PromiseResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: { studio_id: true, pipeline_stage_id: true },
    });

    if (!promise || promise.studio_id !== studio.id) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Verificar que esté archivada
    const currentStage = await prisma.studio_promise_pipeline_stages.findUnique({
      where: { id: promise.pipeline_stage_id || '' },
      select: { slug: true },
    });

    if (currentStage?.slug !== 'archived') {
      return { success: false, error: 'La promesa no está archivada' };
    }

    // Buscar primera etapa activa (no archivada)
    const firstActiveStage = await prisma.studio_promise_pipeline_stages.findFirst({
      where: {
        studio_id: studio.id,
        is_active: true,
        slug: { not: 'archived' },
      },
      orderBy: { order: 'asc' },
    });

    if (!firstActiveStage) {
      return { success: false, error: 'No hay etapas activas disponibles' };
    }

    // Mover promesa a la primera etapa activa
    const updatedPromise = await prisma.studio_promises.update({
      where: { id: promiseId },
      data: { pipeline_stage_id: firstActiveStage.id },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        pipeline_stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
          },
        },
      },
    });

    // Obtener contacto asociado
    const contact = await prisma.studio_contacts.findUnique({
      where: { id: updatedPromise.contact_id },
    });

    if (!contact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    // Registrar desarchivo en el log
    const { logPromiseAction } = await import('./promise-logs.actions');
    await logPromiseAction(
      studioSlug,
      promiseId,
      'unarchived',
      'user', // Asumimos que es acción de usuario
      null, // TODO: Obtener userId del contexto
    ).catch((error) => {
      // No fallar si el log falla, solo registrar error
      console.error('[PROMISES] Error registrando log de desarchivo:', error);
    });

    const promiseWithContact: PromiseWithContact = {
      id: contact.id,
      promise_id: updatedPromise.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address || null,
      avatar_url: contact.avatar_url,
      status: contact.status,
      event_type_id: updatedPromise.event_type_id,
      event_name: updatedPromise.name || null,
      event_location: updatedPromise.event_location || null,
      event_location_id: updatedPromise.event_location_id ?? null,
      duration_hours: updatedPromise.duration_hours || null,
      interested_dates: updatedPromise.tentative_dates
        ? (updatedPromise.tentative_dates as string[])
        : null,
      event_date: updatedPromise.event_date
        ? dateToDateOnlyString(updatedPromise.event_date)
        : null,
      defined_date: updatedPromise.defined_date
        ? dateToDateOnlyString(updatedPromise.defined_date)
        : null,
      promise_pipeline_stage_id: updatedPromise.pipeline_stage_id,
      is_test: updatedPromise.is_test || false,
      acquisition_channel_id: contact.acquisition_channel_id,
      social_network_id: contact.social_network_id,
      referrer_contact_id: contact.referrer_contact_id,
      referrer_name: contact.referrer_name,
      notes: promise.notes,
      created_at: contact.created_at,
      updated_at: updatedPromise.updated_at,
      event_type: updatedPromise.event_type || null,
      promise_pipeline_stage: updatedPromise.pipeline_stage || null,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    return {
      success: true,
      data: promiseWithContact,
    };
  } catch (error) {
    console.error('[PROMISES] Error desarchivando promise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desarchivar promesa',
    };
  }
}

/**
 * Obtener información sobre qué se eliminará al borrar una promesa
 */
export async function getPromiseDeletionInfo(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    hasEvent: boolean;
    cotizacionesCount: number;
    agendamientosCount: number;
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

    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: {
        studio_id: true,
        event: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            quotes: true,
            agenda: true,
          },
        },
      },
    });

    if (!promise || promise.studio_id !== studio.id) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Contar agendamientos del evento también si existe
    let eventoAgendamientosCount = 0;
    if (promise.event?.id) {
      eventoAgendamientosCount = await prisma.studio_agenda.count({
        where: {
          evento_id: promise.event.id,
          studio_id: studio.id,
        },
      });
    }

    return {
      success: true,
      data: {
        hasEvent: !!promise.event,
        cotizacionesCount: promise._count.quotes,
        agendamientosCount: promise._count.agenda + eventoAgendamientosCount,
      },
    };
  } catch (error) {
    console.error('[PROMISES] Error obteniendo información de eliminación:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener información',
    };
  }
}

/**
 * Eliminar promesa (hard delete con cascade)
 * Elimina: promesa, evento (si existe), cotizaciones, agendamientos
 */
export async function deletePromise(
  studioSlug: string,
  promiseId: string
): Promise<PromiseResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      select: {
        studio_id: true,
        event: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!promise || promise.studio_id !== studio.id) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Usar transacción para garantizar atomicidad
    await prisma.$transaction(async (tx) => {
      const eventoId = promise.event?.id;

      // 1. Eliminar agendamientos de la promesa
      await tx.studio_agenda.deleteMany({
        where: {
          promise_id: promiseId,
          studio_id: studio.id,
        },
      });

      // 2. Si hay evento, eliminar agendamientos del evento también
      if (eventoId) {
        await tx.studio_agenda.deleteMany({
          where: {
            evento_id: eventoId,
            studio_id: studio.id,
          },
        });
      }

      // 3. Eliminar cotizaciones asociadas a la promesa
      await tx.studio_cotizaciones.deleteMany({
        where: {
          promise_id: promiseId,
          studio_id: studio.id,
        },
      });

      // 4. Eliminar promesa (esto eliminará el evento en cascade por onDelete: Cascade)
      await tx.studio_promises.delete({
        where: { id: promiseId },
      });
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidateTag(`promises-list-${studioSlug}`, 'max'); // Invalidar caché de lista (con studioSlug para aislamiento entre tenants)
    return { success: true };
  } catch (error) {
    console.error('[PROMISES] Error eliminando promise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar promesa',
    };
  }
}

/**
 * Eliminar todas las promesas de prueba y sus datos relacionados
 */
export async function deleteTestPromises(
  studioSlug: string
): Promise<{ success: boolean; error?: string; deleted?: number }> {
  try {
    // Obtener studio por slug
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Usar transacción para garantizar atomicidad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener promesas de prueba con sus relaciones
      const testPromises = await tx.studio_promises.findMany({
        where: {
          studio_id: studio.id,
          is_test: true,
        },
        include: {
          contact: {
            include: {
              promises: true, // Para verificar si tiene promesas reales
            },
          },
          event: true,
        },
      });

      if (testPromises.length === 0) {
        return { count: 0 };
      }

      // 2. Recopilar IDs únicos de contactos de prueba
      const testContactIds = new Set<string>();
      for (const promise of testPromises) {
        if (promise.contact.is_test) {
          testContactIds.add(promise.contact.id);
        }
      }

      // 3. Eliminar cada promesa y sus relaciones
      for (const promise of testPromises) {
        // Eliminar evento si existe (cascada automática eliminará: agenda, gastos, nominas)
        if (promise.event) {
          await tx.studio_events.deleteMany({
            where: { id: promise.event.id },
          });
        }

        // Eliminar relaciones de la promesa que NO tienen cascade automático
        await tx.studio_cotizaciones.deleteMany({
          where: { promise_id: promise.id },
        });

        await tx.studio_notifications.deleteMany({
          where: { promise_id: promise.id },
        });

        await tx.studio_agenda.deleteMany({
          where: { promise_id: promise.id },
        });

        await tx.studio_pagos.deleteMany({
          where: { promise_id: promise.id },
        });

        // Eliminar promesa (esto eliminará en cascada: logs, tags por onDelete: Cascade)
        await tx.studio_promises.deleteMany({
          where: { id: promise.id },
        });
      }

      // 4. Eliminar contactos de prueba que ya no tienen promesas
      for (const contactId of testContactIds) {
        const remainingPromises = await tx.studio_promises.count({
          where: { contact_id: contactId },
        });

        if (remainingPromises === 0) {
          // Eliminar relaciones del contacto
          await tx.studio_offer_submissions.deleteMany({
            where: { contact_id: contactId },
          });

          await tx.studio_contact_logs.deleteMany({
            where: { contact_id: contactId },
          });

          // Eliminar contacto
          await tx.studio_contacts.deleteMany({
            where: {
              id: contactId,
              is_test: true, // Extra validación de seguridad
            },
          });
        }
      }

      // 5. Eliminar leads de prueba huérfanos (sin contacto asociado directo)
      await tx.platform_leads.deleteMany({
        where: {
          studio_id: studio.id,
          is_test: true,
        },
      });

      return { count: testPromises.length };
    });

    // Revalidar rutas
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/crm`);
    revalidateTag(`promises-list-${studioSlug}`, 'max'); // Invalidar caché de lista (con studioSlug para aislamiento entre tenants)
    // Agenda ahora es un sheet, no necesita revalidación de ruta

    return {
      success: true,
      deleted: result.count,
    };
  } catch (error) {
    console.error('[PROMISES] Error eliminando promesas de prueba:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al eliminar promesas de prueba',
    };
  }
}

/**
 * Obtener cantidad de promesas de prueba
 */
export async function getTestPromisesCount(
  studioSlug: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const count = await prisma.studio_promises.count({
      where: {
        studio_id: studio.id,
        is_test: true,
      },
    });

    return { success: true, count };
  } catch (error) {
    console.error('[PROMISES] Error obteniendo conteo de pruebas:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al obtener conteo',
    };
  }
}


