'use client';

import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Building, DollarSign, BarChart3 } from 'lucide-react';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { cn } from '@/lib/utils';
import type { RentabilidadPorEvento } from '@/lib/actions/studio/business/finanzas/finanzas.actions';

interface FinanceKPIsProps {
    ingresos: number;
    egresos: number;
    utilidad: number;
    porCobrar: number;
    porPagar: number;
    totalProductionCosts?: number;
    totalOperatingExpenses?: number;
    netProfitability?: number;
    isOwner?: boolean;
    rentabilidadPorEvento?: RentabilidadPorEvento[];
}

export function FinanceKPIs({
    ingresos,
    egresos,
    utilidad,
    porCobrar,
    porPagar,
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

    return (
        <div className="space-y-6">
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-4",
                isOwner ? "lg:grid-cols-6" : "lg:grid-cols-4"
            )}>
            {/* Ingreso Mensual */}
            <ZenCard variant="default" padding="md">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-1">Ingresos del mes</p>
                            <p className="text-2xl font-bold text-emerald-400">
                                {formatCurrency(ingresos)}
                            </p>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Wallet className="h-5 w-5 text-emerald-400" />
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Egreso Mensual */}
            <ZenCard variant="default" padding="md">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-1">Egresos del mes</p>
                            <p className="text-2xl font-bold text-rose-400">
                                {formatCurrency(egresos)}
                            </p>
                        </div>
                        <div className="p-2 bg-rose-500/10 rounded-lg">
                            <TrendingDown className="h-5 w-5 text-rose-400" />
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Balance del Mes */}
            <ZenCard variant="default" padding="md">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-1">Balance del mes</p>
                            <p
                                className={cn(
                                    'text-2xl font-bold',
                                    utilidad >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                )}
                            >
                                {formatCurrency(utilidad)}
                            </p>
                        </div>
                        <div
                            className={cn(
                                'p-2 rounded-lg',
                                utilidad >= 0
                                    ? 'bg-emerald-500/10'
                                    : 'bg-rose-500/10'
                            )}
                        >
                            <TrendingUp
                                className={cn(
                                    'h-5 w-5',
                                    utilidad >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                )}
                            />
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Proyección Global */}
            <ZenCard variant="default" padding="md">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-1">Proyección Global</p>
                            <p className="text-xs text-zinc-500">
                                Por Cobrar: {formatCurrency(porCobrar)}
                            </p>
                            <p className="text-xs text-zinc-500">
                                Por Pagar: {formatCurrency(porPagar)}
                            </p>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Building className="h-5 w-5 text-blue-400" />
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* ✅ Nuevas tarjetas solo para owners */}
            {isOwner && (
                <>
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

                    {/* Utilidad Real Estimada */}
                    <ZenCard variant="default" padding="md">
                        <ZenCardContent className="p-0">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-zinc-400 mb-1">Utilidad Real Estimada</p>
                                    <p className={cn(
                                        'text-2xl font-bold',
                                        (netProfitability ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    )}>
                                        {formatCurrency(netProfitability ?? 0)}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Ingresos - Costos - Gastos
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
                </>
            )}
            </div>

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
