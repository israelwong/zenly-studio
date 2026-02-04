'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { calcularCantidadEfectiva } from '@/lib/utils/dynamic-billing-calc';

interface FinanceKPIs {
    ingresos: number;
    egresos: number;
    utilidad: number;
    porCobrar: number;
    porPagar: number;
    // ✅ Nuevos campos para owners
    totalProductionCosts?: number;
    totalOperatingExpenses?: number;
    netProfitability?: number;
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
    nominaPaymentType?: string; // Tipo de pago de nómina ('individual' | 'consolidado')
    isGastoOperativo?: boolean; // Si es gasto operativo personalizado
    totalDiscounts?: number; // Descuentos aplicados (solo para nóminas)
    personalId?: string; // ID del personal si el gasto recurrente está asociado a un crew member
}

interface PendingItem {
    id: string;
    concepto: string;
    monto: number;
    fecha: Date;
    personalName?: string | null;
    personalId?: string | null;
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

export interface PorPagarPersonal {
    personalId: string;
    personalName: string;
    totalAcumulado: number;
    items: Array<{
        id: string;
        concepto: string;
        monto: number;
        fecha: Date;
        nominaId: string;
    }>;
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
 * Verificar si el usuario actual es Owner o Admin del studio
 */
export async function verificarRolOwnerOAdmin(
    studioSlug: string
): Promise<{ success: boolean; isOwner: boolean; error?: string }> {
    try {
        const { getCurrentUserId } = await import('@/lib/actions/studio/notifications/notifications.actions');
        const userIdResult = await getCurrentUserId(studioSlug);
        
        if (!userIdResult.success || !userIdResult.data) {
            return { success: false, isOwner: false, error: 'Usuario no encontrado' };
        }
        
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, isOwner: false, error: 'Studio no encontrado' };
        }
        
        const role = await prisma.user_studio_roles.findFirst({
            where: {
                user_id: userIdResult.data,
                studio_id: studioId,
                role: { in: ['OWNER', 'ADMIN'] },
                is_active: true,
            },
            select: {
                id: true,
            },
        });
        
        return {
            success: true,
            isOwner: !!role,
        };
    } catch (error) {
        console.error('Error verificando rol de owner:', error);
        return {
            success: false,
            isOwner: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
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

        // Obtener todas las nóminas pagadas para filtrar consolidadas vs individuales
        const nominasRaw = await prisma.studio_nominas.findMany({
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
                net_amount: true,
                payment_type: true,
                consolidated_payment_id: true,
                personal_id: true,
                payment_date: true,
            },
        });

        // Agrupar nóminas individuales que pertenecen a un pago consolidado
        // Sumar solo el consolidado, no las individuales agrupadas
        const nominasConsolidadas = new Map<string, typeof nominasRaw[0]>();
        const nominasIndividuales: typeof nominasRaw = [];
        const idsConsolidados = new Set<string>();

        // Primero, identificar todos los consolidados
        for (const nomina of nominasRaw) {
            if (nomina.payment_type === 'consolidado') {
                nominasConsolidadas.set(nomina.id, nomina);
                idsConsolidados.add(nomina.id);
            }
        }

        // Luego, filtrar las individuales
        for (const nomina of nominasRaw) {
            if (nomina.payment_type === 'individual') {
                // Es una nómina individual
                if (nomina.consolidated_payment_id) {
                    // Pertenece a un consolidado
                    if (idsConsolidados.has(nomina.consolidated_payment_id)) {
                        // El consolidado existe en el rango, NO sumar esta individual
                        continue;
                    } else {
                        // El consolidado no está en el rango, sumar la individual
                        nominasIndividuales.push(nomina);
                    }
                } else {
                    // No tiene consolidated_payment_id (nómina antigua o individual sin consolidar)
                    // Verificar si hay un consolidado del mismo personal y fecha que podría ser su consolidado
                    const posibleConsolidado = Array.from(nominasConsolidadas.values()).find(
                        c => c.personal_id === nomina.personal_id &&
                            c.payment_date && nomina.payment_date &&
                            Math.abs(c.payment_date.getTime() - nomina.payment_date.getTime()) < 1000 // Mismo segundo
                    );
                    if (posibleConsolidado) {
                        // Hay un consolidado que podría ser de esta nómina, no sumarla
                        continue;
                    }
                    // No hay consolidado relacionado, sumarla
                    nominasIndividuales.push(nomina);
                }
            }
        }

        // Combinar consolidadas e individuales y sumar
        const nominasParaSumar = [...nominasConsolidadas.values(), ...nominasIndividuales];
        const nominasTotal = nominasParaSumar.reduce((sum, nomina) => sum + Number(nomina.net_amount), 0);

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
            }
        }

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
            totalPorCobrar -= totalPagos;
        }

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
        const egresosTotal = gastosTotal + nominasTotal;
        const utilidad = ingresosTotal - egresosTotal;
        const porCobrarTotal = totalPorCobrar;
        const porPagarTotal = porPagar._sum.net_amount ?? 0;

        // ✅ Calcular costos y gastos de producción de cotizaciones autorizadas del mes
        // Buscar eventos autorizados que se celebraron en el mes
        const eventosAutorizados = await prisma.studio_events.findMany({
            where: {
                studio_id: studioId,
                event_date: {
                    gte: start,
                    lte: end,
                },
                status: { in: ['autorizado', 'aprobado', 'completed'] },
            },
            select: {
                id: true,
                duration_hours: true,
                cotizaciones: {
                    where: {
                        status: { in: ['autorizada', 'aprobada', 'approved'] },
                    },
                    select: {
                        id: true,
                        cotizacion_items: {
                            select: {
                                cost: true,
                                expense: true,
                                quantity: true,
                                billing_type: true,
                                cost_snapshot: true,
                                expense_snapshot: true,
                            },
                        },
                    },
                },
            },
        });

        let totalProductionCosts = 0;
        let totalOperatingExpenses = 0;

        for (const evento of eventosAutorizados) {
            for (const cotizacion of evento.cotizaciones) {
                for (const item of cotizacion.cotizacion_items) {
                    // Usar snapshots para garantizar inmutabilidad histórica
                    const costo = item.cost_snapshot ?? item.cost ?? 0;
                    const gasto = item.expense_snapshot ?? item.expense ?? 0;
                    
                    // Calcular cantidad efectiva según billing_type
                    const cantidadEfectiva = calcularCantidadEfectiva(
                        (item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
                        item.quantity,
                        evento.duration_hours
                    );
                    
                    totalProductionCosts += costo * cantidadEfectiva;
                    totalOperatingExpenses += gasto * cantidadEfectiva;
                }
            }
        }

        // Calcular utilidad neta: ingresos - costos de producción - gastos operativos
        const netProfitability = ingresosTotal - totalProductionCosts - totalOperatingExpenses;

        return {
            success: true,
            data: {
                ingresos: ingresosTotal,
                egresos: egresosTotal,
                utilidad,
                porCobrar: porCobrarTotal,
                porPagar: porPagarTotal,
                // ✅ Nuevos campos para owners
                totalProductionCosts,
                totalOperatingExpenses,
                netProfitability,
            },
        };
    } catch (error) {
        console.error('Error obteniendo KPIs financieros:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}

/**
 * Interface para rentabilidad por evento
 */
export interface RentabilidadPorEvento {
    eventId: string;
    eventName: string;
    eventDate: Date | null;
    totalSold: number; // Total vendido (precio de cotización autorizada)
    totalCost: number; // Suma de costos de items
    totalExpense: number; // Suma de gastos de items
    estimatedProfit: number; // totalSold - totalCost - totalExpense
    profitMargin: number; // Porcentaje de margen (estimatedProfit / totalSold * 100)
}

type RentabilidadPorEventoResult =
    | { success: true; data: RentabilidadPorEvento[] }
    | { success: false; error: string };

/**
 * Obtener rentabilidad desglosada por evento autorizado
 * Solo para owners/admins - muestra costos y utilidades reales
 */
export async function obtenerRentabilidadPorEvento(
    studioSlug: string,
    month: Date
): Promise<RentabilidadPorEventoResult> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const { start, end } = getMonthRange(month);

        // Obtener eventos autorizados del mes con sus cotizaciones
        const eventos = await prisma.studio_events.findMany({
            where: {
                studio_id: studioId,
                event_date: {
                    gte: start,
                    lte: end,
                },
                status: { in: ['autorizado', 'aprobado', 'completed'] },
            },
            select: {
                id: true,
                name: true,
                event_date: true,
                duration_hours: true,
                cotizaciones: {
                    where: {
                        status: { in: ['autorizada', 'aprobada', 'approved'] },
                    },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        discount: true,
                        cotizacion_items: {
                            select: {
                                cost: true,
                                expense: true,
                                quantity: true,
                                billing_type: true,
                                cost_snapshot: true,
                                expense_snapshot: true,
                            },
                        },
                    },
                },
                promise: {
                    select: {
                        contact_name: true,
                    },
                },
            },
            orderBy: {
                event_date: 'desc',
            },
        });

        const rentabilidad: RentabilidadPorEvento[] = [];

        for (const evento of eventos) {
            // Calcular totales por evento (puede tener múltiples cotizaciones autorizadas)
            let totalSold = 0;
            let totalCost = 0;
            let totalExpense = 0;

            for (const cotizacion of evento.cotizaciones) {
                const precioCotizacion = cotizacion.price - (cotizacion.discount || 0);
                totalSold += precioCotizacion;

                for (const item of cotizacion.cotizacion_items) {
                    // Usar snapshots para garantizar inmutabilidad
                    const costo = item.cost_snapshot ?? item.cost ?? 0;
                    const gasto = item.expense_snapshot ?? item.expense ?? 0;

                    const cantidadEfectiva = calcularCantidadEfectiva(
                        (item.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
                        item.quantity,
                        evento.duration_hours
                    );

                    totalCost += costo * cantidadEfectiva;
                    totalExpense += gasto * cantidadEfectiva;
                }
            }

            const estimatedProfit = totalSold - totalCost - totalExpense;
            const profitMargin = totalSold > 0 ? (estimatedProfit / totalSold) * 100 : 0;

            // Nombre del evento: usar nombre de la promesa o del evento
            const eventName = evento.promise?.contact_name
                ? `${evento.promise.contact_name} - ${evento.name || 'Evento'}`
                : evento.name || 'Evento sin nombre';

            rentabilidad.push({
                eventId: evento.id,
                eventName,
                eventDate: evento.event_date,
                totalSold,
                totalCost,
                totalExpense,
                estimatedProfit,
                profitMargin,
            });
        }

        return {
            success: true,
            data: rentabilidad,
        };
    } catch (error) {
        console.error('Error obteniendo rentabilidad por evento:', error);
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
        // Incluir solo nóminas consolidadas (payment_type: 'consolidado') o individuales (payment_type: 'individual')
        // Excluir nóminas con payment_type null que fueron consolidadas
        const nominasRaw = await prisma.studio_nominas.findMany({
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
                gross_amount: true,
                total_discounts: true,
                payment_type: true,
                consolidated_payment_id: true,
                personal_id: true,
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

        // Agrupar nóminas individuales que pertenecen a un pago consolidado
        // Mostrar solo el consolidado, no las individuales agrupadas
        const nominasConsolidadas = new Map<string, typeof nominasRaw[0]>();
        const nominasIndividuales: typeof nominasRaw = [];
        const idsConsolidados = new Set<string>();

        // Primero, identificar todos los consolidados
        for (const nomina of nominasRaw) {
            if (nomina.payment_type === 'consolidado') {
                nominasConsolidadas.set(nomina.id, nomina);
                idsConsolidados.add(nomina.id);
            }
        }

        // Luego, filtrar las individuales
        for (const nomina of nominasRaw) {
            if (nomina.payment_type === 'individual') {
                // Es una nómina individual
                if (nomina.consolidated_payment_id) {
                    // Pertenece a un consolidado
                    if (idsConsolidados.has(nomina.consolidated_payment_id)) {
                        // El consolidado existe en el rango, NO mostrar esta individual
                        continue;
                    } else {
                        // El consolidado no está en el rango, mostrar la individual
                        nominasIndividuales.push(nomina);
                    }
                } else {
                    // No tiene consolidated_payment_id (nómina antigua o individual sin consolidar)
                    // Verificar si hay un consolidado del mismo personal y fecha que podría ser su consolidado
                    const posibleConsolidado = Array.from(nominasConsolidadas.values()).find(
                        c => c.personal_id === nomina.personal_id &&
                            c.payment_date && nomina.payment_date &&
                            Math.abs(c.payment_date.getTime() - nomina.payment_date.getTime()) < 1000 // Mismo segundo
                    );
                    if (posibleConsolidado) {
                        // Hay un consolidado que podría ser de esta nómina, no mostrarla
                        continue;
                    }
                    // No hay consolidado relacionado, mostrarla
                    nominasIndividuales.push(nomina);
                }
            }
        }

        // Combinar consolidadas e individuales
        const nominas = [...nominasConsolidadas.values(), ...nominasIndividuales];

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
                personal_id: true,
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
                nominaPaymentType: nomina.payment_type,
                isGastoOperativo: false,
                totalDiscounts: nomina.total_discounts ? Number(nomina.total_discounts) : undefined,
            })),
            ...gastos.map((gasto) => ({
                id: gasto.id,
                fecha: gasto.date,
                fuente: 'operativo' as const,
                concepto: gasto.concept,
                categoria: gasto.category,
                monto: -gasto.amount,
                isGastoOperativo: gasto.category === 'Operativo' || gasto.category === 'Recurrente',
                personalId: gasto.personal_id || undefined, // ID del personal si el gasto está asociado
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
        // Incluir solo nóminas consolidadas (payment_type: 'consolidado') o individuales (payment_type: 'individual')
        // Excluir nóminas con payment_type null que fueron consolidadas
        const nominasRaw = await prisma.studio_nominas.findMany({
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
                payment_type: true,
                consolidated_payment_id: true,
                personal_id: true,
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

        // Agrupar nóminas individuales que pertenecen a un pago consolidado
        // Mostrar solo el consolidado, no las individuales agrupadas
        const nominasConsolidadas = new Map<string, typeof nominasRaw[0]>();
        const nominasIndividuales: typeof nominasRaw = [];
        const idsConsolidados = new Set<string>();

        // Primero, identificar todos los consolidados
        for (const nomina of nominasRaw) {
            if (nomina.payment_type === 'consolidado') {
                nominasConsolidadas.set(nomina.id, nomina);
                idsConsolidados.add(nomina.id);
            }
        }

        // Luego, filtrar las individuales
        for (const nomina of nominasRaw) {
            if (nomina.payment_type === 'individual') {
                // Es una nómina individual
                if (nomina.consolidated_payment_id) {
                    // Pertenece a un consolidado
                    if (idsConsolidados.has(nomina.consolidated_payment_id)) {
                        // El consolidado existe en el rango, NO mostrar esta individual
                        continue;
                    } else {
                        // El consolidado no está en el rango, mostrar la individual
                        nominasIndividuales.push(nomina);
                    }
                } else {
                    // No tiene consolidated_payment_id (nómina antigua o individual sin consolidar)
                    // Verificar si hay un consolidado del mismo personal y fecha que podría ser su consolidado
                    const posibleConsolidado = Array.from(nominasConsolidadas.values()).find(
                        c => c.personal_id === nomina.personal_id &&
                            c.payment_date && nomina.payment_date &&
                            Math.abs(c.payment_date.getTime() - nomina.payment_date.getTime()) < 1000 // Mismo segundo
                    );
                    if (posibleConsolidado) {
                        // Hay un consolidado que podría ser de esta nómina, no mostrarla
                        continue;
                    }
                    // No hay consolidado relacionado, mostrarla
                    nominasIndividuales.push(nomina);
                }
            }
        }

        // Combinar consolidadas e individuales
        const nominas = [...nominasConsolidadas.values(), ...nominasIndividuales];

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
                personal_id: true,
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
                nominaPaymentType: nomina.payment_type, // Tipo de pago
                isGastoOperativo: false,
                totalDiscounts: nomina.total_discounts ? Number(nomina.total_discounts) : undefined,
            })),
            ...gastos.map((gasto) => ({
                id: gasto.id,
                fecha: gasto.date,
                fuente: 'operativo' as const,
                concepto: gasto.concept,
                categoria: gasto.category,
                monto: -gasto.amount,
                isGastoOperativo: gasto.category === 'Operativo' || gasto.category === 'Recurrente', // Identificar gastos personalizados
                personalId: gasto.personal_id || undefined, // ID del personal si el gasto está asociado
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


        for (const promesa of promesas) {
            for (const cotizacion of promesa.quotes) {
                const totalCotizacion = cotizacion.price - (cotizacion.discount || 0);
                const pagosDeEstaCotizacion = pagosPorCotizacion.get(cotizacion.id) || 0;
                const pendiente = totalCotizacion - pagosDeEstaCotizacion;


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
 * Obtener pendientes por pagar (nóminas pendientes) - Agrupado por personal
 */
export async function obtenerPorPagar(
    studioSlug: string
): Promise<{ success: boolean; data?: PorPagarPersonal[]; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const nominas = await prisma.studio_nominas.findMany({
            where: {
                studio_id: studioId,
                status: 'pendiente',
                personal_id: { not: null },
            },
            select: {
                id: true,
                concept: true,
                net_amount: true,
                assignment_date: true,
                status: true,
                personal_id: true,
                personal: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                assignment_date: 'desc',
            },
        });

        // Agrupar por personal_id
        const agrupado = new Map<string, PorPagarPersonal>();

        for (const nomina of nominas) {
            if (!nomina.personal_id || !nomina.personal) continue;

            const personalId = nomina.personal_id;
            const personalName = nomina.personal.name;

            if (!agrupado.has(personalId)) {
                agrupado.set(personalId, {
                    personalId,
                    personalName,
                    totalAcumulado: 0,
                    items: [],
                });
            }

            const grupo = agrupado.get(personalId)!;
            grupo.totalAcumulado += nomina.net_amount;
            grupo.items.push({
                id: nomina.id,
                concepto: nomina.concept || `Nómina - ${personalName}`,
                monto: nomina.net_amount,
                fecha: nomina.assignment_date,
                nominaId: nomina.id,
            });
        }

        // Convertir a array y ordenar por total acumulado descendente
        const porPagar: PorPagarPersonal[] = Array.from(agrupado.values()).sort(
            (a, b) => b.totalAcumulado - a.totalAcumulado
        );

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
                payment_type: 'individual', // Marcar como pago individual
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
 * Pagar nóminas consolidadas de un personal
 * Crea una nómina consolidada y marca las individuales como pagadas
 * Soporta pagos parciales con múltiples métodos y descuentos
 */
export async function pagarNominasPersonal(
    studioSlug: string,
    personalId: string,
    nominaIds: string[],
    options?: {
        partialPayments?: Array<{
            payment_method: 'transferencia' | 'efectivo';
            amount: number;
        }>;
        totalDiscounts?: number;
    }
): Promise<{ success: boolean; data?: { nominaConsolidadaId: string }; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Obtener usuario actual
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser?.id) {
            return { success: false, error: 'Usuario no autenticado' };
        }

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

        // Obtener personal
        const personal = await prisma.studio_crew_members.findFirst({
            where: {
                id: personalId,
                studio_id: studioId,
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (!personal) {
            return { success: false, error: 'Personal no encontrado' };
        }

        // Obtener todas las nóminas pendientes del personal
        const nominas = await prisma.studio_nominas.findMany({
            where: {
                id: { in: nominaIds },
                studio_id: studioId,
                personal_id: personalId,
                status: 'pendiente',
            },
            include: {
                payroll_services: true,
            },
        });

        if (nominas.length === 0) {
            return { success: false, error: 'No hay nóminas pendientes para este personal' };
        }

        // Calcular totales
        const totalNetAmount = nominas.reduce((sum, n) => sum + n.net_amount, 0);
        const totalGrossAmount = nominas.reduce((sum, n) => sum + n.gross_amount, 0);
        const totalServices = nominas.reduce((sum, n) => sum + n.services_included, 0);

        // Agrupar servicios ANTES de la transacción para optimizar
        const serviciosAgrupados = new Map<string, {
            quote_service_id: string | null;
            service_name: string;
            assigned_cost: number;
            assigned_quantity: number;
            category_name: string | null;
            section_name: string | null;
        }>();

        for (const nomina of nominas) {
            for (const servicio of nomina.payroll_services) {
                const key = servicio.quote_service_id || `manual-${servicio.service_name}`;

                if (serviciosAgrupados.has(key)) {
                    // Si ya existe, sumar costos y cantidades
                    const existente = serviciosAgrupados.get(key)!;
                    existente.assigned_cost += servicio.assigned_cost;
                    existente.assigned_quantity += servicio.assigned_quantity;
                } else {
                    // Crear nuevo registro
                    serviciosAgrupados.set(key, {
                        quote_service_id: servicio.quote_service_id,
                        service_name: servicio.service_name,
                        assigned_cost: servicio.assigned_cost,
                        assigned_quantity: servicio.assigned_quantity,
                        category_name: servicio.category_name,
                        section_name: servicio.section_name,
                    });
                }
            }
        }

        // Preparar datos para operaciones en lote
        const nominaIdsArray = nominas.map(n => n.id);
        const serviciosParaCrear = Array.from(serviciosAgrupados.values());
        const paymentDate = new Date();

        // Extraer opciones de pago
        const totalDiscounts = options?.totalDiscounts ?? 0;
        const partialPayments = options?.partialPayments ?? [];
        const totalToPay = totalNetAmount - totalDiscounts;

        // Validar que si hay pagos parciales, la suma coincida con el total a pagar
        if (partialPayments.length > 0) {
            const partialTotal = partialPayments.reduce((sum, p) => sum + p.amount, 0);
            if (Math.abs(partialTotal - totalToPay) > 0.01) {
                return { success: false, error: `La suma de los pagos parciales (${partialTotal.toFixed(2)}) debe coincidir con el total a pagar (${totalToPay.toFixed(2)})` };
            }
        }

        // Crear nómina consolidada y marcar individuales como pagadas en transacción optimizada
        const resultado = await prisma.$transaction(
            async (tx) => {
                // 1. Crear nómina consolidada
                const nominaConsolidada = await tx.studio_nominas.create({
                    data: {
                        studio_id: studioId,
                        personal_id: personalId,
                        user_id: studioUser.id,
                        status: 'pagado',
                        concept: `Pago consolidado - ${personal.name}`,
                        description: `Pago consolidado de ${nominas.length} servicio${nominas.length > 1 ? 's' : ''}${totalDiscounts > 0 ? ` (Descuento: $${totalDiscounts.toFixed(2)})` : ''}`,
                        gross_amount: totalGrossAmount,
                        net_amount: totalToPay, // Monto neto después de descuentos
                        total_cost_snapshot: totalGrossAmount,
                        expense_total_snapshot: 0,
                        deductions: 0,
                        total_discounts: totalDiscounts,
                        payment_type: 'consolidado',
                        services_included: totalServices,
                        assignment_date: paymentDate,
                        payment_date: paymentDate,
                        paid_by: studioUser.id,
                        // Si hay pagos parciales, usar el primer método como default (para compatibilidad)
                        // El método real se guarda en los pagos parciales
                        payment_method: partialPayments.length > 0 ? partialPayments[0].payment_method : 'transferencia',
                    },
                });

                // 1.1. Crear pagos parciales si existen
                if (partialPayments.length > 0) {
                    await tx.studio_nomina_pagos_parciales.createMany({
                        data: partialPayments.map(payment => ({
                            nomina_id: nominaConsolidada.id,
                            payment_method: payment.payment_method,
                            amount: payment.amount,
                            payment_date: paymentDate,
                        })),
                    });
                }

                // 2. Marcar todas las nóminas individuales como pagadas en una sola operación
                // Asignar consolidated_payment_id para agruparlas en movimientos
                await tx.studio_nominas.updateMany({
                    where: {
                        id: { in: nominaIdsArray },
                    },
                    data: {
                        status: 'pagado',
                        paid_by: studioUser.id,
                        payment_date: paymentDate,
                        consolidated_payment_id: nominaConsolidada.id, // Relacionar con el consolidado
                        payment_type: 'individual', // Mantener como individual para el historial
                    },
                });

                // 3. Crear todos los servicios consolidados en una sola operación
                if (serviciosParaCrear.length > 0) {
                    await tx.studio_nomina_servicios.createMany({
                        data: serviciosParaCrear.map(servicio => ({
                            payroll_id: nominaConsolidada.id,
                            quote_service_id: servicio.quote_service_id,
                            service_name: servicio.service_name,
                            assigned_cost: servicio.assigned_cost,
                            assigned_quantity: servicio.assigned_quantity,
                            category_name: servicio.category_name,
                            section_name: servicio.section_name,
                        })),
                    });
                }

                return nominaConsolidada;
            },
            {
                timeout: 10000, // Aumentar timeout a 10 segundos
            }
        );

        // Revalidar todas las rutas relacionadas
        revalidatePath(`/${studioSlug}/studio/business/finanzas`);
        revalidatePath(`/${studioSlug}/studio/business/finanzas`, 'page');

        return {
            success: true,
            data: { nominaConsolidadaId: resultado.id },
        };
    } catch (error) {
        console.error('[FINANZAS] ❌ Error pagando nóminas consolidadas:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al pagar nóminas consolidadas',
        };
    }
}

/**
 * Obtener servicios de una nómina (para mostrar desglose)
 */
export async function obtenerServiciosNomina(
    studioSlug: string,
    nominaId: string
): Promise<{ success: boolean; data?: Array<{ service_name: string; assigned_cost: number; assigned_quantity: number }>; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const nomina = await prisma.studio_nominas.findFirst({
            where: {
                id: nominaId,
                studio_id: studioId,
            },
            include: {
                payroll_services: {
                    select: {
                        service_name: true,
                        assigned_cost: true,
                        assigned_quantity: true,
                    },
                },
            },
        });

        if (!nomina) {
            return { success: false, error: 'Nómina no encontrada' };
        }

        return {
            success: true,
            data: nomina.payroll_services,
        };
    } catch (error) {
        console.error('Error obteniendo servicios de nómina:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener servicios',
        };
    }
}

/**
 * Editar nómina pendiente
 */
export async function editarNomina(
    studioSlug: string,
    nominaId: string,
    data: {
        concept: string;
        net_amount: number;
        assignment_date: Date;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que la nómina existe y está pendiente
        const nomina = await prisma.studio_nominas.findFirst({
            where: {
                id: nominaId,
                studio_id: studioId,
                status: 'pendiente',
            },
            select: {
                id: true,
                status: true,
            },
        });

        if (!nomina) {
            return { success: false, error: 'Nómina no encontrada o ya está pagada' };
        }

        // Actualizar nómina
        await prisma.studio_nominas.update({
            where: { id: nominaId },
            data: {
                concept: data.concept,
                net_amount: data.net_amount,
                gross_amount: data.net_amount, // Mantener consistencia
                assignment_date: data.assignment_date,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return { success: true };
    } catch (error) {
        console.error('Error editando nómina:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al editar nómina',
        };
    }
}

/**
 * Eliminar nómina pendiente
 */
export async function eliminarNomina(
    studioSlug: string,
    nominaId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar que la nómina existe y está pendiente
        const nomina = await prisma.studio_nominas.findFirst({
            where: {
                id: nominaId,
                studio_id: studioId,
                status: 'pendiente',
            },
            select: {
                id: true,
                status: true,
            },
        });

        if (!nomina) {
            return { success: false, error: 'Nómina no encontrada o ya está pagada' };
        }

        // Eliminar nómina (los servicios se eliminan por cascade)
        await prisma.studio_nominas.delete({
            where: { id: nominaId },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return { success: true };
    } catch (error) {
        console.error('Error eliminando nómina:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al eliminar nómina',
        };
    }
}

/**
 * Eliminar todas las nóminas pendientes de un personal
 */
export async function eliminarTodasNominasPersonal(
    studioSlug: string,
    personalId: string
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Eliminar todas las nóminas pendientes del personal
        const result = await prisma.studio_nominas.deleteMany({
            where: {
                studio_id: studioId,
                personal_id: personalId,
                status: 'pendiente',
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return { success: true, deletedCount: result.count };
    } catch (error) {
        console.error('Error eliminando nóminas:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al eliminar nóminas',
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
    expenseId: string,
    options?: {
        totalDiscounts?: number;
        partialPayments?: Array<{ payment_method: string; amount: number }>;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Verificar si es un crew member (ID empieza con "crew-")
        const isCrewMember = expenseId.startsWith('crew-');
        let gastoRecurrente: { name: string; amount: number; description: string | null; crewMemberId?: string } | null = null;

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
                    id: true,
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
                crewMemberId: crewMember.id,
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

        // Calcular total a pagar (después de descuentos)
        const totalDiscounts = options?.totalDiscounts ?? 0;
        const totalToPay = gastoRecurrente.amount - totalDiscounts;
        const partialPayments = options?.partialPayments ?? [];

        // Determinar método de pago
        let paymentMethod = 'transferencia'; // Default
        if (partialPayments.length > 0) {
            paymentMethod = partialPayments.length > 1 ? 'combinado' : partialPayments[0].payment_method;
        }

        // Crear el gasto operativo asociado al gasto recurrente
        const gasto = await prisma.studio_gastos.create({
            data: {
                studio_id: studioId,
                user_id: studioUser.id,
                concept: gastoRecurrente.name,
                amount: totalToPay, // Monto neto después de descuentos
                category: 'Recurrente',
                date: new Date(),
                description: gastoRecurrente.description || null,
                status: 'activo',
                personal_id: gastoRecurrente.crewMemberId || null, // Asociar con personal si es crew member
                payment_method: paymentMethod,
                // Nota: Para guardar descuentos y pagos parciales, necesitaríamos campos adicionales
                // Por ahora solo guardamos el monto neto y el método de pago
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
 * Cancelar pago recurrente por ID del gasto pagado
 * Elimina el gasto de movimientos y automáticamente regresa a gastos recurrentes
 */
export async function cancelarPagoRecurrentePorGastoId(
    studioSlug: string,
    gastoId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        // Obtener el gasto pagado
        const gasto = await prisma.studio_gastos.findFirst({
            where: {
                id: gastoId,
                studio_id: studioId,
                category: 'Recurrente',
            },
            select: {
                id: true,
                concept: true,
                personal_id: true,
                date: true,
            },
        });

        if (!gasto) {
            return { success: false, error: 'Gasto recurrente no encontrado' };
        }

        // Eliminar el gasto pagado
        await prisma.studio_gastos.delete({
            where: {
                id: gasto.id,
            },
        });

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error cancelando pago recurrente:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al cancelar pago recurrente',
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
 * Si es una nómina consolidada, también restaura las nóminas individuales asociadas
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
                payment_type: true,
                personal_id: true,
                payment_date: true,
            },
        });

        if (!nomina) {
            return { success: false, error: 'Nómina pagada no encontrada' };
        }

        // Si es una nómina consolidada, restaurar también las nóminas individuales asociadas
        if (nomina.payment_type === 'consolidado' && nomina.personal_id && nomina.payment_date) {
            await prisma.$transaction(async (tx) => {
                // 1. Eliminar la nómina consolidada
                await tx.studio_nominas.delete({
                    where: { id: nominaId },
                });

                // 2. Restaurar las nóminas individuales asociadas
                // Buscar nóminas que tienen este consolidado como referencia
                const nominasParaRestaurar = await tx.studio_nominas.findMany({
                    where: {
                        studio_id: studioId,
                        consolidated_payment_id: nominaId,
                        status: 'pagado',
                    },
                    select: { id: true },
                });

                // Restaurar las nóminas individuales
                if (nominasParaRestaurar.length > 0) {
                    await tx.studio_nominas.updateMany({
                        where: {
                            id: { in: nominasParaRestaurar.map(n => n.id) },
                        },
                        data: {
                            status: 'pendiente',
                            payment_date: null,
                            paid_by: null,
                            payment_method: null,
                            consolidated_payment_id: null, // Limpiar la referencia al consolidado
                        },
                    });
                }
            });
        } else {
            // Si es una nómina individual, solo actualizar su status
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
        }

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

/**
 * Eliminar nómina pagada completamente (elimina el pago y los items asociados si es consolidada)
 */
export async function eliminarNominaPagada(
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
                payment_type: true,
                personal_id: true,
                payment_date: true,
            },
        });

        if (!nomina) {
            return { success: false, error: 'Nómina pagada no encontrada' };
        }

        // Si es una nómina consolidada, eliminar también las nóminas individuales asociadas
        if (nomina.payment_type === 'consolidado' && nomina.personal_id && nomina.payment_date) {
            await prisma.$transaction(async (tx) => {
                // 1. Eliminar la nómina consolidada
                await tx.studio_nominas.delete({
                    where: { id: nominaId },
                });

                // 2. Buscar y eliminar las nóminas individuales asociadas
                // Buscar nóminas que tienen este consolidado como referencia
                const nominasParaEliminar = await tx.studio_nominas.findMany({
                    where: {
                        studio_id: studioId,
                        consolidated_payment_id: nominaId,
                        status: 'pagado',
                    },
                    select: { id: true },
                });

                // Eliminar las nóminas individuales
                if (nominasParaEliminar.length > 0) {
                    await tx.studio_nominas.deleteMany({
                        where: {
                            id: { in: nominasParaEliminar.map(n => n.id) },
                        },
                    });
                }
            });
        } else {
            // Si es una nómina individual, solo eliminarla
            await prisma.studio_nominas.delete({
                where: { id: nominaId },
            });
        }

        revalidatePath(`/${studioSlug}/studio/business/finanzas`);

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error eliminando nómina pagada:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al eliminar nómina pagada',
        };
    }
}

/**
 * Obtener datos para análisis financiero
 */
export interface AnalisisFinancieroData {
    ingresosPorEvento: Array<{
        evento: string;
        monto: number;
    }>;
    egresosPorCategoria: Array<{
        categoria: string;
        monto: number;
    }>;
    balance: {
        ingresos: number;
        egresos: number;
        utilidad: number;
    };
}

export async function obtenerAnalisisFinanciero(
    studioSlug: string,
    month: Date
): Promise<{ success: boolean; data?: AnalisisFinancieroData; error?: string }> {
    try {
        const studioId = await getStudioId(studioSlug);
        if (!studioId) {
            return { success: false, error: 'Studio no encontrado' };
        }

        const { start, end } = getMonthRange(month);

        // Obtener ingresos agrupados por evento
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
                amount: true,
                promise: {
                    select: {
                        name: true,
                        event_date: true,
                    },
                },
            },
        });

        // Agrupar ingresos por evento
        const ingresosPorEventoMap = new Map<string, number>();
        pagos.forEach((pago) => {
            const eventoNombre = pago.promise?.name || 'Otros ingresos';
            const actual = ingresosPorEventoMap.get(eventoNombre) || 0;
            ingresosPorEventoMap.set(eventoNombre, actual + pago.amount);
        });

        const ingresosPorEvento = Array.from(ingresosPorEventoMap.entries())
            .map(([evento, monto]) => ({ evento, monto }))
            .sort((a, b) => b.monto - a.monto);

        // Obtener egresos agrupados por categoría/subcategoría
        const gastos = await prisma.studio_gastos.findMany({
            where: {
                studio_id: studioId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                amount: true,
                category: true,
                subcategory: true,
                concept: true,
            },
        });

        // Función para normalizar texto (quitar acentos y convertir a lowercase)
        const normalizarTexto = (texto: string): string => {
            return texto
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
                .trim();
        };

        // Diccionario expandido de palabras clave por categoría
        // Cada categoría tiene múltiples variantes y sinónimos
        const palabrasClavePorCategoria: Record<string, string[]> = {
            'Fotografía': [
                'foto', 'fotografia', 'photography', 'photographer', 'fotografo',
                'camara', 'camera', 'lente', 'lens', 'flash', 'iluminacion',
                'iluminación', 'lighting', 'retrato', 'portrait', 'boda', 'wedding',
                'quince', 'xv', 'evento', 'event', 'sesion', 'sesión', 'session'
            ],
            'Video': [
                'video', 'videografia', 'videography', 'videografo', 'videographer',
                'filmacion', 'filmación', 'filming', 'grabacion', 'grabación',
                'recording', 'drone', 'gimbal', 'estabilizador', 'stabilizer',
                'edicion video', 'video editing', 'postproduccion', 'postproducción'
            ],
            'Edición': [
                'edicion', 'edición', 'editing', 'editor', 'postproduccion',
                'postproducción', 'post production', 'retoque', 'retouch',
                'photoshop', 'lightroom', 'premiere', 'after effects', 'final cut',
                'color grading', 'colorizacion', 'colorización', 'montaje'
            ],
            'Equipo': [
                'equipo', 'gear', 'camara', 'camera', 'lente', 'lens', 'objetivo',
                'drone', 'gimbal', 'estabilizador', 'stabilizer', 'tripode',
                'trípode', 'tripod', 'monopod', 'micrófono', 'microfono', 'microphone',
                'audio', 'grabadora', 'recorder', 'bateria', 'batería', 'battery',
                'tarjeta', 'card', 'memoria', 'memory', 'disco', 'disk', 'ssd', 'hdd'
            ],
            'Renta': [
                'renta', 'alquiler', 'rental', 'alquiler de', 'renta de',
                'locacion', 'locación', 'location', 'espacio', 'space', 'lugar',
                'venue', 'salon', 'salón', 'hall', 'estudio', 'studio'
            ],
            'Transporte': [
                'transporte', 'transport', 'gasolina', 'gas', 'combustible',
                'fuel', 'uber', 'taxi', 'viaje', 'travel', 'vuelo', 'flight',
                'hotel', 'hospedaje', 'lodging', 'estacionamiento', 'parking',
                'peaje', 'toll', 'kilometraje', 'kilometrage'
            ],
            'Alimentación': [
                'comida', 'food', 'alimentacion', 'alimentación', 'restaurante',
                'restaurant', 'cena', 'dinner', 'almuerzo', 'lunch', 'desayuno',
                'breakfast', 'bebidas', 'drinks', 'refrescos', 'snacks'
            ],
            'Marketing': [
                'marketing', 'publicidad', 'advertising', 'ads', 'anuncios',
                'redes sociales', 'social media', 'facebook', 'instagram',
                'google ads', 'seo', 'promocion', 'promoción', 'promotion',
                'flyer', 'volante', 'diseño grafico', 'diseño gráfico', 'graphic design'
            ],
            'Software': [
                'software', 'suscripcion', 'suscripción', 'subscription', 'licencia',
                'license', 'adobe', 'creative cloud', 'office', 'microsoft',
                'saas', 'cloud', 'nube', 'hosting', 'dominio', 'domain'
            ],
            'Mantenimiento': [
                'mantenimiento', 'maintenance', 'reparacion', 'reparación', 'repair',
                'servicio tecnico', 'servicio técnico', 'technical service',
                'limpieza', 'cleaning', 'calibracion', 'calibración', 'calibration'
            ]
        };

        // Función para detectar categoría basada en palabras clave
        const detectarCategoriaPorConcepto = (
            concept: string,
            subcategory: string | null,
            category: string
        ): string => {
            const conceptNormalizado = normalizarTexto(concept);
            const subcategoryNormalizado = subcategory ? normalizarTexto(subcategory) : '';
            const categoryNormalizado = normalizarTexto(category);

            // Buscar en concept primero (más descriptivo)
            for (const [categoria, palabrasClave] of Object.entries(palabrasClavePorCategoria)) {
                for (const palabra of palabrasClave) {
                    const palabraNormalizada = normalizarTexto(palabra);
                    // Buscar palabra completa (con word boundaries)
                    const regex = new RegExp(`\\b${palabraNormalizada.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                    if (regex.test(conceptNormalizado)) {
                        return categoria;
                    }
                }
            }

            // Si no se encontró en concept, buscar en subcategory
            if (subcategoryNormalizado) {
                for (const [categoria, palabrasClave] of Object.entries(palabrasClavePorCategoria)) {
                    for (const palabra of palabrasClave) {
                        const palabraNormalizada = normalizarTexto(palabra);
                        const regex = new RegExp(`\\b${palabraNormalizada.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                        if (regex.test(subcategoryNormalizado)) {
                            return categoria;
                        }
                    }
                }
            }

            // Si no se encontró ninguna palabra clave, usar la categoría original
            // pero normalizarla
            if (categoryNormalizado === 'operativo' || categoryNormalizado === 'recurrente') {
                return 'Operativo';
            }

            // Capitalizar primera letra de la categoría original
            return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        };

        // Agrupar egresos por categoría detectada
        const egresosPorCategoriaMap = new Map<string, number>();
        gastos.forEach((gasto) => {
            const categoria = detectarCategoriaPorConcepto(
                gasto.concept,
                gasto.subcategory,
                gasto.category
            );

            const actual = egresosPorCategoriaMap.get(categoria) || 0;
            egresosPorCategoriaMap.set(categoria, actual + Number(gasto.amount));
        });

        // Incluir nóminas en egresos
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
                net_amount: true,
            },
        });

        const totalNominas = nominas.reduce((sum, nomina) => sum + nomina.net_amount, 0);
        
        // Agregar nóminas como categoría en egresos
        if (totalNominas > 0) {
            const actual = egresosPorCategoriaMap.get('Nóminas') || 0;
            egresosPorCategoriaMap.set('Nóminas', actual + totalNominas);
        }

        const egresosPorCategoria = Array.from(egresosPorCategoriaMap.entries())
            .map(([categoria, monto]) => ({ categoria, monto }))
            .sort((a, b) => b.monto - a.monto);

        // Calcular balance usando aggregate para coincidir con obtenerKPIsFinancieros
        const ingresosAggregate = await prisma.studio_pagos.aggregate({
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

        const gastosAggregate = await prisma.studio_gastos.aggregate({
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

        const totalIngresos = Number(ingresosAggregate._sum.amount || 0);
        const totalEgresos = Number(gastosAggregate._sum.amount || 0);
        const totalEgresosConNominas = totalEgresos + totalNominas;
        const utilidadFinal = totalIngresos - totalEgresosConNominas;

        return {
            success: true,
            data: {
                ingresosPorEvento,
                egresosPorCategoria,
                balance: {
                    ingresos: totalIngresos,
                    egresos: totalEgresosConNominas,
                    utilidad: utilidadFinal,
                },
            },
        };
    } catch (error) {
        console.error('Error obteniendo análisis financiero:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}
