"use server";

import { prisma } from '@/lib/prisma';

/**
 * Obtener perfil del usuario por studioSlug
 * Busca el lead asociado al studio para obtener avatar_url y otros datos
 * @param studioSlug - slug del studio (requerido)
 */
export async function getCurrentUserProfile(studioSlug?: string) {
    try {
        // Validación 1: studioSlug debe existir
        if (!studioSlug || typeof studioSlug !== 'string' || studioSlug.trim() === '') {
            return {
                success: false,
                error: 'studioSlug inválido'
            };
        }

        // Validación 2: Buscar studio
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return {
                success: false,
                error: 'Studio no encontrado'
            };
        }

        // Validación 3: Buscar lead
        const leadProfile = await prisma.platform_leads.findFirst({
            where: { studio_id: studio.id }
        });

        if (!leadProfile) {
            return {
                success: false,
                error: 'Lead no encontrado'
            };
        }

        // Validación 4: Asegurar que avatar_url sea una cadena válida
        const avatarUrl = leadProfile.avatar_url &&
            typeof leadProfile.avatar_url === 'string' &&
            leadProfile.avatar_url.trim() !== ''
            ? leadProfile.avatar_url
            : null;

        // Retornar datos validados
        return {
            success: true,
            data: {
                id: leadProfile.id,
                email: leadProfile.email,
                fullName: leadProfile.name,
                avatarUrl: avatarUrl,
                phone: leadProfile.phone,
                isActive: true,
                createdAt: leadProfile.created_at,
                updatedAt: leadProfile.updated_at,
            }
        };

    } catch {
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}
