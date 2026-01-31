'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface WhatsAppTemplate {
  id: string;
  studio_id: string;
  title: string;
  message: string;
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
      orderBy: { created_at: 'desc' },
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

    const created = await prisma.studio_whatsapp_templates.create({
      data: { studio_id: studio.id, title: t, message: m },
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
