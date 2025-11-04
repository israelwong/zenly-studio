"use server";

import { prisma } from "@/lib/prisma";
import type { PublicPaquete } from "@/types/public-profile";

/**
 * Obtiene los paquetes públicos de un estudio
 * Para mostrar en el perfil público
 */
export async function getPublicPaquetes(
    studioSlug: string
): Promise<{
    success: boolean;
    data?: PublicPaquete[];
    error?: string;
}> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado",
            };
        }

        const paquetes = await prisma.studio_paquetes.findMany({
            where: {
                studio_id: studio.id,
                status: "active",
            },
            select: {
                id: true,
                name: true,
                description: true,
                precio: true,
                cover_url: true,
                order: true,
                is_featured: true,
                status: true,
                event_types: {
                    select: {
                        name: true,
                        order: true,
                    },
                },
            },
            orderBy: [{ is_featured: "desc" }, { order: "asc" }],
        });

        // Transformar datos al formato público
        const publicPaquetes: PublicPaquete[] = paquetes.map((paquete) => ({
            id: paquete.id,
            nombre: paquete.name,
            descripcion: paquete.description ? paquete.description : undefined,
            precio: paquete.precio ?? 0,
            tipo_evento: paquete.event_types?.name ? paquete.event_types.name : undefined,
            tipo_evento_order: paquete.event_types?.order ?? undefined,
            cover_url: paquete.cover_url ? paquete.cover_url : undefined,
            is_featured: paquete.is_featured ?? false,
            status: paquete.status,
            duracion_horas: undefined, // Campo no existe en schema actual
            incluye: undefined, // Campo no existe en schema actual
            no_incluye: undefined, // Campo no existe en schema actual
            condiciones: undefined, // Campo no existe en schema actual
            order: paquete.order,
        }));

        return {
            success: true,
            data: publicPaquetes,
        };
    } catch (error) {
        console.error("[getPublicPaquetes] Error:", error);
        return {
            success: false,
            error: "Error al obtener paquetes",
        };
    }
}
