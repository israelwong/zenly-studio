'use client';

import React, { useState } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import {
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle,
    ZenButton,
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
} from '@/components/ui/zen';
import { MovimientoItemCard } from './MovimientoItemCard';
import { RegistrarMovimientoModal } from './RegistrarMovimientoModal';

interface Transaction {
    id: string;
    fecha: Date;
    fuente: 'evento' | 'staff' | 'operativo';
    concepto: string;
    categoria: string;
    monto: number;
}

interface MovimientosCardProps {
    transactions: Transaction[];
    studioSlug: string;
    onRegistrarIngreso: () => void;
    onRegistrarGasto: () => void;
    onCancelarPago?: (id: string) => void;
    onMovimientoRegistrado?: () => void;
    onGastoEliminado?: () => void;
}

export function MovimientosCard({
    transactions,
    studioSlug,
    onRegistrarIngreso,
    onRegistrarGasto,
    onCancelarPago,
    onMovimientoRegistrado,
    onGastoEliminado,
}: MovimientosCardProps) {
    const [showIngresoModal, setShowIngresoModal] = useState(false);
    const [showGastoModal, setShowGastoModal] = useState(false);

    const handleRegistrarIngreso = () => {
        setShowIngresoModal(true);
    };

    const handleRegistrarGasto = () => {
        setShowGastoModal(true);
    };

    const handleSuccess = async () => {
        await onMovimientoRegistrado?.();
    };

    return (
        <>
            <ZenCard variant="default" padding="none" className="h-full flex flex-col">
                <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <ZenCardTitle className="text-base">Movimientos del Mes</ZenCardTitle>
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <Plus className="h-4 w-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end">
                                <ZenDropdownMenuItem onClick={handleRegistrarIngreso} className="gap-2">
                                    <ArrowDownCircle className="h-4 w-4 text-emerald-400" />
                                    Registrar Ingreso
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuItem onClick={handleRegistrarGasto} className="gap-2">
                                    <ArrowUpCircle className="h-4 w-4 text-rose-400" />
                                    Registrar Gasto
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-4 flex-1 overflow-auto">
                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400">
                            <p>No hay movimientos registrados para este período</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((transaction) => (
                                <MovimientoItemCard
                                    key={transaction.id}
                                    transaction={transaction}
                                    studioSlug={studioSlug}
                                    onCancelarPago={onCancelarPago}
                                    onGastoEliminado={onGastoEliminado}
                                />
                            ))}
                        </div>
                    )}
                </ZenCardContent>
            </ZenCard>

            <RegistrarMovimientoModal
                isOpen={showIngresoModal}
                onClose={() => setShowIngresoModal(false)}
                tipo="ingreso"
                studioSlug={studioSlug}
                onSuccess={handleSuccess}
            />

            <RegistrarMovimientoModal
                isOpen={showGastoModal}
                onClose={() => setShowGastoModal(false)}
                tipo="gasto"
                studioSlug={studioSlug}
                onSuccess={handleSuccess}
            />
        </>
    );
}
