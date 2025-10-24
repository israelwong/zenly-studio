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
    gastos: z.array(GastoSchema).optional().default([]),
});

const UpdateItemSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "El nombre es requerido"),
    cost: z.number().min(0, "El costo no puede ser negativo"),
    description: z.string().optional(),
    tipoUtilidad: z.enum(['servicio', 'producto']).optional(),
    gastos: z.array(GastoSchema).optional(),
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
        // Obtener items de la categoría
        const items = await prisma.studio_items.findMany({
            where: {
                service_category_id: categoriaeId,
                status: "active",
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

        // Verificar que la categoría existe
        const categoria = await prisma.studio_service_categories.findUnique({
            where: { id: validated.categoriaeId },
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
                status: "active",
                studio_id: "", // Será llenado por el trigger o middleware
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
                ...(validated.tipoUtilidad && {
                    utility_type: validated.tipoUtilidad === 'servicio' ? 'service' : 'product'
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
            select: { id: true, service_category_id: true }
        });

        if (!item) {
            return { success: false, error: "Item no encontrado" };
        }

        // Verificar que la nueva categoría existe
        const categoria = await prisma.studio_service_categories.findUnique({
            where: { id: nuevaCategoriaId },
            select: { id: true }
        });

        if (!categoria) {
            return { success: false, error: "Categoría no encontrada" };
        }

        // Si ya está en la misma categoría, no hacer nada
        if (item.service_category_id === nuevaCategoriaId) {
            return { success: true, data: true };
        }

        // Obtener el siguiente orden en la nueva categoría
        const ultimoItem = await prisma.studio_items.findFirst({
            where: { service_category_id: nuevaCategoriaId },
            orderBy: { order: 'desc' },
            select: { order: true }
        });

        const nuevoOrder = (ultimoItem?.order || -1) + 1;

        // Actualizar el item
        await prisma.studio_items.update({
            where: { id: itemId },
            data: {
                service_category_id: nuevaCategoriaId,
                order: nuevoOrder
            }
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
