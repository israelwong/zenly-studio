"use server";

import { prisma } from "@/lib/prisma";

export interface LogStatusChangeParams {
  promiseId: string;
  fromStageId: string | null;
  toStageId: string;
  fromStageSlug?: string | null;
  toStageSlug: string;
  userId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logPromiseStatusChange(
  params: LogStatusChangeParams
): Promise<void> {
  try {
    await prisma.studio_promise_status_history.create({
      data: {
        promise_id: params.promiseId,
        from_stage_id: params.fromStageId,
        to_stage_id: params.toStageId,
        from_stage_slug: params.fromStageSlug || null,
        to_stage_slug: params.toStageSlug,
        user_id: params.userId || null,
        reason: params.reason || null,
        metadata: params.metadata || null,
      },
    });
  } catch (error) {
    console.error("[PROMISE_STATUS_HISTORY] Error registrando cambio:", error);
    // No fallar si el log falla, solo registrar error
  }
}
