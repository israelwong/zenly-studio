'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    ZenDialog,
    ZenButton,
    ZenInput,
} from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import { crearGastoRecurrente, obtenerGastoRecurrente, eliminarGastoRecurrente } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ZenConfirmModal } from '@/components/ui/zen';

interface RegistrarGastoRecurrenteModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onSuccess?: () => void;
    expenseId?: string; // ID del gasto recurrente a editar
}

type Recurrencia = 'weekly' | 'biweekly' | 'monthly';

export function RegistrarGastoRecurrenteModal({
    isOpen,
    onClose,
    studioSlug,
    onSuccess,
    expenseId,
}: RegistrarGastoRecurrenteModalProps) {
    const isEditMode = !!expenseId;
    const [concepto, setConcepto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [monto, setMonto] = useState('');
    const [recurrencia, setRecurrencia] = useState<Recurrencia>('monthly');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showDeleteOptionsModal, setShowDeleteOptionsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteType, setDeleteType] = useState<'all' | 'future'>('future');

    const loadExpenseData = useCallback(async () => {
        if (!expenseId) return;
        setInitialLoading(true);
        try {
            const result = await obtenerGastoRecurrente(studioSlug, expenseId);
            if (result.success && result.data) {
                setConcepto(result.data.name);
                setDescripcion(result.data.description || '');
                setMonto(result.data.amount.toString());
                setRecurrencia(result.data.frequency as Recurrencia);
            } else {
                toast.error(result.error || 'Error al cargar datos del gasto recurrente');
            }
        } catch (error) {
            console.error('Error cargando datos del gasto recurrente:', error);
            toast.error('Error al cargar datos del gasto recurrente');
        } finally {
            setInitialLoading(false);
        }
    }, [expenseId, studioSlug]);

    useEffect(() => {
        if (isOpen) {
            setInitialLoading(true);
            if (isEditMode && expenseId) {
                loadExpenseData();
            } else {
                setTimeout(() => {
                    setInitialLoading(false);
                }, 300);
            }
        }
    }, [isOpen, expenseId, isEditMode, loadExpenseData]);

    useEffect(() => {
        if (!isOpen) {
            setConcepto('');
            setDescripcion('');
            setMonto('');
            setRecurrencia('monthly');
            setError(null);
            setInitialLoading(true);
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!concepto.trim()) {
            setError('El concepto es requerido');
            return;
        }

        if (descripcion.length > 100) {
            setError('La descripción no puede exceder 100 caracteres');
            return;
        }

        if (!monto || parseFloat(monto) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (isEditMode && expenseId) {
                const { actualizarGastoRecurrente } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
                const result = await actualizarGastoRecurrente(studioSlug, expenseId, {
                    name: concepto.trim(),
                    description: descripcion.trim() || null,
                    amount: parseFloat(monto),
                    frequency: recurrencia,
                    category: 'fijo',
                    chargeDay: 1,
                });

                if (result.success) {
                    toast.success('Gasto recurrente actualizado correctamente');
                    await onSuccess?.();
                    onClose();
                } else {
                    setError(result.error || 'Error al actualizar gasto recurrente');
                }
            } else {
                const result = await crearGastoRecurrente(studioSlug, {
                    name: concepto.trim(),
                    description: descripcion.trim() || null,
                    amount: parseFloat(monto),
                    frequency: recurrencia,
                    category: 'fijo',
                    chargeDay: 1, // Por defecto día 1, se puede ajustar después
                });

                if (result.success) {
                    toast.success('Gasto recurrente registrado correctamente');
                    await onSuccess?.();
                    onClose();
                } else {
                    setError(result.error || 'Error al registrar gasto recurrente');
                }
            }
        } catch (err) {
            setError(`Error al ${isEditMode ? 'actualizar' : 'registrar'} gasto recurrente`);
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEliminarClick = () => {
        setShowDeleteOptionsModal(true);
    };

    const handleDeleteOptionSelect = (type: 'all' | 'future') => {
        setDeleteType(type);
        setShowDeleteOptionsModal(false);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!expenseId) return;
        setIsDeleting(true);
        try {
            const result = await eliminarGastoRecurrente(studioSlug, expenseId, { deleteType });
            if (result.success) {
                const messages = {
                    all: 'Gasto recurrente y todos los pagos históricos eliminados',
                    future: 'Gasto recurrente eliminado. Los pagos históricos se mantienen',
                };
                toast.success(messages[deleteType]);
                await onSuccess?.();
                setShowDeleteModal(false);
                onClose();
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
            <ZenDialog
                isOpen={isOpen}
                onClose={onClose}
                title={isEditMode ? 'Editar Gasto Recurrente' : 'Registrar Gasto Recurrente'}
                description={isEditMode ? 'Edita los datos del gasto recurrente' : 'Registra un gasto que se repite periódicamente'}
                onSave={handleSave}
                saveLabel={isEditMode ? 'Actualizar' : 'Guardar'}
                saveVariant="primary"
                isLoading={loading}
                onCancel={onClose}
                cancelLabel="Cancelar"
                maxWidth="sm"
                onDelete={isEditMode ? handleEliminarClick : undefined}
                deleteLabel="Eliminar"
                showDeleteButton={isEditMode}
            >
                {initialLoading ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-20 bg-zinc-700" />
                            <Skeleton className="h-10 w-full rounded-md bg-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24 bg-zinc-700" />
                            <Skeleton className="h-20 w-full rounded-md bg-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16 bg-zinc-700" />
                            <Skeleton className="h-10 w-full rounded-md bg-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32 bg-zinc-700" />
                            <div className="space-y-2">
                                <Skeleton className="h-12 w-full rounded-md bg-zinc-700" />
                                <Skeleton className="h-12 w-full rounded-md bg-zinc-700" />
                                <Skeleton className="h-12 w-full rounded-md bg-zinc-700" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <ZenInput
                            label="Concepto"
                            value={concepto}
                            onChange={(e) => setConcepto(e.target.value)}
                            placeholder="Ej: Renta oficina, Suscripción Adobe..."
                            required
                            error={error && !concepto.trim() ? error : undefined}
                        />

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">
                                Descripción <span className="text-zinc-500">(opcional, máx. 100 caracteres)</span>
                            </label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => {
                                    if (e.target.value.length <= 100) {
                                        setDescripcion(e.target.value);
                                    }
                                }}
                                placeholder="Descripción del gasto recurrente..."
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                rows={3}
                                maxLength={100}
                            />
                            <div className="flex justify-between items-center">
                                {error && descripcion.length > 100 && (
                                    <p className="text-xs text-red-400">{error}</p>
                                )}
                                <p className="text-xs text-zinc-500 ml-auto">
                                    {descripcion.length}/100
                                </p>
                            </div>
                        </div>

                        <ZenInput
                            label="Monto"
                            type="number"
                            step="0.01"
                            min="0"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            placeholder="0.00"
                            required
                            error={error && (!monto || parseFloat(monto) <= 0) ? error : undefined}
                        />

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 pb-2">
                                Recurrencia
                            </label>
                            <div className="space-y-2">
                                <label
                                    htmlFor="recurrencia-weekly"
                                    className={cn(
                                        'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                                        recurrencia === 'weekly'
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        id="recurrencia-weekly"
                                        name="recurrencia"
                                        value="weekly"
                                        checked={recurrencia === 'weekly'}
                                        onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
                                        className="sr-only"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Calendar className={cn(
                                                'h-4 w-4 flex-shrink-0',
                                                recurrencia === 'weekly' ? 'text-emerald-400' : 'text-zinc-400'
                                            )} />
                                            <span className={cn(
                                                'text-sm font-medium',
                                                recurrencia === 'weekly' ? 'text-emerald-200' : 'text-zinc-300'
                                            )}>
                                                Semanal
                                            </span>
                                            {recurrencia === 'weekly' && (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                </label>
                                <label
                                    htmlFor="recurrencia-biweekly"
                                    className={cn(
                                        'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                                        recurrencia === 'biweekly'
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        id="recurrencia-biweekly"
                                        name="recurrencia"
                                        value="biweekly"
                                        checked={recurrencia === 'biweekly'}
                                        onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
                                        className="sr-only"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Calendar className={cn(
                                                'h-4 w-4 flex-shrink-0',
                                                recurrencia === 'biweekly' ? 'text-emerald-400' : 'text-zinc-400'
                                            )} />
                                            <span className={cn(
                                                'text-sm font-medium',
                                                recurrencia === 'biweekly' ? 'text-emerald-200' : 'text-zinc-300'
                                            )}>
                                                Quincenal
                                            </span>
                                            {recurrencia === 'biweekly' && (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                </label>
                                <label
                                    htmlFor="recurrencia-monthly"
                                    className={cn(
                                        'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                                        recurrencia === 'monthly'
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        id="recurrencia-monthly"
                                        name="recurrencia"
                                        value="monthly"
                                        checked={recurrencia === 'monthly'}
                                        onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
                                        className="sr-only"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Calendar className={cn(
                                                'h-4 w-4 flex-shrink-0',
                                                recurrencia === 'monthly' ? 'text-emerald-400' : 'text-zinc-400'
                                            )} />
                                            <span className={cn(
                                                'text-sm font-medium',
                                                recurrencia === 'monthly' ? 'text-emerald-200' : 'text-zinc-300'
                                            )}>
                                                Mensual
                                            </span>
                                            {recurrencia === 'monthly' && (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {error && (concepto.trim() && monto && descripcion.length <= 100) && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}
                    </div>
                )}
            </ZenDialog>

            {/* Modal de selección de tipo de eliminación */}
            <ZenConfirmModal
                isOpen={showDeleteOptionsModal}
                onClose={() => setShowDeleteOptionsModal(false)}
                onConfirm={() => { }}
                title="¿Cómo deseas eliminar el gasto recurrente?"
                description={
                    <div className="space-y-2">
                        <div className="text-sm text-zinc-300 mb-3">
                            Selecciona qué deseas eliminar para "{concepto}":
                        </div>
                        <div className="space-y-2">
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
                    deleteType === 'all'
                        ? `Esta acción eliminará el gasto recurrente "${concepto}" y TODOS los pagos históricos relacionados. Esta acción no se puede deshacer.`
                        : `Esta acción eliminará el gasto recurrente "${concepto}". Los pagos históricos se mantendrán, pero no se generarán más pagos futuros.`
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
