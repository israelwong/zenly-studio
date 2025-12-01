'use client';

import React, { useState } from 'react';
import { ZenCard, ZenCardContent, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { marcarNominaPagada } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';

interface PendingItem {
    id: string;
    concepto: string;
    monto: number;
    fecha: Date;
    personalName?: string | null;
    isPaid?: boolean;
}

interface PorPagarItemCardProps {
    item: PendingItem;
    studioSlug: string;
    onMarcarPagado: (id: string) => void;
    onPagoConfirmado?: () => void;
}

export function PorPagarItemCard({
    item,
    studioSlug,
    onMarcarPagado,
    onPagoConfirmado
}: PorPagarItemCardProps) {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const isPaid = item.isPaid || false;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short',
        }).format(date);
    };

    const handlePagarClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmPago = async () => {
        setIsProcessing(true);
        try {
            const result = await marcarNominaPagada(studioSlug, item.id);
            if (result.success) {
                toast.success('Pago confirmado correctamente');
                await onPagoConfirmado?.();
                setShowConfirmModal(false);
            } else {
                toast.error(result.error || 'Error al confirmar el pago');
            }
        } catch (error) {
            console.error('Error confirmando pago:', error);
            toast.error('Error al confirmar el pago');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <ZenCard variant="default" padding="sm" className="hover:border-zinc-700 transition-colors">
                <ZenCardContent className="p-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200 mb-0.5 truncate">
                                {item.concepto}
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                                <p className="text-base text-rose-400 font-semibold">
                                    {formatCurrency(item.monto)}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {formatDate(item.fecha)}
                                </p>
                            </div>
                            {item.personalName ? (
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Personal: <span className="font-medium">{item.personalName}</span>
                                </p>
                            ) : (
                                <p className="text-xs text-zinc-500 mt-0.5 italic">
                                    Sin personal asociado
                                </p>
                            )}
                        </div>
                        {!isPaid ? (
                            <ZenButton
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs flex-shrink-0"
                                onClick={handlePagarClick}
                            >
                                Pagar
                            </ZenButton>
                        ) : (
                            <ZenButton
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs flex-shrink-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                disabled
                            >
                                Pagado
                            </ZenButton>
                        )}
                    </div>
                </ZenCardContent>
            </ZenCard>

            <ZenConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmPago}
                title="¿Confirmar el pago?"
                description={`¿Deseas confirmar el pago de ${formatCurrency(item.monto)} para "${item.concepto}"${item.personalName ? ` - ${item.personalName}` : ''}?`}
                confirmText="Sí, confirmar pago"
                cancelText="Cancelar"
                variant="default"
                loading={isProcessing}
                loadingText="Confirmando..."
            />
        </>
    );
}
