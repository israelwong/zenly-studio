'use client';

import React, { useState } from 'react';
import {
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle,
    ZenButton,
    ZenConfirmModal,
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
} from '@/components/ui/zen';
import { PorPagarPersonalCard } from './PorPagarPersonalCard';
import { RegistrarGastoRecurrenteModal } from './RegistrarGastoRecurrenteModal';
import { PorPagarPersonal } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { pagarGastoRecurrente, cancelarPagoGastoRecurrente, eliminarGastoRecurrente } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { Repeat, ArrowDown, Plus, MoreVertical, X, Trash2, Edit } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/shadcn/tooltip';
import { toast } from 'sonner';

export interface RecurringExpenseForPorPagar {
    id: string;
    name: string;
    amount: number;
    frequency?: string;
    chargeDay?: number;
    pagosMesActual?: number;
    totalPagosEsperados?: number;
}

interface PorPagarCardProps {
    porPagar: PorPagarPersonal[];
    studioSlug: string;
    onMarcarPagado: (id: string) => void;
    onPagoConfirmado?: () => void;
    headerAction?: React.ReactNode;
    /** Gastos recurrentes y salarios fijos del mes; solo se muestran los pendientes (pagosMesActual < totalPagosEsperados) */
    recurringExpenses?: RecurringExpenseForPorPagar[];
    /** Abre el listado de recurrentes (header). */
    onOpenRecurrentes?: () => void;
    /** Abre el modal de nuevo gasto recurrente (botón Plus del header). */
    onOpenNuevoRecurrente?: () => void;
    /** Al hacer clic en un ítem recurrente: abre el modal lateral de detalle de ese gasto. */
    onOpenRecurrenteDetalle?: (expense: { id: string; name: string; amount: number }) => void;
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
            return 'Mensual';
    }
}

function getPaymentLabel(e: RecurringExpenseForPorPagar): string {
    const siguientePago = (e.pagosMesActual ?? 0) + 1;
    if (e.frequency === 'monthly') return 'Pagar';
    if (e.frequency === 'biweekly') return `Pago ${siguientePago} de 2`;
    if (e.frequency === 'weekly' && (e.totalPagosEsperados ?? 1) > 1) {
        return `Pago ${siguientePago} de ${e.totalPagosEsperados}`;
    }
    return 'Pagar';
}

export function PorPagarCard({
    porPagar,
    studioSlug,
    onMarcarPagado,
    onPagoConfirmado,
    headerAction,
    recurringExpenses = [],
    onOpenRecurrentes,
    onOpenNuevoRecurrente,
    onOpenRecurrenteDetalle,
}: PorPagarCardProps) {
    const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [cancelRecurrenteId, setCancelRecurrenteId] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [deleteRecurrenteId, setDeleteRecurrenteId] = useState<string | null>(null);
    const [showDeleteOptionsModal, setShowDeleteOptionsModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [deleteType, setDeleteType] = useState<'single' | 'all' | 'future'>('future');
    const [isDeleting, setIsDeleting] = useState(false);
    const [editRecurrenteId, setEditRecurrenteId] = useState<string | null>(null);

    const totalItems = porPagar.reduce((sum, p) => sum + p.items.length, 0);
    const recurrentesPendientes = recurringExpenses.filter(
        (e) => (e.pagosMesActual ?? 0) < (e.totalPagosEsperados ?? 1)
    );
    const totalRecurrentesPendientes = recurrentesPendientes.length;
    const payingExpense = payingExpenseId
        ? recurrentesPendientes.find((e) => e.id === payingExpenseId)
        : null;
    const cancelRecurrenteExpense = cancelRecurrenteId
        ? recurrentesPendientes.find((e) => e.id === cancelRecurrenteId)
        : null;

    const handleConfirmPagarRecurrente = async () => {
        if (!payingExpenseId) return;
        setIsPaying(true);
        try {
            const result = await pagarGastoRecurrente(studioSlug, payingExpenseId);
            if (result.success) {
                toast.success('Gasto recurrente pagado correctamente');
                setPayingExpenseId(null);
                await onPagoConfirmado?.();
            } else {
                toast.error(result.error || 'Error al pagar');
            }
        } catch (error) {
            console.error('Error pagando gasto recurrente:', error);
            toast.error('Error al pagar gasto recurrente');
        } finally {
            setIsPaying(false);
        }
    };

    const handleConfirmCancelarUltimoPago = async () => {
        if (!cancelRecurrenteId) return;
        setIsCancelling(true);
        try {
            const result = await cancelarPagoGastoRecurrente(studioSlug, cancelRecurrenteId);
            if (result.success) {
                toast.success('Último pago cancelado. La configuración del gasto se mantiene.');
                setCancelRecurrenteId(null);
                await onPagoConfirmado?.();
            } else {
                toast.error(result.error || 'Error al cancelar pago');
            }
        } catch (error) {
            console.error('Error cancelando pago:', error);
            toast.error('Error al cancelar pago');
        } finally {
            setIsCancelling(false);
        }
    };

    const deleteRecurrenteExpense = deleteRecurrenteId
        ? recurrentesPendientes.find((e) => e.id === deleteRecurrenteId)
        : null;

    const handleDeleteOptionSelect = (type: 'single' | 'all' | 'future') => {
        setDeleteType(type);
        setShowDeleteOptionsModal(false);
        setShowDeleteConfirmModal(true);
    };

    const handleConfirmEliminarRecurrente = async () => {
        if (!deleteRecurrenteId) return;
        setIsDeleting(true);
        try {
            if (deleteType === 'single') {
                await cancelarPagoGastoRecurrente(studioSlug, deleteRecurrenteId);
            }
            const result = await eliminarGastoRecurrente(studioSlug, deleteRecurrenteId, {
                deleteType: deleteType === 'single' ? 'future' : deleteType,
            });
            if (result.success) {
                const messages = {
                    single: 'Configuración eliminada y último pago del mes revertido',
                    all: 'Configuración e histórico eliminados',
                    future: 'Configuración eliminada. Los pagos históricos se mantienen',
                };
                toast.success(messages[deleteType]);
                setDeleteRecurrenteId(null);
                setShowDeleteConfirmModal(false);
                await onPagoConfirmado?.();
            } else {
                toast.error(result.error || 'Error al eliminar gasto recurrente');
            }
        } catch (error) {
            console.error('Error eliminando gasto recurrente:', error);
            toast.error('Error al eliminar gasto recurrente');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
        <ZenCard variant="default" padding="none" className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 min-h-14 px-4 py-3 flex items-center">
                <div className="flex items-center gap-2 w-full min-w-0 flex-wrap">
                    <ZenCardTitle className="text-base mb-0 truncate flex-1 min-w-0 flex items-center gap-2 order-1">
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-2 rounded-full text-xs font-medium bg-rose-500/20 text-rose-400 shrink-0">
                            {totalItems + totalRecurrentesPendientes}
                        </span>
                        <span className="truncate">Cuentas por Pagar</span>
                    </ZenCardTitle>
                    {(onOpenRecurrentes ?? onOpenNuevoRecurrente) && (
                        <div className="flex items-center gap-1 shrink-0 order-2">
                            {onOpenRecurrentes && (
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700/50"
                                    onClick={onOpenRecurrentes}
                                >
                                    <Repeat className="h-3.5 w-3.5 shrink-0" />
                                    <span className="hidden sm:inline ml-1">Gestionar</span>
                                </ZenButton>
                            )}
                            {onOpenNuevoRecurrente && (
                                <TooltipProvider delayDuration={300}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ZenButton
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700/50"
                                                onClick={onOpenNuevoRecurrente}
                                                aria-label="Nuevo gasto recurrente"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </ZenButton>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-zinc-200">
                                            Nuevo gasto recurrente
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    )}
                    {headerAction && <div className="shrink-0 order-3">{headerAction}</div>}
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex-1 overflow-auto">
                {porPagar.length === 0 && totalRecurrentesPendientes === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p>No hay cuentas por pagar</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {porPagar.map((personal) => (
                            <PorPagarPersonalCard
                                key={personal.personalId}
                                personal={personal}
                                studioSlug={studioSlug}
                                onPagoConfirmado={onPagoConfirmado}
                            />
                        ))}
                        {totalRecurrentesPendientes > 0 && (
                            <div className="pt-2 border-t border-zinc-800">
                                <ul className="space-y-1.5">
                                    {recurrentesPendientes.map((e) => (
                                        <li key={e.id}>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                className="flex items-center gap-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 overflow-hidden cursor-pointer hover:bg-zinc-800/70 transition-colors"
                                                onClick={() => onOpenRecurrenteDetalle ? onOpenRecurrenteDetalle(e) : onOpenRecurrentes?.()}
                                                onKeyDown={(ev) => {
                                                    if (ev.key === 'Enter' || ev.key === ' ') {
                                                        ev.preventDefault();
                                                        onOpenRecurrenteDetalle ? onOpenRecurrenteDetalle(e) : onOpenRecurrentes?.();
                                                    }
                                                }}
                                            >
                                                <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 px-3 py-2 text-left">
                                                    <p className="text-sm font-medium text-zinc-200 truncate w-full">
                                                        {e.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <ArrowDown className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden />
                                                        <span className="text-sm text-rose-400 font-semibold">
                                                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(e.amount)}
                                                        </span>
                                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <Repeat className="h-3 w-3 shrink-0 text-amber-400" />
                                                            {getFrequencyLabel(e.frequency)}
                                                            {e.chargeDay != null ? ` - Día ${e.chargeDay}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 m-1 shrink-0">
                                                    <ZenButton
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs flex-shrink-0"
                                                        onClick={(ev) => {
                                                            ev.stopPropagation();
                                                            ev.preventDefault();
                                                            setPayingExpenseId(e.id);
                                                        }}
                                                    >
                                                        Pagar
                                                    </ZenButton>
                                                    <ZenDropdownMenu>
                                                        <ZenDropdownMenuTrigger asChild>
                                                            <ZenButton
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200"
                                                                onClick={(ev) => {
                                                                    ev.stopPropagation();
                                                                    ev.preventDefault();
                                                                }}
                                                                aria-label="Opciones"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </ZenButton>
                                                        </ZenDropdownMenuTrigger>
                                                        <ZenDropdownMenuContent align="end" onClick={(ev) => ev.stopPropagation()}>
                                                            <ZenDropdownMenuItem
                                                                onClick={(ev) => {
                                                                    ev.stopPropagation();
                                                                    setEditRecurrenteId(e.id);
                                                                }}
                                                                className="gap-2"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                                Editar
                                                            </ZenDropdownMenuItem>
                                                            <ZenDropdownMenuItem
                                                                onClick={(ev) => {
                                                                    ev.stopPropagation();
                                                                    setCancelRecurrenteId(e.id);
                                                                }}
                                                                className="gap-2"
                                                            >
                                                                <X className="h-4 w-4" />
                                                                Cancelar pago
                                                            </ZenDropdownMenuItem>
                                                            <ZenDropdownMenuItem
                                                                onClick={(ev) => {
                                                                    ev.stopPropagation();
                                                                    setDeleteRecurrenteId(e.id);
                                                                    setShowDeleteOptionsModal(true);
                                                                }}
                                                                className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Eliminar pago
                                                            </ZenDropdownMenuItem>
                                                        </ZenDropdownMenuContent>
                                                    </ZenDropdownMenu>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </ZenCardContent>
        </ZenCard>

        <ZenConfirmModal
            isOpen={!!payingExpense}
            onClose={() => setPayingExpenseId(null)}
            onConfirm={handleConfirmPagarRecurrente}
            title="¿Confirmar el pago del gasto recurrente?"
            description={
                payingExpense
                    ? `¿Deseas confirmar el pago de ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(payingExpense.amount)} para "${payingExpense.name}"? Este pago se registrará como egreso en los movimientos del mes.`
                    : ''
            }
            confirmText="Sí, confirmar pago"
            cancelText="Cancelar"
            variant="default"
            loading={isPaying}
            loadingText="Confirmando..."
        />

        <ZenConfirmModal
            isOpen={!!cancelRecurrenteExpense}
            onClose={() => setCancelRecurrenteId(null)}
            onConfirm={handleConfirmCancelarUltimoPago}
            title="¿Cancelar último pago?"
            description={
                cancelRecurrenteExpense
                    ? `Solo se eliminará el último pago registrado de "${cancelRecurrenteExpense.name}" en el mes actual. La configuración del gasto recurrente se mantiene y los futuros pagos no se ven afectados.`
                    : ''
            }
            confirmText="Sí, cancelar pago"
            cancelText="No, mantener"
            variant="default"
            loading={isCancelling}
            loadingText="Cancelando..."
        />

        {/* Modal: eliminar configuración + qué hacer con históricos */}
        <ZenConfirmModal
            isOpen={showDeleteOptionsModal && !!deleteRecurrenteExpense}
            onClose={() => {
                setShowDeleteOptionsModal(false);
                setDeleteRecurrenteId(null);
            }}
            onConfirm={() => { }}
            title="Eliminar configuración del gasto recurrente"
            description={
                deleteRecurrenteExpense ? (
                    <div className="space-y-3">
                        <p className="text-sm text-zinc-300">
                            Se eliminará la configuración de &quot;{deleteRecurrenteExpense.name}&quot; (ya no se generarán pagos futuros). Elige qué hacer con los pagos ya registrados:
                        </p>
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => handleDeleteOptionSelect('future')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Mantener históricos</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Solo se borra la configuración; los pagos ya registrados quedan en el historial.</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteOptionSelect('single')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Eliminar también pagos del mes</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Quita la configuración y los pagos de este mes.</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteOptionSelect('all')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Eliminar todo (configuración e histórico)</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Borra la configuración y todos los pagos registrados. No se puede deshacer.</div>
                            </button>
                        </div>
                    </div>
                ) : ''
            }
            confirmText=""
            cancelText="Cancelar"
            variant="default"
            hideConfirmButton
        />

        <ZenConfirmModal
            isOpen={showDeleteConfirmModal && !!deleteRecurrenteExpense}
            onClose={() => {
                setShowDeleteConfirmModal(false);
                setDeleteRecurrenteId(null);
            }}
            onConfirm={handleConfirmEliminarRecurrente}
            title="¿Confirmar eliminación?"
            description={
                deleteRecurrenteExpense
                    ? deleteType === 'future'
                        ? `Se eliminará la configuración de "${deleteRecurrenteExpense.name}". Los pagos ya registrados se mantendrán en el historial.`
                        : deleteType === 'single'
                            ? `Se eliminará la configuración de "${deleteRecurrenteExpense.name}" y los pagos de este mes.`
                            : `Se eliminará la configuración de "${deleteRecurrenteExpense.name}" y todos los pagos históricos. Esta acción no se puede deshacer.`
                    : ''
            }
            confirmText="Sí, eliminar"
            cancelText="No, cancelar"
            variant="destructive"
            loading={isDeleting}
            loadingText="Eliminando..."
        />

        {editRecurrenteId && (
            <RegistrarGastoRecurrenteModal
                isOpen={!!editRecurrenteId}
                onClose={() => setEditRecurrenteId(null)}
                studioSlug={studioSlug}
                expenseId={editRecurrenteId}
                onSuccess={async () => {
                    setEditRecurrenteId(null);
                    await onPagoConfirmado?.();
                }}
            />
        )}
    </>
    );
}
