'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ZenDialog,
    ZenInput,
    ZenSwitch,
    ZenButton,
} from '@/components/ui/zen';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { CheckCircle2, Trash2, Search, UserX, ChevronRight } from 'lucide-react';
import { crearGastoRecurrente, obtenerGastoRecurrente, eliminarGastoRecurrente } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { obtenerCrewMembers } from '@/lib/actions/studio/crew';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ZenConfirmModal } from '@/components/ui/zen';

interface RegistrarGastoRecurrenteModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onSuccess?: () => void;
    expenseId?: string; // ID del gasto recurrente a editar
}

type Recurrencia = 'weekly' | 'biweekly' | 'monthly';

function PersonalSelectorSkeleton() {
    return (
        <div className="divide-y divide-zinc-700">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-zinc-700 animate-pulse" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3.5 w-3/4 max-w-[140px] rounded bg-zinc-700 animate-pulse" />
                        <div className="h-3 w-1/2 max-w-[80px] rounded bg-zinc-700/80 animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function RegistrarGastoRecurrenteModal({
    isOpen,
    onClose,
    studioSlug,
    onSuccess,
    expenseId,
}: RegistrarGastoRecurrenteModalProps) {
    const isEditMode = !!expenseId;
    const [concepto, setConcepto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [monto, setMonto] = useState('');
    const [recurrencia, setRecurrencia] = useState<Recurrencia>('monthly');
    const [personalId, setPersonalId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showDeleteOptionsModal, setShowDeleteOptionsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteType, setDeleteType] = useState<'all' | 'future'>('future');
    const [asociarAPersonal, setAsociarAPersonal] = useState(false);
    const [selectedPersonalName, setSelectedPersonalName] = useState<string | null>(null);
    const [showPersonalSelectorDialog, setShowPersonalSelectorDialog] = useState(false);
    const [selectorMembers, setSelectorMembers] = useState<{ id: string; name: string; tipo: string | null }[]>([]);
    const [selectorLoading, setSelectorLoading] = useState(false);
    const [selectorSearch, setSelectorSearch] = useState('');
    const [pendingPersonalId, setPendingPersonalId] = useState<string | null>(null);
    const [pendingPersonalName, setPendingPersonalName] = useState<string | null>(null);
    const openedPersonalFromSwitchRef = useRef(false);

    const loadExpenseData = useCallback(async () => {
        if (!expenseId) return;
        setInitialLoading(true);
        try {
            const result = await obtenerGastoRecurrente(studioSlug, expenseId);
            if (result.success && result.data) {
                setConcepto(result.data.name);
                setDescripcion(result.data.description || '');
                setMonto(result.data.amount.toString());
                setRecurrencia(result.data.frequency as Recurrencia);
                const pid = result.data.personal_id ?? null;
                setPersonalId(pid);
                setAsociarAPersonal(pid != null);
                if (pid) {
                    try {
                        const crewRes = await obtenerCrewMembers(studioSlug);
                        if (crewRes.success && crewRes.data) {
                            const name = crewRes.data.find((m) => m.id === pid)?.name ?? null;
                            setSelectedPersonalName(name);
                        }
                    } catch {
                        setSelectedPersonalName(null);
                    }
                } else {
                    setSelectedPersonalName(null);
                }
            } else {
                toast.error(result.error || 'Error al cargar datos del gasto recurrente');
            }
        } catch (error) {
            console.error('Error cargando datos del gasto recurrente:', error);
            toast.error('Error al cargar datos del gasto recurrente');
        } finally {
            setInitialLoading(false);
        }
    }, [expenseId, studioSlug]);

    useEffect(() => {
        if (isOpen) {
            setInitialLoading(true);
            if (isEditMode && expenseId) {
                loadExpenseData();
            } else {
                setTimeout(() => {
                    setInitialLoading(false);
                }, 300);
            }
        }
    }, [isOpen, expenseId, isEditMode, loadExpenseData]);

    useEffect(() => {
        if (showPersonalSelectorDialog) {
            setPendingPersonalId(personalId);
            setPendingPersonalName(selectedPersonalName);
            setSelectorSearch('');
            setSelectorLoading(true);
            obtenerCrewMembers(studioSlug)
                .then((res) => {
                    if (res.success && res.data) {
                        setSelectorMembers(res.data.map((m) => ({ id: m.id, name: m.name, tipo: m.tipo ?? null })));
                    } else {
                        setSelectorMembers([]);
                    }
                })
                .catch(() => setSelectorMembers([]))
                .finally(() => setSelectorLoading(false));
        }
    }, [showPersonalSelectorDialog, studioSlug]);

    useEffect(() => {
        if (!isOpen) {
            setConcepto('');
            setDescripcion('');
            setMonto('');
            setRecurrencia('monthly');
            setPersonalId(null);
            setAsociarAPersonal(false);
            setSelectedPersonalName(null);
            setShowPersonalSelectorDialog(false);
            setError(null);
            setInitialLoading(true);
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!concepto.trim()) {
            setError('El concepto es requerido');
            return;
        }

        if (descripcion.length > 200) {
            setError('La descripción no puede exceder 200 caracteres');
            return;
        }

        if (!monto || parseFloat(monto) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (isEditMode && expenseId) {
                const { actualizarGastoRecurrente } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
                const result = await actualizarGastoRecurrente(studioSlug, expenseId, {
                    name: concepto.trim(),
                    description: descripcion.trim() || null,
                    amount: parseFloat(monto),
                    frequency: recurrencia,
                    category: 'fijo',
                    chargeDay: 1,
                    personalId: personalId || null,
                });

                if (result.success) {
                    toast.success('Gasto recurrente actualizado correctamente');
                    await onSuccess?.();
                    onClose();
                } else {
                    setError(result.error || 'Error al actualizar gasto recurrente');
                }
            } else {
                const result = await crearGastoRecurrente(studioSlug, {
                    name: concepto.trim(),
                    description: descripcion.trim() || null,
                    amount: parseFloat(monto),
                    frequency: recurrencia,
                    category: 'fijo',
                    chargeDay: 1,
                    personalId: personalId || null,
                });

                if (result.success) {
                    toast.success('Gasto recurrente registrado correctamente');
                    await onSuccess?.();
                    onClose();
                } else {
                    setError(result.error || 'Error al registrar gasto recurrente');
                }
            }
        } catch (err) {
            setError(`Error al ${isEditMode ? 'actualizar' : 'registrar'} gasto recurrente`);
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEliminarClick = () => {
        setShowDeleteOptionsModal(true);
    };

    const handleDeleteOptionSelect = (type: 'all' | 'future') => {
        setDeleteType(type);
        setShowDeleteOptionsModal(false);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!expenseId) return;
        setIsDeleting(true);
        try {
            const result = await eliminarGastoRecurrente(studioSlug, expenseId, { deleteType });
            if (result.success) {
                const messages = {
                    all: 'Gasto recurrente y todos los pagos históricos eliminados',
                    future: 'Gasto recurrente eliminado. Los pagos históricos se mantienen',
                };
                toast.success(messages[deleteType]);
                await onSuccess?.();
                setShowDeleteModal(false);
                onClose();
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
            <ZenDialog
                isOpen={isOpen}
                onClose={onClose}
                title={isEditMode ? 'Editar Gasto Recurrente' : 'Registrar Gasto Recurrente'}
                description={isEditMode ? 'Edita los datos del gasto recurrente' : 'Registra un gasto que se repite periódicamente'}
                onSave={isEditMode ? undefined : handleSave}
                saveLabel={isEditMode ? 'Actualizar' : 'Guardar'}
                saveVariant="primary"
                isLoading={loading}
                onCancel={isEditMode ? undefined : onClose}
                cancelLabel="Cancelar"
                maxWidth="lg"
                showDeleteButton={false}
                footerLeftContent={isEditMode ? (
                    <ZenButton
                        type="button"
                        variant="ghost"
                        onClick={handleEliminarClick}
                        disabled={loading}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        Eliminar
                    </ZenButton>
                ) : undefined}
                footerRightContent={isEditMode ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <ZenButton type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancelar
                        </ZenButton>
                        <ZenButton type="button" className="flex-1" onClick={handleSave} loading={loading} variant="primary">
                            Actualizar
                        </ZenButton>
                    </div>
                ) : undefined}
            >
                {initialLoading ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-20 bg-zinc-700" />
                            <Skeleton className="h-10 w-full rounded-md bg-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24 bg-zinc-700" />
                            <Skeleton className="h-20 w-full rounded-md bg-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16 bg-zinc-700" />
                            <Skeleton className="h-10 w-full rounded-md bg-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32 bg-zinc-700" />
                            <div className="space-y-2">
                                <Skeleton className="h-12 w-full rounded-md bg-zinc-700" />
                                <Skeleton className="h-12 w-full rounded-md bg-zinc-700" />
                                <Skeleton className="h-12 w-full rounded-md bg-zinc-700" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <ZenInput
                            label="Concepto"
                            value={concepto}
                            onChange={(e) => setConcepto(e.target.value)}
                            placeholder="Ej: Renta oficina, Suscripción Adobe..."
                            required
                            error={error && !concepto.trim() ? error : undefined}
                        />

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">
                                Descripción <span className="text-zinc-500">(opcional, máx. 200 caracteres)</span>
                            </label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => {
                                    if (e.target.value.length <= 200) {
                                        setDescripcion(e.target.value);
                                    }
                                }}
                                placeholder="Descripción del gasto recurrente..."
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                rows={3}
                                maxLength={200}
                            />
                            {error && descripcion.length > 200 && (
                                <p className="text-xs text-red-400">{error}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-[minmax(0,120px)_1fr] gap-4">
                            <div className="space-y-2">
                                <ZenInput
                                    label="Monto"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={monto}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === '') {
                                            setMonto(v);
                                            return;
                                        }
                                        const n = parseFloat(v);
                                        if (!Number.isNaN(n) && n < 0) return;
                                        setMonto(v);
                                    }}
                                    placeholder="0.00"
                                    required
                                    error={error && (!monto || parseFloat(monto) <= 0) ? error : undefined}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 mb-2 block">
                                    Recurrencia <span className="text-red-400">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                <label
                                    htmlFor="recurrencia-weekly"
                                    className={cn(
                                        'relative flex items-center justify-center gap-2 h-[42px] min-h-[42px] px-3 rounded-lg border cursor-pointer transition-all',
                                        recurrencia === 'weekly'
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        id="recurrencia-weekly"
                                        name="recurrencia"
                                        value="weekly"
                                        checked={recurrencia === 'weekly'}
                                        onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
                                        className="sr-only"
                                    />
                                    {recurrencia === 'weekly' && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                                    <span className={cn('text-sm font-medium', recurrencia === 'weekly' ? 'text-emerald-200' : 'text-zinc-300')}>Semanal</span>
                                </label>
                                <label
                                    htmlFor="recurrencia-biweekly"
                                    className={cn(
                                        'relative flex items-center justify-center gap-2 h-[42px] min-h-[42px] px-3 rounded-lg border cursor-pointer transition-all',
                                        recurrencia === 'biweekly'
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        id="recurrencia-biweekly"
                                        name="recurrencia"
                                        value="biweekly"
                                        checked={recurrencia === 'biweekly'}
                                        onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
                                        className="sr-only"
                                    />
                                    {recurrencia === 'biweekly' && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                                    <span className={cn('text-sm font-medium', recurrencia === 'biweekly' ? 'text-emerald-200' : 'text-zinc-300')}>Quincenal</span>
                                </label>
                                <label
                                    htmlFor="recurrencia-monthly"
                                    className={cn(
                                        'relative flex items-center justify-center gap-2 h-[42px] min-h-[42px] px-3 rounded-lg border cursor-pointer transition-all',
                                        recurrencia === 'monthly'
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                    )}
                                >
                                    <input
                                        type="radio"
                                        id="recurrencia-monthly"
                                        name="recurrencia"
                                        value="monthly"
                                        checked={recurrencia === 'monthly'}
                                        onChange={(e) => setRecurrencia(e.target.value as Recurrencia)}
                                        className="sr-only"
                                    />
                                    {recurrencia === 'monthly' && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                                    <span className={cn('text-sm font-medium', recurrencia === 'monthly' ? 'text-emerald-200' : 'text-zinc-300')}>Mensual</span>
                                </label>
                            </div>
                            </div>
                        </div>

                        <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                            <ZenSwitch
                                checked={asociarAPersonal}
                                onCheckedChange={(checked) => {
                                    setAsociarAPersonal(checked);
                                    if (!checked) {
                                        setPersonalId(null);
                                        setSelectedPersonalName(null);
                                    } else {
                                        openedPersonalFromSwitchRef.current = true;
                                        setShowPersonalSelectorDialog(true);
                                    }
                                }}
                                label="Asociar a personal"
                            />
                            {asociarAPersonal && (
                                <ZenButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-10 justify-between"
                                    onClick={() => {
                                        openedPersonalFromSwitchRef.current = false;
                                        setShowPersonalSelectorDialog(true);
                                    }}
                                >
                                    <span className="truncate">
                                        {selectedPersonalName || 'Seleccionar miembro del personal'}
                                    </span>
                                    {selectedPersonalName ? (
                                        <span className="text-xs text-zinc-500 shrink-0">Cambiar</span>
                                    ) : (
                                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                                    )}
                                </ZenButton>
                            )}
                        </div>

                        {error && (concepto.trim() && monto && descripcion.length <= 200) && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}
                    </div>
                )}
            </ZenDialog>

            {/* Diálogo selector de personal */}
            <ZenDialog
                isOpen={showPersonalSelectorDialog}
                onClose={() => {
                    if (openedPersonalFromSwitchRef.current && !personalId) {
                        setAsociarAPersonal(false);
                    }
                    openedPersonalFromSwitchRef.current = false;
                    setShowPersonalSelectorDialog(false);
                }}
                title="Seleccionar miembro del personal"
                description="Busca y elige a un miembro para asociar al gasto recurrente."
                maxWidth="md"
                zIndex={10060}
                onCancel={() => {
                    if (openedPersonalFromSwitchRef.current && !personalId) {
                        setAsociarAPersonal(false);
                    }
                    openedPersonalFromSwitchRef.current = false;
                    setShowPersonalSelectorDialog(false);
                }}
                cancelLabel="Cancelar"
                onSave={() => {
                    setPersonalId(pendingPersonalId);
                    setSelectedPersonalName(pendingPersonalName);
                    openedPersonalFromSwitchRef.current = false;
                    setShowPersonalSelectorDialog(false);
                }}
                saveLabel="Confirmar selección"
                saveDisabled={false}
            >
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <input
                            type="text"
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            placeholder="Buscar por nombre..."
                            className="w-full pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="max-h-[280px] overflow-y-auto rounded-lg border border-zinc-700 divide-y divide-zinc-700">
                        {selectorLoading ? (
                            <div className="max-h-[280px] overflow-y-auto rounded-lg border border-zinc-700">
                                <PersonalSelectorSkeleton />
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPendingPersonalId(null);
                                        setPendingPersonalName(null);
                                    }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                                        pendingPersonalId === null
                                            ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
                                            : 'hover:bg-zinc-800/70'
                                    )}
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700">
                                        <UserX className="h-4 w-4 text-zinc-400" />
                                    </div>
                                    <span className="text-zinc-300">Sin asignar</span>
                                    {pendingPersonalId === null && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />
                                    )}
                                </button>
                                {(() => {
                                    const filtered = selectorMembers
                                        .filter((m) =>
                                            !selectorSearch.trim()
                                                ? true
                                                : m.name.toLowerCase().includes(selectorSearch.trim().toLowerCase())
                                        )
                                        .sort((a, b) => (a.tipo ?? '').localeCompare(b.tipo ?? '') || a.name.localeCompare(b.name));
                                    if (filtered.length === 0) {
                                        return (
                                            <div className="p-4 text-sm text-zinc-500 text-center">
                                                No hay coincidencias
                                            </div>
                                        );
                                    }
                                    return (
                                        <>
                                            {filtered.map((member) => (
                                                <button
                                                    key={member.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setPendingPersonalId(member.id);
                                                        setPendingPersonalName(member.name);
                                                    }}
                                                    className={cn(
                                                        'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                                                        pendingPersonalId === member.id
                                                            ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
                                                            : 'hover:bg-zinc-800/70'
                                                    )}
                                                >
                                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                                        <AvatarFallback className="bg-zinc-600 text-zinc-200 text-xs">
                                                            {member.name.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-zinc-200 truncate">{member.name}</div>
                                                        <div className="text-xs text-zinc-500">{member.tipo ?? '—'}</div>
                                                    </div>
                                                    {pendingPersonalId === member.id && (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </>
                                    );
                                })()}
                            </>
                        )}
                    </div>
                </div>
            </ZenDialog>

            {/* Modal de selección de tipo de eliminación */}
            <ZenConfirmModal
                isOpen={showDeleteOptionsModal}
                onClose={() => setShowDeleteOptionsModal(false)}
                onConfirm={() => { }}
                title="¿Cómo deseas eliminar el gasto recurrente?"
                description={
                    <div className="space-y-2">
                        <div className="text-sm text-zinc-300 mb-3">
                            Selecciona qué deseas eliminar para "{concepto}":
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleDeleteOptionSelect('all')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Todos los históricos y futuros</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Elimina el gasto recurrente y todos los pagos registrados</div>
                            </button>
                            <button
                                onClick={() => handleDeleteOptionSelect('future')}
                                className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                            >
                                <div className="font-medium text-sm text-zinc-200">Solo los futuros</div>
                                <div className="text-xs text-zinc-400 mt-0.5">Elimina el gasto recurrente pero mantiene los pagos históricos</div>
                            </button>
                        </div>
                    </div>
                }
                confirmText=""
                cancelText="Cancelar"
                variant="default"
                hideConfirmButton
            />

            <ZenConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                title="¿Estás seguro de eliminar?"
                description={
                    deleteType === 'all'
                        ? `Esta acción eliminará el gasto recurrente "${concepto}" y TODOS los pagos históricos relacionados. Esta acción no se puede deshacer.`
                        : `Esta acción eliminará el gasto recurrente "${concepto}". Los pagos históricos se mantendrán, pero no se generarán más pagos futuros.`
                }
                confirmText="Sí, eliminar"
                cancelText="No, cancelar"
                variant="destructive"
                loading={isDeleting}
                loadingText="Eliminando..."
            />
        </>
    );
}
