'use server'
import { prisma } from '@/lib/prisma';

export async function obtenerEventoEtapas() {
    return await prisma.eventoEtapa.findMany({
        orderBy: {
            posicion: 'asc'
        }
    });
}

export async function obtenerEventoEtapa(etapaId: string) {
    return await prisma.eventoEtapa.findFirst({
        where: {
            id: etapaId
        }
    });
}

export async function obtenerEtapa1() {
    const etapa = await prisma.eventoEtapa.findFirst({
        where: {
            posicion: 1
        }
    });
    return etapa?.id;
}

export async function obtenerEtapa2() {
    const etapa = await prisma.eventoEtapa.findFirst({
        where: {
            posicion: 2
        }
    });
    return { etapaId: etapa?.id };
}

export async function obtenerEtapasFiltradas(posiciones: number[]) {
    return await prisma.eventoEtapa.findMany({
        where: {
            posicion: {
                in: posiciones
            }
        },
        orderBy: {
            posicion: 'asc'
        }
    });
}