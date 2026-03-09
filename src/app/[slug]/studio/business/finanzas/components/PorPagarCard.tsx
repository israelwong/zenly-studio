'use client';

import React, { useState } from 'react';
import {
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle,
    ZenButton,
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
} from '@/components/ui/zen';
import { PorPagarPersonalCard } from './PorPagarPersonalCard';
import { PorPagarPersonal, DevolucionPendienteGrupo } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { Repeat, ArrowDown, Plus, MoreVertical, ChevronDown, ChevronRight } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/shadcn/tooltip';
import { Accordion, AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from '@/components/ui/shadcn/accordion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UniversalFinanceModal } from '@/components/shared/finanzas/UniversalFinanceModal';

export interface RecurringExpenseForPorPagar {
    id: string;
    name: string;
    amount: number;
    category?: string;
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
    /** Al hacer clic en un ítem recurrente: abre el sheet de detalle unificado (MovimientoDetailsSheet). */
    onOpenRecurrenteDetalle?: (expense: RecurringExpenseForPorPagar) => void;
    /** Devoluciones pendientes agrupadas por promise_id. */
    devolucionesPendientes?: DevolucionPendienteGrupo[];
    /** Tras confirmar una devolución (dinero regresado). */
    onDevolucionConfirmada?: () => void;
    /** Al hacer clic en la fila de devolución, abrir el sheet de detalle (MovimientoDetailsSheet). El botón "Devolver" abre el modal de confirmación. */
    onOpenDevolucionDetails?: (grupo: DevolucionPendienteGrupo) => void;
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
    devolucionesPendientes = [],
    onDevolucionConfirmada,
    onOpenDevolucionDetails,
}: PorPagarCardProps) {
    const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
    const [refundModalGrupo, setRefundModalGrupo] = useState<DevolucionPendienteGrupo | null>(null);

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
    const totalDevolucionesPendientes = devolucionesPendientes.reduce((sum, g) => sum + g.totalAmount, 0);
    const totalPorPagarMonto = totalPorPagarNominas + totalPorPagarRecurrentes + totalDevolucionesPendientes;
    const payingExpense = payingExpenseId
        ? recurrentesPendientes.find((e) => e.id === payingExpenseId)
        : null;

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
                                            Registrar nuevo pago recurrente
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
                {porPagar.length === 0 && totalRecurrentesPendientes === 0 && devolucionesPendientes.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p>No hay cuentas por pagar</p>
                    </div>
                ) : (
                    <Accordion type="multiple" defaultValue={['recurrentes', 'ordinarios', 'devoluciones']} className="space-y-0">
                        {/* Sección Pagos recurrentes (mismo patrón que catálogo: sección → ítems) */}
                        <div className="overflow-hidden">
                            <AccordionItem value="recurrentes" className="border-0 mb-0">
                                <AccordionHeader className="flex">
                                    <AccordionTrigger className="w-full flex items-center justify-between py-4 pl-2.5 pr-4 hover:bg-zinc-800/50 hover:no-underline transition-colors bg-zinc-800/30 group">
                                        <div className="flex items-center gap-3">
                                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=closed]:inline group-data-[state=open]:hidden" />
                                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=open]:inline group-data-[state=closed]:hidden" />
                                            <h4 className="font-semibold text-white">Pagos recurrentes</h4>
                                        </div>
                                        <span className="text-xs font-semibold text-red-400 shrink-0">
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

                        {/* Sección Devoluciones pendientes (pasivo hasta confirmar) */}
                        <div className="overflow-hidden">
                            <AccordionItem value="devoluciones" className="border-0 mb-0">
                                <AccordionHeader className="flex">
                                    <AccordionTrigger className="w-full flex items-center justify-between py-4 pl-2.5 pr-4 hover:bg-zinc-800/50 hover:no-underline transition-colors bg-zinc-800/30 group">
                                        <div className="flex items-center gap-3">
                                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=closed]:inline group-data-[state=open]:hidden" />
                                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=open]:inline group-data-[state=closed]:hidden" />
                                            <h4 className="font-semibold text-white">Devoluciones pendientes</h4>
                                        </div>
                                        <span className="text-xs font-semibold text-red-400 shrink-0">
                                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalDevolucionesPendientes)}
                                        </span>
                                    </AccordionTrigger>
                                </AccordionHeader>
                                <AccordionContent className="pt-0">
                                    <div className="bg-zinc-900/50">
                                        <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-4">
                                            {devolucionesPendientes.length > 0 ? (
                                                devolucionesPendientes.map((grupo, idx) => (
                                                    <div
                                                        key={grupo.promiseId ?? idx}
                                                        role="button"
                                                        tabIndex={0}
                                                        className={cn(
                                                            'flex items-center justify-between gap-2 py-3 px-2 pl-3 hover:bg-zinc-700/20 transition-colors cursor-pointer',
                                                            'border-t border-b border-zinc-700/30',
                                                            idx === 0 && 'border-t-0'
                                                        )}
                                                        onClick={() => onOpenDevolucionDetails?.(grupo)}
                                                        onKeyDown={(ev) => {
                                                            if (ev.key === 'Enter' || ev.key === ' ') {
                                                                ev.preventDefault();
                                                                onOpenDevolucionDetails?.(grupo);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-left">
                                                            <p className="text-sm font-medium text-zinc-200 truncate w-full">
                                                                {grupo.contactName || 'Sin contacto'}
                                                                {grupo.eventName ? ` · ${grupo.eventName}` : ''}
                                                            </p>
                                                            <span className="text-sm text-rose-400 font-semibold">
                                                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(grupo.totalAmount)} a regresar
                                                            </span>
                                                        </div>
                                                        <div className="shrink-0" onClick={(ev) => ev.stopPropagation()}>
                                                            <ZenButton
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2 text-xs flex-shrink-0"
                                                                onClick={() => setRefundModalGrupo(grupo)}
                                                            >
                                                                Devolver
                                                            </ZenButton>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-zinc-500 py-3 pl-3">No hay devoluciones pendientes</p>
                                            )}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </div>

                        {/* Sección Pagos ordinarios (mismo patrón: sección → ítems) */}
                        <div className="overflow-hidden">
                            <AccordionItem value="ordinarios" className="border-0 mb-0">
                                <AccordionHeader className="flex">
                                    <AccordionTrigger className="w-full flex items-center justify-between py-4 pl-2.5 pr-4 hover:bg-zinc-800/50 hover:no-underline transition-colors bg-zinc-800/30 group">
                                        <div className="flex items-center gap-3">
                                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=closed]:inline group-data-[state=open]:hidden" />
                                            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 group-data-[state=open]:inline group-data-[state=closed]:hidden" />
                                            <h4 className="font-semibold text-white">Pagos ordinarios</h4>
                                        </div>
                                        <span className="text-xs font-semibold text-red-400 shrink-0">
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

        {refundModalGrupo && (
            <UniversalFinanceModal
                isOpen
                onClose={() => setRefundModalGrupo(null)}
                studioSlug={studioSlug}
                mode="refund"
                data={{
                    amount: refundModalGrupo.totalAmount,
                    title: 'Devolución',
                    paymentIds: refundModalGrupo.payments.map((p) => p.id),
                    contactName: refundModalGrupo.contactName,
                    eventName: refundModalGrupo.eventName,
                }}
                onSuccess={async () => {
                    setRefundModalGrupo(null);
                    await onDevolucionConfirmada?.();
                }}
            />
        )}

        {payingExpense && payingExpenseId && (
            <UniversalFinanceModal
                isOpen
                onClose={() => setPayingExpenseId(null)}
                studioSlug={studioSlug}
                mode="expense"
                data={{
                    amount: payingExpense.amount,
                    title: payingExpense.name,
                    subtitle: `Gasto recurrente · ${getFrequencyLabel(payingExpense.frequency)}`,
                    expenseId: payingExpenseId,
                }}
                preselectedMethod={(() => {
                    const m = payingExpense.paymentMethod?.toLowerCase?.() ?? payingExpense.paymentMethod;
                    return m === 'efectivo' || m === 'transferencia' || m === 'credit_card' ? m : undefined;
                })()}
                preselectedMethodId={
                    (() => {
                        const m = payingExpense.paymentMethod?.toLowerCase?.() ?? payingExpense.paymentMethod;
                        if (m === 'transferencia') return payingExpense.defaultMetodoPagoId ?? undefined;
                        if (m === 'credit_card') return payingExpense.defaultCreditCardId ?? undefined;
                        return undefined;
                    })()
                }
                onSuccess={async () => {
                    setPayingExpenseId(null);
                    await onPagoConfirmado?.();
                }}
            />
        )}

    </>
    );
}
