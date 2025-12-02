'use server'

import { prisma } from '@/lib/prisma';
import {
    ActualizarEventoBasicoSchema,
    CambiarEtapaEventoSchema,
    AsignarUsuarioEventoSchema,
    type ActualizarEventoBasico,
    type CambiarEtapaEvento,
    type AsignarUsuarioEvento,
    type EventoEtapa
} from './eventoManejo.schemas'

/**
 * Actualizar tipo de evento
 */
export async function actualizarTipoEvento(eventoId: string, eventoTipoId: string | null): Promise<boolean> {
    await prisma.evento.update({
        where: { id: eventoId },
        data: {
            eventoTipoId: eventoTipoId
        }
    })
    return true
}

/**
 * Actualizar información básica del evento
 */
export async function actualizarEventoBasico(data: ActualizarEventoBasico): Promise<boolean> {
    const validatedData = ActualizarEventoBasicoSchema.parse(data)

    await prisma.evento.update({
        where: { id: validatedData.id },
        data: {
            nombre: validatedData.nombre,
            fecha_evento: validatedData.fecha_evento,
            sede: validatedData.sede,
            direccion: validatedData.direccion,
            status: validatedData.status
        }
    })

    return true
}

/**
 * Asignar usuario al evento
 */
export async function asignarUsuarioEvento(data: AsignarUsuarioEvento): Promise<boolean> {
    const validatedData = AsignarUsuarioEventoSchema.parse(data)

    await prisma.evento.update({
        where: { id: validatedData.eventoId },
        data: {
            userId: validatedData.userId
        }
    })

    return true
}

/**
 * Liberar usuario del evento
 */
export async function liberarUsuarioEvento(eventoId: string): Promise<boolean> {
    await prisma.evento.update({
        where: { id: eventoId },
        data: {
            userId: null
        }
    })

    return true
}

/**
 * Cambiar etapa del evento
 */
export async function cambiarEtapaEvento(data: CambiarEtapaEvento): Promise<boolean> {
    const validatedData = CambiarEtapaEventoSchema.parse(data)

    await prisma.evento.update({
        where: { id: validatedData.eventoId },
        data: {
            eventoEtapaId: validatedData.etapaId
        }
    })

    // Crear entrada en bitácora
    await prisma.eventoBitacora.create({
        data: {
            eventoId: validatedData.eventoId,
            comentario: `Evento movido a nueva etapa`
        }
    })

    return true
}

/**
 * Obtener todas las etapas disponibles
 */
export async function obtenerEtapasEvento(): Promise<EventoEtapa[]> {
    const etapas = await prisma.eventoEtapa.findMany({
        orderBy: {
            posicion: 'asc'
        },
        select: {
            id: true,
            nombre: true,
            posicion: true
        }
    })

    return etapas
}

/**
 * Obtener etapas filtradas por posición
 */
export async function obtenerEtapasPorPosicion(posiciones: number[]): Promise<EventoEtapa[]> {
    const etapas = await prisma.eventoEtapa.findMany({
        where: {
            posicion: {
                in: posiciones
            }
        },
        orderBy: {
            posicion: 'asc'
        },
        select: {
            id: true,
            nombre: true,
            posicion: true
        }
    })

    return etapas
}
