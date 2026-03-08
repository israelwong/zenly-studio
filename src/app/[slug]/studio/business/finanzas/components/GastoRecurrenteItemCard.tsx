'use client';

import React, { useState } from 'react';
import {
    ZenCard,
    ZenCardContent,
    ZenButton,
    ZenConfirmModal,
} from '@/components/ui/zen';
import { Calendar, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RegistrarGastoRecurrenteModal } from './RegistrarGastoRecurrenteModal';
import { cn } from '@/lib/utils';

const DIAS_SEMANA_LABEL: Record<number, string> = {
    0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
};

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
    lastDayOfMonth?: boolean;
    paymentMethodLabel?: string | null;
}

interface GastoRecurrenteItemCardProps {
    expense: GastoRecurrente;
    studioSlug: string;
    /** No se paga desde esta card; el pago se hace desde Cuentas por Pagar. Reservado para compatibilidad. */
    onPagar?: (id: string) => Promise<void>;
    onPagoConfirmado?: () => void | Promise<void>;
    onEditado?: () => void | Promise<void>;
    /** Reservado; la cancelación de último pago se hace desde Cuentas por Pagar. */
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
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteOptionsModal, setShowDeleteOptionsModal] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
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

    const getDaySummary = () => {
        const freq = expense.frequency;
        if (freq === 'monthly') {
            if (expense.lastDayOfMonth) return 'Último día del mes';
            return `Día ${expense.chargeDay ?? 1}`;
        }
        if (freq === 'biweekly') {
            return expense.chargeDay === 15 ? '15 y último' : '1 y 15';
        }
        if (freq === 'weekly') {
            const day = expense.chargeDay ?? 0;
            return DIAS_SEMANA_LABEL[day] ?? `Día ${day}`;
        }
        return expense.chargeDay ? `Día ${expense.chargeDay}` : '';
    };

    const subtitle = [
        getFrequencyLabel(expense.frequency),
        getDaySummary() ? `(${getDaySummary()})` : '',
        expense.paymentMethodLabel ? expense.paymentMethodLabel : '',
    ].filter(Boolean).join(' - ');

    const handleEditarClick = () => {
        setIsEditModalOpen(true);
    };

    const handleEliminarClick = () => {
        setShowDeleteOptionsModal(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const { eliminarGastoRecurrente, cancelarPagoGastoRecurrente } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
            if (deleteType === 'single') {
                await cancelarPagoGastoRecurrente(studioSlug, expense.id);
            }
            const result = await eliminarGastoRecurrente(studioSlug, expense.id, {
                deleteType: deleteType === 'single' ? 'future' : deleteType,
            });
            if (result.success) {
                const messages = {
                    single: 'Configuración eliminada y último pago del mes revertido',
                    all: 'Configuración e histórico eliminados',
                    future: 'Configuración eliminada. Los pagos históricos se mantienen',
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
            <ZenCard
                variant="default"
                padding="sm"
                role="button"
                tabIndex={0}
                className={cn(
                    "hover:border-zinc-700 transition-colors cursor-pointer",
                    expense.isCrewMember && "border-emerald-500/20 hover:border-emerald-700"
                )}
                onClick={() => setIsEditModalOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsEditModalOpen(true);
                    }
                }}
            >
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
                                    <span>{subtitle || getFrequencyLabel(expense.frequency)}</span>
                                </div>
                            </div>
                        </div>
                        <ZenButton
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleEliminarClick();
                            }}
                            aria-label="Eliminar configuración"
                        >
                            <Trash2 className="h-4 w-4" />
                        </ZenButton>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Modal: eliminar configuración del gasto recurrente y decidir qué hacer con históricos */}
            <ZenConfirmModal
                isOpen={showDeleteOptionsModal}
                onClose={() => setShowDeleteOptionsModal(false)}
                onConfirm={() => { }}
                title="Eliminar configuración del gasto recurrente"
                description={
                    <div className="space-y-3">
                        <p className="text-sm text-zinc-300">
                            Se eliminará la configuración de &quot;{expense.name}&quot; (ya no se generarán pagos futuros). Elige qué hacer con los pagos ya registrados:
                        </p>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleDeleteOptionSelect('future')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Mantener históricos</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Solo se borra la configuración; los pagos ya registrados quedan en el historial.</div>
                            </button>
                            <button
                                onClick={() => handleDeleteOptionSelect('single')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Eliminar también pagos del mes</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Quita la configuración y los pagos de este mes.</div>
                            </button>
                            <button
                                onClick={() => handleDeleteOptionSelect('all')}
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
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                title="¿Confirmar eliminación?"
                description={
                    deleteType === 'future'
                        ? `Se eliminará la configuración de "${expense.name}". Los pagos ya registrados se mantendrán en el historial.`
                        : deleteType === 'single'
                            ? `Se eliminará la configuración de "${expense.name}" y los pagos de este mes.`
                            : `Se eliminará la configuración de "${expense.name}" y todos los pagos históricos. Esta acción no se puede deshacer.`
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
        </>
    );
});
