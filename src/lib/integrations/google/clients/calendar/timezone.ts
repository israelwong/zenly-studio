'use server';

import { prisma } from '@/lib/prisma';

/**
 * Obtiene el timezone del estudio con la siguiente prioridad:
 * 1. Timezone del navegador (si se proporciona)
 * 2. Timezone del estudio (campo timezone en studios)
 * 3. Timezone de platform_config
 * 4. Default: "America/Mexico_City"
 *
 * @param studioSlug - Slug del estudio
 * @param userTimezone - Timezone del navegador del usuario (opcional)
 * @returns Timezone string válido para Google Calendar
 */
export async function obtenerTimezoneEstudio(
    studioSlug: string,
    userTimezone?: string
): Promise<string> {
    // 1. Prioridad: timezone del usuario (navegador)
    if (userTimezone) {
        return userTimezone;
    }

    // 2. Buscar timezone del estudio
    const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { timezone: true },
    });

    if (studio?.timezone) {
        return studio.timezone;
    }

    // 3. Fallback: platform_config
    const config = await prisma.platform_config.findFirst({
        select: { timezone: true },
    });

    return config?.timezone || 'America/Mexico_City';
}

