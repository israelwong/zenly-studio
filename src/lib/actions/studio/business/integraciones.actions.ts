"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const TrackingSchema = z.object({
  gtm_id: z.string().nullable(),
  facebook_pixel_id: z.string().nullable(),
});

type TrackingData = z.infer<typeof TrackingSchema>;

/**
 * Actualizar configuración de tracking (GTM + Meta Pixel)
 */
export async function actualizarTracking(
  studioSlug: string,
  data: TrackingData
) {
  try {
    // Validar datos
    const validatedData = TrackingSchema.parse(data);

    // Validar formato de GTM ID si existe
    if (validatedData.gtm_id && !validatedData.gtm_id.startsWith("GTM-")) {
      return {
        success: false,
        error: "El GTM ID debe comenzar con 'GTM-'",
      };
    }

    // Validar formato de Facebook Pixel ID si existe
    if (validatedData.facebook_pixel_id) {
      const pixelId = validatedData.facebook_pixel_id.trim();
      if (!/^\d{15,16}$/.test(pixelId)) {
        return {
          success: false,
          error: "El Pixel ID debe ser un número de 15-16 dígitos",
        };
      }
    }

    // Verificar que el studio existe
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Estudio no encontrado",
      };
    }

    // Actualizar
    await prisma.studios.update({
      where: { slug: studioSlug },
      data: {
        gtm_id: validatedData.gtm_id,
        facebook_pixel_id: validatedData.facebook_pixel_id,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("[actualizarTracking] Error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Datos inválidos",
      };
    }

    return {
      success: false,
      error: "Error al actualizar configuración de tracking",
    };
  }
}
