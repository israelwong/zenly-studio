"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { PaqueteFromDB } from "@/lib/actions/schemas/paquete-schemas";

/**
 * Obtiene todos los paquetes del studio
 */
export async function obtenerPaquetes(
    studioSlug: string
): Promise<{
    success: boolean;
    data?: PaqueteFromDB[];
    error?: string;
}> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado",
            };
        }

        const paquetes = await prisma.studio_paquetes.findMany({
            where: {
                studio_id: studio.id,
                status: "active",
            },
            include: {
                event_types: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                paquete_items: true,
            },
            orderBy: { position: "asc" },
        });

        console.log('🔍 Paquetes obtenidos de DB:', paquetes);
        console.log('🔍 Primer paquete paquete_items:', paquetes[0]?.paquete_items);
        
        return {
            success: true,
            data: paquetes as unknown as PaqueteFromDB[],
        };
    } catch (error) {
        console.error("[obtenerPaquetes] Error:", error);
        return {
            success: false,
            error: "Error al obtener paquetes",
        };
    }
}

/**
 * Crea un nuevo paquete
 */
export async function crearPaquete(
    studioSlug: string,
    data: unknown
): Promise<{
    success: boolean;
    data?: PaqueteFromDB;
    error?: string;
}> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado",
            };
        }

        // Tipado de datos
        const paqueteData = data as {
            event_type_id: string;
            name: string;
            cost?: number;
            expense?: number;
            utilidad?: number;
            precio?: number;
        };

        // Validar campos requeridos
        if (!paqueteData.name || !paqueteData.name.trim()) {
            return {
                success: false,
                error: "El nombre del paquete es requerido",
            };
        }

        // Obtener o crear un tipo de evento por defecto
        let eventTypeId = paqueteData.event_type_id;
        
        if (!eventTypeId || eventTypeId === 'temp') {
            // Buscar un tipo de evento existente
            const existingEventType = await prisma.studio_event_types.findFirst({
                where: { studio_id: studio.id, status: 'active' },
                select: { id: true },
            });

            if (existingEventType) {
                eventTypeId = existingEventType.id;
            } else {
                // Crear un tipo de evento por defecto
                const defaultEventType = await prisma.studio_event_types.create({
                    data: {
                        studio_id: studio.id,
                        name: 'Evento General',
                        status: 'active',
                        order: 0,
                    },
                });
                eventTypeId = defaultEventType.id;
            }
        }

        // Obtener la posición máxima actual
        const maxPosition = await prisma.studio_paquetes.findFirst({
            where: { studio_id: studio.id },
            orderBy: { position: "desc" },
            select: { position: true },
        });

        const newPosition = (maxPosition?.position ?? -1) + 1;

        const paquete = await prisma.studio_paquetes.create({
            data: {
                studio_id: studio.id,
                event_type_id: eventTypeId,
                name: paqueteData.name,
                cost: paqueteData.cost,
                expense: paqueteData.expense,
                utilidad: paqueteData.utilidad,
                precio: paqueteData.precio,
                position: newPosition,
                status: "active",
            },
            include: {
                event_types: true,
                paquete_items: true,
            },
        });

        revalidatePath(`/[slug]/studio/builder/catalogo`);

        return {
            success: true,
            data: paquete as unknown as PaqueteFromDB,
        };
    } catch (error) {
        console.error("[crearPaquete] Error:", error);
        return {
            success: false,
            error: "Error al crear paquete",
        };
    }
}

/**
 * Actualiza un paquete existente
 */
export async function actualizarPaquete(
    studioSlug: string,
    paqueteId: string,
    data: unknown
): Promise<{
    success: boolean;
    data?: PaqueteFromDB;
    error?: string;
}> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado",
            };
        }

        // Verificar que el paquete pertenece al studio
        const paquete = await prisma.studio_paquetes.findFirst({
            where: {
                id: paqueteId,
                studio_id: studio.id,
            },
        });

        if (!paquete) {
            return {
                success: false,
                error: "Paquete no encontrado",
            };
        }

        const paqueteData = data as {
            event_type_id?: string;
            name?: string;
            cost?: number;
            expense?: number;
            utilidad?: number;
            precio?: number;
        };

        const updatedPaquete = await prisma.studio_paquetes.update({
            where: { id: paqueteId },
            data: {
                ...(paqueteData.event_type_id && { event_type_id: paqueteData.event_type_id }),
                ...(paqueteData.name && { name: paqueteData.name }),
                ...(typeof paqueteData.cost === "number" && { cost: paqueteData.cost }),
                ...(typeof paqueteData.expense === "number" && { expense: paqueteData.expense }),
                ...(typeof paqueteData.utilidad === "number" && { utilidad: paqueteData.utilidad }),
                ...(typeof paqueteData.precio === "number" && { precio: paqueteData.precio }),
            },
            include: {
                event_types: true,
                paquete_items: true,
            },
        });

        revalidatePath(`/[slug]/studio/builder/catalogo`);

        return {
            success: true,
            data: updatedPaquete as unknown as PaqueteFromDB,
        };
    } catch (error) {
        console.error("[actualizarPaquete] Error:", error);
        return {
            success: false,
            error: "Error al actualizar paquete",
        };
    }
}

/**
 * Elimina un paquete
 */
export async function eliminarPaquete(
    studioSlug: string,
    paqueteId: string
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado",
            };
        }

        // Verificar que el paquete pertenece al studio
        const paquete = await prisma.studio_paquetes.findFirst({
            where: {
                id: paqueteId,
                studio_id: studio.id,
            },
        });

        if (!paquete) {
            return {
                success: false,
                error: "Paquete no encontrado",
            };
        }

        await prisma.studio_paquetes.delete({
            where: { id: paqueteId },
        });

        revalidatePath(`/[slug]/studio/builder/catalogo`);

        return { success: true };
    } catch (error) {
        console.error("[eliminarPaquete] Error:", error);
        return {
            success: false,
            error: "Error al eliminar paquete",
        };
    }
}

/**
 * Duplica un paquete existente
 */
export async function duplicarPaquete(
    studioSlug: string,
    paqueteId: string
): Promise<{
    success: boolean;
    data?: PaqueteFromDB;
    error?: string;
}> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado",
            };
        }

        // Obtener el paquete original con sus items
        const paqueteOriginal = await prisma.studio_paquetes.findFirst({
            where: {
                id: paqueteId,
                studio_id: studio.id,
            },
            include: {
                paquete_items: true,
            },
        });

        if (!paqueteOriginal) {
            return {
                success: false,
                error: "Paquete no encontrado",
            };
        }

        // Obtener la posición máxima
        const maxPosition = await prisma.studio_paquetes.findFirst({
            where: { studio_id: studio.id },
            orderBy: { position: "desc" },
            select: { position: true },
        });

        const newPosition = (maxPosition?.position ?? -1) + 1;

        // Crear el nuevo paquete
        const paqueteDuplicado = await prisma.studio_paquetes.create({
            data: {
                studio_id: studio.id,
                event_type_id: paqueteOriginal.event_type_id,
                name: `${paqueteOriginal.name} (Copia)`,
                cost: paqueteOriginal.cost,
                expense: paqueteOriginal.expense,
                utilidad: paqueteOriginal.utilidad,
                precio: paqueteOriginal.precio,
                position: newPosition,
                status: "active",
                paquete_items: {
                    create: paqueteOriginal.paquete_items.map((item) => ({
                        item_id: item.item_id,
                        service_category_id: item.service_category_id,
                        quantity: item.quantity,
                        visible_to_client: item.visible_to_client,
                        position: item.position,
                        status: "active",
                    })),
                },
            },
            include: {
                event_types: true,
                paquete_items: true,
            },
        });

        revalidatePath(`/[slug]/studio/builder/catalogo`);

        return {
            success: true,
            data: paqueteDuplicado as unknown as PaqueteFromDB,
        };
    } catch (error) {
        console.error("[duplicarPaquete] Error:", error);
        return {
            success: false,
            error: "Error al duplicar paquete",
        };
    }
}
