'use client';

import React, { useState } from 'react';
import { User, Edit, Trash2 } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { ZenCard, ZenCardContent, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { RegistrarGastoRecurrenteModal } from './RegistrarGastoRecurrenteModal';
import { cancelarPagoGastoRecurrente, eliminarGastoRecurrente } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';

interface RecurrentePagoDetalleSheetProps {
    isOpen: boolean;
    onClose: () => void;
    expenseId: string;
    expenseName: string;
    expenseAmount: number;
    studioSlug: string;
    /** Llamado tras editar/eliminar para refrescar datos. */
    onPagoConfirmado?: () => void | Promise<void>;
}

export function RecurrentePagoDetalleSheet({
    isOpen,
    onClose,
    expenseId,
    expenseName,
    expenseAmount,
    studioSlug,
    onPagoConfirmado,
}: RecurrentePagoDetalleSheetProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showDeleteOptionsModal, setShowDeleteOptionsModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [deleteType, setDeleteType] = useState<'single' | 'all' | 'future'>('future');
    const [isDeleting, setIsDeleting] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const handleDeleteOptionSelect = (type: 'single' | 'all' | 'future') => {
        setDeleteType(type);
        setShowDeleteOptionsModal(false);
        setShowDeleteConfirmModal(true);
    };

    const handleConfirmEliminar = async () => {
        setIsDeleting(true);
        try {
            if (deleteType === 'single') {
                await cancelarPagoGastoRecurrente(studioSlug, expenseId);
            }
            const result = await eliminarGastoRecurrente(studioSlug, expenseId, {
                deleteType: deleteType === 'single' ? 'future' : deleteType,
            });
            if (result.success) {
                const messages = {
                    single: 'Configuración eliminada y último pago del mes revertido',
                    all: 'Configuración e histórico eliminados',
                    future: 'Configuración eliminada. Los pagos históricos se mantienen',
                };
                toast.success(messages[deleteType]);
                setShowDeleteConfirmModal(false);
                onClose();
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
            <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-md bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0 flex flex-col"
                >
                    <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <User className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <SheetTitle className="text-xl font-semibold text-white">
                                    {expenseName}
                                </SheetTitle>
                                <SheetDescription className="text-zinc-400">
                                    Gasto recurrente
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="p-6 flex-1 flex flex-col gap-6">
                        <ZenCard variant="default" padding="sm">
                            <ZenCardContent className="p-4">
                                <p className="text-xs text-zinc-500 mb-1">Monto</p>
                                <p className="text-2xl font-semibold text-rose-400">
                                    {formatCurrency(expenseAmount)}
                                </p>
                            </ZenCardContent>
                        </ZenCard>

                        <div className="flex flex-row gap-2 border-t border-zinc-800 pt-4 mt-auto">
                            <ZenButton
                                variant="outline"
                                size="sm"
                                className="flex-1 justify-center gap-2"
                                onClick={() => setIsEditModalOpen(true)}
                            >
                                <Edit className="h-4 w-4" />
                                Editar
                            </ZenButton>
                            <ZenButton
                                variant="outline"
                                size="sm"
                                className="flex-1 justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 border-red-800/50"
                                onClick={() => setShowDeleteOptionsModal(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                            </ZenButton>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {isEditModalOpen && (
                <RegistrarGastoRecurrenteModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    studioSlug={studioSlug}
                    expenseId={expenseId}
                    onSuccess={async () => {
                        setIsEditModalOpen(false);
                        onClose();
                        await onPagoConfirmado?.();
                    }}
                />
            )}

            <ZenConfirmModal
                isOpen={showDeleteOptionsModal}
                onClose={() => setShowDeleteOptionsModal(false)}
                onConfirm={() => { }}
                title="Eliminar configuración del gasto recurrente"
                description={
                    <div className="space-y-3">
                        <p className="text-sm text-zinc-300">
                            Se eliminará la configuración de &quot;{expenseName}&quot; (ya no se generarán pagos futuros). Elige qué hacer con los pagos ya registrados:
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
                }
                confirmText=""
                cancelText="Cancelar"
                variant="default"
                hideConfirmButton
            />

            <ZenConfirmModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={handleConfirmEliminar}
                title="¿Confirmar eliminación?"
                description={
                    deleteType === 'future'
                        ? `Se eliminará la configuración de "${expenseName}". Los pagos ya registrados se mantendrán en el historial.`
                        : deleteType === 'single'
                            ? `Se eliminará la configuración de "${expenseName}" y los pagos de este mes.`
                            : `Se eliminará la configuración de "${expenseName}" y todos los pagos históricos. Esta acción no se puede deshacer.`
                }
                confirmText="Sí, eliminar"
                cancelText="No, cancelar"
                variant="destructive"
                loading={isDeleting}
                loadingText="Eliminando..."
            />
        </>
    );
}
