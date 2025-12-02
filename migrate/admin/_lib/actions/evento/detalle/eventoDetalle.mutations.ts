'use server'
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function actualizarCliente(clienteId: string, data: {
    nombre: string;
    telefono?: string;
    email?: string;
}) {
    try {
        await prisma.cliente.update({
            where: { id: clienteId },
            data: {
                nombre: data.nombre,
                telefono: data.telefono || null,
                email: data.email || null
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error actualizando cliente:', error);
        return { error: 'Error al actualizar cliente' };
    }
}

export async function actualizarEventoDetalle(eventoId: string, data: {
    nombre: string;
    fecha_evento: Date;
    sede?: string;
    direccion?: string;
}) {
    try {
        await prisma.evento.update({
            where: { id: eventoId },
            data: {
                nombre: data.nombre,
                fecha_evento: data.fecha_evento,
                sede: data.sede || null,
                direccion: data.direccion || null
            }
        });
        revalidatePath(`/admin/dashboard/eventos/${eventoId}`);
        return { success: true };
    } catch (error) {
        console.error('Error actualizando evento:', error);
        return { error: 'Error al actualizar evento' };
    }
}

export async function crearBitacoraNota(eventoId: string, data: {
    comentario: string;
    importancia: string;
}) {
    try {
        await prisma.eventoBitacora.create({
            data: {
                eventoId,
                comentario: data.comentario,
                importancia: data.importancia
            }
        });
        revalidatePath(`/admin/dashboard/eventos/${eventoId}`);
        return { success: true };
    } catch (error) {
        console.error('Error creando nota bitácora:', error);
        return { error: 'Error al crear nota' };
    }
}

export async function crearCotizacion(eventoId: string, data: {
    nombre: string;
    tipo: 'plantilla' | 'personalizada';
    paqueteId?: string;
}) {
    try {
        // Obtener evento para eventoTipoId
        const evento = await prisma.evento.findUnique({
            where: { id: eventoId },
            select: { eventoTipoId: true }
        });

        if (!evento?.eventoTipoId) {
            return { error: 'Evento no tiene tipo asignado' };
        }

        const cotizacion = await prisma.cotizacion.create({
            data: {
                eventoId,
                eventoTipoId: evento.eventoTipoId,
                nombre: data.nombre,
                precio: 0, // Se calculará después
                status: 'pending'
            }
        });

        revalidatePath(`/admin/dashboard/eventos/${eventoId}`);
        return { success: true, cotizacionId: cotizacion.id };
    } catch (error) {
        console.error('Error creando cotización:', error);
        return { error: 'Error al crear cotización' };
    }
}
