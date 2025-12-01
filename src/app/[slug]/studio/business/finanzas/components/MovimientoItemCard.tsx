'use client';

import React, { useState } from 'react';
import { MoreVertical, FileText, X } from 'lucide-react';
import {
    ZenCard,
    ZenCardContent,
    ZenButton,
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuSeparator,
    ZenConfirmModal,
} from '@/components/ui/zen';
import { PaymentReceipt } from '@/components/shared/payments/PaymentReceipt';
import { cn } from '@/lib/utils';

interface Transaction {
    id: string;
    fecha: Date;
    fuente: 'evento' | 'staff' | 'operativo';
    concepto: string;
    categoria: string;
    monto: number;
}

interface MovimientoItemCardProps {
    transaction: Transaction;
    studioSlug: string;
    onCancelarPago?: (id: string) => void;
}

export function MovimientoItemCard({
    transaction,
    studioSlug,
    onCancelarPago,
}: MovimientoItemCardProps) {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

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
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const isIngreso = transaction.monto > 0;

    const handleViewReceipt = () => {
        setIsReceiptModalOpen(true);
    };

    const handleCancelarClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmCancel = async () => {
        if (!onCancelarPago) return;

        setIsCancelling(true);
        try {
            await onCancelarPago(transaction.id);
            setShowConfirmModal(false);
        } catch (error) {
            console.error('Error cancelando pago:', error);
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <>
            <ZenCard variant="default" padding="sm" className="hover:border-zinc-700 transition-colors">
                <ZenCardContent className="p-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200 truncate mb-0.5">
                                {transaction.concepto}
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                                <p className="text-xs text-zinc-500">
                                    {formatDate(transaction.fecha)}
                                </p>
                                <p
                                    className={cn(
                                        'text-base font-semibold',
                                        isIngreso ? 'text-emerald-400' : 'text-rose-400'
                                    )}
                                >
                                    {isIngreso ? '+' : ''}
                                    {formatCurrency(Math.abs(transaction.monto))}
                                </p>
                            </div>
                        </div>
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end">
                                {isIngreso && (
                                    <ZenDropdownMenuItem
                                        onClick={handleViewReceipt}
                                        className="gap-2"
                                    >
                                        <FileText className="h-4 w-4" />
                                        Ver Comprobante
                                    </ZenDropdownMenuItem>
                                )}
                                {onCancelarPago && (
                                    <>
                                        {isIngreso && <ZenDropdownMenuSeparator />}
                                        <ZenDropdownMenuItem
                                            onClick={handleCancelarClick}
                                            className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                        >
                                            <X className="h-4 w-4" />
                                            Cancelar Pago
                                        </ZenDropdownMenuItem>
                                    </>
                                )}
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    </div>
                </ZenCardContent>
            </ZenCard>

            <ZenConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmCancel}
                title="¿Estás seguro de cancelar el pago?"
                description={`Esta acción cancelará el pago "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))}. El pago se mantendrá en el historial con estado cancelado.`}
                confirmText="Sí, cancelar pago"
                cancelText="No, mantener"
                variant="destructive"
                loading={isCancelling}
                loadingText="Cancelando..."
            />

            {/* Modal de comprobante */}
            {isReceiptModalOpen && (
                <PaymentReceipt
                    isOpen={isReceiptModalOpen}
                    onClose={() => setIsReceiptModalOpen(false)}
                    studioSlug={studioSlug}
                    paymentId={transaction.id}
                />
            )}
        </>
    );
}
