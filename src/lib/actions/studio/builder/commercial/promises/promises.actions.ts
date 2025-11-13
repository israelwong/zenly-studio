'use server';

import { prisma } from '@/lib/prisma';
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
} from '@/lib/actions/schemas/promises-schemas';

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

    const where: {
      studio_id: string;
      status: string;
      id?: { in: string[] };
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
        phone?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      studio_id: studio.id,
      status: 'prospecto',
    };

    if (pipeline_stage_id) {
      // Filtrar contactos que tienen promesas con el pipeline_stage_id especificado
      const contactsWithStage = await prisma.studio_promises.findMany({
        where: {
          studio_id: studio.id,
          pipeline_stage_id: pipeline_stage_id,
        },
        select: { contact_id: true },
        distinct: ['contact_id'],
      });
      const contactIds = contactsWithStage.map((p) => p.contact_id);
      if (contactIds.length > 0) {
        where.id = { in: contactIds };
      } else {
        // Si no hay contactos con ese stage, retornar vacío
        where.id = { in: [] };
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.studio_contacts.count({ where });

    const contacts = await prisma.studio_contacts.findMany({
      where,
      include: {
        promises: {
          include: {
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
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const promises: PromiseWithContact[] = contacts.map((contact) => {
      const latestPromise = contact.promises[0];
      
      // Mapear tags activos
      const tags = latestPromise?.tags
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

      return {
        id: contact.id,
        promise_id: latestPromise?.id || null,
        studio_id: contact.studio_id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        avatar_url: contact.avatar_url,
        status: contact.status,
        event_type_id: latestPromise?.event_type_id || null,
        interested_dates: latestPromise?.tentative_dates
          ? (latestPromise.tentative_dates as string[])
          : null,
        defined_date: latestPromise?.defined_date || null,
        promise_pipeline_stage_id: latestPromise?.pipeline_stage_id || null,
        created_at: contact.created_at,
        updated_at: latestPromise?.updated_at || contact.updated_at,
        event_type: latestPromise?.event_type || null,
        promise_pipeline_stage: latestPromise?.pipeline_stage || null,
        last_log: latestPromise?.logs?.[0] || null,
        tags: tags.length > 0 ? tags : undefined,
        cotizaciones_count: latestPromise?.quotes?.length || 0,
        event: latestPromise?.event || null,
        agenda: latestPromise?.agenda?.[0] || null,
      };
    });

    return {
      success: true,
      data: {
        promises,
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
        status: 'prospecto',
        acquisition_channel_id: validatedData.acquisition_channel_id || null,
        social_network_id: validatedData.social_network_id || null,
        referrer_contact_id: validatedData.referrer_contact_id || null,
        referrer_name: validatedData.referrer_name || null,
      },
    });

    // Crear promesa asociada
    // Normalizar event_location: si viene vacío o undefined pero hay event_type_id, usar "Pendiente"
    const eventLocation = validatedData.event_type_id
      ? (validatedData.event_location?.trim() || 'Pendiente')
      : null;

    const promise = await prisma.studio_promises.create({
      data: {
        studio_id: studio.id,
        contact_id: contact.id,
        event_type_id: validatedData.event_type_id || null,
        event_location: eventLocation,
        pipeline_stage_id: stageId,
        status: 'pending',
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
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      promise_pipeline_stage_id: promise.pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: promise.event_type,
      promise_pipeline_stage: promise.pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    // Crear notificación
    try {
      await notifyPromiseCreated(
        studio.id,
        promise.id,
        contact.name,
        promise.event_type?.name || null,
        promise.defined_date?.toISOString() || null
      );
    } catch (notificationError) {
      console.error('[PROMISES] Error creando notificación:', notificationError);
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
    const contact = await prisma.studio_contacts.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email,
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
      // Normalizar event_location: si viene vacío o undefined pero hay event_type_id, usar "Pendiente"
      const eventLocationUpdate = validatedData.event_type_id && validatedData.event_location !== undefined
        ? (validatedData.event_location?.trim() || 'Pendiente')
        : validatedData.event_location !== undefined ? validatedData.event_location || null : undefined;

      promise = await prisma.studio_promises.update({
        where: { id: latestPromise.id },
        data: {
          event_type_id: validatedData.event_type_id || null,
          event_location: eventLocationUpdate,
          pipeline_stage_id: validatedData.promise_pipeline_stage_id || null,
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

      // Normalizar event_location: si viene vacío o undefined pero hay event_type_id, usar "Pendiente"
      const eventLocationCreate = validatedData.event_type_id
        ? (validatedData.event_location?.trim() || 'Pendiente')
        : null;

      promise = await prisma.studio_promises.create({
        data: {
          studio_id: contact.studio_id,
          contact_id: contact.id,
          event_type_id: validatedData.event_type_id || null,
          event_location: eventLocationCreate,
          pipeline_stage_id: stageId,
          status: 'pending',
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
        avatar_url: contact.avatar_url,
        status: contact.status,
      event_type_id: promise.event_type_id,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      promise_pipeline_stage_id: promise.pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: promise.event_type,
      promise_pipeline_stage: promise.pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

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

    // Restricción: Si la promesa está en "approved" y tiene evento asociado,
    // solo se puede mover a "archived"
    if (
      promise.pipeline_stage?.slug === 'approved' &&
      promise.event &&
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
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      promise_pipeline_stage_id: promise.pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: promise.event_type,
      promise_pipeline_stage: promise.pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

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

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
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

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
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

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);
    revalidatePath(`/${studioSlug}/studio/dashboard/agenda`); // Revalidar calendario
    return { success: true };
  } catch (error) {
    console.error('[PROMISES] Error eliminando promise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar promesa',
    };
  }
}

