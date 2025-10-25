'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Social Actions - CRUD para redes sociales
 * 
 * Incluye:
 * - Redes sociales del studio
 * - Plataformas disponibles
 * - Gestión de orden y estado
 */

// Obtener redes sociales del studio
export async function obtenerRedesSocialesStudio(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const redesSociales = await prisma.studio_social_networks.findMany({
            where: { studio_id: studio.id },
            include: {
                platform: true
            },
            orderBy: { order: 'asc' }
        });

        return redesSociales;
    } catch (error) {
        console.error('Error obteniendo redes sociales:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Obtener plataformas disponibles
export async function obtenerPlataformasDisponibles() {
    try {
        const plataformas = await prisma.platform_social_networks.findMany({
            where: { is_active: true },
            orderBy: { order: 'asc' }
        });

        return { success: true, data: plataformas };
    } catch (error) {
        console.error('Error obteniendo plataformas:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Crear nueva red social
export async function crearRedSocial(studioSlug: string, data: {
    platform_id: string;
    url: string;
}) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Obtener el siguiente orden
        const ultimoOrden = await prisma.studio_social_networks.findFirst({
            where: { studio_id: studio.id },
            orderBy: { order: 'desc' },
            select: { order: true }
        });

        const nuevoOrden = (ultimoOrden?.order || 0) + 1;

        const redSocial = await prisma.studio_social_networks.create({
            data: {
                studio_id: studio.id,
                platform_id: data.platform_id,
                url: data.url,
                order: nuevoOrden,
                is_active: true
            },
            include: {
                platform: true
            }
        });

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return { success: true, data: redSocial };
    } catch (error) {
        console.error('Error creando red social:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Actualizar red social
export async function actualizarRedSocial(studioSlug: string, redSocialId: string, data: {
    platform_id?: string;
    url?: string;
    is_active?: boolean;
}) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const redSocial = await prisma.studio_social_networks.update({
            where: {
                id: redSocialId,
                studio_id: studio.id
            },
            data: {
                ...(data.platform_id && { platform_id: data.platform_id }),
                ...(data.url && { url: data.url }),
                ...(data.is_active !== undefined && { is_active: data.is_active })
            },
            include: {
                platform: true
            }
        });

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return { success: true, data: redSocial };
    } catch (error) {
        console.error('Error actualizando red social:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Eliminar red social
export async function eliminarRedSocial(studioSlug: string, redSocialId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        await prisma.studio_social_networks.delete({
            where: {
                id: redSocialId,
                studio_id: studio.id
            }
        });

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return { success: true };
    } catch (error) {
        console.error('Error eliminando red social:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Reordenar redes sociales
export async function reordenarRedesSociales(studioSlug: string, redesSociales: Array<{
    id: string;
    order: number;
}>) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Actualizar el orden de cada red social
        await Promise.all(
            redesSociales.map(red =>
                prisma.studio_social_networks.update({
                    where: {
                        id: red.id,
                        studio_id: studio.id
                    },
                    data: { order: red.order }
                })
            )
        );

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return { success: true };
    } catch (error) {
        console.error('Error reordenando redes sociales:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

// Toggle estado de red social
export async function toggleRedSocialEstado(studioSlug: string, redSocialId: string, isActive: boolean) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        await prisma.studio_social_networks.update({
            where: {
                id: redSocialId,
                studio_id: studio.id
            },
            data: { is_active: isActive }
        });

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return { success: true };
    } catch (error) {
        console.error('Error cambiando estado de red social:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
