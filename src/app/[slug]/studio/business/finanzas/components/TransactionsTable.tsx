'use client';

import React from 'react';
import { PartyPopper, Users, Building2 } from 'lucide-react';
import { ZenBadge } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

interface Transaction {
    id: string;
    fecha: Date;
    fuente: 'evento' | 'staff' | 'operativo';
    concepto: string;
    categoria: string;
    monto: number;
}

interface TransactionsTableProps {
    transactions: Transaction[];
}

const fuenteConfig = {
    evento: {
        icon: PartyPopper,
        label: 'Evento',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
    },
    staff: {
        icon: Users,
        label: 'Staff',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
    },
    operativo: {
        icon: Building2,
        label: 'Operativo',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
    },
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
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
            year: 'numeric',
        }).format(date);
    };

    if (transactions.length === 0) {
        return (
            <div className="text-center py-12 text-zinc-400">
                <p>No hay movimientos registrados para este período</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-zinc-800">
                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                            Fecha
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                            Fuente
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                            Concepto
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                            Categoría
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
                            Monto
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((transaction) => {
                        const config = fuenteConfig[transaction.fuente];
                        const Icon = config.icon;
                        const isIngreso = transaction.monto > 0;

                        return (
                            <tr
                                key={transaction.id}
                                className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                            >
                                <td className="py-3 px-4 text-sm text-zinc-300">
                                    {formatDate(transaction.fecha)}
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={cn(
                                                'p-1.5 rounded',
                                                config.bgColor
                                            )}
                                        >
                                            <Icon className={cn('h-4 w-4', config.color)} />
                                        </div>
                                        <span className="text-sm text-zinc-300">
                                            {config.label}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-sm text-zinc-300">
                                    {transaction.concepto}
                                </td>
                                <td className="py-3 px-4">
                                    <ZenBadge variant="outline" size="sm">
                                        {transaction.categoria}
                                    </ZenBadge>
                                </td>
                                <td
                                    className={cn(
                                        'py-3 px-4 text-sm font-medium text-right',
                                        isIngreso ? 'text-emerald-400' : 'text-rose-400'
                                    )}
                                >
                                    {isIngreso ? '+' : ''}
                                    {formatCurrency(Math.abs(transaction.monto))}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
