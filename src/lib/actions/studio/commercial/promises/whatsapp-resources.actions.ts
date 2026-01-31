'use server';

import { prisma } from '@/lib/prisma';
import type { PortfoliosResult } from './whatsapp-resources.types';

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
