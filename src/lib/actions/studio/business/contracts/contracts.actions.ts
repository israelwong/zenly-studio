"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { EventContract } from "@/types/contracts";
import {
  GenerateEventContractSchema,
  UpdateEventContractSchema,
} from "@/lib/actions/schemas/contracts-schemas";
import { revalidatePath } from "next/cache";
import { getEventContractData, renderContractContent } from "./renderer.actions";
import { getDefaultContractTemplate } from "./templates.actions";

// Obtener contrato del evento
export async function getEventContract(
  studioSlug: string,
  eventId: string
): Promise<ActionResponse<EventContract>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const contract = await prisma.studio_event_contracts.findFirst({
      where: {
        event_id: eventId,
        studio_id: studio.id,
      },
    });

    if (!contract) {
      return { success: false, error: "No hay contrato para este evento" };
    }

    return { success: true, data: contract as EventContract };
  } catch (error) {
    console.error("Error al obtener contrato:", error);
    return { success: false, error: "Error al obtener contrato" };
  }
}

// Generar contrato desde plantilla
export async function generateEventContract(
  studioSlug: string,
  data: unknown,
  userId?: string
): Promise<ActionResponse<EventContract>> {
  try {
    const validated = GenerateEventContractSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Verificar que el evento existe y no tiene contrato
    const event = await prisma.studio_events.findFirst({
      where: {
        id: validated.event_id,
        studio_id: studio.id,
      },
      include: {
        event_type: true,
        cotizacion: true,
      },
    });

    if (!event) {
      return { success: false, error: "Evento no encontrado" };
    }

    // Verificar que tiene cotización autorizada
    if (!event.cotizacion) {
      return {
        success: false,
        error: "El evento debe tener una cotización autorizada para generar el contrato",
      };
    }

    // Verificar si ya tiene contrato
    const existingContract = await prisma.studio_event_contracts.findUnique({
      where: { event_id: validated.event_id },
    });

    if (existingContract) {
      return { success: false, error: "Este evento ya tiene un contrato generado" };
    }

    // Obtener plantilla (específica o por defecto)
    let template;
    if (validated.template_id) {
      const templateResult = await prisma.studio_contract_templates.findFirst({
        where: {
          id: validated.template_id,
          studio_id: studio.id,
          is_active: true,
        },
      });

      if (!templateResult) {
        return { success: false, error: "Plantilla no encontrada o inactiva" };
      }

      template = templateResult;
    } else {
      const defaultResult = await getDefaultContractTemplate(
        studioSlug,
        event.event_type_id || undefined
      );

      if (!defaultResult.success || !defaultResult.data) {
        return { success: false, error: defaultResult.error || "No hay plantilla por defecto" };
      }

      template = defaultResult.data;
    }

    // Obtener datos del evento
    const eventDataResult = await getEventContractData(studioSlug, validated.event_id);

    if (!eventDataResult.success || !eventDataResult.data) {
      return { success: false, error: eventDataResult.error || "Error al obtener datos del evento" };
    }

    // Renderizar contenido
    const renderResult = await renderContractContent(template.content, eventDataResult.data);

    if (!renderResult.success || !renderResult.data) {
      return { success: false, error: renderResult.error || "Error al renderizar contrato" };
    }

    // Crear contrato
    const contract = await prisma.studio_event_contracts.create({
      data: {
        studio_id: studio.id,
        event_id: validated.event_id,
        template_id: template.id,
        content: renderResult.data,
        status: "draft",
        created_by: userId,
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${validated.event_id}`);
    revalidatePath(`/${studioSlug}/studio/business/events/${validated.event_id}/contrato`);

    return { success: true, data: contract as EventContract };
  } catch (error) {
    console.error("Error al generar contrato:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al generar contrato" };
  }
}

// Actualizar contrato
export async function updateEventContract(
  studioSlug: string,
  contractId: string,
  data: unknown,
  userId?: string
): Promise<ActionResponse<EventContract>> {
  try {
    const validated = UpdateEventContractSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Verificar que el contrato existe
    const contract = await prisma.studio_event_contracts.findFirst({
      where: {
        id: contractId,
        studio_id: studio.id,
      },
      include: {
        template: true,
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Actualizar contrato
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        content: validated.content,
        ...(validated.status && { status: validated.status }),
        version: contract.version + 1,
      },
    });

    // Si se solicita actualizar la plantilla
    if (validated.update_template && contract.template_id) {
      await prisma.studio_contract_templates.update({
        where: { id: contract.template_id },
        data: {
          content: validated.content,
          version: contract.template!.version + 1,
        },
      });

      revalidatePath(`/${studioSlug}/studio/contratos`);
      revalidatePath(`/${studioSlug}/studio/contratos/${contract.template_id}/editar`);
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);
    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}/contrato`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al actualizar contrato:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar contrato" };
  }
}

// Eliminar contrato
export async function deleteEventContract(
  studioSlug: string,
  contractId: string
): Promise<ActionResponse<void>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const contract = await prisma.studio_event_contracts.findFirst({
      where: {
        id: contractId,
        studio_id: studio.id,
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    await prisma.studio_event_contracts.delete({
      where: { id: contractId },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar contrato:", error);
    return { success: false, error: "Error al eliminar contrato" };
  }
}

// Regenerar contrato con datos actualizados
export async function regenerateEventContract(
  studioSlug: string,
  eventId: string
): Promise<ActionResponse<EventContract>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Obtener contrato actual
    const contract = await prisma.studio_event_contracts.findFirst({
      where: {
        event_id: eventId,
        studio_id: studio.id,
      },
      include: {
        template: true,
      },
    });

    if (!contract) {
      return { success: false, error: "No hay contrato para este evento" };
    }

    if (!contract.template) {
      return { success: false, error: "El contrato no tiene plantilla asociada" };
    }

    // Obtener datos actualizados del evento
    const eventDataResult = await getEventContractData(studioSlug, eventId);

    if (!eventDataResult.success || !eventDataResult.data) {
      return { success: false, error: eventDataResult.error || "Error al obtener datos del evento" };
    }

    // Renderizar con plantilla
    const renderResult = await renderContractContent(contract.template.content, eventDataResult.data);

    if (!renderResult.success || !renderResult.data) {
      return { success: false, error: renderResult.error || "Error al renderizar contrato" };
    }

    // Actualizar contrato
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contract.id },
      data: {
        content: renderResult.data,
        version: contract.version + 1,
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/contrato`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al regenerar contrato:", error);
    return { success: false, error: "Error al regenerar contrato" };
  }
}
