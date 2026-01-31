'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const MAX_TOP_SHOTS = 12;

export interface PortfolioForWhatsApp {
  id: string;
  title: string;
  slug: string;
}

export interface TopShot {
  id: string;
  file_url: string;
  display_order: number;
}

type PortfoliosResult = { success: true; data: PortfolioForWhatsApp[] } | { success: false; error: string };
type TopShotsResult = { success: true; data: TopShot[] } | { success: false; error: string };

/** Portafolios publicados para insertar link en el modal WhatsApp (slug para URL ?portfolio=slug) */
export async function getPortfoliosForWhatsApp(studioSlug: string): Promise<PortfoliosResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };

    const rows = await prisma.studio_portfolios.findMany({
      where: { studio_id: studio.id, is_published: true },
      select: { id: true, title: true, slug: true },
      orderBy: [{ order: 'asc' }],
    });
    return { success: true, data: rows };
  } catch (e) {
    console.error('[whatsapp-resources] getPortfoliosForWhatsApp:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Error al listar portafolios' };
  }
}

/** Top Shots del estudio (máx 12) para copiar al portapapeles */
export async function getTopShots(studioSlug: string): Promise<TopShotsResult> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };

    const rows = await prisma.studio_top_shots.findMany({
      where: { studio_id: studio.id },
      select: { id: true, file_url: true, display_order: true },
      orderBy: { display_order: 'asc' },
    });
    return { success: true, data: rows };
  } catch (e) {
    console.error('[whatsapp-resources] getTopShots:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Error al listar fotos' };
  }
}

/** Añadir Top Shot (upload). Máximo 12 por estudio. */
export async function addTopShot(
  studioSlug: string,
  formData: FormData
): Promise<{ success: true; data: TopShot } | { success: false; error: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };

    const count = await prisma.studio_top_shots.count({ where: { studio_id: studio.id } });
    if (count >= MAX_TOP_SHOTS) return { success: false, error: `Máximo ${MAX_TOP_SHOTS} fotos. Elimina una para agregar otra.` };

    const file = formData.get('file') as File | null;
    if (!file || !file.type.startsWith('image/')) return { success: false, error: 'Selecciona una imagen' };

    const supabase = await createClient();
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${file.name.replace(/\s/g, '-')}`;
    const storagePath = `studios/${studio.id}/top-shots/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('media').upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '31536000',
    });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath);
    const fileUrl = urlData.publicUrl;

    const created = await prisma.studio_top_shots.create({
      data: {
        studio_id: studio.id,
        file_url: fileUrl,
        storage_path: storagePath,
        display_order: count,
      },
    });
    revalidatePath(`/${studioSlug}/studio`);
    return { success: true, data: { id: created.id, file_url: created.file_url, display_order: created.display_order } };
  } catch (e) {
    console.error('[whatsapp-resources] addTopShot:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Error al subir foto' };
  }
}

/** Eliminar Top Shot */
export async function removeTopShot(
  studioSlug: string,
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Estudio no encontrado' };

    await prisma.studio_top_shots.deleteMany({
      where: { id, studio_id: studio.id },
    });
    revalidatePath(`/${studioSlug}/studio`);
    return { success: true };
  } catch (e) {
    console.error('[whatsapp-resources] removeTopShot:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Error al eliminar foto' };
  }
}
