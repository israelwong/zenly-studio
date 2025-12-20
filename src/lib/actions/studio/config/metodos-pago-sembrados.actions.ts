// Ruta: src/lib/actions/studio/config/metodos-pago-sembrados.actions.ts

'use server';

import { prisma } from "@/lib/prisma";

// Métodos de pago básicos que se siembran automáticamente
const METODOS_PAGO_BASICOS = [
    {
        payment_method_name: "Efectivo",
        payment_method: "cash",
        base_commission_percentage: 0,
        fixed_commission_amount: 0,
        is_manual: true,
        available_for_quotes: false, // NO disponible en cotizaciones para prospectos
        status: "active",
        order: 1,
        banco: null,
        beneficiario: null,
        cuenta_clabe: null,
    },
    {
        payment_method_name: "Transferencia a cuenta del negocio",
        payment_method: "transferencia",
        base_commission_percentage: 0,
        fixed_commission_amount: 0,
        is_manual: true,
        available_for_quotes: true, // SÍ disponible en cotizaciones para prospectos
        status: "inactive", // Inactivo hasta que se configure (banco, beneficiario, CLABE)
        order: 2,
        banco: null, // Requiere configuración
        beneficiario: null,
        cuenta_clabe: null,
    },
];

// Sembrar métodos de pago básicos para un studio (por ID)
export async function sembrarMetodosPagoBasicos(studio_id: string) {
    try {
        // Verificar si ya existen métodos para este studio
        const metodosExistentes = await prisma.studio_metodos_pago.findFirst({
            where: { studio_id },
        });

        if (metodosExistentes) {
            return {
                success: true,
                message: "Los métodos de pago básicos ya están configurados para este studio",
            };
        }

        // Crear métodos básicos
        await prisma.studio_metodos_pago.createMany({
            data: METODOS_PAGO_BASICOS.map(metodo => ({
                studio_id,
                payment_method_name: metodo.payment_method_name,
                payment_method: metodo.payment_method,
                base_commission_percentage: metodo.base_commission_percentage,
                fixed_commission_amount: metodo.fixed_commission_amount,
                is_manual: metodo.is_manual,
                available_for_quotes: metodo.available_for_quotes,
                status: metodo.status,
                order: metodo.order,
                banco: metodo.banco,
                beneficiario: metodo.beneficiario,
                cuenta_clabe: metodo.cuenta_clabe,
                updated_at: new Date(),
            })),
        });

        return {
            success: true,
            message: "Métodos de pago básicos sembrados exitosamente",
        };
    } catch (error) {
        console.error("Error al sembrar métodos de pago básicos:", error);
        return {
            success: false,
            error: "Error al sembrar métodos de pago básicos",
        };
    }
}

// Verificar si un studio tiene métodos de pago configurados
export async function verificarMetodosPagoConfigurados(studio_id: string) {
    try {
        const metodosExistentes = await prisma.studio_metodos_pago.findFirst({
            where: { studio_id },
        });

        return {
            success: true,
            configurados: !!metodosExistentes,
        };
    } catch (error) {
        console.error("Error al verificar métodos de pago:", error);
        return {
            success: false,
            error: "Error al verificar métodos de pago",
        };
    }
}

// Obtener métodos de pago activos de un studio
export async function obtenerMetodosPagoActivos(studio_id: string) {
    try {
        const metodos = await prisma.studio_metodos_pago.findMany({
            where: {
                studio_id,
                status: "active",
            },
            orderBy: { order: 'asc' },
        });

        return {
            success: true,
            data: metodos,
        };
    } catch (error) {
        console.error("Error al obtener métodos de pago activos:", error);
        return {
            success: false,
            error: "Error al obtener métodos de pago activos",
        };
    }
}

// Sembrar métodos de pago básicos para un studio (por slug)
export async function sembrarMetodosPagoBasicosPorSlug(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado",
            };
        }

        return await sembrarMetodosPagoBasicos(studio.id);
    } catch (error) {
        console.error("Error al sembrar métodos de pago por slug:", error);
        return {
            success: false,
            error: "Error al sembrar métodos de pago",
        };
    }
}
