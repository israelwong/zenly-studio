'use server';

import { prisma } from '@/lib/prisma';

/**
 * Valida que un studio existe y retorna su ID
 * Helper centralizado para evitar duplicación en todas las actions
 */
export async function validateStudio(studioSlug: string): Promise<{
  success: boolean;
  studioId?: string;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    return { success: true, studioId: studio.id };
  } catch (error) {
    console.error('[STUDIO_VALIDATOR] Error validando studio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al validar studio',
    };
  }
}

/**
 * Valida studio y retorna el ID directamente o lanza error
 * Útil para simplificar el flujo en actions
 */
export async function getStudioIdOrThrow(studioSlug: string): Promise<string> {
  const result = await validateStudio(studioSlug);
  if (!result.success || !result.studioId) {
    throw new Error(result.error || 'Studio no encontrado');
  }
  return result.studioId;
}
