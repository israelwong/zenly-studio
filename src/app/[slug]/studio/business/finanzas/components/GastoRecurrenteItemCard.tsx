'use client';

import React, { useState } from 'react';
import {
    ZenCard,
    ZenCardContent,
    ZenButton,
    ZenConfirmModal,
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import { Calendar, User, MoreVertical, Edit, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RegistrarGastoRecurrenteModal } from './RegistrarGastoRecurrenteModal';
import { RecurrentePagoDetalleSheet } from './RecurrentePagoDetalleSheet';

interface GastoRecurrente {
    id: string;
    name: string;
    amount: number;
    category: string;
    chargeDay: number;
    isActive: boolean;
    frequency?: string;
    description?: string | null;
    pagosMesActual?: number;
    totalPagosEsperados?: number;
    isCrewMember?: boolean;
    crewMemberId?: string;
}

interface GastoRecurrenteItemCardProps {
    expense: GastoRecurrente;
    studioSlug: string;
    onPagar: (id: string) => Promise<void>;
    onPagoConfirmado?: () => void | Promise<void>;
    onEditado?: () => void | Promise<void>;
    onCancelado?: () => void | Promise<void>;
    onEliminado?: () => void | Promise<void>;
}

export const GastoRecurrenteItemCard = React.memo(function GastoRecurrenteItemCard({
    expense,
    studioSlug,
    onPagar,
    onPagoConfirmado,
    onEditado,
    onCancelado,
    onEliminado,
}: GastoRecurrenteItemCardProps) {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteOptionsModal, setShowDeleteOptionsModal] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPagoSheetOpen, setIsPagoSheetOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteType, setDeleteType] = useState<'single' | 'all' | 'future'>('single');

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const getFrequencyLabel = (frequency?: string) => {
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
    };

    const getPaymentLabel = () => {
        const { pagosMesActual = 0, totalPagosEsperados = 1, frequency } = expense;

        // Calcular el siguiente pago a realizar
        const siguientePago = pagosMesActual + 1;

        // Mensual: mostrar "Pagar" (solo 1 pago por mes)
        if (frequency === 'monthly') {
            return 'Pagar';
        }

        // Quincenal: mostrar "Pago 1 de 2" o "Pago 2 de 2"
        if (frequency === 'biweekly') {
            return `Pago ${siguientePago} de 2`;
        }

        // Semanal: mostrar "Pago X de N" donde N es el número de semanas del mes
        if (frequency === 'weekly' && totalPagosEsperados > 1) {
            return `Pago ${siguientePago} de ${totalPagosEsperados}`;
        }

        // Fallback
        return 'Pagar';
    };

    const handlePagarClick = () => {
        // Si es un crew member, abrir sheet de pago detallado
        if (expense.isCrewMember) {
            setIsPagoSheetOpen(true);
        } else {
            // Para gastos recurrentes normales, usar modal simple
            setShowConfirmModal(true);
        }
    };

    const handleConfirmPago = async () => {
        setIsProcessing(true);
        try {
            await onPagar(expense.id);
            toast.success('Gasto recurrente pagado correctamente');
            setShowConfirmModal(false);
            // Recargar datos de forma asíncrona sin bloquear
            if (onPagoConfirmado) {
                Promise.resolve(onPagoConfirmado()).catch((err: unknown) => {
                    console.error('Error recargando datos:', err);
                });
            }
        } catch (error) {
            console.error('Error pagando gasto recurrente:', error);
            toast.error('Error al pagar gasto recurrente');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePagoConfirmado = async () => {
        setIsPagoSheetOpen(false);
        if (onPagoConfirmado) {
            await onPagoConfirmado();
        }
    };

    const handleEditarClick = () => {
        setIsEditModalOpen(true);
    };

    const handleCancelarClick = () => {
        setShowCancelModal(true);
    };

    const handleConfirmCancel = async () => {
        setIsCancelling(true);
        try {
            const { cancelarPagoGastoRecurrente } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
            const result = await cancelarPagoGastoRecurrente(studioSlug, expense.id);
            if (result.success) {
                toast.success('Pago cancelado. Los futuros pagos se mantienen.');
                await onCancelado?.();
                setShowCancelModal(false);
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

    const handleEliminarClick = () => {
        setShowDeleteOptionsModal(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const { eliminarGastoRecurrente } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
            const result = await eliminarGastoRecurrente(studioSlug, expense.id, { deleteType });
            if (result.success) {
                const messages = {
                    single: 'Gasto recurrente eliminado',
                    all: 'Gasto recurrente y todos los pagos históricos eliminados',
                    future: 'Gasto recurrente eliminado. Los pagos históricos se mantienen',
                };
                toast.success(messages[deleteType]);
                await onEliminado?.();
                setShowDeleteModal(false);
                setShowDeleteOptionsModal(false);
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

    const handleDeleteOptionSelect = (type: 'single' | 'all' | 'future') => {
        setDeleteType(type);
        setShowDeleteOptionsModal(false);
        setShowDeleteModal(true);
    };

    return (
        <>
            <ZenCard variant="default" padding="sm" className={expense.isCrewMember ? "hover:border-emerald-700 transition-colors border-emerald-500/20" : "hover:border-zinc-700 transition-colors"}>
                <ZenCardContent className="p-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                {expense.isCrewMember && (
                                    <User className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                                )}
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                    {expense.name}
                                </p>
                            </div>
                            {expense.description && (
                                <p className="text-xs text-zinc-500 mb-1 truncate">
                                    {expense.description}
                                </p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                                <p className="text-base text-rose-400 font-semibold">
                                    {formatCurrency(expense.amount)}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                        {getFrequencyLabel(expense.frequency)}
                                        {!expense.isCrewMember && ` - Día ${expense.chargeDay}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <ZenButton
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs flex-shrink-0"
                                onClick={handlePagarClick}
                            >
                                {getPaymentLabel()}
                            </ZenButton>
                            <ZenDropdownMenu>
                                <ZenDropdownMenuTrigger asChild>
                                    <ZenButton variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </ZenButton>
                                </ZenDropdownMenuTrigger>
                                <ZenDropdownMenuContent align="end">
                                    <ZenDropdownMenuItem onClick={handleEditarClick} className="gap-2">
                                        <Edit className="h-4 w-4" />
                                        Editar
                                    </ZenDropdownMenuItem>
                                    <ZenDropdownMenuItem onClick={handleCancelarClick} className="gap-2">
                                        <X className="h-4 w-4" />
                                        Cancelar
                                    </ZenDropdownMenuItem>
                                    <ZenDropdownMenuSeparator />
                                    <ZenDropdownMenuItem
                                        onClick={handleEliminarClick}
                                        className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar
                                    </ZenDropdownMenuItem>
                                </ZenDropdownMenuContent>
                            </ZenDropdownMenu>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>

            <ZenConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmPago}
                title="¿Confirmar el pago del gasto recurrente?"
                description={`¿Deseas confirmar el pago de ${formatCurrency(expense.amount)} para "${expense.name}"? Este pago se registrará como egreso en los movimientos del mes.`}
                confirmText="Sí, confirmar pago"
                cancelText="Cancelar"
                variant="default"
                loading={isProcessing}
                loadingText="Confirmando..."
            />

            <ZenConfirmModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleConfirmCancel}
                title="¿Cancelar este pago?"
                description={
                    <div className="space-y-2">
                        <div className="text-sm text-zinc-300">
                            Solo se eliminará el último pago registrado de &quot;{expense.name}&quot;.
                        </div>
                        <div className="text-sm text-zinc-400">
                            Los futuros pagos se mantendrán y el gasto recurrente seguirá activo.
                        </div>
                    </div>
                }
                confirmText="Sí, cancelar pago"
                cancelText="No, mantener"
                variant="default"
                loading={isCancelling}
                loadingText="Cancelando..."
            />

            {/* Modal de selección de tipo de eliminación */}
            <ZenConfirmModal
                isOpen={showDeleteOptionsModal}
                onClose={() => setShowDeleteOptionsModal(false)}
                onConfirm={() => { }}
                title="¿Cómo deseas eliminar el gasto recurrente?"
                description={
                    <div className="space-y-2">
                        <div className="text-sm text-zinc-300 mb-3">
                            Selecciona qué deseas eliminar para &quot;{expense.name}&quot;:
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleDeleteOptionSelect('single')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Solo este gasto programado</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Elimina solo la configuración del gasto recurrente</div>
                            </button>
                            <button
                                onClick={() => handleDeleteOptionSelect('all')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Todos los históricos y futuros</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Elimina el gasto recurrente y todos los pagos registrados</div>
                            </button>
                            <button
                                onClick={() => handleDeleteOptionSelect('future')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Solo los futuros</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Elimina el gasto recurrente pero mantiene los pagos históricos</div>
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
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                title="¿Estás seguro de eliminar?"
                description={
                    deleteType === 'single'
                        ? `Esta acción eliminará el gasto recurrente "${expense.name}". Los pagos históricos se mantendrán.`
                        : deleteType === 'all'
                            ? `Esta acción eliminará el gasto recurrente "${expense.name}" y TODOS los pagos históricos relacionados. Esta acción no se puede deshacer.`
                            : `Esta acción eliminará el gasto recurrente "${expense.name}". Los pagos históricos se mantendrán, pero no se generarán más pagos futuros.`
                }
                confirmText="Sí, eliminar"
                cancelText="No, cancelar"
                variant="destructive"
                loading={isDeleting}
                loadingText="Eliminando..."
            />

            {/* Modal de edición */}
            {isEditModalOpen && (
                <RegistrarGastoRecurrenteModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    studioSlug={studioSlug}
                    expenseId={expense.id}
                    onSuccess={async () => {
                        await onEditado?.();
                        setIsEditModalOpen(false);
                    }}
                />
            )}
            {/* Sheet de pago detallado para crew members */}
            {expense.isCrewMember && (
                <RecurrentePagoDetalleSheet
                    isOpen={isPagoSheetOpen}
                    onClose={() => setIsPagoSheetOpen(false)}
                    expenseId={expense.id}
                    expenseName={expense.name}
                    expenseAmount={expense.amount}
                    studioSlug={studioSlug}
                    onPagoConfirmado={handlePagoConfirmado}
                />
            )}
        </>
    );
});
