'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { notifyPromiseCreated } from '@/lib/notifications/studio';
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

    const total = await prisma.studio_promises.count({ where });

    const promises = await prisma.studio_promises.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            avatar_url: true,
            status: true,
            created_at: true,
            updated_at: true,
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
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Mapear promesas a PromiseWithContact
    const mappedPromises: PromiseWithContact[] = promises.map((promise) => {
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
        phone: promise.contact.phone,
        email: promise.contact.email,
        avatar_url: promise.contact.avatar_url,
        status: promise.contact.status,
        event_type_id: promise.event_type_id,
        event_name: promise.name || null,
        event_location: promise.event_location || null,
        duration_hours: promise.duration_hours || null,
        interested_dates: promise.tentative_dates
          ? (promise.tentative_dates as string[])
          : null,
        // Normalizar event_date: convertir Date a string YYYY-MM-DD antes de serializar
        // Esto evita problemas cuando Next.js serializa Date objects a ISO strings
        // El cliente recibirá un string puro que puede parsear directamente
        event_date: promise.event_date
          ? dateToDateOnlyString(promise.event_date)
          : null,
        // Normalizar defined_date también
        defined_date: promise.defined_date
          ? dateToDateOnlyString(promise.defined_date)
          : null,
        promise_pipeline_stage_id: promise.pipeline_stage_id,
        is_test: promise.is_test || false,
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

        if (isReferido && !validatedData.referrer_contact_id && !validatedData.referrer_name) {
          return { success: false, error: 'Debes especificar el referido cuando el canal es "Referidos"' };
        }
      }
    }

    // Obtener etapa "nuevo" por defecto si no se especifica
    let stageId = validatedData.promise_pipeline_stage_id;
    if (!stageId) {
      const nuevoStage = await prisma.studio_promise_pipeline_stages.findFirst({
        where: {
          studio_id: studio.id,
          slug: 'pending',
          is_active: true,
        },
        select: { id: true },
      });
      stageId = nuevoStage?.id || null;
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
        name: validatedData.event_name?.trim() || null,
        duration_hours: durationHours,
        pipeline_stage_id: stageId,
        status: 'pending',
        event_date: eventDate, // ✅ Guardar directamente en event_date (solo una fecha permitida)
        tentative_dates: null, // ✅ Ya no usar tentative_dates, solo event_date
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
      duration_hours: promise.duration_hours || null,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      promise_pipeline_stage_id: promise.pipeline_stage_id,
      is_test: promise.is_test, // ✅ Incluir flag de prueba
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: promise.event_type,
      promise_pipeline_stage: promise.pipeline_stage,
      last_log: null,
    };

    // Revalidar tanto la lista como la página individual de la promesa
    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promise.id}`);

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

    // Crear notificación
    try {
      // Usar la primera fecha de tentative_dates si está disponible, o defined_date si existe
      const eventDate = promise.defined_date?.toISOString() ||
        (promise.tentative_dates && Array.isArray(promise.tentative_dates) && promise.tentative_dates.length > 0
          ? promise.tentative_dates[0]
          : null);

      await notifyPromiseCreated(
        studio.id,
        promise.id,
        contact.name,
        promise.event_type?.name || null,
        eventDate
      );
      console.log('[PROMISES] ✅ Notificación creada exitosamente para promesa:', promise.id);
    } catch (notificationError) {
      console.error('[PROMISES] ❌ Error creando notificación:', notificationError);
      // No fallar la creación de la promesa si falla la notificación
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

        // Para referido: validar solo si se está cambiando el canal o si no hay referido guardado
        if (isReferido) {
          const referrerContactId = validatedData.referrer_contact_id ?? oldContact.referrer_contact_id;
          const referrerName = validatedData.referrer_name ?? oldContact.referrer_name;
          if (!referrerContactId && !referrerName) {
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
          ? (validatedData.interested_dates as unknown)
          : null;

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

      promise = await prisma.studio_promises.create({
        data: {
          studio_id: contact.studio_id,
          contact_id: contact.id,
          event_type_id: validatedData.event_type_id || null,
          event_location: eventLocationCreate,
          name: validatedData.event_name?.trim() || null,
          duration_hours: durationHoursCreate,
          name: validatedData.event_name?.trim() || null,
          duration_hours: durationHoursCreate,
          pipeline_stage_id: stageId,
          status: 'pending',
          event_date: eventDateCreate,
          tentative_dates: validatedData.interested_dates
            ? (validatedData.interested_dates as unknown)
            : null,
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
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: promise.event_type,
      promise_pipeline_stage: promise.pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

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
      select: { studio_id: true },
    });

    if (!stage || stage.studio_id !== studio.id) {
      return { success: false, error: 'Etapa no encontrada' };
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

    // Guardar nombre de etapa anterior para el log
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
    promise = await prisma.studio_promises.update({
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
      },
    });

    // Obtener contacto asociado
    const contact = await prisma.studio_contacts.findUnique({
      where: { id: promise.contact_id },
    });

    if (!contact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    // Registrar cambio de etapa en el log
    const { logPromiseAction } = await import('./promise-logs.actions');
    await logPromiseAction(
      studioSlug,
      promise.id,
      'stage_change',
      'user', // Asumimos que es acción de usuario
      null, // TODO: Obtener userId del contexto
      {
        from: oldStageName,
        to: newStageName,
      }
    ).catch((error) => {
      // No fallar si el log falla, solo registrar error
      console.error('[PROMISES] Error registrando log de cambio de etapa:', error);
    });

    const promiseWithContact: PromiseWithContact = {
      id: contact.id,
      promise_id: promise.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      avatar_url: contact.avatar_url,
      status: contact.status,
      event_type_id: promise.event_type_id,
      event_name: promise.name || null,
      event_location: promise.event_location || null,
      duration_hours: promise.duration_hours || null,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      promise_pipeline_stage_id: promise.pipeline_stage_id,
      is_test: promise.is_test, // ✅ Incluir flag de prueba
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: promise.event_type,
      promise_pipeline_stage: promise.pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);

    return {
      success: true,
      data: promiseWithContact,
    };
  } catch (error) {
    console.error('[PROMISES] Error moviendo promise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al mover promise',
    };
  }
}

/**
 * Archivar promesa (mover a pipeline stage "archived")
 */
export async function archivePromise(
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

    // Registrar archivo en el log
    const { logPromiseAction } = await import('./promise-logs.actions');
    await logPromiseAction(
      studioSlug,
      promiseId,
      'archived',
      'user', // Asumimos que es acción de usuario
      null, // TODO: Obtener userId del contexto
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
      avatar_url: contact.avatar_url,
      status: contact.status,
      event_type_id: updatedPromise.event_type_id,
      event_name: updatedPromise.name || null,
      interested_dates: updatedPromise.tentative_dates
        ? (updatedPromise.tentative_dates as string[])
        : null,
      defined_date: updatedPromise.defined_date,
      promise_pipeline_stage_id: updatedPromise.pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: updatedPromise.updated_at,
      event_type: updatedPromise.event_type,
      promise_pipeline_stage: updatedPromise.pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
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
      avatar_url: contact.avatar_url,
      status: contact.status,
      event_type_id: updatedPromise.event_type_id,
      event_name: updatedPromise.name || null,
      interested_dates: updatedPromise.tentative_dates
        ? (updatedPromise.tentative_dates as string[])
        : null,
      defined_date: updatedPromise.defined_date,
      promise_pipeline_stage_id: updatedPromise.pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: updatedPromise.updated_at,
      event_type: updatedPromise.event_type,
      promise_pipeline_stage: updatedPromise.pipeline_stage,
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
 * Eliminar promesa (hard delete con cascade)
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
      select: { studio_id: true },
    });

    if (!promise || promise.studio_id !== studio.id) {
      return { success: false, error: 'Promesa no encontrada' };
    }

    // Eliminar agendamientos asociados (fechas de interés y citas)
    await prisma.studio_agenda.deleteMany({
      where: {
        promise_id: promiseId,
        studio_id: studio.id,
      },
    });

    // Hard delete (cascade eliminará otras relaciones automáticamente)
    await prisma.studio_promises.delete({
      where: { id: promiseId },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
      // Agenda ahora es un sheet, no necesita revalidación de ruta
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

