'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import {
    ZenCard,
    ZenCardHeader,
    ZenCardTitle,
    ZenCardContent,
    ZenButton,
    ZenConfirmModal,
} from '@/components/ui/zen';
import { PaymentFormModal } from '@/components/shared/payments/PaymentFormModal';
import { PaymentReceipt } from '@/components/shared/payments/PaymentReceipt';
import { PaymentsHistorySheet } from './PaymentsHistorySheet';
import {
    obtenerPagosPorCotizacion,
    eliminarPago,
    type PaymentItem,
} from '@/lib/actions/studio/business/events/payments.actions';
import { formatNumber } from '@/lib/actions/utils/formatting';
import { toast } from 'sonner';

// Helper para formatear montos con separadores de miles
const formatAmount = (amount: number): string => {
    return `$${formatNumber(amount, 2)}`;
};

interface EventPaymentsCardProps {
    studioSlug: string;
    cotizacionId?: string;
    /** Si true, usa payments (del evento por promise_id) como lista y no fetchea por cotizacion_id. Así "Pagado" y el historial coinciden. */
    usePaymentsFromEvent?: boolean;
    contractValue?: number;
    paidAmount?: number;
    pendingAmount?: number;
    payments: Array<{
        id: string;
        amount: number;
        payment_method: string;
        payment_date: Date;
        concept: string;
    }>;
    onPaymentAdded?: () => void;
}

function toPaymentItem(p: {
    id: string;
    amount: number;
    payment_method: string;
    payment_date: Date;
    concept: string;
}): PaymentItem {
    return {
        id: p.id,
        amount: p.amount,
        payment_method: p.payment_method,
        payment_date: p.payment_date,
        concept: p.concept,
        description: null,
        created_at: p.payment_date,
    };
}

export function EventPaymentsCard({
    studioSlug,
    cotizacionId,
    usePaymentsFromEvent = false,
    contractValue = 0,
    paidAmount = 0,
    pendingAmount = 0,
    payments: initialPayments,
}: EventPaymentsCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [payments, setPayments] = useState<PaymentItem[]>(() =>
        initialPayments.map(toPaymentItem)
    );
    const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
    const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
    const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // En contexto de evento: usar pagos del evento (por promise_id). Si no, fetchear por cotizacion_id.
    useEffect(() => {
        if (usePaymentsFromEvent || !cotizacionId) {
            setPayments(initialPayments.map(toPaymentItem));
            return;
        }
        setLoading(true);
        obtenerPagosPorCotizacion(studioSlug, cotizacionId)
            .then((result) => {
                if (result.success) setPayments(result.data || []);
            })
            .catch((err) => console.error('Error loading payments:', err))
            .finally(() => setLoading(false));
    }, [studioSlug, cotizacionId, usePaymentsFromEvent, initialPayments]);

    // Calcular totales localmente basándose en los pagos actuales
    const localTotals = useMemo(() => {
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalPending = contractValue - totalPaid;
        return {
            paidAmount: totalPaid,
            pendingAmount: Math.max(0, totalPending), // No permitir valores negativos
        };
    }, [payments, contractValue]);

    const handleAddNew = () => {
        if (!cotizacionId) {
            toast.error('No hay cotización asociada');
            return;
        }
        setEditingPayment(null);
        setIsModalOpen(true);
    };

    const handleEdit = (payment: PaymentItem) => {
        setEditingPayment(payment);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (paymentId: string) => {
        setDeletingPaymentId(paymentId);
        setIsDeleteModalOpen(true);
    };

    const handleSuccess = (newOrUpdatedPayment?: PaymentItem) => {
        if (newOrUpdatedPayment) {
            setPayments(prev => {
                const existingIndex = prev.findIndex(p => p.id === newOrUpdatedPayment.id);
                if (existingIndex > -1) {
                    // Actualizar pago existente
                    return prev.map(p => p.id === newOrUpdatedPayment.id ? newOrUpdatedPayment : p);
                } else {
                    // Agregar nuevo pago
                    return [...prev, newOrUpdatedPayment].sort((a, b) =>
                        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
                    );
                }
            });
        }
        // No llamar onPaymentAdded para evitar recargar todo el componente padre
        // Solo actualizar los totales si es necesario (se puede hacer con un callback más específico)
    };

    const handleDelete = async () => {
        if (!deletingPaymentId) return;

        setIsDeleting(true);
        const originalPayments = payments;
        // Optimistic update
        setPayments(prev => prev.filter(p => p.id !== deletingPaymentId));

        try {
            const result = await eliminarPago(studioSlug, deletingPaymentId);
            if (result.success) {
                toast.success('Pago eliminado correctamente');
                // No llamar onPaymentAdded para evitar recargar todo el componente padre
                setIsDeleteModalOpen(false);
                setDeletingPaymentId(null);
            } else {
                toast.error(result.error || 'Error al eliminar pago');
                setPayments(originalPayments); // Revert optimistic update
            }
        } catch (error) {
            console.error('Error deleting payment:', error);
            toast.error('Error al eliminar pago');
            setPayments(originalPayments); // Revert optimistic update
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewReceipt = (paymentId: string) => {
        setReceiptPaymentId(paymentId);
        setIsReceiptModalOpen(true);
    };

    return (
        <>
            <ZenCard>
                <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
                            Pagos
                        </ZenCardTitle>
                        {cotizacionId && (
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                onClick={handleAddNew}
                                className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Agregar
                            </ZenButton>
                        )}
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-4">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-32 w-full bg-zinc-800 rounded animate-pulse" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {payments.length === 0 && (
                                <div className="text-center py-4">
                                    <p className="text-xs text-zinc-500 mb-2">
                                        No hay pagos registrados
                                    </p>
                                    {!cotizacionId && (
                                        <p className="text-xs text-zinc-600">
                                            Asocia una cotización para registrar pagos
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </ZenCardContent>
                {/* Footer con botón de historial */}
                {payments.length > 0 && (
                    <div className="px-4 pb-4 pt-3 border-t border-zinc-800">
                        <ZenButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsHistorySheetOpen(true)}
                            className="w-full gap-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
                        >
                            Ver historial de pagos ({payments.length})
                        </ZenButton>
                    </div>
                )}
            </ZenCard>

            {/* Modal para crear/editar pago */}
            {isModalOpen && cotizacionId && (
                <PaymentFormModal
                    key={editingPayment?.id || 'new'}
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingPayment(null);
                    }}
                    studioSlug={studioSlug}
                    cotizacionId={cotizacionId}
                    montoPendiente={
                        editingPayment
                            ? localTotals.pendingAmount + editingPayment.amount
                            : localTotals.pendingAmount
                    }
                    initialData={editingPayment}
                    onSuccess={handleSuccess}
                />
            )}

            {/* Modal de confirmación para eliminar */}
            {isDeleteModalOpen && (
                <ZenConfirmModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        if (!isDeleting) {
                            setIsDeleteModalOpen(false);
                            setDeletingPaymentId(null);
                        }
                    }}
                    onConfirm={handleDelete}
                    title="Eliminar pago"
                    description="¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer."
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    variant="destructive"
                    loading={isDeleting}
                    loadingText="Eliminando..."
                />
            )}

            {/* Modal de comprobante */}
            {isReceiptModalOpen && receiptPaymentId && (
                <PaymentReceipt
                    isOpen={isReceiptModalOpen}
                    onClose={() => {
                        setIsReceiptModalOpen(false);
                        setReceiptPaymentId(null);
                    }}
                    studioSlug={studioSlug}
                    paymentId={receiptPaymentId}
                />
            )}

            {/* Sheet de historial de pagos */}
            <PaymentsHistorySheet
                isOpen={isHistorySheetOpen}
                onClose={() => setIsHistorySheetOpen(false)}
                payments={payments}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onViewReceipt={handleViewReceipt}
                openMenuId={openMenuId}
                onMenuOpenChange={setOpenMenuId}
            />
        </>
    );
}
