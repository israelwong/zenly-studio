'use client';

import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Building } from 'lucide-react';
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Ingreso Mensual */}
            <ZenCard variant="default" padding="md">
                <ZenCardContent className="p-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-zinc-400 mb-1">Ingreso Mensual</p>
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
                            <p className="text-sm text-zinc-400 mb-1">Egreso Mensual</p>
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
                            <p className="text-sm text-zinc-400 mb-1">Balance del Mes</p>
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
        </div>
    );
}
