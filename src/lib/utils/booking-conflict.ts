"use server";

import { prisma } from "@/lib/prisma";

/** Normaliza una fecha a solo día (UTC mediodía) para comparar event_date. */
function toDateOnly(d: Date): Date {
  const x = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 12, 0, 0));
}

export interface CheckDateConflictResult {
  /** true si ya se alcanzó el límite de eventos ese día */
  isFull: boolean;
  /** Número de eventos activos ese día */
  currentCount: number;
  /** Límite configurado (studio.max_events_per_day) */
  limit: number;
  /** IDs de eventos que ocupan la fecha (para UI de conflicto) */
  conflictingEventIds: string[];
  /** Promesas con esa fecha que aún no tienen evento (o compiten por el slot) */
  conflictingPromises: Array<{
    id: string;
    event_date: Date | null;
    pipeline_stage_slug: string | null;
  }>;
}

/**
 * Comprueba si hay conflicto de capacidad para una fecha en un estudio.
 * Usado por el Booking Engine y por el "chivato" de conflictos.
 *
 * 1. Cuenta eventos activos (no CANCELLED/ARCHIVED) ese día.
 * 2. Compara con studio.max_events_per_day.
 * 3. Lista promesas con esa event_date que no estén en etapa canceled (posibles "perdedores" o en espera).
 */
export async function checkDateConflict(
  studioId: string,
  date: Date
): Promise<{ success: boolean; data?: CheckDateConflictResult; error?: string }> {
  try {
    const dateOnly = toDateOnly(date);

    const [studio, eventsOnDate, promisesOnDate] = await Promise.all([
      prisma.studios.findUnique({
        where: { id: studioId },
        select: { max_events_per_day: true },
      }),
      prisma.studio_events.findMany({
        where: {
          studio_id: studioId,
          event_date: dateOnly,
          status: { notIn: ["CANCELLED", "ARCHIVED"] },
        },
        select: { id: true },
      }),
      prisma.studio_promises.findMany({
        where: {
          studio_id: studioId,
          event_date: dateOnly,
          pipeline_stage: {
            slug: { not: "canceled" },
            is_active: true,
          },
        },
        select: {
          id: true,
          event_date: true,
          pipeline_stage: { select: { slug: true } },
        },
      }),
    ]);

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const limit = studio.max_events_per_day ?? 1;
    const currentCount = eventsOnDate.length;
    const isFull = currentCount >= limit;

    return {
      success: true,
      data: {
        isFull,
        currentCount,
        limit,
        conflictingEventIds: eventsOnDate.map((e) => e.id),
        conflictingPromises: promisesOnDate.map((p) => ({
          id: p.id,
          event_date: p.event_date,
          pipeline_stage_slug: p.pipeline_stage?.slug ?? null,
        })),
      },
    };
  } catch (error) {
    console.error("[checkDateConflict] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al comprobar conflicto de fecha",
    };
  }
}
