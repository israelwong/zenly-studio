'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  createProspectSchema,
  updateProspectSchema,
  getProspectsSchema,
  moveProspectSchema,
  type CreateProspectData,
  type UpdateProspectData,
  type GetProspectsParams,
  type MoveProspectData,
  type ProspectsListResponse,
  type ProspectResponse,
  type Prospect,
} from '@/lib/actions/schemas/prospects-schemas';

/**
 * Obtener prospects con pipeline stages
 */
export async function getProspects(
  studioSlug: string,
  params: GetProspectsParams
): Promise<ProspectsListResponse> {
  try {
    const validatedParams = getProspectsSchema.parse(params);
    const { page, limit, search, pipeline_stage_id } = validatedParams;

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const where: any = {
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
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        contact_logs: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const prospects: Prospect[] = contacts.map((contact) => {
      const latestPromise = contact.promises[0];
      return {
        id: contact.id,
        studio_id: contact.studio_id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        status: contact.status,
        event_type_id: latestPromise?.event_type_id || null,
        interested_dates: latestPromise?.tentative_dates
          ? (latestPromise.tentative_dates as string[])
          : null,
        prospect_pipeline_stage_id: latestPromise?.pipeline_stage_id || null,
        created_at: contact.created_at,
        updated_at: contact.updated_at,
        event_type: latestPromise?.event_type || null,
        prospect_pipeline_stage: latestPromise?.pipeline_stage || null,
        last_log: contact.contact_logs[0] || null,
      };
    });

    return {
      success: true,
      data: {
        prospects,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('[PROSPECTS] Error obteniendo prospects:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crear nuevo prospect
 */
export async function createProspect(
  studioSlug: string,
  data: CreateProspectData
): Promise<ProspectResponse> {
  try {
    const validatedData = createProspectSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener etapa "nuevo" por defecto si no se especifica
    let stageId = validatedData.prospect_pipeline_stage_id;
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
      },
      create: {
        studio_id: studio.id,
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        status: 'prospecto',
      },
    });

    // Crear promesa asociada
    const promise = await prisma.studio_promises.create({
      data: {
        studio_id: studio.id,
        contact_id: contact.id,
        event_type_id: validatedData.event_type_id || null,
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

    const prospect: Prospect = {
      id: contact.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      status: contact.status,
      event_type_id: promise.event_type_id,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      prospect_pipeline_stage_id: promise.pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: promise.event_type,
      prospect_pipeline_stage: promise.pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: prospect,
    };
  } catch (error) {
    console.error('[PROSPECTS] Error creando prospect:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear prospect',
    };
  }
}

/**
 * Actualizar prospect
 */
export async function updateProspect(
  studioSlug: string,
  data: UpdateProspectData
): Promise<ProspectResponse> {
  try {
    const validatedData = updateProspectSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Actualizar contacto
    const contact = await prisma.studio_contacts.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email,
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
      promise = await prisma.studio_promises.update({
        where: { id: latestPromise.id },
        data: {
          event_type_id: validatedData.event_type_id || null,
          pipeline_stage_id: validatedData.prospect_pipeline_stage_id || null,
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
      const stageId = validatedData.prospect_pipeline_stage_id ||
        (await prisma.studio_promise_pipeline_stages.findFirst({
          where: {
            studio_id: contact.studio_id,
            slug: 'pending',
            is_active: true,
          },
          select: { id: true },
        }))?.id || null;

      promise = await prisma.studio_promises.create({
        data: {
          studio_id: contact.studio_id,
          contact_id: contact.id,
          event_type_id: validatedData.event_type_id || null,
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

    const prospect: Prospect = {
      id: contact.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      status: contact.status,
      event_type_id: promise.event_type_id,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      prospect_pipeline_stage_id: promise.pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: promise.event_type,
      prospect_pipeline_stage: promise.pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: prospect,
    };
  } catch (error) {
    console.error('[PROSPECTS] Error actualizando prospect:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar prospect',
    };
  }
}

/**
 * Mover prospect entre etapas del pipeline
 */
export async function moveProspect(
  studioSlug: string,
  data: MoveProspectData
): Promise<ProspectResponse> {
  try {
    const validatedData = moveProspectSchema.parse(data);

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

    // Obtener contacto
    const contact = await prisma.studio_contacts.findUnique({
      where: { id: validatedData.prospect_id },
    });

    if (!contact) {
      return { success: false, error: 'Prospect no encontrado' };
    }

    // Obtener promesa más reciente o crear una nueva
    let promise = await prisma.studio_promises.findFirst({
      where: { contact_id: validatedData.prospect_id },
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

    if (promise) {
      // Actualizar promesa existente
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
    } else {
      // Crear nueva promesa si no existe
      promise = await prisma.studio_promises.create({
        data: {
          studio_id: contact.studio_id,
          contact_id: contact.id,
          pipeline_stage_id: validatedData.new_stage_id,
          status: 'pending',
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

    const prospect: Prospect = {
      id: contact.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      status: contact.status,
      event_type_id: promise.event_type_id,
      interested_dates: promise.tentative_dates
        ? (promise.tentative_dates as string[])
        : null,
      prospect_pipeline_stage_id: promise.pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: promise.event_type,
      prospect_pipeline_stage: promise.pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/promises`);

    return {
      success: true,
      data: prospect,
    };
  } catch (error) {
    console.error('[PROSPECTS] Error moviendo prospect:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al mover prospect',
    };
  }
}

