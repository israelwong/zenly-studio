// Ruta: src/lib/actions/studio/config/condiciones-comerciales.actions.ts

'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CondicionComercialSchema, type CondicionComercialForm } from "@/lib/actions/schemas/condiciones-comerciales-schemas";

// Obtener todas las condiciones comerciales de un studio
export async function obtenerCondicionesComerciales(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const condiciones = await prisma.studio_condiciones_comerciales.findMany({
            where: { studio_id: studio.id },
            orderBy: { order: 'asc' },
        });

        return {
            success: true,
            data: condiciones,
        };
    } catch (error) {
        console.error("Error al obtener condiciones comerciales:", error);
        return {
            success: false,
            error: "Error al obtener condiciones comerciales",
        };
    }
}

// Obtener una condición comercial específica
export async function obtenerCondicionComercial(studioSlug: string, condicionId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const condicion = await prisma.studio_condiciones_comerciales.findFirst({
            where: {
                id: condicionId,
                studio_id: studio.id,
            },
        });

        if (!condicion) {
            throw new Error("Condición comercial no encontrada");
        }

        return {
            success: true,
            data: condicion,
        };
    } catch (error) {
        console.error("Error al obtener condición comercial:", error);
        return {
            success: false,
            error: "Error al obtener condición comercial",
        };
    }
}

// Crear nueva condición comercial
export async function crearCondicionComercial(studioSlug: string, data: CondicionComercialForm) {
    try {
        const validationResult = CondicionComercialSchema.safeParse(data);

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

        const dataToSave = {
            studio_id: studio.id,
            nombre: validationResult.data.nombre,
            descripcion: validationResult.data.descripcion,
            porcentaje_descuento: validationResult.data.porcentaje_descuento ? parseFloat(validationResult.data.porcentaje_descuento) : null,
            porcentaje_anticipo: validationResult.data.porcentaje_anticipo ? parseFloat(validationResult.data.porcentaje_anticipo) : null,
            status: validationResult.data.status,
            order: validationResult.data.orden || 0,
            updated_at: new Date(),
        };

        const nuevaCondicion = await prisma.studio_condiciones_comerciales.create({
            data: dataToSave,
        });

        revalidatePath(`/studio/${studioSlug}/configuracion/comercial/condiciones-comerciales`);

        return {
            success: true,
            data: nuevaCondicion,
        };
    } catch (error) {
        console.error("Error al crear condición comercial:", error);
        return {
            success: false,
            error: "Error al crear condición comercial",
        };
    }
}

// Actualizar condición comercial
export async function actualizarCondicionComercial(studioSlug: string, condicionId: string, data: CondicionComercialForm) {
    try {
        const validationResult = CondicionComercialSchema.safeParse(data);

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

        const dataToSave = {
            nombre: validationResult.data.nombre,
            descripcion: validationResult.data.descripcion,
            porcentaje_descuento: validationResult.data.porcentaje_descuento ? parseFloat(validationResult.data.porcentaje_descuento) : null,
            porcentaje_anticipo: validationResult.data.porcentaje_anticipo ? parseFloat(validationResult.data.porcentaje_anticipo) : null,
            status: validationResult.data.status,
            order: validationResult.data.orden || 0,
            updated_at: new Date(),
        };

        const condicionActualizada = await prisma.studio_condiciones_comerciales.update({
            where: { id: condicionId },
            data: dataToSave,
        });

        revalidatePath(`/studio/${studioSlug}/configuracion/comercial/condiciones-comerciales`);

        return {
            success: true,
            data: condicionActualizada,
        };
    } catch (error) {
        console.error("Error al actualizar condición comercial:", error);
        return {
            success: false,
            error: "Error al actualizar condición comercial",
        };
    }
}

// Eliminar condición comercial
export async function eliminarCondicionComercial(studioSlug: string, condicionId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        await prisma.studio_condiciones_comerciales.delete({
            where: { id: condicionId },
        });

        revalidatePath(`/studio/${studioSlug}/configuracion/comercial/condiciones-comerciales`);

        return {
            success: true,
            message: "Condición comercial eliminada exitosamente",
        };
    } catch (error) {
        console.error("Error al eliminar condición comercial:", error);
        return {
            success: false,
            error: "Error al eliminar condición comercial",
        };
    }
}

// Actualizar orden de condiciones comerciales
export async function actualizarOrdenCondicionesComerciales(studioSlug: string, condiciones: { id: string; orden: number }[]) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        await prisma.$transaction(
            condiciones.map(condicion =>
                prisma.studio_condiciones_comerciales.update({
                    where: { id: condicion.id },
                    data: { order: condicion.orden, updated_at: new Date() },
                })
            )
        );

        revalidatePath(`/studio/${studioSlug}/configuracion/comercial/condiciones-comerciales`);

        return {
            success: true,
            message: "Orden actualizado exitosamente",
        };
    } catch (error) {
        console.error("Error al actualizar orden:", error);
        return {
            success: false,
            error: "Error al actualizar orden",
        };
    }
}

// Obtener configuración de precios para validaciones
export async function obtenerConfiguracionPrecios(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Buscar configuración en studio_configuraciones
        const configuracion = await prisma.studio_configuraciones.findFirst({
            where: {
                studio_id: studio.id,
                status: 'active',
            },
            select: {
                sobreprecio: true,
            },
        });

        return {
            success: true,
            data: {
                sobreprecio: configuracion?.sobreprecio || 0,
            },
        };
    } catch (error) {
        console.error("Error al obtener configuración de precios:", error);
        return {
            success: false,
            error: "Error al obtener configuración de precios",
        };
    }
}
