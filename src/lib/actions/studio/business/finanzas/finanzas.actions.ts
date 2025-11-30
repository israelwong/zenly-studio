'use server';

import { prisma } from '@/lib/prisma';

interface FinanceKPIs {
    ingresos: number;
    egresos: number;
    utilidad: number;
    porCobrar: number;
    porPagar: number;
}

export interface FinanceKPIsDebug {
    promesasEncontradas: number;
    cotizacionesEncontradas: number;
    totalCotizaciones: number;
    totalPagos: number;
}

type FinanceKPIsResult =
    | { success: true; data: FinanceKPIs; debug?: FinanceKPIsDebug }
    | { success: false; error: string };

interface Transaction {
    id: string;
    fecha: Date;
    fuente: 'evento' | 'staff' | 'operativo';
    concepto: string;
    categoria: string;
    monto: number;
}

interface PendingItem {
    id: string;
    concepto: string;
    monto: number;
    fecha: Date;
}

interface RecurringExpense {
    id: string;
    name: string;
    amount: number;
    category: string;
    chargeDay: number;
    isActive: boolean;
}

/**
 * Obtener el ID del studio desde el slug
 */
async function getStudioId(slug: string): Promise<string | null> {
    const studio = await prisma.studios.findUnique({
        where: { slug },
        select: { id: true },
    });
    return studio?.id ?? null;
}

/**
 * Obtener rango de fechas para un mes específico
 */
function getMonthRange(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
}

/**
 * Obtener KPIs financieros para un mes específico
 */
export async function obtenerKPIsFinancieros(
    studioSlug: string,
    month: Date
): Promise<FinanceKPIsResult> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const { start, end } = getMonthRange(month);

        // Ingresos: studio_pagos con status "paid" o "completed" del mes
        // Buscar a través de studio_users, promise o cotizacion
        // Si payment_date es null, usar created_at
        const ingresos = await prisma.studio_pagos.aggregate({
            where: {
                AND: [
                    {
                        OR: [
                            { studio_users: { studio_id: studioId } },
                            { promise: { studio_id: studioId } },
                            { cotizaciones: { studio_id: studioId } },
                        ],
                    },
                    {
                        status: { in: ['paid', 'completed'] },
                    },
                    {
                        OR: [
                            {
                                payment_date: {
                                    gte: start,
                                    lte: end,
                                },
                            },
                            {
                                AND: [
                                    { payment_date: null },
                                    {
                                        created_at: {
                                            gte: start,
                                            lte: end,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            _sum: {
                amount: true,
            },
        });

        // Egresos: studio_gastos + studio_nominas (status "pagado") del mes
        const gastos = await prisma.studio_gastos.aggregate({
            where: {
                studio_id: studioId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
            _sum: {
                amount: true,
            },
        });

        const nominasPagadas = await prisma.studio_nominas.aggregate({
            where: {
                studio_id: studioId,
                status: 'pagado',
                payment_date: {
                    gte: start,
                    lte: end,
                },
            },
            _sum: {
                net_amount: true,
            },
        });

        // Por Cobrar: Calcular desde promesas y cotizaciones
        // Estrategia: Buscar promesas que tengan cotizaciones aprobadas
        // Luego buscar pagos asociados a esas promesas (vía promise_id) o cotizaciones (vía cotizacion_id)

        // Primero: Obtener todas las promesas del studio que tengan cotizaciones aprobadas
        const promesas = await prisma.studio_promises.findMany({
            where: {
                studio_id: studioId,
                quotes: {
                    some: {
                        status: { in: ['aprobada', 'autorizada', 'correcto', 'approved'] },
                    },
                },
            },
            select: {
                id: true,
                status: true,
                quotes: {
                    where: {
                        status: { in: ['aprobada', 'autorizada', 'correcto', 'approved'] },
                    },
                    select: {
                        id: true,
                        price: true,
                        discount: true,
                        status: true,
                    },
                },
            },
        });

        console.log('[FINANZAS] Promesas encontradas:', promesas.length);
        promesas.forEach(p => {
            console.log(`[FINANZAS] Promesa ${p.id}: status=${p.status}, cotizaciones=${p.quotes.length}`);
            p.quotes.forEach(q => {
                console.log(`[FINANZAS]   Cotización ${q.id}: price=${q.price}, discount=${q.discount}, status=${q.status}`);
            });
        });

        let totalPorCobrar = 0;
        const cotizacionIds: string[] = [];
        const promiseIds: string[] = [];
        let totalPagos = 0;

        for (const promesa of promesas) {
            promiseIds.push(promesa.id);
            for (const cotizacion of promesa.quotes) {
                const totalCotizacion = cotizacion.price - (cotizacion.discount || 0);
                cotizacionIds.push(cotizacion.id);
                totalPorCobrar += totalCotizacion;
                console.log(`[FINANZAS] Cotización ${cotizacion.id}: ${cotizacion.price} - ${cotizacion.discount || 0} = ${totalCotizacion}`);
            }
        }

        console.log('[FINANZAS] Total cotizaciones antes de pagos:', totalPorCobrar);
        console.log('[FINANZAS] IDs de cotizaciones:', cotizacionIds);
        console.log('[FINANZAS] IDs de promesas:', promiseIds);

        // Restar pagos realizados (status paid o completed)
        // Los pagos pueden estar asociados a cotizaciones (cotizacion_id) o a promesas (promise_id)
        if (cotizacionIds.length > 0 || promiseIds.length > 0) {
            // Primero obtener los pagos para ver detalles
            const pagosDetalle = await prisma.studio_pagos.findMany({
                where: {
                    OR: [
                        {
                            cotizacion_id: { in: cotizacionIds },
                        },
                        {
                            promise_id: { in: promiseIds },
                        },
                    ],
                    status: { in: ['paid', 'completed'] },
                },
                select: {
                    id: true,
                    cotizacion_id: true,
                    promise_id: true,
                    amount: true,
                    status: true,
                },
            });

            console.log('[FINANZAS] Pagos encontrados:', pagosDetalle.length);
            pagosDetalle.forEach(p => {
                console.log(`[FINANZAS]   Pago ${p.id}: promise_id=${p.promise_id}, cotizacion_id=${p.cotizacion_id}, amount=${p.amount}, status=${p.status}`);
            });

            const pagosRealizados = await prisma.studio_pagos.aggregate({
                where: {
                    OR: [
                        {
                            cotizacion_id: { in: cotizacionIds },
                        },
                        {
                            promise_id: { in: promiseIds },
                        },
                    ],
                    status: { in: ['paid', 'completed'] },
                },
                _sum: {
                    amount: true,
                },
            });

            totalPagos = pagosRealizados._sum.amount || 0;
            console.log('[FINANZAS] Total pagos realizados:', totalPagos);
            totalPorCobrar -= totalPagos;
        } else {
            console.log('[FINANZAS] No hay cotizaciones ni promesas, no se buscan pagos');
        }

        console.log('[FINANZAS] Total por cobrar final:', totalPorCobrar);

        // Asegurar que no sea negativo
        totalPorCobrar = Math.max(0, totalPorCobrar);

        // Por Pagar: studio_nominas con status "pendiente"
        const porPagar = await prisma.studio_nominas.aggregate({
            where: {
                studio_id: studioId,
                status: 'pendiente',
            },
            _sum: {
                net_amount: true,
            },
        });

        const ingresosTotal = ingresos._sum.amount ?? 0;
        const gastosTotal = gastos._sum.amount ?? 0;
        const nominasTotal = nominasPagadas._sum.net_amount ?? 0;
        const egresosTotal = gastosTotal + nominasTotal;
        const utilidad = ingresosTotal - egresosTotal;
        const porCobrarTotal = totalPorCobrar;
        const porPagarTotal = porPagar._sum.net_amount ?? 0;

        const result = {
            success: true,
            data: {
                ingresos: ingresosTotal,
                egresos: egresosTotal,
                utilidad,
                porCobrar: porCobrarTotal,
                porPagar: porPagarTotal,
            },
            debug: {
                promesasEncontradas: promesas.length,
                cotizacionesEncontradas: cotizacionIds.length,
                totalCotizaciones: totalPorCobrar + totalPagos,
                totalPagos: totalPagos,
            },
        };

        return result;
    } catch (error) {
        console.error('Error obteniendo KPIs financieros:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}

/**
 * Obtener movimientos unificados (pagos, nóminas, gastos) para un mes
 */
export async function obtenerMovimientos(
    studioSlug: string,
    month: Date
): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const { start, end } = getMonthRange(month);

        // Obtener pagos (ingresos)
        // Si payment_date es null, usar created_at para filtrar
        const pagos = await prisma.studio_pagos.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { studio_users: { studio_id: studioId } },
                            { promise: { studio_id: studioId } },
                            { cotizaciones: { studio_id: studioId } },
                        ],
                    },
                    {
                        OR: [
                            {
                                payment_date: {
                                    gte: start,
                                    lte: end,
                                },
                            },
                            {
                                AND: [
                                    { payment_date: null },
                                    {
                                        created_at: {
                                            gte: start,
                                            lte: end,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                payment_date: true,
                created_at: true,
                concept: true,
                amount: true,
                transaction_category: true,
                promise: {
                    select: {
                        eventos: {
                            select: {
                                event_name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { payment_date: 'desc' },
                { created_at: 'desc' },
            ],
        });

        // Obtener nóminas (egresos)
        const nominas = await prisma.studio_nominas.findMany({
            where: {
                studio_id: studioId,
                payment_date: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                id: true,
                payment_date: true,
                concept: true,
                net_amount: true,
                personal: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                payment_date: 'desc',
            },
        });

        // Obtener gastos (egresos)
        const gastos = await prisma.studio_gastos.findMany({
            where: {
                studio_id: studioId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                id: true,
                date: true,
                concept: true,
                amount: true,
                category: true,
            },
            orderBy: {
                date: 'desc',
            },
        });

        // Transformar y unificar
        const transactions: Transaction[] = [
            ...pagos.map((pago) => ({
                id: pago.id,
                fecha: pago.payment_date ?? new Date(pago.created_at),
                fuente: 'evento' as const,
                concepto: pago.concept || pago.promise?.eventos?.event_name || 'Ingreso',
                categoria: pago.transaction_category || 'Ingreso',
                monto: pago.amount,
            })),
            ...nominas.map((nomina) => ({
                id: nomina.id,
                fecha: nomina.payment_date ?? nomina.assignment_date,
                fuente: 'staff' as const,
                concepto: nomina.concept || `Nómina - ${nomina.personal?.name || 'Personal'}`,
                categoria: 'Nómina',
                monto: -nomina.net_amount,
            })),
            ...gastos.map((gasto) => ({
                id: gasto.id,
                fecha: gasto.date,
                fuente: 'operativo' as const,
                concepto: gasto.concept,
                categoria: gasto.category,
                monto: -gasto.amount,
            })),
        ];

        // Ordenar por fecha descendente
        transactions.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

        return {
            success: true,
            data: transactions,
        };
    } catch (error) {
        console.error('Error obteniendo movimientos:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}

/**
 * Obtener pendientes por cobrar (calculado desde promesas y cotizaciones)
 */
export async function obtenerPorCobrar(
    studioSlug: string
): Promise<{ success: boolean; data?: PendingItem[]; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Obtener todas las promesas con sus cotizaciones
        // Solo promesas con status "aprobada", "autorizada" o "approved"
        // Solo cotizaciones con status "aprobada", "autorizada", "correcto" o "approved"
        const promesas = await prisma.studio_promises.findMany({
            where: {
                studio_id: studioId,
                status: { in: ['aprobada', 'autorizada', 'approved'] },
            },
            select: {
                id: true,
                name: true,
                contact: {
                    select: {
                        full_name: true,
                    },
                },
                quotes: {
                    where: {
                        status: { in: ['aprobada', 'autorizada', 'correcto', 'approved'] },
                    },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        discount: true,
                        status: true,
                        created_at: true,
                    },
                },
            },
        });

        // Obtener todos los pagos realizados para estas cotizaciones
        const cotizacionIds = promesas.flatMap(p => p.quotes.map(q => q.id));
        const pagosRealizados = await prisma.studio_pagos.findMany({
            where: {
                cotizacion_id: { in: cotizacionIds },
                status: { in: ['paid', 'completed'] },
            },
            select: {
                cotizacion_id: true,
                amount: true,
            },
        });

        // Agrupar pagos por cotización
        const pagosPorCotizacion = new Map<string, number>();
        pagosRealizados.forEach(pago => {
            if (pago.cotizacion_id) {
                const actual = pagosPorCotizacion.get(pago.cotizacion_id) || 0;
                pagosPorCotizacion.set(pago.cotizacion_id, actual + pago.amount);
            }
        });

        // Calcular pendiente por cotización
        const porCobrar: PendingItem[] = [];

        for (const promesa of promesas) {
            for (const cotizacion of promesa.quotes) {
                const totalCotizacion = cotizacion.price - (cotizacion.discount || 0);
                const pagosDeEstaCotizacion = pagosPorCotizacion.get(cotizacion.id) || 0;
                const pendiente = totalCotizacion - pagosDeEstaCotizacion;

                // Solo agregar si hay pendiente por cobrar
                if (pendiente > 0) {
                    porCobrar.push({
                        id: cotizacion.id,
                        concepto: `${cotizacion.name || 'Cotización'} - ${promesa.name || promesa.contact.full_name || 'Promesa'}`,
                        monto: pendiente,
                        fecha: cotizacion.created_at,
                    });
                }
            }
        }

        // Ordenar por fecha descendente
        porCobrar.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

        return {
            success: true,
            data: porCobrar,
        };
    } catch (error) {
        console.error('Error obteniendo por cobrar:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}

/**
 * Obtener pendientes por pagar (nóminas pendientes)
 */
export async function obtenerPorPagar(
    studioSlug: string
): Promise<{ success: boolean; data?: PendingItem[]; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const nominas = await prisma.studio_nominas.findMany({
            where: {
                studio_id: studioId,
                status: 'pendiente',
            },
            select: {
                id: true,
                concept: true,
                net_amount: true,
                assignment_date: true,
                personal: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                assignment_date: 'desc',
            },
        });

        const porPagar: PendingItem[] = nominas.map((nomina) => ({
            id: nomina.id,
            concepto: nomina.concept || `Nómina - ${nomina.personal?.name || 'Personal'}`,
            monto: nomina.net_amount,
            fecha: nomina.assignment_date,
        }));

        return {
            success: true,
            data: porPagar,
        };
    } catch (error) {
        console.error('Error obteniendo por pagar:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}

/**
 * Obtener gastos recurrentes
 */
export async function obtenerGastosRecurrentes(
    studioSlug: string
): Promise<{ success: boolean; data?: RecurringExpense[]; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const gastos = await prisma.studio_recurring_expenses.findMany({
            where: {
                studio_id: studioId,
            },
            select: {
                id: true,
                name: true,
                amount: true,
                category: true,
                charge_day: true,
                is_active: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        const expenses: RecurringExpense[] = gastos.map((gasto) => ({
            id: gasto.id,
            name: gasto.name,
            amount: gasto.amount,
            category: gasto.category,
            chargeDay: gasto.charge_day,
            isActive: gasto.is_active,
        }));

        return {
            success: true,
            data: expenses,
        };
    } catch (error) {
        console.error('Error obteniendo gastos recurrentes:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}
