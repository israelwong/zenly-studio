// Ruta: src/lib/actions/studio/config/metodos-pago.actions.ts

'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MetodoPagoSchema, TransferConfigSchema, type MetodoPagoForm, type TransferConfigForm } from "@/lib/actions/schemas/metodos-pago-schemas";

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
            banco: validationResult.data.banco || null,
            beneficiario: validationResult.data.beneficiario || null,
            cuenta_clabe: validationResult.data.cuenta_clabe || null,
            is_manual: validationResult.data.is_manual ?? true,
            available_for_quotes: validationResult.data.available_for_quotes ?? false,
            updated_at: new Date(),
        };

        const nuevoMetodo = await prisma.studio_metodos_pago.create({
            data: dataToSave,
        });

        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/metodos-pago`);

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

        const dataToSave: {
            payment_method_name?: string;
            base_commission_percentage?: number | null;
            fixed_commission_amount?: number | null;
            payment_method?: string;
            status?: string;
            order?: number;
            banco?: string | null;
            beneficiario?: string | null;
            cuenta_clabe?: string | null;
            is_manual?: boolean;
            available_for_quotes?: boolean;
            updated_at: Date;
        } = {
            updated_at: new Date(),
        };

        if (validationResult.data.metodo_pago !== undefined) dataToSave.payment_method_name = validationResult.data.metodo_pago;
        if (validationResult.data.comision_porcentaje_base !== undefined) dataToSave.base_commission_percentage = validationResult.data.comision_porcentaje_base ? parseFloat(validationResult.data.comision_porcentaje_base) : null;
        if (validationResult.data.comision_fija_monto !== undefined) dataToSave.fixed_commission_amount = validationResult.data.comision_fija_monto ? parseFloat(validationResult.data.comision_fija_monto) : null;
        if (validationResult.data.payment_method !== undefined) dataToSave.payment_method = validationResult.data.payment_method;
        if (validationResult.data.status !== undefined) dataToSave.status = validationResult.data.status;
        if (validationResult.data.orden !== undefined) dataToSave.order = validationResult.data.orden;
        if (validationResult.data.banco !== undefined) dataToSave.banco = validationResult.data.banco || null;
        if (validationResult.data.beneficiario !== undefined) dataToSave.beneficiario = validationResult.data.beneficiario || null;
        if (validationResult.data.cuenta_clabe !== undefined) dataToSave.cuenta_clabe = validationResult.data.cuenta_clabe || null;
        if (validationResult.data.is_manual !== undefined) dataToSave.is_manual = validationResult.data.is_manual;
        if (validationResult.data.available_for_quotes !== undefined) dataToSave.available_for_quotes = validationResult.data.available_for_quotes;

        const metodoActualizado = await prisma.studio_metodos_pago.update({
            where: { id: metodoId },
            data: dataToSave,
        });

        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/metodos-pago`);

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

        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/metodos-pago`);

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

        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/metodos-pago`);

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

// Obtener métodos de pago manuales (para pagos directos)
export async function obtenerMetodosPagoManuales(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const metodos = await prisma.studio_metodos_pago.findMany({
            where: {
                studio_id: studio.id,
                is_manual: true,
                status: "active",
            },
            orderBy: { order: 'asc' },
        });

        // Filtrar transferencia: solo si está configurada
        const metodosDisponibles = metodos.filter(metodo => {
            if (metodo.payment_method === "transferencia") {
                return !!(metodo.banco && metodo.beneficiario && metodo.cuenta_clabe);
            }
            return true;
        });

        return {
            success: true,
            data: metodosDisponibles,
        };
    } catch (error) {
        console.error("Error al obtener métodos de pago manuales:", error);
        return {
            success: false,
            error: "Error al obtener métodos de pago manuales",
        };
    }
}

// Obtener métodos de pago para cotizaciones (prospectos)
export async function obtenerMetodosPagoParaCotizaciones(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const metodos = await prisma.studio_metodos_pago.findMany({
            where: {
                studio_id: studio.id,
                available_for_quotes: true,
                status: "active",
                payment_method: { not: "cash" }, // Excluir efectivo
            },
            orderBy: { order: 'asc' },
        });

        // Filtrar transferencia: solo si está configurada
        const metodosDisponibles = metodos.filter(metodo => {
            if (metodo.payment_method === "transferencia") {
                return !!(metodo.banco && metodo.beneficiario && metodo.cuenta_clabe);
            }
            return true;
        });

        return {
            success: true,
            data: metodosDisponibles,
        };
    } catch (error) {
        console.error("Error al obtener métodos de pago para cotizaciones:", error);
        return {
            success: false,
            error: "Error al obtener métodos de pago para cotizaciones",
        };
    }
}

// Configurar transferencia bancaria
export async function configurarTransferencia(
    studioSlug: string,
    metodoId: string,
    config: TransferConfigForm
): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
        const validationResult = TransferConfigSchema.safeParse(config);

        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.flatten().fieldErrors.cuenta_clabe?.[0] || "Datos inválidos",
            };
        }

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        // Verificar que el método existe y es de transferencia
        const metodo = await prisma.studio_metodos_pago.findFirst({
            where: {
                id: metodoId,
                studio_id: studio.id,
                payment_method: "transferencia",
            },
        });

        if (!metodo) {
            return { success: false, error: "Método de transferencia no encontrado" };
        }

        // Actualizar configuración y activar método
        const metodoActualizado = await prisma.studio_metodos_pago.update({
            where: { id: metodoId },
            data: {
                banco: validationResult.data.banco,
                beneficiario: validationResult.data.beneficiario,
                cuenta_clabe: validationResult.data.cuenta_clabe,
                status: "active", // Activar automáticamente cuando se configura
                updated_at: new Date(),
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/events`);
        revalidatePath(`/${studioSlug}/studio/configuracion/negocio/metodos-pago`);

        return {
            success: true,
            data: metodoActualizado,
        };
    } catch (error) {
        console.error("Error al configurar transferencia:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al configurar transferencia",
        };
    }
}

// Verificar métodos sin configurar
export async function verificarMetodosSinConfigurar(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const metodos = await prisma.studio_metodos_pago.findMany({
            where: {
                studio_id: studio.id,
                payment_method: "transferencia",
            },
        });

        const metodosSinConfigurar = metodos.filter(
            metodo => !metodo.banco || !metodo.beneficiario || !metodo.cuenta_clabe
        );

        return {
            success: true,
            data: metodosSinConfigurar,
            count: metodosSinConfigurar.length,
        };
    } catch (error) {
        console.error("Error al verificar métodos sin configurar:", error);
        return {
            success: false,
            error: "Error al verificar métodos sin configurar",
            count: 0,
        };
    }
}
