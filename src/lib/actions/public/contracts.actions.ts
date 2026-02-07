"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from "@/lib/notifications/studio/types";
import { z } from "zod";
import { parseDateOnlyToUtc, dateToDateOnlyString } from "@/lib/utils/date-only";

const SignPublicContractSchema = z.object({
  ip_address: z.string(),
  /** Fecha local del cliente al firmar (YYYY-MM-DD). Se guarda como día legal para evitar desfase por timezone. */
  signature_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * Firmar contrato desde flujo público (sin autenticación)
 *
 * La vista /promise/[slug]/[promiseId]/cierre muestra contrato cuando hay cotización en cierre con contrato.
 * Puede ser por flujo prospecto (selected_by_prospect) o por pase manual del estudio; en ambos casos se permite firma.
 */
export async function signPublicContract(
  studioSlug: string,
  promiseId: string,
  cotizacionId: string,
  data: unknown
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const validated = SignPublicContractSchema.parse(data);

    // Obtener studio (incl. default de firma para validar toggle)
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        promise_share_default_auto_generate_contract: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Verificar que la cotización existe y está en cierre (prospecto o estudio); si la vista muestra contrato, se permite firma
    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        promise_id: promiseId,
        studio_id: studio.id,
        status: { in: ['contract_generated', 'en_cierre', 'cierre'] },
      },
      include: {
        promise: {
          select: {
            share_auto_generate_contract: true,
            contact: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        cotizacion_cierre: {
          select: {
            contrato_definido: true,
            contract_content: true,
            contract_signed_at: true,
          },
        },
      },
    });

    if (!cotizacion) {
      const exists = await prisma.studio_cotizaciones.findFirst({
        where: { id: cotizacionId, promise_id: promiseId, studio_id: studio.id },
        select: { status: true },
      });
      if (exists && !['contract_generated', 'en_cierre', 'cierre'].includes(exists.status)) {
        return { success: false, error: "La cotización no está en estado de cierre para firma" };
      }
      return { success: false, error: "Cotización no encontrada o no disponible para firma" };
    }

    if (!cotizacion.cotizacion_cierre?.contrato_definido) {
      return { success: false, error: "El contrato aún no está disponible para firma" };
    }

    // Verificar si ya fue firmado (en la tabla temporal)
    if (cotizacion.cotizacion_cierre?.contract_signed_at) {
      return { success: false, error: "El contrato ya ha sido firmado" };
    }

    const promise = cotizacion.promise;
    if (!promise) {
      return { success: false, error: "Promesa no encontrada" };
    }

    // Espejo comercial: rechazar firma si el estudio tiene desactivado el toggle de firma
    const allowSignature =
      promise.share_auto_generate_contract ??
      studio.promise_share_default_auto_generate_contract;
    if (!allowSignature) {
      return {
        success: false,
        error: "La firma de contrato no está habilitada para esta promesa",
      };
    }

    // Fecha de firma: día calendario (date-only UTC) para que se muestre el día que el cliente firmó, sin desfase por timezone.
    // Si el cliente envía signature_date (YYYY-MM-DD), validar que sea hoy o ayer UTC y guardar ese día a mediodía UTC.
    const now = new Date();
    const todayUtc = dateToDateOnlyString(now) ?? "";
    const yesterdayUtc = (() => {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 1);
      return dateToDateOnlyString(d) ?? "";
    })();
    let signedAt: Date;
    if (validated.signature_date) {
      if (validated.signature_date !== todayUtc && validated.signature_date !== yesterdayUtc) {
        return { success: false, error: "Fecha de firma no válida" };
      }
      const parsed = parseDateOnlyToUtc(validated.signature_date);
      if (!parsed) {
        return { success: false, error: "Fecha de firma no válida" };
      }
      signedAt = parsed;
    } else {
      // Fallback: "hoy" en UTC como date-only (mediodía UTC) para no depender del instante
      signedAt = parseDateOnlyToUtc(todayUtc) ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
    }

    await prisma.studio_cotizaciones_cierre.update({
      where: { cotizacion_id: cotizacionId },
      data: {
        contract_signed_at: signedAt,
      },
    });

    // IMPORTANTE: Mantener status en 'en_cierre' porque aún falta el pago y autorización
    // El estado 'contract_signed' se usará cuando se autorice y cree el evento
    // Por ahora solo actualizamos updated_at para trigger realtime
    await prisma.studio_cotizaciones.update({
      where: { id: cotizacionId },
      data: {
        updated_at: new Date(),
      },
    });

    // Notificación al estudio (trigger para UI/centro de notificaciones; Realtime se dispara por trigger DB en studio_cotizaciones_cierre)
    await createStudioNotification({
      scope: StudioNotificationScope.STUDIO,
      studio_id: studio.id,
      type: StudioNotificationType.CONTRACT_SIGNED,
      title: "Contrato firmado por el cliente",
      message: `${promise.contact.name} firmó el contrato de la cotización "${cotizacion.name}"`,
      priority: NotificationPriority.HIGH,
      contact_id: promise.contact.id,
      promise_id: promiseId,
      quote_id: cotizacionId,
      route: '/{slug}/studio/commercial/promises/{promise_id}',
      route_params: {
        slug: studioSlug,
        promise_id: promiseId,
      },
      metadata: {
        cotizacion_id: cotizacionId,
        cotizacion_name: cotizacion.name,
        action_type: "contract_signed_by_prospect",
        signed_ip: validated.ip_address,
      },
    });

    // Agregar log a la promesa
    await prisma.studio_promise_logs.create({
      data: {
        promise_id: promiseId,
        user_id: null,
        content: `Cliente firmó el contrato de la cotización: "${cotizacion.name}"`,
        log_type: "system",
        origin_context: "PROMISE",
        metadata: {
          action: "contract_signed_by_prospect",
          cotizacion_id: cotizacionId,
          cotizacion_name: cotizacion.name,
          signed_ip: validated.ip_address,
        },
      },
    });

    revalidatePath(`/${studioSlug}/promise/${promiseId}`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    
    // ⚠️ TAREA 4: Invalidación granular de caché
    revalidateTag(`public-promise-${studioSlug}-${promiseId}`);
    revalidateTag(`public-promise-route-state-${studioSlug}-${promiseId}`);
    revalidateTag(`public-promise-cierre-${studioSlug}-${promiseId}`);

    return { success: true };
  } catch (error) {
    console.error("[signPublicContract] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al firmar contrato",
    };
  }
}

