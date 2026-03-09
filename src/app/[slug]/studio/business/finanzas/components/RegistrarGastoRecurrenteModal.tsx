'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    ZenDialog,
    ZenInput,
    ZenButton,
} from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { CheckCircle2, Trash2, ChevronDown, Plus, CreditCard, Settings } from 'lucide-react';
import { crearGastoRecurrente, actualizarGastoRecurrente, obtenerGastoRecurrente, eliminarGastoRecurrente, obtenerTarjetasCredito } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ZenConfirmModal } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { CrearTarjetaCreditoModal } from '@/components/shared/modals';

interface RegistrarGastoRecurrenteModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onSuccess?: () => void;
    expenseId?: string; // ID del gasto recurrente a editar
}

type Recurrencia = 'weekly' | 'biweekly' | 'monthly';
type MetodoPago = 'efectivo' | 'transferencia' | 'credit_card';

const DIAS_SEMANA = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
];

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
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia');
    const [creditCardId, setCreditCardId] = useState<string>('');
    const [chargeDay, setChargeDay] = useState<number>(1);
    const [lastDayOfMonth, setLastDayOfMonth] = useState(false);
    const [tarjetas, setTarjetas] = useState<{ id: string; name: string }[]>([]);
    const [tarjetasLoading, setTarjetasLoading] = useState(false);
    const [tarjetaPopoverOpen, setTarjetaPopoverOpen] = useState(false);
    const [showCrearTarjetaModal, setShowCrearTarjetaModal] = useState(false);

    const loadExpenseData = useCallback(async () => {
        if (!expenseId) return;
        setInitialLoading(true);
        try {
            const result = await obtenerGastoRecurrente(studioSlug, expenseId);
            if (result.success && result.data) {
                const d = result.data;
                setConcepto(d.name);
                setDescripcion(d.description || '');
                setMonto(d.amount.toString());
                setRecurrencia(d.frequency as Recurrencia);
                setMetodoPago((d.payment_method as MetodoPago) || 'transferencia');
                setCreditCardId(d.default_credit_card_id || '');
                setChargeDay(d.charge_day ?? 1);
                setLastDayOfMonth(d.last_day_of_month ?? false);
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
            setMetodoPago('transferencia');
            setCreditCardId('');
            setChargeDay(1);
            setLastDayOfMonth(false);
            setError(null);
            setInitialLoading(true);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (metodoPago !== 'credit_card') return;
        setTarjetasLoading(true);
        obtenerTarjetasCredito(studioSlug)
            .then((res) => {
                if (res.success && res.data) {
                    setTarjetas(res.data);
                    setCreditCardId((prev) => {
                        if (prev && res.data!.some((c) => c.id === prev)) return prev;
                        const defaultCard = res.data!.find((c) => c.is_default) ?? res.data![0];
                        return defaultCard?.id ?? '';
                    });
                } else setTarjetas([]);
            })
            .finally(() => setTarjetasLoading(false));
    }, [isOpen, studioSlug, metodoPago]);

    useEffect(() => {
        const handleTarjetasChanged = () => {
            obtenerTarjetasCredito(studioSlug).then((res) => {
                if (res.success && res.data) {
                    setTarjetas(res.data);
                    setCreditCardId((current) => {
                        if (current && res.data!.some((c) => c.id === current)) return current;
                        const defaultCard = res.data!.find((c) => c.is_default) ?? res.data![0];
                        return defaultCard?.id ?? '';
                    });
                }
            });
        };
        window.addEventListener('tarjetas-credito-changed', handleTarjetasChanged);
        return () =>
            window.removeEventListener('tarjetas-credito-changed', handleTarjetasChanged);
    }, [studioSlug]);

    const handleSave = async () => {
        if (!concepto.trim()) {
            setError('El concepto es requerido');
            return;
        }

        if (descripcion.length > 200) {
            setError('La descripción no puede exceder 200 caracteres');
            return;
        }

        if (!monto || parseFloat(monto) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        setLoading(true);
        setError(null);

        const payload = {
            name: concepto.trim(),
            description: descripcion.trim() || null,
            amount: parseFloat(monto),
            frequency: recurrencia,
            category: 'fijo',
            chargeDay: recurrencia === 'monthly' && lastDayOfMonth ? 31 : chargeDay,
            lastDayOfMonth: recurrencia === 'monthly' ? lastDayOfMonth : false,
            paymentMethod: metodoPago,
            defaultCreditCardId: metodoPago === 'credit_card' ? creditCardId || null : null,
            personalId: null,
        };

        try {
            if (isEditMode && expenseId) {
                const result = await actualizarGastoRecurrente(studioSlug, expenseId, payload);
                if (result.success) {
                    toast.success('Gasto recurrente actualizado correctamente');
                    await onSuccess?.();
                    onClose();
                } else {
                    setError(result.error || 'Error al actualizar gasto recurrente');
                }
            } else {
                const result = await crearGastoRecurrente(studioSlug, payload);
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
                onSave={isEditMode ? undefined : handleSave}
                saveLabel={isEditMode ? 'Actualizar' : 'Guardar'}
                saveVariant="primary"
                isLoading={loading}
                onCancel={isEditMode ? undefined : onClose}
                cancelLabel="Cancelar"
                maxWidth="lg"
                showDeleteButton={false}
                footerLeftContent={isEditMode ? (
                    <ZenButton
                        type="button"
                        variant="ghost"
                        onClick={handleEliminarClick}
                        disabled={loading}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        Eliminar
                    </ZenButton>
                ) : undefined}
                footerRightContent={isEditMode ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <ZenButton type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancelar
                        </ZenButton>
                        <ZenButton type="button" className="flex-1" onClick={handleSave} loading={loading} variant="primary">
                            Actualizar
                        </ZenButton>
                    </div>
                ) : undefined}
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
                    <div className="flex flex-col flex-1 min-h-0">
                        <div className="space-y-4">
                        <ZenInput
                            label="Concepto"
                            value={concepto}
                            onChange={(e) => setConcepto(e.target.value)}
                            placeholder="Ej: Renta oficina, Suscripción Adobe..."
                            required
                            error={error && !concepto.trim() ? error : undefined}
                        />

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-300 block">
                                Descripción <span className="text-zinc-500">(opcional, máx. 200 caracteres)</span>
                            </label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => {
                                    if (e.target.value.length <= 200) {
                                        setDescripcion(e.target.value);
                                    }
                                }}
                                placeholder="Descripción del gasto recurrente..."
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                rows={3}
                                maxLength={200}
                            />
                            {error && descripcion.length > 200 && (
                                <p className="text-xs text-red-400">{error}</p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5 w-full">
                                <ZenInput
                                    label="Monto"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={monto}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === '') {
                                            setMonto(v);
                                            return;
                                        }
                                        const n = parseFloat(v);
                                        if (!Number.isNaN(n) && n < 0) return;
                                        setMonto(v);
                                    }}
                                    placeholder="0.00"
                                    required
                                    error={error && (!monto || parseFloat(monto) <= 0) ? error : undefined}
                                />
                            </div>
                            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/20 p-4 space-y-1.5">
                                <label className="text-sm font-medium text-zinc-300 block">
                                    Método de pago
                                </label>
                                <div className="grid grid-cols-3 gap-2 w-full">
                                    {(['efectivo', 'transferencia', 'credit_card'] as const).map((m) => (
                                        <label
                                            key={m}
                                            htmlFor={`metodo-${m}`}
                                            className={cn(
                                                'relative flex items-center justify-center gap-1.5 h-9 min-h-9 px-3 rounded-md border cursor-pointer transition-all min-w-0 text-sm',
                                                metodoPago === m ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                id={`metodo-${m}`}
                                                name="metodoPago"
                                                value={m}
                                                checked={metodoPago === m}
                                                onChange={() => { setMetodoPago(m); if (m !== 'credit_card') setCreditCardId(''); }}
                                                className="sr-only"
                                            />
                                            {metodoPago === m && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                                            <span className={cn('text-sm font-medium', metodoPago === m ? 'text-emerald-200' : 'text-zinc-300')}>
                                                {m === 'credit_card' ? 'T. Crédito' : m === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {metodoPago === 'credit_card' && (
                                    <div className="space-y-1.5 pt-3 w-full">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-xs text-zinc-400">Tarjeta de Crédito</label>
                                            <ZenButton
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.dispatchEvent(new CustomEvent('open-tarjetas-credito-modal'))}
                                                className="text-zinc-400 hover:text-zinc-200 -my-1 h-7 px-2 text-xs gap-1.5"
                                            >
                                                <Settings className="h-3.5 w-3.5 shrink-0" />
                                                Gestionar tarjetas de crédito
                                            </ZenButton>
                                        </div>
                                        <Popover open={tarjetaPopoverOpen} onOpenChange={setTarjetaPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    disabled={tarjetasLoading}
                                                    className={cn(
                                                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border text-sm text-left transition-colors',
                                                        'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50'
                                                    )}
                                                >
                                                    <span className="truncate">
                                                        {creditCardId
                                                            ? tarjetas.find((t) => t.id === creditCardId)?.name ?? 'Seleccionar tarjeta de crédito'
                                                            : 'Seleccionar tarjeta de crédito'}
                                                    </span>
                                                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                align="start"
                                                className="w-[var(--radix-popover-trigger-width)] max-w-full p-0 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
                                            >
                                                <div className="max-h-[280px] overflow-y-auto py-1">
                                                    {tarjetas.length === 0 && !tarjetasLoading ? (
                                                        <p className="px-3 py-4 text-sm text-zinc-400 text-center">
                                                            No hay tarjetas de crédito registradas
                                                        </p>
                                                    ) : (
                                                        tarjetas.map((t) => (
                                                            <button
                                                                key={t.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setCreditCardId(t.id);
                                                                    setTarjetaPopoverOpen(false);
                                                                }}
                                                                className={cn(
                                                                    'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors',
                                                                    creditCardId === t.id
                                                                        ? 'bg-emerald-500/10 text-emerald-200'
                                                                        : 'text-zinc-200 hover:bg-zinc-800'
                                                                )}
                                                            >
                                                                <CreditCard className="h-4 w-4 shrink-0 text-zinc-400" />
                                                                <span className="truncate">{t.name}</span>
                                                            </button>
                                                        ))
                                                    )}
                                                    <div className="border-t border-zinc-700/80 mt-1 pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setTarjetaPopoverOpen(false);
                                                                setShowCrearTarjetaModal(true);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                                        >
                                                            <Plus className="h-4 w-4 shrink-0" />
                                                            Añadir tarjeta de crédito
                                                        </button>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                            </div>
                            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/20 p-4 space-y-4">
                                <div className="space-y-1.5 w-full">
                                    <label className="text-sm font-medium text-zinc-300 block">
                                        Recurrencia <span className="text-red-400">*</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2 w-full">
                                    <label
                                        htmlFor="recurrencia-weekly"
                                        className={cn(
                                            'relative flex items-center justify-center gap-1.5 h-9 min-h-9 px-3 rounded-md border cursor-pointer transition-all min-w-0 text-sm',
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
                                    {recurrencia === 'weekly' && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                                    <span className={cn('text-sm font-medium', recurrencia === 'weekly' ? 'text-emerald-200' : 'text-zinc-300')}>Semanal</span>
                                </label>
                                    <label
                                        htmlFor="recurrencia-biweekly"
                                        className={cn(
                                            'relative flex items-center justify-center gap-1.5 h-9 min-h-9 px-3 rounded-md border cursor-pointer transition-all min-w-0 text-sm',
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
                                    {recurrencia === 'biweekly' && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                                    <span className={cn('text-sm font-medium', recurrencia === 'biweekly' ? 'text-emerald-200' : 'text-zinc-300')}>Quincenal</span>
                                </label>
                                    <label
                                        htmlFor="recurrencia-monthly"
                                        className={cn(
                                            'relative flex items-center justify-center gap-1.5 h-9 min-h-9 px-3 rounded-md border cursor-pointer transition-all min-w-0 text-sm',
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
                                    {recurrencia === 'monthly' && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                                    <span className={cn('text-sm font-medium', recurrencia === 'monthly' ? 'text-emerald-200' : 'text-zinc-300')}>Mensual</span>
                                </label>
                                    </div>
                                </div>

                                <div className="space-y-1.5 w-full">
                                    <label className="text-sm font-medium text-zinc-300 block">
                                        Día de pago
                                    </label>
                                {recurrencia === 'weekly' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {DIAS_SEMANA.map((d) => {
                                            const selected = chargeDay === d.value;
                                            return (
                                                <button
                                                    key={d.value}
                                                    type="button"
                                                    onClick={() => setChargeDay(d.value)}
                                                    className={cn(
                                                        'flex items-center justify-center h-9 min-h-9 px-3 rounded-md border text-sm font-medium transition-all',
                                                        selected
                                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                                                            : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600'
                                                    )}
                                                >
                                                    {d.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {recurrencia === 'biweekly' && (
                                    <div className="flex gap-2">
                                        <label
                                            className={cn(
                                                'flex-1 flex items-center justify-center gap-1.5 h-9 min-h-9 px-3 rounded-md border cursor-pointer transition-all text-sm',
                                                chargeDay === 1 ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                            )}
                                        >
                                            <input type="radio" name="biweekly" checked={chargeDay === 1} onChange={() => setChargeDay(1)} className="sr-only" />
                                            <span className="text-sm font-medium">1 y 15</span>
                                        </label>
                                        <label
                                            className={cn(
                                                'flex-1 flex items-center justify-center gap-1.5 h-9 min-h-9 px-3 rounded-md border cursor-pointer transition-all text-sm',
                                                chargeDay === 15 ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                            )}
                                        >
                                            <input type="radio" name="biweekly" checked={chargeDay === 15} onChange={() => setChargeDay(15)} className="sr-only" />
                                            <span className="text-sm font-medium">15 y último</span>
                                        </label>
                                    </div>
                                )}
                                {recurrencia === 'monthly' && (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-8 gap-1.5">
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                                                const selected = !lastDayOfMonth && chargeDay === d;
                                                return (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => {
                                                            setLastDayOfMonth(false);
                                                            setChargeDay(d);
                                                        }}
                                                        className={cn(
                                                            'flex items-center justify-center h-8 min-h-8 rounded-md border text-sm font-medium transition-all',
                                                            selected
                                                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                                                                : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600'
                                                        )}
                                                    >
                                                        {d}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLastDayOfMonth(true);
                                                setChargeDay(31);
                                            }}
                                            className={cn(
                                                'w-full flex items-center justify-center h-9 rounded-md border text-sm font-medium transition-all',
                                                lastDayOfMonth
                                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                                                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600'
                                            )}
                                        >
                                            Último día del mes
                                        </button>
                                    </div>
                                )}
                                </div>
                            </div>
                        </div>

                        {error && (concepto.trim() && monto && descripcion.length <= 200) && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}
                        </div>
                    </div>
                )}
            </ZenDialog>

            <CrearTarjetaCreditoModal
                isOpen={showCrearTarjetaModal}
                onClose={() => setShowCrearTarjetaModal(false)}
                studioSlug={studioSlug}
                onSuccess={async (newCardId) => {
                    const res = await obtenerTarjetasCredito(studioSlug);
                    if (res.success && res.data) setTarjetas(res.data);
                    setCreditCardId(newCardId);
                }}
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
