'use server';

import { prisma } from '@/lib/prisma';
import { retryDatabaseOperation } from '@/lib/actions/utils/database-retry';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Ubicación Actions - CRUD para datos de ubicación del estudio
 * 
 * Incluye:
 * - Dirección física del estudio
 * - Enlace de Google Maps
 */

const UbicacionUpdateSchema = z.object({
    direccion: z.string().max(500, "La dirección es muy larga").optional().or(z.literal("")),
    google_maps_url: z.string().url("URL de Google Maps inválida").optional().or(z.literal("")).or(z.null()).or(z.undefined()),
});

export type UbicacionUpdateForm = z.infer<typeof UbicacionUpdateSchema>;

// Obtener datos de ubicación del studio
export async function obtenerUbicacionStudio(studioSlug: string) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                address: true,
                maps_url: true,
            },
        });

        if (!studio) {
            console.error(`❌ Studio no encontrado con slug: ${studioSlug}`);
            return {
                success: false,
                error: `Studio con slug "${studioSlug}" no encontrado. Verifica que el studio existe y está activo.`,
            };
        }

        return {
            success: true,
            data: {
                direccion: studio.address || null,
                google_maps_url: studio.maps_url || null,
            },
        };
    });
}

// Actualizar datos de ubicación
export async function actualizarUbicacion(
    studioSlug: string,
    data: UbicacionUpdateForm
) {
    return await retryDatabaseOperation(async () => {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const validatedData = UbicacionUpdateSchema.parse(data);

        const updateData: {
            address?: string | null;
            maps_url?: string | null;
        } = {};

        if (validatedData.direccion !== undefined) {
            updateData.address = validatedData.direccion || null;
        }

        if (validatedData.google_maps_url !== undefined) {
            updateData.maps_url = validatedData.google_maps_url || null;
        }

        const studioActualizado = await prisma.studios.update({
            where: { id: studio.id },
            data: updateData,
            select: {
                address: true,
                maps_url: true,
            },
        });

        revalidatePath(`/${studioSlug}/studio/profile/ubicacion`);
        revalidatePath(`/${studioSlug}/studio/profile/identidad`);
        revalidatePath(`/${studioSlug}`);

        return {
            success: true,
            data: {
                direccion: studioActualizado.address,
                google_maps_url: studioActualizado.maps_url,
            },
        };
    });
}

