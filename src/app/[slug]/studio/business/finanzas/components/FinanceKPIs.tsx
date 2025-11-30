'use client';

import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, Building } from 'lucide-react';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

interface FinanceKPIsProps {
    ingresos: number;
    egresos: number;
    utilidad: number;
    porCobrar: number;
    porPagar: number;
}

export function FinanceKPIs({
    ingresos,
    egresos,
    utilidad,
    porCobrar,
    porPagar,
}: FinanceKPIsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const forecastTotal = porCobrar + porPagar;
    const forecastPercentage = forecastTotal > 0
        ? Math.round((porCobrar / forecastTotal) * 100)
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Ingresos Totales */}
            <ZenCard variant="default" padding="md">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-1">Ingresos Totales</p>
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

            {/* Egresos Totales */}
            <ZenCard variant="default" padding="md">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-1">Egresos Totales</p>
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

            {/* Utilidad Operativa */}
            <ZenCard variant="default" padding="md">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-1">Utilidad Operativa</p>
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

            {/* Forecast */}
            <ZenCard variant="default" padding="md">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-1">Forecast</p>
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
                    {forecastTotal > 0 && (
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${forecastPercentage}%` }}
                            />
                        </div>
                    )}
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
