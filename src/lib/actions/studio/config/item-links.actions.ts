'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type ServiceLinksMap = Record<string, string[]>;

async function getStudioIdFromSlug(slug: string): Promise<string | null> {
  const studio = await prisma.studios.findUnique({
    where: { slug },
    select: { id: true },
  });
  return studio?.id ?? null;
}

/**
 * Obtiene el mapa de vínculos padre → hijos por studio.
 * keys: source_item_id (Padre), values: linked_item_id[] ordenados por order.
 */
export async function getServiceLinks(studioSlug: string): Promise<{
  success: boolean;
  data?: ServiceLinksMap;
  error?: string;
}> {
  try {
    const studioId = await getStudioIdFromSlug(studioSlug);
    if (!studioId) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    const links = await prisma.studio_item_links.findMany({
      where: { studio_id: studioId },
      orderBy: [{ source_item_id: 'asc' }, { order: 'asc' }],
      select: { source_item_id: true, linked_item_id: true, order: true },
    });

    const map: ServiceLinksMap = {};
    for (const row of links) {
      if (!map[row.source_item_id]) {
        map[row.source_item_id] = [];
      }
      map[row.source_item_id].push(row.linked_item_id);
    }
    return { success: true, data: map };
  } catch (error) {
    console.error('[ITEM_LINKS] getServiceLinks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener vínculos',
    };
  }
}

/**
 * Guarda los vínculos de un ítem (Padre): reemplaza todos los hijos por linkedItemIds.
 */
export async function updateServiceLinks(
  studioSlug: string,
  sourceItemId: string,
  linkedItemIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const studioId = await getStudioIdFromSlug(studioSlug);
    if (!studioId) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.studio_item_links.deleteMany({
        where: { studio_id: studioId, source_item_id: sourceItemId },
      });
      if (linkedItemIds.length > 0) {
        const uniq = [...new Set(linkedItemIds)];
        await tx.studio_item_links.createMany({
          data: uniq.map((linked_item_id, index) => ({
            studio_id: studioId,
            source_item_id: sourceItemId,
            linked_item_id,
            order: index,
          })),
        });
      }
    });

    revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
    return { success: true };
  } catch (error) {
    console.error('[ITEM_LINKS] updateServiceLinks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al guardar vínculos',
    };
  }
}
