"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { APP_CONFIG } from "@/lib/actions/constants/config";
import sharp from "sharp";

interface UploadResult {
    id: string;
    url: string;
    thumbnail_url?: string;
    storage_path: string;
    width?: number;
    height?: number;
    type: "image" | "video";
    display_order: number;
}

// UPLOAD IMAGE
export async function uploadPortfolioImage(
    studioId: string,
    portfolioId: string,
    file: File
): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
        const supabase = await createClient();

        // Validar tamaño
        if (file.size > APP_CONFIG.MAX_IMAGE_SIZE) {
            const maxSizeMB = APP_CONFIG.MAX_IMAGE_SIZE / (1024 * 1024);
            return { success: false, error: `La imagen no debe superar ${maxSizeMB}MB` };
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const imagePath = `studios/${studioId}/portfolios/${portfolioId}/images/${fileName}`;
        const thumbPath = `studios/${studioId}/portfolios/${portfolioId}/thumbnails/${fileName}`;

        // Procesar imagen
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Obtener dimensiones
        const metadata = await sharp(buffer).metadata();
        const { width = 0, height = 0 } = metadata;

        // Optimizar imagen principal (max 1920px)
        const optimized = await sharp(buffer)
            .resize(1920, 1920, {
                fit: "inside",
                withoutEnlargement: true,
            })
            .jpeg({ quality: 92 })
            .toBuffer();

        // Crear thumbnail (400px)
        const thumbnail = await sharp(buffer)
            .resize(400, 400, {
                fit: "cover",
                position: "center",
            })
            .jpeg({ quality: 88 })
            .toBuffer();

        // Upload imagen principal
        const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(imagePath, optimized, {
                contentType: "image/jpeg",
                cacheControl: "31536000",
            });

        if (uploadError) throw uploadError;

        // Upload thumbnail
        const { error: thumbError } = await supabase.storage
            .from("media")
            .upload(thumbPath, thumbnail, {
                contentType: "image/jpeg",
                cacheControl: "31536000",
            });

        if (thumbError) throw thumbError;

        // Obtener URLs públicas
        const { data: imageUrl } = supabase.storage
            .from("media")
            .getPublicUrl(imagePath);

        const { data: thumbUrl } = supabase.storage
            .from("media")
            .getPublicUrl(thumbPath);

        // Obtener el siguiente display_order
        const lastMedia = await prisma.studio_portfolio_media.findFirst({
            where: { portfolio_id: portfolioId },
            orderBy: { display_order: 'desc' },
            select: { display_order: true },
        });
        const nextOrder = (lastMedia?.display_order || 0) + 1;

        // Obtener studio slug para revalidar
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { studio: { select: { slug: true } } },
        });

        // Crear registro en BD
        const mediaRecord = await prisma.studio_portfolio_media.create({
            data: {
                portfolio_id: portfolioId,
                studio_id: studioId,
                file_url: imageUrl.publicUrl,
                file_type: "image",
                filename: file.name,
                storage_bytes: BigInt(optimized.length),
                mime_type: "image/jpeg",
                dimensions: { width, height },
                display_order: nextOrder,
                alt_text: null,
                thumbnail_url: thumbUrl.publicUrl,
                storage_path: imagePath,
            },
        });

        // Revalidar paths
        if (portfolio?.studio.slug) {
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios/${portfolioId}`);
        }

        return {
            success: true,
            data: {
                id: mediaRecord.id,
                url: imageUrl.publicUrl,
                thumbnail_url: thumbUrl.publicUrl,
                storage_path: imagePath,
                width,
                height,
                type: "image",
                display_order: nextOrder,
            },
        };
    } catch (error) {
        console.error("Error uploading image:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al subir imagen",
        };
    }
}

// UPLOAD VIDEO
export async function uploadPortfolioVideo(
    studioId: string,
    portfolioId: string,
    file: File
): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
        const supabase = await createClient();

        // Validar tamaño
        if (file.size > APP_CONFIG.MAX_VIDEO_SIZE) {
            const maxSizeMB = APP_CONFIG.MAX_VIDEO_SIZE / (1024 * 1024);
            return { success: false, error: `El video no debe superar ${maxSizeMB}MB` };
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const videoPath = `studios/${studioId}/portfolios/${portfolioId}/videos/${fileName}`;

        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(videoPath, arrayBuffer, {
                contentType: file.type,
                cacheControl: "31536000",
            });

        if (uploadError) throw uploadError;

        const { data: videoUrl } = supabase.storage
            .from("media")
            .getPublicUrl(videoPath);

        // Obtener el siguiente display_order
        const lastMedia = await prisma.studio_portfolio_media.findFirst({
            where: { portfolio_id: portfolioId },
            orderBy: { display_order: 'desc' },
            select: { display_order: true },
        });
        const nextOrder = (lastMedia?.display_order || 0) + 1;

        // Obtener studio slug para revalidar
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { studio: { select: { slug: true } } },
        });

        // Crear registro en BD
        const mediaRecord = await prisma.studio_portfolio_media.create({
            data: {
                portfolio_id: portfolioId,
                studio_id: studioId,
                file_url: videoUrl.publicUrl,
                file_type: "video",
                filename: file.name,
                storage_bytes: BigInt(file.size),
                mime_type: file.type,
                dimensions: { width: 1920, height: 1080 }, // TODO: Obtener dimensiones reales
                duration_seconds: null, // TODO: Obtener duración real
                display_order: nextOrder,
                alt_text: null,
                thumbnail_url: videoUrl.publicUrl, // TODO: Generar thumbnail
                storage_path: videoPath,
            },
        });

        // Revalidar paths
        if (portfolio?.studio.slug) {
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios/${portfolioId}`);
        }

        return {
            success: true,
            data: {
                id: mediaRecord.id,
                url: videoUrl.publicUrl,
                thumbnail_url: videoUrl.publicUrl, // TODO: Generar thumbnail
                storage_path: videoPath,
                width: 1920,
                height: 1080,
                type: "video",
                display_order: nextOrder,
            },
        };
    } catch (error) {
        console.error("Error uploading video:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al subir video",
        };
    }
}

// DELETE MEDIA
export async function deletePortfolioMedia(mediaId: string) {
    try {
        const supabase = await createClient();

        // Obtener información del media y portfolio para revalidar
        const media = await prisma.studio_portfolio_media.findUnique({
            where: { id: mediaId },
            select: {
                storage_path: true,
                thumbnail_url: true,
                portfolio: {
                    select: {
                        id: true,
                        studio: { select: { slug: true } },
                    },
                },
            },
        });

        if (!media) {
            return { success: false, error: "Media no encontrado" };
        }

        // Eliminar de Supabase Storage
        const pathsToDelete = [media.storage_path];
        if (media.thumbnail_url) {
            // Extraer path del thumbnail si existe
            const thumbPath = media.storage_path.replace('/images/', '/thumbnails/');
            pathsToDelete.push(thumbPath);
        }

        const { error } = await supabase.storage
            .from("media")
            .remove(pathsToDelete);

        if (error) {
            console.warn("Error deleting from storage (continuing):", error);
        }

        // Eliminar registro de BD
        await prisma.studio_portfolio_media.delete({
            where: { id: mediaId },
        });

        // Revalidar paths
        if (media.portfolio.studio.slug) {
            revalidatePath(`/${media.portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${media.portfolio.studio.slug}/profile/edit/content/portfolios/${media.portfolio.id}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting media:", error);
        return { success: false, error: "Error al eliminar archivo" };
    }
}

// REORDER MEDIA
export async function reorderPortfolioMedia(mediaIds: string[]) {
    try {
        // Obtener portfolio para revalidar
        const firstMedia = await prisma.studio_portfolio_media.findFirst({
            where: { id: mediaIds[0] },
            select: {
                portfolio: {
                    select: {
                        id: true,
                        studio: { select: { slug: true } },
                    },
                },
            },
        });

        // Actualizar display_order para cada media
        await Promise.all(
            mediaIds.map((mediaId, index) =>
                prisma.studio_portfolio_media.update({
                    where: { id: mediaId },
                    data: { display_order: index },
                })
            )
        );

        // Revalidar paths
        if (firstMedia?.portfolio.studio.slug) {
            revalidatePath(`/${firstMedia.portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${firstMedia.portfolio.studio.slug}/profile/edit/content/portfolios/${firstMedia.portfolio.id}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error reordering media:", error);
        return { success: false, error: "Error al reordenar archivos" };
    }
}

// UPDATE MEDIA (alt_text, etc.)
export async function updatePortfolioMedia(
    mediaId: string,
    data: { alt_text?: string | null }
) {
    try {
        const media = await prisma.studio_portfolio_media.findUnique({
            where: { id: mediaId },
            select: {
                portfolio: {
                    select: {
                        id: true,
                        studio: { select: { slug: true } },
                    },
                },
            },
        });

        if (!media) {
            return { success: false, error: "Media no encontrado" };
        }

        await prisma.studio_portfolio_media.update({
            where: { id: mediaId },
            data: {
                alt_text: data.alt_text ?? null,
            },
        });

        // Revalidar paths
        if (media.portfolio.studio.slug) {
            revalidatePath(`/${media.portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${media.portfolio.studio.slug}/profile/edit/content/portfolios/${media.portfolio.id}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating media:", error);
        return { success: false, error: "Error al actualizar archivo" };
    }
}

// GET PORTFOLIO MEDIA
export async function getPortfolioMedia(portfolioId: string) {
    try {
        const media = await prisma.studio_portfolio_media.findMany({
            where: { portfolio_id: portfolioId },
            orderBy: { display_order: 'asc' },
        });

        return {
            success: true,
            data: media.map((item) => ({
                id: item.id,
                url: item.file_url,
                thumbnail_url: item.thumbnail_url,
                storage_path: item.storage_path,
                width: (item.dimensions as { width?: number })?.width,
                height: (item.dimensions as { height?: number })?.height,
                type: item.file_type as "image" | "video",
                display_order: item.display_order,
                alt_text: item.alt_text,
            })),
        };
    } catch (error) {
        console.error("Error fetching media:", error);
        return { success: false, error: "Error al obtener archivos" };
    }
}

