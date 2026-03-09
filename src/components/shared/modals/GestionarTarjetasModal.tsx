'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenDialog, ZenButton, ZenConfirmModal, ZenInput } from '@/components/ui/zen';
import {
    obtenerTarjetasCredito,
    actualizarTarjetaCredito,
    eliminarTarjetaCredito,
    marcarTarjetaComoDefault,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { CreditCard, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { Switch } from '@/components/ui/shadcn/switch';
import { CrearTarjetaCreditoModal } from './CrearTarjetaCreditoModal';

/** Por encima de Radix Popover (100000) cuando se abre desde Confirmar Pago u otros modales */
const GESTOR_Z_INDEX = 100070;
const CREAR_MODAL_Z_INDEX = 100080;

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
    const [tarjetas, setTarjetas] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
    const [showCrearModal, setShowCrearModal] = useState(false);

    const fetchTarjetas = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await obtenerTarjetasCredito(studioSlug);
            if (res.success && res.data) {
                setTarjetas(res.data.map((t) => ({ id: t.id, name: t.name, is_default: t.is_default })));
            }
        } finally {
            if (!silent) setLoading(false);
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

    const handleToggleDefault = async (cardId: string, currentDefault: boolean) => {
        if (currentDefault) return;
        const prevTarjetas = tarjetas;
        setTarjetas((prev) =>
            prev.map((t) => ({ ...t, is_default: t.id === cardId }))
        );
        setSettingDefaultId(cardId);
        try {
            const res = await marcarTarjetaComoDefault(studioSlug, cardId);
            if (res.success) {
                toast.success('Tarjeta predeterminada actualizada');
                notifyChange();
            } else {
                setTarjetas(prevTarjetas);
                toast.error(res.error ?? 'Error al marcar por defecto');
            }
        } finally {
            setSettingDefaultId(null);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        const nameToSave = editName.trim();
        const prevTarjetas = tarjetas;
        setTarjetas((prev) => prev.map((t) => (t.id === editingId ? { ...t, name: nameToSave } : t)));
        setEditingId(null);
        setEditName('');
        setSavingEdit(true);
        try {
            const res = await actualizarTarjetaCredito(studioSlug, editingId, { name: nameToSave });
            if (res.success) {
                toast.success('Tarjeta de crédito actualizada');
                notifyChange();
            } else {
                setTarjetas(prevTarjetas);
                toast.error(res.error ?? 'Error al actualizar');
            }
        } finally {
            setSavingEdit(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        const idToDelete = deleteTargetId;
        const prevTarjetas = tarjetas;
        setTarjetas((prev) => prev.filter((t) => t.id !== idToDelete));
        setDeleteTargetId(null);
        setDeleting(true);
        try {
            const res = await eliminarTarjetaCredito(studioSlug, idToDelete);
            if (res.success) {
                toast.success('Tarjeta de crédito eliminada');
                notifyChange();
                fetchTarjetas(true);
                onClose();
            } else {
                setTarjetas(prevTarjetas);
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

    const handleCreatedCard = (newCardId: string) => {
        setTarjetas((prev) => [
            ...prev,
            { id: newCardId, name: 'Nueva tarjeta', is_default: prev.length === 0 },
        ]);
        notifyChange();
        fetchTarjetas(true);
    };

    const isEmpty = !loading && tarjetas.length === 0;

    return (
        <>
            <ZenDialog
                isOpen={isOpen}
                onClose={handleCloseGestor}
                title="Gestionar tarjetas de crédito"
                maxWidth="md"
                zIndex={GESTOR_Z_INDEX}
                closeOnClickOutside={false}
                onCancel={handleCloseGestor}
                cancelLabel="Cancelar"
                footerRightContent={
                    <ZenButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setShowCrearModal(true)}
                        className="w-full min-w-0 gap-1.5 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        Añadir tarjeta
                    </ZenButton>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-zinc-400">
                        Tarjetas de crédito que usas para pagos recurrentes y gastos.
                    </p>
                    <div className="max-h-[280px] overflow-y-auto">
                        {loading ? (
                            <ul className="space-y-2" aria-busy="true" aria-label="Cargando tarjetas">
                                {[1, 2, 3, 4].map((i) => (
                                    <li
                                        key={i}
                                        className="flex items-center gap-2 rounded-lg border border-zinc-700/80 px-3 py-2.5"
                                    >
                                        <Skeleton className="h-4 w-4 shrink-0 rounded bg-zinc-700/80" />
                                        <Skeleton className="h-4 flex-1 max-w-[60%] rounded bg-zinc-700/80" />
                                        <Skeleton className="h-8 w-8 shrink-0 rounded bg-zinc-700/80" />
                                        <Skeleton className="h-8 w-8 shrink-0 rounded bg-zinc-700/80" />
                                    </li>
                                ))}
                            </ul>
                        ) : isEmpty ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="rounded-full bg-zinc-800/80 p-4 mb-4">
                                    <CreditCard className="h-10 w-10 text-zinc-500" />
                                </div>
                                <p className="text-sm font-medium text-zinc-300 mb-1">
                                    No hay tarjetas de crédito registradas
                                </p>
                                <p className="text-xs text-zinc-500 max-w-[240px]">
                                    Añade las tarjetas de crédito que uses para gastos recurrentes o pagos.
                                </p>
                            </div>
                        ) : (
                                <ul className="space-y-2">
                                {tarjetas.map((t) => (
                                    <li
                                        key={t.id}
                                        className={cn(
                                            'flex items-center gap-2 rounded-lg border border-zinc-700/80 px-3 py-2.5 text-sm transition-colors',
                                            'hover:bg-zinc-800/80'
                                        )}
                                    >
                                        <CreditCard className="h-4 w-4 shrink-0 text-zinc-400" />
                                        <div className="flex flex-1 min-w-0 items-center gap-2">
                                            {editingId === t.id ? (
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
                                            ) : (
                                                <span className="flex-1 truncate text-zinc-200">{t.name}</span>
                                            )}
                                        </div>
                                        <div className="flex w-[7.5rem] shrink-0 items-center justify-end gap-1">
                                            {editingId === t.id ? (
                                                <>
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
                                                    <div className="flex items-center gap-1.5 shrink-0" title={t.is_default ? 'Tarjeta predeterminada' : 'Marcar como predeterminada'}>
                                                        <Switch
                                                            checked={t.is_default}
                                                            onCheckedChange={() => handleToggleDefault(t.id, t.is_default)}
                                                            disabled={settingDefaultId === t.id || t.is_default}
                                                        />
                                                        <span className={cn('text-xs', t.is_default ? 'text-amber-400 font-medium' : 'text-zinc-500 opacity-60')}>
                                                            default
                                                        </span>
                                                    </div>
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
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-700/80 mt-2">
                        Activa la tarjeta que usarás por defecto; esta se cargará automáticamente al momento de seleccionar pagos con tarjeta.
                    </p>
                </div>
            </ZenDialog>

            <CrearTarjetaCreditoModal
                isOpen={showCrearModal}
                onClose={() => setShowCrearModal(false)}
                studioSlug={studioSlug}
                onSuccess={(newCardId) => handleCreatedCard(newCardId)}
                zIndex={CREAR_MODAL_Z_INDEX}
            />

            <ZenConfirmModal
                isOpen={!!deleteTargetId}
                onClose={() => setDeleteTargetId(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar tarjeta de crédito"
                description="¿Eliminar esta tarjeta de crédito? Los gastos asociados quedarán sin tarjeta asignada."
                confirmText="Eliminar"
                variant="destructive"
                loading={deleting}
                zIndex={CREAR_MODAL_Z_INDEX + 10}
            />
        </>
    );
}
