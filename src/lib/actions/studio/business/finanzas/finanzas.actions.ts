'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

export interface Transaction {
    id: string;
    fecha: Date;
    fuente: 'evento' | 'staff' | 'operativo';
    concepto: string;
    categoria: string;
    monto: number;
    nominaId?: string; // ID de la nómina si viene de "Por Pagar"
    isGastoOperativo?: boolean; // Si es gasto operativo personalizado
}

interface PendingItem {
    id: string;
    concepto: string;
    monto: number;
    fecha: Date;
    personalName?: string | null;
    isPaid?: boolean;
    // Campos adicionales para cotizaciones por cobrar
    precioCotizacion?: number;
    descuentoCotizacion?: number;
    totalCotizacion?: number;
    pagosRealizados?: number;
    promiseId?: string;
    promiseName?: string;
    promiseEventDate?: Date | null;
    promiseContactName?: string;
    promiseContactEmail?: string | null;
    promiseContactPhone?: string | null;
}

interface RecurringExpense {
    id: string;
    name: string;
    amount: number;
    category: string;
    chargeDay: number;
    isActive: boolean;
    frequency?: string;
    description?: string | null;
    pagosMesActual?: number;
    totalPagosEsperados?: number;
    isCrewMember?: boolean; // Para diferenciar crew members de gastos recurrentes normales
    crewMemberId?: string; // ID del crew member si aplica
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
                                updated_at: {
                                    gte: start,
                                    lte: end,
                                },
                            },
                        ],
                    },
                ],
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
 * Obtener movimientos unificados (pagos, nóminas, gastos) por rango de fechas
 */
export async function obtenerMovimientosPorRango(
    studioSlug: string,
    startDate: Date,
    endDate: Date
): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Ajustar endDate para incluir todo el día
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Obtener pagos (ingresos)
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
                        status: { in: ['paid', 'completed'] },
                    },
                    {
                        OR: [
                            {
                                payment_date: {
                                    gte: startDate,
                                    lte: end,
                                },
                            },
                            {
                                AND: [
                                    { payment_date: null },
                                    {
                                        created_at: {
                                            gte: startDate,
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
                        name: true,
                    },
                },
            },
            orderBy: [
                { payment_date: 'desc' },
                { created_at: 'desc' },
            ],
        });

        // Obtener nóminas pagadas (egresos)
        const nominas = await prisma.studio_nominas.findMany({
            where: {
                studio_id: studioId,
                status: 'pagado',
                OR: [
                    {
                        payment_date: {
                            gte: startDate,
                            lte: end,
                        },
                    },
                    {
                        AND: [
                            { payment_date: null },
                            {
                                updated_at: {
                                    gte: startDate,
                                    lte: end,
                                },
                            },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                payment_date: true,
                updated_at: true,
                concept: true,
                net_amount: true,
                personal: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [
                { payment_date: 'desc' },
                { updated_at: 'desc' },
            ],
        });

        // Obtener gastos (egresos)
        const gastos = await prisma.studio_gastos.findMany({
            where: {
                studio_id: studioId,
                date: {
                    gte: startDate,
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
                concepto: pago.concept || pago.promise?.name || 'Ingreso',
                categoria: pago.transaction_category || 'Ingreso',
                monto: pago.amount,
                isGastoOperativo: pago.transaction_category === 'manual',
            })),
            ...nominas.map((nomina) => ({
                id: nomina.id,
                fecha: nomina.payment_date ?? nomina.updated_at ?? new Date(),
                fuente: 'staff' as const,
                concepto: nomina.concept || `Nómina - ${nomina.personal?.name || 'Personal'}`,
                categoria: 'Nómina',
                monto: -nomina.net_amount,
                nominaId: nomina.id,
                isGastoOperativo: false,
            })),
            ...gastos.map((gasto) => ({
                id: gasto.id,
                fecha: gasto.date,
                fuente: 'operativo' as const,
                concepto: gasto.concept,
                categoria: gasto.category,
                monto: -gasto.amount,
                isGastoOperativo: gasto.category === 'Operativo' || gasto.category === 'Recurrente',
            })),
        ];

        // Ordenar por fecha descendente
        transactions.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

        return {
            success: true,
            data: transactions,
        };
    } catch (error) {
        console.error('Error obteniendo movimientos por rango:', error);
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
        // Excluir pagos cancelados (solo mostrar pagos con status 'paid' o 'completed')
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
                        // Solo pagos pagados/completados (excluir cancelados)
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
            select: {
                id: true,
                payment_date: true,
                created_at: true,
                concept: true,
                amount: true,
                transaction_category: true,
                promise: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [
                { payment_date: 'desc' },
                { created_at: 'desc' },
            ],
        });

        // Obtener nóminas pagadas (egresos) del mes
        // Incluir nóminas con status 'pagado' que fueron pagadas en el mes
        const nominas = await prisma.studio_nominas.findMany({
            where: {
                studio_id: studioId,
                status: 'pagado',
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
                                updated_at: {
                                    gte: start,
                                    lte: end,
                                },
                            },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                payment_date: true,
                updated_at: true,
                concept: true,
                net_amount: true,
                personal: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [
                { payment_date: 'desc' },
                { updated_at: 'desc' },
            ],
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
                concepto: pago.concept || pago.promise?.name || 'Ingreso',
                categoria: pago.transaction_category || 'Ingreso',
                monto: pago.amount,
                isGastoOperativo: pago.transaction_category === 'manual', // Identificar ingresos manuales
            })),
            ...nominas.map((nomina) => ({
                id: nomina.id,
                fecha: nomina.payment_date ?? nomina.updated_at ?? new Date(),
                fuente: 'staff' as const,
                concepto: nomina.concept || `Nómina - ${nomina.personal?.name || 'Personal'}`,
                categoria: 'Nómina',
                monto: -nomina.net_amount,
                nominaId: nomina.id, // Identificar que viene de nómina pagada
                isGastoOperativo: false,
            })),
            ...gastos.map((gasto) => ({
                id: gasto.id,
                fecha: gasto.date,
                fuente: 'operativo' as const,
                concepto: gasto.concept,
                categoria: gasto.category,
                monto: -gasto.amount,
                isGastoOperativo: gasto.category === 'Operativo' || gasto.category === 'Recurrente', // Identificar gastos personalizados
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
        // Usar la misma lógica que obtenerKPIsFinancieros: buscar promesas que tengan cotizaciones aprobadas
        // No filtrar por status de promesa, solo por cotizaciones aprobadas
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
                name: true,
                event_date: true,
                contact: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
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

        // Obtener todos los pagos realizados para estas cotizaciones y promesas
        // Los pagos pueden estar asociados a cotizaciones (cotizacion_id) o a promesas (promise_id)
        const cotizacionIds = promesas.flatMap(p => p.quotes.map(q => q.id));
        const promiseIds = promesas.map(p => p.id);

        const pagosRealizados = await prisma.studio_pagos.findMany({
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
                cotizacion_id: true,
                promise_id: true,
                amount: true,
            },
        });

        // Agrupar pagos por cotización
        // Si un pago está asociado a una promesa, distribuirlo proporcionalmente entre sus cotizaciones
        const pagosPorCotizacion = new Map<string, number>();

        // Primero, pagos directos a cotizaciones
        pagosRealizados.forEach(pago => {
            if (pago.cotizacion_id) {
                const actual = pagosPorCotizacion.get(pago.cotizacion_id) || 0;
                pagosPorCotizacion.set(pago.cotizacion_id, actual + pago.amount);
            }
        });

        // Luego, pagos asociados a promesas: distribuirlos proporcionalmente entre las cotizaciones de la promesa
        const pagosPorPromesa = new Map<string, number>();
        pagosRealizados.forEach(pago => {
            if (pago.promise_id && !pago.cotizacion_id) {
                const actual = pagosPorPromesa.get(pago.promise_id) || 0;
                pagosPorPromesa.set(pago.promise_id, actual + pago.amount);
            }
        });

        // Distribuir pagos de promesas proporcionalmente entre sus cotizaciones
        for (const promesa of promesas) {
            const pagoPromesa = pagosPorPromesa.get(promesa.id) || 0;
            if (pagoPromesa > 0 && promesa.quotes.length > 0) {
                // Calcular el total de todas las cotizaciones de la promesa
                const totalPromesa = promesa.quotes.reduce((sum, q) => {
                    return sum + (q.price - (q.discount || 0));
                }, 0);

                // Distribuir proporcionalmente
                for (const cotizacion of promesa.quotes) {
                    const totalCotizacion = cotizacion.price - (cotizacion.discount || 0);
                    const proporcion = totalPromesa > 0 ? totalCotizacion / totalPromesa : 1 / promesa.quotes.length;
                    const pagoAsignado = pagoPromesa * proporcion;

                    const actual = pagosPorCotizacion.get(cotizacion.id) || 0;
                    pagosPorCotizacion.set(cotizacion.id, actual + pagoAsignado);
                }
            }
        }

        // Calcular pendiente por cotización
        const porCobrar: PendingItem[] = [];

        console.log('[POR COBRAR] Promesas encontradas:', promesas.length);
        console.log('[POR COBRAR] Total cotizaciones:', cotizacionIds.length);
        console.log('[POR COBRAR] Total pagos encontrados:', pagosRealizados.length);

        for (const promesa of promesas) {
            for (const cotizacion of promesa.quotes) {
                const totalCotizacion = cotizacion.price - (cotizacion.discount || 0);
                const pagosDeEstaCotizacion = pagosPorCotizacion.get(cotizacion.id) || 0;
                const pendiente = totalCotizacion - pagosDeEstaCotizacion;

                console.log(`[POR COBRAR] Cotización ${cotizacion.id}: precio=${cotizacion.price}, descuento=${cotizacion.discount || 0}, total=${totalCotizacion}, pagos=${pagosDeEstaCotizacion}, pendiente=${pendiente}`);

                // Solo agregar si hay pendiente por cobrar
                if (pendiente > 0) {
                    porCobrar.push({
                        id: cotizacion.id,
                        concepto: `${cotizacion.name || 'Cotización'} - ${promesa.name || promesa.contact?.name || 'Promesa'}`,
                        monto: pendiente,
                        fecha: cotizacion.created_at,
                        precioCotizacion: cotizacion.price,
                        descuentoCotizacion: cotizacion.discount || 0,
                        totalCotizacion: totalCotizacion,
                        pagosRealizados: pagosDeEstaCotizacion,
                        promiseId: promesa.id,
                        promiseName: promesa.name,
                        promiseEventDate: promesa.event_date,
                        promiseContactName: promesa.contact?.name || null,
                        promiseContactEmail: promesa.contact?.email || null,
                        promiseContactPhone: promesa.contact?.phone || null,
                    });
                }
            }
        }

        // Ordenar por fecha descendente
        porCobrar.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

        console.log('[POR COBRAR] Total items por cobrar:', porCobrar.length);

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
            },
            select: {
                id: true,
                concept: true,
                net_amount: true,
                assignment_date: true,
                status: true,
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

        const porPagar: PendingItem[] = nominas
            .filter((nomina) => nomina.status === 'pendiente')
            .map((nomina) => ({
                id: nomina.id,
                concepto: nomina.concept || `Nómina - ${nomina.personal?.name || 'Personal'}`,
                monto: nomina.net_amount,
                fecha: nomina.assignment_date,
                personalName: nomina.personal?.name || null,
                isPaid: nomina.status === 'pagado',
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
 * Calcular número de semanas en un mes
 */
function getWeeksInMonth(year: number, month: number): number {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();

    // Calcular cuántas semanas completas hay
    const weeks = Math.ceil((daysInMonth + firstDayOfWeek) / 7);
    return weeks;
}

/**
 * Obtener gastos recurrentes con conteo de pagos del mes actual
 */
export async function obtenerGastosRecurrentes(
    studioSlug: string,
    month?: Date
): Promise<{ success: boolean; data?: RecurringExpense[]; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const currentMonth = month || new Date();
        const { start, end } = getMonthRange(currentMonth);

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
                frequency: true,
                description: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        // Para cada gasto recurrente, contar cuántos pagos se han hecho este mes
        const expensesFromRecurring: RecurringExpense[] = await Promise.all(
            gastos.map(async (gasto) => {
                // Contar pagos del mes actual para este gasto recurrente
                const pagosCount = await prisma.studio_gastos.count({
                    where: {
                        studio_id: studioId,
                        concept: gasto.name,
                        category: 'Recurrente',
                        date: {
                            gte: start,
                            lte: end,
                        },
                    },
                });

                // Calcular total de pagos según frecuencia
                let totalPagosEsperados = 1;
                if (gasto.frequency === 'weekly') {
                    totalPagosEsperados = getWeeksInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
                } else if (gasto.frequency === 'biweekly') {
                    totalPagosEsperados = 2;
                } else if (gasto.frequency === 'monthly') {
                    totalPagosEsperados = 1;
                }

                return {
                    id: gasto.id,
                    name: gasto.name,
                    amount: gasto.amount,
                    category: gasto.category,
                    chargeDay: gasto.charge_day,
                    isActive: gasto.is_active,
                    frequency: gasto.frequency,
                    description: gasto.description,
                    pagosMesActual: pagosCount,
                    totalPagosEsperados: totalPagosEsperados,
                    isCrewMember: false,
                };
            })
        );

        // Obtener crew members con fixed_salary activo
        const crewMembers = await prisma.studio_crew_members.findMany({
            where: {
                studio_id: studioId,
                status: 'activo',
                fixed_salary: { not: null },
            },
            select: {
                id: true,
                name: true,
                fixed_salary: true,
                salary_frequency: true,
            },
        });

        // Convertir crew members a formato RecurringExpense
        const expensesFromCrew: RecurringExpense[] = await Promise.all(
            crewMembers.map(async (member) => {
                const frequency = member.salary_frequency || 'monthly';
                const amount = member.fixed_salary ? Number(member.fixed_salary) : 0;

                // Contar pagos del mes actual para este crew member (buscar por nombre)
                const pagosCount = await prisma.studio_gastos.count({
                    where: {
                        studio_id: studioId,
                        concept: member.name,
                        category: 'Recurrente',
                        date: {
                            gte: start,
                            lte: end,
                        },
                    },
                });

                // Calcular total de pagos según frecuencia
                let totalPagosEsperados = 1;
                if (frequency === 'weekly') {
                    totalPagosEsperados = getWeeksInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
                } else if (frequency === 'biweekly') {
                    totalPagosEsperados = 2;
                } else if (frequency === 'monthly') {
                    totalPagosEsperados = 1;
                }

                return {
                    id: `crew-${member.id}`, // Prefijo para diferenciar
                    name: member.name,
                    amount: amount,
                    category: 'Crew',
                    chargeDay: 1, // Default para crew members
                    isActive: true,
                    frequency: frequency,
                    description: `Salario fijo de ${member.name}`,
                    pagosMesActual: pagosCount,
                    totalPagosEsperados: totalPagosEsperados,
                    isCrewMember: true,
                    crewMemberId: member.id,
                };
            })
        );

        // Combinar ambos tipos de gastos recurrentes
        const allExpenses = [...expensesFromRecurring, ...expensesFromCrew];

        return {
            success: true,
            data: allExpenses,
        };
    } catch (error) {
        console.error('Error obteniendo gastos recurrentes:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}

/**
 * Crear gasto operativo manual
 */
export async function crearGastoOperativo(
    studioSlug: string,
    data: {
        concept: string;
        amount: number;
        category: string;
        date?: Date;
        description?: string;
    }
): Promise<{ success: boolean; error?: string; data?: { id: string } }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Obtener usuario actual desde Supabase
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
                studio_id: studioId,
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
                studio_id: studioId,
                full_name: studioUserProfile.full_name,
                is_active: true,
            },
            select: { id: true },
        });

        // Si no existe el studio_user, crearlo automáticamente
        if (!studioUser) {
            studioUser = await prisma.studio_users.create({
                data: {
                    studio_id: studioId,
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

        const gasto = await prisma.studio_gastos.create({
            data: {
                studio_id: studioId,
                user_id: studioUser.id,
                concept: data.concept,
                amount: data.amount,
                category: data.category || 'Operativo',
                date: data.date || new Date(),
                description: data.description || null,
                status: 'activo',
            },
            select: {
                id: true,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
            data: { id: gasto.id },
        };
    } catch (error) {
        console.error('Error creando gasto operativo:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear gasto operativo',
        };
    }
}

/**
 * Marcar nómina como pagada
 */
export async function marcarNominaPagada(
    studioSlug: string,
    nominaId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que la nómina existe y pertenece al studio
        const nomina = await prisma.studio_nominas.findFirst({
            where: {
                id: nominaId,
                studio_id: studioId,
            },
            select: {
                id: true,
                status: true,
            },
        });

        if (!nomina) {
            return { success: false, error: 'Nómina no encontrada' };
        }

        if (nomina.status === 'pagado') {
            return { success: false, error: 'La nómina ya está marcada como pagada' };
        }

        // Obtener usuario actual para asociar el pago
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
                studio_id: studioId,
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
                studio_id: studioId,
                full_name: studioUserProfile.full_name,
                is_active: true,
            },
            select: { id: true },
        });

        if (!studioUser) {
            studioUser = await prisma.studio_users.create({
                data: {
                    studio_id: studioId,
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

        // Actualizar el status a pagado y establecer payment_date
        await prisma.studio_nominas.update({
            where: {
                id: nominaId,
            },
            data: {
                status: 'pagado',
                paid_by: studioUser.id,
                payment_date: new Date(),
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error marcando nómina como pagada:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al marcar nómina como pagada',
        };
    }
}

/**
 * Eliminar gasto operativo
 */
export async function eliminarGastoOperativo(
    studioSlug: string,
    gastoId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que el gasto existe y pertenece al studio
        const gasto = await prisma.studio_gastos.findFirst({
            where: {
                id: gastoId,
                studio_id: studioId,
            },
            select: {
                id: true,
            },
        });

        if (!gasto) {
            return { success: false, error: 'Gasto no encontrado' };
        }

        // Eliminar el gasto
        await prisma.studio_gastos.delete({
            where: {
                id: gastoId,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error eliminando gasto operativo:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al eliminar gasto operativo',
        };
    }
}

/**
 * Crear gasto recurrente
 */
export async function crearGastoRecurrente(
    studioSlug: string,
    data: {
        name: string;
        description?: string | null;
        amount: number;
        frequency: string;
        category: string;
        chargeDay: number;
    }
): Promise<{ success: boolean; error?: string; data?: { id: string } }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Validar descripción
        if (data.description && data.description.length > 100) {
            return { success: false, error: 'La descripción no puede exceder 100 caracteres' };
        }

        const gasto = await prisma.studio_recurring_expenses.create({
            data: {
                studio_id: studioId,
                name: data.name.trim(),
                description: data.description?.trim() || null,
                amount: data.amount,
                frequency: data.frequency,
                category: data.category,
                charge_day: data.chargeDay,
                is_active: true,
                auto_generate: false,
            },
            select: {
                id: true,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
            data: { id: gasto.id },
        };
    } catch (error) {
        console.error('Error creando gasto recurrente:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al crear gasto recurrente',
        };
    }
}

/**
 * Pagar gasto recurrente (registrar como egreso en movimientos)
 */
export async function pagarGastoRecurrente(
    studioSlug: string,
    expenseId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar si es un crew member (ID empieza con "crew-")
        const isCrewMember = expenseId.startsWith('crew-');
        let gastoRecurrente: { name: string; amount: number; description: string | null } | null = null;

        if (isCrewMember) {
            // Es un crew member, obtener datos del crew member
            const crewMemberId = expenseId.replace('crew-', '');
            const crewMember = await prisma.studio_crew_members.findFirst({
                where: {
                    id: crewMemberId,
                    studio_id: studioId,
                    fixed_salary: { not: null },
                },
                select: {
                    name: true,
                    fixed_salary: true,
                },
            });

            if (!crewMember) {
                return { success: false, error: 'Crew member no encontrado' };
            }

            gastoRecurrente = {
                name: crewMember.name,
                amount: crewMember.fixed_salary ? Number(crewMember.fixed_salary) : 0,
                description: `Salario fijo de ${crewMember.name}`,
            };
        } else {
            // Es un gasto recurrente normal
            const gasto = await prisma.studio_recurring_expenses.findFirst({
                where: {
                    id: expenseId,
                    studio_id: studioId,
                },
                select: {
                    id: true,
                    name: true,
                    amount: true,
                    description: true,
                },
            });

            if (!gasto) {
                return { success: false, error: 'Gasto recurrente no encontrado' };
            }

            gastoRecurrente = {
                name: gasto.name,
                amount: gasto.amount,
                description: gasto.description,
            };
        }

        if (!gastoRecurrente) {
            return { success: false, error: 'Gasto recurrente no encontrado' };
        }

        // Obtener usuario actual para asociar el gasto
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
                studio_id: studioId,
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
                studio_id: studioId,
                full_name: studioUserProfile.full_name,
                is_active: true,
            },
            select: { id: true },
        });

        if (!studioUser) {
            studioUser = await prisma.studio_users.create({
                data: {
                    studio_id: studioId,
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

        // Crear el gasto operativo asociado al gasto recurrente
        const gasto = await prisma.studio_gastos.create({
            data: {
                studio_id: studioId,
                user_id: studioUser.id,
                concept: gastoRecurrente.name,
                amount: gastoRecurrente.amount,
                category: 'Recurrente',
                date: new Date(),
                description: gastoRecurrente.description || null,
                status: 'activo',
            },
            select: {
                id: true,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error pagando gasto recurrente:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al pagar gasto recurrente',
        };
    }
}

/**
 * Obtener gasto operativo por ID
 */
export async function obtenerGastoOperativo(
    studioSlug: string,
    gastoId: string
): Promise<{ success: boolean; data?: { id: string; concept: string; amount: number; category: string; date: Date; description: string | null }; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const gasto = await prisma.studio_gastos.findFirst({
            where: {
                id: gastoId,
                studio_id: studioId,
            },
            select: {
                id: true,
                concept: true,
                amount: true,
                category: true,
                date: true,
                description: true,
            },
        });

        if (!gasto) {
            return { success: false, error: 'Gasto no encontrado' };
        }

        return {
            success: true,
            data: gasto,
        };
    } catch (error) {
        console.error('Error obteniendo gasto operativo:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener gasto operativo',
        };
    }
}

/**
 * Actualizar gasto operativo
 */
export async function actualizarGastoOperativo(
    studioSlug: string,
    gastoId: string,
    data: {
        concept: string;
        amount: number;
        category?: string;
        date?: Date;
        description?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que el gasto existe y pertenece al studio
        const gastoExistente = await prisma.studio_gastos.findFirst({
            where: {
                id: gastoId,
                studio_id: studioId,
            },
            select: { id: true },
        });

        if (!gastoExistente) {
            return { success: false, error: 'Gasto no encontrado' };
        }

        await prisma.studio_gastos.update({
            where: {
                id: gastoId,
            },
            data: {
                concept: data.concept,
                amount: data.amount,
                category: data.category || 'Operativo',
                date: data.date,
                description: data.description,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error actualizando gasto operativo:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar gasto operativo',
        };
    }
}

/**
 * Obtener gasto recurrente por ID
 */
export async function obtenerGastoRecurrente(
    studioSlug: string,
    expenseId: string
): Promise<{ success: boolean; data?: { id: string; name: string; amount: number; description: string | null; frequency: string; category: string; charge_day: number; is_active: boolean }; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar si es crew member
        const isCrewMember = expenseId.startsWith('crew-');
        if (isCrewMember) {
            const crewMemberId = expenseId.replace('crew-', '');
            const crewMember = await prisma.studio_crew_members.findFirst({
                where: {
                    id: crewMemberId,
                    studio_id: studioId,
                    fixed_salary: { not: null },
                },
                select: {
                    id: true,
                    name: true,
                    fixed_salary: true,
                    salary_frequency: true,
                },
            });

            if (!crewMember) {
                return { success: false, error: 'Crew member no encontrado' };
            }

            return {
                success: true,
                data: {
                    id: expenseId,
                    name: crewMember.name,
                    amount: crewMember.fixed_salary ? Number(crewMember.fixed_salary) : 0,
                    description: `Salario fijo de ${crewMember.name}`,
                    frequency: crewMember.salary_frequency || 'monthly',
                    category: 'Crew',
                    charge_day: 1,
                    is_active: true,
                },
            };
        }

        const gasto = await prisma.studio_recurring_expenses.findFirst({
            where: {
                id: expenseId,
                studio_id: studioId,
            },
            select: {
                id: true,
                name: true,
                amount: true,
                description: true,
                frequency: true,
                category: true,
                charge_day: true,
                is_active: true,
            },
        });

        if (!gasto) {
            return { success: false, error: 'Gasto recurrente no encontrado' };
        }

        return {
            success: true,
            data: gasto,
        };
    } catch (error) {
        console.error('Error obteniendo gasto recurrente:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener gasto recurrente',
        };
    }
}

/**
 * Actualizar gasto recurrente
 */
export async function actualizarGastoRecurrente(
    studioSlug: string,
    expenseId: string,
    data: {
        name: string;
        description?: string | null;
        amount: number;
        frequency: string;
        category?: string;
        chargeDay?: number;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar si es crew member
        const isCrewMember = expenseId.startsWith('crew-');
        if (isCrewMember) {
            const crewMemberId = expenseId.replace('crew-', '');
            const crewMember = await prisma.studio_crew_members.findFirst({
                where: {
                    id: crewMemberId,
                    studio_id: studioId,
                },
            });

            if (!crewMember) {
                return { success: false, error: 'Crew member no encontrado' };
            }

            // Actualizar crew member
            await prisma.studio_crew_members.update({
                where: { id: crewMemberId },
                data: {
                    fixed_salary: data.amount,
                    salary_frequency: data.frequency as 'weekly' | 'biweekly' | 'monthly' | null,
                },
            });

            revalidatePath(`/${studioSlug}/studio/business/finanzas`);
            return { success: true };
        }

        // Validar descripción
        if (data.description && data.description.length > 100) {
            return { success: false, error: 'La descripción no puede exceder 100 caracteres' };
        }

        await prisma.studio_recurring_expenses.update({
            where: {
                id: expenseId,
            },
            data: {
                name: data.name.trim(),
                description: data.description?.trim() || null,
                amount: data.amount,
                frequency: data.frequency,
                category: data.category || 'fijo',
                charge_day: data.chargeDay || 1,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error actualizando gasto recurrente:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al actualizar gasto recurrente',
        };
    }
}

/**
 * Cancelar pago de gasto recurrente (eliminar solo el último pago, mantener gasto activo)
 */
export async function cancelarPagoGastoRecurrente(
    studioSlug: string,
    expenseId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar si es crew member
        const isCrewMember = expenseId.startsWith('crew-');
        let gastoName: string;

        if (isCrewMember) {
            const crewMemberId = expenseId.replace('crew-', '');
            const crewMember = await prisma.studio_crew_members.findFirst({
                where: {
                    id: crewMemberId,
                    studio_id: studioId,
                },
                select: {
                    name: true,
                },
            });

            if (!crewMember) {
                return { success: false, error: 'Crew member no encontrado' };
            }

            // Para crew members, el concepto puede ser el nombre o "Salario fijo de [nombre]"
            gastoName = crewMember.name;
        } else {
            const gastoRecurrente = await prisma.studio_recurring_expenses.findFirst({
                where: {
                    id: expenseId,
                    studio_id: studioId,
                },
                select: {
                    name: true,
                },
            });

            if (!gastoRecurrente) {
                return { success: false, error: 'Gasto recurrente no encontrado' };
            }

            gastoName = gastoRecurrente.name;
        }

        // Buscar el último pago (el más reciente) de este gasto recurrente
        // Para crew members, el concepto puede ser el nombre o "Salario fijo de [nombre]"
        const posiblesConceptos = isCrewMember
            ? [gastoName.trim(), `Salario fijo de ${gastoName.trim()}`]
            : [gastoName.trim()];

        let ultimoPago = null;

        // Intentar buscar con cada posible concepto
        for (const concepto of posiblesConceptos) {
            ultimoPago = await prisma.studio_gastos.findFirst({
                where: {
                    studio_id: studioId,
                    category: 'Recurrente',
                    concept: concepto,
                },
                orderBy: [
                    { date: 'desc' },
                    { created_at: 'desc' },
                ],
                select: {
                    id: true,
                    concept: true,
                    date: true,
                    created_at: true,
                },
            });

            if (ultimoPago) break;
        }

        // Si no se encuentra con búsqueda exacta, intentar búsqueda flexible (contains)
        if (!ultimoPago) {
            ultimoPago = await prisma.studio_gastos.findFirst({
                where: {
                    studio_id: studioId,
                    category: 'Recurrente',
                    OR: [
                        { concept: { contains: gastoName.trim() } },
                        ...(isCrewMember ? [{ concept: { contains: `Salario fijo de ${gastoName.trim()}` } }] : []),
                    ],
                },
                orderBy: [
                    { date: 'desc' },
                    { created_at: 'desc' },
                ],
                select: {
                    id: true,
                    concept: true,
                    date: true,
                    created_at: true,
                },
            });
        }

        // Si aún no se encuentra, buscar todos los gastos recurrentes para debug
        if (!ultimoPago) {
            const todosLosGastos = await prisma.studio_gastos.findMany({
                where: {
                    studio_id: studioId,
                    category: 'Recurrente',
                },
                select: {
                    id: true,
                    concept: true,
                    date: true,
                },
                take: 10,
            });

            console.log('Gastos recurrentes encontrados:', todosLosGastos);
            console.log('Buscando gasto con nombre:', gastoName);

            return { success: false, error: 'No se encontró ningún pago para cancelar' };
        }

        // Eliminar solo el último pago
        await prisma.studio_gastos.delete({
            where: {
                id: ultimoPago.id,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error cancelando pago de gasto recurrente:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al cancelar pago de gasto recurrente',
        };
    }
}

/**
 * Cancelar gasto recurrente (desactivar pero mantener histórico)
 */
export async function cancelarGastoRecurrente(
    studioSlug: string,
    expenseId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar si es crew member
        const isCrewMember = expenseId.startsWith('crew-');
        if (isCrewMember) {
            // Para crew members, solo desactivamos el salario fijo
            const crewMemberId = expenseId.replace('crew-', '');
            await prisma.studio_crew_members.update({
                where: { id: crewMemberId },
                data: {
                    fixed_salary: null,
                    salary_frequency: null,
                },
            });

            revalidatePath(`/${studioSlug}/studio/business/finanzas`);
            return { success: true };
        }

        // Desactivar gasto recurrente
        await prisma.studio_recurring_expenses.update({
            where: {
                id: expenseId,
                studio_id: studioId,
            },
            data: {
                is_active: false,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error cancelando gasto recurrente:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al cancelar gasto recurrente',
        };
    }
}

/**
 * Eliminar gasto recurrente con opciones
 */
export async function eliminarGastoRecurrente(
    studioSlug: string,
    expenseId: string,
    options: {
        deleteType: 'single' | 'all' | 'future'; // single: solo programado, all: histórico y futuro, future: solo futuro
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar si es crew member
        const isCrewMember = expenseId.startsWith('crew-');
        if (isCrewMember) {
            const crewMemberId = expenseId.replace('crew-', '');
            const crewMember = await prisma.studio_crew_members.findFirst({
                where: {
                    id: crewMemberId,
                    studio_id: studioId,
                },
                select: {
                    name: true,
                    fixed_salary: true,
                },
            });

            if (!crewMember) {
                return { success: false, error: 'Crew member no encontrado' };
            }

            const gastoName = crewMember.name;

            if (options.deleteType === 'all') {
                // Eliminar salario fijo y todos los gastos históricos relacionados
                await prisma.studio_crew_members.update({
                    where: { id: crewMemberId },
                    data: {
                        fixed_salary: null,
                        salary_frequency: null,
                    },
                });

                // Eliminar todos los gastos relacionados con este crew member
                await prisma.studio_gastos.deleteMany({
                    where: {
                        studio_id: studioId,
                        category: 'Recurrente',
                        concept: gastoName,
                    },
                });
            } else if (options.deleteType === 'future') {
                // Solo eliminar salario fijo (los gastos históricos se mantienen)
                await prisma.studio_crew_members.update({
                    where: { id: crewMemberId },
                    data: {
                        fixed_salary: null,
                        salary_frequency: null,
                    },
                });
            } else {
                // Solo eliminar salario fijo
                await prisma.studio_crew_members.update({
                    where: { id: crewMemberId },
                    data: {
                        fixed_salary: null,
                        salary_frequency: null,
                    },
                });
            }

            revalidatePath(`/${studioSlug}/studio/business/finanzas`);
            return { success: true };
        }

        // Obtener datos del gasto recurrente antes de eliminarlo
        const gastoRecurrente = await prisma.studio_recurring_expenses.findFirst({
            where: {
                id: expenseId,
                studio_id: studioId,
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (!gastoRecurrente) {
            return { success: false, error: 'Gasto recurrente no encontrado' };
        }

        if (options.deleteType === 'all') {
            // Eliminar gasto recurrente y todos los gastos históricos relacionados
            await prisma.studio_recurring_expenses.delete({
                where: { id: expenseId },
            });

            // Eliminar todos los gastos relacionados con este concepto
            await prisma.studio_gastos.deleteMany({
                where: {
                    studio_id: studioId,
                    category: 'Recurrente',
                    concept: gastoRecurrente.name,
                },
            });
        } else if (options.deleteType === 'future') {
            // Solo eliminar el gasto recurrente (los gastos históricos se mantienen)
            await prisma.studio_recurring_expenses.delete({
                where: { id: expenseId },
            });
        } else {
            // Solo eliminar el gasto recurrente programado
            await prisma.studio_recurring_expenses.delete({
                where: { id: expenseId },
            });
        }

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error eliminando gasto recurrente:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al eliminar gasto recurrente',
        };
    }
}

/**
 * Cancelar nómina pagada (marcar como pendiente nuevamente)
 */
export async function cancelarNominaPagada(
    studioSlug: string,
    nominaId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que la nómina existe, pertenece al studio y está pagada
        const nomina = await prisma.studio_nominas.findFirst({
            where: {
                id: nominaId,
                studio_id: studioId,
                status: 'pagado',
            },
            select: {
                id: true,
                concept: true,
                net_amount: true,
            },
        });

        if (!nomina) {
            return { success: false, error: 'Nómina pagada no encontrada' };
        }

        // Actualizar status a pendiente y limpiar campos de pago
        await prisma.studio_nominas.update({
            where: {
                id: nominaId,
            },
            data: {
                status: 'pendiente',
                payment_date: null,
                paid_by: null,
                payment_method: null,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error cancelando nómina pagada:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al cancelar nómina pagada',
        };
    }
}
