'use server';

import { prisma } from '@/lib/prisma';
import {
    CreateReglaAgendamiento,
    UpdateReglaAgendamiento,
    UpdateOrdenReglas,
    ReglaAgendamientoResponse,
    ReglasAgendamientoListResponse
} from '@/lib/actions/schemas/reglas-agendamiento-schemas';

// =============================================================================
// OBTENER REGLAS DE AGENDAMIENTO
// =============================================================================

/**
 * Obtiene todas las reglas de agendamiento de un proyecto
 */
export async function obtenerReglasAgendamiento(
    projectSlug: string
): Promise<ReglasAgendamientoListResponse> {
    try {
        // Buscar el proyecto por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: projectSlug },
            select: { id: true }
        });

        if (!studio) {
            return {
                success: false,
                error: 'Proyecto no encontrado'
            };
        }

        // Obtener reglas ordenadas por orden
        const reglas = await prisma.studio_reglas_agendamiento.findMany({
            where: { studio_id: studio.id },
            orderBy: { orden: 'asc' }
        });

        // Mapear los datos para asegurar compatibilidad de tipos
        const reglasMapeadas = reglas.map(regla => ({
            id: regla.id,
            studio_id: regla.studio_id,
            nombre: regla.nombre,
            descripcion: regla.descripcion || null,
            recurrencia: regla.recurrencia as 'por_dia' | 'por_hora',
            capacidadOperativa: regla.capacidadOperativa,
            status: regla.status as 'active' | 'inactive',
            orden: regla.orden,
            createdAt: regla.createdAt,
            updatedAt: regla.updatedAt
        }));

        return {
            success: true,
            data: reglasMapeadas
        };

    } catch (error) {
        console.error('Error al obtener reglas de agendamiento:', error);
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

// =============================================================================
// CREAR REGLA DE AGENDAMIENTO
// =============================================================================

/**
 * Crea una nueva regla de agendamiento
 */
export async function crearReglaAgendamiento(
    projectSlug: string,
    data: CreateReglaAgendamiento
): Promise<ReglaAgendamientoResponse> {
    try {
        // Buscar el proyecto por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: projectSlug },
            select: { id: true }
        });

        if (!studio) {
            return {
                success: false,
                error: 'Proyecto no encontrado'
            };
        }

        // Obtener el siguiente orden
        const maxOrden = await prisma.studio_reglas_agendamiento.findFirst({
            where: { studio_id: studio.id },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });

        const siguienteOrden = (maxOrden?.orden || 0) + 1;

        // Crear la regla
        const regla = await prisma.studio_reglas_agendamiento.create({
            data: {
                ...data,
                studio_id: studio.id,
                orden: data.orden || siguienteOrden
            }
        });

        return {
            success: true,
            data: regla
        };

    } catch (error) {
        console.error('Error al crear regla de agendamiento:', error);
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

// =============================================================================
// ACTUALIZAR REGLA DE AGENDAMIENTO
// =============================================================================

/**
 * Actualiza una regla de agendamiento existente
 */
export async function actualizarReglaAgendamiento(
    projectSlug: string,
    reglaId: string,
    data: UpdateReglaAgendamiento
): Promise<ReglaAgendamientoResponse> {
    try {
        // Buscar el proyecto por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: projectSlug },
            select: { id: true }
        });

        if (!studio) {
            return {
                success: false,
                error: 'Proyecto no encontrado'
            };
        }

        // Verificar que la regla pertenece al proyecto
        const reglaExistente = await prisma.studio_reglas_agendamiento.findFirst({
            where: {
                id: reglaId,
                studio_id: studio.id
            }
        });

        if (!reglaExistente) {
            return {
                success: false,
                error: 'Regla de agendamiento no encontrada'
            };
        }

        // Actualizar la regla
        const regla = await prisma.studio_reglas_agendamiento.update({
            where: { id: reglaId },
            data: {
                ...data,
                updated_at: new Date()
            }
        });

        return {
            success: true,
            data: regla
        };

    } catch (error) {
        console.error('Error al actualizar regla de agendamiento:', error);
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

// =============================================================================
// ELIMINAR REGLA DE AGENDAMIENTO
// =============================================================================

/**
 * Elimina una regla de agendamiento
 */
export async function eliminarReglaAgendamiento(
    projectSlug: string,
    reglaId: string
): Promise<ReglaAgendamientoResponse> {
    try {
        // Buscar el proyecto por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: projectSlug },
            select: { id: true }
        });

        if (!studio) {
            return {
                success: false,
                error: 'Proyecto no encontrado'
            };
        }

        // Verificar que la regla pertenece al proyecto
        const reglaExistente = await prisma.studio_reglas_agendamiento.findFirst({
            where: {
                id: reglaId,
                studio_id: studio.id
            }
        });

        if (!reglaExistente) {
            return {
                success: false,
                error: 'Regla de agendamiento no encontrada'
            };
        }

        // Eliminar la regla
        await prisma.studio_reglas_agendamiento.delete({
            where: { id: reglaId }
        });

        return {
            success: true,
            data: { id: reglaId }
        };

    } catch (error) {
        console.error('Error al eliminar regla de agendamiento:', error);
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}

// =============================================================================
// ACTUALIZAR ORDEN DE REGLAS
// =============================================================================

/**
 * Actualiza el orden de las reglas de agendamiento
 */
export async function actualizarOrdenReglasAgendamiento(
    projectSlug: string,
    reglas: UpdateOrdenReglas
): Promise<ReglaAgendamientoResponse> {
    try {
        // Buscar el proyecto por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: projectSlug },
            select: { id: true }
        });

        if (!studio) {
            return {
                success: false,
                error: 'Proyecto no encontrado'
            };
        }

        // Actualizar el orden de cada regla
        await prisma.$transaction(
            reglas.map(regla =>
                prisma.studio_reglas_agendamiento.update({
                    where: {
                        id: regla.id,
                        studio_id: studio.id
                    },
                    data: {
                        orden: regla.orden,
                        updated_at: new Date()
                    }
                })
            )
        );

        return {
            success: true,
            data: { updated: reglas.length }
        };

    } catch (error) {
        console.error('Error al actualizar orden de reglas:', error);
        return {
            success: false,
            error: 'Error interno del servidor'
        };
    }
}
