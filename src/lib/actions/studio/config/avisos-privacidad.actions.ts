'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AvisoPrivacidadSchema, type AvisoPrivacidadForm } from "@/lib/actions/schemas/avisos-privacidad-schemas";

// Obtener todos los avisos de privacidad de un studio
export async function obtenerAvisosPrivacidad(studioSlug: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      throw new Error("Studio no encontrado");
    }

    const avisos = await prisma.studio_avisos_privacidad.findMany({
      where: { studio_id: studio.id },
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: avisos,
    };
  } catch (error) {
    console.error("Error al obtener avisos de privacidad:", error);
    return {
      success: false,
      error: "Error al obtener avisos de privacidad",
    };
  }
}

// Obtener aviso de privacidad activo
export async function obtenerAvisoPrivacidadActivo(studioSlug: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      throw new Error("Studio no encontrado");
    }

    const aviso = await prisma.studio_avisos_privacidad.findFirst({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
    });

    return {
      success: true,
      data: aviso,
    };
  } catch (error) {
    console.error("Error al obtener aviso de privacidad activo:", error);
    return {
      success: false,
      error: "Error al obtener aviso de privacidad activo",
    };
  }
}

// Obtener un aviso de privacidad específico
export async function obtenerAvisoPrivacidad(studioSlug: string, avisoId: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      throw new Error("Studio no encontrado");
    }

    const aviso = await prisma.studio_avisos_privacidad.findFirst({
      where: {
        id: avisoId,
        studio_id: studio.id,
      },
    });

    if (!aviso) {
      return {
        success: false,
        error: "Aviso de privacidad no encontrado",
      };
    }

    return {
      success: true,
      data: aviso,
    };
  } catch (error) {
    console.error("Error al obtener aviso de privacidad:", error);
    return {
      success: false,
      error: "Error al obtener aviso de privacidad",
    };
  }
}

// Crear aviso de privacidad
export async function crearAvisoPrivacidad(studioSlug: string, data: AvisoPrivacidadForm) {
  try {
    const validationResult = AvisoPrivacidadSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.flatten().fieldErrors,
      };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      throw new Error("Studio no encontrado");
    }

    // Si se activa, desactivar otros
    if (validationResult.data.is_active === true) {
      await prisma.studio_avisos_privacidad.updateMany({
        where: {
          studio_id: studio.id,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });
    }

    const nuevoAviso = await prisma.studio_avisos_privacidad.create({
      data: {
        studio_id: studio.id,
        title: validationResult.data.title,
        content: validationResult.data.content,
        version: validationResult.data.version,
        is_active: validationResult.data.is_active ?? true,
      },
    });

    revalidatePath(`/${studioSlug}/studio/config`);
    revalidatePath(`/${studioSlug}/cliente`);

    return {
      success: true,
      data: nuevoAviso,
    };
  } catch (error) {
    console.error("Error al crear aviso de privacidad:", error);
    return {
      success: false,
      error: "Error al crear aviso de privacidad",
    };
  }
}

// Actualizar aviso de privacidad
export async function actualizarAvisoPrivacidad(
  studioSlug: string,
  avisoId: string,
  data: AvisoPrivacidadForm
) {
  try {
    const validationResult = AvisoPrivacidadSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.flatten().fieldErrors,
      };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      throw new Error("Studio no encontrado");
    }

    // Verificar que el aviso pertenezca al studio
    const avisoExistente = await prisma.studio_avisos_privacidad.findFirst({
      where: {
        id: avisoId,
        studio_id: studio.id,
      },
    });

    if (!avisoExistente) {
      return {
        success: false,
        error: "Aviso de privacidad no encontrado o no pertenece al studio",
      };
    }

    // Si se activa, desactivar otros
    if (validationResult.data.is_active === true) {
      await prisma.studio_avisos_privacidad.updateMany({
        where: {
          studio_id: studio.id,
          is_active: true,
          id: { not: avisoId },
        },
        data: {
          is_active: false,
        },
      });
    }

    const avisoActualizado = await prisma.studio_avisos_privacidad.update({
      where: { id: avisoId },
      data: {
        title: validationResult.data.title,
        content: validationResult.data.content,
        version: validationResult.data.version ?? avisoExistente.version,
        is_active: validationResult.data.is_active ?? avisoExistente.is_active,
        updated_at: new Date(),
      },
    });

    revalidatePath(`/${studioSlug}/studio/config`);
    revalidatePath(`/${studioSlug}/cliente`);

    return {
      success: true,
      data: avisoActualizado,
    };
  } catch (error) {
    console.error("Error al actualizar aviso de privacidad:", error);
    return {
      success: false,
      error: "Error al actualizar aviso de privacidad",
    };
  }
}

// Eliminar aviso de privacidad
export async function eliminarAvisoPrivacidad(studioSlug: string, avisoId: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      throw new Error("Studio no encontrado");
    }

    // Verificar que el aviso pertenezca al studio antes de eliminar
    const aviso = await prisma.studio_avisos_privacidad.findFirst({
      where: {
        id: avisoId,
        studio_id: studio.id,
      },
    });

    if (!aviso) {
      return {
        success: false,
        error: "Aviso de privacidad no encontrado o no pertenece al studio",
      };
    }

    await prisma.studio_avisos_privacidad.delete({
      where: { id: avisoId },
    });

    revalidatePath(`/${studioSlug}/studio/config`);

    return {
      success: true,
      message: "Aviso de privacidad eliminado exitosamente",
    };
  } catch (error) {
    console.error("Error al eliminar aviso de privacidad:", error);
    return {
      success: false,
      error: "Error al eliminar aviso de privacidad",
    };
  }
}

