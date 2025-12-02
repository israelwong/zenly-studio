'use server'
import { Notificacion } from '../../types';
import { prisma } from '@/lib/prisma';

export async function obtenerNotificaciones() {
    const notificaciones = await prisma.notificacion.findMany({
        where: {
            status: {
                not: 'oculta'
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    // Para cada notificación, obtener el eventoId si tiene cotizacionId
    const notificacionesConEvento = await Promise.all(
        notificaciones.map(async (notif) => {
            if (notif.cotizacionId) {
                const cotizacion = await prisma.cotizacion.findUnique({
                    where: { id: notif.cotizacionId },
                    select: { eventoId: true }
                })
                return {
                    ...notif,
                    eventoId: cotizacion?.eventoId
                }
            }
            return notif
        })
    )

    return notificacionesConEvento
}

export async function crearNotificacion(data: Notificacion) {
    return await prisma.notificacion.create({
        data: {
            userId: data.userId,
            titulo: data.titulo,
            mensaje: data.mensaje,
            tipo: data.tipo || 'general',
            metadata: data.metadata || null,
            status: 'pendiente',
            cotizacionId: data.cotizacionId
        }
    });
}

export async function marcarComoLeida(notificacionId: string) {
    try {
        return await prisma.notificacion.update({
            where: {
                id: notificacionId
            },
            data: {
                status: 'leida',
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        throw error;
    }
}

export async function ocultarNotificacion(notificacionId: string) {
    try {
        return await prisma.notificacion.update({
            where: {
                id: notificacionId
            },
            data: {
                status: 'oculta',
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error al ocultar notificación:', error);
        throw error;
    }
}

export async function marcarTodasComoLeidas() {
    try {
        return await prisma.notificacion.updateMany({
            where: {
                status: 'pendiente'
            },
            data: {
                status: 'leida',
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error al marcar todas como leídas:', error);
        throw error;
    }
}