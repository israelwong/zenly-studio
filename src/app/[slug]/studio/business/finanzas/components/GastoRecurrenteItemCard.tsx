'use client';

import React, { useState } from 'react';
import { ZenCard, ZenCardContent, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

interface GastoRecurrente {
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

interface GastoRecurrenteItemCardProps {
    expense: GastoRecurrente;
    studioSlug: string;
    onPagar: (id: string) => Promise<void>;
    onPagoConfirmado?: () => void;
}

export function GastoRecurrenteItemCard({
    expense,
    studioSlug,
    onPagar,
    onPagoConfirmado,
}: GastoRecurrenteItemCardProps) {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const getFrequencyLabel = (frequency?: string) => {
        switch (frequency) {
            case 'monthly':
                return 'Mensual';
            case 'biweekly':
                return 'Quincenal';
            case 'weekly':
                return 'Semanal';
            default:
                return 'Mensual';
        }
    };

    const getPaymentLabel = () => {
        const { pagosMesActual = 0, totalPagosEsperados = 1, frequency } = expense;

        // Solo mostrar serialización para semanal y quincenal
        if (frequency === 'weekly' && totalPagosEsperados > 1) {
            return `Pago ${pagosMesActual + 1} de ${totalPagosEsperados}`;
        } else if (frequency === 'biweekly' && totalPagosEsperados === 2) {
            return `Pago ${pagosMesActual + 1} de 2`;
        }

        // Mensual o sin serialización
        return 'Pagar';
    };

    const handlePagarClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmPago = async () => {
        setIsProcessing(true);
        try {
            await onPagar(expense.id);
            toast.success('Gasto recurrente pagado correctamente');
            await onPagoConfirmado?.();
            setShowConfirmModal(false);
        } catch (error) {
            console.error('Error pagando gasto recurrente:', error);
            toast.error('Error al pagar gasto recurrente');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <ZenCard variant="default" padding="sm" className={expense.isCrewMember ? "hover:border-emerald-700 transition-colors border-emerald-500/20" : "hover:border-zinc-700 transition-colors"}>
                <ZenCardContent className="p-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                {expense.isCrewMember && (
                                    <User className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                                )}
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                    {expense.name}
                                </p>
                            </div>
                            {expense.description && (
                                <p className="text-xs text-zinc-500 mb-1 truncate">
                                    {expense.description}
                                </p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                                <p className="text-base text-rose-400 font-semibold">
                                    {formatCurrency(expense.amount)}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                        {getFrequencyLabel(expense.frequency)}
                                        {!expense.isCrewMember && ` - Día ${expense.chargeDay}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <ZenButton
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs flex-shrink-0"
                            onClick={handlePagarClick}
                        >
                            {getPaymentLabel()}
                        </ZenButton>
                    </div>
                </ZenCardContent>
            </ZenCard>

            <ZenConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmPago}
                title="¿Confirmar el pago del gasto recurrente?"
                description={`¿Deseas confirmar el pago de ${formatCurrency(expense.amount)} para "${expense.name}"? Este pago se registrará como egreso en los movimientos del mes.`}
                confirmText="Sí, confirmar pago"
                cancelText="Cancelar"
                variant="default"
                loading={isProcessing}
                loadingText="Confirmando..."
            />
        </>
    );
}
