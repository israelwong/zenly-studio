// ============================================
// ZENPRO V2 - CRUD CATEGORÍAS
// ============================================
// Server Actions para gestión de categorías del catálogo

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

// ============================================
// TYPES & SCHEMAS
// ============================================

const CreateCategoriaSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
    seccionId: z.string().cuid(),
});

const UpdateCategoriaSchema = z.object({
    id: z.string().cuid(),
    name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
});


export interface CategoriaData {
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    totalItems: number;
    mediaSize: number;
    mediaCount: number;
}

interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// ============================================
// QUERY: OBTENER CATEGORÍAS CON STATS
// ============================================

/**
 * Obtiene todas las categorías de una sección con estadísticas agregadas
 * 
 * @param seccionId - ID de la sección
 * @returns Lista de categorías con estadísticas
 */
export async function obtenerCategoriasConStats(
    seccionId: string
): Promise<ActionResponse<CategoriaData[]>> {
    try {
        // Obtener categorías de la sección
        const sectionCategories = await prisma.studio_section_categories.findMany({
            where: {
                section_id: seccionId,
            },
            include: {
                service_categories: {
                    include: {
                        items: {
                            where: { status: "active" },
                            select: { id: true },
                        },
                        category_media: {
                            select: {
                                id: true,
                                storage_bytes: true,
                            },
                        },
                    },
                },
            },
            orderBy: { service_categories: { order: "asc" } },
        });

        // Mapear a formato CategoriaData
        const categoriasData: CategoriaData[] = sectionCategories.map((sc) => {
            const categoria = sc.service_categories;
            const totalItems = categoria.items.length;
            const mediaSize = categoria.category_media.reduce(
                (acc: number, media: { storage_bytes: bigint }) => acc + Number(media.storage_bytes),
                0
            );

            return {
                id: categoria.id,
                name: categoria.name,
                order: categoria.order,
                createdAt: categoria.created_at,
                updatedAt: categoria.updated_at,
                totalItems,
                mediaSize,
                mediaCount: categoria.category_media.length,
            };
        });

        return {
            success: true,
            data: categoriasData,
        };
    } catch (error) {
        console.error("[CATEGORÍAS] Error obteniendo categorías:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido",
        };
    }
}

// ============================================
// MUTATION: CREAR CATEGORÍA
// ============================================

/**
 * Crea una nueva categoría en una sección
 * 
 * @param data - Datos de la nueva categoría
 * @returns Categoría creada
 */
export async function crearCategoria(
    data: unknown
): Promise<ActionResponse<CategoriaData>> {
    try {
        // Validar datos
        const validated = CreateCategoriaSchema.parse(data);

        // Verificar que la sección existe
        const seccion = await prisma.studio_service_sections.findUnique({
            where: { id: validated.seccionId },
        });

        if (!seccion) {
            return {
                success: false,
                error: "Sección no encontrada",
            };
        }

        // Crear categoría
        const categoria = await prisma.studio_service_categories.create({
            data: {
                name: validated.name,
            },
            include: {
                items: {
                    where: { status: "active" },
                    select: { id: true },
                },
                category_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
                    },
                },
            },
        });

        // Crear relación con sección
        await prisma.studio_section_categories.create({
            data: {
                section_id: validated.seccionId,
                category_id: categoria.id,
            },
        });

        const categoriaData: CategoriaData = {
            id: categoria.id,
            name: categoria.name,
            order: categoria.order,
            createdAt: categoria.created_at,
            updatedAt: categoria.updated_at,
            totalItems: categoria.items.length,
            mediaSize: categoria.category_media.reduce((sum, m) => sum + Number(m.storage_bytes), 0),
            mediaCount: categoria.category_media.length,
        };

        // Obtener studioSlug desde un item de la categoría para invalidar caché
        const itemWithStudio = await prisma.studio_items.findFirst({
            where: { service_category_id: categoria.id },
            select: {
                studio: {
                    select: { slug: true },
                },
            },
        });

        if (itemWithStudio?.studio?.slug) {
            const studioSlug = itemWithStudio.studio.slug;
            revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
            revalidateTag(`catalog-shell-${studioSlug}`);
        }

        console.log(`[CATEGORÍAS] Categoría creada: ${categoria.id} - ${categoria.name}`);

        return {
            success: true,
            data: categoriaData,
        };
    } catch (error) {
        console.error("[CATEGORÍAS] Error creando categoría:", error);

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.issues?.[0]?.message || error.message || 'Error de validación',
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al crear categoría",
        };
    }
}

// ============================================
// MUTATION: ACTUALIZAR CATEGORÍA
// ============================================

/**
 * Actualiza una categoría existente
 * 
 * @param data - Datos actualizados
 * @returns Categoría actualizada
 */
export async function actualizarCategoria(
    data: unknown
): Promise<ActionResponse<CategoriaData>> {
    try {
        // Validar datos
        const validated = UpdateCategoriaSchema.parse(data);

        // Verificar que la categoría existe
        const existente = await prisma.studio_service_categories.findUnique({
            where: { id: validated.id },
        });

        if (!existente) {
            return {
                success: false,
                error: "Categoría no encontrada",
            };
        }

        // Actualizar categoría
        const categoria = await prisma.studio_service_categories.update({
            where: { id: validated.id },
            data: {
                name: validated.name,
            },
            include: {
                items: {
                    where: { status: "active" },
                    select: { id: true },
                },
                category_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
                    },
                },
            },
        });


        const categoriaData: CategoriaData = {
            id: categoria.id,
            name: categoria.name,
            order: categoria.order,
            createdAt: categoria.created_at,
            updatedAt: categoria.updated_at,
            totalItems: categoria.items.length,
            mediaSize: categoria.category_media.reduce((sum, m) => sum + Number(m.storage_bytes), 0),
            mediaCount: categoria.category_media.length,
        };

        // Obtener studioSlug desde un item de la categoría para invalidar caché
        const itemWithStudio = await prisma.studio_items.findFirst({
            where: { service_category_id: categoria.id },
            select: {
                studio: {
                    select: { slug: true },
                },
            },
        });

        if (itemWithStudio?.studio?.slug) {
            const studioSlug = itemWithStudio.studio.slug;
            revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
            revalidateTag(`catalog-shell-${studioSlug}`);
        }

        console.log(`[CATEGORÍAS] Categoría actualizada: ${categoria.id} - ${categoria.name}`);

        return {
            success: true,
            data: categoriaData,
        };
    } catch (error) {
        console.error("[CATEGORÍAS] Error actualizando categoría:", error);

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.issues?.[0]?.message || error.message || 'Error de validación',
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al actualizar categoría",
        };
    }
}

// ============================================
// MUTATION: ELIMINAR CATEGORÍA
// ============================================

/**
 * Elimina una categoría (solo si no tiene items)
 * 
 * @param categoriaId - ID de la categoría a eliminar
 * @returns Confirmación de eliminación
 */
export async function eliminarCategoria(
    categoriaId: string
): Promise<ActionResponse<boolean>> {
    try {
        // Verificar que existe
        const categoria = await prisma.studio_service_categories.findUnique({
            where: { id: categoriaId },
            include: {
                items: { select: { id: true } },
            },
        });

        if (!categoria) {
            return {
                success: false,
                error: "Categoría no encontrada",
            };
        }

        // Verificar items directos
        if (categoria.items.length > 0) {
            return {
                success: false,
                error: `No puedes eliminar esta categoría. Contiene ${categoria.items.length} item${categoria.items.length !== 1 ? "s" : ""}. Primero debes eliminar todo el contenido.`,
            };
        }

        // Verificar items en paquetes
        const packageItemsCount = await prisma.studio_paquete_items.count({
            where: { service_category_id: categoriaId },
        });

        if (packageItemsCount > 0) {
            return {
                success: false,
                error: `No puedes eliminar esta categoría. Está siendo utilizada en ${packageItemsCount} item${packageItemsCount !== 1 ? "s" : ""} de paquetes. Primero debes eliminar o mover esos items.`,
            };
        }

        // Obtener studioSlug ANTES de eliminar (para invalidar caché)
        const mediaWithStudio = await prisma.studio_category_media.findFirst({
            where: { category_id: categoriaId },
            select: { studio: { select: { slug: true } } },
        });
        const cotizacionWithStudio = !mediaWithStudio
            ? await prisma.studio_cotizacion_items.findFirst({
                  where: { service_category_id: categoriaId },
                  select: { cotizaciones: { select: { studio: { select: { slug: true } } } } },
              })
            : null;

        const studioSlug = mediaWithStudio?.studio?.slug ?? cotizacionWithStudio?.cotizaciones?.studio?.slug;

        // Eliminar relación con sección
        await prisma.studio_section_categories.deleteMany({
            where: { category_id: categoriaId },
        });

        // Eliminar categoría
        await prisma.studio_service_categories.delete({
            where: { id: categoriaId },
        });

        if (studioSlug) {
            revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
            revalidateTag(`catalog-shell-${studioSlug}`);
        }

        console.log(`[CATEGORÍAS] Categoría eliminada: ${categoriaId} - ${categoria.name}`);

        return {
            success: true,
            data: true,
        };
    } catch (error) {
        console.error("[CATEGORÍAS] Error eliminando categoría:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al eliminar categoría",
        };
    }
}

// ============================================
// MUTATION: REORDENAR CATEGORÍAS
// ============================================

/**
 * Actualiza el orden de múltiples categorías
 * 
 * @param categoriaIds - Array de IDs en nuevo orden
 * @returns Confirmación
 */
export async function reordenarCategorias(
    categoriaIds: string[]
): Promise<ActionResponse<boolean>> {
    try {
        if (!categoriaIds || categoriaIds.length === 0) {
            return { success: false, error: "No hay categorías para reordenar" };
        }

        // Obtener studioSlug desde un item de la primera categoría para invalidar caché
        const itemWithStudio = await prisma.studio_items.findFirst({
            where: { service_category_id: categoriaIds[0] },
            select: {
                studio: {
                    select: { slug: true },
                },
            },
        });

        // Actualizar orden de cada categoría
        await prisma.$transaction(
            categoriaIds.map((id, index) =>
                prisma.studio_service_categories.update({
                    where: { id },
                    data: { order: index },
                })
            )
        );

        // Invalidar caché del catálogo
        if (itemWithStudio?.studio?.slug) {
            const studioSlug = itemWithStudio.studio.slug;
            revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);
            revalidateTag(`catalog-shell-${studioSlug}`);
        }

        console.log(`[CATEGORÍAS] Reordenadas ${categoriaIds.length} categorías`);

        return {
            success: true,
            data: true,
        };
    } catch (error) {
        console.error("[CATEGORÍAS] Error reordenando categorías:", error);
        return {
            success: false,
            error: "Error al reordenar categorías",
        };
    }
}
