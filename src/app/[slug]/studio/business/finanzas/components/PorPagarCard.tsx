'use client';

import React, { useState, useEffect } from 'react';
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
import { pagarGastoRecurrente, cancelarPagoGastoRecurrente, eliminarGastoRecurrente, obtenerTarjetasCredito, obtenerSaldosPersistidos } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import type { TarjetaCreditoItem } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { obtenerMetodosPagoManuales } from '@/lib/actions/studio/config/metodos-pago.actions';
import { Repeat, ArrowDown, Plus, MoreVertical, X, Trash2, Edit, Wallet, Landmark, CreditCard, Settings, AlertTriangle, ChevronDown, ChevronRight, Loader2, Star } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/shadcn/tooltip';
import { Accordion, AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from '@/components/ui/shadcn/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { CrearTarjetaCreditoModal } from '@/components/shared/modals';

export interface RecurringExpenseForPorPagar {
    id: string;
    name: string;
    amount: number;
    frequency?: string;
    chargeDay?: number;
    pagosMesActual?: number;
    totalPagosEsperados?: number;
    paymentMethod?: string | null;
    paymentMethodLabel?: string | null;
    defaultCreditCardId?: string | null;
    defaultCreditCardName?: string | null;
    /** Cuenta bancaria por defecto cuando paymentMethod es transferencia */
    defaultMetodoPagoId?: string | null;
    description?: string | null;
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

/** Texto corto del método de pago para la ficha (ej. "Efectivo", "Transferencia", "Nu") */
function getPaymentMethodShortLabel(expense: RecurringExpenseForPorPagar): string | null {
    const method = expense.paymentMethod;
    if (!method) return null;
    if (method === 'efectivo') return 'Efectivo';
    if (method === 'transferencia') return 'Transferencia';
    if (method === 'credit_card') {
        return expense.defaultCreditCardName || expense.paymentMethodLabel?.replace(/^Tarjeta\s+/i, '') || 'Tarjeta';
    }
    return expense.paymentMethodLabel ?? null;
}

/** Línea recurrencia + método predeterminado (ej. "Mensual - Día 1 · Tarjeta Nu") */
function getRecurrenceAndMethodLine(e: RecurringExpenseForPorPagar): string {
    const freq = getFrequencyLabel(e.frequency);
    const dayPart = e.chargeDay != null ? ` - Día ${e.chargeDay}` : '';
    const methodLabel = getPaymentMethodShortLabel(e);
    return methodLabel ? `${freq}${dayPart} · ${methodLabel}` : `${freq}${dayPart}`;
}

function PaymentMethodDisplay({ expense }: { expense: RecurringExpenseForPorPagar }) {
    const method = expense.paymentMethod;
    if (!method) return null;
    if (method === 'efectivo') {
        return (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Wallet className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
                Efectivo
            </span>
        );
    }
    if (method === 'transferencia') {
        return (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Landmark className="h-3.5 w-3.5 shrink-0 text-blue-400" aria-hidden />
                Transferencia
            </span>
        );
    }
    if (method === 'credit_card') {
        const cardName = expense.defaultCreditCardName || expense.paymentMethodLabel?.replace(/^Tarjeta\s+/i, '') || 'Tarjeta';
        return (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <CreditCard className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden />
                {cardName}
            </span>
        );
    }
    return expense.paymentMethodLabel ? (
        <span className="text-xs text-zinc-400">{expense.paymentMethodLabel}</span>
    ) : null;
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
    const [payRecurrenteMethod, setPayRecurrenteMethod] = useState<'efectivo' | 'transferencia' | 'credit_card' | null>(null);
    const [payRecurrenteCreditCardId, setPayRecurrenteCreditCardId] = useState('');
    const [payRecurrenteMetodoPagoId, setPayRecurrenteMetodoPagoId] = useState('');
    const [tarjetasForPay, setTarjetasForPay] = useState<TarjetaCreditoItem[]>([]);
    const [cuentasBancarias, setCuentasBancarias] = useState<Array<{ id: string; payment_method_name: string }>>([]);
    const [loadingTarjetas, setLoadingTarjetas] = useState(false);
    /** Método con el que se abrió el modal (para alerta si el usuario cambia) */
    const [initialPaymentMethod, setInitialPaymentMethod] = useState<'efectivo' | 'transferencia' | 'credit_card' | null>(null);
    const [showCrearTarjetaModal, setShowCrearTarjetaModal] = useState(false);
    const [saldosPersistidos, setSaldosPersistidos] = useState<{ cashBalance: number; bankBalance: number } | null>(null);
    const [cardPopoverOpen, setCardPopoverOpen] = useState(false);

    const totalItems = porPagar.reduce((sum, p) => sum + p.items.length, 0);
    const recurrentesPendientes = recurringExpenses.filter(
        (e) => (e.pagosMesActual ?? 0) < (e.totalPagosEsperados ?? 1)
    );
    const totalRecurrentesPendientes = recurrentesPendientes.length;
    /** Suma de nóminas pendientes + recurrentes no pagados del mes (para header) */
    const totalPorPagarNominas = porPagar.reduce((sum, p) => sum + p.totalAcumulado, 0);
    const totalPorPagarRecurrentes = recurrentesPendientes.reduce((sum, e) => {
        const pendientes = (e.totalPagosEsperados ?? 1) - (e.pagosMesActual ?? 0);
        return sum + pendientes * e.amount;
    }, 0);
    const totalPorPagarMonto = totalPorPagarNominas + totalPorPagarRecurrentes;
    const payingExpense = payingExpenseId
        ? recurrentesPendientes.find((e) => e.id === payingExpenseId)
        : null;

    const cancelRecurrenteExpense = cancelRecurrenteId
        ? recurrentesPendientes.find((e) => e.id === cancelRecurrenteId)
        : null;

    // Al abrir el modal: inicializar método/cuenta/tarjeta desde el gasto y cargar listas (solo cuando abre; no depender de recurrentesPendientes para evitar loop)
    useEffect(() => {
        if (!payingExpenseId || !studioSlug) return;
        const expense = recurrentesPendientes.find((e) => e.id === payingExpenseId);
        const method: 'efectivo' | 'transferencia' | 'credit_card' = (expense?.paymentMethod === 'efectivo' || expense?.paymentMethod === 'transferencia' || expense?.paymentMethod === 'credit_card')
            ? expense.paymentMethod
            : 'transferencia';
        setInitialPaymentMethod(method);
        setPayRecurrenteMethod(method);
        setPayRecurrenteCreditCardId(method === 'credit_card' && expense?.defaultCreditCardId ? expense.defaultCreditCardId : '');
        setPayRecurrenteMetodoPagoId(expense?.defaultMetodoPagoId ?? '');
        setLoadingTarjetas(true);
        setSaldosPersistidos(null);
        Promise.all([
            obtenerTarjetasCredito(studioSlug),
            obtenerMetodosPagoManuales(studioSlug),
            obtenerSaldosPersistidos(studioSlug),
        ]).then(([cardsRes, metodosRes, saldosRes]) => {
            if (cardsRes.success && cardsRes.data) {
                const cards = cardsRes.data;
                setTarjetasForPay(cards);
                if (method === 'credit_card' && cards.length > 0) {
                    const fromExpense = expense?.defaultCreditCardId && cards.some((c) => c.id === expense.defaultCreditCardId)
                        ? expense.defaultCreditCardId
                        : null;
                    const fromDefault = cards.find((c) => c.is_default)?.id ?? null;
                    const defaultId = fromExpense ?? fromDefault ?? cards[0].id;
                    setPayRecurrenteCreditCardId(defaultId);
                }
            } else setTarjetasForPay([]);
            if (metodosRes.success && metodosRes.data) {
                const soloTransferencia = metodosRes.data.filter((m) => (m as { payment_method?: string }).payment_method === 'transferencia');
                const cuentas = soloTransferencia.map((m) => ({ id: m.id, payment_method_name: m.payment_method_name || m.banco || 'Cuenta' }));
                setCuentasBancarias(cuentas);
                if (cuentas.length === 1) {
                    setPayRecurrenteMetodoPagoId(cuentas[0].id);
                } else if (cuentas.length > 1 && expense) {
                    const preferida = expense.defaultMetodoPagoId && cuentas.some((c) => c.id === expense.defaultMetodoPagoId)
                        ? expense.defaultMetodoPagoId
                        : cuentas[0].id;
                    setPayRecurrenteMetodoPagoId(preferida);
                }
            } else setCuentasBancarias([]);
            if (saldosRes.success && saldosRes.data) setSaldosPersistidos(saldosRes.data);
            else setSaldosPersistidos(null);
        }).finally(() => setLoadingTarjetas(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- recurrentesPendientes es derivado (nueva ref cada render); solo correr al abrir modal
    }, [payingExpenseId, studioSlug]);

    // Sincronizar selección de tarjeta cuando la lista está lista y no hay selección válida (asegura que la default se muestre como seleccionada)
    useEffect(() => {
        if (payRecurrenteMethod !== 'credit_card' || tarjetasForPay.length === 0) return;
        const currentValid = payRecurrenteCreditCardId && tarjetasForPay.some((c) => c.id === payRecurrenteCreditCardId);
        if (currentValid) return;
        const defaultCard = tarjetasForPay.find((c) => c.is_default) ?? tarjetasForPay[0];
        if (defaultCard) setPayRecurrenteCreditCardId(defaultCard.id);
    }, [payRecurrenteMethod, tarjetasForPay, payRecurrenteCreditCardId]);

    const handleConfirmPagarRecurrente = async () => {
        if (!payingExpenseId || !payingExpense) return;
        const method = payRecurrenteMethod ?? 'transferencia';
        if (method === 'credit_card' && !payRecurrenteCreditCardId) {
            toast.error('Selecciona una tarjeta de crédito');
            return;
        }
        setIsPaying(true);
        try {
            const result = await pagarGastoRecurrente(studioSlug, payingExpenseId, method === 'credit_card'
                ? { creditCardId: payRecurrenteCreditCardId }
                : {
                    paymentMethod: method,
                    partialPayments: [{ payment_method: method, amount: payingExpense.amount }],
                    ...(method === 'transferencia' && payRecurrenteMetodoPagoId ? { metodo_pago_id: payRecurrenteMetodoPagoId } : {}),
                });
            if (result.success) {
                toast.success('Gasto recurrente pagado correctamente');
                setPayingExpenseId(null);
                setPayRecurrenteMethod(null);
                setPayRecurrenteCreditCardId('');
                setPayRecurrenteMetodoPagoId('');
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

    const canConfirmPayRecurrente = payingExpense && (
        (payRecurrenteMethod === 'credit_card' ? !!payRecurrenteCreditCardId : true) &&
        (payRecurrenteMethod === 'transferencia' ? !!payRecurrenteMetodoPagoId : true) &&
        (payRecurrenteMethod === 'efectivo' || payRecurrenteMethod === 'transferencia' || payRecurrenteMethod === 'credit_card')
    );

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
            <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 h-14 px-4 flex items-center">
                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                    <ZenCardTitle className="text-base mb-0 truncate flex-1 min-w-0 flex items-center gap-2">
                        <span className="truncate">Por pagar</span>
                    </ZenCardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                        {totalPorPagarMonto > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded text-sm text-red-400 shrink-0">
                                <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPorPagarMonto)}
                            </span>
                        )}
                        {(onOpenRecurrentes ?? onOpenNuevoRecurrente) && (
                            <ZenDropdownMenu>
                                <ZenDropdownMenuTrigger asChild>
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 bg-transparent border-0 shadow-none"
                                        aria-label="Opciones por pagar"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </ZenButton>
                                </ZenDropdownMenuTrigger>
                                <ZenDropdownMenuContent align="end">
                                    {onOpenNuevoRecurrente && (
                                        <ZenDropdownMenuItem onClick={onOpenNuevoRecurrente} className="gap-2">
                                            <Plus className="h-4 w-4 shrink-0" />
                                            + Registrar nuevo pago recurrente
                                        </ZenDropdownMenuItem>
                                    )}
                                    {onOpenRecurrentes && (
                                        <ZenDropdownMenuItem onClick={onOpenRecurrentes} className="gap-2">
                                            <Repeat className="h-4 w-4 shrink-0" />
                                            Gestionar pagos recurrentes
                                        </ZenDropdownMenuItem>
                                    )}
                                </ZenDropdownMenuContent>
                            </ZenDropdownMenu>
                        )}
                        {headerAction}
                    </div>
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-0 flex-1 overflow-auto">
                {porPagar.length === 0 && totalRecurrentesPendientes === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p>No hay cuentas por pagar</p>
                    </div>
                ) : (
                    <Accordion type="multiple" defaultValue={['recurrentes', 'ordinarios']} className="space-y-2">
                        {/* Sección Pagos recurrentes (mismo patrón que catálogo: sección → ítems) */}
                        <div className="overflow-hidden">
                            <AccordionItem value="recurrentes" className="border-0">
                                <AccordionHeader className="flex">
                                    <AccordionTrigger className="w-full flex items-center justify-between py-4 pl-2.5 pr-4 hover:bg-zinc-800/50 hover:no-underline transition-colors bg-zinc-800/30 group">
                                        <div className="flex items-center gap-3">
                                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=closed]:inline group-data-[state=open]:hidden" />
                                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=open]:inline group-data-[state=closed]:hidden" />
                                            <h4 className="font-semibold text-white">Pagos recurrentes</h4>
                                        </div>
                                        <span className="text-sm font-semibold text-red-400 shrink-0">
                                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPorPagarRecurrentes)}
                                        </span>
                                    </AccordionTrigger>
                                </AccordionHeader>
                                <AccordionContent className="pt-0">
                                    <div className="bg-zinc-900/50">
                                        <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-4">
                                            {totalRecurrentesPendientes > 0 ? (
                                                recurrentesPendientes.map((e, idx) => (
                                                    <div
                                                        key={e.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        className={cn(
                                                            'flex items-center justify-between gap-2 py-3 px-2 pl-3 hover:bg-zinc-700/20 transition-colors cursor-pointer',
                                                            'border-t border-b border-zinc-700/30',
                                                            idx === 0 && 'border-t-0'
                                                        )}
                                                        onClick={() => onOpenRecurrenteDetalle ? onOpenRecurrenteDetalle(e) : onOpenRecurrentes?.()}
                                                        onKeyDown={(ev) => {
                                                            if (ev.key === 'Enter' || ev.key === ' ') {
                                                                ev.preventDefault();
                                                                onOpenRecurrenteDetalle ? onOpenRecurrenteDetalle(e) : onOpenRecurrentes?.();
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex-1 min-w-0 flex flex-col items-start gap-1 text-left">
                                                            <div className="flex items-center gap-1.5 flex-wrap w-full min-w-0">
                                                                <p className="text-sm font-medium text-zinc-200 truncate">{e.name}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                                <ArrowDown className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden />
                                                                <span className="text-sm text-rose-400 font-semibold">
                                                                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(e.amount)}
                                                                </span>
                                                                <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-900/20 text-yellow-400 border border-yellow-800/30 shrink-0">
                                                                        Recurrente
                                                                    </span>
                                                                    {getRecurrenceAndMethodLine(e)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                                                            <ZenButton
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2 text-xs flex-shrink-0"
                                                                onClick={() => setPayingExpenseId(e.id)}
                                                            >
                                                                Pagar
                                                            </ZenButton>
                                                            <ZenDropdownMenu>
                                                                <ZenDropdownMenuTrigger asChild>
                                                                    <ZenButton
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-200"
                                                                        aria-label="Opciones"
                                                                    >
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </ZenButton>
                                                                </ZenDropdownMenuTrigger>
                                                                <ZenDropdownMenuContent align="end" onClick={(ev) => ev.stopPropagation()}>
                                                                    <ZenDropdownMenuItem onClick={() => setEditRecurrenteId(e.id)} className="gap-2">
                                                                        <Edit className="h-4 w-4" />
                                                                        Editar
                                                                    </ZenDropdownMenuItem>
                                                                    <ZenDropdownMenuItem onClick={() => setCancelRecurrenteId(e.id)} className="gap-2">
                                                                        <X className="h-4 w-4" />
                                                                        Cancelar pago
                                                                    </ZenDropdownMenuItem>
                                                                    <ZenDropdownMenuItem
                                                                        onClick={() => {
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
                                                ))
                                            ) : (
                                                <p className="text-sm text-zinc-500 py-3 pl-3">No hay pagos recurrentes pendientes</p>
                                            )}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </div>

                        {/* Sección Pagos ordinarios (mismo patrón: sección → ítems) */}
                        <div className="overflow-hidden">
                            <AccordionItem value="ordinarios" className="border-0">
                                <AccordionHeader className="flex">
                                    <AccordionTrigger className="w-full flex items-center justify-between py-4 pl-2.5 pr-4 hover:bg-zinc-800/50 hover:no-underline transition-colors bg-zinc-800/30 group">
                                        <div className="flex items-center gap-3">
                                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=closed]:inline group-data-[state=open]:hidden" />
                                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=open]:inline group-data-[state=closed]:hidden" />
                                            <h4 className="font-semibold text-white">Pagos ordinarios</h4>
                                        </div>
                                        <span className="text-sm font-semibold text-red-400 shrink-0">
                                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalPorPagarNominas)}
                                        </span>
                                    </AccordionTrigger>
                                </AccordionHeader>
                                <AccordionContent className="pt-0">
                                    <div className="bg-zinc-900/50">
                                        <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-4">
                                            {porPagar.length > 0 ? (
                                                porPagar.map((personal, idx) => (
                                                    <div
                                                        key={personal.personalId}
                                                        className={cn(
                                                            'border-t border-b border-zinc-700/30 py-3 pl-3 pr-2 hover:bg-zinc-700/20 transition-colors',
                                                            idx === 0 && 'border-t-0'
                                                        )}
                                                    >
                                                        <PorPagarPersonalCard
                                                            personal={personal}
                                                            studioSlug={studioSlug}
                                                            onPagoConfirmado={onPagoConfirmado}
                                                        />
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-zinc-500 py-3 pl-3">No hay pagos pendientes por realizar</p>
                                            )}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </div>
                    </Accordion>
                )}
            </ZenCardContent>
        </ZenCard>

        <ZenConfirmModal
            isOpen={!!payingExpense}
            onClose={() => {
                setPayingExpenseId(null);
                setPayRecurrenteMethod(null);
                setPayRecurrenteCreditCardId('');
                setPayRecurrenteMetodoPagoId('');
                setInitialPaymentMethod(null);
                setShowCrearTarjetaModal(false);
                setSaldosPersistidos(null);
                setCardPopoverOpen(false);
            }}
            onConfirm={handleConfirmPagarRecurrente}
            title="Confirmar pago"
            hideHeaderBanner
            description={
                payingExpense ? (
                    <div className="space-y-4">
                        {/* Header: concepto y monto como protagonistas */}
                        <div className="space-y-0.5">
                            <h3 className="text-2xl font-semibold text-white tracking-tight">{payingExpense.name}</h3>
                            <p className="text-2xl font-semibold text-emerald-400 tracking-tight">
                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(payingExpense.amount)}
                            </p>
                            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                                <Repeat className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                Pago recurrente
                            </p>
                            {payingExpense.description && (
                                <p className="text-sm text-zinc-400 pt-1">{payingExpense.description}</p>
                            )}
                        </div>

                        <div>
                            <p className="text-xs font-medium text-zinc-500 mb-2">¿Con qué pagas?</p>
                            {loadingTarjetas ? (
                                <div className="flex flex-col gap-4" aria-busy="true" aria-label="Verificando saldos">
                                    <div className="flex items-center gap-2 rounded-lg border border-zinc-700/80 px-3 py-2.5">
                                        <Skeleton className="h-4 w-4 shrink-0 rounded bg-zinc-700/80" />
                                        <Skeleton className="h-4 flex-1 max-w-[120px] rounded bg-zinc-700/80" />
                                        <Skeleton className="h-4 w-4 shrink-0 rounded bg-zinc-700/80" />
                                    </div>
                                    <div className="flex items-center gap-2 rounded-lg border border-zinc-700/80 px-3 py-2.5">
                                        <Skeleton className="h-4 w-4 shrink-0 rounded bg-zinc-700/80" />
                                        <Skeleton className="h-4 flex-1 max-w-[140px] rounded bg-zinc-700/80" />
                                        <Skeleton className="h-4 w-4 shrink-0 rounded bg-zinc-700/80" />
                                    </div>
                                    <div className="flex items-center gap-2 rounded-lg border border-zinc-700/80 px-3 py-2.5">
                                        <Skeleton className="h-4 w-4 shrink-0 rounded bg-zinc-700/80" />
                                        <Skeleton className="h-4 flex-1 max-w-[100px] rounded bg-zinc-700/80" />
                                        <Skeleton className="h-4 w-4 shrink-0 rounded bg-zinc-700/80" />
                                    </div>
                                </div>
                            ) : (
                            <Accordion
                                type="single"
                                collapsible
                                value={payRecurrenteMethod ?? ''}
                                onValueChange={(v) => setPayRecurrenteMethod((v || null) as 'efectivo' | 'transferencia' | 'credit_card' | null)}
                                className="flex flex-col gap-4"
                            >
                                <AccordionItem value="efectivo" className={cn('mb-0 rounded-lg border px-0 transition-colors', payRecurrenteMethod === 'efectivo' ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-zinc-700/80 bg-zinc-800/30')}>
                                    <AccordionTrigger className="group cursor-pointer w-full px-3 py-2.5 hover:no-underline [&[data-state=open]]:rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <span className="flex items-center gap-2 w-full text-left">
                                            <Wallet className={cn('h-4 w-4 shrink-0', payRecurrenteMethod === 'efectivo' ? 'text-emerald-400' : 'text-zinc-400')} />
                                            <span className={cn('flex-1 text-sm font-medium', payRecurrenteMethod === 'efectivo' ? 'text-emerald-400' : 'text-zinc-300')}>Efectivo</span>
                                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-3 pb-3 pt-0">
                                        <div className="space-y-1">
                                            <p className="text-xs text-zinc-500">
                                                Los recursos serán tomados de la disponibilidad de los pagos que hayas registrado como efectivo.
                                            </p>
                                            {saldosPersistidos != null && payingExpense.amount > saldosPersistidos.cashBalance && (
                                                <p className="text-xs text-red-400 flex items-start gap-1.5 mt-2">
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                    No cuentas con el recurso suficiente registrado en efectivo. Asegura que tengas el monto suficiente para evitar descuadres.
                                                </p>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="transferencia" className={cn('mb-0 rounded-lg border px-0 transition-colors', payRecurrenteMethod === 'transferencia' ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-zinc-700/80 bg-zinc-800/30')}>
                                    <AccordionTrigger className="group cursor-pointer w-full px-3 py-2.5 hover:no-underline [&[data-state=open]]:rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <span className="flex items-center gap-2 w-full text-left">
                                            <Landmark className={cn('h-4 w-4 shrink-0', payRecurrenteMethod === 'transferencia' ? 'text-emerald-400' : 'text-zinc-400')} />
                                            <span className={cn('flex-1 text-sm font-medium', payRecurrenteMethod === 'transferencia' ? 'text-emerald-400' : 'text-zinc-300')}>Transferencia</span>
                                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-3 pb-3 pt-0">
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-zinc-400">Fondos disponibles del banco del negocio</p>
                                            {cuentasBancarias.length === 0 ? (
                                                <p className="text-xs text-amber-400 flex items-start gap-1.5 mt-1">
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                    No hay cuentas bancarias activas. Configúralas en Métodos de pago.
                                                </p>
                                            ) : (
                                                <>
                                                    {cuentasBancarias.length > 1 && (
                                                        <select
                                                            value={payRecurrenteMetodoPagoId}
                                                            onChange={(e) => setPayRecurrenteMetodoPagoId(e.target.value)}
                                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 text-sm mt-1"
                                                        >
                                                            <option value="">Seleccionar cuenta</option>
                                                            {cuentasBancarias.map((c) => (
                                                                <option key={c.id} value={c.id}>{c.payment_method_name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {saldosPersistidos != null && payingExpense.amount > saldosPersistidos.bankBalance && (
                                                        <p className="text-xs text-red-400 flex items-start gap-1.5 mt-2">
                                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                            El monto supera el saldo disponible en cuentas bancarias. Revisa tus saldos para evitar descuadres.
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="credit_card" className={cn('mb-0 rounded-lg border px-0 transition-colors', payRecurrenteMethod === 'credit_card' ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-zinc-700/80 bg-zinc-800/30')}>
                                    <AccordionTrigger className="group cursor-pointer w-full px-3 py-2.5 hover:no-underline [&[data-state=open]]:rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <span className="flex items-center gap-2 w-full text-left">
                                            <CreditCard className={cn('h-4 w-4 shrink-0', payRecurrenteMethod === 'credit_card' ? 'text-emerald-400' : 'text-zinc-400')} />
                                            <span className={cn('flex-1 text-sm font-medium', payRecurrenteMethod === 'credit_card' ? 'text-emerald-400' : 'text-zinc-300')}>T. Crédito</span>
                                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-3 pb-3 pt-0">
                                        <div className="space-y-2">
                                            <p className="text-xs text-zinc-500">
                                                Este pago generará una deuda que será pagable hacia el banco en tu fecha de pago.
                                            </p>
                                            <div className="flex items-center justify-between gap-2 mt-1">
                                                <span className="text-xs font-medium text-zinc-500">Tarjeta de crédito</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-tarjetas-credito-modal')); }}
                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                                                    title="Gestionar tarjetas de crédito"
                                                >
                                                    <Settings className="h-3 w-3 shrink-0" />
                                                    Configurar tarjetas
                                                </button>
                                            </div>
                                            {loadingTarjetas ? (
                                                <div className="flex items-center gap-2 py-3 text-zinc-500">
                                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                                    <span className="text-sm">Cargando tarjetas...</span>
                                                </div>
                                            ) : (
                                                <Popover open={cardPopoverOpen} onOpenChange={setCardPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 text-left hover:bg-zinc-800/80 mt-1"
                                                        >
                                                            <span className="min-w-0 truncate">
                                                                {tarjetasForPay.length === 0
                                                                    ? 'Seleccionar tarjeta de crédito'
                                                                    : payRecurrenteCreditCardId
                                                                        ? tarjetasForPay.find((c) => c.id === payRecurrenteCreditCardId)?.name ?? 'Seleccionar tarjeta de crédito'
                                                                        : 'Seleccionar tarjeta de crédito'}
                                                            </span>
                                                            <span className="flex items-center gap-1 shrink-0">
                                                                {payRecurrenteCreditCardId && (() => {
                                                                    const c = tarjetasForPay.find((x) => x.id === payRecurrenteCreditCardId);
                                                                    return c && c.balance < 0 ? <span className="text-xs text-zinc-500">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(c.balance)}</span> : null;
                                                                })()}
                                                                <ChevronDown className="h-4 w-4 text-zinc-500" />
                                                            </span>
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-1 bg-zinc-900 border-zinc-700" align="start">
                                                        {tarjetasForPay.length === 0 ? (
                                                            <div className="p-2 space-y-2">
                                                                <p className="text-xs text-zinc-500">No tienes tarjetas registradas</p>
                                                                <ZenButton
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="w-full justify-start gap-1.5 text-zinc-400 hover:text-zinc-200"
                                                                    onClick={() => { setCardPopoverOpen(false); setShowCrearTarjetaModal(true); }}
                                                                >
                                                                    <Plus className="h-3.5 w-3.5" />
                                                                    Añadir tarjeta de crédito
                                                                </ZenButton>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <ul className="max-h-48 overflow-y-auto">
                                                                    {tarjetasForPay.map((c) => (
                                                                        <li key={c.id}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => { setPayRecurrenteCreditCardId(c.id); setCardPopoverOpen(false); }}
                                                                                className={cn(
                                                                                    'w-full flex items-center justify-between gap-2 px-2 py-2 rounded text-sm text-left hover:bg-zinc-800',
                                                                                    payRecurrenteCreditCardId === c.id && 'bg-emerald-500/10 text-emerald-400'
                                                                                )}
                                                                            >
                                                                                <span className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                                    {c.is_default && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Predeterminada" />}
                                                                                    <span className="truncate">{c.name}</span>
                                                                                </span>
                                                                                {c.balance < 0 && <span className="text-xs text-zinc-500 shrink-0">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(c.balance)}</span>}
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
                                                                        onClick={() => { setCardPopoverOpen(false); setShowCrearTarjetaModal(true); }}
                                                                    >
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                        Añadir tarjeta de crédito
                                                                    </ZenButton>
                                                                </div>
                                                            </>
                                                        )}
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            )}
                        </div>

                        {/* Solo mostrar alerta si el método elegido es distinto al definido; si no, no renderizar nada para evitar espacio vacío */}
                        {initialPaymentMethod != null && payRecurrenteMethod != null && payRecurrenteMethod !== initialPaymentMethod ? (
                            <p className="text-xs text-amber-400 flex items-start gap-1.5 pt-4 mt-4">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                                Estás eligiendo un método de pago diferente al definido. Se utilizará para este pago actual, pero no se modificará la configuración original del gasto.
                            </p>
                        ) : null}
                    </div>
                ) : ''
            }
            confirmText="Confirmar pago"
            cancelText="Cancelar"
            variant="default"
            loading={isPaying}
            loadingText="Confirmando..."
            disabled={!canConfirmPayRecurrente}
        />

        <CrearTarjetaCreditoModal
            isOpen={showCrearTarjetaModal}
            onClose={() => setShowCrearTarjetaModal(false)}
            studioSlug={studioSlug}
            zIndex={100070}
            onSuccess={async (newCardId) => {
                setShowCrearTarjetaModal(false);
                const res = await obtenerTarjetasCredito(studioSlug);
                if (res.success && res.data) {
                    setTarjetasForPay(res.data);
                    setPayRecurrenteCreditCardId(newCardId);
                }
            }}
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
