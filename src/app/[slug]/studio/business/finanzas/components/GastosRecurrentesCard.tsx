'use client';

import React, { useState } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
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
            <ZenCard variant="default" padding="none" className="h-full flex flex-col">
                <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <ZenCardTitle className="text-base">Gastos Recurrentes</ZenCardTitle>
                        <ZenButton variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleAddClick}>
                            <Plus className="h-4 w-4" />
                        </ZenButton>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-4 flex-1 overflow-auto">
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
                            {expenses.map((expense) => (
                                <GastoRecurrenteItemCard
                                    key={expense.id}
                                    expense={expense}
                                    studioSlug={studioSlug}
                                    onPagar={handlePagar}
                                    onPagoConfirmado={onGastoPagado}
                                />
                            ))}
                        </div>
                    )}
                </ZenCardContent>
            </ZenCard>

            <RegistrarGastoRecurrenteModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                studioSlug={studioSlug}
                onSuccess={handleSuccess}
            />
        </>
    );
}
