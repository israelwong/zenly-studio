"use server";

import { prisma } from "@/lib/prisma";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";
import {
  TrackVisitSchema,
  type TrackVisitData,
} from "@/lib/actions/schemas/offer-schemas";
import type { TrackVisitResponse } from "@/types/offers";
import { headers } from "next/headers";

/**
 * Registrar visita a landing page o leadform
 */
export async function trackOfferVisit(
  data: TrackVisitData
): Promise<TrackVisitResponse> {
  try {
    const validatedData = TrackVisitSchema.parse(data);

    return await retryDatabaseOperation(async () => {
      // Verificar que la oferta existe y está activa
      const offer = await prisma.studio_offers.findUnique({
        where: { id: validatedData.offer_id },
        select: { id: true, is_active: true },
      });

      if (!offer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      if (!offer.is_active) {
        return { success: false, error: "Oferta no está activa" };
      }

      // Obtener información del request
      const headersList = await headers();
      const ipAddress =
        headersList.get("x-forwarded-for")?.split(",")[0] ||
        headersList.get("x-real-ip") ||
        null;
      const userAgent = headersList.get("user-agent") || null;
      const referrer = headersList.get("referer") || validatedData.referrer || null;

      // Generar session_id si no existe (usando cookies o generar uno nuevo)
      let sessionId = validatedData.session_id;
      if (!sessionId) {
        // Intentar obtener de cookie o generar uno nuevo
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Crear registro de visita
      const visit = await prisma.studio_offer_visits.create({
        data: {
          offer_id: validatedData.offer_id,
          visit_type: validatedData.visit_type,
          ip_address: ipAddress,
          user_agent: userAgent,
          referrer: referrer,
          utm_source: validatedData.utm_source || null,
          utm_medium: validatedData.utm_medium || null,
          utm_campaign: validatedData.utm_campaign || null,
          utm_term: validatedData.utm_term || null,
          utm_content: validatedData.utm_content || null,
          session_id: sessionId,
        },
      });

      return { success: true, data: { visit_id: visit.id } };
    });
  } catch (error) {
    console.error("[trackOfferVisit] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al registrar la visita" };
  }
}

/**
 * Obtener visitas de una oferta (para estadísticas)
 */
export async function getOfferVisits(
  offerId: string,
  options?: {
    visit_type?: "landing" | "leadform";
    start_date?: Date;
    end_date?: Date;
  }
) {
  try {
    return await retryDatabaseOperation(async () => {
      const visits = await prisma.studio_offer_visits.findMany({
        where: {
          offer_id: offerId,
          ...(options?.visit_type ? { visit_type: options.visit_type } : {}),
          ...(options?.start_date || options?.end_date
            ? {
              created_at: {
                ...(options.start_date ? { gte: options.start_date } : {}),
                ...(options.end_date ? { lte: options.end_date } : {}),
              },
            }
            : {}),
        },
        orderBy: {
          created_at: "desc",
        },
      });

      return { success: true, data: visits };
    });
  } catch (error) {
    console.error("[getOfferVisits] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al obtener las visitas" };
  }
}
