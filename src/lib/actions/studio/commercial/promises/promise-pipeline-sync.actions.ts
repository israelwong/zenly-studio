"use server";

import { prisma } from "@/lib/prisma";
import { logPromiseStatusChange } from "./promise-status-history.actions";

export async function syncPromisePipelineStageFromQuotes(
  promiseId: string,
  studioId: string,
  userId?: string | null
): Promise<void> {
  try {
    const promise = await prisma.studio_promises.findUnique({
      where: { id: promiseId },
      include: {
        quotes: {
          where: { archived: false },
          select: { status: true, selected_by_prospect: true },
        },
        pipeline_stage: {
          select: { id: true, slug: true },
        },
      },
    });

    if (!promise) return;

    // Determinar stage según cotizaciones
    const hasAuthorized = promise.quotes.some((q) =>
      [
        "aprobada",
        "autorizada",
        "approved",
        "contract_pending",
        "contract_generated",
        "contract_signed",
      ].includes(q.status)
    );
    const hasNegotiation = promise.quotes.some(
      (q) => q.status === "negociacion" && !q.selected_by_prospect
    );
    const hasClosing = promise.quotes.some(
      (q) => q.status === "en_cierre" && q.selected_by_prospect === true
    );
    const allCanceled =
      promise.quotes.length > 0 &&
      promise.quotes.every((q) => q.status === "cancelada");

    let targetStageSlug: string;
    if (hasAuthorized) {
      targetStageSlug = "approved";
    } else if (hasClosing) {
      targetStageSlug = "closing"; // Fallback a 'negotiation' si no existe
    } else if (hasNegotiation) {
      targetStageSlug = "negotiation";
    } else if (allCanceled) {
      targetStageSlug = "canceled"; // Fallback a 'pending' si no existe
    } else {
      targetStageSlug = "pending";
    }

    // Obtener stage (con fallback si no existe)
    let stage = await prisma.studio_promise_pipeline_stages.findFirst({
      where: {
        studio_id: studioId,
        slug: targetStageSlug,
        is_active: true,
      },
    });

    // Fallbacks si no existe el stage
    if (!stage) {
      if (targetStageSlug === "closing") {
        stage = await prisma.studio_promise_pipeline_stages.findFirst({
          where: { studio_id: studioId, slug: "negotiation", is_active: true },
        });
      } else if (targetStageSlug === "canceled") {
        stage = await prisma.studio_promise_pipeline_stages.findFirst({
          where: { studio_id: studioId, slug: "pending", is_active: true },
        });
      }
    }

    if (!stage) {
      console.warn(
        `[PIPELINE_SYNC] No se encontró stage para slug: ${targetStageSlug}`
      );
      return;
    }

    // Solo actualizar si cambió
    if (promise.pipeline_stage_id !== stage.id) {
      await prisma.studio_promises.update({
        where: { id: promiseId },
        data: { pipeline_stage_id: stage.id },
      });

      // Registrar en historial
      await logPromiseStatusChange({
        promiseId,
        fromStageId: promise.pipeline_stage_id,
        toStageId: stage.id,
        fromStageSlug: promise.pipeline_stage?.slug || null,
        toStageSlug: stage.slug,
        userId,
        reason: "Sincronización automática desde cotizaciones",
        metadata: {
          trigger: "quote_status_change",
          quotes_status: promise.quotes.map((q) => ({
            status: q.status,
            selected_by_prospect: q.selected_by_prospect,
          })),
        },
      });
    }
  } catch (error) {
    console.error("[PIPELINE_SYNC] Error sincronizando pipeline:", error);
    // No fallar si la sincronización falla
  }
}
