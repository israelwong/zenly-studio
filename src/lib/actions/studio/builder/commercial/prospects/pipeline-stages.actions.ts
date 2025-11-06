'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  createPipelineStageSchema,
  updatePipelineStageSchema,
  reorderPipelineStagesSchema,
  type CreatePipelineStageData,
  type UpdatePipelineStageData,
  type ReorderPipelineStagesData,
  type PipelineStagesResponse,
  type PipelineStage,
  type ActionResponse,
} from '@/lib/actions/schemas/prospects-schemas';

/**
 * Obtener pipeline stages del studio
 */
export async function getPipelineStages(
  studioSlug: string
): Promise<PipelineStagesResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const stages = await prisma.studio_prospect_pipeline_stages.findMany({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
      orderBy: { order: 'asc' },
    });

    const pipelineStages: PipelineStage[] = stages.map((stage) => ({
      id: stage.id,
      studio_id: stage.studio_id,
      name: stage.name,
      slug: stage.slug,
      color: stage.color,
      order: stage.order,
      is_system: stage.is_system,
      is_active: stage.is_active,
      created_at: stage.created_at,
      updated_at: stage.updated_at,
    }));

    return {
      success: true,
      data: pipelineStages,
    };
  } catch (error) {
    console.error('[PIPELINE] Error obteniendo stages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Crear nueva etapa del pipeline
 */
export async function createPipelineStage(
  studioSlug: string,
  data: CreatePipelineStageData
): Promise<ActionResponse<PipelineStage>> {
  try {
    const validatedData = createPipelineStageSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el slug no exista
    const existing = await prisma.studio_prospect_pipeline_stages.findUnique({
      where: {
        studio_id_slug: {
          studio_id: studio.id,
          slug: validatedData.slug,
        },
      },
    });

    if (existing) {
      return { success: false, error: 'Ya existe una etapa con ese slug' };
    }

    const stage = await prisma.studio_prospect_pipeline_stages.create({
      data: {
        studio_id: studio.id,
        name: validatedData.name,
        slug: validatedData.slug,
        color: validatedData.color,
        order: validatedData.order,
        is_system: validatedData.is_system,
        is_active: true,
      },
    });

    const pipelineStage: PipelineStage = {
      id: stage.id,
      studio_id: stage.studio_id,
      name: stage.name,
      slug: stage.slug,
      color: stage.color,
      order: stage.order,
      is_system: stage.is_system,
      is_active: stage.is_active,
      created_at: stage.created_at,
      updated_at: stage.updated_at,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/prospects`);

    return {
      success: true,
      data: pipelineStage,
    };
  } catch (error) {
    console.error('[PIPELINE] Error creando stage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear etapa',
    };
  }
}

/**
 * Actualizar etapa del pipeline
 */
export async function updatePipelineStage(
  studioSlug: string,
  data: UpdatePipelineStageData
): Promise<ActionResponse<PipelineStage>> {
  try {
    const validatedData = updatePipelineStageSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que la etapa existe y pertenece al studio
    const existing = await prisma.studio_prospect_pipeline_stages.findUnique({
      where: { id: validatedData.id },
      select: { studio_id: true, is_system: true },
    });

    if (!existing || existing.studio_id !== studio.id) {
      return { success: false, error: 'Etapa no encontrada' };
    }

    // No permitir editar campos críticos de etapas del sistema
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.color !== undefined) updateData.color = validatedData.color;
    if (validatedData.order !== undefined) updateData.order = validatedData.order;
    // slug e is_system no se pueden cambiar

    const stage = await prisma.studio_prospect_pipeline_stages.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    const pipelineStage: PipelineStage = {
      id: stage.id,
      studio_id: stage.studio_id,
      name: stage.name,
      slug: stage.slug,
      color: stage.color,
      order: stage.order,
      is_system: stage.is_system,
      is_active: stage.is_active,
      created_at: stage.created_at,
      updated_at: stage.updated_at,
    };

    revalidatePath(`/${studioSlug}/studio/builder/commercial/prospects`);

    return {
      success: true,
      data: pipelineStage,
    };
  } catch (error) {
    console.error('[PIPELINE] Error actualizando stage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar etapa',
    };
  }
}

/**
 * Reordenar etapas del pipeline
 */
export async function reorderPipelineStages(
  studioSlug: string,
  data: ReorderPipelineStagesData
): Promise<ActionResponse<boolean>> {
  try {
    const validatedData = reorderPipelineStagesSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Actualizar orden de cada etapa
    await prisma.$transaction(
      validatedData.stage_ids.map((id, index) =>
        prisma.studio_prospect_pipeline_stages.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath(`/${studioSlug}/studio/builder/commercial/prospects`);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('[PIPELINE] Error reordenando stages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reordenar etapas',
    };
  }
}

