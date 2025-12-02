'use server'
import { prisma } from '@/lib/prisma';

export async function registrarVisita(cotizacionId: string) {
    await prisma.cotizacionVisita.create({
        data: {
            cotizacionId
        }
    })
}

export async function obtenerConteoCotizacionVisitas(cotizacionId: string) {
    const count = await prisma.cotizacionVisita.count({
        where: {
            cotizacionId
        },
    });
    return count;
}