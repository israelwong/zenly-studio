'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface AgendaSubjectTemplate {
  id: string;
  studio_id: string;
  text: string;
  usage_count: number;
  created_at: Date;
}

/**
 * Listar plantillas de asunto del estudio, ordenadas por uso y texto
 */
export async function getAgendaSubjectTemplates(
  studioSlug: string
): Promise<{ success: true; data: AgendaSubjectTemplate[] } | { success: false; error: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    const templates = await prisma.studio_agenda_subject_templates.findMany({
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
      data: templates as AgendaSubjectTemplate[],
    };
  } catch (error) {
    console.error('[AGENDA_SUBJECT_TEMPLATES] Error listando plantillas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al listar plantillas',
    };
  }
}

/**
 * Crear plantilla de asunto (o devolver la existente si ya existe el mismo texto)
 */
export async function createAgendaSubjectTemplate(
  studioSlug: string,
  text: string
): Promise<{ success: true; data: AgendaSubjectTemplate } | { success: false; error: string }> {
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

    const existing = await prisma.studio_agenda_subject_templates.findUnique({
      where: {
        studio_id_text: { studio_id: studio.id, text: trimmed },
      },
    });

    if (existing) {
      revalidateAgendaPaths(studioSlug);
      return { success: true, data: existing as AgendaSubjectTemplate };
    }

    const template = await prisma.studio_agenda_subject_templates.create({
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

    revalidateAgendaPaths(studioSlug);
    return { success: true, data: template as AgendaSubjectTemplate };
  } catch (error) {
    console.error('[AGENDA_SUBJECT_TEMPLATES] Error creando plantilla:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear plantilla',
    };
  }
}

/**
 * Actualizar texto de una plantilla
 */
export async function updateAgendaSubjectTemplate(
  studioSlug: string,
  templateId: string,
  text: string
): Promise<{ success: true; data: AgendaSubjectTemplate } | { success: false; error: string }> {
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

    const existing = await prisma.studio_agenda_subject_templates.findFirst({
      where: { id: templateId, studio_id: studio.id },
    });
    if (!existing) {
      return { success: false, error: 'Plantilla no encontrada' };
    }

    const duplicate = await prisma.studio_agenda_subject_templates.findUnique({
      where: {
        studio_id_text: { studio_id: studio.id, text: trimmed },
      },
    });
    if (duplicate && duplicate.id !== templateId) {
      return { success: false, error: 'Ya existe una plantilla con ese texto' };
    }

    const template = await prisma.studio_agenda_subject_templates.update({
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

    revalidateAgendaPaths(studioSlug);
    return { success: true, data: template as AgendaSubjectTemplate };
  } catch (error) {
    console.error('[AGENDA_SUBJECT_TEMPLATES] Error actualizando plantilla:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar plantilla',
    };
  }
}

/**
 * Eliminar una plantilla
 */
export async function deleteAgendaSubjectTemplate(
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

    await prisma.studio_agenda_subject_templates.deleteMany({
      where: { id: templateId, studio_id: studio.id },
    });

    revalidateAgendaPaths(studioSlug);
    return { success: true };
  } catch (error) {
    console.error('[AGENDA_SUBJECT_TEMPLATES] Error eliminando plantilla:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar plantilla',
    };
  }
}

/**
 * Incrementar usage_count de una plantilla por texto (al guardar agendamiento)
 */
export async function incrementAgendaSubjectTemplateUsage(
  studioId: string,
  text: string
): Promise<void> {
  const trimmed = text?.trim();
  if (!trimmed) return;
  try {
    await prisma.studio_agenda_subject_templates.updateMany({
      where: { studio_id: studioId, text: trimmed },
      data: { usage_count: { increment: 1 } },
    });
  } catch {
    // No bloquear el flujo si falla el incremento
  }
}

function revalidateAgendaPaths(studioSlug: string): void {
  revalidatePath(`/${studioSlug}/studio`);
  revalidatePath(`/${studioSlug}/studio/commercial/promises`);
}
