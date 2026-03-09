'use client';

import React, { useState, useEffect } from 'react';
import {
    Wallet,
    Landmark,
    CreditCard,
    AlertTriangle,
    Loader2,
    RotateCcw,
    ChevronDown,
    Plus,
    Star,
} from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/shadcn/dialog';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/shadcn/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { cn } from '@/lib/utils';
import {
    obtenerSaldosPersistidos,
    obtenerTarjetasCredito,
    confirmarDevolucionMultiple,
    pagarGastoRecurrente,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { obtenerMetodosPagoManuales } from '@/lib/actions/studio/config/metodos-pago.actions';
import { CrearTarjetaCreditoModal } from '@/components/shared/modals';
import { toast } from 'sonner';

export type UniversalFinanceModalMode = 'expense' | 'refund';

export interface UniversalFinanceModalData {
    amount: number;
    title: string;
    subtitle?: string;
    /** Para refund: IDs de studio_pagos a devolver */
    paymentIds?: string[];
    /** Para expense: ID del gasto recurrente o crew (crew-xxx) */
    expenseId?: string;
    contactName?: string | null;
    eventName?: string | null;
    eventTypeName?: string | null;
}

interface UniversalFinanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    mode: UniversalFinanceModalMode;
    data: UniversalFinanceModalData;
    /** Tras confirmar con éxito (refund o expense) */
    onSuccess?: () => void | Promise<void>;
    /** Tipo de método preseleccionado (para gasto recurrente con método definido). 'tarjeta' equivale a credit_card. */
    preselectedMethod?: 'efectivo' | 'transferencia' | 'credit_card';
    /** Alias de preselectedMethod; acepta 'tarjeta' como sinónimo de credit_card. */
    preselectedMethodType?: 'efectivo' | 'transferencia' | 'tarjeta';
    /** ID del método preseleccionado (cuenta bancaria o tarjeta). Requerido cuando el tipo es transferencia o tarjeta. */
    preselectedMethodId?: string | null;
    /** Métodos a ocultar en el selector (ej. ['credit_card'] en refund). Por defecto en refund se usa ['credit_card']. */
    disabledMethods?: string[];
}

type MetodoPago = 'efectivo' | 'transferencia' | 'credit_card';

export function UniversalFinanceModal({
    isOpen,
    onClose,
    studioSlug,
    mode,
    data,
    onSuccess,
    preselectedMethod: preselectedMethodProp,
    preselectedMethodType,
    preselectedMethodId,
    disabledMethods: disabledMethodsProp,
}: UniversalFinanceModalProps) {
    const { amount, title, subtitle, paymentIds, expenseId, contactName, eventName } = data;
    const preselectedMethod =
        preselectedMethodProp ??
        (preselectedMethodType === 'tarjeta' ? 'credit_card' : preselectedMethodType);

    const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
    const [metodoPagoId, setMetodoPagoId] = useState('');
    const [creditCardId, setCreditCardId] = useState('');
    const [saldos, setSaldos] = useState<{ cashBalance: number; bankBalance: number } | null>(null);
    const [cuentasBancarias, setCuentasBancarias] = useState<
        Array<{ id: string; payment_method_name: string; current_balance: number }>
    >([]);
    const [tarjetas, setTarjetas] = useState<Array<{ id: string; name: string; balance: number; is_default?: boolean }>>([]);
    const [loadingSaldos, setLoadingSaldos] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showAddCardModal, setShowAddCardModal] = useState(false);
    const [cardPopoverOpen, setCardPopoverOpen] = useState(false);

    const isRefund = mode === 'refund';
    const disabledMethods = disabledMethodsProp ?? (isRefund ? ['credit_card'] : []);
    const showCreditCard = !disabledMethods.includes('credit_card');

    useEffect(() => {
        if (!isOpen || !studioSlug) return;
        setMetodoPago(null);
        setMetodoPagoId('');
        setCreditCardId('');
        setLoadingSaldos(true);
        const load = async () => {
            const [saldosRes, metodosRes] = await Promise.all([
                obtenerSaldosPersistidos(studioSlug),
                obtenerMetodosPagoManuales(studioSlug),
            ]);
            if (saldosRes.success && saldosRes.data) setSaldos(saldosRes.data);
            else setSaldos(null);
            let transferencias: Array<{ id: string; payment_method_name: string; current_balance: number }> = [];
            if (metodosRes.success && metodosRes.data) {
                transferencias = metodosRes.data
                    .filter((m: { payment_method?: string }) => m.payment_method === 'transferencia')
                    .map((m: { id: string; payment_method_name?: string; banco?: string; current_balance?: number }) => ({
                        id: m.id,
                        payment_method_name: m.payment_method_name || m.banco || 'Cuenta',
                        current_balance: Number(m.current_balance ?? 0),
                    }));
                setCuentasBancarias(transferencias);
                if (transferencias.length === 1) setMetodoPagoId(transferencias[0].id);
            } else setCuentasBancarias([]);

            let cards: Array<{ id: string; name: string; balance: number; is_default?: boolean }> = [];
            if (showCreditCard) {
                const tarjetasRes = await obtenerTarjetasCredito(studioSlug);
                if (tarjetasRes.success && tarjetasRes.data) {
                    cards = tarjetasRes.data.map((t) => ({
                        id: t.id,
                        name: t.name,
                        balance: t.balance ?? 0,
                        is_default: t.is_default,
                    }));
                    setTarjetas(cards);
                    const defaultCard = tarjetasRes.data.find((c) => c.is_default) ?? tarjetasRes.data[0];
                    if (defaultCard) setCreditCardId(defaultCard.id);
                } else setTarjetas([]);
            }

            // Aplicar preselección según método definido (ej. gasto recurrente). Siempre expandir el método aunque el id no coincida.
            if (preselectedMethod === 'efectivo') {
                setMetodoPago('efectivo');
            } else if (preselectedMethod === 'transferencia') {
                setMetodoPago('transferencia');
                const idValido = preselectedMethodId && transferencias.some((t) => t.id === preselectedMethodId);
                if (idValido) {
                    setMetodoPagoId(preselectedMethodId!);
                } else if (transferencias.length === 1) {
                    setMetodoPagoId(transferencias[0].id);
                }
            } else if (preselectedMethod === 'credit_card' && showCreditCard) {
                setMetodoPago('credit_card');
                if (preselectedMethodId && cards.some((c) => c.id === preselectedMethodId)) {
                    setCreditCardId(preselectedMethodId);
                } else {
                    const defaultCard = cards.find((c) => c.is_default) ?? cards[0];
                    if (defaultCard) setCreditCardId(defaultCard.id);
                }
            }
        };
        load().finally(() => setLoadingSaldos(false));
    }, [isOpen, studioSlug, showCreditCard, preselectedMethod, preselectedMethodId]);

    useEffect(() => {
        if (metodoPago !== 'credit_card' || tarjetas.length === 0) return;
        const valid = creditCardId && tarjetas.some((c) => c.id === creditCardId);
        if (valid) return;
        const defaultCard = tarjetas.find((c) => c.is_default) ?? tarjetas[0];
        if (defaultCard) setCreditCardId(defaultCard.id);
    }, [metodoPago, tarjetas, creditCardId]);

    const handleConfirm = async () => {
        if (!metodoPago) return;
        if (metodoPago === 'transferencia' && !metodoPagoId) return;
        if (metodoPago === 'credit_card' && !creditCardId) return;

        setSubmitting(true);
        try {
            if (isRefund) {
                const ids = paymentIds ?? [];
                if (ids.length === 0) {
                    toast.error('No hay pagos que confirmar');
                    return;
                }
                const result = await confirmarDevolucionMultiple(studioSlug, ids, {
                    metodoPago,
                    metodo_pago_id: metodoPago === 'transferencia' ? metodoPagoId : null,
                });
                if (result.success) {
                    toast.success('Reembolso aplicado y balance actualizado');
                    onClose();
                    await onSuccess?.();
                } else {
                    toast.error(result.error ?? 'Error al confirmar reembolso');
                }
            } else {
                const expId = expenseId;
                if (!expId) {
                    toast.error('Falta identificar el gasto');
                    return;
                }
                const result = await pagarGastoRecurrente(
                    studioSlug,
                    expId,
                    metodoPago === 'credit_card'
                        ? { creditCardId }
                        : {
                            paymentMethod: metodoPago,
                            partialPayments: [{ payment_method: metodoPago, amount }],
                            ...(metodoPago === 'transferencia' && metodoPagoId ? { metodo_pago_id: metodoPagoId } : {}),
                        }
                );
                if (result.success) {
                    toast.success('Gasto recurrente pagado correctamente');
                    onClose();
                    await onSuccess?.();
                } else {
                    toast.error(result.error ?? 'Error al pagar');
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    const canConfirm =
        metodoPago &&
        (metodoPago === 'efectivo' || (metodoPago === 'transferencia' && metodoPagoId) || (metodoPago === 'credit_card' && creditCardId));

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    const modalTitle = isRefund ? 'Confirmación de reembolso' : `Pago de ${title}`;
    const amountClassName = isRefund ? 'text-rose-500' : 'text-emerald-400';
    const refundContextLine =
        isRefund && (contactName || eventName)
            ? `Para ${contactName ?? 'cliente'}${eventName ? ` · Evento: ${eventName}` : ''}`
            : null;
    const expenseSubtitle = subtitle ?? 'Gasto recurrente';
    const confirmLabel = isRefund ? 'Confirmar reembolso' : 'Confirmar pago';

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-zinc-100">{modalTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div className="space-y-1">
                            {refundContextLine && (
                                <p className="text-sm text-zinc-400">{refundContextLine}</p>
                            )}
                            <p className={cn('text-3xl font-semibold tracking-tight', amountClassName)}>
                                {formatCurrency(amount)}
                            </p>
                            <p className="text-sm text-zinc-500">
                                {isRefund ? (
                                    <>
                                        <RotateCcw className="h-3.5 w-3.5 shrink-0 text-zinc-500 inline-block mr-1.5 align-middle" aria-hidden />
                                        Reembolso al cliente
                                    </>
                                ) : (
                                    expenseSubtitle
                                )}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs font-medium text-zinc-500">
                                {isRefund ? '¿De dónde sale el dinero?' : '¿De dónde sale el dinero?'}
                            </p>
                            {loadingSaldos ? (
                                <div className="flex flex-col gap-3">
                                    <Skeleton className="h-12 w-full rounded-lg bg-zinc-700/80" />
                                    <Skeleton className="h-12 w-full rounded-lg bg-zinc-700/80" />
                                </div>
                            ) : (
                                <Accordion
                                    type="single"
                                    collapsible
                                    value={metodoPago ?? ''}
                                    onValueChange={(v) =>
                                        setMetodoPago((v || null) as MetodoPago | null)
                                    }
                                    className="flex flex-col gap-3"
                                >
                                    <AccordionItem
                                        value="efectivo"
                                        className={cn(
                                            'mb-0 rounded-lg border px-0 transition-colors',
                                            metodoPago === 'efectivo'
                                                ? 'border-emerald-500/60 bg-emerald-500/5'
                                                : 'border-zinc-700/80 bg-zinc-800/30'
                                        )}
                                    >
                                        <AccordionTrigger className="group cursor-pointer w-full px-3 py-2.5 hover:no-underline [&[data-state=open]]:rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                            <span className="flex items-center gap-2 w-full text-left">
                                                <Wallet
                                                    className={cn(
                                                        'h-4 w-4 shrink-0',
                                                        metodoPago === 'efectivo' ? 'text-emerald-400' : 'text-zinc-400'
                                                    )}
                                                />
                                                <span
                                                    className={cn(
                                                        'flex-1 text-sm font-medium',
                                                        metodoPago === 'efectivo' ? 'text-emerald-400' : 'text-zinc-300'
                                                    )}
                                                >
                                                    Efectivo
                                                </span>
                                                <span className="text-sm text-zinc-400 shrink-0 tabular-nums">
                                                    {formatCurrency(saldos?.cashBalance ?? 0)}
                                                </span>
                                                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-3 pb-3 pt-0">
                                            <p className="text-xs text-zinc-500">
                                                Los recursos serán tomados de la disponibilidad de caja.
                                            </p>
                                            {saldos != null && amount > saldos.cashBalance && (
                                                <p className="text-xs text-red-400 flex items-start gap-1.5 mt-2">
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                    No cuentas con el recurso suficiente en efectivo.
                                                </p>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem
                                        value="transferencia"
                                        className={cn(
                                            'mb-0 rounded-lg border px-0 transition-colors',
                                            metodoPago === 'transferencia'
                                                ? 'border-emerald-500/60 bg-emerald-500/5'
                                                : 'border-zinc-700/80 bg-zinc-800/30'
                                        )}
                                    >
                                        <AccordionTrigger className="group cursor-pointer w-full px-3 py-2.5 hover:no-underline [&[data-state=open]]:rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                            <span className="flex items-center gap-2 w-full text-left">
                                                <Landmark
                                                    className={cn(
                                                        'h-4 w-4 shrink-0',
                                                        metodoPago === 'transferencia' ? 'text-emerald-400' : 'text-zinc-400'
                                                    )}
                                                />
                                                <span
                                                    className={cn(
                                                        'flex-1 text-sm font-medium',
                                                        metodoPago === 'transferencia' ? 'text-emerald-400' : 'text-zinc-300'
                                                    )}
                                                >
                                                    Transferencia
                                                </span>
                                                <span className="text-sm text-zinc-400 shrink-0 tabular-nums">
                                                    {formatCurrency(saldos?.bankBalance ?? 0)}
                                                </span>
                                                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-3 pb-3 pt-0">
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-zinc-400">
                                                    Fondos disponibles del banco del negocio
                                                </p>
                                                {cuentasBancarias.length === 0 ? (
                                                    <p className="text-xs text-amber-400 flex items-start gap-1.5 mt-1">
                                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                        No hay cuentas bancarias activas.
                                                    </p>
                                                ) : (
                                                    <>
                                                        {cuentasBancarias.length > 1 && (
                                                            <select
                                                                value={metodoPagoId}
                                                                onChange={(e) => setMetodoPagoId(e.target.value)}
                                                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 text-sm mt-1"
                                                            >
                                                                <option value="">Seleccionar cuenta</option>
                                                                {cuentasBancarias.map((c) => (
                                                                    <option key={c.id} value={c.id}>
                                                                        {c.payment_method_name} ·{' '}
                                                                        {formatCurrency(c.current_balance)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {saldos != null && amount > saldos.bankBalance && (
                                                            <p className="text-xs text-red-400 flex items-start gap-1.5 mt-2">
                                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                                El monto supera el saldo disponible en cuentas bancarias.
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {showCreditCard && (
                                        <AccordionItem
                                            value="credit_card"
                                            className={cn(
                                                'mb-0 rounded-lg border px-0 transition-colors',
                                                metodoPago === 'credit_card'
                                                    ? 'border-emerald-500/60 bg-emerald-500/5'
                                                    : 'border-zinc-700/80 bg-zinc-800/30'
                                            )}
                                        >
                                            <AccordionTrigger className="group cursor-pointer w-full px-3 py-2.5 hover:no-underline [&[data-state=open]]:rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                                <span className="flex items-center gap-2 w-full text-left">
                                                    <CreditCard
                                                        className={cn(
                                                            'h-4 w-4 shrink-0',
                                                            metodoPago === 'credit_card' ? 'text-emerald-400' : 'text-zinc-400'
                                                        )}
                                                    />
                                                    <span
                                                        className={cn(
                                                            'flex-1 text-sm font-medium',
                                                            metodoPago === 'credit_card' ? 'text-emerald-400' : 'text-zinc-300'
                                                        )}
                                                    >
                                                        T. Crédito
                                                    </span>
                                                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-3 pb-3 pt-0">
                                                <p className="text-xs text-zinc-500">
                                                    Este pago generará una deuda que será pagable hacia el banco en tu fecha de pago.
                                                </p>
                                                <div className="flex items-center justify-between gap-2 mt-1">
                                                    <span className="text-xs font-medium text-zinc-500">
                                                        Tarjeta de crédito
                                                    </span>
                                                </div>
                                                <Popover open={cardPopoverOpen} onOpenChange={setCardPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 text-left hover:bg-zinc-800/80 mt-1"
                                                        >
                                                            <span className="min-w-0 truncate">
                                                                {tarjetas.length === 0
                                                                    ? 'Seleccionar tarjeta de crédito'
                                                                    : creditCardId
                                                                      ? tarjetas.find((c) => c.id === creditCardId)?.name ??
                                                                        'Seleccionar tarjeta de crédito'
                                                                      : 'Seleccionar tarjeta de crédito'}
                                                            </span>
                                                            <span className="flex items-center gap-1 shrink-0">
                                                                {creditCardId &&
                                                                    (() => {
                                                                        const c = tarjetas.find((x) => x.id === creditCardId);
                                                                        return c && c.balance < 0 ? (
                                                                            <span className="text-xs text-zinc-500">
                                                                                {formatCurrency(c.balance)}
                                                                            </span>
                                                                        ) : null;
                                                                    })()}
                                                                <ChevronDown className="h-4 w-4 text-zinc-500" />
                                                            </span>
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-1 bg-zinc-900 border-zinc-700"
                                                        align="start"
                                                    >
                                                        {tarjetas.length === 0 ? (
                                                            <div className="p-2 space-y-2">
                                                                <p className="text-xs text-zinc-500">
                                                                    No tienes tarjetas registradas
                                                                </p>
                                                                <ZenButton
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="w-full justify-start gap-1.5 text-zinc-400 hover:text-zinc-200"
                                                                    onClick={() => {
                                                                        setCardPopoverOpen(false);
                                                                        setShowAddCardModal(true);
                                                                    }}
                                                                >
                                                                    <Plus className="h-3.5 w-3.5" />
                                                                    Añadir tarjeta de crédito
                                                                </ZenButton>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <ul className="max-h-48 overflow-y-auto">
                                                                    {tarjetas.map((c) => (
                                                                        <li key={c.id}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setCreditCardId(c.id);
                                                                                    setCardPopoverOpen(false);
                                                                                }}
                                                                                className={cn(
                                                                                    'w-full flex items-center justify-between gap-2 px-2 py-2 rounded text-sm text-left hover:bg-zinc-800',
                                                                                    creditCardId === c.id &&
                                                                                        'bg-emerald-500/10 text-emerald-400'
                                                                                )}
                                                                            >
                                                                                <span className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                                    {c.is_default && (
                                                                                        <Star
                                                                                            className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
                                                                                            aria-label="Predeterminada"
                                                                                        />
                                                                                    )}
                                                                                    <span className="truncate">{c.name}</span>
                                                                                </span>
                                                                                {c.balance < 0 && (
                                                                                    <span className="text-xs text-zinc-500 shrink-0">
                                                                                        {formatCurrency(c.balance)}
                                                                                    </span>
                                                                                )}
                                                                            </button>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                                <div className="border-t border-zinc-700 mt-1 pt-1">
                                                                    <ZenButton
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-full justify-start gap-1.5 text-zinc-400 hover:text-zinc-200"
                                                                        onClick={() => {
                                                                            setCardPopoverOpen(false);
                                                                            setShowAddCardModal(true);
                                                                        }}
                                                                    >
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                        Añadir tarjeta de crédito
                                                                    </ZenButton>
                                                                </div>
                                                            </>
                                                        )}
                                                    </PopoverContent>
                                                </Popover>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )}
                                </Accordion>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between w-full gap-4 pt-6 border-t border-zinc-800">
                        <ZenButton variant="ghost" onClick={onClose} disabled={submitting} className="text-zinc-400 hover:text-zinc-200">
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            onClick={handleConfirm}
                            disabled={!canConfirm || loadingSaldos || submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                    Aplicando...
                                </>
                            ) : (
                                confirmLabel
                            )}
                        </ZenButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showCreditCard && (
                <CrearTarjetaCreditoModal
                    isOpen={showAddCardModal}
                    onClose={() => setShowAddCardModal(false)}
                    studioSlug={studioSlug}
                    zIndex={100070}
                    onSuccess={async (newCardId) => {
                        setShowAddCardModal(false);
                        const res = await obtenerTarjetasCredito(studioSlug);
                        if (res.success && res.data) {
                            setTarjetas(
                                res.data.map((t) => ({
                                    id: t.id,
                                    name: t.name,
                                    balance: t.balance ?? 0,
                                    is_default: t.is_default,
                                }))
                            );
                            setCreditCardId(newCardId);
                        }
                    }}
                />
            )}
        </>
    );
}
