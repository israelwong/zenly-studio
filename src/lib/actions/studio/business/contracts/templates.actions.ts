"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { ContractTemplate } from "@/types/contracts";
import {
  CreateContractTemplateSchema,
  UpdateContractTemplateSchema,
  DuplicateContractTemplateSchema,
} from "@/lib/actions/schemas/contracts-schemas";
import { revalidatePath } from "next/cache";

// Generar slug desde nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Listar plantillas
export async function getContractTemplates(
  studioSlug: string,
  filters?: { eventTypeId?: string; isActive?: boolean }
): Promise<ActionResponse<ContractTemplate[]>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const templates = await prisma.studio_contract_templates.findMany({
      where: {
        studio_id: studio.id,
        ...(filters?.eventTypeId && { event_type_id: filters.eventTypeId }),
        ...(filters?.isActive !== undefined && { is_active: filters.isActive }),
      },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    });

    return { success: true, data: templates as ContractTemplate[] };
  } catch (error) {
    console.error("Error al obtener plantillas:", error);
    return { success: false, error: "Error al obtener plantillas" };
  }
}

// Obtener una plantilla
export async function getContractTemplate(
  studioSlug: string,
  templateId: string
): Promise<ActionResponse<ContractTemplate>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const template = await prisma.studio_contract_templates.findFirst({
      where: {
        id: templateId,
        studio_id: studio.id,
      },
    });

    if (!template) {
      return { success: false, error: "Plantilla no encontrada" };
    }

    return { success: true, data: template as ContractTemplate };
  } catch (error) {
    console.error("Error al obtener plantilla:", error);
    return { success: false, error: "Error al obtener plantilla" };
  }
}

// Obtener plantilla por defecto
export async function getDefaultContractTemplate(
  studioSlug: string,
  eventTypeId?: string
): Promise<ActionResponse<ContractTemplate>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Buscar plantilla específica del tipo de evento si se proporciona
    if (eventTypeId) {
      const template = await prisma.studio_contract_templates.findFirst({
        where: {
          studio_id: studio.id,
          event_type_id: eventTypeId,
          is_active: true,
        },
      });

      if (template) {
        return { success: true, data: template as ContractTemplate };
      }
    }

    // Buscar plantilla por defecto
    const defaultTemplate = await prisma.studio_contract_templates.findFirst({
      where: {
        studio_id: studio.id,
        is_default: true,
        is_active: true,
      },
    });

    if (!defaultTemplate) {
      return { success: false, error: "No hay plantilla por defecto configurada" };
    }

    return { success: true, data: defaultTemplate as ContractTemplate };
  } catch (error) {
    console.error("Error al obtener plantilla por defecto:", error);
    return { success: false, error: "Error al obtener plantilla por defecto" };
  }
}

// Crear plantilla
export async function createContractTemplate(
  studioSlug: string,
  data: unknown,
  userId?: string
): Promise<ActionResponse<ContractTemplate>> {
  try {
    const validated = CreateContractTemplateSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Generar slug si no se proporciona
    const slug = validated.slug || generateSlug(validated.name);

    // Verificar que el slug no exista
    const existingTemplate = await prisma.studio_contract_templates.findUnique({
      where: {
        studio_id_slug: {
          studio_id: studio.id,
          slug: slug,
        },
      },
    });

    if (existingTemplate) {
      return { success: false, error: "Ya existe una plantilla con ese nombre" };
    }

    // Si se marca como default, desactivar otras defaults
    if (validated.is_default) {
      await prisma.studio_contract_templates.updateMany({
        where: {
          studio_id: studio.id,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    }

    const template = await prisma.studio_contract_templates.create({
      data: {
        studio_id: studio.id,
        name: validated.name,
        slug: slug,
        description: validated.description,
        event_type_id: validated.event_type_id,
        content: validated.content,
        is_default: validated.is_default,
        created_by: userId,
      },
    });

    revalidatePath(`/${studioSlug}/studio/contratos`);

    return { success: true, data: template as ContractTemplate };
  } catch (error) {
    console.error("Error al crear plantilla:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear plantilla" };
  }
}

// Actualizar plantilla
export async function updateContractTemplate(
  studioSlug: string,
  templateId: string,
  data: unknown,
  userId?: string
): Promise<ActionResponse<ContractTemplate>> {
  try {
    const validated = UpdateContractTemplateSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Verificar que la plantilla existe y pertenece al studio
    const existingTemplate = await prisma.studio_contract_templates.findFirst({
      where: {
        id: templateId,
        studio_id: studio.id,
      },
    });

    if (!existingTemplate) {
      return { success: false, error: "Plantilla no encontrada" };
    }

    // Si se proporciona nuevo nombre, generar nuevo slug
    let slug = existingTemplate.slug;
    if (validated.name && validated.name !== existingTemplate.name) {
      slug = validated.slug || generateSlug(validated.name);

      // Verificar que el nuevo slug no exista
      const duplicateSlug = await prisma.studio_contract_templates.findFirst({
        where: {
          studio_id: studio.id,
          slug: slug,
          id: { not: templateId },
        },
      });

      if (duplicateSlug) {
        return { success: false, error: "Ya existe una plantilla con ese nombre" };
      }
    }

    // Si se marca como default, desactivar otras defaults
    if (validated.is_default) {
      await prisma.studio_contract_templates.updateMany({
        where: {
          studio_id: studio.id,
          is_default: true,
          id: { not: templateId },
        },
        data: {
          is_default: false,
        },
      });
    }

    const template = await prisma.studio_contract_templates.update({
      where: { id: templateId },
      data: {
        ...(validated.name && { name: validated.name, slug }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.event_type_id !== undefined && { event_type_id: validated.event_type_id }),
        ...(validated.content && { content: validated.content }),
        ...(validated.is_active !== undefined && { is_active: validated.is_active }),
        ...(validated.is_default !== undefined && { is_default: validated.is_default }),
      },
    });

    revalidatePath(`/${studioSlug}/studio/contratos`);
    revalidatePath(`/${studioSlug}/studio/contratos/${templateId}/editar`);

    return { success: true, data: template as ContractTemplate };
  } catch (error) {
    console.error("Error al actualizar plantilla:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar plantilla" };
  }
}

// Eliminar plantilla (soft delete)
export async function deleteContractTemplate(
  studioSlug: string,
  templateId: string
): Promise<ActionResponse<void>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Verificar que la plantilla existe
    const template = await prisma.studio_contract_templates.findFirst({
      where: {
        id: templateId,
        studio_id: studio.id,
      },
    });

    if (!template) {
      return { success: false, error: "Plantilla no encontrada" };
    }

    // No permitir eliminar si es la única plantilla activa
    const activeCount = await prisma.studio_contract_templates.count({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
    });

    if (activeCount <= 1 && template.is_active) {
      return { success: false, error: "No puedes eliminar la única plantilla activa" };
    }

    // Desactivar en lugar de eliminar
    await prisma.studio_contract_templates.update({
      where: { id: templateId },
      data: { is_active: false },
    });

    revalidatePath(`/${studioSlug}/studio/contratos`);

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar plantilla:", error);
    return { success: false, error: "Error al eliminar plantilla" };
  }
}

// Activar/Desactivar plantilla
export async function toggleContractTemplate(
  studioSlug: string,
  templateId: string
): Promise<ActionResponse<ContractTemplate>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const template = await prisma.studio_contract_templates.findFirst({
      where: {
        id: templateId,
        studio_id: studio.id,
      },
    });

    if (!template) {
      return { success: false, error: "Plantilla no encontrada" };
    }

    // Si está activa y es la única, no permitir desactivar
    if (template.is_active) {
      const activeCount = await prisma.studio_contract_templates.count({
        where: {
          studio_id: studio.id,
          is_active: true,
        },
      });

      if (activeCount <= 1) {
        return { success: false, error: "No puedes desactivar la única plantilla activa" };
      }
    }

    const updated = await prisma.studio_contract_templates.update({
      where: { id: templateId },
      data: { is_active: !template.is_active },
    });

    revalidatePath(`/${studioSlug}/studio/contratos`);

    return { success: true, data: updated as ContractTemplate };
  } catch (error) {
    console.error("Error al activar/desactivar plantilla:", error);
    return { success: false, error: "Error al activar/desactivar plantilla" };
  }
}

// Duplicar plantilla
export async function duplicateContractTemplate(
  studioSlug: string,
  data: unknown,
  userId?: string
): Promise<ActionResponse<ContractTemplate>> {
  try {
    const validated = DuplicateContractTemplateSchema.parse(data);

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const original = await prisma.studio_contract_templates.findFirst({
      where: {
        id: validated.template_id,
        studio_id: studio.id,
      },
    });

    if (!original) {
      return { success: false, error: "Plantilla original no encontrada" };
    }

    // Generar nombre y slug para la copia
    const newName = validated.new_name || `${original.name} (Copia)`;
    const newSlug = generateSlug(newName);

    // Verificar que el slug no exista
    const existing = await prisma.studio_contract_templates.findUnique({
      where: {
        studio_id_slug: {
          studio_id: studio.id,
          slug: newSlug,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Ya existe una plantilla con ese nombre" };
    }

    const duplicate = await prisma.studio_contract_templates.create({
      data: {
        studio_id: studio.id,
        name: newName,
        slug: newSlug,
        description: original.description,
        event_type_id: original.event_type_id,
        content: original.content,
        is_default: false,
        version: 1,
        created_by: userId,
      },
    });

    revalidatePath(`/${studioSlug}/studio/contratos`);

    return { success: true, data: duplicate as ContractTemplate };
  } catch (error) {
    console.error("Error al duplicar plantilla:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al duplicar plantilla" };
  }
}
