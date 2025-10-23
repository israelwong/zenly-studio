"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Helper para revalidar rutas de paquetes
const revalidatePaquetesRoutes = (studioSlug: string) => {
    revalidatePath(`/[slug]/studio/builder/catalogo`)
    revalidatePath(`/studio/${studioSlug}/builder/catalogo`)
}

// Schema para crear/actualizar paquete
const PaqueteSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido"),
    descripcion: z.string().optional(),
    precio: z.number().min(0, "El precio debe ser mayor a 0"),
    costo: z.number().min(0, "El costo debe ser mayor a 0"),
    gasto: z.number().min(0, "El gasto debe ser mayor a 0"),
    utilidad: z.number(),
    eventoTipoId: z.string().min(1, "El tipo de evento es requerido"),
    servicios: z.array(z.object({
        servicioId: z.string(),
        cantidad: z.number().min(1),
        servicioCategoriaId: z.string()
    })).min(1, "Debe incluir al menos un servicio")
})

export async function crearPaquete(
    studioId: string,
    studioSlug: string,
    data: unknown
) {
    try {
        const validatedData = PaqueteSchema.parse(data)

        // Crear paquete
        const paquete = await prisma.studio_paquetes.create({
            data: {
                // id se genera automáticamente con @default(cuid())
                studio_id: studioId,
                event_type_id: validatedData.eventoTipoId,
                name: validatedData.nombre,
                cost: validatedData.costo,
                expense: validatedData.gasto,
                utilidad: validatedData.utilidad,
                precio: validatedData.precio,
                paquete_items: {
                    create: validatedData.servicios.map((servicio, index) => ({
                        item_id: servicio.servicioId,
                        service_category_id: servicio.servicioCategoriaId,
                        quantity: servicio.cantidad,
                        position: index,
                        visible_to_client: true,
                        status: "active"
                    }))
                }
            },
            include: {
                paquete_items: {
                    include: {
                        items: true,
                        service_categories: true
                    }
                }
            }
        })

        revalidatePaquetesRoutes(studioSlug)

        return {
            success: true,
            paquete,
            message: "Paquete creado exitosamente"
        }
    } catch (error) {
        console.error("Error creando paquete:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}

export async function actualizarPaquete(
    paqueteId: string,
    studioSlug: string,
    data: unknown
) {
    try {
        const validatedData = PaqueteSchema.parse(data)

        // Actualizar paquete
        const paquete = await prisma.studio_paquetes.update({
            where: { id: paqueteId },
            data: {
                event_type_id: validatedData.eventoTipoId,
                name: validatedData.nombre,
                cost: validatedData.costo,
                expense: validatedData.gasto,
                utilidad: validatedData.utilidad,
                precio: validatedData.precio
            }
        })

        // Eliminar items existentes y crear nuevos
        await prisma.studio_paquete_items.deleteMany({
            where: { paquete_id: paqueteId }
        })

        await prisma.studio_paquete_items.createMany({
            data: validatedData.servicios.map((servicio, index) => ({
                paquete_id: paqueteId,
                item_id: servicio.servicioId,
                service_category_id: servicio.servicioCategoriaId,
                quantity: servicio.cantidad,
                position: index,
                visible_to_client: true,
                status: "active"
            }))
        })

        revalidatePaquetesRoutes(studioSlug)

        return {
            success: true,
            paquete,
            message: "Paquete actualizado exitosamente"
        }
    } catch (error) {
        console.error("Error actualizando paquete:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}

export async function eliminarPaquete(
    paqueteId: string,
    studioSlug: string
) {
    try {
        await prisma.studio_paquetes.delete({
            where: { id: paqueteId }
        })

        revalidatePaquetesRoutes(studioSlug)

        return {
            success: true,
            message: "Paquete eliminado exitosamente"
        }
    } catch (error) {
        console.error("Error eliminando paquete:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}

export async function obtenerPaquete(paqueteId: string) {
    try {
        const paquete = await prisma.studio_paquetes.findUnique({
            where: { id: paqueteId },
            include: {
                paquete_items: {
                    include: {
                        items: true,
                        service_categories: true
                    },
                    orderBy: { position: 'asc' }
                },
                event_types: true
            }
        })

        return {
            success: true,
            paquete
        }
    } catch (error) {
        console.error("Error obteniendo paquete:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}

export async function duplicarPaquete(
    paqueteId: string,
    studioSlug: string
) {
    try {
        // Obtener paquete original
        const paqueteOriginal = await prisma.studio_paquetes.findUnique({
            where: { id: paqueteId },
            include: {
                paquete_items: true
            }
        })

        if (!paqueteOriginal) {
            return {
                success: false,
                error: "Paquete no encontrado"
            }
        }

        // Crear paquete duplicado
        const paqueteDuplicado = await prisma.studio_paquetes.create({
            data: {
                studio_id: paqueteOriginal.studio_id,
                event_type_id: paqueteOriginal.event_type_id,
                name: `${paqueteOriginal.name} (Copia)`,
                cost: paqueteOriginal.cost,
                expense: paqueteOriginal.expense,
                utilidad: paqueteOriginal.utilidad,
                precio: paqueteOriginal.precio,
                paquete_items: {
                    create: paqueteOriginal.paquete_items.map((item, index) => ({
                        item_id: item.item_id,
                        service_category_id: item.service_category_id,
                        quantity: item.quantity,
                        position: index,
                        visible_to_client: item.visible_to_client,
                        status: item.status
                    }))
                }
            },
            include: {
                paquete_items: {
                    include: {
                        items: true,
                        service_categories: true
                    }
                }
            }
        })

        revalidatePaquetesRoutes(studioSlug)

        return {
            success: true,
            paquete: paqueteDuplicado,
            message: "Paquete duplicado exitosamente"
        }
    } catch (error) {
        console.error("Error duplicando paquete:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        }
    }
}

export async function obtenerPaquetes(studioSlug: string) {
    try {
        // Obtener studio por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug }
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado"
            };
        }

        // Obtener paquetes del studio
        const paquetes = await prisma.studio_paquetes.findMany({
            where: { studio_id: studio.id },
            include: {
                paquete_items: {
                    include: {
                        items: {
                            select: { name: true }
                        },
                        service_categories: {
                            select: { name: true }
                        }
                    },
                    orderBy: { position: 'asc' }
                },
                event_types: {
                    select: { name: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return {
            success: true,
            data: paquetes
        };
    } catch (error) {
        console.error("Error obteniendo paquetes:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}

export async function actualizarPosicionPaquete(
    paqueteId: string,
    studioSlug: string,
    newIndex: number,
    newEventoTipoId?: string
) {
    try {
        // Obtener studio por slug
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug }
        });

        if (!studio) {
            return {
                success: false,
                error: "Studio no encontrado"
            };
        }

        // Obtener paquete actual
        const paquete = await prisma.studio_paquetes.findUnique({
            where: { id: paqueteId },
            include: {
                paquete_items: true
            }
        });

        if (!paquete) {
            return {
                success: false,
                error: "Paquete no encontrado"
            };
        }

        // Si se mueve a otro tipo de evento
        if (newEventoTipoId && newEventoTipoId !== paquete.event_type_id) {
            await prisma.studio_paquetes.update({
                where: { id: paqueteId },
                data: {
                    event_type_id: newEventoTipoId
                }
            });
        }

        // Actualizar posiciones de otros paquetes en el mismo tipo de evento
        const eventoTipoId = newEventoTipoId || paquete.event_type_id;

        // Obtener todos los paquetes del mismo tipo de evento ordenados por posición
        const paquetesDelTipo = await prisma.studio_paquetes.findMany({
            where: {
                event_type_id: eventoTipoId,
                id: { not: paqueteId }
            },
            orderBy: { created_at: 'desc' }
        });

        // Reordenar posiciones
        const paquetesParaActualizar = [];

        for (let i = 0; i < paquetesDelTipo.length; i++) {
            if (i < newIndex) {
                paquetesParaActualizar.push({
                    id: paquetesDelTipo[i].id,
                    position: i
                });
            } else {
                paquetesParaActualizar.push({
                    id: paquetesDelTipo[i].id,
                    position: i + 1
                });
            }
        }

        // Actualizar posiciones en batch
        for (const update of paquetesParaActualizar) {
            await prisma.studio_paquetes.update({
                where: { id: update.id },
                data: {
                    order: update.position
                }
            });
        }

        revalidatePaquetesRoutes(studioSlug);

        return {
            success: true,
            message: "Posición actualizada exitosamente"
        };
    } catch (error) {
        console.error("Error actualizando posición del paquete:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido"
        };
    }
}
