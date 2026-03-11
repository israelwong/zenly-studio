'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, History, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenBadge, ZenConfirmModal } from '@/components/ui/zen';
import { AnnexPreviewModal } from '@/components/shared/annex';
import { getAnnexPreviewData } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import {
  computeContractTotalFromQuote,
  computeContractTotalFromQuotes,
  computeFinancialSummary,
  getQuoteMicroSummary,
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
  /** Fallback cuando no hay cotizaciones (modo dieta): valores de getPromiseFinancials. */
  contractValueFallback?: number | null;
  paidAmountFallback?: number | null;
  pendingAmountFallback?: number | null;
  /** ID de la cotización principal (maestra) para etiquetar el desglose. */
  mainCotizacionId?: string | null;
  /** ID del evento (para contexto en filas expandidas). */
  eventId?: string | null;
  /** Si hay contrato maestro para mostrar "Ver contrato" en la cotización principal. */
  hasContract?: boolean;
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
  contractValueFallback,
  paidAmountFallback,
  pendingAmountFallback,
  mainCotizacionId = null,
  eventId = null,
  hasContract = false,
}: EventFinancialSummaryCardProps) {
  const [payments, setPayments] = useState<PaymentItem[]>(() =>
    initialPayments.map(toPaymentItem)
  );
  const [quotesListExpanded, setQuotesListExpanded] = useState(true);
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [annexPreviewId, setAnnexPreviewId] = useState<string | null>(null);
  const [annexPreviewData, setAnnexPreviewData] = useState<Parameters<typeof AnnexPreviewModal>[0]['annexData']>(null);
  const [loadingAnnexPreview, setLoadingAnnexPreview] = useState(false);
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

  useEffect(() => {
    if (!annexPreviewId || !studioSlug) return;
    setLoadingAnnexPreview(true);
    setAnnexPreviewData(null);
    getAnnexPreviewData(studioSlug, annexPreviewId)
      .then((result) => {
        if (result.success && result.data) {
          setAnnexPreviewData({
            masterContractId: result.data.masterContractId,
            masterContractDate: result.data.masterContractDate,
            cotizacionData: result.data.cotizacionData,
            condicionesData: result.data.condicionesData,
            deliveryPolicy: result.data.deliveryPolicy,
          });
        }
      })
      .finally(() => setLoadingAnnexPreview(false));
  }, [annexPreviewId, studioSlug]);

  const { totalContract, totalPaid, balanceDue, breakdown } = useMemo(() => {
    const allQuotes: QuoteSnapshot[] =
      initialQuote == null
        ? []
        : Array.isArray(initialQuote)
          ? [...initialQuote]
          : [initialQuote];
    const approvedQuotes = allQuotes.filter((q) =>
      !q.status || APPROVED_STATUSES.includes(String(q.status).toLowerCase())
    );
    let contractTotal = computeContractTotalFromQuotes(approvedQuotes);
    if (approvedQuotes.length === 0 && contractValueFallback != null) {
      contractTotal = contractValueFallback;
    }
    const fromQuotes = computeFinancialSummary(
      contractTotal,
      payments.map((p) => ({ amount: p.amount }))
    );
    const totalPaid =
      paidAmountFallback != null && approvedQuotes.length === 0
        ? paidAmountFallback
        : fromQuotes.totalPaid;
    const balanceDue =
      pendingAmountFallback != null && approvedQuotes.length === 0
        ? pendingAmountFallback
        : fromQuotes.balanceDue;
    const breakdown =
      allQuotes.length > 0
        ? allQuotes.map((q) => {
            const id = (q as { id?: string }).id ?? null;
            const name = (q as { name?: string }).name?.trim() || 'Sin nombre';
            const isApproved = !q.status || APPROVED_STATUSES.includes(String(q.status).toLowerCase());
            const micro = getQuoteMicroSummary(q);
            return {
              id,
              name,
              total: micro.total,
              isPending: !isApproved,
              precioLista: micro.precioLista,
              montoCortesias: micro.montoCortesias,
              cortesiasCount: micro.cortesiasCount,
              montoBono: micro.montoBono,
              ajusteCierre: micro.ajusteCierre,
              anticipo: micro.anticipo,
              diferido: micro.diferido,
              advancePct: micro.advancePct,
              advanceType: micro.advanceType,
            };
          })
        : [];
    return {
      totalContract: contractTotal,
      totalPaid,
      balanceDue,
      breakdown,
    };
  }, [initialQuote, payments, contractValueFallback, paidAmountFallback, pendingAmountFallback, mainCotizacionId]);

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
        <ZenCardContent className="px-4 pt-4 pb-4 space-y-4">
          {/* Lista de cotizaciones (Maestra + Anexos) — expandible, estilo Agenda */}
          {breakdown.length > 0 && (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-zinc-800/50 transition-colors"
                onClick={() => setQuotesListExpanded((v) => !v)}
              >
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Cotizaciones</span>
                <span className="text-zinc-500 shrink-0">
                  {quotesListExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              </button>
              {quotesListExpanded && (
                <ul className="border-t border-zinc-700/50 divide-y divide-zinc-700/50">
                  {breakdown.map((row) => {
                    const rowKey = row.id ?? row.name;
                    const isRowExpanded = expandedQuoteId === rowKey;
                    const isPending = row.isPending;
                    return (
                      <li key={rowKey}>
                        <button
                          type="button"
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors ${isPending ? 'hover:bg-zinc-800/50' : 'hover:bg-emerald-950/20'}`}
                          onClick={() => setExpandedQuoteId(isRowExpanded ? null : rowKey)}
                        >
                          <span className={`truncate min-w-0 ${isPending ? 'text-zinc-400' : 'text-emerald-100 font-medium'}`}>{row.name}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`tabular-nums text-sm ${isPending ? 'text-zinc-500' : 'text-emerald-300'}`}>{formatearMoneda(row.total)}</span>
                            {isRowExpanded ? <ChevronUp className="h-3 w-3 text-zinc-500" /> : <ChevronDown className="h-3 w-3 text-zinc-500" />}
                          </span>
                        </button>
                        {isRowExpanded && (
                          <div className="px-3 pb-3 pt-2 border-t border-zinc-700/30">
                            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                              <h4 className="text-sm font-semibold text-white mb-3">Resumen de Cierre</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="text-zinc-400">Precio de lista</span>
                                  <span className="tabular-nums font-medium text-zinc-300">{formatearMoneda(row.precioLista)}</span>
                                </div>
                                {row.montoCortesias > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Cortesías{row.cortesiasCount > 0 ? ` (${row.cortesiasCount})` : ''}</span>
                                    <span className="tabular-nums font-medium text-violet-400">−{formatearMoneda(row.montoCortesias)}</span>
                                  </div>
                                )}
                                {row.montoBono > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Bono Especial</span>
                                    <span className="tabular-nums font-medium text-amber-400">−{formatearMoneda(row.montoBono)}</span>
                                  </div>
                                )}
                                {Math.abs(row.ajusteCierre) >= 0.01 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Ajuste por cierre</span>
                                    <span className="tabular-nums font-medium text-zinc-300">
                                      {row.ajusteCierre < 0 ? '−' : '+'}{formatearMoneda(Math.abs(row.ajusteCierre))}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center pt-1.5 border-t border-zinc-700">
                                  <span className="font-semibold text-white">Total a pagar</span>
                                  <span className="text-lg font-bold text-emerald-400 tabular-nums">{formatearMoneda(row.total)}</span>
                                </div>
                                {row.anticipo > 0 && (
                                  <div className="space-y-1 -mt-1">
                                    <div className="flex justify-between items-center pt-0.5">
                                      <span className="text-zinc-400">
                                        {row.advanceType === 'fixed_amount' || row.advanceType === 'Fixed_amount' || row.advanceType === 'amount'
                                          ? 'Anticipo'
                                          : `Anticipo (${row.advancePct ?? 0}%)`}
                                      </span>
                                      <span className="text-sm font-medium text-blue-400 tabular-nums">{formatearMoneda(row.anticipo)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-zinc-400">
                                        Diferido
                                        {row.diferido > 0 && (
                                          <span className="text-xs text-zinc-500 ml-1">(a liquidar 2 días antes del evento)</span>
                                        )}
                                      </span>
                                      <span className="text-sm font-medium text-zinc-300 tabular-nums">{formatearMoneda(row.diferido)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            {(row.id === mainCotizacionId && hasContract) || (row.id && row.id !== mainCotizacionId) ? (
                              <ZenButton
                                variant="outline"
                                size="sm"
                                className="w-full gap-1.5 mt-3 border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-300 hover:border-emerald-500/40"
                                onClick={() =>
                                  row.id === mainCotizacionId && hasContract
                                    ? window.dispatchEvent(new CustomEvent('open-contrato-preview'))
                                    : setAnnexPreviewId(row.id)
                                }
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Ver documento
                              </ZenButton>
                            ) : null}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Bloques Contratado / Pagado / Pendiente — sin desglose interno */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-700/50">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">Contratado</p>
              <p className="font-semibold text-zinc-200 tabular-nums">{formatearMoneda(totalContract)}</p>
            </div>
            <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-500/30">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">Pagado</p>
              <p className="font-semibold text-emerald-400 tabular-nums">{formatearMoneda(totalPaid)}</p>
            </div>
            <div className="p-3 bg-amber-950/30 rounded-lg border border-amber-500/30">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">Pendiente</p>
              <p className="font-semibold text-amber-400 tabular-nums">{formatearMoneda(balanceDue)}</p>
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

      <AnnexPreviewModal
        isOpen={!!annexPreviewId}
        onClose={() => {
          setAnnexPreviewId(null);
          setAnnexPreviewData(null);
        }}
        title={annexPreviewId ? breakdown.find((r) => r.id === annexPreviewId)?.name ?? 'Anexo' : 'Anexo'}
        annexData={annexPreviewData}
        loading={loadingAnnexPreview}
      />
    </>
  );
}
