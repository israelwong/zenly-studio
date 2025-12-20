"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Esquemas de validación
const SeccionPortadaSchema = z.object({
  sectionId: z.string(),
  studioId: z.string(),
  url: z.string().url(),
  fileName: z.string(),
  size: z.number().positive(),
  mimeType: z.string().optional(),
});

const DeleteSeccionPortadaSchema = z.object({
  sectionId: z.string(),
});

type CreateSeccionPortadaForm = z.infer<typeof SeccionPortadaSchema>;
type DeleteSeccionPortadaForm = z.infer<typeof DeleteSeccionPortadaSchema>;

/**
 * Obtiene la portada de una sección (primer archivo con order=0)
 */
export async function obtenerPortadaSeccion(sectionId: string) {
  try {
    const portada = await prisma.studio_section_media.findFirst({
      where: { 
        section_id: sectionId,
        order: 0 
      },
    });

    return {
      success: true,
      data: portada,
    };
  } catch (error) {
    console.error(`Error obteniendo portada para sección ${sectionId}:`, error);
    return {
      success: false,
      error: "Error al obtener portada",
    };
  }
}

/**
 * Crea la portada de una sección (reemplaza la anterior si existe)
 * Automáticamente se asigna display_order=0
 */
export async function crearPortadaSeccion(data: CreateSeccionPortadaForm) {
  try {
    const validatedData = SeccionPortadaSchema.parse(data);

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

    // Eliminar portada anterior si existe (display_order=0)
    await prisma.studio_section_media.deleteMany({
      where: { 
        section_id: validatedData.sectionId,
        display_order: 0 
      },
    });

    // Crear nueva portada con display_order=0
    const portada = await prisma.studio_section_media.create({
      data: {
        section_id: validatedData.sectionId,
        studio_id: studio.id,
        file_url: validatedData.url,
        filename: validatedData.fileName,
        file_type: 'IMAGE',
        storage_bytes: BigInt(validatedData.size),
        mime_type: validatedData.mimeType || "image/jpeg",
        display_order: 0,
      },
    });

    revalidatePath("/studio/[slug]/commercial/catalogo", "layout");

    return {
      success: true,
      data: portada,
    };
  } catch (error) {
    console.error("Error creando portada para sección:", error);
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validación fallida: ${error.errors?.[0]?.message || error.message || 'Error de validación'}`
        : "Error al crear portada",
    };
  }
}

/**
 * Elimina la portada de una sección (elimina el archivo con display_order=0)
 */
export async function eliminarPortadaSeccion(data: DeleteSeccionPortadaForm) {
  try {
    const validatedData = DeleteSeccionPortadaSchema.parse(data);

    await prisma.studio_section_media.deleteMany({
      where: { 
        section_id: validatedData.sectionId,
        display_order: 0 
      },
    });

    revalidatePath("/studio/[slug]/commercial/catalogo", "layout");

    return { success: true };
  } catch (error) {
    console.error("Error eliminando portada:", error);
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validación fallida: ${error.errors?.[0]?.message || error.message || 'Error de validación'}`
        : "Error al eliminar portada",
    };
  }
}
