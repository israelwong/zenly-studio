'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { PorPagarPersonalCard } from './PorPagarPersonalCard';
import { PorPagarPersonal } from '@/lib/actions/studio/business/finanzas/finanzas.actions';

interface PorPagarCardProps {
    porPagar: PorPagarPersonal[];
    studioSlug: string;
    onMarcarPagado: (id: string) => void;
    onPagoConfirmado?: () => void;
    headerAction?: React.ReactNode;
}

export function PorPagarCard({ porPagar, studioSlug, onMarcarPagado, onPagoConfirmado, headerAction }: PorPagarCardProps) {
    const totalPersonas = porPagar.length;
    const totalItems = porPagar.reduce((sum, p) => sum + p.items.length, 0);

    return (
        <ZenCard variant="default" padding="none" className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-rose-500/10 rounded-lg">
                        <CreditCard className="h-4 w-4 text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <ZenCardTitle className="text-base">Por Pagar</ZenCardTitle>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            {totalPersonas} {totalPersonas === 1 ? 'personal' : 'personales'} • {totalItems} {totalItems === 1 ? 'concepto' : 'conceptos'}
                        </p>
                    </div>
                    {headerAction}
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex-1 overflow-auto">
                {porPagar.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p>No hay cuentas por pagar</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {porPagar.map((personal) => (
                            <PorPagarPersonalCard
                                key={personal.personalId}
                                personal={personal}
                                studioSlug={studioSlug}
                                onPagoConfirmado={onPagoConfirmado}
                            />
                        ))}
                    </div>
                )}
            </ZenCardContent>
        </ZenCard>
    );
}
