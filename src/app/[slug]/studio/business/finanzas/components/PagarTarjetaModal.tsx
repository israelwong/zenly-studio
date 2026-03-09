'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog, ZenButton, ZenInput } from '@/components/ui/zen';
import { obtenerTarjetasCredito, pagarTarjeta, crearTarjetaCredito } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';
import type { TarjetaCreditoItem } from '@/lib/actions/studio/business/finanzas/finanzas.actions';

interface PagarTarjetaModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onSuccess?: () => void | Promise<void>;
}

export function PagarTarjetaModal({
    isOpen,
    onClose,
    studioSlug,
    onSuccess,
}: PagarTarjetaModalProps) {
    const [cards, setCards] = useState<TarjetaCreditoItem[]>([]);
    const [loadingCards, setLoadingCards] = useState(false);
    const [creditCardId, setCreditCardId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo'>('transferencia');
    const [submitting, setSubmitting] = useState(false);
    const [newCardName, setNewCardName] = useState('');
    const [creatingCard, setCreatingCard] = useState(false);

    useEffect(() => {
        if (isOpen && studioSlug) {
            setLoadingCards(true);
            obtenerTarjetasCredito(studioSlug)
                .then((r) => {
                    if (r.success && r.data) setCards(r.data);
                    else setCards([]);
                })
                .finally(() => setLoadingCards(false));
        }
    }, [isOpen, studioSlug]);

    useEffect(() => {
        if (!isOpen) {
            setCreditCardId('');
            setAmount('');
            setPaymentMethod('transferencia');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        const num = parseFloat(amount);
        if (!creditCardId || !amount || Number.isNaN(num) || num <= 0) {
            toast.error('Selecciona una tarjeta de crédito e ingresa un monto mayor a 0');
            return;
        }
        setSubmitting(true);
        try {
            const result = await pagarTarjeta(studioSlug, creditCardId, num, paymentMethod);
            if (result.success) {
                toast.success('Abono a tarjeta de crédito registrado');
                onClose();
                await onSuccess?.();
            } else {
                toast.error(result.error || 'Error al registrar abono');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error al registrar abono');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    return (
        <ZenDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Pagar tarjeta de crédito"
            description="Registra un abono desde tu banco o efectivo para reducir la deuda de la tarjeta de crédito."
            maxWidth="sm"
            onSave={handleSubmit}
            saveLabel="Registrar abono"
            saveDisabled={!creditCardId || !amount || parseFloat(amount) <= 0 || submitting}
            isLoading={submitting}
            onCancel={onClose}
            cancelLabel="Cancelar"
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Tarjeta de Crédito</label>
                    {loadingCards ? (
                        <p className="text-sm text-zinc-500">Cargando...</p>
                    ) : cards.length === 0 ? (
                        <div className="space-y-2">
                            <p className="text-sm text-zinc-500">Crea tu primera tarjeta de crédito para registrar abonos.</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCardName}
                                    onChange={(e) => setNewCardName(e.target.value)}
                                    placeholder="Nombre (ej. BBVA Visa)"
                                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 text-sm"
                                />
                                <ZenButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={!newCardName.trim() || creatingCard}
                                    loading={creatingCard}
                                    onClick={async () => {
                                        if (!newCardName.trim()) return;
                                        setCreatingCard(true);
                                        try {
                                            const r = await crearTarjetaCredito(studioSlug, { name: newCardName.trim() });
                                            if (r.success && r.data) {
                                                setCards([{ id: r.data!.id, name: newCardName.trim(), balance: 0 }]);
                                                setCreditCardId(r.data.id);
                                                setNewCardName('');
                                                toast.success('Tarjeta de crédito creada');
                                            } else {
                                                toast.error(r.error || 'Error al crear');
                                            }
                                        } finally {
                                            setCreatingCard(false);
                                        }
                                    }}
                                >
                                    Crear tarjeta de crédito
                                </ZenButton>
                            </div>
                        </div>
                    ) : (
                        <>
                            <select
                                value={creditCardId}
                                onChange={(e) => setCreditCardId(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 text-sm"
                            >
                                <option value="">Seleccionar tarjeta de crédito</option>
                                {cards.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} — {formatCurrency(c.balance)}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-zinc-500 mt-2">¿No tienes tarjetas de crédito? Agrega una abajo.</p>
                            <div className="flex gap-2 mt-2">
                                <input
                                    type="text"
                                    value={newCardName}
                                    onChange={(e) => setNewCardName(e.target.value)}
                                    placeholder="Nombre de la tarjeta de crédito (ej. BBVA Visa)"
                                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 text-sm"
                                />
                                <ZenButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={!newCardName.trim() || creatingCard}
                                    loading={creatingCard}
                                    onClick={async () => {
                                        if (!newCardName.trim()) return;
                                        setCreatingCard(true);
                                        try {
                                            const r = await crearTarjetaCredito(studioSlug, { name: newCardName.trim() });
                                            if (r.success && r.data) {
                                                setCards((prev) => [...prev, { id: r.data!.id, name: newCardName.trim(), balance: 0 }]);
                                                setCreditCardId(r.data.id);
                                                setNewCardName('');
                                                toast.success('Tarjeta de crédito agregada');
                                            } else {
                                                toast.error(r.error || 'Error al crear tarjeta de crédito');
                                            }
                                        } finally {
                                            setCreatingCard(false);
                                        }
                                    }}
                                >
                                    Agregar
                                </ZenButton>
                            </div>
                        </>
                    )}
                </div>
                <ZenInput
                    label="Monto a abonar"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                />
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Origen del abono</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('transferencia')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                paymentMethod === 'transferencia'
                                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                            }`}
                        >
                            Transferencia
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('efectivo')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                paymentMethod === 'efectivo'
                                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                            }`}
                        >
                            Efectivo
                        </button>
                    </div>
                </div>
            </div>
        </ZenDialog>
    );
}
