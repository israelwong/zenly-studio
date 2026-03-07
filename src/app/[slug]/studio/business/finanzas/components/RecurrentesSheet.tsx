'use client';

import React, { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/shadcn/sheet';
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

interface RecurrentesSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expenses: RecurringExpense[];
    studioSlug: string;
    onGastoRegistrado?: () => void | Promise<void>;
    onGastoPagado?: () => void | Promise<void>;
}

export function RecurrentesSheet({
    open,
    onOpenChange,
    expenses,
    studioSlug,
    onGastoRegistrado,
    onGastoPagado,
}: RecurrentesSheetProps) {
    const [showModal, setShowModal] = useState(false);

    const handleAddClick = () => setShowModal(true);

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
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-full sm:max-w-md flex flex-col bg-zinc-900 border-zinc-800">
                    <SheetHeader className="border-b border-zinc-800 flex-shrink-0 pr-12">
                        <div className="flex items-center gap-3 w-full">
                            <SheetTitle className="text-lg font-semibold text-zinc-200">
                                Gastos recurrentes
                            </SheetTitle>
                            <ZenButton variant="ghost" size="sm" onClick={handleAddClick}>
                                <Plus className="h-4 w-4 mr-1" />
                                Nuevo
                            </ZenButton>
                        </div>
                    </SheetHeader>
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                        {expenses.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-zinc-700 rounded-lg">
                                <DollarSign className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                                <p className="text-zinc-400 mb-2">No hay gastos recurrentes</p>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Crea renta, suscripciones o servicios fijos
                                </p>
                                <ZenButton onClick={handleAddClick}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Agregar gasto recurrente
                                </ZenButton>
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
                                        onEditado={onGastoRegistrado}
                                        onCancelado={onGastoRegistrado}
                                        onEliminado={onGastoRegistrado}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <RegistrarGastoRecurrenteModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                studioSlug={studioSlug}
                onSuccess={handleSuccess}
            />
        </>
    );
}
