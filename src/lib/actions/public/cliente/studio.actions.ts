'use server';

/**
 * Server Actions para información pública del studio
 */

import { prisma } from '@/lib/prisma';

export interface StudioPublicInfo {
  studio_name: string;
  logo_url: string | null;
  isotipo_url: string | null;
  slug: string;
}

/**
 * Obtiene información pública del studio por slug
 */
export async function obtenerStudioPublicInfo(slug: string): Promise<StudioPublicInfo | null> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug },
      select: {
        studio_name: true,
        logo_url: true,
        isotipo_url: true,
        slug: true,
      },
    });

    return studio;
  } catch (error) {
    console.error('[obtenerStudioPublicInfo] Error:', error);
    return null;
  }
}

