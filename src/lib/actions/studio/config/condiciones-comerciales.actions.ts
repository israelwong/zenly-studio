// Ruta: src/lib/actions/studio/config/condiciones-comerciales.actions.ts

'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CondicionComercialSchema, type CondicionComercialForm } from "@/lib/actions/schemas/condiciones-comerciales-schemas";

// Obtener todas las condiciones comerciales activas de un studio (para selectores)
export async function obtenerCondicionesComerciales(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const condiciones = await prisma.studio_condiciones_comerciales.findMany({
            where: {
                studio_id: studio.id,
                status: 'active',
            },
            orderBy: { order: 'asc' },
        });

        return {
            success: true,
            data: condiciones,
        };
    } catch (error) {
        console.error("Error al obtener condiciones comerciales:", error);
        return {
            success: false,
            error: "Error al obtener condiciones comerciales",
        };
    }
}

// Obtener TODAS las condiciones comerciales (activas e inactivas) de un studio (para gestión)
export async function obtenerTodasCondicionesComerciales(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const condiciones = await prisma.studio_condiciones_comerciales.findMany({
            where: {
                studio_id: studio.id,
            },
            orderBy: { order: 'asc' },
        });

        return {
            success: true,
            data: condiciones,
        };
    } catch (error) {
        console.error("Error al obtener todas las condiciones comerciales:", error);
        return {
            success: false,
            error: "Error al obtener condiciones comerciales",
        };
    }
}

// Obtener una condición comercial específica
export async function obtenerCondicionComercial(studioSlug: string, condicionId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const condicion = await prisma.studio_condiciones_comerciales.findFirst({
            where: {
                id: condicionId,
                studio_id: studio.id,
            },
        });

        if (!condicion) {
            throw new Error("Condición comercial no encontrada");
        }

        return {
            success: true,
            data: condicion,
        };
    } catch (error) {
        console.error("Error al obtener condición comercial:", error);
        return {
            success: false,
            error: "Error al obtener condición comercial",
        };
    }
}

// Crear nueva condición comercial
export async function crearCondicionComercial(
    studioSlug: string,
    data: CondicionComercialForm,
    context?: { offerId: string; type: 'offer' }
) {
    try {
        const validationResult = CondicionComercialSchema.safeParse(data);

        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.flatten().fieldErrors,
            };
        }

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Determinar el tipo y offer_id
        // Si viene desde contexto de oferta, crear como tipo "offer" pero sin asociar (offer_id = null)
        // El usuario seleccionará después cuál condición usar para la oferta
        const typeToUse = context?.type === 'offer' ? 'offer' : validationResult.data.type || 'standard';
        // No asociar automáticamente: el usuario seleccionará la condición desde el selector
        const offerIdToUse = null; // Siempre null al crear, el usuario asociará después si lo desea

        // Verificar que el nombre sea único para este studio
        const condicionExistente = await prisma.studio_condiciones_comerciales.findFirst({
            where: {
                studio_id: studio.id,
                name: validationResult.data.nombre,
            },
        });

        if (condicionExistente) {
            return {
                success: false,
                error: {
                    nombre: ["Ya existe una condición comercial con este nombre"],
                },
            };
        }

        // Determinar valores de anticipo según tipo
        const tipoAnticipo = validationResult.data.tipo_anticipo || 'percentage';
        const advancePercentage = tipoAnticipo === 'percentage' && validationResult.data.porcentaje_anticipo
            ? parseFloat(validationResult.data.porcentaje_anticipo)
            : null;
        const advanceAmount = tipoAnticipo === 'fixed_amount' && validationResult.data.monto_anticipo
            ? parseFloat(validationResult.data.monto_anticipo)
            : null;

        const dataToSave = {
            studio_id: studio.id,
            name: validationResult.data.nombre,
            description: validationResult.data.descripcion,
            discount_percentage: validationResult.data.porcentaje_descuento ? parseFloat(validationResult.data.porcentaje_descuento) : null,
            advance_percentage: advancePercentage,
            advance_type: tipoAnticipo,
            advance_amount: advanceAmount,
            status: validationResult.data.status,
            order: validationResult.data.orden || 0,
            type: typeToUse,
            offer_id: offerIdToUse,
            override_standard: validationResult.data.override_standard || false,
            updated_at: new Date(),
        };

        const nuevaCondicion = await prisma.studio_condiciones_comerciales.create({
            data: dataToSave,
        });

        revalidatePath(`/${studioSlug}/studio/configuracion/comercial/condiciones-comerciales`);

        return {
            success: true,
            data: nuevaCondicion,
        };
    } catch (error) {
        console.error("Error al crear condición comercial:", error);

        // Manejar error de restricción única en offer_id
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            const meta = error.meta as { target?: string[] } | undefined;
            if (meta?.target?.includes('offer_id')) {
                return {
                    success: false,
                    error: "Ya existe una condición comercial especial para esta oferta. Solo puede haber una condición especial por oferta.",
                };
            }
        }

        return {
            success: false,
            error: "Error al crear condición comercial",
        };
    }
}

// Actualizar condición comercial
export async function actualizarCondicionComercial(
    studioSlug: string,
    condicionId: string,
    data: CondicionComercialForm,
    context?: { offerId: string; type: 'offer' }
) {
    try {
        const validationResult = CondicionComercialSchema.safeParse(data);

        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.flatten().fieldErrors,
            };
        }

        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Verificar que la condición pertenezca al studio antes de actualizar
        const condicionExistente = await prisma.studio_condiciones_comerciales.findFirst({
            where: {
                id: condicionId,
                studio_id: studio.id,
            },
        });

        if (!condicionExistente) {
            return {
                success: false,
                error: "Condición comercial no encontrada o no pertenece al studio",
            };
        }

        // Verificar que el nombre sea único (excepto para la condición que se está editando)
        const condicionConMismoNombre = await prisma.studio_condiciones_comerciales.findFirst({
            where: {
                studio_id: studio.id,
                name: validationResult.data.nombre,
                id: { not: condicionId },
            },
        });

        if (condicionConMismoNombre) {
            return {
                success: false,
                error: {
                    nombre: ["Ya existe una condición comercial con este nombre"],
                },
            };
        }

        // Determinar valores de anticipo según tipo
        const tipoAnticipo = validationResult.data.tipo_anticipo || condicionExistente.advance_type || 'percentage';
        const advancePercentage = tipoAnticipo === 'percentage' && validationResult.data.porcentaje_anticipo
            ? parseFloat(validationResult.data.porcentaje_anticipo)
            : (tipoAnticipo === 'percentage' ? condicionExistente.advance_percentage : null);
        const advanceAmount = tipoAnticipo === 'fixed_amount' && validationResult.data.monto_anticipo
            ? parseFloat(validationResult.data.monto_anticipo)
            : (tipoAnticipo === 'fixed_amount' ? condicionExistente.advance_amount : null);

        const dataToSave = {
            name: validationResult.data.nombre,
            description: validationResult.data.descripcion,
            discount_percentage: validationResult.data.porcentaje_descuento ? parseFloat(validationResult.data.porcentaje_descuento) : null,
            advance_percentage: advancePercentage,
            advance_type: tipoAnticipo,
            advance_amount: advanceAmount,
            status: validationResult.data.status,
            order: validationResult.data.orden || 0,
            type: validationResult.data.type !== undefined ? validationResult.data.type : (context?.type === 'offer' ? 'offer' : condicionExistente.type || 'standard'),
            offer_id: validationResult.data.offer_id !== undefined ? validationResult.data.offer_id : (context?.offerId || condicionExistente.offer_id),
            override_standard: validationResult.data.override_standard ?? condicionExistente.override_standard ?? false,
            updated_at: new Date(),
        };

        const condicionActualizada = await prisma.studio_condiciones_comerciales.update({
            where: { id: condicionId },
            data: dataToSave,
        });

        revalidatePath(`/${studioSlug}/studio/configuracion/comercial/condiciones-comerciales`);

        return {
            success: true,
            data: condicionActualizada,
        };
    } catch (error) {
        console.error("Error al actualizar condición comercial:", error);
        return {
            success: false,
            error: "Error al actualizar condición comercial",
        };
    }
}

// Verificar asociaciones de condición comercial antes de eliminar
export async function checkCondicionComercialAssociations(
    studioSlug: string,
    condicionId: string
): Promise<{
    success: boolean;
    hasCotizaciones: boolean;
    cotizacionesCount: number;
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
                hasCotizaciones: false,
                cotizacionesCount: 0,
                error: "Studio no encontrado",
            };
        }

        // Verificar que la condición pertenezca al studio
        const condicion = await prisma.studio_condiciones_comerciales.findFirst({
            where: {
                id: condicionId,
                studio_id: studio.id,
            },
        });

        if (!condicion) {
            return {
                success: false,
                hasCotizaciones: false,
                cotizacionesCount: 0,
                error: "Condición comercial no encontrada o no pertenece al studio",
            };
        }

        // Contar cotizaciones asociadas
        const cotizacionesCount = await prisma.studio_cotizaciones.count({
            where: {
                studio_id: studio.id,
                condiciones_comerciales_id: condicionId,
            },
        });

        return {
            success: true,
            hasCotizaciones: cotizacionesCount > 0,
            cotizacionesCount,
        };
    } catch (error) {
        console.error("Error al verificar asociaciones de condición comercial:", error);
        return {
            success: false,
            hasCotizaciones: false,
            cotizacionesCount: 0,
            error: "Error al verificar asociaciones",
        };
    }
}

// Eliminar condición comercial
export async function eliminarCondicionComercial(studioSlug: string, condicionId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Verificar que la condición pertenezca al studio antes de eliminar
        const condicion = await prisma.studio_condiciones_comerciales.findFirst({
            where: {
                id: condicionId,
                studio_id: studio.id,
            },
        });

        if (!condicion) {
            return {
                success: false,
                error: "Condición comercial no encontrada o no pertenece al studio",
            };
        }

        // Verificar asociaciones antes de eliminar
        const checkResult = await checkCondicionComercialAssociations(studioSlug, condicionId);

        if (!checkResult.success) {
            return {
                success: false,
                error: checkResult.error || "Error al verificar asociaciones",
            };
        }

        if (checkResult.hasCotizaciones) {
            return {
                success: false,
                error: `No puedes eliminar esta condición comercial porque tiene ${checkResult.cotizacionesCount} cotización${checkResult.cotizacionesCount > 1 ? 'es' : ''} asociada${checkResult.cotizacionesCount > 1 ? 's' : ''}`,
            };
        }

        await prisma.studio_condiciones_comerciales.delete({
            where: { id: condicionId },
        });

        revalidatePath(`/${studioSlug}/studio/configuracion/comercial/condiciones-comerciales`);

        return {
            success: true,
            message: "Condición comercial eliminada exitosamente",
        };
    } catch (error) {
        console.error("Error al eliminar condición comercial:", error);
        return {
            success: false,
            error: "Error al eliminar condición comercial",
        };
    }
}

// Actualizar orden de condiciones comerciales
export async function actualizarOrdenCondicionesComerciales(studioSlug: string, condiciones: { id: string; orden: number }[]) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        await prisma.$transaction(
            condiciones.map(condicion =>
                prisma.studio_condiciones_comerciales.update({
                    where: { id: condicion.id },
                    data: { order: condicion.orden, updated_at: new Date() },
                })
            )
        );

        revalidatePath(`/${studioSlug}/studio/configuracion/comercial/condiciones-comerciales`);

        return {
            success: true,
            message: "Orden actualizado exitosamente",
        };
    } catch (error) {
        console.error("Error al actualizar orden:", error);
        return {
            success: false,
            error: "Error al actualizar orden",
        };
    }
}

// Obtener configuración de precios para validaciones
export async function obtenerConfiguracionPrecios(studioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        // Buscar configuración en studio_configuraciones
        const configuracion = await prisma.studio_configuraciones.findFirst({
            where: {
                studio_id: studio.id,
                status: 'active',
            },
            select: {
                markup: true,
                sales_commission: true, // Incluir para debugging/verificación
            },
        });

        // IMPORTANTE: Usar markup (sobreprecio) para el descuento máximo, NO sales_commission
        // markup está almacenado como decimal (0.10 = 10%), convertir a porcentaje
        const markupDecimal = configuracion?.markup ?? 0;
        const markupPorcentaje = markupDecimal * 100;

        return {
            success: true,
            data: {
                sobreprecio: markupPorcentaje,
            },
        };
    } catch (error) {
        console.error("Error al obtener configuración de precios:", error);
        return {
            success: false,
            error: "Error al obtener configuración de precios",
        };
    }
}
