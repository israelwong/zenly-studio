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

/**
 * Elimina cualquier vínculo donde el ítem aparezca como padre (source) o como hijo (linked).
 * Permite limpiar vínculos legacy o huérfanos por ítem.
 */
export async function clearAllLinksForItem(
  studioSlug: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studioId = await getStudioIdFromSlug(studioSlug);
    if (!studioId) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    await prisma.studio_item_links.deleteMany({
      where: {
        studio_id: studioId,
        OR: [
          { source_item_id: itemId },
          { linked_item_id: itemId },
        ],
      },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
    return { success: true };
  } catch (error) {
    console.error('[ITEM_LINKS] clearAllLinksForItem:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desvincular ítem',
    };
  }
}

/**
 * Elimina el vínculo entre dos ítems, sin importar cuál sea padre o hijo.
 * DELETE WHERE (source=A AND linked=B) OR (source=B AND linked=A).
 */
export async function unlinkItems(
  studioSlug: string,
  itemIdA: string,
  itemIdB: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studioId = await getStudioIdFromSlug(studioSlug);
    if (!studioId) {
      return { success: false, error: 'Estudio no encontrado' };
    }

    await prisma.studio_item_links.deleteMany({
      where: {
        studio_id: studioId,
        OR: [
          { source_item_id: itemIdA, linked_item_id: itemIdB },
          { source_item_id: itemIdB, linked_item_id: itemIdA },
        ],
      },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
    return { success: true };
  } catch (error) {
    console.error('[ITEM_LINKS] unlinkItems:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desvincular',
    };
  }
}
