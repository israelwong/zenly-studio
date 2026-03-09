'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, X, Trash2, Edit, ExternalLink, User, Calendar, FileSpreadsheet, Clock, Tag, ArrowUp, ArrowDown, CheckCircle, Wallet, Landmark } from 'lucide-react';
import {
    ZenCard,
    ZenCardContent,
    ZenButton,
    ZenBadge,
    ZenConfirmModal,
} from '@/components/ui/zen';
import { PaymentReceipt } from '@/components/shared/payments/PaymentReceipt';
import { NominaReceipt } from '@/components/shared/payments/NominaReceipt';
import { RecurrenteReceipt } from '@/components/shared/payments/RecurrenteReceipt';
import { eliminarGastoOperativo, obtenerServiciosNomina } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { RegistrarMovimientoModal } from './RegistrarMovimientoModal';
import { UniversalFinanceModal } from '@/components/shared/finanzas/UniversalFinanceModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/shadcn/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TransactionDetail {
    monto: number;
    categoria: string;
    concepto: string;
    paymentStatus?: string;
    metodoPago?: string;
}

interface Transaction {
    id: string;
    fecha: Date;
    fuente: 'evento' | 'staff' | 'operativo';
    concepto: string;
    categoria: string;
    monto: number;
    nominaId?: string;
    nominaPaymentType?: string;
    isGastoOperativo?: boolean;
    totalDiscounts?: number;
    personalId?: string;
    promiseId?: string;
    cotizacionId?: string;
    paymentStatus?: string;
    contactName?: string | null;
    eventName?: string | null;
    eventTypeName?: string | null;
    eventDate?: Date | null;
    eventoId?: string | null;
    details?: TransactionDetail[];
    metodoPago?: string;
    paymentIds?: string[];
}

interface MovimientoItemCardProps {
    transaction: Transaction;
    studioSlug: string;
    onCancelarPago?: (id: string) => void;
    onGastoEliminado?: () => void;
    onNominaCancelada?: () => void;
    onGastoEditado?: () => void;
    onDevolucionConfirmada?: () => void;
    /** Si se pasa, al hacer clic se abre el detalle en el sheet del padre (no el local) */
    onOpenDetails?: (transaction: Transaction) => void;
}

export function MovimientoItemCard({
    transaction,
    studioSlug,
    onCancelarPago,
    onGastoEliminado,
    onNominaCancelada,
    onGastoEditado,
    onDevolucionConfirmada,
    onOpenDetails,
}: MovimientoItemCardProps) {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showPaymentSourceModal, setShowPaymentSourceModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showCancelNominaModal, setShowCancelNominaModal] = useState(false);
    const [showCancelRecurrenteModal, setShowCancelRecurrenteModal] = useState(false);
    const [showEliminarNominaModal, setShowEliminarNominaModal] = useState(false);
    const [showEliminarPagoModal, setShowEliminarPagoModal] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [isNominaReceiptModalOpen, setIsNominaReceiptModalOpen] = useState(false);
    const [isRecurrenteReceiptModalOpen, setIsRecurrenteReceiptModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCancellingNomina, setIsCancellingNomina] = useState(false);
    const [isEliminandoNomina, setIsEliminandoNomina] = useState(false);
    const [isEliminandoPago, setIsEliminandoPago] = useState(false);
    const [showDesgloseDialog, setShowDesgloseDialog] = useState(false);

    const isGroup = Boolean(transaction.details && transaction.details.length > 1);
    /** Detalle para el sheet: agrupado (varios) o un solo ítem */
    const sheetDetails: TransactionDetail[] =
        transaction.details && transaction.details.length > 0
            ? transaction.details
            : [
                  {
                      concepto: transaction.concepto,
                      categoria: transaction.categoria,
                      monto: transaction.monto,
                      paymentStatus: transaction.paymentStatus,
                      metodoPago: transaction.metodoPago,
                  },
              ];

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

    const formatEventDate = (date: Date | null | undefined) => {
        if (!date) return null;
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }).format(new Date(date));
    };

    const metodoPagoLabel = (metodo?: string | null) => {
        if (!metodo) return null;
        const m = String(metodo).toLowerCase();
        if (m.includes('efectivo')) return 'Efectivo';
        if (m.includes('spei') || m.includes('transferencia')) return 'Transferencia';
        return metodo;
    };

    const isIngreso = transaction.monto > 0;
    const isEgresoOperativo = !isIngreso && transaction.fuente === 'operativo';
    const isNominaPagada = !isIngreso && transaction.fuente === 'staff' && transaction.nominaId;
    const isNominaConsolidada = isNominaPagada && transaction.nominaPaymentType === 'consolidado';
    const isGastoPersonalizado = transaction.isGastoOperativo && transaction.fuente === 'operativo';
    // Ingresos manuales son aquellos que no tienen cotización asociada (transaction_category === 'manual')
    const isIngresoPersonalizado = isIngreso && transaction.categoria === 'manual';

    // Determinar tipo de badge
    const isRecurrente = transaction.categoria === 'Recurrente';
    const isNomina = transaction.categoria === 'Nómina' || isNominaPagada;
    const isManual = transaction.categoria === 'manual' || isIngresoPersonalizado || (isGastoPersonalizado && transaction.categoria !== 'Recurrente');

    // Gasto recurrente con personal asociado (para mostrar comprobante y ocultar eliminar)
    const isRecurrenteConPersonal = isRecurrente && !!transaction.personalId;

    const isPendienteDevolucion = transaction.paymentStatus === 'pending_refund';
    const isRetenidoCancelacion = isIngreso && transaction.paymentStatus === 'retained_by_cancellation';

    // Ingreso asociado a cotización/promesa (para mostrar enlace; incluye devoluciones pendientes)
    const hasQuoteLink = (transaction.promiseId || transaction.cotizacionId) && (isIngreso || isPendienteDevolucion);
    const promiseHref = transaction.promiseId
        ? `/${studioSlug}/studio/commercial/promises/${transaction.promiseId}`
        : null;

    const handleViewReceipt = () => {
        setIsReceiptModalOpen(true);
    };

    const handleViewNominaReceipt = () => {
        setIsNominaReceiptModalOpen(true);
    };

    const handleViewRecurrenteReceipt = () => {
        setIsRecurrenteReceiptModalOpen(true);
    };

    const handleCancelarClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmCancel = async () => {
        if (!onCancelarPago) return;

        setIsCancelling(true);
        try {
            await onCancelarPago(transaction.id);
            setShowDesgloseDialog(false);
            setShowConfirmModal(false);
        } catch (error) {
            console.error('Error cancelando pago:', error);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleCancelarRecurrenteClick = () => {
        setShowCancelRecurrenteModal(true);
    };

    const handleConfirmCancelRecurrente = async () => {
        setIsCancelling(true);
        try {
            const { cancelarPagoRecurrentePorGastoId } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
            const result = await cancelarPagoRecurrentePorGastoId(studioSlug, transaction.id);

            if (result.success) {
                toast.success('Pago recurrente cancelado. Vuelve a aparecer en Cuentas por Pagar.');
                setShowDesgloseDialog(false);
                setShowCancelRecurrenteModal(false);
                await onGastoEliminado?.();
            } else {
                toast.error(result.error || 'Error al cancelar pago recurrente');
            }
        } catch (error) {
            console.error('Error cancelando pago recurrente:', error);
            toast.error('Error al cancelar pago recurrente');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleEliminarGastoClick = () => {
        setShowDeleteConfirmModal(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await eliminarGastoOperativo(studioSlug, transaction.id);
            if (result.success) {
                toast.success('Gasto eliminado correctamente');
                setShowDesgloseDialog(false);
                setShowDeleteConfirmModal(false);
                await onGastoEliminado?.();
            } else {
                toast.error(result.error || 'Error al eliminar gasto');
            }
        } catch (error) {
            console.error('Error eliminando gasto:', error);
            toast.error('Error al eliminar gasto');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditarGastoClick = () => {
        setIsEditModalOpen(true);
    };

    const handleCancelarNominaClick = () => {
        setShowCancelNominaModal(true);
    };

    const handleConfirmCancelNomina = async () => {
        if (!transaction.nominaId) return;

        setIsCancellingNomina(true);
        try {
            const { cancelarNominaPagada } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
            const result = await cancelarNominaPagada(studioSlug, transaction.nominaId);
            if (result.success) {
                toast.success('Nómina cancelada. Se ha agregado nuevamente a "Por Pagar"');
                setShowDesgloseDialog(false);
                setShowCancelNominaModal(false);
                await onNominaCancelada?.();
            } else {
                toast.error(result.error || 'Error al cancelar nómina');
            }
        } catch (error) {
            console.error('Error cancelando nómina:', error);
            toast.error('Error al cancelar nómina');
        } finally {
            setIsCancellingNomina(false);
        }
    };

    const handleEliminarNominaClick = () => {
        setShowEliminarNominaModal(true);
    };

    const handleConfirmEliminarNomina = async () => {
        if (!transaction.nominaId) return;

        setIsEliminandoNomina(true);
        try {
            const { eliminarNominaPagada } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
            const result = await eliminarNominaPagada(studioSlug, transaction.nominaId);
            if (result.success) {
                toast.success('Nómina eliminada correctamente');
                setShowDesgloseDialog(false);
                setShowEliminarNominaModal(false);
                await onNominaCancelada?.();
            } else {
                toast.error(result.error || 'Error al eliminar nómina');
            }
        } catch (error) {
            console.error('Error eliminando nómina:', error);
            toast.error('Error al eliminar nómina');
        } finally {
            setIsEliminandoNomina(false);
        }
    };

    const handleEliminarPagoClick = () => {
        setShowEliminarPagoModal(true);
    };

    const handleConfirmEliminarPago = async () => {
        if (!onCancelarPago) return;

        setIsEliminandoPago(true);
        try {
            const { eliminarPago } = await import('@/lib/actions/studio/business/events/payments.actions');
            const result = await eliminarPago(studioSlug, transaction.id);
            if (result.success) {
                toast.success('Pago eliminado correctamente');
                setShowDesgloseDialog(false);
                setShowEliminarPagoModal(false);
                await onCancelarPago(transaction.id);
            } else {
                toast.error(result.error || 'Error al eliminar pago');
            }
        } catch (error) {
            console.error('Error eliminando pago:', error);
            toast.error('Error al eliminar pago');
        } finally {
            setIsEliminandoPago(false);
        }
    };

    const handleOpenDetails = () => {
        if (onOpenDetails) onOpenDetails(transaction);
        else setShowDesgloseDialog(true);
    };

    const handleConfirmarDevolucionClick = () => {
        setShowPaymentSourceModal(true);
    };

    const handleDevolucionSuccess = async () => {
        setShowPaymentSourceModal(false);
        setShowDesgloseDialog(false);
        await onDevolucionConfirmada?.();
    };

    return (
        <>
            <ZenCard
                variant="default"
                padding="sm"
                className="cursor-pointer transition-colors hover:border-zinc-700 hover:bg-zinc-800/40"
                onClick={handleOpenDetails}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleOpenDetails(); } }}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles de ${transaction.concepto}`}
            >
                <ZenCardContent className="p-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                    {transaction.concepto}
                                </p>
                                {isManual && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700/50">
                                        Manual
                                    </span>
                                )}
                                {isNomina && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-900/20 text-blue-400 border border-blue-800/30">
                                        Nómina
                                    </span>
                                )}
                                {isRecurrente && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-900/20 text-yellow-400 border border-yellow-800/30">
                                        Recurrente
                                    </span>
                                )}
                                {hasQuoteLink && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-900/20 text-emerald-400 border border-emerald-800/30">
                                        Cotización
                                    </span>
                                )}
                                {isPendienteDevolucion && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-900/20 text-amber-400 border border-amber-800/30">
                                        Pendiente de devolución
                                    </span>
                                )}
                                {isRetenidoCancelacion && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-600/50">
                                        Anticipo retenido
                                    </span>
                                )}
                            </div>
                            {(transaction.contactName || transaction.eventName || transaction.eventTypeName) && (
                                <p className="text-xs text-zinc-400 mb-1">
                                    {[transaction.contactName, transaction.eventName, transaction.eventTypeName]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                                <p className="text-xs text-zinc-500">
                                    {formatDate(transaction.fecha)}
                                </p>
                                {transaction.metodoPago && (
                                    <span className="flex items-center gap-1 text-zinc-500" title={metodoPagoLabel(transaction.metodoPago) ?? undefined}>
                                        {String(transaction.metodoPago).toLowerCase().includes('efectivo') ? (
                                            <Wallet className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden />
                                        ) : (
                                            <Landmark className="h-3.5 w-3.5 text-blue-400 shrink-0" aria-hidden />
                                        )}
                                    </span>
                                )}
                                <div className="flex items-center gap-1.5">
                                    {isIngreso ? (
                                        <ArrowUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden />
                                    ) : (
                                        <ArrowDown className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden />
                                    )}
                                    <p
                                        className={cn(
                                            'text-xs font-semibold',
                                            isIngreso ? 'text-emerald-400' : 'text-rose-400'
                                        )}
                                    >
                                        {formatCurrency(Math.abs(transaction.monto))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>

            <ZenConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmCancel}
                title="¿Estás seguro de cancelar el pago?"
                description={`Esta acción revertirá el pago "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))}. El monto volverá a aparecer en Por cobrar.`}
                confirmText="Sí, cancelar pago"
                cancelText="No, mantener"
                variant="destructive"
                loading={isCancelling}
                loadingText="Cancelando..."
            />

            <ZenConfirmModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={handleConfirmDelete}
                title="¿Estás seguro de eliminar el gasto?"
                description={`Esta acción eliminará permanentemente el gasto "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))}. Esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar gasto"
                cancelText="No, cancelar"
                variant="destructive"
                loading={isDeleting}
                loadingText="Eliminando..."
            />

            <ZenConfirmModal
                isOpen={showCancelNominaModal}
                onClose={() => setShowCancelNominaModal(false)}
                onConfirm={handleConfirmCancelNomina}
                title="¿Cancelar nómina pagada?"
                description={`Esta acción cancelará el pago de la nómina "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))}. La nómina será cancelada pero se agregará nuevamente a "Por Pagar" con estado pendiente.`}
                confirmText="Sí, cancelar nómina"
                cancelText="No, mantener"
                variant="destructive"
                loading={isCancellingNomina}
                loadingText="Cancelando..."
            />

            {/* Modal de confirmación cancelar pago recurrente */}
            <ZenConfirmModal
                isOpen={showCancelRecurrenteModal}
                onClose={() => setShowCancelRecurrenteModal(false)}
                onConfirm={handleConfirmCancelRecurrente}
                title="¿Cancelar pago recurrente?"
                description={`Esta acción cancelará el pago de "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))} y lo regresará a gastos recurrentes del mes.`}
                confirmText="Sí, cancelar"
                cancelText="Cancelar"
                variant="default"
                loading={isCancelling}
                loadingText="Cancelando..."
            />

            {/* Modal de comprobante de pago */}
            {isReceiptModalOpen && (
                <PaymentReceipt
                    isOpen={isReceiptModalOpen}
                    onClose={() => setIsReceiptModalOpen(false)}
                    studioSlug={studioSlug}
                    paymentId={transaction.id}
                />
            )}

            {/* Modal de comprobante de nómina */}
            {isNominaReceiptModalOpen && transaction.nominaId && (
                <NominaReceipt
                    isOpen={isNominaReceiptModalOpen}
                    onClose={() => setIsNominaReceiptModalOpen(false)}
                    studioSlug={studioSlug}
                    nominaId={transaction.nominaId}
                />
            )}

            {/* Modal de comprobante de gasto recurrente con personal */}
            {isRecurrenteReceiptModalOpen && isRecurrenteConPersonal && transaction.personalId && (
                <RecurrenteReceipt
                    isOpen={isRecurrenteReceiptModalOpen}
                    onClose={() => setIsRecurrenteReceiptModalOpen(false)}
                    studioSlug={studioSlug}
                    gastoId={transaction.id}
                />
            )}

            {/* Modal de edición */}
            {isEditModalOpen && (
                <RegistrarMovimientoModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    tipo={isIngreso ? 'ingreso' : 'gasto'}
                    studioSlug={studioSlug}
                    movimientoId={transaction.id}
                    initialData={{
                        concepto: transaction.concepto,
                        monto: Math.abs(transaction.monto),
                        metodoPago: undefined, // Se cargará desde el pago si es ingreso
                    }}
                    onSuccess={async () => {
                        await onGastoEditado?.();
                        setIsEditModalOpen(false);
                    }}
                />
            )}

            {/* Modal de confirmación eliminar nómina */}
            <ZenConfirmModal
                isOpen={showEliminarNominaModal}
                onClose={() => setShowEliminarNominaModal(false)}
                onConfirm={handleConfirmEliminarNomina}
                title="¿Eliminar nómina?"
                description={isNominaConsolidada
                    ? `Esta acción eliminará permanentemente el pago consolidado "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))} y todos los items asociados. Esta acción no se puede deshacer.`
                    : `Esta acción eliminará permanentemente la nómina "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))}. Esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isEliminandoNomina}
                loadingText="Eliminando..."
            />

            {/* Modal de confirmación eliminar pago */}
            <ZenConfirmModal
                isOpen={showEliminarPagoModal}
                onClose={() => setShowEliminarPagoModal(false)}
                onConfirm={handleConfirmEliminarPago}
                title="¿Eliminar pago?"
                description={`Esta acción eliminará permanentemente el pago "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))} y los items asociados. Esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isEliminandoPago}
                loadingText="Eliminando..."
            />

            {/* Sheet lateral: solo cuando el padre no controla el detalle (onOpenDetails) */}
            {!onOpenDetails && (
            <Sheet open={showDesgloseDialog} onOpenChange={setShowDesgloseDialog}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col p-0"
                >
                    <SheetHeader className="border-b border-zinc-800 px-4 py-4 flex-shrink-0">
                        <SheetTitle className="text-zinc-200">Detalles del movimiento</SheetTitle>
                    </SheetHeader>
                    <div className="p-4 flex-1 overflow-y-auto">
                        <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4 mb-4 space-y-2 text-sm">
                            {transaction.contactName && (
                                <p className="flex items-center gap-2 min-w-0">
                                    <User className="h-4 w-4 text-zinc-500 shrink-0" />
                                    <span className="text-zinc-500 shrink-0">Contacto:</span>
                                    <span className="text-zinc-300 truncate">{transaction.contactName}</span>
                                </p>
                            )}
                            {(transaction.eventTypeName || transaction.eventName) && (
                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <FileSpreadsheet className="h-4 w-4 text-zinc-500 shrink-0" />
                                    {transaction.eventTypeName ? (
                                        <ZenBadge
                                            variant="outline"
                                            className="bg-emerald-500/20 text-emerald-400 border-emerald-400/50 font-medium px-1.5 py-0 text-[10px] rounded-full shrink-0"
                                        >
                                            {transaction.eventTypeName}
                                        </ZenBadge>
                                    ) : null}
                                    {transaction.eventName ? (
                                        <span className="text-zinc-300 truncate">{transaction.eventName}</span>
                                    ) : null}
                                </div>
                            )}
                            <p className="flex items-center gap-2 min-w-0">
                                <Calendar className="h-4 w-4 text-zinc-500 shrink-0" />
                                <span className="text-zinc-500 shrink-0 whitespace-nowrap">Fecha evento:</span>
                                <span className="text-zinc-300">{transaction.eventDate ? formatEventDate(transaction.eventDate) : '—'}</span>
                            </p>
                            <p className="flex items-center gap-2 min-w-0">
                                <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
                                <span className="text-zinc-500 shrink-0 whitespace-nowrap">Fecha de pago:</span>
                                <span className="text-zinc-300">{formatDate(transaction.fecha)}</span>
                            </p>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 mb-2">
                            {sheetDetails.length > 1 ? 'Pagos' : 'Movimiento'}
                        </p>
                        <div className="border border-zinc-700 rounded-lg overflow-hidden">
                            {sheetDetails.map((d, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-700 last:border-b-0"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-200 truncate">{d.concepto}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-zinc-500">{d.categoria}</span>
                                                {metodoPagoLabel(d.metodoPago) && (
                                                    <>
                                                        <span className="text-zinc-600">·</span>
                                                        <span className="text-xs text-zinc-500">{metodoPagoLabel(d.metodoPago)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <span className={cn('text-sm font-medium shrink-0 tabular-nums', d.monto >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                                            {formatCurrency(d.monto)}
                                        </span>
                                    </div>
                                ))}
                                {sheetDetails.length > 1 && (
                                    <div className="flex items-center justify-between gap-3 px-4 py-4 bg-zinc-800/50">
                                        <p className="text-base font-semibold text-zinc-100">Total consolidado</p>
                                        <span className={cn('text-lg font-bold shrink-0 tabular-nums', transaction.monto >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                                            {formatCurrency(transaction.monto)}
                                        </span>
                                    </div>
                                )}
                        </div>
                        {(transaction.eventoId || transaction.promiseId) && (
                                <div className="flex flex-wrap gap-3 mt-4">
                                    {transaction.eventoId && (
                                        <Link
                                            href={`/${studioSlug}/studio/business/events/${transaction.eventoId}`}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                                        >
                                            <FileSpreadsheet className="h-3.5 w-3.5" />
                                            Ver evento
                                        </Link>
                                    )}
                                    {transaction.promiseId && (
                                        <Link
                                            href={`/${studioSlug}/studio/commercial/promises/${transaction.promiseId}`}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Ver cotización
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="border-t border-zinc-800 p-4 flex flex-col gap-3 flex-shrink-0 bg-zinc-900/80">
                            <div className="flex flex-col gap-2">
                                {isPendienteDevolucion && (
                                    <ZenButton
                                        variant="default"
                                        size="sm"
                                        className="w-full justify-center gap-2 h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
                                        onClick={handleConfirmarDevolucionClick}
                                    >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        Confirmar devolución (dinero regresado)
                                    </ZenButton>
                                )}
                                {(isIngreso || isNominaPagada || isRecurrenteConPersonal) && (
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-center gap-2 h-8"
                                        onClick={() => {
                                            setShowDesgloseDialog(false);
                                            if (isIngreso) handleViewReceipt();
                                            else isNominaPagada ? handleViewNominaReceipt() : handleViewRecurrenteReceipt();
                                        }}
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        Ver Comprobante
                                    </ZenButton>
                                )}
                                {(isIngresoPersonalizado || (isGastoPersonalizado && !isRecurrenteConPersonal)) && (
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-center gap-2 h-8"
                                        onClick={() => {
                                            setShowDesgloseDialog(false);
                                            handleEditarGastoClick();
                                        }}
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                        Editar
                                    </ZenButton>
                                )}
                            </div>
                            {((isNominaPagada || isRecurrente || (onCancelarPago && isIngreso)) || (isNominaPagada || (onCancelarPago && isIngreso) || (isGastoPersonalizado && !isRecurrenteConPersonal) || (isEgresoOperativo && !isGastoPersonalizado && !isRecurrente))) && (
                                <div className="flex gap-2">
                                    {(isNominaPagada || isRecurrente || (onCancelarPago && isIngreso)) && (
                                        <ZenButton
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 justify-center gap-1.5 h-8 text-xs"
                                            onClick={() => {
                                                setShowDesgloseDialog(false);
                                                if (isNominaPagada) handleCancelarNominaClick();
                                                else if (isRecurrente) handleCancelarRecurrenteClick();
                                                else handleCancelarClick();
                                            }}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            Cancelar
                                        </ZenButton>
                                    )}
                                    {(isNominaPagada || (onCancelarPago && isIngreso) || (isGastoPersonalizado && !isRecurrenteConPersonal) || (isEgresoOperativo && !isGastoPersonalizado && !isRecurrente)) && (
                                        <ZenButton
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 justify-center gap-1.5 h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 border-red-800/50"
                                            onClick={() => {
                                                setShowDesgloseDialog(false);
                                                if (isNominaPagada) handleEliminarNominaClick();
                                                else if (onCancelarPago && isIngreso) handleEliminarPagoClick();
                                                else handleEliminarGastoClick();
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Eliminar
                                        </ZenButton>
                                    )}
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            )}

            {!onOpenDetails && (
                <UniversalFinanceModal
                    isOpen={showPaymentSourceModal}
                    onClose={() => setShowPaymentSourceModal(false)}
                    studioSlug={studioSlug}
                    mode="refund"
                    data={{
                        amount: Math.abs(transaction.monto),
                        title: 'Devolución',
                        paymentIds: transaction.paymentIds ?? [transaction.id],
                        contactName: transaction.contactName,
                        eventName: transaction.eventName,
                        eventTypeName: transaction.eventTypeName,
                    }}
                    onSuccess={handleDevolucionSuccess}
                />
            )}
        </>
    );
}
