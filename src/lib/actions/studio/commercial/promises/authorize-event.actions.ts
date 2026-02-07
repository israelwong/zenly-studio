"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { 
  AuthorizeEventAfterContractSchema,
  type AuthorizeEventAfterContractInput
} from "@/lib/actions/schemas/client-contract-schemas";
import { revalidatePath } from "next/cache";
import { normalizePaymentDate } from "@/lib/actions/utils/payment-date";

/**
 * Autorizar evento después de que el cliente firmó el contrato
 * 
 * Flujo:
 * 1. Verificar que el contrato está firmado (SIGNED)
 * 2. Vincular contract_id al evento (studio_events.contract_id)
 * 3. Actualizar status de cotización a "autorizada"
 * 4. Opcionalmente registrar pago inicial
 * 5. Mover evento a etapa "Autorizado"
 */
export async function authorizeEventAfterContract(
  studioSlug: string,
  data: unknown
): Promise<ActionResponse<{ event_id: string }>> {
  try {
    const validated = AuthorizeEventAfterContractSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Verificar que el contrato existe y está firmado
    const contract = await prisma.studio_event_contracts.findFirst({
      where: {
        id: validated.contract_id,
        studio_id: studio.id,
        status: "SIGNED",
      },
      include: {
        event: {
          include: {
            cotizacion: true,
          }
        }
      }
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado o no está firmado" };
    }

    if (!contract.event) {
      return { success: false, error: "El contrato no tiene un evento asociado" };
    }

    // Verificar que la promesa y cotización coinciden
    if (contract.event.promise_id !== validated.promise_id) {
      return { success: false, error: "La promesa no coincide con el evento del contrato" };
    }

    if (contract.event.cotizacion_id !== validated.cotizacion_id) {
      return { success: false, error: "La cotización no coincide con el evento del contrato" };
    }

    // Buscar etapa "Autorizado" en el pipeline de eventos (manager stages)
    const etapaAutorizado = await prisma.studio_manager_pipeline_stages.findFirst({
      where: {
        studio_id: studio.id,
        is_active: true,
        OR: [
          { name: { contains: "autorizado", mode: "insensitive" } },
          { name: { contains: "aprobado", mode: "insensitive" } },
          { order: 2 }
        ]
      },
      orderBy: { order: "asc" }
    });

    if (!etapaAutorizado) {
      return { success: false, error: "No se encontró la etapa de autorización" };
    }

    // Actualizar evento con contract_id y mover a etapa autorizado
    await prisma.studio_events.update({
      where: { id: contract.event.id },
      data: {
        contract_id: validated.contract_id,
        stage_id: etapaAutorizado.id,
      },
    });

    // Actualizar status de cotización a "autorizada"
    await prisma.studio_cotizaciones.update({
      where: { id: validated.cotizacion_id },
      data: { status: "autorizada" },
    });

    // Registrar pago si se proporcionó
    if (validated.register_payment && validated.payment_amount && validated.payment_method_id) {
      await prisma.studio_pagos.create({
        data: {
          studio_id: studio.id,
          contact_id: contract.event.contact_id,
          event_id: contract.event.id,
          amount: validated.payment_amount,
          payment_method_id: validated.payment_method_id,
          payment_date: normalizePaymentDate(new Date()),
          status: "completed",
          notes: "Pago inicial registrado al autorizar evento",
        },
      });
    }

    // Revalidar rutas
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${validated.promise_id}`);
    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event.id}`);

    return { 
      success: true, 
      data: { 
        event_id: contract.event.id 
      } 
    };
  } catch (error) {
    console.error("Error al autorizar evento:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al autorizar evento" };
  }
}

