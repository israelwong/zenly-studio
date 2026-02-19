'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import type {
  EventPipelineStagesResponse,
  EventPipelineStage,
  ActionResponse,
} from '@/lib/actions/schemas/events-schemas';

const updatePipelineStageSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

const reorderPipelineStagesSchema = z.object({
  stage_ids: z.array(z.string().cuid()).min(1),
});

export type UpdatePipelineStageData = z.infer<typeof updatePipelineStageSchema>;
export type ReorderPipelineStagesData = z.infer<typeof reorderPipelineStagesSchema>;

/**
 * Obtener pipeline stages del manager para events
 */
export async function getEventPipelineStages(
  studioSlug: string
): Promise<EventPipelineStagesResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const stages = await prisma.studio_manager_pipeline_stages.findMany({
      where: {
        studio_id: studio.id,
        is_active: true,
        slug: { not: 'revision' }, // Excluir etapa legacy (reemplazada por edicion + revision-interna)
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const pipelineStages: EventPipelineStage[] = stages.map((stage) => ({
      id: stage.id,
      studio_id: stage.studio_id,
      name: stage.name,
      slug: stage.slug,
      description: stage.description,
      color: stage.color,
      order: stage.order,
      stage_type: stage.stage_type,
      is_active: stage.is_active,
      is_system: stage.is_system,
      created_at: stage.created_at,
      updated_at: stage.updated_at,
    }));

    return {
      success: true,
      data: pipelineStages,
    };
  } catch (error) {
    console.error('[EVENT PIPELINE] Error obteniendo stages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualizar etapa del pipeline
 */
export async function updateEventPipelineStage(
  studioSlug: string,
  data: UpdatePipelineStageData
): Promise<ActionResponse<EventPipelineStage>> {
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
    const existingStage = await prisma.studio_manager_pipeline_stages.findUnique({
      where: { id: validatedData.id },
      select: { studio_id: true, is_system: true },
    });

    if (!existingStage || existingStage.studio_id !== studio.id) {
      return { success: false, error: 'Etapa no encontrada' };
    }

    // No permitir editar etapas del sistema (excepto nombre)
    if (existingStage.is_system && validatedData.color) {
      return { success: false, error: 'No se puede modificar el color de etapas del sistema' };
    }

    const updateData: {
      name?: string;
      color?: string;
    } = {};

    if (validatedData.name) {
      updateData.name = validatedData.name;
    }
    if (validatedData.color) {
      updateData.color = validatedData.color;
    }

    const updatedStage = await prisma.studio_manager_pipeline_stages.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    const pipelineStage: EventPipelineStage = {
      id: updatedStage.id,
      studio_id: updatedStage.studio_id,
      name: updatedStage.name,
      slug: updatedStage.slug,
      description: updatedStage.description,
      color: updatedStage.color,
      order: updatedStage.order,
      stage_type: updatedStage.stage_type,
      is_active: updatedStage.is_active,
      is_system: updatedStage.is_system,
      created_at: updatedStage.created_at,
      updated_at: updatedStage.updated_at,
    };

    revalidatePath(`/${studioSlug}/studio/business/events`);
    
    // Invalidar caché de pipeline stages y lista de eventos
    revalidateTag(`event-pipeline-stages-${studioSlug}`, 'max');
    revalidateTag(`events-list-${studioSlug}`, 'max');

    return {
      success: true,
      data: pipelineStage,
    };
  } catch (error) {
    console.error('[EVENT PIPELINE] Error actualizando stage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar etapa',
    };
  }
}

/**
 * Reordenar etapas del pipeline
 */
export async function reorderEventPipelineStages(
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
        prisma.studio_manager_pipeline_stages.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath(`/${studioSlug}/studio/business/events`);
    
    // Invalidar caché de pipeline stages y lista de eventos
    revalidateTag(`event-pipeline-stages-${studioSlug}`, 'max');
    revalidateTag(`events-list-${studioSlug}`, 'max');

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('[EVENT PIPELINE] Error reordenando stages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reordenar etapas',
    };
  }
}
