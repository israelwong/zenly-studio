'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface WhatsAppTemplate {
  id: string;
  studio_id: string;
  title: string;
  message: string;
  display_order: number;
  created_at: Date;
}

type Result<T> = { success: true; data: T } | { success: false; error: string };

export async function getWhatsAppTemplates(
  studioSlug: string
): Promise<Result<WhatsAppTemplate[]>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };

    const rows = await prisma.studio_whatsapp_templates.findMany({
      where: { studio_id: studio.id },
      orderBy: [{ display_order: 'asc' }, { created_at: 'asc' }],
    });
    return { success: true, data: rows as WhatsAppTemplate[] };
  } catch (e) {
    console.error('[whatsapp-templates] getWhatsAppTemplates:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al listar plantillas',
    };
  }
}

export async function createWhatsAppTemplate(
  studioSlug: string,
  title: string,
  message: string
): Promise<Result<WhatsAppTemplate>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };
    const t = title.trim();
    const m = message.trim();
    if (!t || !m) return { success: false, error: 'Título y mensaje son requeridos' };

    const maxOrder = await prisma.studio_whatsapp_templates
      .aggregate({ where: { studio_id: studio.id }, _max: { display_order: true } })
      .then((r) => (r._max.display_order ?? -1) + 1);
    const created = await prisma.studio_whatsapp_templates.create({
      data: { studio_id: studio.id, title: t, message: m, display_order: maxOrder },
    });
    revalidatePath(`/${studioSlug}/studio`);
    return { success: true, data: created as WhatsAppTemplate };
  } catch (e) {
    console.error('[whatsapp-templates] createWhatsAppTemplate:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al crear plantilla',
    };
  }
}

export async function updateWhatsAppTemplate(
  studioSlug: string,
  id: string,
  title: string,
  message: string
): Promise<Result<WhatsAppTemplate>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };
    const t = title.trim();
    const m = message.trim();
    if (!t || !m) return { success: false, error: 'Título y mensaje son requeridos' };

    const updated = await prisma.studio_whatsapp_templates.updateMany({
      where: { id, studio_id: studio.id },
      data: { title: t, message: m },
    });
    if (updated.count === 0) return { success: false, error: 'Plantilla no encontrada' };
    const row = await prisma.studio_whatsapp_templates.findUnique({
      where: { id },
    });
    revalidatePath(`/${studioSlug}/studio`);
    return { success: true, data: row as WhatsAppTemplate };
  } catch (e) {
    console.error('[whatsapp-templates] updateWhatsAppTemplate:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al actualizar plantilla',
    };
  }
}

export async function deleteWhatsAppTemplate(
  studioSlug: string,
  id: string
): Promise<Result<{ deleted: boolean }>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };

    await prisma.studio_whatsapp_templates.deleteMany({
      where: { id, studio_id: studio.id },
    });
    revalidatePath(`/${studioSlug}/studio`);
    return { success: true, data: { deleted: true } };
  } catch (e) {
    console.error('[whatsapp-templates] deleteWhatsAppTemplate:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al eliminar plantilla',
    };
  }
}

export async function duplicateWhatsAppTemplate(
  studioSlug: string,
  id: string
): Promise<Result<WhatsAppTemplate>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };

    const original = await prisma.studio_whatsapp_templates.findFirst({
      where: { id, studio_id: studio.id },
    });
    if (!original) return { success: false, error: 'Plantilla no encontrada' };

    const maxOrder = await prisma.studio_whatsapp_templates
      .aggregate({ where: { studio_id: studio.id }, _max: { display_order: true } })
      .then((r) => (r._max.display_order ?? -1) + 1);
    const newTitle = `Copia de ${original.title}`;
    const created = await prisma.studio_whatsapp_templates.create({
      data: {
        studio_id: studio.id,
        title: newTitle,
        message: original.message,
        display_order: maxOrder,
      },
    });
    revalidatePath(`/${studioSlug}/studio`);
    return { success: true, data: created as WhatsAppTemplate };
  } catch (e) {
    console.error('[whatsapp-templates] duplicateWhatsAppTemplate:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al duplicar plantilla',
    };
  }
}

/** Actualizar orden de plantillas (ids en el orden deseado). */
export async function updateTemplatesOrder(
  studioSlug: string,
  templateIds: string[]
): Promise<Result<{ updated: boolean }>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };
    if (templateIds.length === 0) return { success: true, data: { updated: true } };

    await prisma.$transaction(
      templateIds.map((id, index) =>
        prisma.studio_whatsapp_templates.updateMany({
          where: { id, studio_id: studio.id },
          data: { display_order: index },
        })
      )
    );
    revalidatePath(`/${studioSlug}/studio`);
    return { success: true, data: { updated: true } };
  } catch (e) {
    console.error('[whatsapp-templates] updateTemplatesOrder:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al actualizar orden',
    };
  }
}

/** IDs de plantillas WhatsApp ya enviadas a esta promesa (para badge Enviado). */
export async function getWhatsAppSentTemplateIdsForPromise(
  promiseId: string
): Promise<Result<string[]>> {
  try {
    const logs = await prisma.studio_promise_logs.findMany({
      where: { promise_id: promiseId, log_type: 'whatsapp_sent' },
      select: { metadata: true },
    });
    const ids = new Set<string>();
    for (const log of logs) {
      const meta = log.metadata as { whatsappTemplateId?: string } | null;
      if (meta?.whatsappTemplateId) ids.add(meta.whatsappTemplateId);
    }
    return { success: true, data: Array.from(ids) };
  } catch (e) {
    console.error('[whatsapp-templates] getWhatsAppSentTemplateIdsForPromise:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Error al listar envíos' };
  }
}
