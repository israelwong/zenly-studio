"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { createStudioNotification } from "@/lib/notifications/studio/studio-notification.service";
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from "@/lib/notifications/studio/types";
import { z } from "zod";

const SignPublicContractSchema = z.object({
  ip_address: z.string(),
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

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true, studio_name: true },
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
          include: {
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

    // Guardar fecha de firma en cotizacion_cierre
    // Usar fecha de hoy (fecha de cuando el cliente abre el contrato para revisión y firma)
    await prisma.studio_cotizaciones_cierre.update({
      where: { cotizacion_id: cotizacionId },
      data: {
        contract_signed_at: new Date(),
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
      message: `${cotizacion.promise.contact.name} firmó el contrato de la cotización "${cotizacion.name}"`,
      priority: NotificationPriority.HIGH,
      contact_id: cotizacion.promise.contact.id,
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
    revalidateTag(`public-promise-${studioSlug}-${promiseId}`, 'max');
    revalidateTag(`public-promise-route-state-${studioSlug}-${promiseId}`, 'max');
    revalidateTag(`public-promise-cierre-${studioSlug}-${promiseId}`, 'max');

    return { success: true };
  } catch (error) {
    console.error("[signPublicContract] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al firmar contrato",
    };
  }
}

