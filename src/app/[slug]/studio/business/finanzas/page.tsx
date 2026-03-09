'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DollarSign, ChevronLeft, ChevronRight, Calendar, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { ZenCalendar } from '@/components/ui/zen';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { FinanceKPIs } from './components/FinanceKPIs';
import { MovimientosCard } from './components/MovimientosCard';
import { PorCobrarCard } from './components/PorCobrarCard';
import { PorPagarCard } from './components/PorPagarCard';
import { RecurrentePagoDetalleSheet } from './components/RecurrentePagoDetalleSheet';
import { RegistrarGastoRecurrenteModal } from './components/RegistrarGastoRecurrenteModal';
import { PagarTarjetaModal } from './components/PagarTarjetaModal';
import { SaldoInicialModal } from './components/SaldoInicialModal';
import { AuditoriaIntegridadSheet } from './components/AuditoriaIntegridadSheet';
import { ToolbarFinanzas } from './components/ToolbarFinanzas';
import { useHistorialSheet } from '@/app/[slug]/studio/components/context/HistorialSheetContext';
import { toast } from 'sonner';
import {
    obtenerKPIsFinancieros,
    obtenerMovimientos,
    obtenerPorCobrar,
    obtenerPorPagar,
    obtenerGastosRecurrentes,
    obtenerRentabilidadPorEvento,
    obtenerRentabilidadHistoricaMeses,
    obtenerRentabilidadPorTipoEvento,
    verificarRolOwnerOAdmin,
    type PorPagarPersonal,
    type RentabilidadPorEvento,
    type RentabilidadHistoricaMes,
    type RentabilidadPorTipoEventoItem,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';

export default function FinanzasPage() {
    const params = useParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
    const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);
    const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
    const [rangePopoverOpen, setRangePopoverOpen] = useState(false);
    const [showComoFuncionaModal, setShowComoFuncionaModal] = useState(false);
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
        flujoCajaTotal: 0,
        flujoCajaEfectivo: 0,
        flujoCajaBancos: 0,
        deudaTarjetas: undefined as number | undefined,
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
    const [auditoriaOpen, setAuditoriaOpen] = useState(false);
    const [finanzasTab, setFinanzasTab] = useState<'resumen' | 'rentabilidad'>('resumen');
    const [rentabilidadHistorica, setRentabilidadHistorica] = useState<RentabilidadHistoricaMes[]>([]);
    const [rentabilidadPorTipo, setRentabilidadPorTipo] = useState<RentabilidadPorTipoEventoItem[]>([]);
    const [rentabilidadLoading, setRentabilidadLoading] = useState(false);
    const { openHistorial } = useHistorialSheet();
    const [recurrenteDetalle, setRecurrenteDetalle] = useState<{ id: string; name: string; amount: number } | null>(null);
    const [showNuevoRecurrenteModal, setShowNuevoRecurrenteModal] = useState(false);
    const [showPagarTarjetaModal, setShowPagarTarjetaModal] = useState(false);
    const [showSaldoInicialModal, setShowSaldoInicialModal] = useState(false);

    useEffect(() => {
        document.title = 'Zenly Studio - Finanzas';
    }, []);

    useEffect(() => {
        setMounted(true);
        setCurrentMonth(new Date());
    }, []);

    useEffect(() => {
        if (finanzasTab !== 'rentabilidad') return;
        let cancelled = false;
        setRentabilidadLoading(true);
        (async () => {
            const [mesesRes, tipoRes] = await Promise.all([
                obtenerRentabilidadHistoricaMeses(studioSlug),
                obtenerRentabilidadPorTipoEvento(studioSlug),
            ]);
            if (cancelled) return;
            if (mesesRes.success && mesesRes.data) setRentabilidadHistorica(mesesRes.data);
            if (tipoRes.success && tipoRes.data) setRentabilidadPorTipo(tipoRes.data);
            setRentabilidadLoading(false);
        })();
        return () => { cancelled = true; };
    }, [finanzasTab, studioSlug]);

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
        const month = customRange ? customRange.from : (currentMonth ?? new Date());
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
                    <div className="flex flex-col gap-3">
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
                                        <div className="flex items-center gap-0 h-8 rounded-md border border-emerald-500/60 bg-emerald-950/50 overflow-hidden">
                                            <div className="flex items-center gap-1 h-8 px-2 min-w-0">
                                                <span className="text-sm font-semibold text-emerald-400 truncate">
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
                                                    className="h-8 w-8 p-0 shrink-0"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </ZenButton>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-0 h-8 rounded-md border border-emerald-500/60 bg-emerald-950/50 overflow-hidden">
                                            <ZenButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const newDate = new Date(currentMonth);
                                                    newDate.setMonth(newDate.getMonth() - 1);
                                                    setCurrentMonth(newDate);
                                                }}
                                                aria-label="Mes anterior"
                                                className="h-8 w-8 p-0 text-emerald-200 hover:text-emerald-100 bg-transparent shrink-0"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </ZenButton>
                                            <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="h-8 flex items-center justify-center px-2 min-w-[140px] text-center text-sm font-semibold capitalize text-emerald-100 hover:bg-emerald-900/40 transition-colors"
                                                    >
                                                        {currentMonth.toLocaleDateString('es-ES', {
                                                            month: 'long',
                                                            year: 'numeric',
                                                        }).replace(' de ', ' ')}
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
                                                className="h-8 w-8 p-0 text-emerald-200 hover:text-emerald-100 bg-transparent shrink-0"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </ZenButton>
                                        </div>
                                        <Popover open={rangePopoverOpen} onOpenChange={(open) => {
                                            setRangePopoverOpen(open);
                                            if (!open) setTempRange(undefined);
                                        }}>
                                            <PopoverTrigger asChild>
                                                <ZenButton variant="outline" size="sm" className="h-8" icon={Calendar} iconPosition="left">
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
                            </div>
                        )}
                        </div>
                    </div>
                </ZenCardHeader>

                <Dialog open={showComoFuncionaModal} onOpenChange={setShowComoFuncionaModal}>
                    <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-700 text-zinc-200">
                        <DialogHeader>
                            <DialogTitle className="text-zinc-100">Guía rápida: Finanzas</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 text-sm">
                            <section>
                                <h4 className="font-semibold text-zinc-100 mb-1">Ingreso</h4>
                                <p className="text-zinc-400">Dinero que entra al estudio: pagos de clientes (anticipos, abonos), ingresos manuales. Cada ingreso se asigna a un silo: <strong className="text-zinc-300">Efectivo</strong> (caja) o <strong className="text-zinc-300">cuenta bancaria</strong>, y actualiza el saldo en tiempo real.</p>
                            </section>
                            <section>
                                <h4 className="font-semibold text-zinc-100 mb-1">Egreso</h4>
                                <p className="text-zinc-400">Dinero que sale: gastos operativos, nóminas, gastos recurrentes (renta, suscripciones). Al confirmar un pago eliges de dónde sale: <strong className="text-zinc-300">Efectivo</strong>, <strong className="text-zinc-300">Transferencia</strong> (cuenta bancaria) o <strong className="text-zinc-300">Tarjeta de crédito</strong>.</p>
                            </section>
                            <section>
                                <h4 className="font-semibold text-zinc-100 mb-1">Utilidad</h4>
                                <p className="text-zinc-400">Lo que queda después de costos: <strong className="text-zinc-300">Ingresos − Costos − Gastos</strong> de los eventos del periodo. No es lo mismo que el flujo de caja: puedes tener utilidad y poco efectivo (o al revés) según cobros y pagos.</p>
                            </section>
                            <section>
                                <h4 className="font-semibold text-zinc-100 mb-1">Saldos persistidos</h4>
                                <p className="text-zinc-400">El <strong className="text-zinc-300">Flujo de Caja Total</strong> es la suma del dinero real en caja y en cada cuenta bancaria. Cada movimiento actualiza estos saldos de forma atómica. Puedes configurar un <strong className="text-zinc-300">saldo inicial</strong> si ya tenías dinero antes de usar el sistema.</p>
                            </section>
                        </div>
                    </DialogContent>
                </Dialog>

                <ToolbarFinanzas
                    vistaActiva={finanzasTab}
                    onVistaChange={setFinanzasTab}
                    onHistorial={openHistorial}
                    onAuditoria={() => setAuditoriaOpen(true)}
                    onComoFunciona={() => setShowComoFuncionaModal(true)}
                />

                <ZenCardContent className="p-6 flex-1 min-h-0 flex flex-col overflow-hidden">
                    {finanzasTab === 'rentabilidad' ? (
                        <div className="flex flex-col gap-6 h-full overflow-auto">
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Rentabilidad por mes</h3>
                                {rentabilidadLoading ? (
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 animate-pulse h-64" />
                                ) : (
                                    <div className="rounded-lg border border-zinc-800 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-zinc-800 bg-zinc-800/50">
                                                    <th className="text-left py-3 px-4 font-medium text-zinc-300">Mes</th>
                                                    <th className="text-right py-3 px-4 font-medium text-zinc-300">Ingresos</th>
                                                    <th className="text-right py-3 px-4 font-medium text-zinc-300">Egresos</th>
                                                    <th className="text-right py-3 px-4 font-medium text-zinc-300">Rentabilidad neta</th>
                                                    <th className="text-right py-3 px-4 font-medium text-zinc-300">Tendencia</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rentabilidadHistorica.map((row, idx) => {
                                                    const prev = idx > 0 ? rentabilidadHistorica[idx - 1].rentabilidadNeta : null;
                                                    const changePct = prev !== null && prev !== 0
                                                        ? ((row.rentabilidadNeta - prev) / Math.abs(prev)) * 100
                                                        : null;
                                                    return (
                                                        <tr key={`${row.year}-${row.month}`} className="border-b border-zinc-800/80 hover:bg-zinc-800/30">
                                                            <td className="py-2.5 px-4 text-zinc-200">{row.monthLabel}</td>
                                                            <td className="py-2.5 px-4 text-right text-emerald-400">
                                                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.totalIngresos)}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-right text-red-400">
                                                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.totalEgresos)}
                                                            </td>
                                                            <td className={`py-2.5 px-4 text-right font-medium ${row.rentabilidadNeta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.rentabilidadNeta)}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-right">
                                                                {changePct !== null ? (
                                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${changePct >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                        {changePct >= 0 ? <TrendingUp size={14} className="shrink-0" /> : <TrendingDown size={14} className="shrink-0" />}
                                                                        {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-zinc-500 text-xs">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Rentabilidad por tipo de evento</h3>
                                {rentabilidadLoading ? (
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 animate-pulse h-40" />
                                ) : (
                                    (() => {
                                        const totalPagos = rentabilidadPorTipo.reduce((s, r) => s + r.cantidadPagos, 0);
                                        const totalIngresosGlobal = rentabilidadPorTipo.reduce((s, r) => s + r.totalIngresos, 0);
                                        const ticketPromedioGlobal = totalPagos > 0 ? totalIngresosGlobal / totalPagos : 0;
                                        return (
                                            <div className="rounded-lg border border-zinc-800 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-zinc-800 bg-zinc-800/50">
                                                            <th className="text-left py-3 px-4 font-medium text-zinc-300">Tipo de evento</th>
                                                            <th className="text-right py-3 px-4 font-medium text-zinc-300">Total ingresos</th>
                                                            <th className="text-right py-3 px-4 font-medium text-zinc-300">Pagos</th>
                                                            <th className="text-right py-3 px-4 font-medium text-zinc-300">Ticket Promedio</th>
                                                            <th className="text-right py-3 px-4 font-medium text-zinc-300">Margen %</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rentabilidadPorTipo.map((row) => {
                                                            const ticketPromedio = row.cantidadPagos > 0 ? row.totalIngresos / row.cantidadPagos : 0;
                                                            const esEstrella = ticketPromedioGlobal > 0 && ticketPromedio > ticketPromedioGlobal;
                                                            return (
                                                                <tr key={row.eventTypeId} className="border-b border-zinc-800/80 hover:bg-zinc-800/30">
                                                                    <td className="py-2.5 px-4 text-zinc-200">{row.eventTypeName}</td>
                                                                    <td className="py-2.5 px-4 text-right text-emerald-400">
                                                                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.totalIngresos)}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-right text-zinc-400">{row.cantidadPagos}</td>
                                                                    <td className="py-2.5 px-4 text-right text-zinc-300">
                                                                        <span className="inline-flex items-center gap-1 justify-end">
                                                                            {row.cantidadPagos > 0
                                                                                ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(ticketPromedio)
                                                                                : '—'}
                                                                            {esEstrella && <TrendingUp size={14} className="shrink-0 text-emerald-400" aria-label="Producto estrella" />}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-right text-zinc-500">—</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    ) : loading ? (
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
                                    balanceLabel={customRange ? 'Balance del periodo' : `Balance de ${currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`}
                                    ingresos={kpis.ingresos}
                                    egresos={kpis.egresos}
                                    utilidad={kpis.utilidad}
                                    porCobrar={kpis.porCobrar}
                                    porPagar={kpis.porPagar}
                                    ingresosPorCancelacion={kpis.ingresosPorCancelacion}
                                    efectivo={kpis.efectivo}
                                    bancos={kpis.bancos}
                                    flujoCajaTotal={kpis.flujoCajaTotal}
                                    flujoCajaEfectivo={kpis.flujoCajaEfectivo}
                                    flujoCajaBancos={kpis.flujoCajaBancos}
                                    deudaTarjetas={kpis.deudaTarjetas}
                                    onPagarTarjeta={() => setShowPagarTarjetaModal(true)}
                                    onConfigurarSaldoInicial={() => setShowSaldoInicialModal(true)}
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
                                        onDevolucionConfirmada={refetchData}
                                        onCancelarPago={async (id) => {
                                            try {
                                                const { cancelarPago } = await import('@/lib/actions/studio/business/events/payments.actions');
                                                const result = await cancelarPago(studioSlug, id);
                                                if (!result.success) {
                                                    toast.error(result.error ?? 'Error al revertir pago');
                                                    return;
                                                }
                                                toast.success('Pago revertido. El monto volvió a Por cobrar.');
                                                await refetchData();
                                            } catch (error) {
                                                console.error('Error cancelando pago:', error);
                                                toast.error('Error al revertir pago');
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
                                        onOpenRecurrentes={() => window.dispatchEvent(new CustomEvent('open-gastos-recurrentes-modal'))}
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
                                    <PagarTarjetaModal
                                        isOpen={showPagarTarjetaModal}
                                        onClose={() => setShowPagarTarjetaModal(false)}
                                        studioSlug={studioSlug}
                                        onSuccess={refetchData}
                                    />
                                    <SaldoInicialModal
                                        isOpen={showSaldoInicialModal}
                                        onClose={() => setShowSaldoInicialModal(false)}
                                        studioSlug={studioSlug}
                                        onSuccess={refetchData}
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
                    ) }
                </ZenCardContent>
            </ZenCard>

            <AuditoriaIntegridadSheet
                open={auditoriaOpen}
                onOpenChange={setAuditoriaOpen}
                studioSlug={studioSlug}
            />
        </div>
    );
}

