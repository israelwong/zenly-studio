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
      where.prospect_pipeline_stage_id = pipeline_stage_id;
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
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        prospect_pipeline_stage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
          },
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

    const prospects: Prospect[] = contacts.map((contact) => ({
      id: contact.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      status: contact.status,
      event_type_id: contact.event_type_id,
      interested_dates: contact.interested_dates
        ? (contact.interested_dates as string[])
        : null,
      prospect_pipeline_stage_id: contact.prospect_pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: contact.event_type,
      prospect_pipeline_stage: contact.prospect_pipeline_stage,
      last_log: contact.contact_logs[0] || null,
    }));

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
      const nuevoStage = await prisma.studio_prospect_pipeline_stages.findFirst({
        where: {
          studio_id: studio.id,
          slug: 'nuevo',
          is_active: true,
        },
        select: { id: true },
      });
      stageId = nuevoStage?.id || null;
    }

    const contact = await prisma.studio_contacts.create({
      data: {
        studio_id: studio.id,
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        status: 'prospecto',
        event_type_id: validatedData.event_type_id || null,
        interested_dates: validatedData.interested_dates
          ? (validatedData.interested_dates as unknown)
          : null,
        prospect_pipeline_stage_id: stageId,
      },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        prospect_pipeline_stage: {
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
      event_type_id: contact.event_type_id,
      interested_dates: contact.interested_dates
        ? (contact.interested_dates as string[])
        : null,
      prospect_pipeline_stage_id: contact.prospect_pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: contact.event_type,
      prospect_pipeline_stage: contact.prospect_pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/prospects`);

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

    const contact = await prisma.studio_contacts.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email,
        event_type_id: validatedData.event_type_id,
        interested_dates: validatedData.interested_dates
          ? (validatedData.interested_dates as unknown)
          : undefined,
        prospect_pipeline_stage_id: validatedData.prospect_pipeline_stage_id,
      },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        prospect_pipeline_stage: {
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
      event_type_id: contact.event_type_id,
      interested_dates: contact.interested_dates
        ? (contact.interested_dates as string[])
        : null,
      prospect_pipeline_stage_id: contact.prospect_pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: contact.event_type,
      prospect_pipeline_stage: contact.prospect_pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/prospects`);

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
    const stage = await prisma.studio_prospect_pipeline_stages.findUnique({
      where: { id: validatedData.new_stage_id },
      select: { studio_id: true },
    });

    if (!stage || stage.studio_id !== studio.id) {
      return { success: false, error: 'Etapa no encontrada' };
    }

    const contact = await prisma.studio_contacts.update({
      where: { id: validatedData.prospect_id },
      data: {
        prospect_pipeline_stage_id: validatedData.new_stage_id,
      },
      include: {
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        prospect_pipeline_stage: {
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
      event_type_id: contact.event_type_id,
      interested_dates: contact.interested_dates
        ? (contact.interested_dates as string[])
        : null,
      prospect_pipeline_stage_id: contact.prospect_pipeline_stage_id,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      event_type: contact.event_type,
      prospect_pipeline_stage: contact.prospect_pipeline_stage,
      last_log: null,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/prospects`);

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

