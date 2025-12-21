'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { User, Calendar, X } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/shadcn/sheet';
import {
    ZenButton,
    ZenCard,
    ZenCardContent,
    ZenInput,
    ZenDialog,
    ZenSwitch,
} from '@/components/ui/zen';
import {
    pagarGastoRecurrente,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RecurrentePagoDetalleSheetProps {
    isOpen: boolean;
    onClose: () => void;
    expenseId: string;
    expenseName: string;
    expenseAmount: number;
    studioSlug: string;
    onPagoConfirmado?: () => void;
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPagoModal, setShowPagoModal] = useState(false);
    const [pagoForm, setPagoForm] = useState<{
        totalDiscounts: number;
        paymentMethod: 'transferencia' | 'efectivo' | 'combinar';
        transferenciaAmount: number;
        efectivoAmount: number;
    }>({
        totalDiscounts: 0,
        paymentMethod: 'transferencia',
        transferenciaAmount: 0,
        efectivoAmount: 0,
    });

    const hasOpenModalRef = useRef(false);
    const showPagoModalRef = useRef(false);

    useEffect(() => {
        hasOpenModalRef.current = showPagoModal;
        showPagoModalRef.current = showPagoModal;
    }, [showPagoModal]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const calculateTotalToPay = () => {
        return expenseAmount - pagoForm.totalDiscounts;
    };

    const calculatePartialPaymentsTotal = () => {
        if (pagoForm.paymentMethod === 'combinar') {
            return pagoForm.transferenciaAmount + pagoForm.efectivoAmount;
        }
        return calculateTotalToPay();
    };

    const handlePagarClick = () => {
        const totalToPay = calculateTotalToPay();
        setPagoForm(prev => ({
            ...prev,
            paymentMethod: 'transferencia',
            transferenciaAmount: totalToPay,
            efectivoAmount: 0,
        }));
        setShowPagoModal(true);
    };

    const handleConfirmPago = async () => {
        if (isProcessing) return;

        const totalDiscounts = pagoForm.totalDiscounts;
        const totalToPay = calculateTotalToPay();

        // Validaciones
        if (totalDiscounts > expenseAmount) {
            toast.error(`El descuento no puede ser mayor al monto del gasto (${formatCurrency(expenseAmount)})`);
            return;
        }
        if (totalToPay < 0) {
            toast.error('El total a pagar no puede ser negativo');
            return;
        }

        // Validar pagos parciales si se combinan métodos
        if (pagoForm.paymentMethod === 'combinar') {
            const partialTotal = calculatePartialPaymentsTotal();
            if (Math.abs(partialTotal - totalToPay) > 0.01) {
                toast.error(`La suma de los pagos parciales (${formatCurrency(partialTotal)}) debe ser igual al total a pagar (${formatCurrency(totalToPay)})`);
                return;
            }
        }

        setIsProcessing(true);
        try {
            // Construir opciones de pago
            const partialPayments: Array<{ payment_method: string; amount: number }> = [];

            if (pagoForm.paymentMethod === 'combinar') {
                if (pagoForm.transferenciaAmount > 0) {
                    partialPayments.push({
                        payment_method: 'transferencia',
                        amount: pagoForm.transferenciaAmount,
                    });
                }
                if (pagoForm.efectivoAmount > 0) {
                    partialPayments.push({
                        payment_method: 'efectivo',
                        amount: pagoForm.efectivoAmount,
                    });
                }
            } else if (pagoForm.paymentMethod === 'efectivo') {
                partialPayments.push({
                    payment_method: 'efectivo',
                    amount: totalToPay,
                });
            }
            // Si es 'transferencia', no enviamos partialPayments (es el default)

            const result = await pagarGastoRecurrente(studioSlug, expenseId, {
                totalDiscounts: totalDiscounts > 0 ? totalDiscounts : undefined,
                partialPayments: partialPayments.length > 0 ? partialPayments : undefined,
            });

            if (result.success) {
                toast.success('Gasto recurrente pagado correctamente');
                setShowPagoModal(false);
                setPagoForm({
                    totalDiscounts: 0,
                    paymentMethod: 'transferencia',
                    transferenciaAmount: 0,
                    efectivoAmount: 0,
                });
                onClose();
                if (onPagoConfirmado) {
                    await onPagoConfirmado();
                }
            } else {
                toast.error(result.error || 'Error al pagar gasto recurrente');
            }
        } catch (error) {
            console.error('Error pagando gasto recurrente:', error);
            toast.error('Error al pagar gasto recurrente');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSheetOpenChange = useCallback((open: boolean) => {
        if (!open && !hasOpenModalRef.current && !showPagoModalRef.current) {
            onClose();
        }
    }, [onClose]);

    return (
        <>
            {/* Overlay custom del Sheet - solo visible cuando el modal NO está abierto */}
            {isOpen && !showPagoModal && (
                <div
                    className="fixed inset-0 bg-black/50 z-[49] animate-in fade-in-0"
                    onClick={() => {
                        if (!hasOpenModalRef.current && !showPagoModalRef.current) {
                            onClose();
                        }
                    }}
                />
            )}

            <Sheet open={isOpen} onOpenChange={handleSheetOpenChange} modal={false}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-2xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
                    showOverlay={false}
                    onInteractOutside={(e) => {
                        // Cuando el modal está abierto, no prevenir eventos para que los inputs funcionen
                        if (hasOpenModalRef.current || showPagoModalRef.current) {
                            e.preventDefault();
                        }
                    }}
                    onEscapeKeyDown={(e) => {
                        // Prevenir que el Sheet se cierre con Escape cuando el modal está abierto
                        if (hasOpenModalRef.current || showPagoModalRef.current) {
                            e.preventDefault();
                        }
                    }}
                >
                    <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
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

                    <div className="p-6 space-y-6">
                        {/* Resumen Total */}
                        <ZenCard variant="default" padding="sm">
                            <ZenCardContent className="p-4">
                                <p className="text-xs text-zinc-500 mb-1">Monto a pagar</p>
                                <p className="text-2xl font-semibold text-rose-400">
                                    {formatCurrency(expenseAmount)}
                                </p>
                            </ZenCardContent>
                        </ZenCard>

                        {/* Botón de pago */}
                        <div className="pt-4 border-t border-zinc-800 space-y-2">
                            <ZenButton
                                variant="primary"
                                className="w-full"
                                onClick={handlePagarClick}
                                disabled={isProcessing}
                            >
                                Pagar {formatCurrency(expenseAmount)}
                            </ZenButton>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Modal de pago con pagos parciales y descuentos */}
            <ZenDialog
                isOpen={showPagoModal}
                onClose={() => setShowPagoModal(false)}
                title="Confirmar pago recurrente"
                description={`Pago de ${expenseName}`}
                onSave={handleConfirmPago}
                saveLabel="Confirmar pago"
                saveVariant="primary"
                isLoading={isProcessing}
                onCancel={() => setShowPagoModal(false)}
                cancelLabel="Cancelar"
                maxWidth="md"
                zIndex={10060}
            >
                <div className="space-y-6" onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                    {/* Resumen */}
                    <ZenCard variant="outlined" padding="sm">
                        <ZenCardContent className="p-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Monto del gasto:</span>
                                    <span className="font-medium text-zinc-200">{formatCurrency(expenseAmount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Descuentos:</span>
                                    <span className="font-medium text-red-400">-{formatCurrency(pagoForm.totalDiscounts)}</span>
                                </div>
                                <div className="flex justify-between text-lg pt-2 border-t border-zinc-800">
                                    <span className="font-semibold text-zinc-200">Total a pagar:</span>
                                    <span className="font-bold text-emerald-400">{formatCurrency(calculateTotalToPay())}</span>
                                </div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>

                    {/* Descuentos */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Descuentos (opcional)</label>
                        <ZenInput
                            type="number"
                            step="0.01"
                            min="0"
                            max={expenseAmount}
                            value={pagoForm.totalDiscounts === 0 ? '' : pagoForm.totalDiscounts}
                            onChange={(e) => {
                                const inputValue = e.target.value.trim();

                                // Si está vacío, establecer 0
                                if (inputValue === '' || inputValue === '0') {
                                    const newTotal = expenseAmount;
                                    setPagoForm(prev => ({
                                        ...prev,
                                        totalDiscounts: 0,
                                        // Si no está combinando métodos, actualizar el monto según el método activo
                                        transferenciaAmount: prev.paymentMethod === 'transferencia' ? newTotal : prev.transferenciaAmount,
                                        efectivoAmount: prev.paymentMethod === 'efectivo' ? newTotal : prev.efectivoAmount,
                                    }));
                                    return;
                                }

                                // Parsear y validar
                                const numValue = parseFloat(inputValue);
                                if (isNaN(numValue)) return;

                                // Limitar el descuento al monto del gasto
                                const newDiscounts = Math.max(0, Math.min(expenseAmount, numValue));

                                // Si el usuario intentó ingresar un valor mayor, mostrar advertencia
                                if (numValue > expenseAmount) {
                                    toast.warning(`El descuento no puede ser mayor al monto del gasto (${formatCurrency(expenseAmount)})`);
                                }

                                const newTotal = expenseAmount - newDiscounts;
                                setPagoForm(prev => ({
                                    ...prev,
                                    totalDiscounts: newDiscounts,
                                    // Si no está combinando métodos, actualizar el monto según el método activo
                                    transferenciaAmount: prev.paymentMethod === 'transferencia' ? newTotal : prev.transferenciaAmount,
                                    efectivoAmount: prev.paymentMethod === 'efectivo' ? newTotal : prev.efectivoAmount,
                                }));
                            }}
                            onBlur={(e) => {
                                // Al perder el foco, si está vacío, asegurar que sea 0
                                if (pagoForm.totalDiscounts === 0 && e.target.value === '') {
                                    const newTotal = expenseAmount;
                                    setPagoForm(prev => ({
                                        ...prev,
                                        totalDiscounts: 0,
                                        transferenciaAmount: prev.paymentMethod === 'transferencia' ? newTotal : prev.transferenciaAmount,
                                        efectivoAmount: prev.paymentMethod === 'efectivo' ? newTotal : prev.efectivoAmount,
                                    }));
                                }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="0.00"
                            disabled={isProcessing}
                        />
                    </div>

                    {/* Método de pago */}
                    <div>
                        <label className="text-sm font-medium text-zinc-300 mb-4 block">Método de pago</label>

                        <div className="space-y-4">
                            <ZenSwitch
                                checked={pagoForm.paymentMethod === 'transferencia'}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        const totalToPay = calculateTotalToPay();
                                        setPagoForm(prev => ({
                                            ...prev,
                                            paymentMethod: 'transferencia',
                                            transferenciaAmount: totalToPay,
                                            efectivoAmount: 0,
                                        }));
                                    }
                                }}
                                disabled={isProcessing}
                                label="Transferencia"
                                variant="default"
                            />
                            <ZenSwitch
                                checked={pagoForm.paymentMethod === 'efectivo'}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        const totalToPay = calculateTotalToPay();
                                        setPagoForm(prev => ({
                                            ...prev,
                                            paymentMethod: 'efectivo',
                                            transferenciaAmount: 0,
                                            efectivoAmount: totalToPay,
                                        }));
                                    }
                                }}
                                disabled={isProcessing}
                                label="Efectivo"
                                variant="default"
                            />
                            <ZenSwitch
                                checked={pagoForm.paymentMethod === 'combinar'}
                                onCheckedChange={(checked) => {
                                    const totalToPay = calculateTotalToPay();
                                    if (checked) {
                                        setPagoForm(prev => ({
                                            ...prev,
                                            paymentMethod: 'combinar',
                                            transferenciaAmount: Math.floor(totalToPay / 2),
                                            efectivoAmount: totalToPay - Math.floor(totalToPay / 2),
                                        }));
                                    } else {
                                        setPagoForm(prev => ({
                                            ...prev,
                                            paymentMethod: 'transferencia',
                                            transferenciaAmount: totalToPay,
                                            efectivoAmount: 0,
                                        }));
                                    }
                                }}
                                disabled={isProcessing}
                                label="Combinar métodos de pago"
                                variant="default"
                            />
                        </div>
                    </div>

                    {/* Inputs cuando se combinan métodos */}
                    {pagoForm.paymentMethod === 'combinar' && (
                        <div className="space-y-3 pt-2 border-t border-zinc-800">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400">Transferencia</label>
                                <ZenInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={calculateTotalToPay()}
                                    value={pagoForm.transferenciaAmount === 0 ? '' : pagoForm.transferenciaAmount}
                                    onChange={(e) => {
                                        const totalToPay = calculateTotalToPay();
                                        const inputValue = e.target.value.trim();
                                        if (inputValue === '' || inputValue === '0') {
                                            setPagoForm(prev => ({
                                                ...prev,
                                                transferenciaAmount: 0,
                                                efectivoAmount: totalToPay,
                                            }));
                                            return;
                                        }
                                        const numValue = parseFloat(inputValue);
                                        if (isNaN(numValue)) return;
                                        const value = Math.max(0, Math.min(totalToPay, numValue));
                                        setPagoForm(prev => ({
                                            ...prev,
                                            transferenciaAmount: value,
                                            efectivoAmount: totalToPay - value,
                                        }));
                                    }}
                                    onBlur={(e) => {
                                        if (pagoForm.transferenciaAmount === 0 && pagoForm.efectivoAmount === 0) {
                                            const newTotal = calculateTotalToPay();
                                            setPagoForm(prev => ({
                                                ...prev,
                                                transferenciaAmount: newTotal,
                                                efectivoAmount: 0,
                                            }));
                                        }
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="0.00"
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400">Efectivo</label>
                                <ZenInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={calculateTotalToPay()}
                                    value={pagoForm.efectivoAmount === 0 ? '' : pagoForm.efectivoAmount}
                                    onChange={(e) => {
                                        const totalToPay = calculateTotalToPay();
                                        const inputValue = e.target.value.trim();
                                        if (inputValue === '' || inputValue === '0') {
                                            setPagoForm(prev => ({
                                                ...prev,
                                                transferenciaAmount: totalToPay,
                                                efectivoAmount: 0,
                                            }));
                                            return;
                                        }
                                        const numValue = parseFloat(inputValue);
                                        if (isNaN(numValue)) return;
                                        const value = Math.max(0, Math.min(totalToPay, numValue));
                                        setPagoForm(prev => ({
                                            ...prev,
                                            transferenciaAmount: totalToPay - value,
                                            efectivoAmount: value,
                                        }));
                                    }}
                                    onBlur={(e) => {
                                        if (pagoForm.transferenciaAmount === 0 && pagoForm.efectivoAmount === 0) {
                                            const newTotal = calculateTotalToPay();
                                            setPagoForm(prev => ({
                                                ...prev,
                                                transferenciaAmount: newTotal,
                                                efectivoAmount: 0,
                                            }));
                                        }
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="0.00"
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className="pt-2 border-t border-zinc-800">
                                <p className="text-xs text-zinc-400">
                                    Total pagos combinados: <span className="font-semibold text-zinc-200">{formatCurrency(calculatePartialPaymentsTotal())}</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </ZenDialog>
        </>
    );
}
