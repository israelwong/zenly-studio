"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
    : null;

const BUCKET_NAME = 'Studio';

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
    portfoliosGlobalBytes: number;
    paquetesGlobalBytes: number;
    offersGlobalBytes: number;
    contactosAvatarsBytes: number;
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

        // Obtener multimedia de portfolios
        const portfoliosMedia = await prisma.studio_portfolio_media.findMany({
            where: { studio_id: studio.id },
            select: { storage_bytes: true },
        });

        console.log('🔍 calculateStorageCompleto: Portfolios media encontrados:', portfoliosMedia.length);

        const totalPortfoliosBytes = portfoliosMedia.reduce(
            (sum: number, m: { storage_bytes: bigint }) => sum + Number(m.storage_bytes),
            0
        );

        console.log('🔍 calculateStorageCompleto: Total portfolios bytes:', totalPortfoliosBytes);

        // Obtener covers de paquetes con su tamaño almacenado
        const paquetes = await prisma.studio_paquetes.findMany({
            where: { studio_id: studio.id },
            select: { cover_storage_bytes: true },
        });

        // Calcular tamaño de covers de paquetes desde la DB
        const totalPaquetesBytes = paquetes.reduce(
            (sum: number, paquete: { cover_storage_bytes: bigint | null }) => {
                return sum + (paquete.cover_storage_bytes ? Number(paquete.cover_storage_bytes) : 0);
            },
            0
        );

        console.log('🔍 calculateStorageCompleto: Paquetes con cover:', paquetes.filter(p => p.cover_storage_bytes).length);
        console.log('🔍 calculateStorageCompleto: Total paquetes bytes:', totalPaquetesBytes);

        // Obtener multimedia de ofertas (content blocks)
        const offersMedia = await prisma.studio_offer_media.findMany({
            where: { studio_id: studio.id },
            select: { storage_bytes: true },
        });

        const totalOffersMediaBytes = offersMedia.reduce(
            (sum: number, m: { storage_bytes: bigint }) => sum + Number(m.storage_bytes),
            0
        );

        // Obtener portadas de ofertas y calcular su tamaño desde Supabase Storage
        const offers = await prisma.studio_offers.findMany({
            where: { studio_id: studio.id },
            select: { cover_media_url: true },
        });

        let totalOffersCoverBytes = 0;
        if (supabaseAdmin && offers.length > 0) {
            try {
                // Función helper para extraer path de URL
                const getPathFromUrl = (url: string): string | null => {
                    try {
                        const urlObj = new URL(url);
                        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/media\/(.+)/);
                        return pathMatch ? pathMatch[1] : null;
                    } catch {
                        return null;
                    }
                };

                for (const offer of offers) {
                    if (!offer.cover_media_url) continue;

                    const coverPath = getPathFromUrl(offer.cover_media_url);
                    if (!coverPath) continue;

                    try {
                        // Obtener información del archivo desde Supabase Storage
                        const pathParts = coverPath.split('/');
                        const fileName = pathParts.pop();
                        const folderPath = pathParts.join('/');

                        const { data: files, error } = await supabaseAdmin.storage
                            .from(BUCKET_NAME)
                            .list(folderPath || '', {
                                search: fileName || '',
                                limit: 1,
                            });

                        if (!error && files && files.length > 0) {
                            const fileInfo = files[0];
                            if (fileInfo.metadata?.size) {
                                totalOffersCoverBytes += parseInt(fileInfo.metadata.size, 10);
                            }
                        }
                    } catch (err) {
                        console.warn(`[calculateStorageCompleto] Error obteniendo tamaño de portada ${offer.cover_media_url}:`, err);
                    }
                }
            } catch (error) {
                console.warn('[calculateStorageCompleto] Error calculando storage de portadas de ofertas:', error);
            }
        }

        const totalOffersBytes = totalOffersMediaBytes + totalOffersCoverBytes;

        console.log('🔍 calculateStorageCompleto: Ofertas media encontrados:', offersMedia.length);
        console.log('🔍 calculateStorageCompleto: Ofertas con portada:', offers.filter(o => o.cover_media_url).length);
        console.log('🔍 calculateStorageCompleto: Total ofertas media bytes:', totalOffersMediaBytes);
        console.log('🔍 calculateStorageCompleto: Total ofertas portadas bytes:', totalOffersCoverBytes);
        console.log('🔍 calculateStorageCompleto: Total ofertas bytes:', totalOffersBytes);

        // Calcular storage de avatares de contactos desde Supabase Storage
        let totalContactosAvatarsBytes = 0;
        if (supabaseAdmin) {
            try {
                const studioSlugData = await prisma.studios.findUnique({
                    where: { id: studio.id },
                    select: { slug: true }
                });

                if (studioSlugData?.slug) {
                    const contactosAvatarsPath = `studios/${studioSlugData.slug}/clientes/contactos-avatars`;

                    // Listar archivos recursivamente
                    const listFilesRecursive = async (path: string): Promise<number> => {
                        let totalBytes = 0;
                        const { data: files, error } = await supabaseAdmin.storage
                            .from(BUCKET_NAME)
                            .list(path, {
                                limit: 1000,
                                offset: 0,
                                sortBy: { column: 'name', order: 'asc' }
                            });

                        if (error) {
                            console.warn(`Error listando ${path}:`, error.message);
                            return 0;
                        }

                        if (files) {
                            for (const file of files) {
                                // Si es una carpeta, listar recursivamente
                                if (!file.id) {
                                    const subPath = path ? `${path}/${file.name}` : file.name;
                                    totalBytes += await listFilesRecursive(subPath);
                                } else {
                                    // Es un archivo, obtener su tamaño
                                    const filePath = path ? `${path}/${file.name}` : file.name;
                                    const { data: fileInfo } = await supabaseAdmin.storage
                                        .from(BUCKET_NAME)
                                        .list(filePath, {
                                            limit: 1
                                        });

                                    if (fileInfo && fileInfo[0]?.metadata?.size) {
                                        totalBytes += parseInt(fileInfo[0].metadata.size, 10);
                                    } else if (file.metadata?.size) {
                                        totalBytes += parseInt(file.metadata.size, 10);
                                    }
                                }
                            }
                        }

                        return totalBytes;
                    };

                    totalContactosAvatarsBytes = await listFilesRecursive(contactosAvatarsPath);
                }
            } catch (error) {
                console.error('Error calculando storage de avatares de contactos:', error);
                // No fallar el cálculo completo si hay error aquí
            }
        }

        console.log('🔍 calculateStorageCompleto: Total contactos avatars bytes:', totalContactosAvatarsBytes);

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
        const totalBytes = totalCategoryBytes + totalItemBytes + totalPostsBytes + totalPortfoliosBytes + totalPaquetesBytes + totalOffersBytes + totalContactosAvatarsBytes;

        // Actualizar studio_storage_usage
        await prisma.studio_storage_usage.upsert({
            where: { studio_id: studio.id },
            create: {
                studio_id: studio.id,
                total_storage_bytes: BigInt(totalBytes),
                category_media_bytes: BigInt(totalCategoryBytes),
                item_media_bytes: BigInt(totalItemBytes),
                section_media_bytes: BigInt(0),
                portfolio_media_bytes: BigInt(totalPortfoliosBytes),
                page_media_bytes: BigInt(0),
                quota_limit_bytes: BigInt(10 * 1024 * 1024 * 1024), // 10GB default
            },
            update: {
                total_storage_bytes: BigInt(totalBytes),
                category_media_bytes: BigInt(totalCategoryBytes),
                item_media_bytes: BigInt(totalItemBytes),
                portfolio_media_bytes: BigInt(totalPortfoliosBytes),
                page_media_bytes: BigInt(totalPaquetesBytes), // Usamos page_media_bytes temporalmente para paquetes
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
                portfoliosGlobalBytes: totalPortfoliosBytes,
                paquetesGlobalBytes: totalPaquetesBytes,
                offersGlobalBytes: totalOffersBytes,
                contactosAvatarsBytes: totalContactosAvatarsBytes,
            },
        };
    } catch (error) {
        console.error("Error calculando storage:", error);
        return { success: false, error: "Error al calcular almacenamiento" };
    }
}
