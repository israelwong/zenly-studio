'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Plus, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
    obtenerRedesSocialesStudio,
    obtenerPlataformasDisponibles,
    crearRedSocial,
    actualizarRedSocial,
    eliminarRedSocial,
    reordenarRedesSociales,
    toggleRedSocialEstado
} from '@/lib/actions/studio/profile/identidad';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Plataforma {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
}

interface RedSocial {
    id: string;
    studio_id: string;
    plataformaId: string | null;
    url: string;
    activo: boolean;
    plataforma: Plataforma | null;
}

interface EditSocialNetworksModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onSuccess?: () => void;
}

function SortableItem({ red, onToggle, onEdit, onDelete }: {
    red: RedSocial;
    onToggle: (id: string, estado: boolean) => Promise<void>;
    onEdit: (red: RedSocial) => void;
    onDelete: (id: string) => Promise<void>;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: red.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [isToggling, setIsToggling] = useState(false);

    const handleToggle = async () => {
        setIsToggling(true);
        await onToggle(red.id, !red.activo);
        setIsToggling(false);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg group hover:border-zinc-700 transition-colors"
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors"
            >
                <GripVertical className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {red.plataforma?.icon && (
                        <span className="text-lg">{red.plataforma.icon}</span>
                    )}
                    <span className="text-sm font-medium text-zinc-300">
                        {red.plataforma?.name || 'Red social'}
                    </span>
                </div>
                <p className="text-xs text-zinc-500 truncate">{red.url}</p>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={handleToggle}
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        red.activo ? 'bg-emerald-600' : 'bg-zinc-700'
                    } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            red.activo ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>

                <button
                    onClick={() => onEdit(red)}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                >
                    Editar
                </button>

                <button
                    onClick={() => onDelete(red.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export function EditSocialNetworksModal({
    isOpen,
    onClose,
    studioSlug,
    onSuccess
}: EditSocialNetworksModalProps) {
    const [redes, setRedes] = useState<RedSocial[]>([]);
    const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingRed, setEditingRed] = useState<RedSocial | null>(null);
    const [formData, setFormData] = useState({
        plataformaId: '',
        url: ''
    });
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, studioSlug]);

    const loadData = async () => {
        try {
            setLoading(true);

            const redesResult = await obtenerRedesSocialesStudio(studioSlug);
            if (Array.isArray(redesResult)) {
                const redesFormateadas = redesResult.map((red) => ({
                    id: red.id,
                    studio_id: red.studio_id,
                    plataformaId: red.platform_id,
                    url: red.url,
                    activo: red.is_active,
                    plataforma: red.platform ? {
                        id: red.platform.id,
                        name: red.platform.name,
                        slug: red.platform.slug,
                        icon: red.platform.icon,
                        color: red.platform.color,
                    } : null
                }));
                setRedes(redesFormateadas);
            }

            const plataformasResult = await obtenerPlataformasDisponibles();
            if (plataformasResult.success && plataformasResult.data) {
                const plataformasFormateadas = plataformasResult.data.map((p) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    icon: p.icon,
                    color: p.color,
                }));
                setPlataformas(plataformasFormateadas);
            }
        } catch (error) {
            console.error('Error loading social networks:', error);
            toast.error('Error al cargar redes sociales');
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = redes.findIndex((r) => r.id === active.id);
        const newIndex = redes.findIndex((r) => r.id === over.id);

        const newOrder = arrayMove(redes, oldIndex, newIndex);
        setRedes(newOrder);

        try {
            const ordenIds = newOrder.map((red) => red.id);
            const result = await reordenarRedesSociales(studioSlug, ordenIds);
            if (!result.success) {
                toast.error('Error al reordenar');
                setRedes(redes);
            }
        } catch (error) {
            console.error('Error reordering:', error);
            toast.error('Error al reordenar');
            setRedes(redes);
        }
    };

    const handleToggle = async (id: string, nuevoEstado: boolean) => {
        const result = await toggleRedSocialEstado(studioSlug, id, nuevoEstado);
        if (result.success) {
            setRedes(redes.map(r => r.id === id ? { ...r, activo: nuevoEstado } : r));
            toast.success(nuevoEstado ? 'Red social activada' : 'Red social desactivada');
        } else {
            toast.error('Error al cambiar estado');
        }
    };

    const handleEdit = (red: RedSocial) => {
        setEditingRed(red);
        setFormData({
            plataformaId: red.plataformaId || '',
            url: red.url
        });
        setShowAddForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta red social?')) return;

        const result = await eliminarRedSocial(studioSlug, id);
        if (result.success) {
            setRedes(redes.filter(r => r.id !== id));
            toast.success('Red social eliminada');
            onSuccess?.();
        } else {
            toast.error('Error al eliminar');
        }
    };

    const handleSubmit = async () => {
        if (!formData.plataformaId || !formData.url) {
            toast.error('Completa todos los campos');
            return;
        }

        setSaving(true);
        try {
            if (editingRed) {
                const result = await actualizarRedSocial(studioSlug, editingRed.id, formData);
                if (result.success) {
                    toast.success('Red social actualizada');
                    await loadData();
                    setShowAddForm(false);
                    setEditingRed(null);
                    setFormData({ plataformaId: '', url: '' });
                    onSuccess?.();
                } else {
                    toast.error(result.error || 'Error al actualizar');
                }
            } else {
                const result = await crearRedSocial(studioSlug, formData);
                if (result.success) {
                    toast.success('Red social agregada');
                    await loadData();
                    setShowAddForm(false);
                    setFormData({ plataformaId: '', url: '' });
                    onSuccess?.();
                } else {
                    toast.error(result.error || 'Error al crear');
                }
            }
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setShowAddForm(false);
        setEditingRed(null);
        setFormData({ plataformaId: '', url: '' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Redes sociales</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {loading ? (
                        <div className="text-center py-8 text-zinc-500">
                            Cargando...
                        </div>
                    ) : (
                        <>
                            {showAddForm ? (
                                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                                            Plataforma
                                        </label>
                                        <select
                                            value={formData.plataformaId}
                                            onChange={(e) => setFormData({ ...formData, plataformaId: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        >
                                            <option value="">Selecciona una plataforma</option>
                                            {plataformas.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.icon} {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <ZenInput
                                        label="URL"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="https://..."
                                        required
                                    />

                                    <div className="flex gap-2">
                                        <ZenButton
                                            onClick={handleSubmit}
                                            loading={saving}
                                            disabled={saving}
                                        >
                                            {editingRed ? 'Actualizar' : 'Agregar'}
                                        </ZenButton>
                                        <ZenButton
                                            variant="ghost"
                                            onClick={handleCancel}
                                            disabled={saving}
                                        >
                                            Cancelar
                                        </ZenButton>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-800 rounded-lg text-zinc-500 hover:border-emerald-600 hover:text-emerald-500 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>Agregar red social</span>
                                </button>
                            )}

                            {redes.length > 0 && (
                                <div className="space-y-2">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={redes.map(r => r.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {redes.map((red) => (
                                                <SortableItem
                                                    key={red.id}
                                                    red={red}
                                                    onToggle={handleToggle}
                                                    onEdit={handleEdit}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            )}

                            {redes.length === 0 && !showAddForm && (
                                <div className="text-center py-8 text-zinc-500">
                                    No hay redes sociales agregadas
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
