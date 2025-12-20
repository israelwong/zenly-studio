"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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
                eventoTipoId: validatedData.eventoTipoId,
                nombre: validatedData.nombre,
                costo: validatedData.costo,
                gasto: validatedData.gasto,
                utilidad: validatedData.utilidad,
                precio: validatedData.precio,
                updatedAt: new Date(),
                paquete_servicios: {
                    create: validatedData.servicios.map((servicio, index) => ({
                        servicioId: servicio.servicioId,
                        servicioCategoriaId: servicio.servicioCategoriaId,
                        cantidad: servicio.cantidad,
                        posicion: index,
                        updatedAt: new Date(),
                        createdAt: new Date(),
                        visible_cliente: true,
                        status: "active"
                    }))
                }
            },
            include: {
                paquete_servicios: {
                    include: {
                        servicios: true,
                        servicio_categorias: true
                    }
                }
            }
        })

        revalidatePath(`/${studioSlug}/studio/configuracion/modules/manager/catalogo-servicios/paquetes`)

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
                eventoTipoId: validatedData.eventoTipoId,
                nombre: validatedData.nombre,
                costo: validatedData.costo,
                gasto: validatedData.gasto,
                utilidad: validatedData.utilidad,
                precio: validatedData.precio,
                updatedAt: new Date()
            }
        })

        // Eliminar servicios existentes y crear nuevos
        await prisma.studio_paquete_servicios.deleteMany({
            where: { paqueteId }
        })

        await prisma.studio_paquete_servicios.createMany({
            data: validatedData.servicios.map((servicio, index) => ({
                paqueteId,
                servicioId: servicio.servicioId,
                servicioCategoriaId: servicio.servicioCategoriaId,
                cantidad: servicio.cantidad,
                posicion: index,
                updatedAt: new Date(),
                createdAt: new Date(),
                visible_cliente: true,
                status: "active"
            }))
        })

        revalidatePath(`/${studioSlug}/studio/configuracion/modules/manager/catalogo-servicios/paquetes`)

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

        revalidatePath(`/${studioSlug}/studio/configuracion/modules/manager/catalogo-servicios/paquetes`)

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
                paquete_servicios: {
                    include: {
                        servicios: true,
                        servicio_categorias: true
                    },
                    orderBy: { posicion: 'asc' }
                },
                evento_tipos: true
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
                paquete_servicios: true
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
                eventoTipoId: paqueteOriginal.eventoTipoId,
                nombre: `${paqueteOriginal.nombre} (Copia)`,
                costo: paqueteOriginal.costo,
                gasto: paqueteOriginal.gasto,
                utilidad: paqueteOriginal.utilidad,
                precio: paqueteOriginal.precio,
                updatedAt: new Date(),
                paquete_servicios: {
                    create: paqueteOriginal.paquete_servicios.map((servicio, index) => ({
                        servicioId: servicio.servicioId,
                        servicioCategoriaId: servicio.servicioCategoriaId,
                        cantidad: servicio.cantidad,
                        posicion: index,
                        updatedAt: new Date(),
                        createdAt: new Date(),
                        visible_cliente: servicio.visible_cliente,
                        status: servicio.status
                    }))
                }
            },
            include: {
                paquete_servicios: {
                    include: {
                        servicios: true,
                        servicio_categorias: true
                    }
                }
            }
        })

        revalidatePath(`/${studioSlug}/studio/configuracion/modules/manager/catalogo-servicios/paquetes`)

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
                paquete_servicios: {
                    include: {
                        servicios: {
                            select: { nombre: true }
                        },
                        servicio_categorias: {
                            select: { nombre: true }
                        }
                    },
                    orderBy: { posicion: 'asc' }
                },
                evento_tipos: {
                    select: { nombre: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return {
            success: true,
            paquetes
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
                paquete_servicios: true
            }
        });

        if (!paquete) {
            return {
                success: false,
                error: "Paquete no encontrado"
            };
        }

        // Si se mueve a otro tipo de evento
        if (newEventoTipoId && newEventoTipoId !== paquete.eventoTipoId) {
            await prisma.studio_paquetes.update({
                where: { id: paqueteId },
                data: {
                    eventoTipoId: newEventoTipoId,
                    updatedAt: new Date()
                }
            });
        }

        // Actualizar posiciones de otros paquetes en el mismo tipo de evento
        const eventoTipoId = newEventoTipoId || paquete.eventoTipoId;

        // Obtener todos los paquetes del mismo tipo de evento ordenados por posición
        const paquetesDelTipo = await prisma.studio_paquetes.findMany({
            where: {
                eventoTipoId: eventoTipoId,
                id: { not: paqueteId }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Reordenar posiciones
        const paquetesParaActualizar = [];

        for (let i = 0; i < paquetesDelTipo.length; i++) {
            if (i < newIndex) {
                paquetesParaActualizar.push({
                    id: paquetesDelTipo[i].id,
                    posicion: i
                });
            } else {
                paquetesParaActualizar.push({
                    id: paquetesDelTipo[i].id,
                    posicion: i + 1
                });
            }
        }

        // Actualizar posiciones en batch
        for (const update of paquetesParaActualizar) {
            await prisma.studio_paquetes.update({
                where: { id: update.id },
                data: {
                    updatedAt: new Date()
                }
            });
        }

        revalidatePath(`/${studioSlug}/studio/configuracion/modules/manager/catalogo-servicios/paquetes`);

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
