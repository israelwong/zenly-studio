'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, History, ChevronDown, ChevronUp, MoreVertical, Edit, XCircle, Trash2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenBadge, ZenConfirmModal, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { AnnexPreviewModal } from '@/components/shared/annex';
import { CotizacionPreviewModal } from '@/components/shared/cotizaciones';
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
import { cancelarCotizacion, deleteCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { CancelationWithFundsModal } from '@/components/shared/cancelation/CancelationWithFundsModal';
import { toast } from 'sonner';

const APPROVED_STATUSES = ['autorizada', 'aprobada', 'approved'];

export interface PaymentSummaryItem {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: Date;
  concept: string;
  cotizacion_id?: string | null;
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
  /** ID de la promesa (para modal Vista Previa de Cotización). */
  promiseId?: string | null;
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
  promiseId = null,
}: EventFinancialSummaryCardProps) {
  const [payments, setPayments] = useState<PaymentItem[]>(() =>
    initialPayments.map(toPaymentItem)
  );
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [anexosGroupExpanded, setAnexosGroupExpanded] = useState(true);
  const [annexPreviewId, setAnnexPreviewId] = useState<string | null>(null);
  const [annexPreviewData, setAnnexPreviewData] = useState<Parameters<typeof AnnexPreviewModal>[0]['annexData']>(null);
  const [loadingAnnexPreview, setLoadingAnnexPreview] = useState(false);
  const [cotizacionPreviewId, setCotizacionPreviewId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [annexMenuOpenId, setAnnexMenuOpenId] = useState<string | null>(null);
  const [annexCancelWithFunds, setAnnexCancelWithFunds] = useState<{ id: string; name: string } | null>(null);
  const [annexCancelSimple, setAnnexCancelSimple] = useState<{ id: string; name: string } | null>(null);
  const [annexDeleteConfirm, setAnnexDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [annexActionLoading, setAnnexActionLoading] = useState(false);
  const router = useRouter();

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

  const { totalContract, totalPaid, balanceDue, breakdown, showAnexosSeparatorAfterIndex, anexosLabel } = useMemo(() => {
    const rawQuotes: QuoteSnapshot[] =
      initialQuote == null
        ? []
        : Array.isArray(initialQuote)
          ? [...initialQuote]
          : [initialQuote];
    // Filtrar cotizaciones sin id o con estado eliminada (integridad: evitar referencias huérfanas)
    const allQuotes = rawQuotes.filter((q) => {
      const id = (q as { id?: string }).id;
      const status = (q as { status?: string }).status ?? '';
      return id != null && id !== '' && status.toLowerCase() !== 'deleted';
    });
    const isAnnex = (q: QuoteSnapshot) => (q as { parent_cotizacion_id?: string | null }).parent_cotizacion_id != null;
    const masterFirst = [...allQuotes].sort((a, b) => {
      const aId = (a as { id?: string }).id;
      const bId = (b as { id?: string }).id;
      const aMaster = aId === mainCotizacionId || !isAnnex(a);
      const bMaster = bId === mainCotizacionId || !isAnnex(b);
      if (aMaster && !bMaster) return -1;
      if (!aMaster && bMaster) return 1;
      return 0;
    });
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
      masterFirst.length > 0
        ? masterFirst.map((q) => {
            const id = (q as { id?: string }).id ?? null;
            const name = (q as { name?: string }).name?.trim() || 'Sin nombre';
            const status = (q as { status?: string }).status ?? null;
            const isApproved = !q.status || APPROVED_STATUSES.includes(String(q.status).toLowerCase());
            const micro = getQuoteMicroSummary(q);
            return {
              id,
              name,
              status,
              total: micro.total,
              isPending: !isApproved,
              isAnnex: isAnnex(q),
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
    const firstAnnexIdx = breakdown.findIndex((r) => r.isAnnex);
    const annexCount = breakdown.filter((r) => r.isAnnex).length;
    const showAnexosSeparatorAfterIndex = firstAnnexIdx > 0 ? firstAnnexIdx - 1 : -1;
    const anexosLabel = annexCount > 1 ? `Anexos (${annexCount} anexos)` : 'Anexos';
    return {
      totalContract: contractTotal,
      totalPaid,
      balanceDue,
      breakdown,
      showAnexosSeparatorAfterIndex,
      anexosLabel,
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

  const hasPaymentsForAnnex = (cotizacionId: string) =>
    initialPayments.some((p) => (p as { cotizacion_id?: string | null }).cotizacion_id === cotizacionId);

  const handleAnnexEdit = (row: (typeof breakdown)[0]) => {
    setAnnexMenuOpenId(null);
    if (!row.id || !promiseId || !studioSlug) return;
    if (!row.isPending) {
      toast.info('Este anexo está autorizado. Los cambios pueden requerir una nueva versión.');
    }
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${row.id}?from=evento&returnUrl=${encodeURIComponent(`/${studioSlug}/studio/business/events/${eventId || ''}`)}`);
  };

  const handleAnnexCancelWithFundsConfirm = async (data: { reason: string; requestedBy: 'estudio' | 'cliente'; fundDestination: 'retain' | 'refund' }) => {
    if (!annexCancelWithFunds?.id || !studioSlug) {
      toast.error('Datos incompletos para cancelar');
      return;
    }
    setAnnexActionLoading(true);
    try {
      const result = await cancelarCotizacion(studioSlug, annexCancelWithFunds.id, {
        motivo: data.reason,
        solicitante: data.requestedBy,
        destinoFondos: data.fundDestination,
      });
      if (result.success) {
        toast.success('Anexo cancelado');
        setAnnexCancelWithFunds(null);
        onPaymentAdded?.();
      } else {
        toast.error(result.error ?? 'Error al cancelar');
      }
    } finally {
      setAnnexActionLoading(false);
    }
  };

  const handleAnnexCancelSimpleConfirm = async () => {
    if (!annexCancelSimple?.id || !studioSlug) {
      toast.error('Datos incompletos para cancelar');
      return;
    }
    setAnnexActionLoading(true);
    try {
      const result = await cancelarCotizacion(studioSlug, annexCancelSimple.id);
      if (result.success) {
        toast.success('Anexo cancelado');
        setAnnexCancelSimple(null);
        onPaymentAdded?.();
      } else {
        toast.error(result.error ?? 'Error al cancelar');
      }
    } finally {
      setAnnexActionLoading(false);
    }
  };

  const handleAnnexDeleteConfirm = async () => {
    if (!annexDeleteConfirm?.id || !studioSlug) {
      toast.error('Datos incompletos para eliminar');
      return;
    }
    setAnnexActionLoading(true);
    try {
      const result = await deleteCotizacion(annexDeleteConfirm.id, studioSlug);
      if (result.success) {
        toast.success('Anexo eliminado');
        setAnnexDeleteConfirm(null);
        onPaymentAdded?.();
      } else {
        toast.error(result.error ?? 'Error al eliminar');
      }
    } finally {
      setAnnexActionLoading(false);
    }
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
                  Pago
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
                  Historial {payments.length}
                </ZenBadge>
              </ZenButton>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-0 pt-0 space-y-0">
          {/* Cotización maestra primero; si más de un anexo, grupo "Anexos (N anexos)" contraer/expandir */}
          {breakdown.length > 0 && (() => {
            const masterRows = breakdown.filter((r) => !r.isAnnex);
            const annexRows = breakdown.filter((r) => r.isAnnex);
            const renderRow = (row: (typeof breakdown)[0], indentAsChild?: boolean) => {
              const rowKey = row.id ?? row.name;
              const isRowExpanded = expandedQuoteId === rowKey;
              const isPending = row.isPending;
              const isMaster = row.id === mainCotizacionId;
              return (
                <li key={rowKey}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`w-full flex items-center justify-between gap-2 py-2.5 text-left transition-colors cursor-pointer ${indentAsChild ? 'bg-zinc-800/60 pl-6 pr-3' : 'bg-zinc-800/50 px-3'} hover:bg-zinc-800/70`}
                    onClick={() => setExpandedQuoteId(isRowExpanded ? null : rowKey)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedQuoteId(isRowExpanded ? null : rowKey);
                      }
                    }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isRowExpanded ? <ChevronUp className="h-3 w-3 text-zinc-500 shrink-0" /> : <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0" />}
                      <span className={`truncate text-sm ${isPending ? 'text-zinc-400' : 'text-emerald-100 font-medium'}`}>{row.name}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className={`text-xs tabular-nums ${isPending ? 'text-zinc-500' : 'text-emerald-300'}`}>{formatearMoneda(row.total)}</span>
                      {row.isAnnex && row.id && promiseId && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ZenDropdownMenu open={annexMenuOpenId === row.id} onOpenChange={(open) => setAnnexMenuOpenId(open ? row.id : null)}>
                            <ZenDropdownMenuTrigger asChild>
                              <ZenButton variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-300">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end">
                              <ZenDropdownMenuItem onClick={() => handleAnnexEdit(row)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </ZenDropdownMenuItem>
                              <ZenDropdownMenuSeparator />
                              <ZenDropdownMenuItem
                                onClick={() => {
                                  setAnnexMenuOpenId(null);
                                  const annexId = row.id;
                                  if (!annexId || typeof annexId !== 'string') {
                                    console.warn('[EventFinancialSummaryCard] Cancelar: row.id inválido', { row });
                                    toast.error('No se pudo identificar el anexo');
                                    return;
                                  }
                                  if (row.isPending || !hasPaymentsForAnnex(annexId)) {
                                    setAnnexCancelSimple({ id: annexId, name: row.name });
                                  } else {
                                    setAnnexCancelWithFunds({ id: annexId, name: row.name });
                                  }
                                }}
                                className="text-amber-400 focus:text-amber-300"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar
                              </ZenDropdownMenuItem>
                              <ZenDropdownMenuItem
                                onClick={() => {
                                  setAnnexMenuOpenId(null);
                                  const annexId = row.id;
                                  if (!annexId || typeof annexId !== 'string') {
                                    console.warn('[EventFinancialSummaryCard] Eliminar: row.id inválido', { row });
                                    toast.error('No se pudo identificar el anexo');
                                    return;
                                  }
                                  setAnnexDeleteConfirm({ id: annexId, name: row.name });
                                }}
                                className="text-red-400 focus:text-red-300"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                          </ZenDropdownMenu>
                        </div>
                      )}
                    </span>
                  </div>
                  {isRowExpanded && (
                    <div className={`pb-3 pt-4 border-t border-zinc-800 bg-zinc-900/30 ${indentAsChild ? 'pl-7 pr-3' : 'px-3'}`}>
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
                        <div className="flex justify-between items-center pt-1.5 border-t border-zinc-800">
                          <span className="font-semibold text-white">Total a pagar</span>
                          <span className="text-sm font-semibold text-emerald-400 tabular-nums">{formatearMoneda(row.total)}</span>
                        </div>
                        {row.anticipo > 0 && (
                          <div className="space-y-1 -mt-1">
                            <div className="flex justify-between items-center pt-0.5">
                              <span className="text-zinc-400">
                                {row.advanceType === 'fixed_amount' || row.advanceType === 'Fixed_amount' || row.advanceType === 'amount'
                                  ? 'Anticipo'
                                  : `Anticipo (${row.advancePct ?? 0}%)`}
                              </span>
                              <span className="text-sm font-medium tabular-nums text-blue-400">{formatearMoneda(row.anticipo)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400">
                                Diferido
                                {row.diferido > 0 && (
                                  <span className="text-xs text-zinc-500 ml-1">(a liquidar 2 días antes del evento)</span>
                                )}
                              </span>
                              <span className="text-sm font-medium tabular-nums text-zinc-300">{formatearMoneda(row.diferido)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {row.id ? (
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          className="w-full mt-3 py-2 text-sm bg-zinc-800/60 text-zinc-300 hover:text-emerald-400 hover:bg-zinc-700/60"
                          onClick={() => {
                            if (isMaster) {
                              if (hasContract) {
                                window.dispatchEvent(new CustomEvent('open-contrato-preview'));
                              } else {
                                setCotizacionPreviewId(row.id);
                              }
                            } else {
                              setAnnexPreviewId(row.id);
                            }
                          }}
                        >
                          {isMaster
                            ? hasContract
                              ? 'Ver contrato'
                              : 'Ver cotización'
                            : hasContract
                              ? 'Ver anexo'
                              : 'Ver cotización'}
                        </ZenButton>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            };
            return (
              <ul className="divide-y divide-zinc-800">
                {masterRows.map((row) => renderRow(row))}
                {annexRows.length > 1 ? (
                  <>
                    <li>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors bg-zinc-800/50 hover:bg-zinc-800/60 border-t border-zinc-800"
                        onClick={() => setAnexosGroupExpanded((e) => !e)}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {anexosGroupExpanded ? <ChevronUp className="h-3 w-3 text-zinc-500 shrink-0" /> : <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0" />}
                          <span className="text-sm font-medium text-zinc-400">Anexos</span>
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-600 text-xs font-medium text-zinc-200 tabular-nums">
                            {annexRows.length}
                          </span>
                        </span>
                        <span className="text-xs tabular-nums shrink-0 text-emerald-300">
                          {formatearMoneda(annexRows.reduce((s, r) => s + r.total, 0))}
                        </span>
                      </button>
                    </li>
                    {anexosGroupExpanded && annexRows.map((row) => renderRow(row, true))}
                  </>
                ) : annexRows.length === 1 ? (
                  <>
                    <li className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wide bg-zinc-600/30 border-t border-zinc-800">
                      {anexosLabel}
                    </li>
                    {renderRow(annexRows[0])}
                  </>
                ) : null}
              </ul>
            );
          })()}

          {/* Bloques Contratado / Pagado / Pendiente — 3 columnas, bordes de piso a cielo */}
          <div className="border-t border-zinc-800">
            <div className="grid grid-cols-3 divide-x divide-zinc-800 text-sm">
              <div className="py-4 px-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-0.5">Contratado</p>
                <p className="font-semibold text-zinc-200 tabular-nums">{formatearMoneda(totalContract)}</p>
              </div>
              <div className="py-4 px-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-0.5">Pagado</p>
                <p className="font-semibold text-emerald-400 tabular-nums">{formatearMoneda(totalPaid)}</p>
              </div>
              <div className="py-4 px-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-0.5">Pendiente</p>
                <p className="font-semibold text-amber-400 tabular-nums">{formatearMoneda(balanceDue)}</p>
              </div>
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

      <CotizacionPreviewModal
        isOpen={!!cotizacionPreviewId}
        onClose={() => setCotizacionPreviewId(null)}
        cotizacionId={cotizacionPreviewId}
        studioSlug={studioSlug}
        promiseId={promiseId}
        title={cotizacionPreviewId ? breakdown.find((r) => r.id === cotizacionPreviewId)?.name ?? 'Cotización' : 'Cotización'}
      />

      <CancelationWithFundsModal
        isOpen={!!annexCancelWithFunds}
        onClose={() => !annexActionLoading && setAnnexCancelWithFunds(null)}
        onConfirm={handleAnnexCancelWithFundsConfirm}
        title="Cancelar anexo"
        description={
          <p className="text-sm text-zinc-400">
            Hay pagos registrados en este anexo. Indica el motivo, quién solicita la cancelación y el destino del dinero.
          </p>
        }
        isLoading={annexActionLoading}
        saveLabel="Sí, cancelar"
        cancelLabel="No cancelar"
        showFundDestination
      />

      <ZenConfirmModal
        isOpen={!!annexCancelSimple}
        onClose={() => !annexActionLoading && setAnnexCancelSimple(null)}
        onConfirm={handleAnnexCancelSimpleConfirm}
        title="Cancelar anexo"
        description="¿Deseas cancelar este anexo? El estado pasará a cancelado."
        confirmText="Sí, cancelar"
        cancelText="No"
        variant="destructive"
        loading={annexActionLoading}
        loadingText="Cancelando..."
      />

      <ZenConfirmModal
        isOpen={!!annexDeleteConfirm}
        onClose={() => !annexActionLoading && setAnnexDeleteConfirm(null)}
        onConfirm={handleAnnexDeleteConfirm}
        title="Eliminar anexo"
        description="¿Eliminar permanentemente este anexo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={annexActionLoading}
        loadingText="Eliminando..."
      />
    </>
  );
}
