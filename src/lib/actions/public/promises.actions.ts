"use server";

import { prisma } from "@/lib/prisma";

/**
 * Obtener datos de promesa para preview público
 * Valida que la promesa pertenezca al studio del slug
 * Solo expone datos necesarios para la vista pública
 */
export async function getPublicPromisePreview(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise_id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    event_type_name: string | null;
    interested_dates: string[] | null;
    acquisition_channel_name: string | null;
    social_network_name: string | null;
    referrer_name: string | null;
  };
  error?: string;
}> {
  try {
    // 1. Validar que el studio existe
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

    // 2. Obtener la promesa y validar que pertenece al studio
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id, // Validación crítica de seguridad
      },
      include: {
        contact: {
          select: {
            name: true,
            phone: true,
            email: true,
            acquisition_channel: {
              select: {
                name: true,
              },
            },
            social_network: {
              select: {
                name: true,
              },
            },
            referrer_name: true,
          },
        },
        event_type: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada o no tienes acceso",
      };
    }

    // 3. Retornar solo datos necesarios para el preview público
    return {
      success: true,
      data: {
        promise_id: promise.id,
        contact_name: promise.contact.name,
        contact_phone: promise.contact.phone,
        contact_email: promise.contact.email,
        event_type_name: promise.event_type?.name || null,
        interested_dates: promise.tentative_dates
          ? (promise.tentative_dates as string[])
          : null,
        acquisition_channel_name: promise.contact.acquisition_channel?.name || null,
        social_network_name: promise.contact.social_network?.name || null,
        referrer_name: promise.contact.referrer_name || null,
      },
    };
  } catch (error) {
    console.error("[getPublicPromisePreview] Error:", error);
    return {
      success: false,
      error: "Error al obtener promesa",
    };
  }
}

