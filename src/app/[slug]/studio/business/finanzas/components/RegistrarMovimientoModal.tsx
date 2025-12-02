'use client';

import React, { useState, useEffect } from 'react';
import {
    ZenDialog,
    ZenButton,
    ZenInput,
} from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { PaymentMethodRadio } from '@/components/shared/payments/PaymentMethodRadio';
import { crearIngresoManual } from '@/lib/actions/studio/business/events/payments.actions';
import { crearGastoOperativo } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { obtenerMetodosPagoManuales } from '@/lib/actions/studio/config/metodos-pago.actions';
import { toast } from 'sonner';

interface RegistrarMovimientoModalProps {
    isOpen: boolean;
    onClose: () => void;
    tipo: 'ingreso' | 'gasto';
    studioSlug: string;
    onSuccess?: () => void;
    movimientoId?: string; // ID del movimiento a editar
    initialData?: {
        concepto: string;
        monto: number;
        metodoPago?: string; // Solo para ingresos
    };
}

export function RegistrarMovimientoModal({
    isOpen,
    onClose,
    tipo,
    studioSlug,
    onSuccess,
    movimientoId,
    initialData,
}: RegistrarMovimientoModalProps) {
    const isEditMode = !!movimientoId;
    const [concepto, setConcepto] = useState('');
    const [monto, setMonto] = useState('');
    const [metodoPago, setMetodoPago] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metodosPago, setMetodosPago] = useState<Array<{ id: string; payment_method_name: string; payment_method: string | null }>>([]);
    const [loadingMetodos, setLoadingMetodos] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setInitialLoading(true);

            // Si hay datos iniciales, cargarlos
            if (initialData) {
                setConcepto(initialData.concepto);
                setMonto(initialData.monto.toString());
                if (initialData.metodoPago) {
                    setMetodoPago(initialData.metodoPago);
                }
            }

            if (tipo === 'ingreso') {
                // Delay para mostrar skeleton antes de cargar métodos de pago
                setTimeout(() => {
                    loadMetodosPago();
                }, 400);
            } else {
                // Para gasto, delay para mostrar skeleton
                setTimeout(() => {
                    setInitialLoading(false);
                    setLoadingMetodos(false);
                }, 600);
            }
        }
    }, [isOpen, tipo, studioSlug, initialData]);

    useEffect(() => {
        if (!isOpen) {
            // Resetear estado al cerrar
            setConcepto('');
            setMonto('');
            setMetodoPago('');
            setError(null);
            setInitialLoading(true);
            setLoadingMetodos(true);
        }
    }, [isOpen]);

    // Cargar datos del movimiento si estamos en modo edición
    useEffect(() => {
        if (isOpen && movimientoId && !initialData) {
            loadMovimientoData();
        }
    }, [isOpen, movimientoId]);

    const loadMovimientoData = async () => {
        if (!movimientoId) return;

        setInitialLoading(true);
        try {
            if (tipo === 'gasto') {
                const { obtenerGastoOperativo } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
                const result = await obtenerGastoOperativo(studioSlug, movimientoId);
                if (result.success && result.data) {
                    setConcepto(result.data.concept);
                    setMonto(result.data.amount.toString());
                } else {
                    toast.error(result.error || 'Error al cargar datos del gasto');
                }
            } else {
                // Para ingresos, obtener el pago
                const { obtenerPagoPorId } = await import('@/lib/actions/studio/business/events/payments.actions');
                const result = await obtenerPagoPorId(studioSlug, movimientoId);
                if (result.success && result.data) {
                    setConcepto(result.data.concept || '');
                    setMonto(result.data.amount.toString());
                    // Cargar métodos de pago primero para poder establecer el método
                    await loadMetodosPago();
                    if (result.data.payment_method) {
                        setMetodoPago(result.data.payment_method);
                    }
                } else {
                    toast.error(result.error || 'Error al cargar datos del ingreso');
                }
            }
        } catch (error) {
            console.error('Error cargando datos del movimiento:', error);
            toast.error('Error al cargar datos del movimiento');
        } finally {
            setInitialLoading(false);
        }
    };

    const loadMetodosPago = async () => {
        setLoadingMetodos(true);
        try {
            const result = await obtenerMetodosPagoManuales(studioSlug);
            if (result.success && result.data) {
                const metodos = result.data.map(m => ({
                    id: m.id,
                    payment_method_name: m.payment_method_name,
                    payment_method: m.payment_method,
                }));
                setMetodosPago(metodos);
                if (metodos.length > 0) {
                    setMetodoPago(metodos[0].payment_method_name);
                }
            }
        } catch (error) {
            console.error('Error loading payment methods:', error);
        } finally {
            setLoadingMetodos(false);
            setInitialLoading(false);
        }
    };

    const handleSave = async () => {
        // Validaciones
        if (!concepto.trim()) {
            setError('El concepto es requerido');
            return;
        }

        if (!monto || parseFloat(monto) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        if (tipo === 'ingreso' && !metodoPago) {
            setError('Selecciona un método de pago');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (tipo === 'ingreso') {
                if (isEditMode && movimientoId) {
                    // Actualizar ingreso existente
                    const { actualizarPago } = await import('@/lib/actions/studio/business/events/payments.actions');
                    const result = await actualizarPago({
                        id: movimientoId,
                        studio_slug: studioSlug,
                        amount: parseFloat(monto),
                        metodo_pago: metodoPago,
                        concept: concepto.trim(),
                    });

                    if (result.success) {
                        toast.success('Ingreso actualizado correctamente');
                        await onSuccess?.();
                        onClose();
                    } else {
                        setError(result.error || 'Error al actualizar ingreso');
                    }
                } else {
                    // Crear nuevo ingreso
                    const result = await crearIngresoManual({
                        studio_slug: studioSlug,
                        amount: parseFloat(monto),
                        metodo_pago: metodoPago,
                        concept: concepto.trim(),
                        payment_date: new Date(),
                    });

                    if (result.success) {
                        toast.success('Ingreso registrado correctamente');
                        await onSuccess?.();
                        onClose();
                    } else {
                        setError(result.error || 'Error al registrar ingreso');
                    }
                }
            } else {
                if (isEditMode && movimientoId) {
                    // Actualizar gasto existente
                    const { actualizarGastoOperativo } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
                    const result = await actualizarGastoOperativo(studioSlug, movimientoId, {
                        concept: concepto.trim(),
                        amount: parseFloat(monto),
                        category: 'Operativo',
                    });

                    if (result.success) {
                        toast.success('Gasto actualizado correctamente');
                        await onSuccess?.();
                        onClose();
                    } else {
                        setError(result.error || 'Error al actualizar gasto');
                    }
                } else {
                    // Crear nuevo gasto
                    const result = await crearGastoOperativo(studioSlug, {
                        concept: concepto.trim(),
                        amount: parseFloat(monto),
                        category: 'Operativo',
                        date: new Date(),
                    });

                    if (result.success) {
                        toast.success('Gasto registrado correctamente');
                        await onSuccess?.();
                        onClose();
                    } else {
                        setError(result.error || 'Error al registrar gasto');
                    }
                }
            }
        } catch (err) {
            setError(`Error al registrar ${tipo === 'ingreso' ? 'ingreso' : 'gasto'}`);
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? (tipo === 'ingreso' ? 'Editar Ingreso Manual' : 'Editar Gasto Operativo') : (tipo === 'ingreso' ? 'Registrar Ingreso Manual' : 'Registrar Gasto Operativo')}
            description={isEditMode ? (tipo === 'ingreso' ? 'Edita los datos del ingreso manual' : 'Edita los datos del gasto operativo') : (tipo === 'ingreso' ? 'Registra un ingreso manual sin asociación' : 'Registra un gasto operativo')}
            onSave={handleSave}
            saveLabel={isEditMode ? 'Actualizar' : 'Guardar'}
            saveVariant="primary"
            isLoading={loading}
            onCancel={onClose}
            cancelLabel="Cancelar"
            maxWidth="sm"
        >
            {initialLoading ? (
                <div className="space-y-4">
                    {/* Skeleton para Concepto */}
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20 bg-zinc-700" />
                        <Skeleton className="h-10 w-full rounded-md bg-zinc-700" />
                    </div>

                    {/* Skeleton para Monto */}
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16 bg-zinc-700" />
                        <Skeleton className="h-10 w-full rounded-md bg-zinc-700" />
                    </div>

                    {/* Skeleton para Métodos de Pago (solo si es ingreso) */}
                    {tipo === 'ingreso' && (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32 bg-zinc-700" />
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-full rounded-lg bg-zinc-700" />
                                <Skeleton className="h-16 w-full rounded-lg bg-zinc-700" />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <ZenInput
                        label="Concepto"
                        value={concepto}
                        onChange={(e) => setConcepto(e.target.value)}
                        placeholder="Ej: Venta de equipo, Pago de servicios..."
                        required
                        error={error && !concepto.trim() ? error : undefined}
                    />

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

                    {tipo === 'ingreso' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 pb-2">
                                Método de Pago
                            </label>
                            {loadingMetodos ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-16 w-full rounded-lg" />
                                    <Skeleton className="h-16 w-full rounded-lg" />
                                </div>
                            ) : metodosPago.length === 0 ? (
                                <div className="text-sm text-red-400">No hay métodos de pago configurados</div>
                            ) : (
                                <div className="space-y-2">
                                    {metodosPago.map((metodo) => (
                                        <PaymentMethodRadio
                                            key={metodo.id}
                                            id={metodo.id}
                                            name="metodoPago"
                                            value={metodo.payment_method_name}
                                            label={metodo.payment_method_name}
                                            checked={metodoPago === metodo.payment_method_name}
                                            onChange={() => setMetodoPago(metodo.payment_method_name)}
                                        />
                                    ))}
                                </div>
                            )}
                            {error && !metodoPago && tipo === 'ingreso' && (
                                <p className="text-xs text-red-400">{error}</p>
                            )}
                        </div>
                    )}

                    {error && (concepto.trim() && monto && (tipo === 'gasto' || metodoPago)) && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}
                </div>
            )}
        </ZenDialog>
    );
}
