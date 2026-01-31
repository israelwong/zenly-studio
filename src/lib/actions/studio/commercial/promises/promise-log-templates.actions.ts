'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface PromiseLogTemplate {
  id: string;
  studio_id: string;
  text: string;
  usage_count: number;
  created_at: Date;
}

/**
 * Listar plantillas de notas del estudio, ordenadas por uso y texto
 */
export async function getPromiseLogTemplates(
  studioSlug: string
): Promise<{ success: true; data: PromiseLogTemplate[] } | { success: false; error: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    const templates = await prisma.studio_promise_log_templates.findMany({
      where: { studio_id: studio.id },
      orderBy: [{ usage_count: 'desc' }, { text: 'asc' }],
      select: {
        id: true,
        studio_id: true,
        text: true,
        usage_count: true,
        created_at: true,
      },
    });

    return {
      success: true,
      data: templates as PromiseLogTemplate[],
    };
  } catch (error) {
    console.error('[PROMISE_LOG_TEMPLATES] Error listando plantillas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al listar plantillas',
    };
  }
}

/**
 * Crear plantilla de nota (o devolver la existente si ya existe el mismo texto)
 */
export async function createPromiseLogTemplate(
  studioSlug: string,
  text: string
): Promise<{ success: true; data: PromiseLogTemplate } | { success: false; error: string }> {
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, error: 'El texto no puede estar vacío' };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    const existing = await prisma.studio_promise_log_templates.findUnique({
      where: {
        studio_id_text: { studio_id: studio.id, text: trimmed },
      },
    });

    if (existing) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises`);
      return { success: true, data: existing as PromiseLogTemplate };
    }

    const template = await prisma.studio_promise_log_templates.create({
      data: {
        studio_id: studio.id,
        text: trimmed,
      },
      select: {
        id: true,
        studio_id: true,
        text: true,
        usage_count: true,
        created_at: true,
      },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    return { success: true, data: template as PromiseLogTemplate };
  } catch (error) {
    console.error('[PROMISE_LOG_TEMPLATES] Error creando plantilla:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear plantilla',
    };
  }
}

/**
 * Actualizar texto de una plantilla
 */
export async function updatePromiseLogTemplate(
  studioSlug: string,
  templateId: string,
  text: string
): Promise<{ success: true; data: PromiseLogTemplate } | { success: false; error: string }> {
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, error: 'El texto no puede estar vacío' };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    const existing = await prisma.studio_promise_log_templates.findFirst({
      where: { id: templateId, studio_id: studio.id },
    });
    if (!existing) {
      return { success: false, error: 'Plantilla no encontrada' };
    }

    const duplicate = await prisma.studio_promise_log_templates.findUnique({
      where: {
        studio_id_text: { studio_id: studio.id, text: trimmed },
      },
    });
    if (duplicate && duplicate.id !== templateId) {
      return { success: false, error: 'Ya existe una plantilla con ese texto' };
    }

    const template = await prisma.studio_promise_log_templates.update({
      where: { id: templateId },
      data: { text: trimmed },
      select: {
        id: true,
        studio_id: true,
        text: true,
        usage_count: true,
        created_at: true,
      },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    return { success: true, data: template as PromiseLogTemplate };
  } catch (error) {
    console.error('[PROMISE_LOG_TEMPLATES] Error actualizando plantilla:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar plantilla',
    };
  }
}

/**
 * Eliminar una plantilla
 */
export async function deletePromiseLogTemplate(
  studioSlug: string,
  templateId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    await prisma.studio_promise_log_templates.deleteMany({
      where: { id: templateId, studio_id: studio.id },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    return { success: true };
  } catch (error) {
    console.error('[PROMISE_LOG_TEMPLATES] Error eliminando plantilla:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar plantilla',
    };
  }
}
