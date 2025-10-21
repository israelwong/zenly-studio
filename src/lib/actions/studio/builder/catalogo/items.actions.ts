"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Types
export interface ItemData {
    id: string;
    name: string;
    cost: number;
    description?: string | null;
    order: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    mediaCount: number;
    mediaSize: number;
}

export interface ActionResponse<T = null> {
    success: boolean;
    data?: T;
    error?: string;
}

// Schemas
const CreateItemSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    cost: z.number().min(0, "El costo no puede ser negativo"),
    description: z.string().optional(),
    categoriaeId: z.string(),
});

const UpdateItemSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "El nombre es requerido"),
    cost: z.number().min(0, "El costo no puede ser negativo"),
    description: z.string().optional(),
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
            include: {
                item_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
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
                order: item.order,
                status: item.status,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
                mediaCount: item.item_media.length,
                mediaSize,
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
            },
            include: {
                item_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
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
        };

        console.log(`[ITEMS] Item creado: ${item.id} - ${item.name}`);

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
        // Validar datos
        const validated = UpdateItemSchema.parse(data);

        // Verificar que existe
        const existente = await prisma.studio_items.findUnique({
            where: { id: validated.id },
        });

        if (!existente) {
            return {
                success: false,
                error: "Item no encontrado",
            };
        }

        // Actualizar item
        const item = await prisma.studio_items.update({
            where: { id: validated.id },
            data: {
                name: validated.name,
                cost: validated.cost,
            },
            include: {
                item_media: {
                    select: {
                        id: true,
                        storage_bytes: true,
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
        };

        console.log(`[ITEMS] Item actualizado: ${item.id} - ${item.name}`);

        return {
            success: true,
            data: itemData,
        };
    } catch (error) {
        console.error("[ITEMS] Error actualizando item:", error);

        if (error instanceof z.ZodError) {
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
