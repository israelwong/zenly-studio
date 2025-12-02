'use server'

import { prisma } from '@/lib/prisma';
import {
    CrearBitacoraSchema,
    ActualizarBitacoraSchema,
    type CrearBitacora,
    type ActualizarBitacora,
    type BitacoraCompleta
} from './bitacora.schemas'

/**
 * Crear nueva entrada de bitácora
 */
export async function crearBitacora(data: CrearBitacora): Promise<BitacoraCompleta> {
    const validatedData = CrearBitacoraSchema.parse(data)

    const bitacora = await prisma.eventoBitacora.create({
        data: {
            eventoId: validatedData.eventoId,
            comentario: validatedData.comentario
        }
    })

    return {
        id: bitacora.id,
        eventoId: bitacora.eventoId,
        comentario: bitacora.comentario,
        createdAt: bitacora.createdAt,
        updatedAt: bitacora.updatedAt
    }
}

/**
 * Actualizar entrada de bitácora
 */
export async function actualizarBitacora(data: ActualizarBitacora): Promise<BitacoraCompleta> {
    const validatedData = ActualizarBitacoraSchema.parse(data)

    const bitacora = await prisma.eventoBitacora.update({
        where: { id: validatedData.id },
        data: {
            comentario: validatedData.comentario
        }
    })

    return {
        id: bitacora.id,
        eventoId: bitacora.eventoId,
        comentario: bitacora.comentario,
        createdAt: bitacora.createdAt,
        updatedAt: bitacora.updatedAt
    }
}

/**
 * Eliminar entrada de bitácora
 */
export async function eliminarBitacora(bitacoraId: string): Promise<void> {
    await prisma.eventoBitacora.delete({
        where: { id: bitacoraId }
    })
}

/**
 * Obtener bitácora por ID
 */
export async function obtenerBitacoraPorId(bitacoraId: string): Promise<BitacoraCompleta | null> {
    const bitacora = await prisma.eventoBitacora.findUnique({
        where: { id: bitacoraId }
    })

    if (!bitacora) return null

    return {
        id: bitacora.id,
        eventoId: bitacora.eventoId,
        comentario: bitacora.comentario,
        createdAt: bitacora.createdAt,
        updatedAt: bitacora.updatedAt
    }
}

/**
 * Eliminar entrada de bitácora con validación para FichaBitacoraUnificada
 */
export async function fichaBitacoraUnificadaEliminarBitacora(bitacoraId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Verificar primero si existe el registro
        const existingBitacora = await prisma.eventoBitacora.findUnique({
            where: { id: bitacoraId }
        });

        if (!existingBitacora) {
            return {
                success: false,
                error: 'La entrada de bitácora no existe o ya fue eliminada'
            };
        }

        // Proceder con la eliminación
        await prisma.eventoBitacora.delete({
            where: { id: bitacoraId }
        });

        return { success: true };
    } catch (error) {
        console.error('Error al eliminar bitácora:', error);
        return {
            success: false,
            error: 'Error interno al eliminar la entrada de bitácora'
        };
    }
}

// =============================================================================
// FUNCIONES MIGRADAS DESDE ARCHIVOS LEGACY
// =============================================================================

/**
 * Obtener todas las entradas de bitácora de un evento
 * MIGRADA desde @/app/admin/_lib/EventoBitacora.actions
 * Utilizada por: BitacoraSimple.tsx
 */
export async function obtenerEventoBitacora(eventoId: string) {
    try {
        const bitacora = await prisma.eventoBitacora.findMany({
            where: {
                eventoId
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        return bitacora;
    } catch (error) {
        console.error('Error obteniendo bitácora:', error);
        throw new Error('No se pudo obtener la bitácora del evento');
    }
}

/**
 * Crear bitácora evento - MIGRADA desde @/app/admin/_lib/EventoBitacora.actions
 * Función simple para crear entrada de bitácora con parámetros básicos
 * Utilizada por: BitacoraSimple.tsx
 */
export async function crearBitacoraEvento(eventoId: string, anotacion: string, importancia: string = 'informativo') {
    try {
        const bitacora = await prisma.eventoBitacora.create({
            data: {
                eventoId,
                comentario: anotacion,
                importancia: importancia
            }
        });
        return bitacora;
    } catch (error) {
        console.error('Error creando bitácora:', error);
        throw new Error('No se pudo crear la entrada de bitácora');
    }
}

/**
 * Eliminar entrada de bitácora por ID
 * MIGRADA desde @/app/admin/_lib/EventoBitacora.actions
 * Utilizada por: BitacoraSimple.tsx
 */
export async function eliminarBitacoraEvento(bitacoraId: string) {
    try {
        const bitacora = await prisma.eventoBitacora.delete({
            where: {
                id: bitacoraId
            }
        });
        return bitacora;
    } catch (error) {
        console.error('Error eliminando bitácora:', error);
        throw new Error('No se pudo eliminar la entrada de bitácora');
    }
}

/**
 * Actualizar entrada de bitácora
 * MIGRADA desde @/app/admin/_lib/EventoBitacora.actions
 * Utilizada por: BitacoraSimple.tsx
 */
export async function actualizarBitacoraEvento(bitacoraId: string, anotacion: string, importancia?: string) {
    try {
        const updateData: any = {
            comentario: anotacion
        };

        if (importancia) {
            updateData.importancia = importancia;
        }

        const bitacora = await prisma.eventoBitacora.update({
            where: {
                id: bitacoraId
            },
            data: updateData
        });
        return bitacora;
    } catch (error) {
        console.error('Error actualizando bitácora:', error);
        throw new Error('No se pudo actualizar la entrada de bitácora');
    }
}

/**
 * Crear bitácora evento - FUNCIÓN LEGACY
 * Función simple para crear entrada de bitácora con parámetros básicos
 * Utilizada por: FormEventoNuevoFinal
 */
export async function crearBitacoraEventoLegacy(eventoId: string, anotacion: string, importancia: string = 'informativo') {
    try {
        const bitacora = await prisma.eventoBitacora.create({
            data: {
                eventoId,
                comentario: anotacion,
                importancia: importancia
            }
        });
        return bitacora;
    } catch (error) {
        console.error('Error creando bitácora:', error);
        throw new Error('No se pudo crear la entrada de bitácora');
    }
}
