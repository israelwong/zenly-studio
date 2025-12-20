// Ruta: src/lib/actions/studio/config/metodos-sembrados.actions.ts

'use server';

import { prisma } from "@/lib/prisma";

// Métodos de pago básicos que se siembran automáticamente
const METODOS_PAGO_BASICOS = [
    {
        payment_method_name: "Efectivo",
        payment_method: "cash",
        comision_porcentaje_base: 0,
        comision_fija_monto: 0,
        tipo: "manual",
        requiere_stripe: false,
        status: "active",
        orden: 1,
    },
    {
        payment_method_name: "SPEI Directo",
        payment_method: "spei_directo",
        comision_porcentaje_base: 0,
        comision_fija_monto: 0,
        tipo: "manual",
        requiere_stripe: false,
        status: "active",
        orden: 2,
    },
    {
        payment_method_name: "Transferencia Bancaria",
        payment_method: "transferencia",
        comision_porcentaje_base: 0,
        comision_fija_monto: 0,
        tipo: "manual",
        requiere_stripe: false,
        status: "active",
        orden: 3,
    },
    {
        payment_method_name: "Depósito Bancario",
        payment_method: "deposito",
        comision_porcentaje_base: 0,
        comision_fija_monto: 0,
        tipo: "manual",
        requiere_stripe: false,
        status: "active",
        orden: 4,
    },
];

// Sembrar métodos de pago básicos para un studio
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
                ...metodo,
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
