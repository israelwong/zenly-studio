'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
    PaqueteSchema,
    CrearPaqueteSchema,
    ActualizarPaqueteSchema,
    type PaqueteData,
    type PaqueteFormData,
    type PaqueteConServiciosCompletos,
    type CalculoPaquete,
    type ServicioConCantidad,
} from '@/lib/actions/schemas/paquete-schemas';

/**
 * Obtener el ID del studio desde el slug
 */
async function getStudioIdFromSlug(studioSlug: string): Promise<string | null> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });
        return studio?.id || null;
    } catch (error) {
        console.error('Error obteniendo studio_id:', error);
        return null;
    }
}

/**
 * Revalidar rutas relacionadas con paquetes
 */
function revalidatePaquetes(studioSlug: string) {
    revalidatePath(`/${slug}/studio/commercial/catalogo`);
    revalidatePath(`/${studioSlug}/commercial/catalogo`);
}

/**
 * Interface para respuestas de acciones
 */
interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// =====================================================
// FUNCIONES DE CÁLCULO (NO SON SERVER ACTIONS)
// =====================================================

/**
 * Calcular precio de un servicio individual
 * Basado en costo + gasto + utilidad según configuración
 */
function calcularPrecioServicio(
    servicio: ServicioConCantidad,
    porcentajeUtilidadServicio: number = 0.30,
    porcentajeUtilidadProducto: number = 0.20
): number {
    const { costo, gasto, tipo_utilidad } = servicio;
    const base = costo + gasto;

    const porcentajeUtilidad = tipo_utilidad === 'producto'
        ? porcentajeUtilidadProducto
        : porcentajeUtilidadServicio;

    const utilidad = base * porcentajeUtilidad;
    return base + utilidad;
}

/**
 * Calcular precio sistema del paquete
 * Suma de todos los servicios × cantidad
 */
function calcularPrecioPaquete(
    servicios: ServicioConCantidad[],
    porcentajeUtilidadServicio: number = 0.30,
    porcentajeUtilidadProducto: number = 0.20
): CalculoPaquete {
    let totalCosto = 0;
    let totalGasto = 0;
    let totalUtilidad = 0;
    let precioSistema = 0;

    servicios.forEach((servicio) => {
        const costoTotal = servicio.costo * servicio.cantidad;
        const gastoTotal = servicio.gasto * servicio.cantidad;
        const precioUnitario = calcularPrecioServicio(
            servicio,
            porcentajeUtilidadServicio,
            porcentajeUtilidadProducto
        );
        const precioTotal = precioUnitario * servicio.cantidad;
        const utilidadTotal = precioTotal - costoTotal - gastoTotal;

        totalCosto += costoTotal;
        totalGasto += gastoTotal;
        totalUtilidad += utilidadTotal;
        precioSistema += precioTotal;
    });

    return {
        totalCosto,
        totalGasto,
        totalUtilidad,
        precioSistema,
        precioVenta: precioSistema, // Por defecto igual al sistema
        descuentoPorcentaje: 0,
        sobreprecioPorcentaje: 0,
        descuentoMonto: 0,
        sobreprecioMonto: 0,
    };
}

/**
 * Calcular descuento/sobreprecio basado en precio de venta vs precio sistema
 */
function calcularDiferenciaPrecio(
    precioSistema: number,
    precioVenta: number
): {
    descuentoPorcentaje: number;
    sobreprecioPorcentaje: number;
    descuentoMonto: number;
    sobreprecioMonto: number;
} {
    if (precioSistema === 0) {
        return {
            descuentoPorcentaje: 0,
            sobreprecioPorcentaje: 0,
            descuentoMonto: 0,
            sobreprecioMonto: 0,
        };
    }

    const diferencia = precioVenta - precioSistema;

    if (precioVenta < precioSistema) {
        // Es un descuento
        const descuentoPorcentaje = (Math.abs(diferencia) / precioSistema) * 100;
        return {
            descuentoPorcentaje,
            sobreprecioPorcentaje: 0,
            descuentoMonto: Math.abs(diferencia),
            sobreprecioMonto: 0,
        };
    } else if (precioVenta > precioSistema) {
        // Es un sobreprecio
        const sobreprecioPorcentaje = (diferencia / precioSistema) * 100;
        return {
            descuentoPorcentaje: 0,
            sobreprecioPorcentaje,
            descuentoMonto: 0,
            sobreprecioMonto: diferencia,
        };
    }

    return {
        descuentoPorcentaje: 0,
        sobreprecioPorcentaje: 0,
        descuentoMonto: 0,
        sobreprecioMonto: 0,
    };
}

// =====================================================
// CRUD DE PAQUETES
// =====================================================

/**
 * Verificar si un tipo de evento tiene paquetes activos
 */
export async function verificarPaquetesPorTipoEvento(
    studioSlug: string,
    eventTypeId: string
): Promise<{ hasPackages: boolean; count: number }> {
    try {
        const studio_id = await getStudioIdFromSlug(studioSlug);
        if (!studio_id || !eventTypeId) {
            return { hasPackages: false, count: 0 };
        }

        const count = await prisma.studio_paquetes.count({
            where: {
                studio_id,
                event_type_id: eventTypeId,
                status: 'active',
            },
        });

        return { hasPackages: count > 0, count };
    } catch (error) {
        console.error('Error verificando paquetes:', error);
        return { hasPackages: false, count: 0 };
    }
}

/**
 * Obtener todos los paquetes de un tipo de evento
 */
export async function obtenerPaquetesPorTipo(
    studioSlug: string,
    eventoTipoId: string
): Promise<ActionResponse<PaqueteData[]>> {
    try {
        const studio_id = await getStudioIdFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        const paquetes = await prisma.studio_paquetes.findMany({
            where: {
                studio_id,
                eventoTipoId,
            },
            include: {
                paquete_servicios: {
                    select: {
                        servicioId: true,
                        servicioCategoriaId: true,
                        cantidad: true,
                    },
                    where: { status: 'active' },
                },
            },
            orderBy: { posicion: 'asc' },
        });

        const paquetesData: PaqueteData[] = paquetes.map((p) => ({
            id: p.id,
            studio_id: p.studio_id,
            eventoTipoId: p.eventoTipoId,
            nombre: p.nombre,
            descripcion: null,
            costo: p.costo,
            gasto: p.gasto,
            utilidad: p.utilidad,
            precio: p.precio || 0,
            status: p.status,
            posicion: p.posicion,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            servicios: p.paquete_servicios.map((ps) => ({
                servicioId: ps.servicioId,
                servicioCategoriaId: ps.servicioCategoriaId,
                cantidad: ps.cantidad,
            })),
        }));

        return { success: true, data: paquetesData };
    } catch (error) {
        console.error('Error obteniendo paquetes:', error);
        return {
            success: false,
            error: 'Error al obtener los paquetes',
        };
    }
}

/**
 * Obtener un paquete con sus servicios completos
 */
export async function obtenerPaquete(
    paqueteId: string
): Promise<ActionResponse<PaqueteConServiciosCompletos>> {
    try {
        const paquete = await prisma.studio_paquetes.findUnique({
            where: { id: paqueteId },
            include: {
                paquete_servicios: {
                    include: {
                        servicios: {
                            include: {
                                servicio_categorias: {
                                    include: {
                                        seccion_categorias: {
                                            include: {
                                                servicio_secciones: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    where: { status: 'active' },
                    orderBy: { posicion: 'asc' },
                },
            },
        });

        if (!paquete) {
            return { success: false, error: 'Paquete no encontrado' };
        }

        const serviciosDetalle = paquete.paquete_servicios.map((ps) => ({
            id: ps.id,
            servicioId: ps.servicioId,
            nombre: ps.servicios.nombre,
            costo: ps.servicios.costo,
            gasto: ps.servicios.gasto,
            tipo_utilidad: ps.servicios.tipo_utilidad,
            cantidad: ps.cantidad,
            servicioCategoriaId: ps.servicioCategoriaId,
            categoriaNombre: ps.servicios.servicio_categorias.nombre,
            seccionId:
                ps.servicios.servicio_categorias.seccion_categorias?.seccionId,
            seccionNombre:
                ps.servicios.servicio_categorias.seccion_categorias
                    ?.servicio_secciones.nombre,
        }));

        const paqueteData: PaqueteConServiciosCompletos = {
            id: paquete.id,
            studio_id: paquete.studio_id,
            eventoTipoId: paquete.eventoTipoId,
            nombre: paquete.nombre,
            descripcion: null,
            costo: paquete.costo,
            gasto: paquete.gasto,
            utilidad: paquete.utilidad,
            precio: paquete.precio || 0,
            status: paquete.status,
            posicion: paquete.posicion,
            createdAt: paquete.createdAt,
            updatedAt: paquete.updatedAt,
            servicios: paquete.paquete_servicios.map((ps) => ({
                servicioId: ps.servicioId,
                servicioCategoriaId: ps.servicioCategoriaId,
                cantidad: ps.cantidad,
            })),
            serviciosDetalle,
        };

        return { success: true, data: paqueteData };
    } catch (error) {
        console.error('Error obteniendo paquete:', error);
        return {
            success: false,
            error: 'Error al obtener el paquete',
        };
    }
}

/**
 * Crear un nuevo paquete
 */
export async function crearPaquete(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<PaqueteData>> {
    try {
        const studio_id = await getStudioIdFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        const validatedData = CrearPaqueteSchema.parse(data);

        // Obtener el siguiente número de posición
        const ultimoPaquete = await prisma.studio_paquetes.findFirst({
            where: {
                studio_id,
                eventoTipoId: validatedData.eventoTipoId,
            },
            orderBy: { posicion: 'desc' },
            select: { posicion: true },
        });

        const nuevaPosicion = ultimoPaquete ? ultimoPaquete.posicion + 1 : 0;

        // Crear paquete con servicios en transacción
        const paquete = await prisma.$transaction(async (tx) => {
            const nuevoPaquete = await tx.studio_paquetes.create({
                data: {
                    studio_id,
                    eventoTipoId: validatedData.eventoTipoId,
                    nombre: validatedData.nombre,
                    precio: validatedData.precio,
                    status: 'active',
                    posicion: nuevaPosicion,
                    updated_at: new Date(),
                },
            });

            // Crear relaciones con servicios
            await tx.studio_paquete_servicios.createMany({
                data: validatedData.servicios.map((s, index) => ({
                    paqueteId: nuevoPaquete.id,
                    servicioId: s.servicioId,
                    servicioCategoriaId: s.servicioCategoriaId,
                    cantidad: s.cantidad,
                    posicion: index,
                    visible_cliente: true,
                    status: 'active',
                    updated_at: new Date(),
                })),
            });

            return nuevoPaquete;
        });

        revalidatePaquetes(studioSlug);

        return {
            success: true,
            data: {
                id: paquete.id,
                studio_id: paquete.studio_id,
                eventoTipoId: paquete.eventoTipoId,
                nombre: paquete.nombre,
                descripcion: null,
                costo: paquete.costo,
                gasto: paquete.gasto,
                utilidad: paquete.utilidad,
                precio: paquete.precio || 0,
                status: paquete.status,
                posicion: paquete.posicion,
                createdAt: paquete.createdAt,
                updatedAt: paquete.updatedAt,
                servicios: validatedData.servicios,
            },
        };
    } catch (error) {
        console.error('Error creando paquete:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al crear el paquete',
        };
    }
}

/**
 * Actualizar un paquete existente
 */
export async function actualizarPaquete(
    studioSlug: string,
    data: unknown
): Promise<ActionResponse<PaqueteData>> {
    try {
        const validatedData = ActualizarPaqueteSchema.parse(data);

        // Actualizar paquete y servicios en transacción
        const paquete = await prisma.$transaction(async (tx) => {
            // Actualizar datos del paquete
            const paqueteActualizado = await tx.studio_paquetes.update({
                where: { id: validatedData.id },
                data: {
                    nombre: validatedData.nombre,
                    precio: validatedData.precio,
                    updated_at: new Date(),
                },
            });

            // Eliminar servicios existentes
            await tx.studio_paquete_servicios.deleteMany({
                where: { paqueteId: validatedData.id },
            });

            // Crear nuevos servicios
            await tx.studio_paquete_servicios.createMany({
                data: validatedData.servicios.map((s, index) => ({
                    paqueteId: validatedData.id,
                    servicioId: s.servicioId,
                    servicioCategoriaId: s.servicioCategoriaId,
                    cantidad: s.cantidad,
                    posicion: index,
                    visible_cliente: true,
                    status: 'active',
                    updated_at: new Date(),
                })),
            });

            return paqueteActualizado;
        });

        revalidatePaquetes(studioSlug);

        return {
            success: true,
            data: {
                id: paquete.id,
                studio_id: paquete.studio_id,
                eventoTipoId: paquete.eventoTipoId,
                nombre: paquete.nombre,
                descripcion: null,
                costo: paquete.costo,
                gasto: paquete.gasto,
                utilidad: paquete.utilidad,
                precio: paquete.precio || 0,
                status: paquete.status,
                posicion: paquete.posicion,
                createdAt: paquete.createdAt,
                updatedAt: paquete.updatedAt,
                servicios: validatedData.servicios,
            },
        };
    } catch (error) {
        console.error('Error actualizando paquete:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al actualizar el paquete',
        };
    }
}

/**
 * Eliminar un paquete
 */
export async function eliminarPaquete(
    studioSlug: string,
    paqueteId: string
): Promise<ActionResponse<{ id: string }>> {
    try {
        // Eliminar en transacción (servicios se eliminan por CASCADE)
        const paquete = await prisma.studio_paquetes.delete({
            where: { id: paqueteId },
        });

        revalidatePaquetes(studioSlug);

        return {
            success: true,
            data: { id: paquete.id },
        };
    } catch (error) {
        console.error('Error eliminando paquete:', error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Error al eliminar el paquete',
        };
    }
}

/**
 * Validar nombre único de paquete por tipo de evento
 */
export async function validarNombrePaqueteUnico(
    studioSlug: string,
    eventoTipoId: string,
    nombre: string,
    paqueteIdExcluir?: string
): Promise<ActionResponse<boolean>> {
    try {
        const studio_id = await getStudioIdFromSlug(studioSlug);
        if (!studio_id) {
            return { success: false, error: 'Estudio no encontrado' };
        }

        const paqueteExistente = await prisma.studio_paquetes.findFirst({
            where: {
                studio_id,
                eventoTipoId,
                nombre: {
                    equals: nombre,
                    mode: 'insensitive',
                },
                ...(paqueteIdExcluir && { id: { not: paqueteIdExcluir } }),
            },
        });

        return {
            success: true,
            data: !paqueteExistente, // true si NO existe (es único)
        };
    } catch (error) {
        console.error('Error validando nombre único:', error);
        return {
            success: false,
            error: 'Error al validar el nombre',
        };
    }
}

