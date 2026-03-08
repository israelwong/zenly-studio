'use client';

import React, { useState } from 'react';
import {
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle,
    ZenButton,
    ZenConfirmModal,
} from '@/components/ui/zen';
import { PorPagarPersonalCard } from './PorPagarPersonalCard';
import { PorPagarPersonal } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { pagarGastoRecurrente } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { Repeat, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

export interface RecurringExpenseForPorPagar {
    id: string;
    name: string;
    amount: number;
    frequency?: string;
    chargeDay?: number;
    pagosMesActual?: number;
    totalPagosEsperados?: number;
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

export function PorPagarCard({
    porPagar,
    studioSlug,
    onMarcarPagado,
    onPagoConfirmado,
    headerAction,
    recurringExpenses = [],
    onOpenRecurrentes,
    onOpenRecurrenteDetalle,
}: PorPagarCardProps) {
    const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
    const [isPaying, setIsPaying] = useState(false);

    const totalItems = porPagar.reduce((sum, p) => sum + p.items.length, 0);
    const recurrentesPendientes = recurringExpenses.filter(
        (e) => (e.pagosMesActual ?? 0) < (e.totalPagosEsperados ?? 1)
    );
    const totalRecurrentesPendientes = recurrentesPendientes.length;
    const payingExpense = payingExpenseId
        ? recurrentesPendientes.find((e) => e.id === payingExpenseId)
        : null;

    const handleConfirmPagarRecurrente = async () => {
        if (!payingExpenseId) return;
        setIsPaying(true);
        try {
            const result = await pagarGastoRecurrente(studioSlug, payingExpenseId);
            if (result.success) {
                toast.success('Gasto recurrente pagado correctamente');
                setPayingExpenseId(null);
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

    return (
        <>
        <ZenCard variant="default" padding="none" className="h-full flex flex-col">
            <ZenCardHeader className="border-b border-zinc-800 flex-shrink-0 h-14 px-4 flex items-center">
                <div className="flex items-center gap-3 w-full min-w-0">
                    <ZenCardTitle className="text-base mb-0 truncate flex-1 min-w-0 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-2 rounded-full text-xs font-medium bg-rose-500/20 text-rose-400 shrink-0">
                            {totalItems + totalRecurrentesPendientes}
                        </span>
                        <span className="truncate">Cuentas por Pagar</span>
                    </ZenCardTitle>
                    {headerAction && <div className="shrink-0">{headerAction}</div>}
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-4 flex-1 overflow-auto">
                {porPagar.length === 0 && totalRecurrentesPendientes === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p>No hay cuentas por pagar</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {porPagar.map((personal) => (
                            <PorPagarPersonalCard
                                key={personal.personalId}
                                personal={personal}
                                studioSlug={studioSlug}
                                onPagoConfirmado={onPagoConfirmado}
                            />
                        ))}
                        {totalRecurrentesPendientes > 0 && (
                            <div className="pt-2 border-t border-zinc-800">
                                <ul className="space-y-1.5">
                                    {recurrentesPendientes.map((e) => (
                                        <li key={e.id}>
                                            <div className="flex items-center gap-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenRecurrenteDetalle ? onOpenRecurrenteDetalle(e) : onOpenRecurrentes?.()}
                                                    className="flex-1 min-w-0 flex flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
                                                >
                                                    <p className="text-sm font-medium text-zinc-200 truncate w-full">
                                                        {e.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <ArrowDown className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden />
                                                        <span className="text-sm text-rose-400 font-semibold">
                                                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(e.amount)}
                                                        </span>
                                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <Repeat className="h-3 w-3 shrink-0 text-amber-400" />
                                                            {getFrequencyLabel(e.frequency)}
                                                            {e.chargeDay != null ? ` - Día ${e.chargeDay}` : ''}
                                                        </span>
                                                    </div>
                                                </button>
                                                <ZenButton
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs flex-shrink-0 m-1"
                                                    onClick={(ev) => {
                                                        ev.stopPropagation();
                                                        setPayingExpenseId(e.id);
                                                    }}
                                                >
                                                    Pagar
                                                </ZenButton>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </ZenCardContent>
        </ZenCard>

        <ZenConfirmModal
            isOpen={!!payingExpense}
            onClose={() => setPayingExpenseId(null)}
            onConfirm={handleConfirmPagarRecurrente}
            title="¿Confirmar el pago del gasto recurrente?"
            description={
                payingExpense
                    ? `¿Deseas confirmar el pago de ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(payingExpense.amount)} para "${payingExpense.name}"? Este pago se registrará como egreso en los movimientos del mes.`
                    : ''
            }
            confirmText="Sí, confirmar pago"
            cancelText="Cancelar"
            variant="default"
            loading={isPaying}
            loadingText="Confirmando..."
        />
    </>
    );
}
