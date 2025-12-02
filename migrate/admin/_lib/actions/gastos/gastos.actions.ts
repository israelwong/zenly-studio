'use server'
import { ServicioGasto } from "../../types";
import { prisma } from '@/lib/prisma';

export async function obtenerGastosPorServicio(servicioId: string): Promise<ServicioGasto[]> {
    const gastos = await prisma.servicioGasto.findMany({
        where: {
            servicioId
        }
    });

    return gastos.map(gasto => ({
        ...gasto,
        gastoId: gasto.id,
        nombre: gasto.nombre,
        monto: gasto.costo
    }));
}

export async function crearGasto(servicioId: string, nombre: string, monto: number) {
    await prisma.servicioGasto.create({
        data: {
            servicioId,
            nombre,
            costo: monto
        }
    });
}

export async function actualizarGasto(gastoId: string, nombre: string, monto: number) {
    return prisma.servicioGasto.update({
        where: {
            id: gastoId
        },
        data: {
            nombre,
            costo: monto
        }
    });
}

export async function eliminarGasto(gastoId: string) {
    return prisma.servicioGasto.delete({
        where: {
            id: gastoId
        }
    });
}

export async function eliminarGastos(servicioId: string) {

    try {
        const gastos = await prisma.servicioGasto.findMany({
            where: {
                servicioId
            }
        });

        if (gastos.length > 0) {
            await prisma.servicioGasto.deleteMany({
                where: {
                    servicioId
                }
            });
        }
    } catch (error) {
        console.error("Error eliminando gastos:", error);
        throw error;
    }
}