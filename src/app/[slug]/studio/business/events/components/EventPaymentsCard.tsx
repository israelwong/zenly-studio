'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Calendar, Edit, Plus, X, CreditCard, FileText } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { PaymentFormModal } from '@/components/shared/payments/PaymentFormModal';
import {
  obtenerPagosPorCotizacion,
  eliminarPago,
  type PaymentItem,
} from '@/lib/actions/studio/business/events/payments.actions';
import { formatDate, formatNumber } from '@/lib/actions/utils/formatting';
import { toast } from 'sonner';

// Helper para formatear montos con separadores de miles
const formatAmount = (amount: number): string => {
  return `$${formatNumber(amount, 2)}`;
};

interface EventPaymentsCardProps {
  studioSlug: string;
  cotizacionId?: string;
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

export function EventPaymentsCard({
  studioSlug,
  cotizacionId,
  contractValue = 0,
  paidAmount = 0,
  pendingAmount = 0,
  payments: initialPayments,
  onPaymentAdded,
}: EventPaymentsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!cotizacionId) {
      // Si no hay cotizacionId, usar los pagos iniciales
      setPayments(
        initialPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          payment_method: p.payment_method,
          payment_date: p.payment_date,
          concept: p.concept,
          description: null,
          created_at: p.payment_date,
        }))
      );
      return;
    }

    setLoading(true);
    try {
      const result = await obtenerPagosPorCotizacion(studioSlug, cotizacionId);
      if (result.success) {
        setPayments(result.data || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }, [studioSlug, cotizacionId, initialPayments]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

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
          return prev.map(p => p.id === newOrUpdatedPayment.id ? newOrUpdatedPayment : p);
        } else {
          return [...prev, newOrUpdatedPayment].sort((a, b) =>
            new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
          );
        }
      });
    }
    onPaymentAdded?.();
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
        onPaymentAdded?.();
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

  const renderPaymentCard = (payment: PaymentItem) => (
    <div
      key={payment.id}
      className="p-4 rounded-lg border bg-zinc-800/50 border-zinc-700/50"
    >
      <div className="space-y-3">
        {/* Monto */}
        <div className="flex items-start gap-2.5">
          <DollarSign className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Monto</p>
            <p className="text-sm font-semibold text-emerald-200">
              {formatAmount(payment.amount)}
            </p>
          </div>
        </div>

        {/* Método de pago */}
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Método de pago</p>
            <p className="text-xs font-semibold text-zinc-200 capitalize">
              {payment.payment_method}
            </p>
          </div>
        </div>

        {/* Fecha */}
        <div className="flex items-start gap-2.5">
          <Calendar className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Fecha</p>
            <p className="text-sm font-semibold text-zinc-200">
              {formatDate(payment.payment_date)}
            </p>
          </div>
        </div>

        {/* Concepto */}
        {payment.concept && (
          <div className="flex items-start gap-2.5">
            <FileText className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-400 mb-0.5">Concepto</p>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {payment.concept}
              </p>
            </div>
          </div>
        )}

        {/* Descripción */}
        {payment.description && (
          <div className="pt-2 border-t border-zinc-700/30">
            <p className="text-xs text-zinc-300 leading-relaxed">
              {payment.description}
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-700/50">
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(payment)}
            className="flex-1 text-xs text-zinc-400 hover:text-zinc-300"
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </ZenButton>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(payment.id)}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20"
          >
            <X className="h-3.5 w-3.5" />
          </ZenButton>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
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
              {/* Resumen financiero */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-zinc-900 rounded">
                  <p className="text-zinc-400">Total</p>
                  <p className="font-semibold text-zinc-200">{formatAmount(contractValue)}</p>
                </div>
                <div className="p-2 bg-green-900/20 rounded border border-green-500/30">
                  <p className="text-zinc-400">Pagado</p>
                  <p className="font-semibold text-green-400">{formatAmount(paidAmount)}</p>
                </div>
                <div className="p-2 bg-red-900/20 rounded border border-red-500/30">
                  <p className="text-zinc-400">Pendiente</p>
                  <p className="font-semibold text-red-400">{formatAmount(pendingAmount)}</p>
                </div>
              </div>

              {/* Lista de pagos */}
              {payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment) => renderPaymentCard(payment))}
                </div>
              ) : (
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
    </>
  );
}
