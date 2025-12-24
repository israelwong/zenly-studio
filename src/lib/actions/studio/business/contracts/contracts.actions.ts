"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { EventContract, CancellationLog, ContractVersion, ContractModificationRequest } from "@/types/contracts";
import {
  GenerateEventContractSchema,
  UpdateEventContractSchema,
  RequestContractCancellationSchema,
  UpdateEventContractTemplateSchema,
  RequestContractModificationSchema,
  RespondContractModificationSchema,
} from "@/lib/actions/schemas/contracts-schemas";
import { revalidatePath } from "next/cache";
import { getEventContractData, renderContractContent, getRealEventId } from "./renderer.actions";
import { getDefaultContractTemplate } from "./templates.actions";
import { notifyContractCancellationRequestedByStudio, notifyContractCancellationRequestedByClient, notifyContractCancellationConfirmed, notifyContractCancellationRejected } from "@/lib/notifications/client/helpers/contract-notifications";

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
      include: {
        template: {
          select: {
            id: true,
            content: true,
            name: true,
          },
        },
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

    // Verificar que el evento existe y pertenece al studio
    const event = await prisma.studio_events.findFirst({
      where: {
        id: validated.event_id,
        studio_id: studio.id,
      },
    });

    if (!event) {
      return { success: false, error: "Evento no encontrado" };
    }

    // Verificar si ya existe un contrato
    const existingContract = await prisma.studio_event_contracts.findUnique({
      where: { event_id: validated.event_id },
    });

    if (existingContract) {
      return { success: false, error: "Ya existe un contrato para este evento" };
    }

    // Obtener plantilla (default o específica)
    const template = validated.template_id
      ? await prisma.studio_contract_templates.findFirst({
          where: {
            id: validated.template_id,
            studio_id: studio.id,
            is_active: true,
          },
        })
      : await getDefaultContractTemplate(studio.id);

    if (!template) {
      return { success: false, error: "No se encontró una plantilla de contrato" };
    }

    // Obtener datos del evento para renderizar
    const contractDataResult = await getEventContractData(studioSlug, validated.event_id);
    if (!contractDataResult.success || !contractDataResult.data) {
      return { success: false, error: contractDataResult.error || "Error al obtener datos del evento" };
    }

    const contractData = contractDataResult.data;

    // Renderizar contenido
    const renderResult = await renderContractContent(template.content, contractData, contractData.condicionesData);

    if (!renderResult.success) {
      return { success: false, error: renderResult.error || "Error al renderizar contrato" };
    }

    // Crear contrato
    const contract = await prisma.studio_event_contracts.create({
      data: {
        studio_id: studio.id,
        event_id: validated.event_id,
        template_id: template.id,
        content: renderResult.data,
        status: "DRAFT",
        version: 1,
        created_by: userId,
      },
    });

    // Crear versión inicial
    await prisma.studio_contract_versions.create({
      data: {
        contract_id: contract.id,
        version: 1,
        content: renderResult.data,
        status: "DRAFT",
        change_type: "AUTO_REGENERATE",
        change_reason: "Contrato generado inicialmente",
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${validated.event_id}`);

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

    // No se puede editar un contrato firmado o cancelado
    if (contract.status === "SIGNED" || contract.status === "CANCELLED") {
      return { success: false, error: "No se puede editar un contrato firmado o cancelado" };
    }

    // El contenido editado viene con variables (desde la plantilla)
    // Necesitamos renderizarlo con los datos del evento antes de guardarlo
    const contractDataResult = await getEventContractData(studioSlug, contract.event_id);
    if (!contractDataResult.success || !contractDataResult.data) {
      return { success: false, error: contractDataResult.error || "Error al obtener datos del evento" };
    }

    const contractData = contractDataResult.data;

    // Renderizar el contenido editado (con variables) con los datos del evento
    const renderResult = await renderContractContent(
      validated.content, // Contenido editado con variables
      contractData,
      contractData.condicionesData
    );

    if (!renderResult.success) {
      return { success: false, error: renderResult.error || "Error al renderizar contrato" };
    }

    // Guardar versión anterior antes de actualizar
    const newVersion = contract.version + 1;
    
    // Verificar si la versión anterior ya existe
    const existingPreviousVersion = await prisma.studio_contract_versions.findFirst({
      where: {
        contract_id: contractId,
        version: contract.version,
      },
    });

    // Guardar versión anterior solo si no existe
    if (!existingPreviousVersion) {
      await prisma.studio_contract_versions.create({
        data: {
          contract_id: contractId,
          version: contract.version,
          content: contract.content,
          status: contract.status,
          change_type: "MANUAL_EDIT",
          change_reason: validated.change_reason || "Edición manual del contrato",
          created_by: userId,
        },
      });
    }

    // Verificar si la nueva versión ya existe (por si acaso)
    const existingNewVersion = await prisma.studio_contract_versions.findFirst({
      where: {
        contract_id: contractId,
        version: newVersion,
      },
    });

    // Actualizar contrato con el contenido renderizado
    // Guardar también el contenido editado (con variables) para poder editarlo después
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        content: renderResult.data, // Contenido renderizado (sin variables) - para mostrar
        custom_template_content: validated.content, // Contenido editado (con variables) - para editar después
        ...(validated.status && { status: validated.status }),
        version: newVersion,
      },
    });

    // Crear nueva versión con el contenido actualizado (renderizado) solo si no existe
    if (!existingNewVersion) {
      await prisma.studio_contract_versions.create({
        data: {
          contract_id: contractId,
          version: newVersion,
          content: renderResult.data, // Contenido renderizado
          status: validated.status || contract.status,
          change_type: "MANUAL_EDIT",
          change_reason: validated.change_reason || "Edición manual del contrato",
          created_by: userId,
        },
      });
    }

    // Si se solicita actualizar la plantilla
    if (validated.update_template && contract.template_id) {
      await prisma.studio_contract_templates.update({
        where: { id: contract.template_id },
        data: {
          content: validated.content, // Contenido editado con variables
          version: contract.template!.version + 1,
        },
      });

      revalidatePath(`/${studioSlug}/studio/config/contratos`);
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

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
      select: {
        id: true,
        event_id: true,
        status: true,
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // No se puede eliminar un contrato firmado o cancelado
    if (contract.status === "SIGNED" || contract.status === "CANCELLED") {
      return { success: false, error: "No se puede eliminar un contrato firmado o cancelado" };
    }

    // Guardar event_id antes de eliminar
    const eventId = contract.event_id;

    // Eliminar contrato
    await prisma.studio_event_contracts.delete({
      where: { id: contractId },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar contrato:", error);
    return { success: false, error: "Error al eliminar contrato" };
  }
}

// Regenerar contrato con datos actualizados
export async function regenerateEventContract(
  studioSlug: string,
  eventId: string,
  changeReason?: string
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
      include: {
        template: true,
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // No se puede regenerar un contrato firmado
    if (contract.status === "SIGNED" || contract.status === "CANCELLED") {
      return { success: false, error: "No se puede regenerar un contrato firmado o cancelado" };
    }

    // Obtener datos actualizados del evento
    const contractDataResult = await getEventContractData(studioSlug, eventId);
    if (!contractDataResult.success || !contractDataResult.data) {
      return { success: false, error: contractDataResult.error || "Error al obtener datos del evento" };
    }

    const contractData = contractDataResult.data;

    // Renderizar con la plantilla actual
    const template = contract.template || await getDefaultContractTemplate(studio.id);
    if (!template) {
      return { success: false, error: "No se encontró la plantilla del contrato" };
    }

    const renderResult = await renderContractContent(template.content, contractData, contractData.condicionesData);

    if (!renderResult.success) {
      return { success: false, error: renderResult.error || "Error al renderizar contrato" };
    }

    // Guardar versión anterior (solo si no existe ya)
    const existingPreviousVersion = await prisma.studio_contract_versions.findFirst({
      where: {
        contract_id: contract.id,
        version: contract.version,
      },
    });

    if (!existingPreviousVersion) {
      await prisma.studio_contract_versions.create({
        data: {
          contract_id: contract.id,
          version: contract.version,
          content: contract.content,
          status: contract.status,
          change_type: "AUTO_REGENERATE",
          change_reason: changeReason || "Regeneración automática por cambios en datos del cliente o evento",
        },
      });
    }

    // Calcular nueva versión
    const newVersion = contract.version + 1;

    // Actualizar contrato
    // Si está publicado, mantenerlo publicado (regeneración automática por cambios del cliente)
    // Si está en draft, mantenerlo en draft
    // Si está firmado o cancelado, no debería llegar aquí (ya se valida arriba)
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contract.id },
      data: {
        content: renderResult.data,
        // Mantener el estado actual (PUBLISHED permanece PUBLISHED, DRAFT permanece DRAFT)
        status: contract.status,
        version: newVersion,
      },
    });

    // Crear nueva versión (solo si no existe ya)
    const existingNewVersion = await prisma.studio_contract_versions.findFirst({
      where: {
        contract_id: contract.id,
        version: newVersion,
      },
    });

    if (!existingNewVersion) {
      await prisma.studio_contract_versions.create({
        data: {
          contract_id: contract.id,
          version: newVersion,
          content: renderResult.data,
          // Mantener el mismo estado que el contrato
          status: contract.status,
          change_type: "AUTO_REGENERATE",
          change_reason: changeReason || "Regeneración automática por cambios en datos del cliente o evento",
        },
      });
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al regenerar contrato:", error);
    return { success: false, error: "Error al regenerar contrato" };
  }
}

// Cambiar plantilla de un contrato existente
export async function updateEventContractTemplate(
  studioSlug: string,
  contractId: string,
  data: unknown,
  userId?: string
): Promise<ActionResponse<EventContract>> {
  try {
    const validated = UpdateEventContractTemplateSchema.parse(data);

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

    // No se puede cambiar plantilla de un contrato firmado o cancelado
    if (contract.status === "SIGNED" || contract.status === "CANCELLED") {
      return { success: false, error: "No se puede cambiar la plantilla de un contrato firmado o cancelado" };
    }

    // Obtener nueva plantilla
    const newTemplate = await prisma.studio_contract_templates.findFirst({
      where: {
        id: validated.template_id,
        studio_id: studio.id,
        is_active: true,
      },
    });

    if (!newTemplate) {
      return { success: false, error: "Plantilla no encontrada" };
    }

    // Obtener datos actualizados del evento
    const contractDataResult = await getEventContractData(studioSlug, contract.event_id);
    if (!contractDataResult.success || !contractDataResult.data) {
      return { success: false, error: contractDataResult.error || "Error al obtener datos del evento" };
    }

    const contractData = contractDataResult.data;

    // Renderizar nueva plantilla con datos actualizados
    const renderResult = await renderContractContent(
      newTemplate.content,
      contractData,
      contractData.condicionesData
    );

    if (!renderResult.success) {
      return { success: false, error: renderResult.error || "Error al renderizar contrato" };
    }

    // Guardar versión anterior (solo si no existe ya)
    const newVersion = contract.version + 1;
    const existingVersion = await prisma.studio_contract_versions.findFirst({
      where: {
        contract_id: contractId,
        version: contract.version,
      },
    });

    if (!existingVersion) {
      await prisma.studio_contract_versions.create({
        data: {
          contract_id: contractId,
          version: contract.version,
          content: contract.content,
          status: contract.status,
          change_type: "TEMPLATE_UPDATE",
          change_reason: validated.change_reason || `Plantilla cambiada de "${contract.template?.name || 'Sin plantilla'}" a "${newTemplate.name}"`,
          created_by: userId,
        },
      });
    }

    // Actualizar contrato con nueva plantilla y contenido renderizado
    // Limpiar custom_template_content porque la plantilla cambió
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        template_id: newTemplate.id,
        content: renderResult.data,
        custom_template_content: null, // Limpiar contenido personalizado al cambiar plantilla
        version: newVersion,
      },
    });

    // Crear nueva versión con el contenido actualizado
    await prisma.studio_contract_versions.create({
      data: {
        contract_id: contractId,
        version: newVersion,
        content: renderResult.data,
        status: contract.status,
        change_type: "TEMPLATE_UPDATE",
        change_reason: validated.change_reason || `Plantilla cambiada a "${newTemplate.name}"`,
        created_by: userId,
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al cambiar plantilla del contrato:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al cambiar plantilla del contrato" };
  }
}

// Publicar contrato
export async function publishEventContract(
  studioSlug: string,
  contractId: string
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
        id: contractId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        event_id: true,
        version: true,
        status: true,
        studio_id: true,
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    if (contract.status !== "DRAFT") {
      return { success: false, error: "Solo se pueden publicar contratos en borrador" };
    }

    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        status: "PUBLISHED",
      },
    });

    // Actualizar versión actual
    await prisma.studio_contract_versions.updateMany({
      where: {
        contract_id: contractId,
        version: contract.version,
      },
      data: {
        status: "PUBLISHED",
      },
    });

    // Notificar al cliente (obtener datos del evento para la notificación)
    try {
      const { notifyContractAvailable } = await import("@/lib/notifications/client/helpers/contract-notifications");
      await notifyContractAvailable(contractId, updated.version);
    } catch (error) {
      console.error("[publishEventContract] Error enviando notificación:", error);
      // No fallar la publicación si falla la notificación
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al publicar contrato:", error);
    return { success: false, error: "Error al publicar contrato" };
  }
}

// Firmar contrato (cambiar de published a signed)
export async function signEventContract(
  studioSlug: string,
  contractId: string,
  signatureUrl?: string
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
        id: contractId,
        studio_id: studio.id,
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    if (contract.status !== "PUBLISHED") {
      return { success: false, error: "Solo se pueden firmar contratos publicados" };
    }

    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        status: "SIGNED",
        signed_by_client: true,
        signed_at: new Date(),
        ...(signatureUrl && { client_signature_url: signatureUrl }),
      },
    });

    // Actualizar versión actual
    await prisma.studio_contract_versions.updateMany({
      where: {
        contract_id: contractId,
        version: contract.version,
      },
      data: {
        status: "SIGNED",
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al firmar contrato:", error);
    return { success: false, error: "Error al firmar contrato" };
  }
}

// Obtener contrato para el cliente (con validación de acceso)
export async function getEventContractForClient(
  studioSlug: string,
  eventId: string,
  clientId: string
): Promise<ActionResponse<EventContract>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // El eventId puede ser un promise_id, obtener el event_id real
    const realEventIdResult = await getRealEventId(studioSlug, eventId);
    if (!realEventIdResult.success || !realEventIdResult.data) {
      console.error('[getEventContractForClient] Error obteniendo realEventId:', {
        eventId,
        error: realEventIdResult.error,
      });
      return { success: false, error: realEventIdResult.error || "Evento no encontrado" };
    }

    const realEventId = realEventIdResult.data;

    // Verificar que el evento pertenece al cliente
    const event = await prisma.studio_events.findFirst({
      where: {
        id: realEventId,
        studio_id: studio.id,
        contact_id: clientId,
      },
    });

    if (!event) {
      console.error('[getEventContractForClient] Evento no encontrado o sin acceso:', {
        realEventId,
        studioId: studio.id,
        clientId,
      });
      return { success: false, error: "Evento no encontrado o no tienes acceso" };
    }

    // Buscar contrato (incluyendo DRAFT para debugging)
    const contract = await prisma.studio_event_contracts.findFirst({
      where: {
        event_id: realEventId,
        studio_id: studio.id,
        status: {
          in: ["PUBLISHED", "SIGNED", "CANCELLATION_REQUESTED_BY_STUDIO", "CANCELLATION_REQUESTED_BY_CLIENT", "CANCELLED"],
        },
      },
    });

    if (!contract) {
      // Verificar si existe un contrato en DRAFT para dar un mensaje más específico
      const draftContract = await prisma.studio_event_contracts.findFirst({
        where: {
          event_id: realEventId,
          studio_id: studio.id,
          status: "DRAFT",
        },
      });

      if (draftContract) {
        console.log('[getEventContractForClient] Contrato encontrado pero está en DRAFT:', {
          contractId: draftContract.id,
          status: draftContract.status,
        });
        return { success: false, error: "El contrato aún no ha sido publicado" };
      }

      console.error('[getEventContractForClient] No hay contrato disponible:', {
        realEventId,
        studioId: studio.id,
      });
      return { success: false, error: "No hay contrato disponible para este evento" };
    }

    return { success: true, data: contract as EventContract };
  } catch (error) {
    console.error("Error al obtener contrato para cliente:", error);
    return { success: false, error: "Error al obtener contrato" };
  }
}

// ============================================
// CANCELACIÓN MUTUA
// ============================================

/**
 * Solicitar cancelación de contrato (Studio)
 */
export async function requestContractCancellationByStudio(
  studioSlug: string,
  contractId: string,
  data: unknown
): Promise<ActionResponse<EventContract>> {
  try {
    const validated = RequestContractCancellationSchema.parse(data);

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
      include: {
        event: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Validaciones
    if (contract.status !== "SIGNED") {
      return { success: false, error: "Solo se puede solicitar cancelación de contratos firmados" };
    }

    // Actualizar estado
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        status: "CANCELLATION_REQUESTED_BY_STUDIO",
        cancellation_reason: validated.reason,
        cancellation_initiated_by: "studio",
      },
    });

    // Crear log
    await prisma.studio_contract_cancellation_logs.create({
      data: {
        contract_id: contractId,
        action: "REQUEST",
        initiated_by: "studio",
        reason: validated.reason,
      },
    });

    // Notificar al cliente
    await notifyContractCancellationRequestedByStudio(contractId, validated.reason);

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al solicitar cancelación:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al solicitar cancelación" };
  }
}

/**
 * Solicitar cancelación de contrato (Cliente)
 */
export async function requestContractCancellationByClient(
  studioSlug: string,
  contractId: string,
  clientId: string,
  data: unknown
): Promise<ActionResponse<EventContract>> {
  try {
    const validated = RequestContractCancellationSchema.parse(data);

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
      include: {
        event: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Validaciones
    if (contract.event.contact_id !== clientId) {
      return { success: false, error: "No tienes acceso a este contrato" };
    }

    if (contract.status !== "SIGNED") {
      return { success: false, error: "Solo se puede solicitar cancelación de contratos firmados" };
    }

    // Actualizar estado
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        status: "CANCELLATION_REQUESTED_BY_CLIENT",
        cancellation_reason: validated.reason,
        cancellation_initiated_by: "client",
      },
    });

    // Crear log
    await prisma.studio_contract_cancellation_logs.create({
      data: {
        contract_id: contractId,
        action: "REQUEST",
        initiated_by: "client",
        reason: validated.reason,
      },
    });

    // Notificar al studio
    await notifyContractCancellationRequestedByClient(contractId, validated.reason);

    revalidatePath(`/${studioSlug}/cliente/${clientId}/${contract.event_id}/contrato`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al solicitar cancelación:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al solicitar cancelación" };
  }
}

/**
 * Confirmar cancelación (Cliente confirma solicitud del Studio)
 */
export async function confirmContractCancellationByClient(
  studioSlug: string,
  contractId: string,
  clientId: string
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
        id: contractId,
        studio_id: studio.id,
      },
      include: {
        event: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Validaciones
    if (contract.event.contact_id !== clientId) {
      return { success: false, error: "No tienes acceso a este contrato" };
    }

    if (contract.status !== "CANCELLATION_REQUESTED_BY_STUDIO") {
      return { success: false, error: "No hay una solicitud de cancelación pendiente del studio" };
    }

    // Actualizar estado a cancelado
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        status: "CANCELLED",
        cancelled_at: new Date(),
      },
    });

    // Crear log
    await prisma.studio_contract_cancellation_logs.create({
      data: {
        contract_id: contractId,
        action: "CONFIRM",
        initiated_by: "client",
        reason: contract.cancellation_reason,
      },
    });

    // Notificar confirmación
    await notifyContractCancellationConfirmed(contractId);

    revalidatePath(`/${studioSlug}/cliente/${clientId}/${contract.event_id}/contrato`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al confirmar cancelación:", error);
    return { success: false, error: "Error al confirmar cancelación" };
  }
}

/**
 * Confirmar cancelación (Studio confirma solicitud del Cliente)
 */
export async function confirmContractCancellationByStudio(
  studioSlug: string,
  contractId: string
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
        id: contractId,
        studio_id: studio.id,
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Validaciones
    if (contract.status !== "CANCELLATION_REQUESTED_BY_CLIENT") {
      return { success: false, error: "No hay una solicitud de cancelación pendiente del cliente" };
    }

    // Actualizar estado a cancelado
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        status: "CANCELLED",
        cancelled_at: new Date(),
      },
    });

    // Crear log
    await prisma.studio_contract_cancellation_logs.create({
      data: {
        contract_id: contractId,
        action: "CONFIRM",
        initiated_by: "studio",
        reason: contract.cancellation_reason,
      },
    });

    // Notificar confirmación
    await notifyContractCancellationConfirmed(contractId);

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al confirmar cancelación:", error);
    return { success: false, error: "Error al confirmar cancelación" };
  }
}

/**
 * Rechazar cancelación (Cliente rechaza solicitud del Studio)
 */
export async function rejectContractCancellationByClient(
  studioSlug: string,
  contractId: string,
  clientId: string
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
        id: contractId,
        studio_id: studio.id,
      },
      include: {
        event: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Validaciones
    if (contract.event.contact_id !== clientId) {
      return { success: false, error: "No tienes acceso a este contrato" };
    }

    if (contract.status !== "CANCELLATION_REQUESTED_BY_STUDIO") {
      return { success: false, error: "No hay una solicitud de cancelación pendiente del studio" };
    }

    // Volver a estado firmado
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        status: "SIGNED",
        cancellation_reason: null,
        cancellation_initiated_by: null,
      },
    });

    // Crear log
    await prisma.studio_contract_cancellation_logs.create({
      data: {
        contract_id: contractId,
        action: "REJECT",
        initiated_by: "client",
        reason: "Cliente rechazó la solicitud de cancelación",
      },
    });

    // Notificar rechazo
    await notifyContractCancellationRejected(contractId, "client");

    revalidatePath(`/${studioSlug}/cliente/${clientId}/${contract.event_id}/contrato`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al rechazar cancelación:", error);
    return { success: false, error: "Error al rechazar cancelación" };
  }
}

/**
 * Rechazar cancelación (Studio rechaza solicitud del Cliente)
 */
export async function rejectContractCancellationByStudio(
  studioSlug: string,
  contractId: string
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
        id: contractId,
        studio_id: studio.id,
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Validaciones
    if (contract.status !== "CANCELLATION_REQUESTED_BY_CLIENT") {
      return { success: false, error: "No hay una solicitud de cancelación pendiente del cliente" };
    }

    // Volver a estado firmado
    const updated = await prisma.studio_event_contracts.update({
      where: { id: contractId },
      data: {
        status: "SIGNED",
        cancellation_reason: null,
        cancellation_initiated_by: null,
      },
    });

    // Crear log
    await prisma.studio_contract_cancellation_logs.create({
      data: {
        contract_id: contractId,
        action: "REJECT",
        initiated_by: "studio",
        reason: "Studio rechazó la solicitud de cancelación",
      },
    });

    // Notificar rechazo
    await notifyContractCancellationRejected(contractId, "studio");

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

    return { success: true, data: updated as EventContract };
  } catch (error) {
    console.error("Error al rechazar cancelación:", error);
    return { success: false, error: "Error al rechazar cancelación" };
  }
}

/**
 * Obtener historial de cancelación
 */
export async function getContractCancellationLogs(
  studioSlug: string,
  contractId: string
): Promise<ActionResponse<CancellationLog[]>> {
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

    const logs = await prisma.studio_contract_cancellation_logs.findMany({
      where: { contract_id: contractId },
      orderBy: { created_at: "desc" },
    });

    return { success: true, data: logs as CancellationLog[] };
  } catch (error) {
    console.error("Error al obtener historial de cancelación:", error);
    return { success: false, error: "Error al obtener historial de cancelación" };
  }
}

// ============================================
// VERSIONADO
// ============================================

/**
 * Obtener historial de versiones
 */
export async function getContractVersions(
  studioSlug: string,
  contractId: string
): Promise<ActionResponse<ContractVersion[]>> {
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

    const versions = await prisma.studio_contract_versions.findMany({
      where: { contract_id: contractId },
      orderBy: { version: "desc" },
      include: {
        created_by_user: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    return { success: true, data: versions as ContractVersion[] };
  } catch (error) {
    console.error("Error al obtener versiones:", error);
    return { success: false, error: "Error al obtener versiones" };
  }
}

// ============================================
// SOLICITUDES DE MODIFICACIÓN
// ============================================

/**
 * Solicitar modificación de contrato (Cliente)
 */
export async function requestContractModificationByClient(
  studioSlug: string,
  contractId: string,
  clientId: string,
  data: unknown
): Promise<ActionResponse<ContractModificationRequest>> {
  try {
    const validated = RequestContractModificationSchema.parse(data);

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
      include: {
        event: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Validaciones
    if (contract.event.contact_id !== clientId) {
      return { success: false, error: "No tienes acceso a este contrato" };
    }

    if (contract.status !== "PUBLISHED") {
      return { success: false, error: "Solo se puede solicitar modificación de contratos publicados" };
    }

    // Crear solicitud
    const request = await prisma.studio_contract_modification_requests.create({
      data: {
        contract_id: contractId,
        requested_by: "client",
        status: "pending",
        message: validated.message,
        metadata: validated.metadata || null,
      },
    });

    // Notificar al studio
    try {
      const { notifyContractModificationRequested } = await import("@/lib/notifications/studio/helpers/contract-modification-notifications");
      await notifyContractModificationRequested(contractId, request.id, validated.message);
    } catch (error) {
      console.error("[requestContractModificationByClient] Error enviando notificación:", error);
      // No fallar la creación si falla la notificación
    }

    revalidatePath(`/${studioSlug}/cliente/${clientId}/${contract.event_id}/contrato`);

    return { success: true, data: request as ContractModificationRequest };
  } catch (error) {
    console.error("Error al solicitar modificación:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al solicitar modificación" };
  }
}

/**
 * Solicitar modificación de contrato (Studio)
 */
export async function requestContractModificationByStudio(
  studioSlug: string,
  contractId: string,
  data: unknown
): Promise<ActionResponse<ContractModificationRequest>> {
  try {
    const validated = RequestContractModificationSchema.parse(data);

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

    // Validaciones
    if (contract.status === "SIGNED" || contract.status === "CANCELLED") {
      return { success: false, error: "No se puede solicitar modificación de contratos firmados o cancelados" };
    }

    // Crear solicitud
    const request = await prisma.studio_contract_modification_requests.create({
      data: {
        contract_id: contractId,
        requested_by: "studio",
        status: "pending",
        message: validated.message,
        metadata: validated.metadata || null,
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

    return { success: true, data: request as ContractModificationRequest };
  } catch (error) {
    console.error("Error al solicitar modificación:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al solicitar modificación" };
  }
}

/**
 * Obtener solicitudes de modificación de un contrato
 */
export async function getContractModificationRequests(
  studioSlug: string,
  contractId: string
): Promise<ActionResponse<ContractModificationRequest[]>> {
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

    const requests = await prisma.studio_contract_modification_requests.findMany({
      where: { contract_id: contractId },
      orderBy: { created_at: "desc" },
    });

    return { success: true, data: requests as ContractModificationRequest[] };
  } catch (error) {
    console.error("Error al obtener solicitudes de modificación:", error);
    return { success: false, error: "Error al obtener solicitudes de modificación" };
  }
}

/**
 * Responder a solicitud de modificación (Studio)
 */
export async function respondContractModification(
  studioSlug: string,
  contractId: string,
  data: unknown
): Promise<ActionResponse<ContractModificationRequest>> {
  try {
    const validated = RespondContractModificationSchema.parse(data);

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
      include: {
        event: {
          include: {
            contact: true,
          },
        },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    const request = await prisma.studio_contract_modification_requests.findFirst({
      where: {
        id: validated.request_id,
        contract_id: contractId,
      },
    });

    if (!request) {
      return { success: false, error: "Solicitud no encontrada" };
    }

    if (request.status !== "pending") {
      return { success: false, error: "La solicitud ya fue procesada" };
    }

    // Actualizar solicitud
    const updated = await prisma.studio_contract_modification_requests.update({
      where: { id: validated.request_id },
      data: {
        status: validated.status,
        response: validated.response || null,
      },
    });

    // Notificar al cliente
    try {
      const { notifyContractModificationResponded } = await import("@/lib/notifications/client/helpers/contract-modification-notifications");
      await notifyContractModificationResponded(
        contractId,
        request.id,
        validated.status,
        validated.response || undefined
      );
    } catch (error) {
      console.error("[respondContractModification] Error enviando notificación:", error);
      // No fallar la actualización si falla la notificación
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${contract.event_id}`);

    return { success: true, data: updated as ContractModificationRequest };
  } catch (error) {
    console.error("Error al responder solicitud de modificación:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al responder solicitud de modificación" };
  }
}
