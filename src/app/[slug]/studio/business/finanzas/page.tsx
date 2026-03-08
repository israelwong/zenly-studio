'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DollarSign, ChevronLeft, ChevronRight, History, ShieldAlert, Calendar, XCircle } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar } from '@/components/ui/zen';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { FinanceKPIs } from './components/FinanceKPIs';
import { MovimientosCard } from './components/MovimientosCard';
import { PorCobrarCard } from './components/PorCobrarCard';
import { PorPagarCard } from './components/PorPagarCard';
import { RecurrentesSheet } from './components/RecurrentesSheet';
import { RecurrentePagoDetalleSheet } from './components/RecurrentePagoDetalleSheet';
import { RegistrarGastoRecurrenteModal } from './components/RegistrarGastoRecurrenteModal';
import { HistorialSheet } from './components/HistorialSheet';
import { AuditoriaIntegridadSheet } from './components/AuditoriaIntegridadSheet';
import {
    obtenerKPIsFinancieros,
    obtenerMovimientos,
    obtenerPorCobrar,
    obtenerPorPagar,
    obtenerGastosRecurrentes,
    obtenerRentabilidadPorEvento,
    verificarRolOwnerOAdmin,
    type PorPagarPersonal,
    type RentabilidadPorEvento,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';

export default function FinanzasPage() {
    const params = useParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
    const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);
    const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
    const [rangePopoverOpen, setRangePopoverOpen] = useState(false);
    const [tempRange, setTempRange] = useState<DateRange | undefined>(undefined);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({
        ingresos: 0,
        egresos: 0,
        utilidad: 0,
        porCobrar: 0,
        porPagar: 0,
        ingresosPorCancelacion: undefined as number | undefined,
        efectivo: 0,
        bancos: 0,
        totalProductionCosts: undefined as number | undefined,
        totalOperatingExpenses: undefined as number | undefined,
        netProfitability: undefined as number | undefined,
    });
    const [isOwner, setIsOwner] = useState(false);
    const [rentabilidadPorEvento, setRentabilidadPorEvento] = useState<RentabilidadPorEvento[]>([]);
    const [transactions, setTransactions] = useState<Array<{
        id: string;
        fecha: Date;
        fuente: 'evento' | 'staff' | 'operativo';
        concepto: string;
        categoria: string;
        monto: number;
        promiseId?: string;
        cotizacionId?: string;
        paymentStatus?: string;
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
    const [auditoriaOpen, setAuditoriaOpen] = useState(false);
    const [recurrentesSheetOpen, setRecurrentesSheetOpen] = useState(false);
    const [recurrenteDetalle, setRecurrenteDetalle] = useState<{ id: string; name: string; amount: number } | null>(null);
    const [showNuevoRecurrenteModal, setShowNuevoRecurrenteModal] = useState(false);

    useEffect(() => {
        document.title = 'Zenly Studio - Finanzas';
    }, []);

    useEffect(() => {
        setMounted(true);
        setCurrentMonth(new Date());
    }, []);

    useEffect(() => {
        if (!mounted || !currentMonth) return;

        const month = customRange ? customRange.from : currentMonth;
        const options = customRange ? { fromDate: customRange.from, toDate: customRange.to } : undefined;

        const loadData = async () => {
            try {
                setLoading(true);

                const roleResult = await verificarRolOwnerOAdmin(studioSlug);
                setIsOwner(roleResult.success && roleResult.isOwner);

                const [kpisResult, transactionsResult, porCobrarResult, porPagarResult, expensesResult] =
                    await Promise.all([
                        obtenerKPIsFinancieros(studioSlug, month, options),
                        obtenerMovimientos(studioSlug, month, options),
                        obtenerPorCobrar(studioSlug),
                        obtenerPorPagar(studioSlug),
                        obtenerGastosRecurrentes(studioSlug, currentMonth, options),
                    ]);

                if (roleResult.success && roleResult.isOwner) {
                    const rentabilidadResult = await obtenerRentabilidadPorEvento(studioSlug, month, options);
                    if (rentabilidadResult.success && rentabilidadResult.data) {
                        setRentabilidadPorEvento(rentabilidadResult.data);
                    }
                }

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
    }, [mounted, currentMonth, customRange, studioSlug]);

    const refetchData = useCallback(async () => {
        if (!currentMonth) return;
        const month = customRange ? customRange.from : currentMonth;
        const options = customRange ? { fromDate: customRange.from, toDate: customRange.to } : undefined;
        try {
            const [kpisResult, transactionsResult, porCobrarResult, porPagarResult, expensesResult] =
                await Promise.all([
                    obtenerKPIsFinancieros(studioSlug, month, options),
                    obtenerMovimientos(studioSlug, month, options),
                    obtenerPorCobrar(studioSlug),
                    obtenerPorPagar(studioSlug),
                    obtenerGastosRecurrentes(studioSlug, currentMonth, options),
                ]);
            if (kpisResult.success) setKpis(kpisResult.data);
            if (transactionsResult.success && transactionsResult.data) setTransactions(transactionsResult.data);
            if (porCobrarResult.success && porCobrarResult.data) setPorCobrar(porCobrarResult.data);
            if (porPagarResult.success && porPagarResult.data) setPorPagar(porPagarResult.data);
            if (expensesResult.success && expensesResult.data) setRecurringExpenses(expensesResult.data);
            if (isOwner) {
                const rentabilidadResult = await obtenerRentabilidadPorEvento(studioSlug, month, options);
                if (rentabilidadResult.success && rentabilidadResult.data) setRentabilidadPorEvento(rentabilidadResult.data);
            }
        } catch (error) {
            console.error('Error recargando datos:', error);
        }
    }, [currentMonth, customRange, studioSlug, isOwner]);

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
                                {customRange ? (
                                    <>
                                        <div className="flex items-center gap-1 px-2 py-1 min-w-0">
                                            <span className="text-sm font-semibold text-zinc-200 truncate">
                                                {format(customRange.from, 'dd MMM yyyy', { locale: es })} – {format(customRange.to, 'dd MMM yyyy', { locale: es })}
                                            </span>
                                            <ZenButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setCustomRange(null);
                                                    setCurrentMonth(new Date());
                                                }}
                                                aria-label="Quitar rango"
                                                className="h-7 w-7 p-0 shrink-0"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </ZenButton>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-0 rounded-md border border-emerald-500/60 bg-emerald-950/50 overflow-hidden">
                                            <ZenButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const newDate = new Date(currentMonth);
                                                    newDate.setMonth(newDate.getMonth() - 1);
                                                    setCurrentMonth(newDate);
                                                }}
                                                aria-label="Mes anterior"
                                                className="h-7 w-7 p-0 text-emerald-200 hover:text-emerald-100 bg-transparent"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </ZenButton>
                                            <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 min-w-[140px] text-center text-emerald-100 hover:bg-emerald-900/40 transition-colors"
                                                    >
                                                        <span className="text-sm font-semibold capitalize">
                                                            {currentMonth.toLocaleDateString('es-ES', {
                                                                month: 'long',
                                                                year: 'numeric',
                                                            }).replace(' de ', ' ')}
                                                        </span>
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-4 bg-zinc-900 border-zinc-800" align="center">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="grid grid-cols-3 gap-1 text-sm">
                                                            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
                                                                <ZenButton
                                                                    key={m}
                                                                    variant={currentMonth.getMonth() === i ? 'default' : 'ghost'}
                                                                    size="sm"
                                                                    className="h-8"
                                                                    onClick={() => {
                                                                        const d = new Date(currentMonth);
                                                                        d.setMonth(i);
                                                                        setCurrentMonth(d);
                                                                        setMonthPopoverOpen(false);
                                                                    }}
                                                                >
                                                                    {m}
                                                                </ZenButton>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center justify-center gap-1 border-t border-zinc-800 pt-2">
                                                            <ZenButton
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const d = new Date(currentMonth);
                                                                     d.setFullYear(d.getFullYear() - 1);
                                                                    setCurrentMonth(d);
                                                                }}
                                                            >
                                                                -
                                                            </ZenButton>
                                                            <span className="text-sm font-medium text-zinc-200 min-w-[4rem] text-center">
                                                                {currentMonth.getFullYear()}
                                                            </span>
                                                            <ZenButton
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const d = new Date(currentMonth);
                                                                     d.setFullYear(d.getFullYear() + 1);
                                                                    setCurrentMonth(d);
                                                                }}
                                                            >
                                                                +
                                                            </ZenButton>
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <ZenButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const newDate = new Date(currentMonth);
                                                    newDate.setMonth(newDate.getMonth() + 1);
                                                    setCurrentMonth(newDate);
                                                }}
                                                aria-label="Mes siguiente"
                                                className="h-7 w-7 p-0 text-emerald-200 hover:text-emerald-100 bg-transparent"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </ZenButton>
                                        </div>
                                        <Popover open={rangePopoverOpen} onOpenChange={(open) => {
                                            setRangePopoverOpen(open);
                                            if (!open) setTempRange(undefined);
                                        }}>
                                            <PopoverTrigger asChild>
                                                <ZenButton variant="outline" size="sm" icon={Calendar} iconPosition="left">
                                                    Definir Rango
                                                </ZenButton>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-4 bg-zinc-900 border-zinc-800" align="end">
                                                <ZenCalendar
                                                    mode="range"
                                                    defaultMonth={tempRange?.from ?? currentMonth}
                                                    selected={tempRange}
                                                    onSelect={setTempRange}
                                                    locale={es}
                                                    numberOfMonths={2}
                                                />
                                                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-zinc-800">
                                                    <ZenButton variant="ghost" size="sm" onClick={() => setRangePopoverOpen(false)}>
                                                        Cancelar
                                                    </ZenButton>
                                                    <ZenButton
                                                        size="sm"
                                                        onClick={() => {
                                                            if (tempRange?.from && tempRange?.to) {
                                                                setCustomRange({ from: tempRange.from, to: tempRange.to });
                                                                setRangePopoverOpen(false);
                                                                setTempRange(undefined);
                                                            }
                                                        }}
                                                        disabled={!tempRange?.from || !tempRange?.to}
                                                    >
                                                        Aplicar
                                                    </ZenButton>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </>
                                )}
                                <ZenButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAuditoriaOpen(true)}
                                    icon={ShieldAlert}
                                    iconPosition="left"
                                >
                                    Auditoría de Integridad
                                </ZenButton>
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

                                {/* Columna 2: Por Pagar (urgencia/solvencia) */}
                                <div className="lg:col-span-1 flex flex-col min-h-0">
                                    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg h-full flex flex-col">
                                        <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
                                            <div className="h-4 bg-zinc-700/50 rounded w-24 animate-pulse" />
                                            <div className="h-7 w-7 bg-zinc-700/50 rounded animate-pulse" />
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

                                {/* Columna 3: Por Cobrar (futuro/proyección) */}
                                <div className="lg:col-span-1 flex flex-col min-h-0">
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
                                    ingresosPorCancelacion={kpis.ingresosPorCancelacion}
                                    efectivo={kpis.efectivo}
                                    bancos={kpis.bancos}
                                    totalProductionCosts={kpis.totalProductionCosts}
                                    totalOperatingExpenses={kpis.totalOperatingExpenses}
                                    netProfitability={kpis.netProfitability}
                                    isOwner={isOwner}
                                    rentabilidadPorEvento={isOwner ? rentabilidadPorEvento : []}
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
                                        onMovimientoRegistrado={refetchData}
                                        onGastoEliminado={refetchData}
                                        onNominaCancelada={refetchData}
                                        onGastoEditado={refetchData}
                                        onCancelarPago={async (id) => {
                                            try {
                                                const { cancelarPago } = await import('@/lib/actions/studio/business/events/payments.actions');
                                                const result = await cancelarPago(studioSlug, id);
                                                if (!result.success) {
                                                    console.error('Error cancelando pago:', result.error);
                                                    return;
                                                }
                                                await refetchData();
                                            } catch (error) {
                                                console.error('Error cancelando pago:', error);
                                            }
                                        }}
                                    />
                                </div>

                                {/* Columna 2: Por Pagar (urgencia/solvencia) + Recurrentes */}
                                <div className="lg:col-span-1 flex flex-col min-h-0">
                                    <PorPagarCard
                                        porPagar={porPagar}
                                        studioSlug={studioSlug}
                                        onMarcarPagado={handleMarcarPagado}
                                        onPagoConfirmado={async () => {
                                            router.refresh();
                                            await new Promise((r) => setTimeout(r, 200));
                                            await refetchData();
                                        }}
                                        recurringExpenses={recurringExpenses}
                                        onOpenRecurrentes={() => setRecurrentesSheetOpen(true)}
                                        onOpenNuevoRecurrente={() => setShowNuevoRecurrenteModal(true)}
                                        onOpenRecurrenteDetalle={(exp) => setRecurrenteDetalle(exp)}
                                    />
                                    {recurrenteDetalle && (
                                        <RecurrentePagoDetalleSheet
                                            isOpen={!!recurrenteDetalle}
                                            onClose={() => setRecurrenteDetalle(null)}
                                            expenseId={recurrenteDetalle.id}
                                            expenseName={recurrenteDetalle.name}
                                            expenseAmount={recurrenteDetalle.amount}
                                            studioSlug={studioSlug}
                                            onPagoConfirmado={async () => {
                                                setRecurrenteDetalle(null);
                                                await refetchData();
                                            }}
                                        />
                                    )}
                                    <RegistrarGastoRecurrenteModal
                                        isOpen={showNuevoRecurrenteModal}
                                        onClose={() => setShowNuevoRecurrenteModal(false)}
                                        studioSlug={studioSlug}
                                        onSuccess={async () => {
                                            setShowNuevoRecurrenteModal(false);
                                            await refetchData();
                                        }}
                                    />
                                    <RecurrentesSheet
                                        open={recurrentesSheetOpen}
                                        onOpenChange={setRecurrentesSheetOpen}
                                        expenses={recurringExpenses}
                                        studioSlug={studioSlug}
                                        onGastoRegistrado={refetchData}
                                        onGastoPagado={refetchData}
                                    />
                                </div>

                                {/* Columna 3: Por Cobrar (futuro/proyección) */}
                                <div className="lg:col-span-1 flex flex-col min-h-0">
                                    <PorCobrarCard
                                        porCobrar={porCobrar}
                                        studioSlug={studioSlug}
                                        onRegistrarPago={handleRegistrarPago}
                                        onPagoRegistrado={refetchData}
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
            <AuditoriaIntegridadSheet
                open={auditoriaOpen}
                onOpenChange={setAuditoriaOpen}
                studioSlug={studioSlug}
            />
        </div>
    );
}

