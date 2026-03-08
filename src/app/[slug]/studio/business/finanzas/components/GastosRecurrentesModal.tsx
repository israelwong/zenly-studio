'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { Plus } from 'lucide-react';
import { GastoRecurrenteItemCard } from './GastoRecurrenteItemCard';
import { RegistrarGastoRecurrenteModal } from './RegistrarGastoRecurrenteModal';
import { obtenerGastosRecurrentes } from '@/lib/actions/studio/business/finanzas/finanzas.actions';

export interface RecurringExpenseForModal {
    id: string;
    name: string;
    amount: number;
    category: string;
    chargeDay: number;
    isActive: boolean;
    frequency?: string;
    description?: string | null;
    pagosMesActual?: number;
    totalPagosEsperados?: number;
    isCrewMember?: boolean;
    crewMemberId?: string;
}

interface GastosRecurrentesModalProps {
    open: boolean;
    onClose: () => void;
    studioSlug: string;
    /** Callback opcional cuando se registra/edita/elimina un gasto (para refetch en página de finanzas) */
    onGastoRegistrado?: () => void | Promise<void>;
}

export function GastosRecurrentesModal({
    open,
    onClose,
    studioSlug,
    onGastoRegistrado,
}: GastosRecurrentesModalProps) {
    const [expenses, setExpenses] = useState<RecurringExpenseForModal[]>([]);
    const [loading, setLoading] = useState(false);
    const [showNuevoModal, setShowNuevoModal] = useState(false);

    const loadExpenses = useCallback(async () => {
        if (!studioSlug || !open) return;
        setLoading(true);
        try {
            const result = await obtenerGastosRecurrentes(studioSlug, new Date());
            if (result.success && result.data) {
                setExpenses(result.data);
            }
        } catch (e) {
            console.error('Error cargando gastos recurrentes:', e);
        } finally {
            setLoading(false);
        }
    }, [studioSlug, open]);

    useEffect(() => {
        if (open) loadExpenses();
    }, [open, loadExpenses]);

    const handleSuccess = async () => {
        setShowNuevoModal(false);
        await loadExpenses();
        await onGastoRegistrado?.();
    };

    return (
        <>
            <ZenDialog
                isOpen={open}
                onClose={onClose}
                title="Gastos recurrentes"
                description="Renta, suscripciones y gastos fijos. Configura qué pagar cada mes."
                maxWidth="xl"
                showCloseButton
                closeOnClickOutside
                zIndex={10050}
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-400">
                            {loading ? '…' : `${expenses.length} gasto(s) recurrente(s)`}
                        </p>
                        <ZenButton variant="primary" size="sm" onClick={() => setShowNuevoModal(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Gasto
                        </ZenButton>
                    </div>

                    {loading ? (
                        <div className="space-y-2 max-h-[480px] overflow-y-auto">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="p-4 border border-zinc-700/50 rounded-lg bg-zinc-800/80 animate-pulse"
                                    aria-hidden
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="h-4 bg-zinc-700 rounded w-2/5" />
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <div className="h-5 bg-zinc-700 rounded w-20" />
                                                <div className="h-3.5 bg-zinc-700 rounded w-28" />
                                            </div>
                                        </div>
                                        <div className="h-7 w-7 bg-zinc-700 rounded shrink-0" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-zinc-400 mb-4">No hay gastos recurrentes</p>
                            <ZenButton variant="outline" onClick={() => setShowNuevoModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Crear primer gasto recurrente
                            </ZenButton>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[480px] overflow-y-auto overflow-x-hidden">
                            {expenses.map((expense) => (
                                <GastoRecurrenteItemCard
                                    key={expense.id}
                                    expense={expense}
                                    studioSlug={studioSlug}
                                    onEditado={() => {
                                        loadExpenses();
                                        onGastoRegistrado?.();
                                    }}
                                    onEliminado={() => {
                                        loadExpenses();
                                        onGastoRegistrado?.();
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </ZenDialog>

            <RegistrarGastoRecurrenteModal
                isOpen={showNuevoModal}
                onClose={() => setShowNuevoModal(false)}
                studioSlug={studioSlug}
                onSuccess={handleSuccess}
            />
        </>
    );
}
