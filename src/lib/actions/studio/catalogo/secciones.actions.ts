// ============================================
// ZENPRO V2 - CRUD SECCIONES
// ============================================
// Server Actions para gestión de secciones del catálogo
// Referencia: docs/uiux_catalogo/4 PROPUESTA_TECNICA_CATALOGO.md

"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================
// TYPES & SCHEMAS
// ============================================

const CreateSeccionSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
    description: z.string().optional(),
    order: z.number().int().min(0).default(0),
});

const UpdateSeccionSchema = z.object({
    id: z.string().cuid(),
    name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
    description: z.string().optional(),
    order: z.number().int().min(0),
});

type CreateSeccionInput = z.infer<typeof CreateSeccionSchema>;
type UpdateSeccionInput = z.infer<typeof UpdateSeccionSchema>;

export interface SeccionData {
    id: string;
    name: string;
    description: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    totalCategorias: number;
    totalItems: number;
    mediaSize: number;
    mediaCount: number;
    categories?: Array<{
        id: string;
        name: string;
    }>;
}

interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// ============================================
// QUERY: OBTENER SECCIONES CON STATS
// ============================================

/**
 * Obtiene todas las secciones con estadísticas agregadas
 * Incluye: total categorías, items, media size
 * 
 * @param studioSlug - Slug del studio
 * @returns Lista de secciones con estadísticas
 */
export async function obtenerSeccionesConStats(
    studioSlug: string
): Promise<ActionResponse<SeccionData[]>> {
    try {
        // 1. Obtener studio_id desde slug
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        // 2. Obtener secciones con categorías, items y media
        const secciones = await prisma.studio_service_sections.findMany({
            include: {
                section_categories: {
                    include: {
                        service_categories: {
                            include: {
                                items: {
                                    where: {
                                        studio_id: studio.id,
                                        status: "active",
                                    },
                                    select: { id: true },
                                },
                            },
                        },
                    },
                },
                section_media: {
                    where: { studio_id: studio.id },
                    select: {
                        id: true,
                        storage_bytes: true,
                        file_url: true,
                    },
                },
            },
            orderBy: { order: "asc" },
        });

        // 3. Mapear a formato SeccionData
        const seccionesData: SeccionData[] = secciones.map((seccion) => {
            const totalCategorias = seccion.section_categories.length;
            const totalItems = seccion.section_categories.reduce(
                (acc, sc) => acc + sc.service_categories.items.length,
                0
            );
            const mediaSize = seccion.section_media.reduce(
                (acc, media) => acc + Number(media.storage_bytes),
                0
            );
            const mediaCount = seccion.section_media.length;

            // Obtener coverImage (primer media con display_order 0)
            const coverMedia = seccion.section_media.find((m) => true); // Tomar el primero por ahora

            return {
                id: seccion.id,
                name: seccion.name,
                description: seccion.description,
                order: seccion.order,
                createdAt: seccion.created_at,
                updatedAt: seccion.updated_at,
                totalCategorias,
                totalItems,
                mediaSize,
                mediaCount,
                categories: seccion.section_categories.map((sc) => ({
                    id: sc.service_categories.id,
                    name: sc.service_categories.name,
                })),
            };
        });

        return {
            success: true,
            data: seccionesData,
        };
    } catch (error) {
        console.error("[SECCIONES] Error obteniendo secciones:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido",
        };
    }
}

// ============================================
// MUTATION: CREAR SECCIÓN
// ============================================

/**
 * Crea una nueva sección en el catálogo
 * 
 * @param studioSlug - Slug del studio
 * @param data - Datos de la nueva sección
 * @returns Sección creada
 */
export async function crearSeccion(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<SeccionData>> {
    try {
        // 1. Validar datos
        const validated = CreateSeccionSchema.parse(data);

        // 2. Verificar que el nombre no exista
        const existente = await prisma.studio_service_sections.findUnique({
            where: { name: validated.name },
        });

        if (existente) {
            return {
                success: false,
                error: `Ya existe una sección con el nombre "${validated.name}"`,
            };
        }

        // 3. Crear sección
        const seccion = await prisma.studio_service_sections.create({
            data: {
                name: validated.name,
                description: validated.description,
                order: validated.order,
            },
            include: {
                section_categories: {
                    include: {
                        service_categories: {
                            include: {
                                items: {
                                    select: { id: true },
                                },
                            },
                        },
                    },
                },
                section_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
                    },
                },
            },
        });

        // 4. Mapear a SeccionData
        const seccionData: SeccionData = {
            id: seccion.id,
            name: seccion.name,
            description: seccion.description,
            order: seccion.order,
            createdAt: seccion.created_at,
            updatedAt: seccion.updated_at,
            totalCategorias: 0,
            totalItems: 0,
            mediaSize: 0,
            mediaCount: 0,
        };

        // 5. Log éxito
        console.log(`[SECCIONES] Sección creada: ${seccion.id} - ${seccion.name}`);

        return {
            success: true,
            data: seccionData,
        };
    } catch (error) {
        console.error("[SECCIONES] Error creando sección:", error);

        // Error de validación Zod
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.errors?.[0]?.message || error.message || 'Error de validación',
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al crear sección",
        };
    }
}

// ============================================
// MUTATION: ACTUALIZAR SECCIÓN
// ============================================

/**
 * Actualiza una sección existente
 * 
 * @param studioSlug - Slug del studio
 * @param data - Datos actualizados
 * @returns Sección actualizada
 */
export async function actualizarSeccion(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<SeccionData>> {
    try {
        // 1. Validar datos
        const validated = UpdateSeccionSchema.parse(data);

        // 2. Verificar que la sección existe
        const existente = await prisma.studio_service_sections.findUnique({
            where: { id: validated.id },
        });

        if (!existente) {
            return {
                success: false,
                error: "Sección no encontrada",
            };
        }

        // 3. Verificar nombre duplicado (si cambió)
        if (validated.name !== existente.name) {
            const nombreDuplicado = await prisma.studio_service_sections.findFirst({
                where: {
                    name: validated.name,
                    id: { not: validated.id },
                },
            });

            if (nombreDuplicado) {
                return {
                    success: false,
                    error: `Ya existe una sección con el nombre "${validated.name}"`,
                };
            }
        }

        // 4. Actualizar sección
        const seccion = await prisma.studio_service_sections.update({
            where: { id: validated.id },
            data: {
                name: validated.name,
                description: validated.description,
                order: validated.order,
            },
            include: {
                section_categories: {
                    include: {
                        service_categories: {
                            include: {
                                items: {
                                    select: { id: true },
                                },
                            },
                        },
                    },
                },
                section_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
                    },
                },
            },
        });

        // 5. Calcular estadísticas
        const totalCategorias = seccion.section_categories.length;
        const totalItems = seccion.section_categories.reduce(
            (acc, sc) => acc + sc.service_categories.items.length,
            0
        );
        const mediaSize = seccion.section_media.reduce(
            (acc, media) => acc + Number(media.storage_bytes),
            0
        );

        const seccionData: SeccionData = {
            id: seccion.id,
            name: seccion.name,
            description: seccion.description,
            order: seccion.order,
            createdAt: seccion.created_at,
            updatedAt: seccion.updated_at,
            totalCategorias,
            totalItems,
            mediaSize,
            mediaCount: seccion.section_media.length,
        };

        // 6. Log éxito
        console.log(`[SECCIONES] Sección actualizada: ${seccion.id} - ${seccion.name}`);

        return {
            success: true,
            data: seccionData,
        };
    } catch (error) {
        console.error("[SECCIONES] Error actualizando sección:", error);

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.errors?.[0]?.message || error.message || 'Error de validación',
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al actualizar sección",
        };
    }
}

// ============================================
// MUTATION: ELIMINAR SECCIÓN
// ============================================

/**
 * Elimina una sección del catálogo
 * ADVERTENCIA: Elimina en cascada categorías y items asociados
 * 
 * @param studioSlug - Slug del studio
 * @param seccionId - ID de la sección a eliminar
 * @returns Confirmación de eliminación
 */
export async function eliminarSeccion(
    studioSlug: string,
    seccionId: string
): Promise<ActionResponse<boolean>> {
    try {
        // 1. Verificar que existe
        const seccion = await prisma.studio_service_sections.findUnique({
            where: { id: seccionId },
            include: {
                section_categories: {
                    include: {
                        service_categories: {
                            include: {
                                items: { select: { id: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!seccion) {
            return {
                success: false,
                error: "Sección no encontrada",
            };
        }

        // 2. Contar categorías e items
        const totalCategorias = seccion.section_categories.length;
        const totalItems = seccion.section_categories.reduce(
            (acc, sc) => acc + sc.service_categories.items.length,
            0
        );

        // 3. ⛔ VALIDACIÓN RESTRICTIVA: No permitir eliminar si tiene contenido
        if (totalCategorias > 0 || totalItems > 0) {
            return {
                success: false,
                error: `No puedes eliminar esta sección. Contiene ${totalCategorias} categoría${totalCategorias !== 1 ? "s" : ""} y ${totalItems} item${totalItems !== 1 ? "s" : ""}. Primero debes eliminar todo el contenido.`,
            };
        }

        // 4. Eliminar sección (solo si está completamente vacía)
        await prisma.studio_service_sections.delete({
            where: { id: seccionId },
        });

        // 5. Log éxito
        console.log(
            `[SECCIONES] Sección eliminada: ${seccionId} - ${seccion.name}`
        );

        return {
            success: true,
            data: true,
        };
    } catch (error) {
        console.error("[SECCIONES] Error eliminando sección:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al eliminar sección",
        };
    }
}

// ============================================
// QUERY: OBTENER SECCIÓN POR ID
// ============================================

/**
 * Obtiene una sección específica con todos sus detalles
 * 
 * @param seccionId - ID de la sección
 * @returns Sección con detalles completos
 */
export async function obtenerSeccionPorId(
    seccionId: string
): Promise<ActionResponse<SeccionData>> {
    try {
        const seccion = await prisma.studio_service_sections.findUnique({
            where: { id: seccionId },
            include: {
                section_categories: {
                    include: {
                        service_categories: {
                            include: {
                                items: {
                                    where: { status: "active" },
                                    select: { id: true },
                                },
                            },
                        },
                    },
                },
                section_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
                        file_url: true,
                    },
                },
            },
        });

        if (!seccion) {
            return {
                success: false,
                error: "Sección no encontrada",
            };
        }

        // Calcular estadísticas
        const totalCategorias = seccion.section_categories.length;
        const totalItems = seccion.section_categories.reduce(
            (acc, sc) => acc + sc.service_categories.items.length,
            0
        );
        const mediaSize = seccion.section_media.reduce(
            (acc, media) => acc + Number(media.storage_bytes),
            0
        );

        const seccionData: SeccionData = {
            id: seccion.id,
            name: seccion.name,
            description: seccion.description,
            order: seccion.order,
            createdAt: seccion.created_at,
            updatedAt: seccion.updated_at,
            totalCategorias,
            totalItems,
            mediaSize,
            mediaCount: seccion.section_media.length,
            categories: seccion.section_categories.map((sc) => ({
                id: sc.service_categories.id,
                name: sc.service_categories.name,
            })),
        };

        return {
            success: true,
            data: seccionData,
        };
    } catch (error) {
        console.error("[SECCIONES] Error obteniendo sección:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al obtener sección",
        };
    }
}

// ============================================
// MUTATION: REORDENAR SECCIONES
// ============================================

/**
 * Actualiza el orden de múltiples secciones
 * 
 * @param updates - Array de {id, order}
 * @returns Confirmación
 */
export async function reordenarSecciones(
    studioSlug: string,
    seccionIds: string[]
): Promise<ActionResponse<boolean>> {
    try {
        // Validar que haya al menos 1 sección
        if (!seccionIds || seccionIds.length === 0) {
            return { success: false, error: "No hay secciones para reordenar" };
        }

        // Actualizar orden de cada sección basado en su posición en el array
        await prisma.$transaction(
            seccionIds.map((id, index) =>
                prisma.studio_service_sections.update({
                    where: { id },
                    data: { order: index },
                })
            )
        );

        console.log(`[SECCIONES] Reordenadas ${seccionIds.length} secciones`);

        return {
            success: true,
            data: true,
        };
    } catch (error) {
        console.error("[SECCIONES] Error reordenando secciones:", error);
        return {
            success: false,
            error: "Error al reordenar secciones",
        };
    }
}

