'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Wallet } from 'lucide-react';
import { PorCobrarItemCard } from './PorCobrarItemCard';

interface PendingItem {
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
}

interface PorCobrarCardProps {
    porCobrar: PendingItem[];
    studioSlug: string;
    onRegistrarPago: (id: string) => void;
    onPagoRegistrado?: () => void;
}

export function PorCobrarCard({
    porCobrar,
    studioSlug,
    onRegistrarPago,
    onPagoRegistrado,
}: PorCobrarCardProps) {
    return (
        <ZenCard variant="default" padding="none" className="h-full max-h-full flex flex-col overflow-hidden">
            <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                        <Wallet className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <ZenCardTitle className="text-base">Por Cobrar</ZenCardTitle>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            {porCobrar.length} {porCobrar.length === 1 ? 'pendiente' : 'pendientes'}
                        </p>
                    </div>
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex-1 overflow-auto">
                {porCobrar.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p>No hay cuentas por cobrar</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {porCobrar.map((item) => (
                            <PorCobrarItemCard
                                key={item.id}
                                item={item}
                                studioSlug={studioSlug}
                                onRegistrarPago={onRegistrarPago}
                                onPagoRegistrado={onPagoRegistrado}
                            />
                        ))}
                    </div>
                )}
            </ZenCardContent>
        </ZenCard>
    );
}
