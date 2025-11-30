'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { Wallet, CreditCard } from 'lucide-react';

interface PendingItem {
    id: string;
    concepto: string;
    monto: number;
    fecha: Date;
}

interface PendingSplitViewProps {
    porCobrar: PendingItem[];
    porPagar: PendingItem[];
    onRegistrarPago: (id: string) => void;
    onMarcarPagado: (id: string) => void;
}

export function PendingSplitView({
    porCobrar,
    porPagar,
    onRegistrarPago,
    onMarcarPagado,
}: PendingSplitViewProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short',
        }).format(date);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por Cobrar */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Wallet className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Por Cobrar</ZenCardTitle>
                            <p className="text-sm text-zinc-400 mt-1">
                                {porCobrar.length} {porCobrar.length === 1 ? 'pendiente' : 'pendientes'}
                            </p>
                        </div>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-4">
                    {porCobrar.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400">
                            <p>No hay cuentas por cobrar</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {porCobrar.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-zinc-200">
                                            {item.concepto}
                                        </p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <p className="text-sm text-emerald-400 font-semibold">
                                                {formatCurrency(item.monto)}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {formatDate(item.fecha)}
                                            </p>
                                        </div>
                                    </div>
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onRegistrarPago(item.id)}
                                    >
                                        Registrar Pago
                                    </ZenButton>
                                </div>
                            ))}
                        </div>
                    )}
                </ZenCardContent>
            </ZenCard>

            {/* Por Pagar */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 rounded-lg">
                            <CreditCard className="h-5 w-5 text-rose-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Por Pagar</ZenCardTitle>
                            <p className="text-sm text-zinc-400 mt-1">
                                {porPagar.length} {porPagar.length === 1 ? 'pendiente' : 'pendientes'}
                            </p>
                        </div>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-4">
                    {porPagar.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400">
                            <p>No hay cuentas por pagar</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {porPagar.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-zinc-200">
                                            {item.concepto}
                                        </p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <p className="text-sm text-rose-400 font-semibold">
                                                {formatCurrency(item.monto)}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {formatDate(item.fecha)}
                                            </p>
                                        </div>
                                    </div>
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onMarcarPagado(item.id)}
                                    >
                                        Marcar Pagado
                                    </ZenButton>
                                </div>
                            ))}
                        </div>
                    )}
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
