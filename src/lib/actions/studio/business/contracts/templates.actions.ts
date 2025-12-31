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
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/constants/contract-template";

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

    // Si hay eventTypeId, incluir plantillas específicas del tipo Y plantillas generales (sin event_type_id)
    const whereClause: any = {
      studio_id: studio.id,
      ...(filters?.isActive !== undefined && { is_active: filters.isActive }),
    };

    // Agregar filtro de eventTypeId: incluir específicas del tipo Y generales (null)
    if (filters?.eventTypeId) {
      whereClause.OR = [
        { event_type_id: filters.eventTypeId },
        { event_type_id: null },
      ];
    }

    const templates = await prisma.studio_contract_templates.findMany({
      where: whereClause,
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

    // Si se marca como default, desactivar otras defaults y asegurar que esté activa
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
        is_default: validated.is_default || false,
        // Si es default, debe estar activa. Por defecto todas las nuevas plantillas están activas
        is_active: true,
        created_by: userId,
      },
    });

    revalidatePath(`/${studioSlug}/studio/config/contratos`);

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

    // Si se marca como default, desactivar otras defaults y asegurar que esté activa
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
      // Asegurar que la plantilla por defecto esté activa
      if (validated.is_active === false) {
        validated.is_active = true;
      }
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

    revalidatePath(`/${studioSlug}/studio/config/contratos`);

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

    // No permitir eliminar la plantilla por defecto
    if (template.is_default) {
      return { success: false, error: "No puedes eliminar la plantilla por defecto. Primero cambia la plantilla por defecto a otra plantilla." };
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

    // Nota: No validamos contratos asociados porque los contratos ya tienen su contenido
    // renderizado guardado y no dependen funcionalmente de la plantilla una vez generados.
    // El template_id es solo una referencia histórica.

    // Eliminar físicamente la plantilla
    await prisma.studio_contract_templates.delete({
      where: { id: templateId },
    });

    revalidatePath(`/${studioSlug}/studio/config/contratos`);

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

    // No permitir desactivar la plantilla por defecto
    if (template.is_default && template.is_active) {
      return { success: false, error: "No puedes desactivar la plantilla por defecto" };
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

    revalidatePath(`/${studioSlug}/studio/config/contratos`);

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

    revalidatePath(`/${studioSlug}/studio/config/contratos`);

    return { success: true, data: duplicate as ContractTemplate };
  } catch (error) {
    console.error("Error al duplicar plantilla:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al duplicar plantilla" };
  }
}

// =====================================================
// Funciones para datos del estudio requeridos para contratos
// =====================================================

export interface StudioContractData {
  nombre_studio: string;
  nombre_representante: string | null;
  telefono_studio: string | null;
  correo_studio: string;
  direccion_studio: string | null;
}

export interface StudioContractDataSources {
  // Datos del estudio (para sugerir)
  studio: {
    studio_name: string;
    email: string;
    address: string | null;
    phone: string | null;
    google_oauth_email: string | null;
  };
  // Datos del perfil del usuario (para sugerir)
  profile: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

export interface StudioContractDataValidation {
  isValid: boolean;
  missingFields: string[];
}

/**
 * Obtiene los datos del estudio necesarios para generar contratos
 * Incluye fuentes de datos para sugerir valores al usuario
 */
export async function getStudioContractData(
  studioSlug: string
): Promise<ActionResponse<StudioContractData & { sources: StudioContractDataSources }>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        representative_name: true,
        phone: true,
        email: true,
        address: true,
        google_oauth_email: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Obtener datos del perfil del usuario (platform_leads)
    let profileData: StudioContractDataSources["profile"] = null;
    try {
      const { obtenerPerfil } = await import("@/lib/actions/studio/account/perfil.actions");
      const profileResult = await obtenerPerfil(studioSlug);
      if (profileResult.success && profileResult.data) {
        profileData = {
          name: profileResult.data.name,
          email: profileResult.data.email,
          phone: profileResult.data.phone || null,
        };
      }
    } catch (error) {
      // Si no se puede obtener el perfil, continuar sin él
      console.warn("[getStudioContractData] No se pudo obtener perfil:", error);
    }

    return {
      success: true,
      data: {
        nombre_studio: studio.studio_name,
        nombre_representante: studio.representative_name || null,
        telefono_studio: studio.phone || null,
        correo_studio: studio.email,
        direccion_studio: studio.address || null,
        sources: {
          studio: {
            studio_name: studio.studio_name,
            email: studio.email,
            address: studio.address || null,
            phone: studio.phone || null,
            google_oauth_email: studio.google_oauth_email || null,
          },
          profile: profileData,
        },
      },
    };
  } catch (error) {
    console.error("[getStudioContractData] Error:", error);
    return { success: false, error: "Error al obtener datos del estudio" };
  }
}

/**
 * Valida que todos los datos del estudio estén completos
 */
export async function validateStudioContractData(
  data: StudioContractData
): Promise<StudioContractDataValidation> {
  const missingFields: string[] = [];

  if (!data.nombre_studio || data.nombre_studio.trim() === "") {
    missingFields.push("nombre_studio");
  }
  if (!data.nombre_representante || data.nombre_representante.trim() === "") {
    missingFields.push("nombre_representante");
  }
  if (!data.correo_studio || data.correo_studio.trim() === "") {
    missingFields.push("correo_studio");
  }
  if (!data.telefono_studio || data.telefono_studio.trim() === "") {
    missingFields.push("telefono_studio");
  }
  if (!data.direccion_studio || data.direccion_studio.trim() === "") {
    missingFields.push("direccion_studio");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Actualiza los datos del estudio necesarios para generar contratos
 */
export async function updateStudioContractData(
  studioSlug: string,
  data: {
    studio_name: string;
    representative_name: string;
    email: string;
    phone: string;
    address: string;
  }
): Promise<ActionResponse<void>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Validar que todos los campos estén presentes
    if (!data.studio_name?.trim()) {
      return { success: false, error: "El nombre del estudio es obligatorio" };
    }
    if (!data.representative_name?.trim()) {
      return { success: false, error: "El nombre del representante es obligatorio" };
    }
    if (!data.email?.trim()) {
      return { success: false, error: "El correo es obligatorio" };
    }
    if (!data.phone?.trim()) {
      return { success: false, error: "El teléfono es obligatorio" };
    }
    if (!data.address?.trim()) {
      return { success: false, error: "La dirección es obligatoria" };
    }

    // ⚠️ IMPORTANTE: Solo actualizamos los campos legales del estudio
    // NO actualizamos los datos de cuenta (platform_leads, etc.)
    await prisma.studios.update({
      where: { id: studio.id },
      data: {
        studio_name: data.studio_name.trim(),
        representative_name: data.representative_name.trim(),
        email: data.email.trim(), // Email legal del estudio (puede ser diferente del de cuenta)
        phone: data.phone.trim(),
        address: data.address.trim(),
      },
    });

    revalidatePath(`/${studioSlug}/studio/config/contratos`);

    return { success: true };
  } catch (error) {
    console.error("[updateStudioContractData] Error:", error);
    return { success: false, error: "Error al actualizar datos del estudio" };
  }
}

/**
 * Crea una plantilla default para el studio si no existe
 * Solo se crea si los datos del estudio están completos
 */
export async function createDefaultTemplateForStudio(
  studioSlug: string,
  userId?: string
): Promise<ActionResponse<ContractTemplate>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Verificar si ya existe una plantilla default
    const existingDefault = await prisma.studio_contract_templates.findFirst({
      where: {
        studio_id: studio.id,
        is_default: true,
        is_active: true,
      },
    });

    if (existingDefault) {
      return { success: true, data: existingDefault as ContractTemplate };
    }

    // Verificar que los datos del estudio estén completos
    const studioDataResult = await getStudioContractData(studioSlug);
    if (!studioDataResult.success || !studioDataResult.data) {
      return { success: false, error: "No se pueden crear plantillas sin datos completos del estudio" };
    }

    const validation = await validateStudioContractData(studioDataResult.data);
    if (!validation.isValid) {
      return { success: false, error: "Los datos del estudio no están completos" };
    }

    // Crear plantilla default
    const defaultTemplate = await prisma.studio_contract_templates.create({
      data: {
        studio_id: studio.id,
        name: "Plantilla por Defecto",
        slug: generateSlug("Plantilla por Defecto"),
        description: "Plantilla de contrato por defecto creada automáticamente",
        content: DEFAULT_CONTRACT_TEMPLATE,
        is_default: true,
        is_active: true,
        version: 1,
        created_by: userId,
      },
    });

    revalidatePath(`/${studioSlug}/studio/config/contratos`);

    return { success: true, data: defaultTemplate as ContractTemplate };
  } catch (error) {
    console.error("[createDefaultTemplateForStudio] Error:", error);
    return { success: false, error: "Error al crear plantilla por defecto" };
  }
}
