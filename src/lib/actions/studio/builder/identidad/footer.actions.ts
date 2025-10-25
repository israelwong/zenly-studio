'use server';

import { prisma } from '@/lib/prisma';
import { retryDatabaseOperation } from '@/lib/actions/utils/database-retry';
import { revalidatePath } from 'next/cache';

/**
 * Footer Actions - CRUD para datos del pie de página
 * 
 * Incluye:
 * - Página web del studio
 * - Palabras clave SEO
 * - Información adicional del footer
 */

// Obtener datos del footer
export async function obtenerFooterData(studioSlug: string) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                website: true,
                keywords: true,
                address: true,
                maps_url: true,
            },
        });

        if (!studio) {
            console.error(`❌ Studio no encontrado con slug: ${studioSlug}`);
            return {
                success: false,
                error: `Studio con slug "${studioSlug}" no encontrado.`,
            };
        }

        // Parsear palabras clave si existen
        let palabrasClave: string[] = [];
        if (studio.keywords) {
            try {
                palabrasClave = JSON.parse(studio.keywords);
            } catch {
                // Si no se puede parsear, usar como string simple
                palabrasClave = studio.keywords.split(',').map(p => p.trim()).filter(p => p);
            }
        }

        return {
            success: true,
            data: {
                ...studio,
                palabras_clave: palabrasClave,
            },
        };
    });
}

// Actualizar página web
export async function actualizarPaginaWeb(
    studioSlug: string,
    website: string
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const studioActualizado = await prisma.studios.update({
            where: { id: studio.id },
            data: { website },
            select: { website: true },
        });

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return studioActualizado;
    });
}

// Actualizar palabras clave del footer
export async function actualizarPalabrasClaveFooter(
    studioSlug: string,
    palabrasClave: string[]
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Convertir array a string JSON
        const palabrasClaveString = JSON.stringify(palabrasClave);

        await prisma.studios.update({
            where: { id: studio.id },
            data: {
                keywords: palabrasClaveString,
            },
            select: {
                keywords: true,
            },
        });

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return {
            keywords: palabrasClave,
        };
    });
}

// Actualizar dirección
export async function actualizarDireccion(
    studioSlug: string,
    address: string
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const studioActualizado = await prisma.studios.update({
            where: { id: studio.id },
            data: { address },
            select: { address: true },
        });

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return studioActualizado;
    });
}

// Actualizar URL de Google Maps
export async function actualizarMapsUrl(
    studioSlug: string,
    mapsUrl: string
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const studioActualizado = await prisma.studios.update({
            where: { id: studio.id },
            data: { maps_url: mapsUrl },
            select: { maps_url: true },
        });

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return studioActualizado;
    });
}

// Actualizar múltiples campos del footer
export async function actualizarFooterCompleto(
    studioSlug: string,
    data: {
        website?: string;
        address?: string;
        maps_url?: string;
        palabras_clave?: string[];
    }
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Preparar datos de actualización
        const updateData: {
            website?: string;
            address?: string;
            maps_url?: string;
            keywords?: string;
        } = {};

        if (data.website !== undefined) {
            updateData.website = data.website;
        }

        if (data.address !== undefined) {
            updateData.address = data.address;
        }

        if (data.maps_url !== undefined) {
            updateData.maps_url = data.maps_url;
        }

        if (data.palabras_clave) {
            updateData.keywords = JSON.stringify(data.palabras_clave);
        }

        const studioActualizado = await prisma.studios.update({
            where: { id: studio.id },
            data: updateData,
            select: {
                website: true,
                address: true,
                maps_url: true,
                keywords: true,
            },
        });

        // Parsear palabras clave para la respuesta
        let palabrasClave: string[] = [];
        if (studioActualizado.keywords) {
            try {
                palabrasClave = JSON.parse(studioActualizado.keywords);
            } catch {
                palabrasClave = studioActualizado.keywords.split(',').map(p => p.trim()).filter(p => p);
            }
        }

        revalidatePath(`/studio/${studioSlug}/builder/identidad`);
        return {
            ...studioActualizado,
            palabras_clave: palabrasClave,
        };
    });
}
