'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenButton } from '@/components/ui/zen';

interface PendingItem {
    id: string;
    concepto: string;
    monto: number;
    fecha: Date;
    personalName?: string | null;
}

interface PorPagarItemCardProps {
    item: PendingItem;
    onMarcarPagado: (id: string) => void;
}

export function PorPagarItemCard({ item, onMarcarPagado }: PorPagarItemCardProps) {
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
        <ZenCard variant="default" padding="sm" className="hover:border-zinc-700 transition-colors">
            <ZenCardContent className="p-0">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 mb-0.5 truncate">
                            {item.concepto}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-base text-rose-400 font-semibold">
                                {formatCurrency(item.monto)}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {formatDate(item.fecha)}
                            </p>
                        </div>
                        {item.personalName ? (
                            <p className="text-xs text-zinc-400 mt-1">
                                Personal: <span className="font-medium">{item.personalName}</span>
                            </p>
                        ) : (
                            <p className="text-xs text-zinc-500 mt-1 italic">
                                Sin personal asociado
                            </p>
                        )}
                    </div>
                </div>
                <div className="pt-2 border-t border-zinc-800">
                    <ZenButton
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => onMarcarPagado(item.id)}
                    >
                        Marcar Pagado
                    </ZenButton>
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}
