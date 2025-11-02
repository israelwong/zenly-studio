"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface ConfiguracionCatalogo {
    visibleEnMenu: boolean;
    requiereRegistro: boolean;
    vistaEnPantalla: 'lista' | 'reticula';
}

export interface ConfiguracionPaquetes {
    visibleEnMenu: boolean;
    requiereRegistro: boolean;
    vistaEnPantalla: 'lista' | 'reticula';
}

/**
 * Obtiene la configuración del catálogo del studio
 */
export async function obtenerConfiguracionCatalogo(
    studioSlug: string
): Promise<{
    success: boolean;
    data?: ConfiguracionCatalogo;
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

        // Por ahora retornamos configuración por defecto
        // En el futuro esto se puede conectar con una tabla de configuración
        const configuracion: ConfiguracionCatalogo = {
            visibleEnMenu: true,
            requiereRegistro: false,
            vistaEnPantalla: 'lista'
        };

        return {
            success: true,
            data: configuracion,
        };
    } catch (error) {
        console.error("[obtenerConfiguracionCatalogo] Error:", error);
        return {
            success: false,
            error: "Error al obtener configuración del catálogo",
        };
    }
}

/**
 * Actualiza la configuración del catálogo del studio
 */
export async function actualizarConfiguracionCatalogo(
    studioSlug: string,
    configuracion: ConfiguracionCatalogo
): Promise<{
    success: boolean;
    data?: ConfiguracionCatalogo;
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

        // Por ahora solo validamos y retornamos la configuración
        // En el futuro esto se puede conectar con una tabla de configuración
        const configuracionValidada: ConfiguracionCatalogo = {
            visibleEnMenu: Boolean(configuracion.visibleEnMenu),
            requiereRegistro: Boolean(configuracion.requiereRegistro),
            vistaEnPantalla: configuracion.vistaEnPantalla === 'reticula' ? 'reticula' : 'lista'
        };

        revalidatePath(`/[slug]/studio/builder/catalogo`);

        return {
            success: true,
            data: configuracionValidada,
        };
    } catch (error) {
        console.error("[actualizarConfiguracionCatalogo] Error:", error);
        return {
            success: false,
            error: "Error al actualizar configuración del catálogo",
        };
    }
}

/**
 * Obtiene la configuración de paquetes del studio
 */
export async function obtenerConfiguracionPaquetes(
    studioSlug: string
): Promise<{
    success: boolean;
    data?: ConfiguracionPaquetes;
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

        // Por ahora retornamos configuración por defecto
        // En el futuro esto se puede conectar con una tabla de configuración
        const configuracion: ConfiguracionPaquetes = {
            visibleEnMenu: true,
            requiereRegistro: false,
            vistaEnPantalla: 'lista'
        };

        return {
            success: true,
            data: configuracion,
        };
    } catch (error) {
        console.error("[obtenerConfiguracionPaquetes] Error:", error);
        return {
            success: false,
            error: "Error al obtener configuración de paquetes",
        };
    }
}

/**
 * Actualiza la configuración de paquetes del studio
 */
export async function actualizarConfiguracionPaquetes(
    studioSlug: string,
    configuracion: ConfiguracionPaquetes
): Promise<{
    success: boolean;
    data?: ConfiguracionPaquetes;
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

        // Por ahora solo validamos y retornamos la configuración
        // En el futuro esto se puede conectar con una tabla de configuración
        const configuracionValidada: ConfiguracionPaquetes = {
            visibleEnMenu: Boolean(configuracion.visibleEnMenu),
            requiereRegistro: Boolean(configuracion.requiereRegistro),
            vistaEnPantalla: configuracion.vistaEnPantalla === 'reticula' ? 'reticula' : 'lista'
        };

        revalidatePath(`/[slug]/studio/builder/content/paquetes`);

        return {
            success: true,
            data: configuracionValidada,
        };
    } catch (error) {
        console.error("[actualizarConfiguracionPaquetes] Error:", error);
        return {
            success: false,
            error: "Error al actualizar configuración de paquetes",
        };
    }
}
