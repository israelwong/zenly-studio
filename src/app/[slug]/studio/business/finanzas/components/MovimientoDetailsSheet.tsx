'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Calendar, Clock, FileSpreadsheet, ExternalLink, CheckCircle, Trash2, Edit, Repeat } from 'lucide-react';
import { ZenButton, ZenBadge, ZenConfirmModal } from '@/components/ui/zen';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/shadcn/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Transaction } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import type { DevolucionPendienteGrupo } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { cancelarPagoGastoRecurrente, eliminarGastoRecurrente } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { UniversalFinanceModal } from '@/components/shared/finanzas/UniversalFinanceModal';
import { RegistrarGastoRecurrenteModal } from './RegistrarGastoRecurrenteModal';

/** Gasto recurrente pendiente de pago (desde Por pagar). */
export interface GastoRecurrenteForSheet {
    id: string;
    name: string;
    amount: number;
    category?: string;
    frequency?: string;
    chargeDay?: number;
    paymentMethod?: string | null;
}

export type DetailsSheetData =
    | { type: 'transaction'; data: Transaction }
    | { type: 'devolucion'; data: DevolucionPendienteGrupo }
    | { type: 'gasto_recurrente'; data: GastoRecurrenteForSheet }
    | null;

interface MovimientoDetailsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: DetailsSheetData;
    studioSlug: string;
    /** Refrescar datos tras devolución, pago recurrente o edición/eliminación. */
    onDevolucionConfirmada?: () => void;
}

function getFrequencyLabel(frequency?: string): string {
    switch (frequency) {
        case 'monthly':
            return 'Mensual';
        case 'biweekly':
            return 'Quincenal';
        case 'weekly':
            return 'Semanal';
        default:
            return frequency ? String(frequency) : 'Mensual';
    }
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
const formatEventDate = (date: Date | null | undefined) =>
    date ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date)) : '—';

export function MovimientoDetailsSheet({
    open,
    onOpenChange,
    data,
    studioSlug,
    onDevolucionConfirmada,
}: MovimientoDetailsSheetProps) {
    const [showPaymentSourceModal, setShowPaymentSourceModal] = useState(false);
    const [showEliminarPagoModal, setShowEliminarPagoModal] = useState(false);
    const [isEliminandoPago, setIsEliminandoPago] = useState(false);
    const [showEditRecurrenteModal, setShowEditRecurrenteModal] = useState(false);
    const [showGastoDeleteOptionsModal, setShowGastoDeleteOptionsModal] = useState(false);
    const [showGastoDeleteConfirmModal, setShowGastoDeleteConfirmModal] = useState(false);
    const [gastoDeleteType, setGastoDeleteType] = useState<'single' | 'all' | 'future'>('future');
    const [isDeletingGasto, setIsDeletingGasto] = useState(false);
    const [showPagarGastoModal, setShowPagarGastoModal] = useState(false);

    const isTransaction = data?.type === 'transaction';
    const isDevolucion = data?.type === 'devolucion';
    const isGastoRecurrente = data?.type === 'gasto_recurrente';
    const transaction = isTransaction ? data.data : null;
    const grupo = isDevolucion ? data.data : null;
    const gastoRecurrente = isGastoRecurrente ? data.data : null;

    const isPendienteDevolucion = isTransaction && transaction?.paymentStatus === 'pending_refund';
    const showConfirmarDevolucion = isPendienteDevolucion || isDevolucion;

    const totalAmount = isTransaction ? Math.abs(transaction!.monto) : (grupo?.totalAmount ?? 0);
    const paymentIds = isTransaction
        ? (transaction!.paymentIds ?? [transaction!.id])
        : (grupo?.payments.map((p) => p.id) ?? []);

    const handleDevolucionSuccess = async () => {
        setShowPaymentSourceModal(false);
        onOpenChange(false);
        await onDevolucionConfirmada?.();
    };

    const canEliminarPago =
        isTransaction &&
        transaction!.fuente === 'evento' &&
        transaction!.monto > 0 &&
        transaction!.paymentStatus !== 'pending_refund';

    const handleConfirmEliminarPago = async () => {
        if (!isTransaction || !transaction) return;
        const pagoId = transaction.paymentIds?.[0] ?? transaction.id;
        setIsEliminandoPago(true);
        try {
            const { eliminarPago } = await import('@/lib/actions/studio/business/events/payments.actions');
            const result = await eliminarPago(studioSlug, pagoId);
            if (result.success) {
                toast.success('Pago eliminado correctamente');
                setShowEliminarPagoModal(false);
                onOpenChange(false);
                await onDevolucionConfirmada?.();
            } else {
                toast.error(result.error ?? 'Error al eliminar pago');
            }
        } catch (error) {
            console.error('Error eliminando pago:', error);
            toast.error('Error al eliminar pago');
        } finally {
            setIsEliminandoPago(false);
        }
    };

    if (!data) return null;

    const handleGastoDeleteOptionSelect = (type: 'single' | 'all' | 'future') => {
        setGastoDeleteType(type);
        setShowGastoDeleteOptionsModal(false);
        setShowGastoDeleteConfirmModal(true);
    };

    const handleConfirmEliminarGasto = async () => {
        if (!gastoRecurrente) return;
        setIsDeletingGasto(true);
        try {
            if (gastoDeleteType === 'single') {
                await cancelarPagoGastoRecurrente(studioSlug, gastoRecurrente.id);
            }
            const result = await eliminarGastoRecurrente(studioSlug, gastoRecurrente.id, {
                deleteType: gastoDeleteType === 'single' ? 'future' : gastoDeleteType,
            });
            if (result.success) {
                const messages = {
                    single: 'Configuración eliminada y último pago del mes revertido',
                    all: 'Configuración e histórico eliminados',
                    future: 'Configuración eliminada. Los pagos históricos se mantienen',
                };
                toast.success(messages[gastoDeleteType]);
                setShowGastoDeleteConfirmModal(false);
                onOpenChange(false);
                await onDevolucionConfirmada?.();
            } else {
                toast.error(result.error ?? 'Error al eliminar gasto recurrente');
            }
        } catch (error) {
            console.error('Error eliminando gasto recurrente:', error);
            toast.error('Error al eliminar gasto recurrente');
        } finally {
            setIsDeletingGasto(false);
        }
    };

    const handlePagarGastoSuccess = async () => {
        setShowPagarGastoModal(false);
        onOpenChange(false);
        await onDevolucionConfirmada?.();
    };

    const isDevolucionType =
        isDevolucion ||
        (isTransaction &&
            (transaction!.paymentStatus === 'pending_refund' || transaction!.categoria === 'devolucion'));
    const movementTypeLabel = isDevolucionType
        ? 'Devolución'
        : isGastoRecurrente
          ? 'Gasto recurrente'
          : isTransaction
            ? transaction!.fuente === 'operativo' && transaction!.categoria === 'Recurrente'
                ? 'Pago recurrente'
                : transaction!.fuente === 'evento' && transaction!.monto > 0
                    ? 'Anticipo'
                    : null
            : null;

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col p-0"
                >
                    <SheetHeader className="border-b border-zinc-800 px-4 py-4 flex-shrink-0">
                        <SheetTitle className="text-zinc-200">Detalles del movimiento</SheetTitle>
                    </SheetHeader>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {movementTypeLabel && (
                            <p
                                className={cn(
                                    'text-2xl font-semibold mb-3',
                                    movementTypeLabel === 'Anticipo' ? 'text-emerald-400' : 'text-rose-400'
                                )}
                            >
                                {movementTypeLabel}
                            </p>
                        )}
                        <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4 mb-4 space-y-2 text-sm">
                            {isGastoRecurrente ? (
                                <>
                                    {gastoRecurrente!.category && (
                                        <p className="flex items-center gap-2 min-w-0">
                                            <FileSpreadsheet className="h-4 w-4 text-zinc-500 shrink-0" />
                                            <span className="text-zinc-500 shrink-0">Categoría:</span>
                                            <span className="text-zinc-300 truncate">{gastoRecurrente!.category}</span>
                                        </p>
                                    )}
                                    <p className="flex items-center gap-2 min-w-0">
                                        <Repeat className="h-4 w-4 text-zinc-500 shrink-0" />
                                        <span className="text-zinc-500 shrink-0">Frecuencia:</span>
                                        <span className="text-zinc-300">
                                            {getFrequencyLabel(gastoRecurrente!.frequency)}
                                            {gastoRecurrente!.chargeDay != null ? ` · Día ${gastoRecurrente!.chargeDay}` : ''}
                                        </span>
                                    </p>
                                </>
                            ) : (
                                <>
                                    {(isTransaction ? transaction!.contactName : grupo!.contactName) && (
                                        <p className="flex items-center gap-2 min-w-0">
                                            <User className="h-4 w-4 text-zinc-500 shrink-0" />
                                            <span className="text-zinc-500 shrink-0">Contacto:</span>
                                            <span className="text-zinc-300 truncate">
                                                {isTransaction ? transaction!.contactName : grupo!.contactName}
                                            </span>
                                        </p>
                                    )}
                                    {(isTransaction ? (transaction!.eventTypeName || transaction!.eventName) : grupo!.eventName) && (
                                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                            <FileSpreadsheet className="h-4 w-4 text-zinc-500 shrink-0" />
                                            {isTransaction && transaction!.eventTypeName && (
                                                <ZenBadge
                                                    variant="outline"
                                                    className="bg-emerald-500/20 text-emerald-400 border-emerald-400/50 font-medium px-1.5 py-0 text-[10px] rounded-full shrink-0"
                                                >
                                                    {transaction!.eventTypeName}
                                                </ZenBadge>
                                            )}
                                            <span className="text-zinc-300 truncate">
                                                {isTransaction ? transaction!.eventName : grupo!.eventName}
                                            </span>
                                        </div>
                                    )}
                                    {isTransaction && (
                                        <>
                                            <p className="flex items-center gap-2 min-w-0">
                                                <Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
                                                <span className="text-zinc-500 shrink-0 whitespace-nowrap">Fecha evento:</span>
                                                <span className="text-zinc-300">
                                                    {transaction!.eventDate ? formatEventDate(transaction!.eventDate) : '—'}
                                                </span>
                                            </p>
                                            <p className="flex items-center gap-2 min-w-0">
                                                <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
                                                <span className="text-zinc-500 shrink-0 whitespace-nowrap">Fecha de pago:</span>
                                                <span className="text-zinc-300">{formatDate(transaction!.fecha)}</span>
                                            </p>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                        <p className="text-xs font-medium text-zinc-500 mb-2">
                            {isGastoRecurrente
                                ? 'Pagos'
                                : isDevolucion || (isTransaction && transaction!.details && transaction!.details.length > 1)
                                  ? 'Pagos'
                                  : 'Movimiento'}
                        </p>
                        <div className="border border-zinc-700 rounded-lg overflow-hidden">
                            {isGastoRecurrente
                                ? (
                                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-700">
                                        <p className="text-sm font-medium text-zinc-200 truncate">{gastoRecurrente!.name}</p>
                                        <span className="text-sm font-medium shrink-0 tabular-nums text-rose-400">
                                            {formatCurrency(gastoRecurrente!.amount)}
                                        </span>
                                    </div>
                                )
                                : isDevolucion
                                    ? grupo!.payments.map((p) => (
                                          <div
                                              key={p.id}
                                              className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-700 last:border-b-0"
                                          >
                                              <p className="text-sm font-medium text-zinc-200 truncate">{p.concept}</p>
                                              <span className="text-sm font-medium shrink-0 tabular-nums text-rose-400">
                                                  {formatCurrency(p.amount)}
                                              </span>
                                          </div>
                                      ))
                                    : isTransaction &&
                                      (transaction!.details && transaction!.details.length > 0
                                          ? transaction!.details
                                          : [
                                                {
                                                    concepto: transaction!.concepto,
                                                    categoria: transaction!.categoria,
                                                    monto: transaction!.monto,
                                                    paymentStatus: transaction!.paymentStatus,
                                                    metodoPago: transaction!.metodoPago,
                                                },
                                            ]
                                      ).map((d: { concepto: string; categoria: string; monto: number; metodoPago?: string }, i: number) => (
                                          <div
                                              key={i}
                                              className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-700 last:border-b-0"
                                          >
                                              <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium text-zinc-200 truncate">{d.concepto}</p>
                                                  <span className="text-xs text-zinc-500">{d.categoria}</span>
                                              </div>
                                              <span
                                                  className={cn(
                                                      'text-sm font-medium shrink-0 tabular-nums',
                                                      d.monto >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                                  )}
                                              >
                                                  {formatCurrency(d.monto)}
                                              </span>
                                          </div>
                                      ))}
                            <div className="flex items-center justify-between gap-3 px-4 py-4 bg-zinc-800/50">
                                <p className="text-base font-semibold text-zinc-100">Total consolidado</p>
                                <span
                                    className={cn(
                                        'text-lg font-bold shrink-0 tabular-nums',
                                        isGastoRecurrente
                                            ? 'text-rose-400'
                                            : isTransaction && transaction!.monto >= 0
                                              ? 'text-emerald-400'
                                              : 'text-rose-400'
                                    )}
                                >
                                    {formatCurrency(
                                        isGastoRecurrente
                                            ? gastoRecurrente!.amount
                                            : isTransaction
                                              ? transaction!.monto
                                              : -(grupo?.totalAmount ?? 0)
                                    )}
                                </span>
                            </div>
                        </div>
                        {(isTransaction && (canEliminarPago || transaction!.eventoId || transaction!.promiseId)) ||
                        showConfirmarDevolucion ||
                        isGastoRecurrente ? (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {isGastoRecurrente && (
                                    <>
                                        <ZenButton
                                            variant="outline"
                                            size="sm"
                                            className="inline-flex items-center gap-2 rounded-md border border-zinc-600/80 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-200"
                                            onClick={() => setShowEditRecurrenteModal(true)}
                                        >
                                            <Edit className="h-4 w-4 shrink-0" />
                                            Editar
                                        </ZenButton>
                                        <ZenButton
                                            variant="outline"
                                            size="sm"
                                            className="inline-flex items-center gap-2 rounded-md border border-zinc-600/80 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/20 hover:border-red-800/50"
                                            onClick={() => setShowGastoDeleteOptionsModal(true)}
                                        >
                                            <Trash2 className="h-4 w-4 shrink-0" />
                                            Eliminar
                                        </ZenButton>
                                        <ZenButton
                                            variant="default"
                                            size="sm"
                                            className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium h-[38px] bg-emerald-600 hover:bg-emerald-500 text-white flex-1 min-w-0"
                                            onClick={() => setShowPagarGastoModal(true)}
                                        >
                                            <CheckCircle className="h-4 w-4 shrink-0" />
                                            Pagar
                                        </ZenButton>
                                    </>
                                )}
                                {isTransaction && canEliminarPago && (
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        className="inline-flex items-center gap-2 rounded-md border border-zinc-600/80 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                                        onClick={() => setShowEliminarPagoModal(true)}
                                    >
                                        <Trash2 className="h-4 w-4 shrink-0" />
                                        Eliminar pago
                                    </ZenButton>
                                )}
                                {isTransaction && transaction!.eventoId && (
                                    <Link
                                        href={`/${studioSlug}/studio/business/events/${transaction!.eventoId}`}
                                        className="inline-flex items-center gap-2 rounded-md border border-zinc-600/80 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/80 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-zinc-400" />
                                        Ver evento
                                    </Link>
                                )}
                                {isTransaction && transaction!.promiseId && (
                                    <Link
                                        href={`/${studioSlug}/studio/commercial/promises/${transaction!.promiseId}`}
                                        className="inline-flex items-center gap-2 rounded-md border border-zinc-600/80 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/80 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                                    >
                                        <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400" />
                                        Ver cotización
                                    </Link>
                                )}
                                {showConfirmarDevolucion && (
                                    <ZenButton
                                        variant="default"
                                        size="sm"
                                        className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium h-[38px] bg-emerald-600 hover:bg-emerald-500 text-white flex-1 min-w-0"
                                        onClick={() => setShowPaymentSourceModal(true)}
                                    >
                                        <CheckCircle className="h-4 w-4 shrink-0" />
                                        Confirmar devolución
                                    </ZenButton>
                                )}
                            </div>
                        ) : null}
                    </div>
                </SheetContent>
            </Sheet>

            <UniversalFinanceModal
                isOpen={showPaymentSourceModal}
                onClose={() => setShowPaymentSourceModal(false)}
                studioSlug={studioSlug}
                mode="refund"
                data={{
                    amount: totalAmount,
                    title: 'Devolución',
                    paymentIds,
                    contactName: isTransaction ? transaction!.contactName : grupo!.contactName,
                    eventName: isTransaction ? transaction!.eventName : grupo!.eventName,
                    eventTypeName: isTransaction ? transaction!.eventTypeName : undefined,
                }}
                onSuccess={handleDevolucionSuccess}
            />

            {isGastoRecurrente && gastoRecurrente && (
                <>
                    <UniversalFinanceModal
                        isOpen={showPagarGastoModal}
                        onClose={() => setShowPagarGastoModal(false)}
                        studioSlug={studioSlug}
                        mode="expense"
                        data={{
                            amount: gastoRecurrente.amount,
                            title: gastoRecurrente.name,
                            subtitle: `Gasto recurrente · ${getFrequencyLabel(gastoRecurrente.frequency)}`,
                            expenseId: gastoRecurrente.id,
                        }}
                        preselectedMethod={
                            gastoRecurrente.paymentMethod?.toLowerCase() === 'efectivo' ||
                            gastoRecurrente.paymentMethod?.toLowerCase() === 'transferencia' ||
                            gastoRecurrente.paymentMethod?.toLowerCase() === 'credit_card'
                                ? (gastoRecurrente.paymentMethod?.toLowerCase() as 'efectivo' | 'transferencia' | 'credit_card')
                                : undefined
                        }
                        onSuccess={handlePagarGastoSuccess}
                    />
                    <RegistrarGastoRecurrenteModal
                        isOpen={showEditRecurrenteModal}
                        onClose={() => setShowEditRecurrenteModal(false)}
                        studioSlug={studioSlug}
                        expenseId={gastoRecurrente.id}
                        onSuccess={async () => {
                            setShowEditRecurrenteModal(false);
                            onOpenChange(false);
                            await onDevolucionConfirmada?.();
                        }}
                    />
                    <ZenConfirmModal
                        isOpen={showGastoDeleteOptionsModal}
                        onClose={() => setShowGastoDeleteOptionsModal(false)}
                        onConfirm={() => {}}
                        title="Eliminar configuración del gasto recurrente"
                        description={
                            <div className="space-y-3">
                                <p className="text-sm text-zinc-300">
                                    Se eliminará la configuración de &quot;{gastoRecurrente.name}&quot; (ya no se generarán pagos futuros). Elige qué hacer con los pagos ya registrados:
                                </p>
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => handleGastoDeleteOptionSelect('future')}
                                        className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                                    >
                                        <div className="font-medium text-sm text-zinc-200">Mantener históricos</div>
                                        <div className="text-xs text-zinc-400 mt-0.5">Solo se borra la configuración; los pagos ya registrados quedan en el historial.</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleGastoDeleteOptionSelect('single')}
                                        className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                                    >
                                        <div className="font-medium text-sm text-zinc-200">Eliminar también pagos del mes</div>
                                        <div className="text-xs text-zinc-400 mt-0.5">Quita la configuración y los pagos de este mes.</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleGastoDeleteOptionSelect('all')}
                                        className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                                    >
                                        <div className="font-medium text-sm text-zinc-200">Eliminar todo (configuración e histórico)</div>
                                        <div className="text-xs text-zinc-400 mt-0.5">Borra la configuración y todos los pagos registrados. No se puede deshacer.</div>
                                    </button>
                                </div>
                            </div>
                        }
                        confirmText=""
                        cancelText="Cancelar"
                        variant="default"
                        hideConfirmButton
                    />
                    <ZenConfirmModal
                        isOpen={showGastoDeleteConfirmModal}
                        onClose={() => setShowGastoDeleteConfirmModal(false)}
                        onConfirm={handleConfirmEliminarGasto}
                        title="¿Confirmar eliminación?"
                        description={
                            gastoDeleteType === 'future'
                                ? `Se eliminará la configuración de "${gastoRecurrente.name}". Los pagos ya registrados se mantendrán en el historial.`
                                : gastoDeleteType === 'single'
                                    ? `Se eliminará la configuración de "${gastoRecurrente.name}" y los pagos de este mes.`
                                    : `Se eliminará la configuración de "${gastoRecurrente.name}" y todos los pagos históricos. Esta acción no se puede deshacer.`
                        }
                        confirmText="Sí, eliminar"
                        cancelText="No, cancelar"
                        variant="destructive"
                        loading={isDeletingGasto}
                        loadingText="Eliminando..."
                    />
                </>
            )}

            {isTransaction && (
                <ZenConfirmModal
                    isOpen={showEliminarPagoModal}
                    onClose={() => setShowEliminarPagoModal(false)}
                    onConfirm={handleConfirmEliminarPago}
                    title="¿Eliminar pago?"
                    description={`Esta acción eliminará permanentemente el pago "${transaction!.concepto}" por ${formatCurrency(transaction!.monto)} y los items asociados. Esta acción no se puede deshacer.`}
                    confirmText="Sí, eliminar"
                    cancelText="Cancelar"
                    variant="destructive"
                    loading={isEliminandoPago}
                    loadingText="Eliminando..."
                />
            )}
        </>
    );
}
