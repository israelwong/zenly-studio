"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface StorageUsage {
  id: string;
  studio_id: string;
  total_storage_bytes: bigint;
  section_media_bytes: bigint;
  last_calculated_at: Date;
}

/**
 * Obtiene el uso de almacenamiento de un studio
 */
export async function obtenerStorageUsage(studioId: string) {
  try {
    if (!studioId || studioId === "default") {
      return {
        success: false,
        error: "Studio slug inválido",
        data: null,
      };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioId },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
        data: null,
      };
    }

    const usage = await prisma.studio_storage_usage.findUnique({
      where: { studio_id: studio.id },
    });

    return {
      success: true,
      data: usage || {
        id: "",
        studio_id: studio.id,
        total_storage_bytes: BigInt(0),
        section_media_bytes: BigInt(0),
        last_calculated_at: new Date(),
      },
    };
  } catch (error) {
    console.error("Error obteniendo storage usage:", error);
    return {
      success: false,
      error: "Error al obtener almacenamiento",
      data: null,
    };
  }
}

/**
 * Actualiza el uso de almacenamiento de un studio
 * operation: 'add' para agregar bytes, 'remove' para restar
 */
export async function actualizarStorageUsage(
  studioId: string,
  bytes: number,
  operation: "add" | "remove"
) {
  try {
    if (!studioId || studioId === "default") {
      return {
        success: false,
        error: "Studio slug inválido",
      };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioId },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    const change = operation === "add" ? bytes : -bytes;

    await prisma.studio_storage_usage.upsert({
      where: { studio_id: studio.id },
      create: {
        studio_id: studio.id,
        total_storage_bytes: BigInt(operation === "add" ? bytes : 0),
        section_media_bytes: BigInt(operation === "add" ? bytes : 0),
        category_media_bytes: BigInt(0),
        item_media_bytes: BigInt(0),
        portfolio_media_bytes: BigInt(0),
        page_media_bytes: BigInt(0),
        quota_limit_bytes: BigInt(10737418240), // 10GB default
      },
      update: {
        total_storage_bytes: { increment: BigInt(change) },
        section_media_bytes: { increment: BigInt(change) },
        last_calculated_at: new Date(),
      },
    });

    revalidatePath("/studio/[slug]/commercial/catalogo", "layout");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error actualizando storage usage:", error);
    return {
      success: false,
      error: "Error al actualizar almacenamiento",
    };
  }
}
