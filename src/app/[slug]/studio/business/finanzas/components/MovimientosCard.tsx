'use client';

import React, { useState } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowUp, ArrowDown } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import { MovimientoItemCard } from './MovimientoItemCard';
import { RegistrarMovimientoModal } from './RegistrarMovimientoModal';

interface Transaction {
    id: string;
    fecha: Date;
    fuente: 'evento' | 'staff' | 'operativo';
    concepto: string;
    categoria: string;
    monto: number;
    nominaId?: string;
    isGastoOperativo?: boolean;
}

interface MovimientosCardProps {
    transactions: Transaction[];
    studioSlug: string;
    onRegistrarIngreso: () => void;
    onRegistrarGasto: () => void;
    onCancelarPago?: (id: string) => void;
    onMovimientoRegistrado?: () => void;
    onGastoEliminado?: () => void;
    onNominaCancelada?: () => void;
    onGastoEditado?: () => void;
    onDevolucionConfirmada?: () => void;
}

export function MovimientosCard({
    transactions,
    studioSlug,
    onRegistrarIngreso,
    onRegistrarGasto,
    onCancelarPago,
    onMovimientoRegistrado,
    onGastoEliminado,
    onNominaCancelada,
    onGastoEditado,
    onDevolucionConfirmada,
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

    const countIngresos = transactions.filter((t) => t.monto > 0).length;
    const countEgresos = transactions.filter((t) => t.monto < 0).length;

    return (
        <>
            <ZenCard variant="default" padding="none" className="h-full flex flex-col">
                <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 h-14 px-4 flex items-center">
                    <div className="flex items-center justify-between gap-2 w-full min-w-0">
                        <ZenCardTitle className="text-base mb-0 min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                            <span className="truncate">Movimientos del Mes</span>
                            {transactions.length > 0 && (
                                <span className="flex items-center gap-2 shrink-0 text-sm">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-emerald-400">
                                                <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                                                {countIngresos}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                            Ingreso
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-red-400">
                                                <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                                                {countEgresos}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs">
                                            Egreso
                                        </TooltipContent>
                                    </Tooltip>
                                </span>
                            )}
                        </ZenCardTitle>
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
                                    onNominaCancelada={onNominaCancelada}
                                    onGastoEditado={onGastoEditado}
                                    onDevolucionConfirmada={onDevolucionConfirmada}
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
