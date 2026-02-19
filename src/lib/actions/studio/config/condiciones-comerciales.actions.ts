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
            include: {
                condiciones_comerciales_metodo_pago: {
                    where: {
                        status: 'active',
                    },
                    include: {
                        metodos_pago: {
                            select: {
                                id: true,
                                payment_method_name: true,
                            },
                        },
                    },
                    orderBy: {
                        orden: 'asc',
                    },
                },
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

        const condicionesRaw = await prisma.studio_condiciones_comerciales.findMany({
            where: {
                studio_id: studio.id,
            },
            include: {
                exclusive_offer: {
                    select: {
                        id: true,
                        name: true,
                        is_active: true,
                        is_permanent: true,
                        has_date_range: true,
                        start_date: true,
                        end_date: true,
                    },
                },
            },
            orderBy: { order: 'asc' },
        });

        // Standard primero, luego offer; dentro de cada tipo por order
        const condiciones = [...condicionesRaw].sort((a, b) => {
            const aType = a.type || 'standard';
            const bType = b.type || 'standard';
            if (aType === bType) return (a.order || 0) - (b.order || 0);
            if (aType === 'standard' && bType === 'offer') return -1;
            if (aType === 'offer' && bType === 'standard') return 1;
            return 0;
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
            include: {
                exclusive_offer: {
                    select: {
                        id: true,
                        name: true,
                        is_active: true,
                        is_permanent: true,
                        has_date_range: true,
                        start_date: true,
                        end_date: true,
                    },
                },
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

// Desvincular oferta de una condición comercial (offer_id → null, type → standard)
export async function desvincularOfertaCondicionComercial(studioSlug: string, condicionId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });
        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        const condicion = await prisma.studio_condiciones_comerciales.findFirst({
            where: { id: condicionId, studio_id: studio.id },
            select: { id: true, offer_id: true, type: true },
        });
        if (!condicion) {
            return { success: false, error: "Condición comercial no encontrada" };
        }
        if (!condicion.offer_id || condicion.type !== 'offer') {
            return { success: false, error: "La condición no tiene una oferta vinculada" };
        }

        const actualizada = await prisma.studio_condiciones_comerciales.update({
            where: { id: condicionId },
            data: {
                offer_id: null,
                type: 'standard',
                updated_at: new Date(),
            },
            include: {
                exclusive_offer: {
                    select: {
                        id: true,
                        name: true,
                        is_active: true,
                        is_permanent: true,
                        has_date_range: true,
                        start_date: true,
                        end_date: true,
                    },
                },
            },
        });

        revalidatePath(`/${studioSlug}/studio/configuracion/comercial/condiciones-comerciales`);
        return { success: true, data: actualizada };
    } catch (error) {
        console.error("Error al desvincular oferta:", error);
        return { success: false, error: "Error al desvincular la oferta" };
    }
}

export type OfertaDisponibleParaVincular = {
    id: string;
    name: string;
    vigenciaLabel: string;
};

export type OfertaParaVincular = {
    id: string;
    name: string;
    vigenciaLabel: string;
    isVigente: boolean;
    linkedToOtraCondicion: boolean;
};

/** Todas las ofertas del studio (vigentes y vencidas) para mostrar en lista con toggle Vincular/Desvincular. Incluye la oferta actualmente vinculada a la condición en edición aunque esté inactiva/vencida. */
export async function obtenerOfertasParaVincular(
    studioSlug: string,
    condicionIdExcluida?: string | null
): Promise<{ success: boolean; data?: OfertaParaVincular[]; error?: string }> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });
        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        let offerIdVinculadaActual: string | null = null;
        if (condicionIdExcluida) {
            const condicion = await prisma.studio_condiciones_comerciales.findFirst({
                where: { id: condicionIdExcluida, studio_id: studio.id },
                select: { offer_id: true },
            });
            offerIdVinculadaActual = condicion?.offer_id ?? null;
        }

        const ofertas = await prisma.studio_offers.findMany({
            where: {
                studio_id: studio.id,
                OR: [
                    { is_active: true },
                    ...(offerIdVinculadaActual ? [{ id: offerIdVinculadaActual }] : []),
                ],
            },
            select: {
                id: true,
                name: true,
                is_active: true,
                is_permanent: true,
                has_date_range: true,
                start_date: true,
                end_date: true,
            },
            orderBy: { name: "asc" },
        });

        const usedByOtherCondition = await prisma.studio_condiciones_comerciales.findMany({
            where: {
                studio_id: studio.id,
                offer_id: { not: null },
                ...(condicionIdExcluida ? { id: { not: condicionIdExcluida } } : {}),
            },
            select: { offer_id: true },
        });
        const usedOfferIds = new Set(usedByOtherCondition.map((c) => c.offer_id).filter(Boolean) as string[]);

        const now = new Date();
        const data: OfertaParaVincular[] = ofertas.map((o) => {
            const isVigente =
                o.is_active &&
                (o.is_permanent || !!(o.has_date_range && o.start_date && o.end_date && now >= o.start_date && now <= o.end_date));
            let vigenciaLabel = "Permanente";
            if (!o.is_permanent && o.has_date_range && o.end_date) {
                vigenciaLabel = `Hasta ${o.end_date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}`;
            } else if (!o.is_permanent && o.has_date_range && o.start_date && o.end_date) {
                vigenciaLabel = `${o.start_date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })} – ${o.end_date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}`;
            }
            return {
                id: o.id,
                name: o.name,
                vigenciaLabel,
                isVigente,
                linkedToOtraCondicion: usedOfferIds.has(o.id),
            };
        });

        data.sort((a, b) => (a.isVigente === b.isVigente ? 0 : a.isVigente ? -1 : 1));

        return { success: true, data };
    } catch (error) {
        console.error("Error al obtener ofertas para vincular:", error);
        return { success: false, error: "Error al cargar ofertas" };
    }
}

/** Ofertas activas y vigentes que aún no tienen condición exclusiva (1:1). Opcionalmente excluir la condición en edición para que su oferta actual siga en la lista. */
export async function obtenerOfertasDisponiblesParaVincular(
    studioSlug: string,
    condicionIdExcluida?: string | null
): Promise<{ success: boolean; data?: OfertaDisponibleParaVincular[]; error?: string }> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });
        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        const usedOfferIds = await prisma.studio_condiciones_comerciales.findMany({
            where: {
                studio_id: studio.id,
                offer_id: { not: null },
                ...(condicionIdExcluida ? { id: { not: condicionIdExcluida } } : {}),
            },
            select: { offer_id: true },
        });
        const usedIds = usedOfferIds.map((c) => c.offer_id).filter(Boolean) as string[];

        const now = new Date();
        const ofertas = await prisma.studio_offers.findMany({
            where: {
                studio_id: studio.id,
                is_active: true,
                ...(usedIds.length ? { id: { notIn: usedIds } } : {}),
            },
            select: {
                id: true,
                name: true,
                is_permanent: true,
                has_date_range: true,
                start_date: true,
                end_date: true,
            },
        });

        const vigentes = ofertas.filter((o) => {
            if (o.is_permanent) return true;
            if (!o.has_date_range || !o.start_date || !o.end_date) return false;
            return now >= o.start_date && now <= o.end_date;
        });

        const data: OfertaDisponibleParaVincular[] = vigentes.map((o) => {
            let vigenciaLabel = "Permanente";
            if (!o.is_permanent && o.has_date_range && o.end_date) {
                vigenciaLabel = `Hasta ${o.end_date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}`;
            } else if (!o.is_permanent && o.has_date_range && o.start_date && o.end_date) {
                vigenciaLabel = `${o.start_date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })} – ${o.end_date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}`;
            }
            return { id: o.id, name: o.name, vigenciaLabel };
        });

        return { success: true, data };
    } catch (error) {
        console.error("Error al obtener ofertas disponibles:", error);
        return { success: false, error: "Error al cargar ofertas" };
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

        const typeToUse = context?.type === 'offer' ? 'offer' : validationResult.data.type || 'standard';
        const offerIdToUse = typeToUse === 'offer' && validationResult.data.offer_id ? validationResult.data.offer_id : null;

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
            is_public: typeToUse === 'offer' ? true : (validationResult.data.is_public ?? true),
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
            const meta = (error as { meta?: { target?: string[] } }).meta;
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

        const typeToSave = validationResult.data.type !== undefined ? validationResult.data.type : (context?.type === 'offer' ? 'offer' : condicionExistente.type || 'standard');
        const dataToSave = {
            name: validationResult.data.nombre,
            description: validationResult.data.descripcion,
            discount_percentage: validationResult.data.porcentaje_descuento ? parseFloat(validationResult.data.porcentaje_descuento) : null,
            advance_percentage: advancePercentage,
            advance_type: tipoAnticipo,
            advance_amount: advanceAmount,
            status: validationResult.data.status,
            order: validationResult.data.orden || 0,
            type: typeToSave,
            offer_id: validationResult.data.offer_id !== undefined ? validationResult.data.offer_id : (context?.offerId || condicionExistente.offer_id),
            override_standard: validationResult.data.override_standard ?? condicionExistente.override_standard ?? false,
            is_public: typeToSave === 'offer' ? true : (validationResult.data.is_public ?? (condicionExistente as { is_public?: boolean }).is_public ?? true),
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

/** Elimina la condición comercial desvinculándola antes de las cotizaciones que la usan (pone condiciones_comerciales_id = null). */
export async function eliminarCondicionComercialDesvinculando(studioSlug: string, condicionId: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            throw new Error("Studio no encontrado");
        }

        const condicion = await prisma.studio_condiciones_comerciales.findFirst({
            where: { id: condicionId, studio_id: studio.id },
        });

        if (!condicion) {
            return {
                success: false,
                error: "Condición comercial no encontrada o no pertenece al studio",
            };
        }

        await prisma.$transaction([
            prisma.studio_cotizaciones.updateMany({
                where: { studio_id: studio.id, condiciones_comerciales_id: condicionId },
                data: { condiciones_comerciales_id: null },
            }),
            prisma.studio_condiciones_comerciales.delete({
                where: { id: condicionId },
            }),
        ]);

        revalidatePath(`/${studioSlug}/studio/configuracion/comercial/condiciones-comerciales`);

        return {
            success: true,
            message: "Condición comercial eliminada. Se desvinculó de las cotizaciones que la usaban.",
        };
    } catch (error) {
        console.error("Error al eliminar condición comercial (desvinculando):", error);
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
