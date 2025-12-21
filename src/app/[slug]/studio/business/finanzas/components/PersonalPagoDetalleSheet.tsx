'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { User, Calendar, MoreVertical, Edit, Trash2, CreditCard, Plus, X } from 'lucide-react';
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
    ZenConfirmModal,
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuSeparator,
    ZenInput,
    ZenDialog,
    ZenSwitch,
} from '@/components/ui/zen';
import {
    PorPagarPersonal,
    pagarNominasPersonal,
    editarNomina,
    eliminarNomina,
    eliminarTodasNominasPersonal,
    marcarNominaPagada,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PersonalPagoDetalleSheetProps {
    isOpen: boolean;
    onClose: () => void;
    personal: PorPagarPersonal;
    studioSlug: string;
    onPagoConfirmado?: () => void;
}

export function PersonalPagoDetalleSheet({
    isOpen,
    onClose,
    personal,
    studioSlug,
    onPagoConfirmado,
}: PersonalPagoDetalleSheetProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showPagoModal, setShowPagoModal] = useState(false);
    const [editingItem, setEditingItem] = useState<{ id: string; concepto: string; monto: number; fecha: Date } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [showPagoIndividualModal, setShowPagoIndividualModal] = useState<string | null>(null);
    const [showEliminarTodosModal, setShowEliminarTodosModal] = useState(false);
    const [editForm, setEditForm] = useState({
        concept: '',
        amount: 0,
        date: new Date(),
    });
    const [pagoForm, setPagoForm] = useState<{
        totalDiscounts: number;
        paymentMethod: 'transferencia' | 'efectivo' | 'combinar'; // Solo uno activo
        transferenciaAmount: number;
        efectivoAmount: number;
    }>({
        totalDiscounts: 0,
        paymentMethod: 'transferencia', // Por defecto transferencia
        transferenciaAmount: 0,
        efectivoAmount: 0,
    });
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    // Ref para rastrear si hay modales abiertos
    const hasOpenModalRef = useRef(false);
    const showPagoModalRef = useRef(false);

    // Actualizar refs cuando cambian los estados
    useEffect(() => {
        showPagoModalRef.current = showPagoModal;
    }, [showPagoModal]);

    useEffect(() => {
        hasOpenModalRef.current = showDeleteModal !== null || showPagoIndividualModal !== null || editingItem !== null || showEliminarTodosModal || showPagoModal;
    }, [showDeleteModal, showPagoIndividualModal, editingItem, showEliminarTodosModal, showPagoModal]);

    // Cerrar todos los dropdowns y quitar focus cuando se abre el sheet
    useEffect(() => {
        if (isOpen) {
            setOpenDropdowns({});
            // Quitar focus de cualquier elemento activo
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }
    }, [isOpen]);

    // Handler para el Sheet - previene cierre cuando hay modales
    const handleSheetOpenChange = useCallback((newOpen: boolean) => {
        if (!newOpen) {
            // Verificar si hay modales abiertos usando el ref para evitar problemas de timing
            if (hasOpenModalRef.current || showPagoModalRef.current) {
                return; // No permitir que el Sheet se cierre si hay modales abiertos
            }
            onClose();
        }
    }, [onClose]);

    // Handler para modales - solo cierra el modal, no el Sheet
    const handleModalClose = useCallback((modalType: 'delete' | 'pago' | 'edit' | 'eliminarTodos' | 'pagoModal') => {
        if (modalType === 'delete') {
            setShowDeleteModal(null);
        } else if (modalType === 'pago') {
            setShowPagoIndividualModal(null);
        } else if (modalType === 'edit') {
            setEditingItem(null);
        } else if (modalType === 'eliminarTodos') {
            setShowEliminarTodosModal(false);
        } else if (modalType === 'pagoModal') {
            setShowPagoModal(false);
        }
    }, []);

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
            year: 'numeric',
        }).format(date);
    };

    const handlePagarClick = () => {
        // Resetear formulario de pago
        const totalToPay = personal.totalAcumulado;
        setPagoForm({
            totalDiscounts: 0,
            paymentMethod: 'transferencia',
            transferenciaAmount: totalToPay,
            efectivoAmount: 0,
        });
        setShowPagoModal(true);
    };

    const calculateTotalToPay = () => {
        const total = personal.totalAcumulado - pagoForm.totalDiscounts;
        return Math.max(0, total);
    };

    const calculatePartialPaymentsTotal = () => {
        if (pagoForm.paymentMethod === 'combinar') {
            return pagoForm.transferenciaAmount + pagoForm.efectivoAmount;
        }
        return calculateTotalToPay();
    };

    const handleConfirmPago = async () => {
        const totalToPay = calculateTotalToPay();

        // Validar que el descuento no exceda el total acumulado
        if (pagoForm.totalDiscounts > personal.totalAcumulado) {
            toast.error(`El descuento no puede ser mayor al total acumulado (${formatCurrency(personal.totalAcumulado)})`);
            return;
        }

        // Validar que el total a pagar no sea negativo
        if (totalToPay < 0) {
            toast.error('El total a pagar no puede ser negativo');
            return;
        }

        // Construir array de pagos parciales basado en el método seleccionado
        let partialPayments: Array<{ payment_method: 'transferencia' | 'efectivo'; amount: number }> = [];

        if (pagoForm.paymentMethod === 'combinar') {
            // Combinar métodos: validar que la suma coincida
            const partialTotal = calculatePartialPaymentsTotal();
            if (Math.abs(partialTotal - totalToPay) > 0.01) {
                toast.error(`La suma de los pagos parciales (${formatCurrency(partialTotal)}) debe coincidir con el total a pagar (${formatCurrency(totalToPay)})`);
                return;
            }
            // Agregar solo los métodos con monto > 0
            if (pagoForm.transferenciaAmount > 0) {
                partialPayments.push({ payment_method: 'transferencia', amount: pagoForm.transferenciaAmount });
            }
            if (pagoForm.efectivoAmount > 0) {
                partialPayments.push({ payment_method: 'efectivo', amount: pagoForm.efectivoAmount });
            }
        } else if (pagoForm.paymentMethod === 'transferencia') {
            // Solo transferencia - no necesita pagos parciales, se usa el método por defecto
            partialPayments = [];
        } else if (pagoForm.paymentMethod === 'efectivo') {
            // Solo efectivo - crear un pago parcial con efectivo
            partialPayments = [{ payment_method: 'efectivo', amount: totalToPay }];
        }

        setIsProcessing(true);
        try {
            const nominaIds = personal.items.map((item) => item.nominaId);
            const result = await pagarNominasPersonal(
                studioSlug,
                personal.personalId,
                nominaIds,
                {
                    partialPayments: partialPayments.length > 0 ? partialPayments : undefined,
                    totalDiscounts: pagoForm.totalDiscounts > 0 ? pagoForm.totalDiscounts : undefined,
                }
            );

            if (result.success) {
                toast.success(`Pago consolidado de ${formatCurrency(totalToPay)} confirmado`);
                setShowPagoModal(false);
                // Esperar un momento para que la revalidación se complete
                await new Promise(resolve => setTimeout(resolve, 100));
                await onPagoConfirmado?.();
                // Cerrar el sheet después de pagar el consolidado completo
                onClose();
            } else {
                toast.error(result.error || 'Error al confirmar el pago');
            }
        } catch (error) {
            console.error('Error confirmando pago:', error);
            toast.error('Error al confirmar el pago');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditClick = (item: { id: string; concepto: string; monto: number; fecha: Date }) => {
        setEditingItem(item);
        setEditForm({
            concept: item.concepto,
            amount: item.monto,
            date: item.fecha,
        });
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;

        setIsProcessing(true);
        try {
            const result = await editarNomina(studioSlug, editingItem.id, {
                concept: editForm.concept,
                net_amount: editForm.amount,
                assignment_date: editForm.date,
            });

            if (result.success) {
                toast.success('Nómina actualizada correctamente');
                setEditingItem(null);
                await onPagoConfirmado?.();
            } else {
                toast.error(result.error || 'Error al actualizar nómina');
            }
        } catch (error) {
            console.error('Error actualizando nómina:', error);
            toast.error('Error al actualizar nómina');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteClick = (nominaId: string) => {
        setShowDeleteModal(nominaId);
    };

    const handleConfirmDelete = async () => {
        if (!showDeleteModal) return;

        setIsProcessing(true);
        try {
            const result = await eliminarNomina(studioSlug, showDeleteModal);

            if (result.success) {
                toast.success('Nómina eliminada correctamente');
                // Cerrar el modal primero
                setShowDeleteModal(null);
                // Esperar un tick para que el estado se actualice antes de refrescar
                await new Promise(resolve => setTimeout(resolve, 0));
                // Luego refrescar los datos
                await onPagoConfirmado?.();
            } else {
                toast.error(result.error || 'Error al eliminar nómina');
            }
        } catch (error) {
            console.error('Error eliminando nómina:', error);
            toast.error('Error al eliminar nómina');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePagoIndividualClick = (nominaId: string) => {
        setShowPagoIndividualModal(nominaId);
    };

    const handleConfirmPagoIndividual = async () => {
        if (!showPagoIndividualModal) return;

        setIsProcessing(true);
        try {
            const result = await marcarNominaPagada(studioSlug, showPagoIndividualModal);

            if (result.success) {
                toast.success('Pago individual confirmado');
                setShowPagoIndividualModal(null);
                await onPagoConfirmado?.();
            } else {
                toast.error(result.error || 'Error al confirmar pago individual');
            }
        } catch (error) {
            console.error('Error confirmando pago individual:', error);
            toast.error('Error al confirmar pago individual');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEliminarTodosClick = () => {
        setShowEliminarTodosModal(true);
    };

    const handleConfirmEliminarTodos = async () => {
        setIsProcessing(true);
        try {
            const result = await eliminarTodasNominasPersonal(studioSlug, personal.personalId);

            if (result.success) {
                toast.success(`${result.deletedCount || personal.items.length} nóminas eliminadas correctamente`);
                setShowEliminarTodosModal(false);
                // Esperar un tick para que el estado se actualice antes de refrescar
                await new Promise(resolve => setTimeout(resolve, 0));
                // Luego refrescar los datos
                await onPagoConfirmado?.();
                // Cerrar el sheet después de eliminar todas las nóminas
                onClose();
            } else {
                toast.error(result.error || 'Error al eliminar nóminas');
            }
        } catch (error) {
            console.error('Error eliminando nóminas:', error);
            toast.error('Error al eliminar nóminas');
        } finally {
            setIsProcessing(false);
        }
    };

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
                                    {personal.personalName}
                                </SheetTitle>
                                <SheetDescription className="text-zinc-400">
                                    {personal.items.length} {personal.items.length === 1 ? 'concepto pendiente' : 'conceptos pendientes'}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="p-6 space-y-6">
                        {/* Resumen Total */}
                        <ZenCard variant="default" padding="sm">
                            <ZenCardContent className="p-4">
                                <p className="text-xs text-zinc-500 mb-1">Total acumulado a pagar</p>
                                <p className="text-2xl font-semibold text-rose-400">
                                    {formatCurrency(personal.totalAcumulado)}
                                </p>
                            </ZenCardContent>
                        </ZenCard>

                        {/* Lista de conceptos */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-300">Conceptos incluidos</h3>
                            <div className="space-y-2">
                                {personal.items.map((item) => (
                                    <ZenCard key={item.id} variant="default" padding="sm">
                                        <ZenCardContent className="p-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-zinc-200 mb-0.5">
                                                        {item.concepto}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{formatDate(item.fecha)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <p className="text-sm font-semibold text-rose-400">
                                                        {formatCurrency(item.monto)}
                                                    </p>
                                                    <ZenDropdownMenu
                                                        open={openDropdowns[item.id] || false}
                                                        onOpenChange={(open) => {
                                                            setOpenDropdowns(prev => ({
                                                                ...prev,
                                                                [item.id]: open
                                                            }));
                                                        }}
                                                    >
                                                        <ZenDropdownMenuTrigger asChild>
                                                            <ZenButton
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                                                                onMouseDown={(e) => {
                                                                    // Prevenir focus automático al hacer click
                                                                    e.preventDefault();
                                                                }}
                                                                tabIndex={-1}
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </ZenButton>
                                                        </ZenDropdownMenuTrigger>
                                                        <ZenDropdownMenuContent align="end">
                                                            <ZenDropdownMenuItem
                                                                onClick={() => handleEditClick(item)}
                                                                className="gap-2"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                                Editar
                                                            </ZenDropdownMenuItem>
                                                            <ZenDropdownMenuItem
                                                                onClick={() => handlePagoIndividualClick(item.nominaId)}
                                                                className="gap-2"
                                                            >
                                                                <CreditCard className="h-4 w-4" />
                                                                Pasar a pago individual
                                                            </ZenDropdownMenuItem>
                                                            <ZenDropdownMenuSeparator />
                                                            <ZenDropdownMenuItem
                                                                onClick={() => handleDeleteClick(item.nominaId)}
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
                                ))}
                            </div>
                        </div>

                        {/* Botón de pago */}
                        <div className="pt-4 border-t border-zinc-800 space-y-2">
                            <ZenButton
                                variant="primary"
                                className="w-full"
                                onClick={handlePagarClick}
                                disabled={isProcessing}
                            >
                                Pagar {formatCurrency(personal.totalAcumulado)}
                            </ZenButton>
                            <ZenButton
                                variant="destructive"
                                className="w-full bg-red-600/10 border border-red-600/50 text-red-400 hover:bg-red-600/20 hover:border-red-600 hover:text-red-300"
                                onClick={handleEliminarTodosClick}
                                disabled={isProcessing}
                                icon={Trash2}
                                iconPosition="left"
                            >
                                Eliminar todos
                            </ZenButton>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Modal de pago con pagos parciales y descuentos */}
            <ZenDialog
                isOpen={showPagoModal}
                onClose={() => setShowPagoModal(false)}
                title="Confirmar pago consolidado"
                description={`Pago a ${personal.personalName} por ${personal.items.length} ${personal.items.length === 1 ? 'concepto' : 'conceptos'}`}
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
                                    <span className="text-zinc-400">Total acumulado:</span>
                                    <span className="font-medium text-zinc-200">{formatCurrency(personal.totalAcumulado)}</span>
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
                            max={personal.totalAcumulado}
                            value={pagoForm.totalDiscounts === 0 ? '' : pagoForm.totalDiscounts}
                            onChange={(e) => {
                                const inputValue = e.target.value.trim();

                                // Si está vacío, establecer 0
                                if (inputValue === '' || inputValue === '0') {
                                    const newTotal = personal.totalAcumulado;
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

                                // Limitar el descuento al total acumulado
                                const newDiscounts = Math.max(0, Math.min(personal.totalAcumulado, numValue));

                                // Si el usuario intentó ingresar un valor mayor, mostrar advertencia
                                if (numValue > personal.totalAcumulado) {
                                    toast.warning(`El descuento no puede ser mayor al total acumulado (${formatCurrency(personal.totalAcumulado)})`);
                                }

                                const newTotal = personal.totalAcumulado - newDiscounts;
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
                                    const newTotal = personal.totalAcumulado;
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

                    {/* Métodos de pago */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-zinc-300 mb-4 block">Método de pago</label>

                        <div className="space-y-4">
                            {/* Switch Transferencia */}
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

                            {/* Switch Efectivo */}
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

                            {/* Switch Combinar métodos */}
                            <ZenSwitch
                                checked={pagoForm.paymentMethod === 'combinar'}
                                onCheckedChange={(checked) => {
                                    const totalToPay = calculateTotalToPay();
                                    if (checked) {
                                        // Al activar combinar, dividir el total entre los dos métodos
                                        setPagoForm(prev => ({
                                            ...prev,
                                            paymentMethod: 'combinar',
                                            transferenciaAmount: Math.floor(totalToPay / 2),
                                            efectivoAmount: totalToPay - Math.floor(totalToPay / 2),
                                        }));
                                    } else {
                                        // Al desactivar, volver a transferencia por defecto
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

                        {/* Inputs cuando se combinan métodos */}
                        {pagoForm.paymentMethod === 'combinar' && (
                            <div className="space-y-3 pt-2 border-t border-zinc-800">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Transferencia</label>
                                    <ZenInput
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={pagoForm.transferenciaAmount === 0 ? '' : pagoForm.transferenciaAmount}
                                        onChange={(e) => {
                                            const totalToPay = calculateTotalToPay();
                                            const inputValue = e.target.value.trim();

                                            // Si está vacío, establecer 0 y el resto en efectivo
                                            if (inputValue === '' || inputValue === '0') {
                                                setPagoForm(prev => ({
                                                    ...prev,
                                                    transferenciaAmount: 0,
                                                    efectivoAmount: totalToPay,
                                                }));
                                                return;
                                            }

                                            // Parsear y validar
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
                                            // Al perder el foco, asegurar que tenga un valor válido
                                            const totalToPay = calculateTotalToPay();
                                            if (pagoForm.transferenciaAmount === 0 && pagoForm.efectivoAmount === 0) {
                                                setPagoForm(prev => ({
                                                    ...prev,
                                                    transferenciaAmount: totalToPay,
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
                                        value={pagoForm.efectivoAmount === 0 ? '' : pagoForm.efectivoAmount}
                                        onChange={(e) => {
                                            const totalToPay = calculateTotalToPay();
                                            const inputValue = e.target.value.trim();

                                            // Si está vacío, establecer 0 y el resto en transferencia
                                            if (inputValue === '' || inputValue === '0') {
                                                setPagoForm(prev => ({
                                                    ...prev,
                                                    efectivoAmount: 0,
                                                    transferenciaAmount: totalToPay,
                                                }));
                                                return;
                                            }

                                            // Parsear y validar
                                            const numValue = parseFloat(inputValue);
                                            if (isNaN(numValue)) return;

                                            const value = Math.max(0, Math.min(totalToPay, numValue));
                                            setPagoForm(prev => ({
                                                ...prev,
                                                efectivoAmount: value,
                                                transferenciaAmount: totalToPay - value,
                                            }));
                                        }}
                                        onBlur={(e) => {
                                            // Al perder el foco, asegurar que tenga un valor válido
                                            const totalToPay = calculateTotalToPay();
                                            if (pagoForm.transferenciaAmount === 0 && pagoForm.efectivoAmount === 0) {
                                                setPagoForm(prev => ({
                                                    ...prev,
                                                    transferenciaAmount: totalToPay,
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
                                <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
                                    <span className="text-zinc-400">Total pagos combinados:</span>
                                    <span className={`font-medium ${Math.abs(calculatePartialPaymentsTotal() - calculateTotalToPay()) < 0.01 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatCurrency(calculatePartialPaymentsTotal())}
                                    </span>
                                </div>
                                {Math.abs(calculatePartialPaymentsTotal() - calculateTotalToPay()) > 0.01 && (
                                    <p className="text-xs text-red-400">
                                        La suma de los pagos parciales debe coincidir con el total a pagar
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </ZenDialog>

            {/* Modal de edición */}
            <ZenDialog
                isOpen={editingItem !== null}
                onClose={() => handleModalClose('edit')}
                title="Editar nómina"
                description="Edita los datos de la nómina pendiente"
                onSave={handleSaveEdit}
                saveLabel="Guardar"
                saveVariant="primary"
                isLoading={isProcessing}
                onCancel={() => setEditingItem(null)}
                cancelLabel="Cancelar"
                maxWidth="sm"
            >
                <div className="space-y-4">
                    <ZenInput
                        label="Concepto"
                        value={editForm.concept}
                        onChange={(e) => setEditForm({ ...editForm, concept: e.target.value })}
                        required
                    />
                    <ZenInput
                        label="Monto"
                        type="number"
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                        required
                    />
                    <ZenInput
                        label="Fecha"
                        type="date"
                        value={editForm.date.toISOString().split('T')[0]}
                        onChange={(e) => setEditForm({ ...editForm, date: new Date(e.target.value) })}
                        required
                    />
                </div>
            </ZenDialog>

            {/* Modal de confirmación eliminar */}
            <ZenConfirmModal
                isOpen={showDeleteModal !== null}
                onClose={() => handleModalClose('delete')}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar nómina?"
                description="Esta acción eliminará permanentemente la nómina. Esta acción no se puede deshacer."
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isProcessing}
                loadingText="Eliminando..."
            />

            {/* Modal de confirmación pago individual */}
            <ZenConfirmModal
                isOpen={showPagoIndividualModal !== null}
                onClose={() => handleModalClose('pago')}
                onConfirm={handleConfirmPagoIndividual}
                title="¿Pasar a pago individual?"
                description="Esta nómina será marcada como pagada y aparecerá en movimientos. Se eliminará de la lista de pendientes."
                confirmText="Sí, pagar"
                cancelText="Cancelar"
                variant="default"
                loading={isProcessing}
                loadingText="Procesando..."
            />

            {/* Modal de confirmación eliminar todos */}
            <ZenConfirmModal
                isOpen={showEliminarTodosModal}
                onClose={() => handleModalClose('eliminarTodos')}
                onConfirm={handleConfirmEliminarTodos}
                title="¿Eliminar la nómina consolidada?"
                description={`¿Estás seguro de que deseas eliminar la nómina consolidada para ${personal.personalName}? Esta acción eliminará todas las ${personal.items.length} ${personal.items.length === 1 ? 'nómina pendiente' : 'nóminas pendientes'} y no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isProcessing}
                loadingText="Eliminando..."
            />
        </>
    );
}
