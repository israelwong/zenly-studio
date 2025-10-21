"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Esquemas de validación
const MediaItemSchema = z.object({
  id: z.string().optional(),
  itemId: z.string(),
  studioId: z.string(),
  url: z.string().url(),
  fileName: z.string(),
  fileType: z.enum(['image', 'video']),
  size: z.number().positive(),
  order: z.number().int().nonnegative().default(0),
});

const CreateMediaItemSchema = MediaItemSchema.omit({ id: true });
const UpdateMediaItemSchema = MediaItemSchema.partial().required({ id: true });
const DeleteMediaItemSchema = z.object({
  id: z.string(),
  itemId: z.string(),
});

type CreateMediaItemForm = z.infer<typeof CreateMediaItemSchema>;
type UpdateMediaItemForm = z.infer<typeof UpdateMediaItemSchema>;
type DeleteMediaItemForm = z.infer<typeof DeleteMediaItemSchema>;

/**
 * Obtiene todos los archivos multimedia de un item
 */
export async function obtenerMediaItem(itemId: string) {
  try {
    const media = await prisma.studio_item_media.findMany({
      where: { item_id: itemId },
      orderBy: { display_order: 'asc' },
    });

    return {
      success: true,
      data: media,
    };
  } catch (error) {
    console.error(`Error obteniendo media para item ${itemId}:`, error);
    return {
      success: false,
      error: "Error al obtener archivos multimedia",
    };
  }
}

/**
 * Crea un nuevo archivo multimedia para un item
 * El primer archivo automáticamente es portada (display_order=0)
 */
export async function crearMediaItem(data: CreateMediaItemForm) {
  try {
    const validatedData = CreateMediaItemSchema.parse(data);

    // Obtener studio_id por slug
    const studio = await prisma.studios.findUnique({
      where: { slug: validatedData.studioId },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: `Studio "${validatedData.studioId}" no encontrado`,
      };
    }

    // Contar archivos existentes
    const existingCount = await prisma.studio_item_media.count({
      where: { item_id: validatedData.itemId },
    });

    // El primer archivo es portada (display_order=0), los demás se incrementan
    const displayOrder = existingCount === 0 ? 0 : existingCount;

    const media = await prisma.studio_item_media.create({
      data: {
        item_id: validatedData.itemId,
        studio_id: studio.id,
        file_url: validatedData.url,
        filename: validatedData.fileName,
        file_type: validatedData.fileType.toUpperCase(),
        storage_bytes: BigInt(validatedData.size),
        mime_type: validatedData.mimeType || "application/octet-stream",
        display_order: displayOrder,
      },
    });

    revalidatePath("/studio/[slug]/builder/catalogo", "layout");

    return {
      success: true,
      data: media,
    };
  } catch (error) {
    console.error("Error creando media para item:", error);
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validación fallida: ${error.errors?.[0]?.message || error.message || 'Error de validación'}`
        : error instanceof Error 
          ? error.message 
          : "Error al crear archivo multimedia",
    };
  }
}

/**
 * Actualiza el orden de archivos multimedia (para reordenamiento)
 */
export async function reordenarMediaItem(
  itemId: string,
  mediaIds: string[]
) {
  try {
    // Validar que todos los IDs pertenecen al item
    const existingMedia = await prisma.studio_item_media.findMany({
      where: { item_id: itemId },
      select: { id: true },
    });

    const existingIds = new Set(existingMedia.map(m => m.id));
    const invalidIds = mediaIds.filter(id => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return {
        success: false,
        error: "Algunos archivos no pertenecen a este item",
      };
    }

    // Actualizar orden
    await Promise.all(
      mediaIds.map((id, index) =>
        prisma.studio_item_media.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath("/studio/[slug]/builder/catalogo", "layout");

    return { success: true };
  } catch (error) {
    console.error("Error reordenando media:", error);
    return {
      success: false,
      error: "Error al reordenar archivos",
    };
  }
}

/**
 * Elimina un archivo multimedia del item
 */
export async function eliminarMediaItem(data: DeleteMediaItemForm) {
  try {
    const validatedData = DeleteMediaItemSchema.parse(data);

    // Verificar que el archivo pertenece al item
    const media = await prisma.studio_item_media.findFirst({
      where: {
        id: validatedData.id,
        item_id: validatedData.itemId,
      },
    });

    if (!media) {
      return {
        success: false,
        error: "Archivo no encontrado",
      };
    }

    await prisma.studio_item_media.delete({
      where: { id: validatedData.id },
    });

    revalidatePath("/studio/[slug]/builder/catalogo", "layout");

    return { success: true };
  } catch (error) {
    console.error("Error eliminando media:", error);
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validación fallida: ${error.errors?.[0]?.message || error.message || 'Error de validación'}`
        : error instanceof Error 
          ? error.message 
          : "Error al eliminar archivo",
    };
  }
}

/**
 * Obtiene el total de almacenamiento usado por media de un item
 */
export async function obtenerTamanioMediaItem(itemId: string) {
  try {
    const result = await prisma.studio_item_media.aggregate({
      where: { item_id: itemId },
      _sum: { file_size: true },
    });

    const totalSize = result._sum.file_size ?? 0;

    return {
      success: true,
      totalSize,
      formatted: formatBytes(totalSize),
    };
  } catch (error) {
    console.error("Error calculando tamaño de media:", error);
    return {
      success: false,
      error: "Error al calcular almacenamiento",
    };
  }
}

// Helper para formatear bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
