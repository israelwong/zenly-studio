'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { CreditCard } from 'lucide-react';
import { PorPagarItemCard } from './PorPagarItemCard';

interface PendingItem {
    id: string;
    concepto: string;
    monto: number;
    fecha: Date;
}

interface PorPagarCardProps {
    porPagar: PendingItem[];
    studioSlug: string;
    onMarcarPagado: (id: string) => void;
    onPagoConfirmado?: () => void;
}

export function PorPagarCard({ porPagar, studioSlug, onMarcarPagado, onPagoConfirmado }: PorPagarCardProps) {
    return (
        <ZenCard variant="default" padding="none" className="h-full max-h-full flex flex-col overflow-hidden">
            <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-rose-500/10 rounded-lg">
                        <CreditCard className="h-4 w-4 text-rose-400" />
                    </div>
                    <div className="flex-1">
                        <ZenCardTitle className="text-base">Por Pagar</ZenCardTitle>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            {porPagar.length} {porPagar.length === 1 ? 'pendiente' : 'pendientes'}
                        </p>
                    </div>
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex-1 overflow-auto">
                {porPagar.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p>No hay cuentas por pagar</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {porPagar.map((item) => (
                            <PorPagarItemCard
                                key={item.id}
                                item={item}
                                studioSlug={studioSlug}
                                onMarcarPagado={onMarcarPagado}
                                onPagoConfirmado={onPagoConfirmado}
                            />
                        ))}
                    </div>
                )}
            </ZenCardContent>
        </ZenCard>
    );
}
