"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { AuthorizeEventAfterContractSchema } from "@/lib/actions/schemas/client-contract-schemas";
import { revalidatePath } from "next/cache";
import { normalizePaymentDate } from "@/lib/actions/utils/payment-date";
import { incrementBalanceForIngreso } from "@/lib/actions/studio/business/finanzas/finanzas.actions";

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

    // Registrar pago si se proporcionó (obligatorio método de pago para afectar balance)
    if (validated.register_payment && validated.payment_amount) {
      if (!validated.payment_method_id) {
        return { success: false, error: "Debes seleccionar a qué cuenta entra el dinero (Efectivo o cuenta bancaria)" };
      }
      const metodo = await prisma.studio_metodos_pago.findFirst({
        where: { id: validated.payment_method_id, studio_id: studio.id },
        select: { id: true, payment_method_name: true },
      });
      if (!metodo) {
        return { success: false, error: "Método de pago no encontrado" };
      }
      await prisma.$transaction(async (tx) => {
        await tx.studio_pagos.create({
          data: {
            contact_id: contract.event.contact_id,
            evento_id: contract.event.id,
            promise_id: contract.event.promise_id ?? undefined,
            cotizacion_id: validated.cotizacion_id,
            amount: validated.payment_amount,
            metodo_pago_id: validated.payment_method_id,
            metodo_pago: metodo.payment_method_name,
            concept: "Pago inicial al autorizar evento",
            payment_date: normalizePaymentDate(new Date()),
            status: "completed",
            transaction_type: "ingreso",
            transaction_category: "abono",
          },
        });
        await incrementBalanceForIngreso(tx, studio.id, validated.payment_amount, {
          metodo_pago_id: validated.payment_method_id,
          metodo_pago: metodo.payment_method_name,
        });
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

