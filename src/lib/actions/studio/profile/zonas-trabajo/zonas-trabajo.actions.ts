"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface ZonaTrabajoData {
  id: string;
  studio_id: string;
  nombre: string;
  orden: number;
  created_at: Date;
  updated_at: Date;
}

export interface ZonaTrabajoFormData {
  nombre: string;
}

export async function crearZonaTrabajo(
  studioSlug: string,
  data: ZonaTrabajoFormData
) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true }
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const ultimaZona = await prisma.studio_zonas_trabajo.findFirst({
      where: { studio_id: studio.id },
      orderBy: { orden: 'desc' }
    });

    const nuevoOrden = ultimaZona ? ultimaZona.orden + 1 : 0;

    const zona = await prisma.studio_zonas_trabajo.create({
      data: {
        studio_id: studio.id,
        nombre: data.nombre,
        orden: nuevoOrden
      }
    });

    revalidatePath(`/${studioSlug}/studio/profile/zonas-trabajo`);
    return { success: true, zona };
  } catch (error) {
    console.error("Error creando zona de trabajo:", error);
    return { success: false, error: "Error al crear la zona de trabajo" };
  }
}

export async function actualizarZonaTrabajo(
  studioSlug: string,
  zonaId: string,
  data: ZonaTrabajoFormData
) {
  try {
    const zona = await prisma.studio_zonas_trabajo.update({
      where: { id: zonaId },
      data: {
        nombre: data.nombre
      }
    });

    revalidatePath(`/${studioSlug}/studio/profile/zonas-trabajo`);
    return { success: true, zona };
  } catch (error) {
    console.error("Error actualizando zona de trabajo:", error);
    return { success: false, error: "Error al actualizar la zona de trabajo" };
  }
}

export async function eliminarZonaTrabajo(studioSlug: string, zonaId: string) {
  try {
    await prisma.studio_zonas_trabajo.delete({
      where: { id: zonaId }
    });

    revalidatePath(`/${studioSlug}/studio/profile/zonas-trabajo`);
    return { success: true };
  } catch (error) {
    console.error("Error eliminando zona de trabajo:", error);
    return { success: false, error: "Error al eliminar la zona de trabajo" };
  }
}

export async function reordenarZonasTrabajo(
  studioSlug: string,
  zonasOrdenadas: { id: string; orden: number }[]
) {
  try {
    await prisma.$transaction(
      zonasOrdenadas.map((zona) =>
        prisma.studio_zonas_trabajo.update({
          where: { id: zona.id },
          data: { orden: zona.orden }
        })
      )
    );

    revalidatePath(`/${studioSlug}/studio/profile/zonas-trabajo`);
    return { success: true };
  } catch (error) {
    console.error("Error reordenando zonas de trabajo:", error);
    return { success: false, error: "Error al reordenar las zonas de trabajo" };
  }
}

