'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
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
        <ZenCard variant="default" padding="none" className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 h-14 px-4 flex items-center">
                <div className="flex items-center gap-3 w-full min-w-0">
                    <ZenCardTitle className="text-base mb-0 truncate flex-1 min-w-0 flex items-center gap-2">
                        {porCobrar.length > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-2 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 shrink-0">
                                {porCobrar.length}
                            </span>
                        )}
                        <span className="truncate">Cuentas por Cobrar</span>
                    </ZenCardTitle>
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
