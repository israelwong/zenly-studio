'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import { Plus } from 'lucide-react';
import { GastoRecurrenteItemCard } from './GastoRecurrenteItemCard';
import { NominaFijaItemCard } from './NominaFijaItemCard';
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
    lastDayOfMonth?: boolean;
    paymentMethodLabel?: string | null;
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

    const gastosNegocio = expenses.filter((e) => !e.isCrewMember);
    const nominaFija = expenses.filter((e) => e.isCrewMember);
    const totalGastos = gastosNegocio.length + nominaFija.length;

    return (
        <>
            <ZenDialog
                isOpen={open}
                onClose={onClose}
                title="Gastos recurrentes"
                description="Costos fijos del negocio y nómina fija (salarios definidos en Personal)."
                maxWidth="xl"
                showCloseButton
                closeOnClickOutside
                zIndex={10050}
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        {loading ? (
                            <div className="h-5 w-28 rounded bg-zinc-700/60 animate-pulse" aria-hidden />
                        ) : (
                            <p className="text-sm text-zinc-400">{totalGastos} ítem(s) en total</p>
                        )}
                        <ZenButton variant="primary" size="sm" onClick={() => setShowNuevoModal(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Gasto
                        </ZenButton>
                    </div>

                    {loading ? (
                        <div className="space-y-4 max-h-[480px] overflow-y-auto overflow-x-hidden" aria-hidden>
                            {/* Esqueleto: Gastos del Negocio */}
                            <section className="space-y-2">
                                <div className="h-3 bg-zinc-700/60 rounded w-36 animate-pulse" />
                                <ul className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <li key={i} className="p-4 border border-zinc-700/50 rounded-lg bg-zinc-800/50 animate-pulse">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="h-4 bg-zinc-700/70 rounded w-1/3" />
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <div className="h-5 bg-zinc-700/70 rounded w-24" />
                                                        <div className="h-3.5 bg-zinc-700/60 rounded w-28" />
                                                        <div className="h-3.5 bg-zinc-700/60 rounded w-20" />
                                                    </div>
                                                </div>
                                                <div className="h-8 w-8 bg-zinc-700/60 rounded shrink-0" />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                            {/* Esqueleto: Nómina Fija */}
                            <section className="space-y-2">
                                <div className="h-3 bg-zinc-700/60 rounded w-28 animate-pulse" />
                                <div className="p-4 border border-zinc-700/50 rounded-lg bg-zinc-800/50 animate-pulse">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-zinc-700/70 rounded w-1/4" />
                                            <div className="flex gap-3">
                                                <div className="h-5 bg-zinc-700/70 rounded w-20" />
                                                <div className="h-3.5 bg-zinc-700/60 rounded w-24" />
                                            </div>
                                        </div>
                                        <div className="h-8 w-8 bg-zinc-700/60 rounded shrink-0" />
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : totalGastos === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-zinc-400 mb-4">No hay gastos recurrentes ni nómina fija</p>
                            <ZenButton variant="outline" onClick={() => setShowNuevoModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Crear primer gasto recurrente
                            </ZenButton>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[480px] overflow-y-auto overflow-x-hidden">
                            {/* Gastos del Negocio (manuales): crear/editar/eliminar aquí */}
                            <section>
                                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                                    Gastos del Negocio
                                </h3>
                                {gastosNegocio.length === 0 ? (
                                    <p className="text-sm text-zinc-500 py-2">Renta, suscripciones, etc. Agrega uno con &quot;Nuevo Gasto&quot;.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {gastosNegocio.map((expense) => (
                                            <li key={expense.id}>
                                                <GastoRecurrenteItemCard
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
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {/* Nómina Fija (solo lectura): salarios definidos en Personal */}
                            <section>
                                {nominaFija.length > 0 && (
                                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                                        Nómina Fija
                                    </h3>
                                )}
                                {nominaFija.length === 0 ? (
                                    <p className="text-sm text-zinc-500 py-2">Se mostrarán las nóminas fijas del personal cuando existan.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {nominaFija.map((item) => (
                                            <li key={item.id}>
                                                <NominaFijaItemCard
                                                    item={{
                                                        id: item.id,
                                                        name: item.name,
                                                        amount: item.amount,
                                                        frequency: item.frequency,
                                                        description: item.description,
                                                        crewMemberId: item.crewMemberId,
                                                    }}
                                                    studioSlug={studioSlug}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
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
