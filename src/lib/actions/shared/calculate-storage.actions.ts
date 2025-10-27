"use server";

import { prisma } from "@/lib/prisma";

export interface StorageBreakdown {
    sectionId: string;
    sectionName: string;
    categoryBytes: number;
    categoryCount: number;
    itemBytes: number;
    itemCount: number;
    subtotal: number;
}

export interface StorageStats {
    studioId: string;
    totalBytes: number;
    sections: StorageBreakdown[];
    categoriesGlobalBytes: number;
    itemsGlobalBytes: number;
    postsGlobalBytes: number;
}

/**
 * Calcula el almacenamiento real desde las tablas de media
 * FUENTE ÚNICA DE VERDAD para storage
 */
export async function calcularStorageCompleto(studioSlug: string): Promise<{
    success: boolean;
    data?: StorageStats;
    error?: string;
}> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        // Obtener todas las categorías del studio con media
        const categories = await prisma.studio_service_categories.findMany({
            include: {
                section_categories: {
                    include: {
                        service_sections: true,
                    },
                },
                category_media: {
                    select: { storage_bytes: true },
                },
                items: {
                    where: { studio_id: studio.id },
                    include: {
                        item_media: {
                            select: { storage_bytes: true },
                        },
                    },
                },
            },
        });

        // Obtener multimedia de posts
        const postsMedia = await prisma.studio_post_media.findMany({
            where: { studio_id: studio.id },
            select: { storage_bytes: true },
        });

        const totalPostsBytes = postsMedia.reduce(
            (sum: number, m: { storage_bytes: bigint }) => sum + Number(m.storage_bytes),
            0
        );

        // Agrupar por sección
        const sectionMap = new Map<string, StorageBreakdown>();
        let totalCategoryBytes = 0;
        let totalItemBytes = 0;

        for (const cat of categories) {
            // Media de categoría
            const catBytes = cat.category_media.reduce(
                (sum: number, m: { storage_bytes: bigint }) => sum + Number(m.storage_bytes),
                0
            );
            totalCategoryBytes += catBytes;

            // Media de items
            let itemBytes = 0;
            for (const item of cat.items) {
                const bytes = item.item_media.reduce(
                    (sum: number, m: { storage_bytes: bigint }) => sum + Number(m.storage_bytes),
                    0
                );
                itemBytes += bytes;
                totalItemBytes += bytes;
            }

            // Obtener sección
            if (cat.section_categories) {
                const sectionId = cat.section_categories.service_sections.id;
                const sectionName = cat.section_categories.service_sections.name;

                if (!sectionMap.has(sectionId)) {
                    sectionMap.set(sectionId, {
                        sectionId,
                        sectionName,
                        categoryBytes: 0,
                        categoryCount: 0,
                        itemBytes: 0,
                        itemCount: 0,
                        subtotal: 0,
                    });
                }

                const section = sectionMap.get(sectionId)!;
                section.categoryBytes += catBytes;
                section.categoryCount += 1;
                section.itemBytes += itemBytes;
                section.itemCount += cat.items.length;
                section.subtotal = section.categoryBytes + section.itemBytes;
            }
        }

        const sections = Array.from(sectionMap.values());
        const totalBytes = totalCategoryBytes + totalItemBytes + totalPostsBytes;

        // Actualizar studio_storage_usage
        await prisma.studio_storage_usage.upsert({
            where: { studio_id: studio.id },
            create: {
                studio_id: studio.id,
                total_storage_bytes: BigInt(totalBytes),
                category_media_bytes: BigInt(totalCategoryBytes),
                item_media_bytes: BigInt(totalItemBytes),
                section_media_bytes: BigInt(0),
                portfolio_media_bytes: BigInt(totalPostsBytes),
                page_media_bytes: BigInt(0),
                quota_limit_bytes: BigInt(10 * 1024 * 1024 * 1024), // 10GB default
            },
            update: {
                total_storage_bytes: BigInt(totalBytes),
                category_media_bytes: BigInt(totalCategoryBytes),
                item_media_bytes: BigInt(totalItemBytes),
                portfolio_media_bytes: BigInt(totalPostsBytes),
                last_calculated_at: new Date(),
            },
        });

        return {
            success: true,
            data: {
                studioId: studio.id,
                totalBytes,
                sections,
                categoriesGlobalBytes: totalCategoryBytes,
                itemsGlobalBytes: totalItemBytes,
                postsGlobalBytes: totalPostsBytes,
            },
        };
    } catch (error) {
        console.error("Error calculando storage:", error);
        return { success: false, error: "Error al calcular almacenamiento" };
    }
}
