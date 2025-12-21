'use server';

import { prisma } from '@/lib/prisma';

export interface NominaReceiptData {
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
    nomina: {
        id: string;
        net_amount: number;
        gross_amount: number;
        payment_method: string;
        payment_date: Date;
        concept: string;
        description: string | null;
        payment_type: string;
    };
    servicios: Array<{
        service_name: string;
        assigned_cost: number;
        assigned_quantity: number;
        category_name: string | null;
    }>;
    partialPayments?: Array<{
        payment_method: string;
        amount: number;
        payment_date: Date;
    }>;
    totalDiscounts?: number;
}

export async function obtenerDatosComprobanteNomina(
    studioSlug: string,
    nominaId: string
): Promise<{ success: boolean; data?: NominaReceiptData; error?: string }> {
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

        // Obtener nómina con personal y servicios
        const nomina = await prisma.studio_nominas.findFirst({
            where: {
                id: nominaId,
                studio_id: studio.id,
                status: 'pagado',
            },
            include: {
                personal: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                payroll_services: {
                    select: {
                        service_name: true,
                        assigned_cost: true,
                        assigned_quantity: true,
                        category_name: true,
                    },
                },
                partial_payments: {
                    select: {
                        payment_method: true,
                        amount: true,
                        payment_date: true,
                    },
                    orderBy: {
                        payment_date: 'asc',
                    },
                },
            },
        });

        if (!nomina) {
            return { success: false, error: 'Nómina no encontrada' };
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
                personal: nomina.personal ? {
                    name: nomina.personal.name,
                    phone: nomina.personal.phone,
                    email: nomina.personal.email,
                } : null,
                nomina: {
                    id: nomina.id,
                    net_amount: Number(nomina.net_amount),
                    gross_amount: Number(nomina.gross_amount),
                    payment_method: nomina.payment_method || 'transferencia',
                    payment_date: nomina.payment_date || nomina.updated_at,
                    concept: nomina.concept,
                    description: nomina.description,
                    payment_type: nomina.payment_type || 'individual',
                },
                servicios: nomina.payroll_services.map(s => ({
                    service_name: s.service_name,
                    assigned_cost: Number(s.assigned_cost),
                    assigned_quantity: s.assigned_quantity,
                    category_name: s.category_name,
                })),
                partialPayments: nomina.partial_payments.map(p => ({
                    payment_method: p.payment_method,
                    amount: Number(p.amount),
                    payment_date: p.payment_date,
                })),
                totalDiscounts: nomina.total_discounts ? Number(nomina.total_discounts) : undefined,
            },
        };
    } catch (error) {
        console.error('[NOMINA RECEIPT] Error obteniendo datos:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener datos del comprobante',
        };
    }
}
