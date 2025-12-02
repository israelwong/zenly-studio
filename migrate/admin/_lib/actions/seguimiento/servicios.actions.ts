'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Asigna un usuario a un servicio específico de una cotización.
 * @param servicioId - El ID del CotizacionServicio.
 * @param userId - El ID del User a asignar.
 * @param eventoId - El ID del Evento para revalidar la ruta correcta.
 */
export async function asignarUsuarioAServicio(servicioId: string, userId: string, eventoId: string) {
    try {
        // console.log('🔄 [SERVER] Iniciando asignación:', { servicioId, userId, eventoId });

        const resultado = await prisma.cotizacionServicio.update({
            where: { id: servicioId },
            data: {
                userId: userId,
                fechaAsignacion: new Date()
            },
        });

        // console.log('✅ [SERVER] Usuario asignado exitosamente:', resultado);

        // Revalida la página de detalle del evento para reflejar el cambio.
        // console.log('🔄 [SERVER] Revalidando ruta:', `/admin/dashboard/seguimiento/${eventoId}`);
        revalidatePath(`/admin/dashboard/seguimiento/${eventoId}`);

        // console.log('✅ [SERVER] Ruta revalidada');
        return resultado;
    } catch (error) {
        console.error('❌ [SERVER] Error al asignar usuario al servicio:', error);
        throw new Error('No se pudo asignar el usuario.');
    }
}

/**
 * Remueve la asignación de un usuario de un servicio.
 * @param servicioId - El ID del CotizacionServicio.
 * @param eventoId - El ID del Evento para revalidar la ruta correcta.
 */
export async function removerUsuarioDeServicio(servicioId: string, eventoId: string) {
    try {
        // console.log('🔄 [SERVER] Removiendo asignación:', { servicioId, eventoId });

        const resultado = await prisma.cotizacionServicio.update({
            where: { id: servicioId },
            // Establece el userId a null para remover la asignación.
            data: {
                userId: null,
                fechaAsignacion: null
            },
        });

        // console.log('✅ [SERVER] Asignación removida exitosamente:', resultado);

        // Revalida la página de detalle del evento para reflejar el cambio.
        // console.log('🔄 [SERVER] Revalidando ruta:', `/admin/dashboard/seguimiento/${eventoId}`);
        revalidatePath(`/admin/dashboard/seguimiento/${eventoId}`);

        console.log('✅ [SERVER] Ruta revalidada');
        return resultado;
    } catch (error) {
        console.error('❌ [SERVER] Error al remover asignación de usuario:', error);
        throw new Error('No se pudo remover la asignación.');
    }
}
