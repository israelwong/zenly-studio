'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DollarSign, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { FinanceKPIs } from './components/FinanceKPIs';
import { MovimientosCard } from './components/MovimientosCard';
import { PorCobrarCard } from './components/PorCobrarCard';
import { PorPagarCard } from './components/PorPagarCard';
import { GastosRecurrentesCard } from './components/GastosRecurrentesCard';
import { HistorialSheet } from './components/HistorialSheet';
import {
    obtenerKPIsFinancieros,
    obtenerMovimientos,
    obtenerPorCobrar,
    obtenerPorPagar,
    obtenerGastosRecurrentes,
    type PorPagarPersonal,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';

export default function FinanzasPage() {
    const params = useParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({
        ingresos: 0,
        egresos: 0,
        utilidad: 0,
        porCobrar: 0,
        porPagar: 0,
    });
    const [transactions, setTransactions] = useState<Array<{
        id: string;
        fecha: Date;
        fuente: 'evento' | 'staff' | 'operativo';
        concepto: string;
        categoria: string;
        monto: number;
    }>>([]);
    const [porCobrar, setPorCobrar] = useState<Array<{
        id: string;
        concepto: string;
        monto: number;
        fecha: Date;
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
    }>>([]);
    const [porPagar, setPorPagar] = useState<PorPagarPersonal[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<Array<{
        id: string;
        name: string;
        amount: number;
        category: string;
        chargeDay: number;
        isActive: boolean;
        frequency?: string;
        description?: string | null;
    }>>([]);
    const [historialOpen, setHistorialOpen] = useState(false);

    useEffect(() => {
        document.title = 'Zenly Studio - Finanzas';
    }, []);

    useEffect(() => {
        setMounted(true);
        setCurrentMonth(new Date());
    }, []);

    useEffect(() => {
        if (!mounted || !currentMonth) return;

        const loadData = async () => {
            try {
                setLoading(true);
                const [kpisResult, transactionsResult, porCobrarResult, porPagarResult, expensesResult] =
                    await Promise.all([
                        obtenerKPIsFinancieros(studioSlug, currentMonth),
                        obtenerMovimientos(studioSlug, currentMonth),
                        obtenerPorCobrar(studioSlug),
                        obtenerPorPagar(studioSlug),
                        obtenerGastosRecurrentes(studioSlug, currentMonth),
                    ]);

                if (kpisResult.success) {
                    setKpis(kpisResult.data);
                } else if (!kpisResult.success) {
                    console.error('[FINANZAS UI] Error en KPIs:', kpisResult.error);
                }
                if (transactionsResult.success && transactionsResult.data) {
                    setTransactions(transactionsResult.data);
                }
                if (porCobrarResult.success && porCobrarResult.data) {
                    console.log('[FINANZAS UI] Por cobrar cargado:', porCobrarResult.data.length, 'items');
                    setPorCobrar(porCobrarResult.data);
                } else if (!porCobrarResult.success) {
                    console.error('[FINANZAS UI] Error en por cobrar:', porCobrarResult.error);
                }
                if (porPagarResult.success && porPagarResult.data) {
                    setPorPagar(porPagarResult.data);
                }
                if (expensesResult.success && expensesResult.data) {
                    setRecurringExpenses(expensesResult.data);
                }
            } catch (error) {
                console.error('Error cargando datos financieros:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [mounted, currentMonth, studioSlug]);

    const handleRegistrarGasto = () => {
        // TODO: Implementar modal de registro de gasto
        console.log('Registrar gasto');
    };

    const handleRegistrarIngreso = () => {
        // TODO: Implementar modal de registro de ingreso
        console.log('Registrar ingreso');
    };

    const handleRegistrarPago = (id: string) => {
        // TODO: Implementar registro de pago
        console.log('Registrar pago:', id);
    };

    const handleMarcarPagado = (id: string) => {
        // TODO: Implementar marcar como pagado
        console.log('Marcar pagado:', id);
    };

    const handleAddExpense = () => {
        // TODO: Implementar modal de agregar gasto fijo
        console.log('Agregar gasto fijo');
    };

    const handleEditExpense = (id: string) => {
        // TODO: Implementar modal de editar gasto fijo
        console.log('Editar gasto fijo:', id);
    };

    if (!mounted || !currentMonth) {
        return (
            <div className="h-[calc(100vh-80px)]">
                <ZenCard variant="default" padding="none" className="h-full flex flex-col">
                    <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-600/20 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <ZenCardTitle>Finanzas</ZenCardTitle>
                                    <ZenCardDescription>
                                        Gestiona las finanzas de tu estudio
                                    </ZenCardDescription>
                                </div>
                            </div>
                        </div>
                    </ZenCardHeader>
                    <ZenCardContent className="p-6 flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 bg-zinc-900/50 rounded-lg animate-pulse" />
                    </ZenCardContent>
                </ZenCard>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)]">
            <ZenCard variant="default" padding="none" className="h-full flex flex-col">
                <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-600/20 rounded-lg">
                                <DollarSign className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Finanzas</ZenCardTitle>
                                <ZenCardDescription>
                                    Gestiona las finanzas de tu estudio
                                </ZenCardDescription>
                            </div>
                        </div>
                        {currentMonth && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const newDate = new Date(currentMonth);
                                            newDate.setMonth(newDate.getMonth() - 1);
                                            setCurrentMonth(newDate);
                                        }}
                                        aria-label="Mes anterior"
                                        className="h-7 w-7 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </ZenButton>
                                    <div className="px-2 py-1 min-w-[140px] text-center">
                                        <span className="text-sm font-semibold text-zinc-200 capitalize">
                                            {currentMonth.toLocaleDateString('es-ES', {
                                                month: 'long',
                                                year: 'numeric',
                                            }).replace(' de ', ' ')}
                                        </span>
                                    </div>
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const newDate = new Date(currentMonth);
                                            newDate.setMonth(newDate.getMonth() + 1);
                                            setCurrentMonth(newDate);
                                        }}
                                        aria-label="Mes siguiente"
                                        className="h-7 w-7 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </ZenButton>
                                </div>
                                <ZenButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setHistorialOpen(true)}
                                    icon={History}
                                    iconPosition="left"
                                >
                                    Historial
                                </ZenButton>
                            </div>
                        )}
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6 flex-1 min-h-0 flex flex-col overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col gap-6 h-full">
                            {/* KPIs Skeleton */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-zinc-700/50 rounded w-24 animate-pulse" />
                                                <div className="h-7 bg-zinc-700/50 rounded w-32 animate-pulse" />
                                            </div>
                                            <div className="h-9 w-9 bg-zinc-700/50 rounded-lg animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Grid de 3 columnas Skeleton */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
                                {/* Columna 1: Movimientos */}
                                <div className="lg:col-span-1 flex flex-col min-h-0">
                                    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg h-full flex flex-col">
                                        <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
                                            <div className="h-4 bg-zinc-700/50 rounded w-32 animate-pulse" />
                                            <div className="h-7 w-7 bg-zinc-700/50 rounded animate-pulse" />
                                        </div>
                                        <div className="p-4 flex-1 overflow-auto space-y-3">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div key={i} className="bg-zinc-800/20 border border-zinc-700/30 rounded-lg p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="h-3 bg-zinc-700/50 rounded w-24 animate-pulse" />
                                                        <div className="h-4 bg-zinc-700/50 rounded w-20 animate-pulse" />
                                                    </div>
                                                    <div className="h-3 bg-zinc-700/40 rounded w-32 animate-pulse" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Columna 2: Por Cobrar y Por Pagar */}
                                <div className="lg:col-span-1 flex flex-col gap-6 min-h-0 overflow-hidden">
                                    {/* Por Cobrar Skeleton */}
                                    <div className="flex-1 min-h-0">
                                        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg h-full flex flex-col">
                                            <div className="border-b border-zinc-800 px-4 py-3">
                                                <div className="h-4 bg-zinc-700/50 rounded w-28 animate-pulse" />
                                            </div>
                                            <div className="p-4 flex-1 overflow-auto space-y-3">
                                                {[1, 2, 3].map((i) => (
                                                    <div key={i} className="bg-zinc-800/20 border border-zinc-700/30 rounded-lg p-3 space-y-2">
                                                        <div className="h-3 bg-zinc-700/50 rounded w-32 animate-pulse" />
                                                        <div className="h-4 bg-zinc-700/50 rounded w-24 animate-pulse" />
                                                        <div className="h-2 bg-zinc-700/40 rounded w-full animate-pulse" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Por Pagar Skeleton */}
                                    <div className="flex-1 min-h-0">
                                        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg h-full flex flex-col">
                                            <div className="border-b border-zinc-800 px-4 py-3">
                                                <div className="h-4 bg-zinc-700/50 rounded w-24 animate-pulse" />
                                            </div>
                                            <div className="p-4 flex-1 overflow-auto space-y-3">
                                                {[1, 2, 3].map((i) => (
                                                    <div key={i} className="bg-zinc-800/20 border border-zinc-700/30 rounded-lg p-3 space-y-2">
                                                        <div className="h-3 bg-zinc-700/50 rounded w-28 animate-pulse" />
                                                        <div className="h-4 bg-zinc-700/50 rounded w-20 animate-pulse" />
                                                        <div className="h-2 bg-zinc-700/40 rounded w-full animate-pulse" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Columna 3: Gastos Recurrentes */}
                                <div className="lg:col-span-1 flex flex-col min-h-0">
                                    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg h-full flex flex-col">
                                        <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
                                            <div className="h-4 bg-zinc-700/50 rounded w-36 animate-pulse" />
                                            <div className="h-7 w-7 bg-zinc-700/50 rounded animate-pulse" />
                                        </div>
                                        <div className="p-4 flex-1 overflow-auto space-y-3">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="bg-zinc-800/20 border border-zinc-700/30 rounded-lg p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="h-3 bg-zinc-700/50 rounded w-28 animate-pulse" />
                                                        <div className="h-4 bg-zinc-700/50 rounded w-16 animate-pulse" />
                                                    </div>
                                                    <div className="h-2 bg-zinc-700/40 rounded w-20 animate-pulse" />
                                                    <div className="h-2 bg-zinc-700/40 rounded w-full animate-pulse" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 h-full">
                            <div className="flex-shrink-0">
                                <FinanceKPIs
                                    ingresos={kpis.ingresos}
                                    egresos={kpis.egresos}
                                    utilidad={kpis.utilidad}
                                    porCobrar={kpis.porCobrar}
                                    porPagar={kpis.porPagar}
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
                                {/* Columna 1: Movimientos */}
                                <div className="lg:col-span-1 flex flex-col min-h-0">
                                    <MovimientosCard
                                        transactions={transactions}
                                        studioSlug={studioSlug}
                                        onRegistrarIngreso={handleRegistrarIngreso}
                                        onRegistrarGasto={handleRegistrarGasto}
                                        onMovimientoRegistrado={async () => {
                                            // Recargar datos después de registrar movimiento
                                            try {
                                                const [kpisResult, transactionsResult] = await Promise.all([
                                                    obtenerKPIsFinancieros(studioSlug, currentMonth!),
                                                    obtenerMovimientos(studioSlug, currentMonth!),
                                                ]);
                                                if (kpisResult.success) {
                                                    setKpis(kpisResult.data);
                                                }
                                                if (transactionsResult.success && transactionsResult.data) {
                                                    setTransactions(transactionsResult.data);
                                                }
                                            } catch (error) {
                                                console.error('Error recargando datos:', error);
                                            }
                                        }}
                                        onGastoEliminado={async () => {
                                            // Recargar datos después de eliminar gasto
                                            try {
                                                const [kpisResult, transactionsResult, expensesResult] = await Promise.all([
                                                    obtenerKPIsFinancieros(studioSlug, currentMonth!),
                                                    obtenerMovimientos(studioSlug, currentMonth!),
                                                    obtenerGastosRecurrentes(studioSlug, currentMonth),
                                                ]);
                                                if (kpisResult.success) {
                                                    setKpis(kpisResult.data);
                                                }
                                                if (transactionsResult.success && transactionsResult.data) {
                                                    setTransactions(transactionsResult.data);
                                                }
                                                if (expensesResult.success && expensesResult.data) {
                                                    setRecurringExpenses(expensesResult.data);
                                                }
                                            } catch (error) {
                                                console.error('Error recargando datos:', error);
                                            }
                                        }}
                                        onNominaCancelada={async () => {
                                            // Recargar datos después de cancelar nómina
                                            try {
                                                const [kpisResult, transactionsResult, porPagarResult] = await Promise.all([
                                                    obtenerKPIsFinancieros(studioSlug, currentMonth!),
                                                    obtenerMovimientos(studioSlug, currentMonth!),
                                                    obtenerPorPagar(studioSlug),
                                                ]);
                                                if (kpisResult.success) {
                                                    setKpis(kpisResult.data);
                                                }
                                                if (transactionsResult.success && transactionsResult.data) {
                                                    setTransactions(transactionsResult.data);
                                                }
                                                if (porPagarResult.success && porPagarResult.data) {
                                                    setPorPagar(porPagarResult.data);
                                                }
                                            } catch (error) {
                                                console.error('Error recargando datos:', error);
                                            }
                                        }}
                                        onGastoEditado={async () => {
                                            // Recargar datos después de editar gasto
                                            try {
                                                const [kpisResult, transactionsResult] = await Promise.all([
                                                    obtenerKPIsFinancieros(studioSlug, currentMonth!),
                                                    obtenerMovimientos(studioSlug, currentMonth!),
                                                ]);
                                                if (kpisResult.success) {
                                                    setKpis(kpisResult.data);
                                                }
                                                if (transactionsResult.success && transactionsResult.data) {
                                                    setTransactions(transactionsResult.data);
                                                }
                                            } catch (error) {
                                                console.error('Error recargando datos:', error);
                                            }
                                        }}
                                        onCancelarPago={async (id) => {
                                            try {
                                                const { cancelarPago } = await import('@/lib/actions/studio/business/events/payments.actions');
                                                const result = await cancelarPago(studioSlug, id);

                                                if (!result.success) {
                                                    console.error('Error cancelando pago:', result.error);
                                                    return;
                                                }

                                                // Recargar datos después de cancelar
                                                const [kpisResult, transactionsResult, porCobrarResult] = await Promise.all([
                                                    obtenerKPIsFinancieros(studioSlug, currentMonth!),
                                                    obtenerMovimientos(studioSlug, currentMonth!),
                                                    obtenerPorCobrar(studioSlug),
                                                ]);
                                                if (kpisResult.success) {
                                                    setKpis(kpisResult.data);
                                                }
                                                if (transactionsResult.success && transactionsResult.data) {
                                                    setTransactions(transactionsResult.data);
                                                }
                                                if (porCobrarResult.success && porCobrarResult.data) {
                                                    setPorCobrar(porCobrarResult.data);
                                                }
                                            } catch (error) {
                                                console.error('Error cancelando pago:', error);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Columna 2: Por Cobrar y Por Pagar */}
                                <div className="lg:col-span-1 flex flex-col gap-6 min-h-0 overflow-hidden">
                                    <div className="flex-1 min-h-0">
                                        <PorCobrarCard
                                            porCobrar={porCobrar}
                                            studioSlug={studioSlug}
                                            onRegistrarPago={handleRegistrarPago}
                                            onPagoRegistrado={async () => {
                                                // Recargar datos después de registrar pago
                                                try {
                                                    const [kpisResult, transactionsResult, porCobrarResult] = await Promise.all([
                                                        obtenerKPIsFinancieros(studioSlug, currentMonth!),
                                                        obtenerMovimientos(studioSlug, currentMonth!),
                                                        obtenerPorCobrar(studioSlug),
                                                    ]);
                                                    if (kpisResult.success) {
                                                        setKpis(kpisResult.data);
                                                    }
                                                    if (transactionsResult.success && transactionsResult.data) {
                                                        setTransactions(transactionsResult.data);
                                                    }
                                                    if (porCobrarResult.success && porCobrarResult.data) {
                                                        setPorCobrar(porCobrarResult.data);
                                                    }
                                                } catch (error) {
                                                    console.error('Error recargando datos:', error);
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <PorPagarCard
                                            porPagar={porPagar}
                                            studioSlug={studioSlug}
                                            onMarcarPagado={handleMarcarPagado}
                                            onPagoConfirmado={async () => {
                                                // Forzar refresh del router para invalidar cache
                                                router.refresh();

                                                // Recargar datos después de confirmar pago
                                                try {
                                                    // Pequeño delay para asegurar que la transacción se complete
                                                    await new Promise(resolve => setTimeout(resolve, 200));

                                                    const [kpisResult, transactionsResult, porPagarResult] = await Promise.all([
                                                        obtenerKPIsFinancieros(studioSlug, currentMonth!),
                                                        obtenerMovimientos(studioSlug, currentMonth!),
                                                        obtenerPorPagar(studioSlug),
                                                    ]);
                                                    if (kpisResult.success) {
                                                        setKpis(kpisResult.data);
                                                    }
                                                    if (transactionsResult.success && transactionsResult.data) {
                                                        setTransactions(transactionsResult.data);
                                                    }
                                                    if (porPagarResult.success && porPagarResult.data) {
                                                        setPorPagar(porPagarResult.data);
                                                    }
                                                } catch (error) {
                                                    console.error('Error recargando datos:', error);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Columna 3: Gastos Recurrentes */}
                                <div className="lg:col-span-1 flex flex-col min-h-0">
                                    <GastosRecurrentesCard
                                        expenses={recurringExpenses}
                                        studioSlug={studioSlug}
                                        onAddExpense={handleAddExpense}
                                        onEditExpense={handleEditExpense}
                                        onGastoRegistrado={async () => {
                                            // Recargar gastos recurrentes después de registrar
                                            try {
                                                const expensesResult = await obtenerGastosRecurrentes(studioSlug, currentMonth);
                                                if (expensesResult.success && expensesResult.data) {
                                                    setRecurringExpenses(expensesResult.data);
                                                }
                                            } catch (error) {
                                                console.error('Error recargando gastos recurrentes:', error);
                                            }
                                        }}
                                        onGastoPagado={async () => {
                                            // Recargar datos después de pagar gasto recurrente
                                            try {
                                                const [kpisResult, transactionsResult, expensesResult] = await Promise.all([
                                                    obtenerKPIsFinancieros(studioSlug, currentMonth!),
                                                    obtenerMovimientos(studioSlug, currentMonth!),
                                                    obtenerGastosRecurrentes(studioSlug, currentMonth),
                                                ]);
                                                if (kpisResult.success) {
                                                    setKpis(kpisResult.data);
                                                }
                                                if (transactionsResult.success && transactionsResult.data) {
                                                    setTransactions(transactionsResult.data);
                                                }
                                                if (expensesResult.success && expensesResult.data) {
                                                    setRecurringExpenses(expensesResult.data);
                                                }
                                            } catch (error) {
                                                console.error('Error recargando datos:', error);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </ZenCardContent>
            </ZenCard>

            <HistorialSheet
                open={historialOpen}
                onOpenChange={setHistorialOpen}
                studioSlug={studioSlug}
            />
        </div>
    );
}

