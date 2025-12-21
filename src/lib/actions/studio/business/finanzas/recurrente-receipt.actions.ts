'use server';

import { prisma } from '@/lib/prisma';

export interface RecurrenteReceiptData {
    studio: {
        studio_name: string;
        address: string | null;
        email: string;
        phone: string | null;
        logo_url: string | null;
        bank_name: string | null;
        account_number: string | null;
        account_holder: string | null;
        clabe_number: string | null;
    };
    personal: {
        name: string;
        phone: string | null;
        email: string | null;
    } | null;
    gasto: {
        id: string;
        concept: string;
        amount: number;
        date: Date;
        description: string | null;
        payment_method: string | null;
    };
}

export async function obtenerDatosComprobanteRecurrente(
    studioSlug: string,
    gastoId: string
): Promise<{ success: boolean; data?: RecurrenteReceiptData; error?: string }> {
    try {
        // Obtener studio
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: {
                id: true,
                studio_name: true,
                email: true,
                address: true,
                logo_url: true,
                bank_name: true,
                account_number: true,
                account_holder: true,
                clabe_number: true,
                phones: {
                    where: { is_active: true },
                    select: { number: true },
                    take: 1,
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!studio) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Obtener gasto con personal
        const gasto = await prisma.studio_gastos.findFirst({
            where: {
                id: gastoId,
                studio_id: studio.id,
                category: 'Recurrente',
                personal_id: { not: null },
            },
            include: {
                personal: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });

        if (!gasto) {
            return { success: false, error: 'Gasto recurrente no encontrado o no tiene personal asociado' };
        }

        if (!gasto.personal) {
            return { success: false, error: 'El gasto no tiene personal asociado' };
        }

        return {
            success: true,
            data: {
                studio: {
                    studio_name: studio.studio_name,
                    address: studio.address,
                    email: studio.email,
                    phone: studio.phones[0]?.number || null,
                    logo_url: studio.logo_url,
                    bank_name: studio.bank_name,
                    account_number: studio.account_number,
                    account_holder: studio.account_holder,
                    clabe_number: studio.clabe_number,
                },
                personal: {
                    name: gasto.personal.name,
                    phone: gasto.personal.phone,
                    email: gasto.personal.email,
                },
                gasto: {
                    id: gasto.id,
                    concept: gasto.concept,
                    amount: Number(gasto.amount),
                    date: gasto.date,
                    description: gasto.description,
                    payment_method: gasto.payment_method || 'transferencia',
                },
            },
        };
    } catch (error) {
        console.error('[RECURRENTE RECEIPT] Error obteniendo datos:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener datos del comprobante',
        };
    }
}
