"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Types
export interface ItemData {
    id: string;
    name: string;
    cost: number;
    description?: string | null;
    tipoUtilidad?: 'servicio' | 'producto';
    order: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    mediaCount: number;
    mediaSize: number;
    gastos?: Array<{
        nombre: string;
        costo: number;
    }>;
}

export interface ActionResponse<T = null> {
    success: boolean;
    data?: T;
    error?: string;
}

// Schemas
const GastoSchema = z.object({
    nombre: z.string().min(1, "El nombre del gasto es requerido"),
    costo: z.number().min(0, "El costo no puede ser negativo"),
});

const CreateItemSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    cost: z.number().min(0, "El costo no puede ser negativo"),
    description: z.string().optional(),
    categoriaeId: z.string(),
    studioSlug: z.string(),
    gastos: z.array(GastoSchema).optional().default([]),
    status: z.enum(['active', 'inactive']).optional().default('active'),
});

const UpdateItemSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "El nombre es requerido"),
    cost: z.number().min(0, "El costo no puede ser negativo"),
    description: z.string().optional(),
    tipoUtilidad: z.enum(['servicio', 'producto']).optional(),
    gastos: z.array(GastoSchema).optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

/**
 * Obtiene todos los items de una categoría con estadísticas
 *
 * @param categoriaeId - ID de la categoría
 * @returns Lista de items con estadísticas
 */
export async function obtenerItemsConStats(
    categoriaeId: string
): Promise<ActionResponse<ItemData[]>> {
    try {
        // Obtener items de la categoría (todos los status)
        const items = await prisma.studio_items.findMany({
            where: {
                service_category_id: categoriaeId,
            },
            select: {
                id: true,
                name: true,
                cost: true,
                utility_type: true,
                order: true,
                status: true,
                created_at: true,
                updated_at: true,
                item_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
                    },
                },
                item_expenses: {
                    select: {
                        id: true,
                        name: true,
                        cost: true,
                    },
                },
            },
            orderBy: { order: "asc" },
        });

        // Mapear a formato ItemData
        const itemsData: ItemData[] = items.map((item) => {
            const mediaSize = item.item_media.reduce(
                (acc, media) => acc + Number(media.storage_bytes),
                0
            );

            return {
                id: item.id,
                name: item.name,
                cost: item.cost,
                description: null,
                tipoUtilidad: item.utility_type === 'service' ? 'servicio' : 'producto',
                order: item.order,
                status: item.status,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
                mediaCount: item.item_media.length,
                mediaSize,
                gastos: item.item_expenses.map(expense => ({
                    nombre: expense.name,
                    costo: expense.cost,
                })),
            };
        });

        return {
            success: true,
            data: itemsData,
        };
    } catch (error) {
        console.error("[ITEMS] Error obteniendo items:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido",
        };
    }
}

/**
 * Crea un nuevo item en una categoría
 *
 * @param data - Datos del nuevo item
 * @returns Item creado
 */
export async function crearItem(
    data: unknown
): Promise<ActionResponse<ItemData>> {
    try {
        // Validar datos
        const validated = CreateItemSchema.parse(data);

        // 1. Obtener studio_id desde slug
        const studio = await prisma.studios.findUnique({
            where: { slug: validated.studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado",
            };
        }

        // 2. Verificar que la categoría existe
        const categoria = await prisma.studio_service_categories.findUnique({
            where: { id: validated.categoriaeId },
            select: { id: true },
        });

        if (!categoria) {
            return {
                success: false,
                error: "Categoría no encontrada",
            };
        }

        // Contar items existentes para asignar orden
        const itemCount = await prisma.studio_items.count({
            where: {
                service_category_id: validated.categoriaeId,
                status: "active",
            },
        });

        // Crear item
        const item = await prisma.studio_items.create({
            data: {
                name: validated.name,
                cost: validated.cost,
                service_category_id: validated.categoriaeId,
                order: itemCount,
                status: validated.status || "active",
                studio_id: studio.id,
                item_expenses: {
                    create: validated.gastos?.map(gasto => ({
                        name: gasto.nombre,
                        cost: gasto.costo,
                    })) || [],
                },
            },
            include: {
                item_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
                    },
                },
                item_expenses: {
                    select: {
                        id: true,
                        name: true,
                        cost: true,
                    },
                },
            },
        });

        const mediaSize = item.item_media.reduce(
            (acc, media) => acc + Number(media.storage_bytes),
            0
        );

        const itemData: ItemData = {
            id: item.id,
            name: item.name,
            cost: item.cost,
            description: null,
            order: item.order,
            status: item.status,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            mediaCount: item.item_media.length,
            mediaSize,
            gastos: item.item_expenses.map(expense => ({
                nombre: expense.name,
                costo: expense.cost,
            })),
        };

        console.log(`[ITEMS] Item creado: ${item.id} - ${item.name} - Gastos: ${JSON.stringify(item.item_expenses)}`);

        return {
            success: true,
            data: itemData,
        };
    } catch (error) {
        console.error("[ITEMS] Error creando item:", error);

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.errors?.[0]?.message || error.message || 'Error de validación',
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al crear item",
        };
    }
}

/**
 * Actualiza un item existente
 *
 * @param data - Datos actualizados
 * @returns Item actualizado
 */
export async function actualizarItem(
    data: unknown
): Promise<ActionResponse<ItemData>> {
    try {
        console.log("[ITEMS] Iniciando actualización de item:", data);

        // Validar datos
        const validated = UpdateItemSchema.parse(data);
        console.log("[ITEMS] Datos validados:", validated);

        // Verificar que existe
        const existente = await prisma.studio_items.findUnique({
            where: { id: validated.id },
        });

        if (!existente) {
            console.log("[ITEMS] Item no encontrado:", validated.id);
            return {
                success: false,
                error: "Item no encontrado",
            };
        }

        console.log("[ITEMS] Item existente encontrado:", existente);

        // Actualizar item
        const item = await prisma.studio_items.update({
            where: { id: validated.id },
            data: {
                name: validated.name,
                cost: validated.cost,
                // Actualizar tipo de utilidad si se proporciona, si no mantener el valor actual
                ...(validated.tipoUtilidad !== undefined && {
                    utility_type: validated.tipoUtilidad === 'servicio' ? 'service' : 'product'
                }),
                // Actualizar status si se proporciona
                ...(validated.status !== undefined && {
                    status: validated.status
                }),
                // Actualizar gastos si se proporcionan
                ...(validated.gastos !== undefined && {
                    item_expenses: {
                        deleteMany: {}, // Eliminar gastos existentes
                        create: validated.gastos.map(gasto => ({
                            name: gasto.nombre,
                            cost: gasto.costo,
                        })),
                    },
                }),
            },
            include: {
                item_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
                    },
                },
                item_expenses: {
                    select: {
                        id: true,
                        name: true,
                        cost: true,
                    },
                },
            },
        });

        console.log("[ITEMS] Item actualizado en BD:", item);

        const mediaSize = item.item_media.reduce(
            (acc, media) => acc + Number(media.storage_bytes),
            0
        );

        // Mapear utility_type de BD a tipoUtilidad
        const tipoUtilidad: 'servicio' | 'producto' = 
            item.utility_type === 'service' ? 'servicio' : 'producto';

        const itemData: ItemData = {
            id: item.id,
            name: item.name,
            cost: item.cost,
            description: null,
            tipoUtilidad,
            order: item.order,
            status: item.status,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            mediaCount: item.item_media.length,
            mediaSize,
            gastos: item.item_expenses.map(expense => ({
                nombre: expense.name,
                costo: expense.cost,
            })),
        };

        console.log(`[ITEMS] Item actualizado exitosamente: ${item.id} - ${item.name} - Costo: ${item.cost} - Gastos: ${JSON.stringify(item.item_expenses)}`);

        // Revalidar la ruta para actualizar la UI
        revalidatePath(`/[slug]/studio/builder/catalogo`);

        return {
            success: true,
            data: itemData,
        };
    } catch (error) {
        console.error("[ITEMS] Error actualizando item:", error);

        if (error instanceof z.ZodError) {
            console.error("[ITEMS] Error de validación Zod:", error.errors);
            return {
                success: false,
                error: error.errors?.[0]?.message || error.message || 'Error de validación',
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al actualizar item",
        };
    }
}

/**
 * Elimina un item
 *
 * @param itemId - ID del item a eliminar
 * @returns Confirmación de eliminación
 */
export async function eliminarItem(
    itemId: string
): Promise<ActionResponse<boolean>> {
    try {
        // Validar itemId
        if (!itemId || typeof itemId !== 'string' || itemId.trim() === '') {
            return {
                success: false,
                error: "ID de item inválido",
            };
        }

        // Verificar que existe
        const item = await prisma.studio_items.findUnique({
            where: { id: itemId },
        });

        if (!item) {
            return {
                success: false,
                error: "Item no encontrado",
            };
        }

        // Eliminar item (cascade borrará media, quote_items, etc)
        await prisma.studio_items.delete({
            where: { id: itemId },
        });

        console.log(`[ITEMS] Item eliminado: ${itemId} - ${item.name}`);

        return {
            success: true,
            data: true,
        };
    } catch (error) {
        console.error("[ITEMS] Error eliminando item:", error);

        // Manejar errores de conexión específicos
        if (
            error instanceof Error && (
                error.message.includes("Can't reach database server") ||
                error.message.includes("P1001") ||
                error.message.includes("connection") ||
                error.message.includes("PrismaClientInitializationError") ||
                (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P1001')
            )
        ) {
            return {
                success: false,
                error: "Error de conexión con la base de datos. Verifica tu conexión a internet e intenta nuevamente.",
            };
        }

        // Manejar otros errores de Prisma
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const prismaError = error as { code: string };
            
            // Error de registro no encontrado
            if (prismaError.code === "P2025") {
                return {
                    success: false,
                    error: "Item no encontrado",
                };
            }
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al eliminar item",
        };
    }
}

/**
 * Actualiza el orden de múltiples items
 *
 * @param itemIds - Array de IDs en nuevo orden
 * @returns Confirmación
 */
export async function reordenarItems(
    itemIds: string[]
): Promise<ActionResponse<boolean>> {
    try {
        if (!itemIds || itemIds.length === 0) {
            return { success: false, error: "No hay items para reordenar" };
        }

        // Actualizar orden de cada item
        await prisma.$transaction(
            itemIds.map((id, index) =>
                prisma.studio_items.update({
                    where: { id },
                    data: { order: index },
                })
            )
        );

        console.log(`[ITEMS] Reordenados ${itemIds.length} items`);

        return {
            success: true,
            data: true,
        };
    } catch (error) {
        console.error("[ITEMS] Error reordenando items:", error);
        return {
            success: false,
            error: "Error al reordenar items",
        };
    }
}

/**
 * Mueve un item de una categoría a otra
 *
 * @param itemId - ID del item a mover
 * @param nuevaCategoriaId - ID de la nueva categoría
 * @returns Confirmación
 */
export async function moverItemACategoria(
    itemId: string,
    nuevaCategoriaId: string
): Promise<ActionResponse<boolean>> {
    try {
        if (!itemId || !nuevaCategoriaId) {
            return { success: false, error: "IDs requeridos" };
        }

        // Verificar que el item existe
        const item = await prisma.studio_items.findUnique({
            where: { id: itemId },
            select: { id: true, service_category_id: true, order: true },
        });

        if (!item) {
            return { success: false, error: "Item no encontrado" };
        }

        // Verificar que la nueva categoría existe
        const categoria = await prisma.studio_service_categories.findUnique({
            where: { id: nuevaCategoriaId },
            select: { id: true },
        });

        if (!categoria) {
            return { success: false, error: "Categoría no encontrada" };
        }

        // Si es la misma categoría, no hacer nada
        if (item.service_category_id === nuevaCategoriaId) {
            return { success: true, data: true };
        }

        await prisma.$transaction(async (tx) => {
            // 1. Reordenar items en la categoría origen (si existe)
            if (item.service_category_id) {
                const itemsOrigen = await tx.studio_items.findMany({
                    where: { service_category_id: item.service_category_id },
                    orderBy: { order: "asc" },
                });

                // Reindexar items en categoría origen
                for (let i = 0; i < itemsOrigen.length; i++) {
                    if (itemsOrigen[i].id !== itemId) {
                        await tx.studio_items.update({
                            where: { id: itemsOrigen[i].id },
                            data: { order: i },
                        });
                    }
                }
            }

            // 2. Obtener el nuevo orden en la categoría destino
            const itemsDestino = await tx.studio_items.findMany({
                where: { service_category_id: nuevaCategoriaId },
                orderBy: { order: "asc" },
            });

            // 3. Mover el item a la nueva categoría con el último orden
            await tx.studio_items.update({
                where: { id: itemId },
                data: {
                    service_category_id: nuevaCategoriaId,
                    order: itemsDestino.length,
                },
            });
        });

        console.log(`[ITEMS] Item ${itemId} movido a categoría ${nuevaCategoriaId}`);

        return {
            success: true,
            data: true,
        };
    } catch (error) {
        console.error("[ITEMS] Error moviendo item:", error);
        return {
            success: false,
            error: "Error al mover item",
        };
    }
}

/**
 * Alterna el estado publicado/no publicado de un item
 *
 * @param itemId - ID del item
 * @returns Item actualizado
 */
export async function toggleItemPublish(
    itemId: string
): Promise<ActionResponse<ItemData>> {
    try {
        const item = await prisma.studio_items.findUnique({
            where: { id: itemId },
            select: {
                id: true,
                status: true,
                studio: { select: { slug: true } },
            },
        });

        if (!item) {
            return {
                success: false,
                error: "Item no encontrado",
            };
        }

        const newStatus = item.status === "active" ? "inactive" : "active";

        const updatedItem = await prisma.studio_items.update({
            where: { id: itemId },
            data: {
                status: newStatus,
            },
            include: {
                item_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
                    },
                },
                item_expenses: {
                    select: {
                        id: true,
                        name: true,
                        cost: true,
                    },
                },
            },
        });

        const mediaSize = updatedItem.item_media.reduce(
            (acc, media) => acc + Number(media.storage_bytes),
            0
        );

        const tipoUtilidad: 'servicio' | 'producto' = 
            updatedItem.utility_type === 'service' ? 'servicio' : 'producto';

        const itemData: ItemData = {
            id: updatedItem.id,
            name: updatedItem.name,
            cost: updatedItem.cost,
            description: null,
            tipoUtilidad,
            order: updatedItem.order,
            status: updatedItem.status,
            createdAt: updatedItem.created_at,
            updatedAt: updatedItem.updated_at,
            mediaCount: updatedItem.item_media.length,
            mediaSize,
            gastos: updatedItem.item_expenses.map(expense => ({
                nombre: expense.name,
                costo: expense.cost,
            })),
        };

        revalidatePath(`/${item.studio.slug}/studio/builder/catalogo`);

        return {
            success: true,
            data: itemData,
        };
    } catch (error) {
        console.error("[ITEMS] Error toggling publish:", error);
        return {
            success: false,
            error: "Error al cambiar estado",
        };
    }
}
