'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DollarSign } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/shadcn/tabs';
import { FinanceHeader } from './components/FinanceHeader';
import { FinanceKPIs } from './components/FinanceKPIs';
import { TransactionsTable } from './components/TransactionsTable';
import { PendingSplitView } from './components/PendingSplitView';
import { RecurringExpensesGrid } from './components/RecurringExpensesGrid';
import {
    obtenerKPIsFinancieros,
    obtenerMovimientos,
    obtenerPorCobrar,
    obtenerPorPagar,
    obtenerGastosRecurrentes,
    type FinanceKPIsDebug,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';

export default function FinanzasPage() {
    const params = useParams();
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
    const [debugInfo, setDebugInfo] = useState<FinanceKPIsDebug | null>(null);
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
    }>>([]);
    const [porPagar, setPorPagar] = useState<Array<{
        id: string;
        concepto: string;
        monto: number;
        fecha: Date;
    }>>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<Array<{
        id: string;
        name: string;
        amount: number;
        category: string;
        chargeDay: number;
        isActive: boolean;
    }>>([]);

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
                        obtenerGastosRecurrentes(studioSlug),
                    ]);

                if (kpisResult.success) {
                    setKpis(kpisResult.data);
                    if (kpisResult.debug) {
                        setDebugInfo(kpisResult.debug);
                    }
                } else if (!kpisResult.success) {
                    console.error('[FINANZAS UI] Error en KPIs:', kpisResult.error);
                }
                if (transactionsResult.success && transactionsResult.data) {
                    setTransactions(transactionsResult.data);
                }
                if (porCobrarResult.success && porCobrarResult.data) {
                    setPorCobrar(porCobrarResult.data);
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
            <div className="space-y-8">
                <ZenCard variant="default" padding="none">
                    <ZenCardHeader className="border-b border-zinc-800">
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
                    </ZenCardHeader>
                    <ZenCardContent className="p-6">
                        <div className="h-96 bg-zinc-900/50 rounded-lg animate-pulse" />
                    </ZenCardContent>
                </ZenCard>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
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
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <div className="space-y-6">
                        <FinanceHeader
                            currentMonth={currentMonth}
                            onMonthChange={(date) => setCurrentMonth(date)}
                            onRegistrarGasto={handleRegistrarGasto}
                            onRegistrarIngreso={handleRegistrarIngreso}
                        />

                        {loading ? (
                            <div className="h-96 bg-zinc-900/50 rounded-lg animate-pulse" />
                        ) : (
                            <>
                                <FinanceKPIs
                                    ingresos={kpis.ingresos}
                                    egresos={kpis.egresos}
                                    utilidad={kpis.utilidad}
                                    porCobrar={kpis.porCobrar}
                                    porPagar={kpis.porPagar}
                                />

                                {/* Debug temporal - remover después */}
                                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono">
                                    <p className="text-zinc-400 mb-2 font-bold">🔍 Debug Info:</p>
                                    <div className="space-y-1 text-zinc-300">
                                        <p>Por Cobrar: <span className="text-emerald-400">{kpis.porCobrar.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span></p>
                                        <p>Por Pagar: <span className="text-rose-400">{kpis.porPagar.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</span></p>
                                        <p>Ingresos: {kpis.ingresos.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
                                        <p>Egresos: {kpis.egresos.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
                                        {debugInfo && (
                                            <>
                                                <p className="mt-2 text-zinc-500">Promesas encontradas: {debugInfo.promesasEncontradas}</p>
                                                <p className="text-zinc-500">Cotizaciones encontradas: {debugInfo.cotizacionesEncontradas}</p>
                                                <p className="text-zinc-500">Total cotizaciones: {debugInfo.totalCotizaciones?.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
                                                <p className="text-zinc-500">Total pagos: {debugInfo.totalPagos?.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <Tabs defaultValue="movimientos" className="w-full">
                                    <TabsList className="bg-zinc-900 border border-zinc-800">
                                        <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
                                        <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
                                        <TabsTrigger value="gastos-fijos">Gastos Fijos</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="movimientos" className="mt-6">
                                        <TransactionsTable transactions={transactions} />
                                    </TabsContent>

                                    <TabsContent value="pendientes" className="mt-6">
                                        <PendingSplitView
                                            porCobrar={porCobrar}
                                            porPagar={porPagar}
                                            onRegistrarPago={handleRegistrarPago}
                                            onMarcarPagado={handleMarcarPagado}
                                        />
                                    </TabsContent>

                                    <TabsContent value="gastos-fijos" className="mt-6">
                                        <RecurringExpensesGrid
                                            expenses={recurringExpenses}
                                            onAddExpense={handleAddExpense}
                                            onEditExpense={handleEditExpense}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </>
                        )}
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}

