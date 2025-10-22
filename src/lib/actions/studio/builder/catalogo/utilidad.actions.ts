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
            utilidad_servicio: String(config.service_margin ?? 0.30),
            utilidad_producto: String(config.product_margin ?? 0.30),
            comision_venta: String(config.sales_commission ?? 0.10), // 10% por defecto
            sobreprecio: String(config.markup ?? 0.05), // 5% por defecto
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
        const servicioMargin = parseFloat(validatedData.utilidad_servicio);
        const productoMargin = parseFloat(validatedData.utilidad_producto);
        const ventaComision = parseFloat(validatedData.comision_venta);
        const markup = parseFloat(validatedData.sobreprecio);

        // Obtener o crear configuración
        let config = await prisma.studio_configuraciones.findFirst({
            where: { studio_id: studio.id },
        });

        if (!config) {
            config = await prisma.studio_configuraciones.create({
                data: {
                    studio_id: studio.id,
                    name: "Configuración de Precios",
                    service_margin: servicioMargin,
                    product_margin: productoMargin,
                    sales_commission: ventaComision,
                    markup: markup,
                },
            });
        } else {
            await prisma.studio_configuraciones.update({
                where: { id: config.id },
                data: {
                    service_margin: servicioMargin,
                    product_margin: productoMargin,
                    sales_commission: ventaComision,
                    markup: markup,
                },
            });
        }

        // Contar items totales actualizados
        const serviciosActualizados = await prisma.studio_items.count({
            where: { studio_id: studio.id },
        });

        // Revalidar la ruta del builder
        revalidatePath(`/[slug]/studio/builder/catalogo`);

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
