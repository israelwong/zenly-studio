"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withRetry } from "@/lib/database/retry-helper";
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
                // Traer todos los paquetes, no solo los activos
            },
            include: {
                event_types: {
                    select: {
                        id: true,
                        name: true,
                        order: true,
                    },
                },
                paquete_items: true,
            },
            orderBy: { order: "asc" },
        });

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
            description?: string;
            cover_url?: string | null;
            cover_storage_bytes?: bigint | null;
            cost?: number;
            expense?: number;
            utilidad?: number;
            precio?: number;
            status?: string;
            is_featured?: boolean;
            servicios?: Array<{
                servicioId: string;
                cantidad: number;
                servicioCategoriaId: string;
            }>;
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
            orderBy: { order: "desc" },
            select: { order: true },
        });

        const newPosition = (maxPosition?.order ?? -1) + 1;

        // Si se marca como recomendado, desactivar otros del mismo tipo de evento
        if (paqueteData.is_featured) {
            await prisma.studio_paquetes.updateMany({
                where: {
                    studio_id: studio.id,
                    event_type_id: eventTypeId,
                    is_featured: true
                },
                data: {
                    is_featured: false
                }
            });
        }

        const paquete = await prisma.studio_paquetes.create({
            data: {
                studio_id: studio.id,
                event_type_id: eventTypeId,
                name: paqueteData.name,
                description: paqueteData.description,
                cover_url: paqueteData.cover_url || null,
                cover_storage_bytes: paqueteData.cover_storage_bytes || null,
                cost: paqueteData.cost,
                expense: paqueteData.expense,
                utilidad: paqueteData.utilidad,
                precio: paqueteData.precio,
                order: newPosition,
                status: paqueteData.status || "active",
                is_featured: paqueteData.is_featured || false,
                // Crear paquete_items si existen servicios
                paquete_items: paqueteData.servicios && paqueteData.servicios.length > 0 ? {
                    create: paqueteData.servicios.map((servicio, index) => ({
                        item_id: servicio.servicioId,
                        service_category_id: servicio.servicioCategoriaId,
                        quantity: servicio.cantidad,
                        order: index,
                        visible_to_client: true,
                        status: "active"
                    }))
                } : undefined
            },
            include: {
                event_types: true,
                paquete_items: true,
            },
        });

        // No revalidar - el estado local se actualiza en el componente
        // revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);

        return {
            success: true,
            data: paquete as unknown as PaqueteFromDB,
        };
    } catch (error) {
        console.error("[crearPaquete] Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Error al crear paquete";
        return {
            success: false,
            error: errorMessage,
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
            description?: string;
            cover_url?: string | null;
            cover_storage_bytes?: bigint | null;
            cost?: number;
            expense?: number;
            utilidad?: number;
            precio?: number;
            status?: string;
            is_featured?: boolean;
            servicios?: Array<{
                servicioId: string;
                cantidad: number;
                servicioCategoriaId: string;
            }>;
        };

        // Si hay servicios, actualizar paquete_items de manera inteligente
        if (paqueteData.servicios && paqueteData.servicios.length > 0) {
            // Obtener items existentes
            const itemsExistentes = await prisma.studio_paquete_items.findMany({
                where: { paquete_id: paqueteId },
                orderBy: { order: "asc" }
            });

            // Crear mapa de items existentes por item_id
            const itemsExistentesMap = new Map(
                itemsExistentes.map(item => [item.item_id, item])
            );

            // Crear mapa de nuevos items por item_id
            const nuevosItemsMap = new Map(
                paqueteData.servicios.map((servicio, index) => [
                    servicio.servicioId,
                    {
                        item_id: servicio.servicioId,
                        service_category_id: servicio.servicioCategoriaId,
                        quantity: servicio.cantidad,
                        order: index,
                        visible_to_client: true,
                        status: "active"
                    }
                ])
            );

            // Identificar items a eliminar (existen en DB pero no en nuevos datos)
            const itemsAEliminar = itemsExistentes.filter(
                item => !nuevosItemsMap.has(item.item_id)
            );

            // Identificar items a crear (existen en nuevos datos pero no en DB)
            const itemsACrear = paqueteData.servicios.filter(
                servicio => !itemsExistentesMap.has(servicio.servicioId)
            );

            // Identificar items a actualizar (existen en ambos pero pueden haber cambiado)
            const itemsAActualizar = paqueteData.servicios.filter(
                servicio => {
                    const itemExistente = itemsExistentesMap.get(servicio.servicioId);
                    if (!itemExistente) return false;

                    return (
                        itemExistente.quantity !== servicio.cantidad ||
                        itemExistente.service_category_id !== servicio.servicioCategoriaId ||
                        itemExistente.order !== (paqueteData.servicios?.indexOf(servicio) ?? -1)
                    );
                }
            );

            // Ejecutar operaciones en paralelo
            const operaciones = [];

            // Eliminar items que ya no están
            if (itemsAEliminar.length > 0) {
                operaciones.push(
                    prisma.studio_paquete_items.deleteMany({
                        where: {
                            id: { in: itemsAEliminar.map(item => item.id) }
                        }
                    })
                );
            }

            // Crear nuevos items
            if (itemsACrear.length > 0) {
                operaciones.push(
                    prisma.studio_paquete_items.createMany({
                        data: itemsACrear.map((servicio) => ({
                            paquete_id: paqueteId,
                            item_id: servicio.servicioId,
                            service_category_id: servicio.servicioCategoriaId,
                            quantity: servicio.cantidad,
                            order: paqueteData.servicios?.indexOf(servicio) ?? 0,
                            visible_to_client: true,
                            status: "active"
                        }))
                    })
                );
            }

            // Actualizar items existentes
            for (const servicio of itemsAActualizar) {
                const itemExistente = itemsExistentesMap.get(servicio.servicioId);
                if (itemExistente) {
                    operaciones.push(
                        prisma.studio_paquete_items.update({
                            where: { id: itemExistente.id },
                            data: {
                                quantity: servicio.cantidad,
                                service_category_id: servicio.servicioCategoriaId,
                                order: paqueteData.servicios.indexOf(servicio)
                            }
                        })
                    );
                }
            }

            // Ejecutar todas las operaciones
            await Promise.all(operaciones);
        }

        // Manejar event_type_id solo si se proporciona y no es 'temp'
        // Si es 'temp' o no se proporciona, mantener el event_type_id actual del paquete
        let eventTypeIdToUpdate: string | null = null;

        if (paqueteData.event_type_id && paqueteData.event_type_id !== 'temp') {
            // Verificar que el tipo de evento existe y pertenece al studio
            const eventType = await prisma.studio_event_types.findFirst({
                where: {
                    id: paqueteData.event_type_id,
                    studio_id: studio.id,
                },
                select: { id: true },
            });

            if (eventType && eventType.id !== paquete.event_type_id) {
                eventTypeIdToUpdate = eventType.id;
            }
        }

        // Preparar datos de actualización (sin event_type_id, se actualiza por separado si es necesario)
        const updateData: {
            name?: string;
            description?: string | null;
            cover_url?: string | null;
            cover_storage_bytes?: bigint | null;
            cost?: number | null;
            expense?: number | null;
            utilidad?: number | null;
            precio?: number | null;
            status?: string;
            is_featured?: boolean;
        } = {};

        // Actualizar event_type_id en una operación separada si es necesario
        if (eventTypeIdToUpdate) {
            await prisma.studio_paquetes.update({
                where: { id: paqueteId },
                data: { event_type_id: eventTypeIdToUpdate }
            });
        }
        if (paqueteData.name) updateData.name = paqueteData.name;
        if (paqueteData.description !== undefined) updateData.description = paqueteData.description;
        if (paqueteData.cover_url !== undefined) updateData.cover_url = paqueteData.cover_url;
        if (paqueteData.cover_storage_bytes !== undefined) updateData.cover_storage_bytes = paqueteData.cover_storage_bytes;
        if (typeof paqueteData.cost === "number") updateData.cost = paqueteData.cost;
        if (typeof paqueteData.expense === "number") updateData.expense = paqueteData.expense;
        if (typeof paqueteData.utilidad === "number") updateData.utilidad = paqueteData.utilidad;
        if (typeof paqueteData.precio === "number") updateData.precio = paqueteData.precio;
        // Siempre actualizar status si viene en los datos
        if (paqueteData.status !== undefined) updateData.status = paqueteData.status;
        // Actualizar is_featured si viene en los datos
        if (paqueteData.is_featured !== undefined) {
            // Si se marca como recomendado, desactivar otros paquetes del mismo tipo de evento
            if (paqueteData.is_featured) {
                const paqueteActual = await prisma.studio_paquetes.findUnique({
                    where: { id: paqueteId },
                    select: { event_type_id: true },
                });

                if (paqueteActual) {
                    await prisma.studio_paquetes.updateMany({
                        where: {
                            studio_id: studio.id,
                            event_type_id: paqueteActual.event_type_id,
                            is_featured: true,
                            NOT: { id: paqueteId }
                        },
                        data: {
                            is_featured: false
                        }
                    });
                }
            }
            updateData.is_featured = paqueteData.is_featured;
        }

        const updatedPaquete = await prisma.studio_paquetes.update({
            where: { id: paqueteId },
            data: updateData,
            include: {
                event_types: true,
                paquete_items: true,
            },
        });

        // No revalidar - el estado local se actualiza en el componente
        // revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);

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

        // No revalidar - el estado local se actualiza en el componente
        // revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);

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
 * Obtiene un paquete por ID con retry y optimización de query
 */
export async function obtenerPaquetePorId(
    paqueteId: string
): Promise<{
    success: boolean;
    data?: PaqueteFromDB;
    error?: string;
}> {
    try {
        // Usar withRetry para manejar timeouts del pool de conexiones
        const paquete = await withRetry(
            async () => {
                return await prisma.studio_paquetes.findUnique({
                    where: { id: paqueteId },
                    include: {
                        event_types: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        paquete_items: {
                            include: {
                                items: {
                                    select: { name: true }
                                },
                                service_categories: {
                                    select: { name: true }
                                }
                            },
                            orderBy: { order: 'asc' }
                        },
                    },
                });
            },
            {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 5000,
                jitter: true
            }
        );

        if (!paquete) {
            return {
                success: false,
                error: "Paquete no encontrado",
            };
        }

        return {
            success: true,
            data: paquete as unknown as PaqueteFromDB,
        };
    } catch (error: unknown) {
        console.error("[obtenerPaquetePorId] Error:", error);

        // Manejar específicamente errores de pool de conexiones
        if (error && typeof error === 'object' && 'code' in error) {
            const errorCode = error.code as string;
            if (errorCode === 'P1001' || errorCode === 'P1017' || errorCode === 'P1008') {
                // Pool timeout, conexión cerrada o timeout de conexión
                return {
                    success: false,
                    error: "Error de conexión con la base de datos. Por favor, intenta nuevamente en unos momentos.",
                };
            }
        }

        return {
            success: false,
            error: "Error al obtener paquete",
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

        // IMPORTANTE: El paquete original NO se modifica ni se archiva
        // Solo se crea una copia nueva con status "inactive"
        // El paquete original mantiene su status y configuración original

        // Obtener la posición máxima
        const maxPosition = await prisma.studio_paquetes.findFirst({
            where: { studio_id: studio.id },
            orderBy: { order: "desc" },
            select: { order: true },
        });

        const newPosition = (maxPosition?.order ?? -1) + 1;

        // Crear el nuevo paquete (el original NO se modifica)
        const paqueteDuplicado = await prisma.studio_paquetes.create({
            data: {
                studio_id: studio.id,
                event_type_id: paqueteOriginal.event_type_id,
                name: `${paqueteOriginal.name} (Copia)`,
                cost: paqueteOriginal.cost,
                expense: paqueteOriginal.expense,
                utilidad: paqueteOriginal.utilidad,
                precio: paqueteOriginal.precio,
                order: newPosition,
                status: "inactive", // Paquete duplicado siempre inactivo por defecto
                is_featured: false, // No destacar el duplicado
                paquete_items: {
                    create: paqueteOriginal.paquete_items.map((item) => ({
                        item_id: item.item_id,
                        service_category_id: item.service_category_id,
                        quantity: item.quantity,
                        visible_to_client: item.visible_to_client,
                        order: item.order,
                        status: "active",
                    })),
                },
            },
            include: {
                event_types: true,
                paquete_items: true,
            },
        });

        // No revalidar - el estado local se actualiza en el componente
        // revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);

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

/**
 * Reordenar paquetes por sus IDs
 */
export async function reorderPaquetes(
    studioSlug: string,
    paqueteIds: string[]
): Promise<{
    success: boolean;
    data?: null;
    error?: string;
}> {
    try {
        // Verificar que el estudio existe
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return {
                success: false,
                error: "Estudio no encontrado"
            };
        }

        // Verificar que los paquetes existan y pertenezcan al estudio
        const existingPaquetes = await prisma.studio_paquetes.findMany({
            where: {
                id: { in: paqueteIds },
                studio_id: studio.id
            },
            select: { id: true, name: true }
        });

        if (existingPaquetes.length !== paqueteIds.length) {
            const missingIds = paqueteIds.filter(id => !existingPaquetes.find(paquete => paquete.id === id));
            return {
                success: false,
                error: `No se encontraron ${missingIds.length} paquetes: ${missingIds.join(', ')}`
            };
        }

        // Actualizar el orden de cada paquete
        const updatePromises = paqueteIds.map((paqueteId, index) =>
            prisma.studio_paquetes.update({
                where: { id: paqueteId },
                data: {
                    order: index,
                    updated_at: new Date()
                }
            })
        );

        await Promise.all(updatePromises);

        return {
            success: true,
            data: null
        };
    } catch (error) {
        console.error("[reorderPaquetes] Error:", error);
        return {
            success: false,
            error: "Error al reordenar paquetes",
        };
    }
}
