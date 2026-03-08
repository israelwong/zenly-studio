'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenDialog, ZenButton, ZenConfirmModal, ZenInput } from '@/components/ui/zen';
import {
    obtenerTarjetasCredito,
    actualizarTarjetaCredito,
    eliminarTarjetaCredito,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { CreditCard, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CrearTarjetaCreditoModal } from './CrearTarjetaCreditoModal';

const GESTOR_Z_INDEX = 10060;
const CREAR_MODAL_Z_INDEX = 10070;

export interface GestionarTarjetasModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    /** Opcional: llamado al cerrar o tras eliminar/editar/crear para que el padre refresque */
    onCardsChange?: () => void;
}

function dispatchTarjetasChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tarjetas-credito-changed'));
    }
}

export function GestionarTarjetasModal({
    isOpen,
    onClose,
    studioSlug,
    onCardsChange,
}: GestionarTarjetasModalProps) {
    const [tarjetas, setTarjetas] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showCrearModal, setShowCrearModal] = useState(false);

    const fetchTarjetas = useCallback(async () => {
        setLoading(true);
        try {
            const res = await obtenerTarjetasCredito(studioSlug);
            if (res.success && res.data) {
                setTarjetas(res.data.map((t) => ({ id: t.id, name: t.name })));
            }
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    const notifyChange = useCallback(() => {
        onCardsChange?.();
        dispatchTarjetasChanged();
    }, [onCardsChange]);

    useEffect(() => {
        if (isOpen) {
            fetchTarjetas();
            setEditingId(null);
            setDeleteTargetId(null);
        }
    }, [isOpen, fetchTarjetas]);

    const handleStartEdit = (id: string, name: string) => {
        setEditingId(id);
        setEditName(name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        setSavingEdit(true);
        try {
            const res = await actualizarTarjetaCredito(studioSlug, editingId, {
                name: editName.trim(),
            });
            if (res.success) {
                toast.success('Tarjeta actualizada');
                setEditingId(null);
                setEditName('');
                await fetchTarjetas();
                notifyChange();
            } else {
                toast.error(res.error ?? 'Error al actualizar');
            }
        } finally {
            setSavingEdit(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        setDeleting(true);
        try {
            const res = await eliminarTarjetaCredito(studioSlug, deleteTargetId);
            if (res.success) {
                toast.success('Tarjeta eliminada');
                setDeleteTargetId(null);
                await fetchTarjetas();
                notifyChange();
                onClose();
            } else {
                toast.error(res.error ?? 'Error al eliminar');
            }
        } finally {
            setDeleting(false);
        }
    };

    const handleCloseGestor = () => {
        notifyChange();
        onClose();
    };

    const handleCreatedCard = () => {
        fetchTarjetas();
        notifyChange();
    };

    const isEmpty = !loading && tarjetas.length === 0;

    return (
        <>
            <ZenDialog
                isOpen={isOpen}
                onClose={handleCloseGestor}
                title="Gestionar tarjetas"
                maxWidth="md"
                zIndex={GESTOR_Z_INDEX}
                closeOnClickOutside={false}
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-zinc-400">
                            Tarjetas de crédito que usas para pagos recurrentes
                        </p>
                        <ZenButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCrearModal(true)}
                            className="shrink-0 gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                            <Plus className="h-4 w-4" />
                            Añadir tarjeta
                        </ZenButton>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto">
                        {loading ? (
                        <p className="py-6 text-sm text-zinc-400 text-center">Cargando...</p>
                        ) : isEmpty ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="rounded-full bg-zinc-800/80 p-4 mb-4">
                                <CreditCard className="h-10 w-10 text-zinc-500" />
                            </div>
                            <p className="text-sm font-medium text-zinc-300 mb-1">
                                No hay tarjetas registradas
                            </p>
                            <p className="text-xs text-zinc-500 mb-4 max-w-[240px]">
                                Añade las tarjetas de crédito que uses para gastos recurrentes o pagos.
                            </p>
                            <ZenButton
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => setShowCrearModal(true)}
                                className="gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Añadir mi primera tarjeta
                            </ZenButton>
                        </div>
                        ) : (
                            <>
                                <ul className="space-y-0.5">
                                {tarjetas.map((t) => (
                                    <li
                                        key={t.id}
                                        className={cn(
                                            'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                            'hover:bg-zinc-800/80'
                                        )}
                                    >
                                        <CreditCard className="h-4 w-4 shrink-0 text-zinc-400" />
                                        {editingId === t.id ? (
                                            <>
                                                <ZenInput
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    placeholder="Nombre"
                                                    className="flex-1 min-w-0 h-8 text-sm"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                                <ZenButton
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={handleSaveEdit}
                                                    disabled={savingEdit || !editName.trim()}
                                                    className="shrink-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </ZenButton>
                                                <ZenButton
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={handleCancelEdit}
                                                    disabled={savingEdit}
                                                    className="shrink-0 text-zinc-400"
                                                >
                                                    <X className="h-4 w-4" />
                                                </ZenButton>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex-1 truncate text-zinc-200">{t.name}</span>
                                                <ZenButton
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleStartEdit(t.id, t.name)}
                                                    className="shrink-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                                                    aria-label="Editar"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </ZenButton>
                                                <ZenButton
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteTargetId(t.id)}
                                                    className="shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    aria-label="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </ZenButton>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <div className="border-t border-zinc-700/80 mt-2 pt-2">
                                <ZenButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowCrearModal(true)}
                                    className="w-full justify-center gap-2 text-emerald-400 hover:bg-emerald-500/10"
                                >
                                    <Plus className="h-4 w-4" />
                                    Añadir tarjeta
                                </ZenButton>
                            </div>
                        </>
                    )}
                    </div>
                </div>
            </ZenDialog>

            <CrearTarjetaCreditoModal
                isOpen={showCrearModal}
                onClose={() => setShowCrearModal(false)}
                studioSlug={studioSlug}
                onSuccess={handleCreatedCard}
                zIndex={CREAR_MODAL_Z_INDEX}
            />

            <ZenConfirmModal
                isOpen={!!deleteTargetId}
                onClose={() => setDeleteTargetId(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar tarjeta"
                description="¿Eliminar esta tarjeta? Los gastos asociados quedarán sin tarjeta asignada."
                confirmText="Eliminar"
                variant="destructive"
                loading={deleting}
                zIndex={CREAR_MODAL_Z_INDEX + 10}
            />
        </>
    );
}
