'use server';

import { prisma } from '@/lib/prisma';
import type { ActionResponse } from '@/lib/actions/schemas/promises-schemas';

interface EventType {
  id: string;
  name: string;
}

/**
 * Obtener tipos de evento del studio
 */
export async function getEventTypes(
  studioSlug: string
): Promise<ActionResponse<EventType[]>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const eventTypes = await prisma.studio_event_types.findMany({
      where: {
        studio_id: studio.id,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { order: 'asc' },
    });

    return {
      success: true,
      data: eventTypes,
    };
  } catch (error) {
    console.error('[EVENT_TYPES] Error obteniendo tipos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

