'use server'
import { prisma } from '@/lib/prisma';
import { ClienteCompletoSchema } from './eventoDetalleCompleto.schemas';
import { revalidatePath } from 'next/cache';

export async function actualizarClienteCompleto(clienteId: string, data: {
    nombre?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    status?: string;
    canalId?: string | null;
}) {
    try {
        // Validar data
        const validatedData = ClienteCompletoSchema.parse(data);

        // Actualizar cliente
        const clienteActualizado = await prisma.cliente.update({
            where: { id: clienteId },
            data: validatedData,
            include: {
                Canal: { select: { id: true, nombre: true } }
            }
        });

        revalidatePath('/admin/dashboard/eventos');
        return { success: true, cliente: clienteActualizado };
    } catch (error) {
        console.error('Error actualizando cliente completo:', error);
        return { success: false, error: 'Error al actualizar el cliente' };
    }
}

export async function actualizarEventoCompleto(eventoId: string, data: {
    nombre?: string;
    fecha_evento?: string;
    sede?: string;
    direccion?: string;
    status?: string;
    userId?: string | null;
    eventoEtapaId?: string | null;
    eventoTipoId?: string | null;
}) {
    try {
        // Actualizar evento
        const eventoActualizado = await prisma.evento.update({
            where: { id: eventoId },
            data: {
                ...data,
                fecha_evento: data.fecha_evento ? new Date(data.fecha_evento) : undefined
            },
            include: {
                EventoTipo: { select: { id: true, nombre: true } },
                EventoEtapa: { select: { id: true, nombre: true, posicion: true } },
                User: { select: { id: true, username: true } }
            }
        });

        revalidatePath('/admin/dashboard/eventos');
        return { success: true, evento: eventoActualizado };
    } catch (error) {
        console.error('Error actualizando evento completo:', error);
        return { success: false, error: 'Error al actualizar el evento' };
    }
}

export async function asignarEtapaEvento(eventoId: string, etapaId: string, userId?: string) {
    try {
        const eventoActualizado = await prisma.evento.update({
            where: { id: eventoId },
            data: {
                eventoEtapaId: etapaId,
                userId: userId || null
            },
            include: {
                EventoEtapa: { select: { id: true, nombre: true, posicion: true } },
                User: { select: { id: true, username: true } }
            }
        });

        // Registrar en bitácora
        await prisma.eventoBitacora.create({
            data: {
                eventoId,
                comentario: `Evento asignado a etapa: ${eventoActualizado.EventoEtapa?.nombre}${userId ? ` y usuario: ${eventoActualizado.User?.username}` : ''}`,
                importancia: 'informativo',
                status: 'leida'
            }
        });

        revalidatePath('/admin/dashboard/eventos');
        return { success: true, evento: eventoActualizado };
    } catch (error) {
        console.error('Error asignando etapa:', error);
        return { success: false, error: 'Error al asignar etapa' };
    }
}

export async function crearBitacoraCompleta(eventoId: string, data: {
    comentario: string;
    importancia: 'bajo' | 'medio' | 'alto' | 'informativo';
}) {
    try {
        const nuevaBitacora = await prisma.eventoBitacora.create({
            data: {
                eventoId,
                comentario: data.comentario,
                importancia: data.importancia,
                status: 'leida'
            }
        });

        revalidatePath('/admin/dashboard/eventos');
        return { success: true, bitacora: nuevaBitacora };
    } catch (error) {
        console.error('Error creando entrada de bitácora:', error);
        return { success: false, error: 'Error al crear entrada de bitácora' };
    }
}

export async function actualizarBitacora(bitacoraId: string, data: {
    comentario?: string;
    importancia?: 'bajo' | 'medio' | 'alto' | 'informativo';
    status?: 'leida' | 'pendiente';
}) {
    try {
        const bitacoraActualizada = await prisma.eventoBitacora.update({
            where: { id: bitacoraId },
            data
        });

        revalidatePath('/admin/dashboard/eventos');
        return { success: true, bitacora: bitacoraActualizada };
    } catch (error) {
        console.error('Error actualizando bitácora:', error);
        return { success: false, error: 'Error al actualizar entrada de bitácora' };
    }
}

export async function eliminarBitacora(bitacoraId: string) {
    try {
        await prisma.eventoBitacora.delete({
            where: { id: bitacoraId }
        });

        revalidatePath('/admin/dashboard/eventos');
        return { success: true };
    } catch (error) {
        console.error('Error eliminando bitácora:', error);
        return { success: false, error: 'Error al eliminar entrada de bitácora' };
    }
}

export async function crearCotizacionCompleta(eventoId: string, data: {
    nombre: string;
    precio: number;
    paqueteId?: string | null;
    eventoTipoId: string; // Asegúrate de que este campo se pase al llamar la función
}) {
    try {
        const nuevaCotizacion = await prisma.cotizacion.create({
            data: {
                eventoId,
                nombre: data.nombre,
                precio: data.precio,
                status: 'borrador',
                eventoTipoId: data.eventoTipoId
            }
        });

        revalidatePath('/admin/dashboard/eventos');
        return { success: true, cotizacion: nuevaCotizacion };
    } catch (error) {
        console.error('Error creando cotización:', error);
        return { success: false, error: 'Error al crear cotización' };
    }
}

export async function actualizarCotizacion(cotizacionId: string, data: {
    nombre?: string;
    precio?: number;
    status?: string;
}) {
    try {
        const cotizacionActualizada = await prisma.cotizacion.update({
            where: { id: cotizacionId },
            data
        });

        revalidatePath('/admin/dashboard/eventos');
        return { success: true, cotizacion: cotizacionActualizada };
    } catch (error) {
        console.error('Error actualizando cotización:', error);
        return { success: false, error: 'Error al actualizar cotización' };
    }
}
