"use server";

import { prisma } from "@/lib/prisma";
import {
    ConfiguracionPreciosSchema,
    type ConfiguracionPreciosForm,
    type ServiciosExistentes,
} from "@/lib/actions/schemas/configuracion-precios-schemas";
import { revalidatePath } from "next/cache";

/**
 * Obtiene la configuración de precios existente para un studio
 */
export async function obtenerConfiguracionPrecios(
    studioSlug: string
): Promise<ConfiguracionPreciosForm | null> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const config = await prisma.studio_configuraciones.findFirst({
            where: { studio_id: studio.id },
        });

        if (!config) {
            return null;
        }

        return {
            utilidad_servicio: config.service_margin != null ? String(config.service_margin) : undefined,
            utilidad_producto: config.product_margin != null ? String(config.product_margin) : undefined,
            comision_venta: config.sales_commission != null ? String(config.sales_commission) : undefined,
            sobreprecio: config.markup != null ? String(config.markup) : undefined,
        };
    } catch (error) {
        console.error("[obtenerConfiguracionPrecios] Error:", error);
        throw error;
    }
}

/**
 * Verifica cuántos servicios existen en el catálogo del studio
 * Retorna estadísticas de impacto
 */
export async function verificarServiciosExistentes(
    studioSlug: string
): Promise<ServiciosExistentes> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Contar items por tipo (SERVICIO o PRODUCTO)
        const totalServicios = await prisma.studio_items.count({
            where: {
                studio_id: studio.id,
                utility_type: "service",
            },
        });

        const totalProductos = await prisma.studio_items.count({
            where: {
                studio_id: studio.id,
                utility_type: "product",
            },
        });

        const totalPaquetes = await prisma.studio_paquetes.count({
            where: { studio_id: studio.id },
        });

        const totalItems = totalServicios + totalProductos + totalPaquetes;

        return {
            total_servicios: totalItems,
            servicios_por_tipo: {
                servicios: totalServicios,
                productos: totalProductos,
                paquetes: totalPaquetes,
            },
            requiere_actualizacion_masiva: totalItems > 0,
        };
    } catch (error) {
        console.error("[verificarServiciosExistentes] Error:", error);
        // Retornar valores por defecto en caso de error
        return {
            total_servicios: 0,
            servicios_por_tipo: {
                servicios: 0,
                productos: 0,
                paquetes: 0,
            },
            requiere_actualizacion_masiva: false,
        };
    }
}

/**
 * Actualiza la configuración de precios del studio
 * Recalcula automáticamente los precios de todos los servicios
 */
export async function actualizarConfiguracionPrecios(
    studioSlug: string,
    data: unknown
): Promise<{
    success: boolean;
    error?: string;
    servicios_actualizados?: number;
}> {
    try {
        // Validar datos con Zod
        const validatedData = ConfiguracionPreciosSchema.parse(data);

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

        // Los valores ya vienen como decimales (0.0-1.0) desde el formulario
        const servicioMargin = validatedData.utilidad_servicio ? parseFloat(validatedData.utilidad_servicio) : null;
        const productoMargin = validatedData.utilidad_producto ? parseFloat(validatedData.utilidad_producto) : null;
        const ventaComision = validatedData.comision_venta ? parseFloat(validatedData.comision_venta) : null;
        const markup = validatedData.sobreprecio ? parseFloat(validatedData.sobreprecio) : null;

        // Obtener o crear configuración
        let config = await prisma.studio_configuraciones.findFirst({
            where: { studio_id: studio.id },
        });

        const updateData: {
            service_margin?: number | null;
            product_margin?: number | null;
            sales_commission?: number | null;
            markup?: number | null;
        } = {};

        if (servicioMargin !== null) updateData.service_margin = servicioMargin;
        if (productoMargin !== null) updateData.product_margin = productoMargin;
        if (ventaComision !== null) updateData.sales_commission = ventaComision;
        if (markup !== null) updateData.markup = markup;

        if (!config) {
            config = await prisma.studio_configuraciones.create({
                data: {
                    studio_id: studio.id,
                    name: "Configuración de Precios",
                    ...updateData,
                },
            });
        } else {
            await prisma.studio_configuraciones.update({
                where: { id: config.id },
                data: updateData,
            });
        }

        // Contar items totales actualizados
        const serviciosActualizados = await prisma.studio_items.count({
            where: { studio_id: studio.id },
        });

        // Revalidar la ruta del builder
        revalidatePath(`/${studioSlug}/studio/commercial/catalogo`);

        return {
            success: true,
            servicios_actualizados: serviciosActualizados,
        };
    } catch (error) {
        console.error("[actualizarConfiguracionPrecios] Error:", error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: "Error al actualizar la configuración",
        };
    }
}
