'use server'
import { prisma } from '@/lib/prisma';

export async function conteo() {
    const seguimiento = await prisma.evento.count({
        where: {
            OR: [
                { status: 'seguimiento' },
                { status: 'nuevo' }
            ]
        }
    });

    const aprobados = await prisma.evento.count({
        where: {
            status: 'aprobado',
        }
    });
    return { seguimiento, aprobados };
}

//no la ocupo
export async function obtenerConteoEventosPorEtapa(posiciones: number[]) {

    const etapas = await prisma.eventoEtapa.findMany({
        where: {
            posicion: {
                in: posiciones
            }
        },
        select: {
            id: true
        }
    });
    console.log(etapas)

    const etapaIds = etapas.map(etapa => etapa.id);

    const eventosPorEtapa = await prisma.evento.groupBy({
        by: ['eventoEtapaId'],
        _count: {
            id: true
        },
        where: {
            eventoEtapaId: {
                in: etapaIds
            }
        }
    });

    return eventosPorEtapa;
}

//no la ocupo
export async function obtenerIdsEventoEtapaPorPosicion(posiciones: number[]) {
    const etapas = await prisma.eventoEtapa.findMany({
        where: {
            posicion: {
                in: posiciones
            }
        },
        select: {
            id: true
        }
    });

    return etapas.map(etapa => etapa.id);
}