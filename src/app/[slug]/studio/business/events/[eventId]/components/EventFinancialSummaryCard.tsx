'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, History } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenBadge, ZenConfirmModal } from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import {
  computeContractTotalFromQuotes,
  computeFinancialSummary,
  type QuoteSnapshot,
} from '@/lib/utils/financial-calculations';
import { PaymentFormModal } from '@/components/shared/payments/PaymentFormModal';
import { PaymentReceipt } from '@/components/shared/payments/PaymentReceipt';
import { PaymentsHistorySheet } from './PaymentsHistorySheet';
import {
  eliminarPago,
  type PaymentItem,
} from '@/lib/actions/studio/business/events/payments.actions';
import { toast } from 'sonner';

const APPROVED_STATUSES = ['autorizada', 'aprobada', 'approved'];

export interface PaymentSummaryItem {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: Date;
  concept: string;
}

interface EventFinancialSummaryCardProps {
  /** Cotizaciones aprobadas del evento (snapshots). */
  initialQuote: QuoteSnapshot | QuoteSnapshot[] | null;
  /** Pagos del evento (por promise_id). Se usan para totales y para el historial. */
  initialPayments: PaymentSummaryItem[];
  studioSlug: string;
  cotizacionId?: string | null;
  /** Callback tras agregar/eliminar pago para que el padre revalide. */
  onPaymentAdded?: () => void;
}

function toPaymentItem(p: PaymentSummaryItem): PaymentItem {
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

/**
 * Hub financiero del evento: resumen (Contratado / Pagado / Pendiente) + agregar pago + historial.
 */
export function EventFinancialSummaryCard({
  initialQuote,
  initialPayments,
  studioSlug,
  cotizacionId,
  onPaymentAdded,
}: EventFinancialSummaryCardProps) {
  const [payments, setPayments] = useState<PaymentItem[]>(() =>
    initialPayments.map(toPaymentItem)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    setPayments(initialPayments.map(toPaymentItem));
  }, [initialPayments]);

  const { totalContract, totalPaid, balanceDue } = useMemo(() => {
    const quotes: QuoteSnapshot[] =
      initialQuote == null
        ? []
        : Array.isArray(initialQuote)
          ? initialQuote.filter((q) =>
              !q.status || APPROVED_STATUSES.includes(String(q.status).toLowerCase())
            )
          : [initialQuote];
    const contractTotal = computeContractTotalFromQuotes(quotes);
    const { totalPaid, balanceDue } = computeFinancialSummary(
      contractTotal,
      payments.map((p) => ({ amount: p.amount }))
    );
    return {
      totalContract: contractTotal,
      totalPaid,
      balanceDue,
    };
  }, [initialQuote, payments]);

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
      setPayments((prev) => {
        const idx = prev.findIndex((p) => p.id === newOrUpdatedPayment.id);
        const next =
          idx > -1
            ? prev.map((p) => (p.id === newOrUpdatedPayment.id ? newOrUpdatedPayment : p))
            : [...prev, newOrUpdatedPayment].sort(
                (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
              );
        return next;
      });
      setIsModalOpen(false);
      setEditingPayment(null);
    }
    onPaymentAdded?.();
  };

  const handleDelete = async () => {
    if (!deletingPaymentId) return;
    setIsDeleting(true);
    const original = payments;
    setPayments((prev) => prev.filter((p) => p.id !== deletingPaymentId));
    try {
      const result = await eliminarPago(studioSlug, deletingPaymentId);
      if (result.success) {
        toast.success('Pago eliminado correctamente');
        setIsDeleteModalOpen(false);
        setDeletingPaymentId(null);
        onPaymentAdded?.();
      } else {
        toast.error(result.error ?? 'Error al eliminar pago');
        setPayments(original);
      }
    } catch (e) {
      console.error('Error deleting payment:', e);
      toast.error('Error al eliminar pago');
      setPayments(original);
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
            <ZenCardTitle className="text-sm font-medium pt-1">
              Resumen financiero
            </ZenCardTitle>
            <div className="flex items-center gap-1">
              {cotizacionId && (
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={handleAddNew}
                  className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar Pago
                </ZenButton>
              )}
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsHistorySheetOpen(true)}
                className="h-6 min-w-6 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
                title="Ver historial de pagos"
              >
                <ZenBadge variant="info" size="sm" className="gap-1">
                  <History className="h-3 w-3" />
                  {payments.length}
                </ZenBadge>
              </ZenButton>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-700/50">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">
                Contratado
              </p>
              <p className="font-semibold text-zinc-200 tabular-nums">
                {formatearMoneda(totalContract)}
              </p>
            </div>
            <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-500/30">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">
                Pagado
              </p>
              <p className="font-semibold text-emerald-400 tabular-nums">
                {formatearMoneda(totalPaid)}
              </p>
            </div>
            <div className="p-3 bg-amber-950/30 rounded-lg border border-amber-500/30">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">
                Pendiente
              </p>
              <p className="font-semibold text-amber-400 tabular-nums">
                {formatearMoneda(balanceDue)}
              </p>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>

      {isModalOpen && cotizacionId && (
        <PaymentFormModal
          key={editingPayment?.id ?? 'new'}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPayment(null);
          }}
          studioSlug={studioSlug}
          cotizacionId={cotizacionId}
          montoPendiente={
            editingPayment ? balanceDue + editingPayment.amount : balanceDue
          }
          initialData={editingPayment}
          onSuccess={handleSuccess}
        />
      )}

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
