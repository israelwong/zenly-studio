'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Building2, Banknote, DollarSign, BarChart3, Info, CreditCard } from 'lucide-react';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { cn } from '@/lib/utils';
import type { RentabilidadPorEvento } from '@/lib/actions/studio/business/finanzas/finanzas.actions';

interface FinanceKPIsProps {
    /** Título del balance: "Balance de marzo de 2026" o "Balance del periodo" según filtro */
    balanceLabel?: string;
    ingresos: number;
    egresos: number;
    utilidad: number;
    porCobrar: number;
    porPagar: number;
    /** Ingresos por cancelación (retained_by_cancellation) — desglose visual dentro del total */
    ingresosPorCancelacion?: number;
    /** Disponibilidad del mes: efectivo (caja) y bancos por método de pago (desglose) */
    efectivo?: number;
    bancos?: number;
    /** Flujo de caja total: saldos persistidos en caja + cuentas bancarias (dinero real en cuenta) */
    flujoCajaTotal?: number;
    /** Saldo en caja (efectivo) para badges. */
    flujoCajaEfectivo?: number;
    /** Saldo en bancos para badges. */
    flujoCajaBancos?: number;
    /** Deuda total en tarjetas de crédito (suma de saldos negativos) */
    deudaTarjetas?: number;
    /** Callback para abrir modal Pagar Tarjeta */
    onPagarTarjeta?: () => void;
    /** Callback para abrir modal Configurar saldo inicial */
    onConfigurarSaldoInicial?: () => void;
    totalProductionCosts?: number;
    totalOperatingExpenses?: number;
    netProfitability?: number;
    isOwner?: boolean;
    rentabilidadPorEvento?: RentabilidadPorEvento[];
}

export function FinanceKPIs({
    balanceLabel,
    ingresos,
    egresos,
    utilidad,
    porCobrar,
    porPagar,
    ingresosPorCancelacion,
    efectivo = 0,
    bancos = 0,
    flujoCajaTotal,
    flujoCajaEfectivo,
    flujoCajaBancos,
    deudaTarjetas,
    onPagarTarjeta,
    onConfigurarSaldoInicial,
    totalProductionCosts,
    totalOperatingExpenses,
    netProfitability,
    isOwner = false,
    rentabilidadPorEvento = [],
}: FinanceKPIsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const costoOperacion = (totalProductionCosts ?? 0) + (totalOperatingExpenses ?? 0);

    const totalDisponible = flujoCajaTotal ?? (efectivo + bancos);
    const defaultBalanceLabel = `Balance de ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
    const labelBalance = balanceLabel ?? defaultBalanceLabel;

    return (
        <div className="space-y-6">
            {/* Fila superior: Balance del Mes + Flujo de Caja Total (equilibrado) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Balance del mes (ingresos - egresos con desglose) */}
                <ZenCard variant="default" padding="md">
                    <ZenCardContent className="p-0">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                    <p className="text-sm text-zinc-400">{labelBalance}</p>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button type="button" className="inline-flex text-zinc-500 hover:text-zinc-400 cursor-help p-0.5 rounded" aria-label="Ayuda">
                                                <Info className="h-3.5 w-3.5 shrink-0" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-72 p-3 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs" align="start">
                                            <p className="font-medium text-zinc-100 mb-1">Balance del periodo</p>
                                            <p className="mb-2">Es el resultado de <strong>Ingresos − Egresos</strong> en el mes o rango seleccionado. Te dice si el estudio ganó o perdió dinero en ese lapso.</p>
                                            <p className="text-zinc-400">Incluye pagos de clientes (ingresos) y gastos, nóminas y recurrentes (egresos) con fecha en el periodo.</p>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <p
                                    className={cn(
                                        'text-2xl font-bold',
                                        utilidad >= 0 ? 'text-emerald-500' : 'text-red-500'
                                    )}
                                >
                                    {formatCurrency(utilidad)}
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-sm text-emerald-400">
                                                <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                                                {formatCurrency(ingresos)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                            Ingresos
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-sm text-red-400">
                                                <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                                                {formatCurrency(egresos)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                            Egresos
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                {ingresosPorCancelacion != null && ingresosPorCancelacion > 0 && (
                                    <p className="text-xs text-amber-400/90 mt-1">
                                        Incl. cancelación: {formatCurrency(ingresosPorCancelacion)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </ZenCardContent>
                </ZenCard>

                {/* 2. Flujo de Caja Total (saldos persistidos: dinero en cuenta) */}
                <ZenCard variant="default" padding="md">
                    <ZenCardContent className="p-0">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                    <p className="text-sm text-zinc-400">Flujo de Caja Total</p>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button type="button" className="inline-flex text-zinc-500 hover:text-zinc-400 cursor-help p-0.5 rounded" aria-label="Ayuda">
                                                <Info className="h-3.5 w-3.5 shrink-0" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-72 p-3 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs" align="start">
                                            <p className="font-medium text-zinc-100 mb-1">Flujo de Caja Total</p>
                                            <p className="mb-2">Es el <strong>dinero real</strong> que tienes disponible: suma del saldo en <strong>caja (efectivo)</strong> y de cada <strong>cuenta bancaria</strong> activa.</p>
                                            <p className="text-zinc-400">No incluye por cobrar ni por pagar; solo el dinero físico en caja y bancos. Cada ingreso o egreso actualiza estos saldos al momento.</p>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <p className="text-2xl font-bold text-zinc-200">
                                    {formatCurrency(totalDisponible)}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Dinero en caja y cuentas bancarias
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-sm text-amber-400">
                                                <Banknote className="h-3.5 w-3.5 shrink-0" />
                                                {formatCurrency(flujoCajaEfectivo ?? 0)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                            Efectivo
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-sm text-blue-400">
                                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                                {formatCurrency(flujoCajaBancos ?? 0)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                            Bancos
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                {onConfigurarSaldoInicial && (
                                    <button
                                        type="button"
                                        onClick={onConfigurarSaldoInicial}
                                        className="mt-2 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                                    >
                                        Configurar saldo inicial
                                    </button>
                                )}
                            </div>
                        </div>
                    </ZenCardContent>
                </ZenCard>

                {/* Deuda en tarjetas (solo si hay deuda): segunda fila */}
                {(deudaTarjetas != null && deudaTarjetas < 0) && (
                    <ZenCard variant="default" padding="md">
                        <ZenCardContent className="p-0">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-zinc-400 mb-1">Deuda en tarjetas de crédito</p>
                                    <p className="text-2xl font-bold text-rose-400">
                                        {formatCurrency(Math.abs(deudaTarjetas))}
                                    </p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-sm text-rose-400">
                                            <CreditCard className="h-3.5 w-3.5 shrink-0" />
                                            Tarjetas de crédito
                                        </span>
                                    </div>
                                    {onPagarTarjeta && (
                                        <button
                                            type="button"
                                            onClick={onPagarTarjeta}
                                            className="mt-3 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                                        >
                                            Pagar tarjeta de crédito
                                        </button>
                                    )}
                                </div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
                )}
            </div>

            {/* Segunda fila: tarjetas solo para owners */}
            {isOwner && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Costo de Operación */}
                    <ZenCard variant="default" padding="md">
                        <ZenCardContent className="p-0">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-zinc-400 mb-1">Costo de Operación</p>
                                    <p className="text-2xl font-bold text-amber-400">
                                        {formatCurrency(costoOperacion)}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Costos + Gastos de producción
                                    </p>
                                </div>
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-amber-400" />
                                </div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>

                    {/* Utilidad Neta (precio servicio vs costos de eventos) */}
                    <ZenCard variant="default" padding="md">
                        <ZenCardContent className="p-0">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-zinc-400 mb-1">Utilidad Neta</p>
                                    <p className={cn(
                                        'text-2xl font-bold',
                                        (netProfitability ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    )}>
                                        {formatCurrency(netProfitability ?? 0)}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Ingresos − Costos − Gastos (eventos del periodo)
                                    </p>
                                </div>
                                <div className={cn(
                                    'p-2 rounded-lg',
                                    (netProfitability ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                                )}>
                                    <BarChart3 className={cn(
                                        'h-5 w-5',
                                        (netProfitability ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    )} />
                                </div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
            </div>
            )}

            {/* Tabla de Rentabilidad por Proyecto (solo para owners) */}
            {isOwner && rentabilidadPorEvento.length > 0 && (
                <div className="mt-6">
                    <ZenCard variant="default" padding="md">
                        <ZenCardContent className="p-0">
                            <div className="p-4 border-b border-zinc-800">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                                    Rentabilidad por Proyecto
                                </h3>
                                <p className="text-sm text-zinc-400 mt-1">
                                    Desglose de costos y utilidades por evento autorizado
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Proyecto</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">Total Vendido</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">Costos</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">Gastos</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">Utilidad</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">Margen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rentabilidadPorEvento.map((evento) => (
                                            <tr
                                                key={evento.eventId}
                                                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-white">
                                                            {evento.eventName}
                                                        </span>
                                                        {evento.eventDate && (
                                                            <span className="text-xs text-zinc-500">
                                                                {evento.eventDate.toLocaleDateString('es-ES', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className="text-sm font-medium text-zinc-200">
                                                        {formatCurrency(evento.totalSold)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className="text-sm text-amber-400">
                                                        {formatCurrency(evento.totalCost)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className="text-sm text-orange-400">
                                                        {formatCurrency(evento.totalExpense)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={cn(
                                                        'text-sm font-semibold',
                                                        evento.estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                    )}>
                                                        {formatCurrency(evento.estimatedProfit)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex justify-end">
                                                        <span className={cn(
                                                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                                            evento.profitMargin >= 0
                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                        )}>
                                                            {evento.profitMargin >= 0 ? '+' : ''}
                                                            {evento.profitMargin.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
                </div>
            )}
        </div>
    );
}
