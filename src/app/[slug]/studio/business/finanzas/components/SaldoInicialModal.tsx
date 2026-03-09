'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog, ZenButton, ZenInput } from '@/components/ui/zen';
import { obtenerMetodosPago } from '@/lib/actions/studio/config/metodos-pago.actions';
import {
    actualizarSaldoInicialCaja,
    actualizarSaldoInicialCuentaBancaria,
    obtenerSaldosHistoricos,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';
import { Wallet, Landmark, RotateCcw } from 'lucide-react';

const PAYMENT_METHOD_TRANSFER = ['transferencia', 'spei_directo'];

interface SaldoInicialModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onSuccess?: () => void | Promise<void>;
}

interface CuentaItem {
    id: string;
    name: string;
    current_balance: number;
}

export function SaldoInicialModal({
    isOpen,
    onClose,
    studioSlug,
    onSuccess,
}: SaldoInicialModalProps) {
    const [cajaBalance, setCajaBalance] = useState('');
    const [cuentas, setCuentas] = useState<CuentaItem[]>([]);
    const [balances, setBalances] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (isOpen && studioSlug) {
            setLoading(true);
            obtenerMetodosPago(studioSlug)
                .then((r) => {
                    if (r.success && r.data) {
                        const list = r.data
                            .filter(
                                (m) =>
                                    m.status === 'active' &&
                                    PAYMENT_METHOD_TRANSFER.includes(
                                        m.payment_method ?? ''
                                    )
                            )
                            .map((m) => ({
                                id: m.id,
                                name: m.payment_method_name || m.banco || 'Cuenta',
                                current_balance: Number(m.current_balance ?? 0),
                            }));
                        setCuentas(list);
                        const next: Record<string, string> = {};
                        list.forEach((c) => {
                            next[c.id] =
                                c.current_balance > 0
                                    ? String(c.current_balance)
                                    : '';
                        });
                        setBalances(next);
                    } else {
                        setCuentas([]);
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, studioSlug]);

    useEffect(() => {
        if (!isOpen) {
            setCajaBalance('');
            setBalances({});
        }
    }, [isOpen]);

    const handleSyncHistoric = async () => {
        setSyncing(true);
        try {
            const r = await obtenerSaldosHistoricos(studioSlug);
            if (!r.success || !r.data) {
                toast.error(r.error || 'Error al sincronizar historial');
                return;
            }
            setCajaBalance(
                r.data.cashBalance > 0 ? String(r.data.cashBalance) : ''
            );
            setBalances((prev) => {
                const next = { ...prev };
                cuentas.forEach((c) => {
                    const val = r.data!.banks[c.id];
                    next[c.id] =
                        val != null && val > 0 ? String(val) : val === 0 ? '' : prev[c.id] ?? '';
                });
                return next;
            });
            toast.success('Saldos pre-poblados con el historial de movimientos');
        } catch (e) {
            console.error(e);
            toast.error('Error al sincronizar');
        } finally {
            setSyncing(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const cajaNum = cajaBalance.trim() ? parseFloat(cajaBalance) : null;
            if (
                cajaNum != null &&
                !Number.isNaN(cajaNum) &&
                cajaNum >= 0
            ) {
                const r = await actualizarSaldoInicialCaja(studioSlug, cajaNum);
                if (!r.success) {
                    toast.error(r.error || 'Error al actualizar caja');
                    setSubmitting(false);
                    return;
                }
            }
            for (const c of cuentas) {
                const val = balances[c.id]?.trim();
                if (val) {
                    const num = parseFloat(val);
                    if (!Number.isNaN(num) && num >= 0) {
                        const r = await actualizarSaldoInicialCuentaBancaria(
                            studioSlug,
                            c.id,
                            num
                        );
                        if (!r.success)
                            toast.error(r.error || `Error en ${c.name}`);
                    }
                }
            }
            toast.success('Saldos iniciales actualizados');
            onClose();
            await onSuccess?.();
        } catch (e) {
            console.error(e);
            toast.error('Error al guardar');
        } finally {
            setSubmitting(false);
        }
    };

    const updateBalance = (id: string, value: string) => {
        setBalances((prev) => ({ ...prev, [id]: value }));
    };

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Saldo inicial"
            maxWidth="md"
            onSave={handleSubmit}
            saveLabel="Guardar"
            saveDisabled={submitting}
            isLoading={submitting}
            onCancel={onClose}
            cancelLabel="Cancelar"
        >
            <div className="space-y-6">
                {/* Descripción + Sync dentro del content */}
                <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-zinc-400 flex-1 min-w-0">
                        Configura el dinero que ya tienes en caja y en cada
                        cuenta bancaria para que el sistema no parta de cero.
                    </p>
                    <ZenButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSyncHistoric}
                        disabled={syncing}
                        loading={syncing}
                        className="text-zinc-400 hover:text-zinc-300 shrink-0"
                        title="Sincronizar con historial"
                        aria-label="Sincronizar con historial"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </ZenButton>
                </div>

                {/* 1 fila, 2 columnas: Caja | Bancos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                            <Wallet className="h-4 w-4 text-amber-400" />
                            Dinero en efectivo
                        </label>
                        <ZenInput
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0"
                            value={cajaBalance}
                            onChange={(e) => setCajaBalance(e.target.value)}
                        />
                    </section>

                    <section className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                            <Landmark className="h-4 w-4 text-blue-400" />
                            Dinero en banco
                        </label>
                        {loading ? (
                            <p className="text-sm text-zinc-500">
                                Cargando cuentas...
                            </p>
                        ) : cuentas.length > 0 ? (
                            <div className="space-y-3">
                            {cuentas.map((c) => (
                                <div key={c.id}>
                                    <ZenInput
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            placeholder="0"
                                            value={balances[c.id] ?? ''}
                                            onChange={(e) =>
                                                updateBalance(c.id, e.target.value)
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500">
                                No hay cuentas bancarias (transferencia) configuradas.
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </ZenDialog>
    );
}
