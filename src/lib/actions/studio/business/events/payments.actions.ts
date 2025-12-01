'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Schemas de validación
const createPaymentSchema = z.object({
    studio_slug: z.string().min(1),
    cotizacion_id: z.string().min(1, 'Cotización requerida'),
    promise_id: z.string().optional(),
    amount: z.number().positive('El monto debe ser positivo'),
    metodo_pago: z.string().min(1, 'Método de pago requerido'),
    concept: z.string().min(1, 'Concepto requerido'),
    description: z.string().optional(),
    payment_date: z.date().optional(),
});

const updatePaymentSchema = createPaymentSchema.partial().extend({
    id: z.string().min(1, 'ID de pago requerido'),
});

export interface PaymentItem {
    id: string;
    amount: number;
    payment_method: string;
    payment_date: Date;
    concept: string;
    description?: string | null;
    created_at: Date;
}

export interface PaymentResponse {
    success: boolean;
    data?: PaymentItem;
    error?: string;
}

export interface PaymentListResponse {
    success: boolean;
    data?: PaymentItem[];
    error?: string;
}

/**
 * Obtener pagos por cotización
 */
export async function obtenerPagosPorCotizacion(
    studioSlug: string,
    cotizacionId: string
): Promise<PaymentListResponse> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const cotizacion = await prisma.studio_cotizaciones.findFirst({
            where: {
                id: cotizacionId,
                studio_id: studio.id,
            },
            select: { id: true },
        });

        if (!cotizacion) {
            return { success: false, error: 'Cotización no encontrada' };
        }

        const pagos = await prisma.studio_pagos.findMany({
            where: {
                cotizacion_id: cotizacionId,
                cotizaciones: {
                    studio_id: studio.id,
                },
            },
            select: {
                id: true,
                amount: true,
                metodo_pago: true,
                payment_date: true,
                concept: true,
                description: true,
                created_at: true,
            },
            orderBy: {
                payment_date: 'desc',
            },
        });

        const items: PaymentItem[] = pagos.map((pago) => ({
            id: pago.id,
            amount: Number(pago.amount),
            payment_method: pago.metodo_pago,
            payment_date: pago.payment_date || pago.created_at,
            concept: pago.concept,
            description: pago.description,
            created_at: pago.created_at,
        }));

        return {
            success: true,
            data: items,
        };
    } catch (error) {
        console.error('[PAYMENTS] Error obteniendo pagos:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener pagos',
        };
    }
}

/**
 * Crear pago
 */
export async function crearPago(
    data: z.infer<typeof createPaymentSchema>
): Promise<PaymentResponse> {
    try {
        const validatedData = createPaymentSchema.parse(data);

        const studio = await prisma.studios.findUnique({
            where: { slug: validatedData.studio_slug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que la cotización existe y pertenece al studio
        const cotizacion = await prisma.studio_cotizaciones.findFirst({
            where: {
                id: validatedData.cotizacion_id,
                studio_id: studio.id,
            },
            select: {
                id: true,
                promise_id: true,
            },
        });

        if (!cotizacion) {
            return { success: false, error: 'Cotización no encontrada' };
        }

        // Crear el pago
        const pago = await prisma.studio_pagos.create({
            data: {
                cotizacion_id: validatedData.cotizacion_id,
                promise_id: validatedData.promise_id || cotizacion.promise_id || null,
                amount: validatedData.amount,
                metodo_pago: validatedData.metodo_pago,
                concept: validatedData.concept,
                description: validatedData.description || null,
                payment_date: validatedData.payment_date || new Date(),
                status: 'completed',
                transaction_type: 'ingreso',
                transaction_category: 'abono',
            },
            select: {
                id: true,
                amount: true,
                metodo_pago: true,
                payment_date: true,
                concept: true,
                description: true,
                created_at: true,
            },
        });

        revalidatePath(`/${validatedData.studio_slug}/studio/business/events`);
        revalidatePath(`/${validatedData.studio_slug}/studio/business/finanzas`);

        const item: PaymentItem = {
            id: pago.id,
            amount: Number(pago.amount),
            payment_method: pago.metodo_pago,
            payment_date: pago.payment_date || pago.created_at,
            concept: pago.concept,
            description: pago.description,
            created_at: pago.created_at,
        };

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[PAYMENTS] Error creando pago:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear pago',
        };
    }
}

/**
 * Actualizar pago
 */
export async function actualizarPago(
    data: z.infer<typeof updatePaymentSchema>
): Promise<PaymentResponse> {
    try {
        const validatedData = updatePaymentSchema.parse(data);

        const studio = await prisma.studios.findUnique({
            where: { slug: validatedData.studio_slug! },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que el pago existe y pertenece al studio
        const pagoExistente = await prisma.studio_pagos.findFirst({
            where: {
                id: validatedData.id,
                cotizaciones: {
                    studio_id: studio.id,
                },
            },
        });

        if (!pagoExistente) {
            return { success: false, error: 'Pago no encontrado' };
        }

        // Actualizar el pago
        const updateData: {
            amount?: number;
            metodo_pago?: string;
            concept?: string;
            description?: string | null;
            payment_date?: Date;
        } = {};

        if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;
        if (validatedData.metodo_pago !== undefined) updateData.metodo_pago = validatedData.metodo_pago;
        if (validatedData.concept !== undefined) updateData.concept = validatedData.concept;
        if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
        if (validatedData.payment_date !== undefined) updateData.payment_date = validatedData.payment_date;

        const pago = await prisma.studio_pagos.update({
            where: { id: validatedData.id },
            data: updateData,
            select: {
                id: true,
                amount: true,
                metodo_pago: true,
                payment_date: true,
                concept: true,
                description: true,
                created_at: true,
            },
        });

        revalidatePath(`/${validatedData.studio_slug}/studio/business/events`);
        revalidatePath(`/${validatedData.studio_slug}/studio/business/finanzas`);

        const item: PaymentItem = {
            id: pago.id,
            amount: Number(pago.amount),
            payment_method: pago.metodo_pago,
            payment_date: pago.payment_date || pago.created_at,
            concept: pago.concept,
            description: pago.description,
            created_at: pago.created_at,
        };

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[PAYMENTS] Error actualizando pago:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar pago',
        };
    }
}

/**
 * Cancelar pago (mantiene historial cambiando status a 'cancelled')
 */
export async function cancelarPago(
    studioSlug: string,
    pagoId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que el pago existe y pertenece al studio
        const pago = await prisma.studio_pagos.findFirst({
            where: {
                id: pagoId,
                OR: [
                    {
                        cotizaciones: {
                            studio_id: studio.id,
                        },
                    },
                    {
                        promise: {
                            studio_id: studio.id,
                        },
                    },
                    {
                        studio_users: {
                            studio_id: studio.id,
                        },
                    },
                ],
            },
        });

        if (!pago) {
            return { success: false, error: 'Pago no encontrado' };
        }

        // Verificar que el pago no esté ya cancelado
        if (pago.status === 'cancelled' || pago.status === 'cancelado') {
            return { success: false, error: 'El pago ya está cancelado' };
        }

        // Cambiar status a 'cancelled' para mantener historial
        await prisma.studio_pagos.update({
            where: { id: pagoId },
            data: {
                status: 'cancelled',
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/events`);
        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('[PAYMENTS] Error cancelando pago:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al cancelar pago',
        };
    }
}

/**
 * Eliminar pago (DEPRECATED - usar cancelarPago para mantener historial)
 */
export async function eliminarPago(
    studioSlug: string,
    pagoId: string
): Promise<{ success: boolean; error?: string }> {
    // Por defecto, usar cancelación en lugar de eliminación
    return cancelarPago(studioSlug, pagoId);
}

/**
 * Schema para crear ingreso manual (sin cotización)
 */
const createManualIncomeSchema = z.object({
    studio_slug: z.string().min(1),
    amount: z.number().positive('El monto debe ser positivo'),
    metodo_pago: z.string().min(1, 'Método de pago requerido'),
    concept: z.string().min(1, 'Concepto requerido'),
    description: z.string().optional(),
    payment_date: z.date().optional(),
});

/**
 * Crear ingreso manual (sin cotización ni promesa)
 */
export async function crearIngresoManual(
    data: z.infer<typeof createManualIncomeSchema>
): Promise<{ success: boolean; error?: string; data?: PaymentItem }> {
    try {
        const validatedData = createManualIncomeSchema.parse(data);

        const studio = await prisma.studios.findUnique({
            where: { slug: validatedData.studio_slug },
            select: { id: true },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Obtener usuario actual para asociar el pago al studio
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser?.id) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        // Buscar studio_user_profiles del suscriptor autenticado
        const studioUserProfile = await prisma.studio_user_profiles.findFirst({
            where: {
                supabase_id: authUser.id,
                studio_id: studio.id,
                is_active: true,
            },
            select: { id: true, email: true, full_name: true },
        });

        if (!studioUserProfile) {
            return { success: false, error: 'Usuario no encontrado en el studio' };
        }

        // Buscar o crear studio_users para este suscriptor
        let studioUser = await prisma.studio_users.findFirst({
            where: {
                studio_id: studio.id,
                full_name: studioUserProfile.full_name,
                is_active: true,
            },
            select: { id: true },
        });

        // Si no existe el studio_user, crearlo automáticamente
        if (!studioUser) {
            studioUser = await prisma.studio_users.create({
                data: {
                    studio_id: studio.id,
                    full_name: studioUserProfile.full_name,
                    phone: null,
                    type: 'EMPLEADO',
                    role: 'owner',
                    status: 'active',
                    is_active: true,
                    platform_user_id: null,
                },
                select: { id: true },
            });
        }

        // Crear el pago sin cotización ni promesa, pero asociado a studio_users
        const pago = await prisma.studio_pagos.create({
            data: {
                cotizacion_id: null,
                promise_id: null,
                user_id: studioUser.id,
                amount: validatedData.amount,
                metodo_pago: validatedData.metodo_pago,
                concept: validatedData.concept,
                description: validatedData.description || null,
                payment_date: validatedData.payment_date || new Date(),
                status: 'completed',
                transaction_type: 'ingreso',
                transaction_category: 'manual',
            },
            select: {
                id: true,
                amount: true,
                metodo_pago: true,
                payment_date: true,
                concept: true,
                description: true,
                created_at: true,
            },
        });

        revalidatePath(`/${validatedData.studio_slug}/studio/business/finanzas`);

        const item: PaymentItem = {
            id: pago.id,
            amount: Number(pago.amount),
            payment_method: pago.metodo_pago,
            payment_date: pago.payment_date || pago.created_at,
            concept: pago.concept,
            description: pago.description,
            created_at: pago.created_at,
        };

        return {
            success: true,
            data: item,
        };
    } catch (error) {
        console.error('[PAYMENTS] Error creando ingreso manual:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear ingreso manual',
        };
    }
}

