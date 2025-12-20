// Ruta: src/lib/actions/studio/config/terminos-condiciones.actions.ts

'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TerminosCondicionesSchema, type TerminosCondicionesForm } from "@/lib/actions/schemas/terminos-condiciones-schemas";

// Obtener todos los términos y condiciones de un studio
export async function obtenerTerminosCondiciones(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const terminos = await prisma.studio_terminos_condiciones.findMany({
            where: { studio_id: studio.id },
            orderBy: { order: 'asc' },
        });

        return {
            success: true,
            data: terminos,
        };
    } catch (error) {
        console.error("Error al obtener términos y condiciones:", error);
        return {
            success: false,
            error: "Error al obtener términos y condiciones",
        };
    }
}

// Obtener términos y condiciones activos
export async function obtenerTerminosCondicionesActivos(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const terminos = await prisma.studio_terminos_condiciones.findMany({
            where: {
                studio_id: studio.id,
                is_active: true,
            },
            orderBy: { order: 'asc' },
        });

        return {
            success: true,
            data: terminos,
        };
    } catch (error) {
        console.error("Error al obtener términos y condiciones activos:", error);
        return {
            success: false,
            error: "Error al obtener términos y condiciones activos",
        };
    }
}

// Obtener un término y condición específico
export async function obtenerTerminoCondicion(studioSlug: string, terminoId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const termino = await prisma.studio_terminos_condiciones.findFirst({
            where: {
                id: terminoId,
                studio_id: studio.id,
            },
        });

        if (!termino) {
            return {
                success: false,
                error: "Términos y condiciones no encontrados",
            };
        }

        return {
            success: true,
            data: termino,
        };
    } catch (error) {
        console.error("Error al obtener término y condición:", error);
        return {
            success: false,
            error: "Error al obtener término y condición",
        };
    }
}

// Crear términos y condiciones
export async function crearTerminosCondiciones(studioSlug: string, data: TerminosCondicionesForm) {
    try {
        const validationResult = TerminosCondicionesSchema.safeParse(data);

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

        // Obtener el orden más alto para asignar el siguiente
        const ultimoOrden = await prisma.studio_terminos_condiciones.findFirst({
            where: { studio_id: studio.id },
            orderBy: { order: 'desc' },
            select: { order: true },
        });

        const nuevoOrden = (ultimoOrden?.order ?? -1) + 1;

        const nuevoTermino = await prisma.studio_terminos_condiciones.create({
            data: {
                studio_id: studio.id,
                title: validationResult.data.title,
                content: validationResult.data.content,
                order: validationResult.data.order ?? nuevoOrden,
                is_active: validationResult.data.is_active ?? true,
                is_required: validationResult.data.is_required ?? false,
            },
        });

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

        return {
            success: true,
            data: nuevoTermino,
        };
    } catch (error) {
        console.error("Error al crear términos y condiciones:", error);
        return {
            success: false,
            error: "Error al crear términos y condiciones",
        };
    }
}

// Actualizar términos y condiciones
export async function actualizarTerminosCondiciones(
    studioSlug: string,
    terminoId: string,
    data: TerminosCondicionesForm
) {
    try {
        const validationResult = TerminosCondicionesSchema.safeParse(data);

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

        // Verificar que el término pertenezca al studio
        const terminoExistente = await prisma.studio_terminos_condiciones.findFirst({
            where: {
                id: terminoId,
                studio_id: studio.id,
            },
        });

        if (!terminoExistente) {
            return {
                success: false,
                error: "Términos y condiciones no encontrados o no pertenecen al studio",
            };
        }

        // Si se activa, desactivar otros
        if (validationResult.data.is_active === true) {
            await prisma.studio_terminos_condiciones.updateMany({
                where: {
                    studio_id: studio.id,
                    is_active: true,
                    id: { not: terminoId },
                },
                data: {
                    is_active: false,
                },
            });
        }

        const terminoActualizado = await prisma.studio_terminos_condiciones.update({
            where: { id: terminoId },
            data: {
                title: validationResult.data.title,
                content: validationResult.data.content,
                order: validationResult.data.order ?? terminoExistente.order,
                is_active: validationResult.data.is_active ?? terminoExistente.is_active,
                is_required: validationResult.data.is_required ?? terminoExistente.is_required,
                updated_at: new Date(),
            },
        });

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

        return {
            success: true,
            data: terminoActualizado,
        };
    } catch (error) {
        console.error("Error al actualizar términos y condiciones:", error);
        return {
            success: false,
            error: "Error al actualizar términos y condiciones",
        };
    }
}

// Eliminar términos y condiciones
export async function eliminarTerminosCondiciones(studioSlug: string, terminoId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Verificar que el término pertenezca al studio antes de eliminar
        const termino = await prisma.studio_terminos_condiciones.findFirst({
            where: {
                id: terminoId,
                studio_id: studio.id,
            },
        });

        if (!termino) {
            return {
                success: false,
                error: "Términos y condiciones no encontrados o no pertenecen al studio",
            };
        }

        await prisma.studio_terminos_condiciones.delete({
            where: { id: terminoId },
        });

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

        return {
            success: true,
            message: "Términos y condiciones eliminados exitosamente",
        };
    } catch (error) {
        console.error("Error al eliminar términos y condiciones:", error);
        return {
            success: false,
            error: "Error al eliminar términos y condiciones",
        };
    }
}

// Actualizar orden de términos y condiciones
export async function actualizarOrdenTerminosCondiciones(studioSlug: string, terminos: { id: string; orden: number }[]) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        await prisma.$transaction(
            terminos.map(termino =>
                prisma.studio_terminos_condiciones.update({
                    where: { id: termino.id },
                    data: { order: termino.orden, updated_at: new Date() },
                })
            )
        );

        revalidatePath(`/${studioSlug}/studio/commercial/promises`);

        return {
            success: true,
            message: "Orden actualizado exitosamente",
        };
    } catch (error) {
        console.error("Error al actualizar orden:", error);
        return {
            success: false,
            error: "Error al actualizar el orden",
        };
    }
}

