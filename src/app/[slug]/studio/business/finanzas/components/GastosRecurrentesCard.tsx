'use client';

import React, { useState } from 'react';
import { ZenButton } from '@/components/ui/zen';
import { Plus, DollarSign } from 'lucide-react';
import { GastoRecurrenteItemCard } from './GastoRecurrenteItemCard';
import { RegistrarGastoRecurrenteModal } from './RegistrarGastoRecurrenteModal';
import { pagarGastoRecurrente } from '@/lib/actions/studio/business/finanzas/finanzas.actions';

interface RecurringExpense {
    id: string;
    name: string;
    amount: number;
    category: string;
    chargeDay: number;
    isActive: boolean;
    frequency?: string;
    description?: string | null;
    pagosMesActual?: number;
    totalPagosEsperados?: number;
    isCrewMember?: boolean;
    crewMemberId?: string;
}

interface GastosRecurrentesCardProps {
    expenses: RecurringExpense[];
    studioSlug: string;
    onAddExpense: () => void;
    onEditExpense: (id: string) => void;
    onGastoRegistrado?: () => void;
    onGastoPagado?: () => void;
}

export function GastosRecurrentesCard({
    expenses,
    studioSlug,
    onAddExpense,
    onEditExpense,
    onGastoRegistrado,
    onGastoPagado,
}: GastosRecurrentesCardProps) {
    const [showModal, setShowModal] = useState(false);

    const handleAddClick = () => {
        setShowModal(true);
    };

    const handleSuccess = async () => {
        await onGastoRegistrado?.();
        setShowModal(false);
    };

    const handlePagar = async (expenseId: string) => {
        const result = await pagarGastoRecurrente(studioSlug, expenseId);
        if (!result.success) {
            throw new Error(result.error || 'Error al pagar gasto recurrente');
        }
        await onGastoPagado?.();
    };

    return (
        <>
            <div className="h-full flex flex-col overflow-hidden bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
                <div className="border-b border-zinc-800 flex-shrink-0 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-zinc-200">Gastos recurrentes del mes</h3>
                        <ZenButton variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleAddClick}>
                            <Plus className="h-4 w-4" />
                        </ZenButton>
                    </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    {expenses.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
                            <DollarSign className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                            <p className="text-zinc-400 mb-2">No hay gastos fijos configurados</p>
                            <p className="text-sm text-zinc-500">
                                Agrega gastos recurrentes como suscripciones, renta o servicios
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {expenses
                                .filter((expense) => {
                                    // Solo mostrar gastos que aún tienen pagos pendientes del mes
                                    const pagosMesActual = expense.pagosMesActual || 0;
                                    const totalPagosEsperados = expense.totalPagosEsperados || 1;
                                    return pagosMesActual < totalPagosEsperados;
                                })
                                .map((expense) => (
                                    <GastoRecurrenteItemCard
                                        key={expense.id}
                                        expense={expense}
                                        studioSlug={studioSlug}
                                        onPagar={handlePagar}
                                        onPagoConfirmado={onGastoPagado}
                                        onEditado={async () => {
                                            await onGastoRegistrado?.();
                                        }}
                                        onCancelado={async () => {
                                            await onGastoRegistrado?.();
                                        }}
                                        onEliminado={async () => {
                                            await onGastoRegistrado?.();
                                        }}
                                    />
                                ))}
                        </div>
                    )}
                </div>
            </div>

            <RegistrarGastoRecurrenteModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                studioSlug={studioSlug}
                onSuccess={handleSuccess}
            />
        </>
    );
}
