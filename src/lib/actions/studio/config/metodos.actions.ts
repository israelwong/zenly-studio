// Ruta: src/lib/actions/studio/config/metodos.actions.ts

'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MetodoPagoSchema, type MetodoPagoForm } from "@/lib/actions/schemas/metodos-schemas";

// Obtener todos los métodos de pago de un studio
export async function obtenerMetodosPago(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const metodos = await prisma.studio_metodos_pago.findMany({
            where: { studio_id: studio.id },
            orderBy: { order: 'asc' },
        });

        return {
            success: true,
            data: metodos,
        };
    } catch (error) {
        console.error("Error al obtener métodos de pago:", error);
        return {
            success: false,
            error: "Error al obtener métodos de pago",
        };
    }
}

// Obtener un método de pago específico
export async function obtenerMetodoPago(studioSlug: string, metodoId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const metodo = await prisma.studio_metodos_pago.findFirst({
            where: {
                id: metodoId,
                studio_id: studio.id,
            },
        });

        if (!metodo) {
            throw new Error("Método de pago no encontrado");
        }

        return {
            success: true,
            data: metodo,
        };
    } catch (error) {
        console.error("Error al obtener método de pago:", error);
        return {
            success: false,
            error: "Error al obtener método de pago",
        };
    }
}

// Crear nuevo método de pago
export async function crearMetodoPago(studioSlug: string, data: MetodoPagoForm) {
    try {
        const validationResult = MetodoPagoSchema.safeParse(data);

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
            payment_method_name: validationResult.data.metodo_pago,
            base_commission_percentage: validationResult.data.comision_porcentaje_base ? parseFloat(validationResult.data.comision_porcentaje_base) : null,
            fixed_commission_amount: validationResult.data.comision_fija_monto ? parseFloat(validationResult.data.comision_fija_monto) : null,
            payment_method: validationResult.data.payment_method,
            status: validationResult.data.status,
            order: validationResult.data.orden || 0,
            updated_at: new Date(),
        };

        const nuevoMetodo = await prisma.studio_metodos_pago.create({
            data: dataToSave,
        });

        revalidatePath(`/${studioSlug}/studio/app/configuracion/pagos/metodos`);

        return {
            success: true,
            data: nuevoMetodo,
        };
    } catch (error) {
        console.error("Error al crear método de pago:", error);
        return {
            success: false,
            error: "Error al crear método de pago",
        };
    }
}

// Actualizar método de pago
export async function actualizarMetodoPago(studioSlug: string, metodoId: string, data: MetodoPagoForm) {
    try {
        const validationResult = MetodoPagoSchema.safeParse(data);

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
            payment_method_name: validationResult.data.metodo_pago,
            base_commission_percentage: validationResult.data.comision_porcentaje_base ? parseFloat(validationResult.data.comision_porcentaje_base) : null,
            fixed_commission_amount: validationResult.data.comision_fija_monto ? parseFloat(validationResult.data.comision_fija_monto) : null,
            payment_method: validationResult.data.payment_method,
            status: validationResult.data.status,
            order: validationResult.data.orden || 0,
            updated_at: new Date(),
        };

        const metodoActualizado = await prisma.studio_metodos_pago.update({
            where: { id: metodoId },
            data: dataToSave,
        });

        revalidatePath(`/${studioSlug}/studio/app/configuracion/pagos/metodos`);

        return {
            success: true,
            data: metodoActualizado,
        };
    } catch (error) {
        console.error("Error al actualizar método de pago:", error);
        return {
            success: false,
            error: "Error al actualizar método de pago",
        };
    }
}

// Eliminar método de pago
export async function eliminarMetodoPago(studioSlug: string, metodoId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        await prisma.studio_metodos_pago.delete({
            where: { id: metodoId },
        });

        revalidatePath(`/${studioSlug}/studio/app/configuracion/pagos/metodos`);

        return {
            success: true,
            message: "Método de pago eliminado exitosamente",
        };
    } catch (error) {
        console.error("Error al eliminar método de pago:", error);
        return {
            success: false,
            error: "Error al eliminar método de pago",
        };
    }
}

// Actualizar orden de métodos de pago
export async function actualizarOrdenMetodosPago(studioSlug: string, metodos: { id: string; orden: number }[]) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        await prisma.$transaction(
            metodos.map(metodo =>
                prisma.studio_metodos_pago.update({
                    where: { id: metodo.id },
                    data: { order: metodo.orden, updated_at: new Date() },
                })
            )
        );

        revalidatePath(`/${studioSlug}/studio/app/configuracion/pagos/metodos`);

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
