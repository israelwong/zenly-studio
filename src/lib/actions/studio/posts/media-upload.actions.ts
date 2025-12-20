"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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
export async function uploadPostImage(
    studioId: string,
    postId: string,
    file: File
): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
        const supabase = await createClient();

        // Validar tamaño (max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return { success: false, error: "La imagen no debe superar 5MB" };
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const imagePath = `studios/${studioId}/posts/${postId}/images/${fileName}`;
        const thumbPath = `studios/${studioId}/posts/${postId}/thumbnails/${fileName}`;

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
        const lastMedia = await prisma.studio_post_media.findFirst({
            where: { post_id: postId },
            orderBy: { display_order: 'desc' },
            select: { display_order: true },
        });
        const nextOrder = (lastMedia?.display_order || 0) + 1;

        // Crear registro en BD
        const mediaRecord = await prisma.studio_post_media.create({
            data: {
                post_id: postId,
                studio_id: studioId,
                file_url: imageUrl.publicUrl,
                file_type: "image",
                filename: file.name,
                storage_bytes: BigInt(optimized.length),
                mime_type: "image/jpeg",
                dimensions: { width, height },
                display_order: nextOrder,
                thumbnail_url: thumbUrl.publicUrl,
                storage_path: imagePath,
            },
        });

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
export async function uploadPostVideo(
    studioId: string,
    postId: string,
    file: File
): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
        const supabase = await createClient();

        // Validar tamaño (max 100MB)
        const MAX_SIZE = 100 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return { success: false, error: "El video no debe superar 100MB" };
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const videoPath = `studios/${studioId}/posts/${postId}/videos/${fileName}`;

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
        const lastMedia = await prisma.studio_post_media.findFirst({
            where: { post_id: postId },
            orderBy: { display_order: 'desc' },
            select: { display_order: true },
        });
        const nextOrder = (lastMedia?.display_order || 0) + 1;

        // Crear registro en BD
        const mediaRecord = await prisma.studio_post_media.create({
            data: {
                post_id: postId,
                studio_id: studioId,
                file_url: videoUrl.publicUrl,
                file_type: "video",
                filename: file.name,
                storage_bytes: BigInt(file.size),
                mime_type: file.type,
                dimensions: { width: 1920, height: 1080 }, // TODO: Obtener dimensiones reales
                display_order: nextOrder,
                thumbnail_url: videoUrl.publicUrl, // TODO: Generar thumbnail
                storage_path: videoPath,
            },
        });

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
export async function deletePostMedia(mediaId: string) {
    try {
        const supabase = await createClient();

        // Obtener información del media
        const media = await prisma.studio_post_media.findUnique({
            where: { id: mediaId },
            select: { storage_path: true, thumbnail_url: true },
        });

        if (!media) {
            return { success: false, error: "Media no encontrado" };
        }

        // Eliminar de Supabase Storage
        const { error } = await supabase.storage
            .from("media")
            .remove([media.storage_path]);

        if (error) throw error;

        // Eliminar registro de BD
        await prisma.studio_post_media.delete({
            where: { id: mediaId },
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting media:", error);
        return { success: false, error: "Error al eliminar archivo" };
    }
}

// REORDER MEDIA
export async function reorderPostMedia(mediaIds: string[]) {
    try {
        // Actualizar display_order para cada media
        await Promise.all(
            mediaIds.map((mediaId, index) =>
                prisma.studio_post_media.update({
                    where: { id: mediaId },
                    data: { display_order: index + 1 },
                })
            )
        );

        return { success: true };
    } catch (error) {
        console.error("Error reordering media:", error);
        return { success: false, error: "Error al reordenar archivos" };
    }
}
