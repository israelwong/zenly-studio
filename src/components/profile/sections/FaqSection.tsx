'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { createFAQ, updateFAQ, deleteFAQ } from '@/lib/actions/studio/faq.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface FAQItem {
    id: string;
    pregunta: string;
    respuesta: string;
    orden: number;
    is_active: boolean;
}

interface FaqSectionProps {
    faq?: FAQItem[];
    data?: {
        faq?: FAQItem[];
    };
    loading?: boolean;
    viewMode?: 'compact' | 'expanded';
    studioSlug: string;
    ownerId?: string | null;
}

/**
 * FaqSection - Sección de preguntas frecuentes con edición inline
 * Patrón simplificado similar a ContactSection
 */
export function FaqSection({
    faq,
    data,
    loading = false,
    viewMode = 'compact',
    studioSlug,
    ownerId
}: FaqSectionProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editData, setEditData] = useState({ pregunta: '', respuesta: '' });
    const [saving, setSaving] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; pregunta: string } | null>(null);

    const isOwner = user?.id === ownerId;
    const faqData = faq || data?.faq || [];
    const activeFAQ = faqData.filter(faq => faq.is_active);

    const handleDataRefresh = () => router.refresh();

    const toggleItem = (id: string) => {
        setOpenItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleCreate = () => {
        setIsCreating(true);
        setEditingId(null);
        setEditData({ pregunta: '', respuesta: '' });
    };

    const handleEdit = (faqItem: FAQItem) => {
        setEditingId(faqItem.id);
        setIsCreating(false);
        setEditData({ pregunta: faqItem.pregunta, respuesta: faqItem.respuesta });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setIsCreating(false);
        setEditData({ pregunta: '', respuesta: '' });
    };

    const handleSave = async (faqId?: string) => {
        if (!editData.pregunta.trim() || !editData.respuesta.trim()) {
            toast.error('Pregunta y respuesta son requeridas');
            return;
        }

        const targetId = faqId || editingId;
        setSaving(targetId || 'new');

        try {
            if (isCreating) {
                const result = await createFAQ(studioSlug, editData);
                if (result.success) {
                    toast.success('Pregunta agregada');
                    handleCancelEdit();
                    handleDataRefresh();
                } else {
                    toast.error(result.error || 'Error al crear');
                }
            } else if (targetId) {
                const result = await updateFAQ(targetId, studioSlug, editData);
                if (result.success) {
                    toast.success('Pregunta actualizada');
                    handleCancelEdit();
                    handleDataRefresh();
                } else {
                    toast.error(result.error || 'Error al actualizar');
                }
            }
        } catch (error) {
            toast.error('Error al guardar');
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteClick = (faqId: string, pregunta: string) => {
        setConfirmDelete({ id: faqId, pregunta });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;

        setSaving(confirmDelete.id);
        try {
            const result = await deleteFAQ(confirmDelete.id, studioSlug);
            if (result.success) {
                toast.success('Pregunta eliminada');
                handleDataRefresh();
            } else {
                toast.error(result.error || 'Error al eliminar');
            }
        } catch (error) {
            toast.error('Error al eliminar');
        } finally {
            setSaving(null);
            setConfirmDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="px-8 py-6 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-zinc-800 rounded-lg p-4">
                        <div className="h-4 bg-zinc-700 rounded animate-pulse w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!activeFAQ.length && !isOwner) return null;

    return (
        <div className="px-8 py-6 space-y-4">
            {/* Formulario crear */}
            {isCreating && (
                <div className="rounded-lg p-4 -mx-6 border border-purple-500/50 bg-zinc-900/50 space-y-3">
                    <ZenInput
                        label="Pregunta"
                        value={editData.pregunta}
                        onChange={(e) => setEditData(prev => ({ ...prev, pregunta: e.target.value }))}
                        placeholder="¿Cuál es tu pregunta?"
                        required
                    />
                    <ZenTextarea
                        label="Respuesta"
                        value={editData.respuesta}
                        onChange={(e) => setEditData(prev => ({ ...prev, respuesta: e.target.value }))}
                        placeholder="Escribe la respuesta..."
                        rows={3}
                        required
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSave()}
                            disabled={saving === 'new'}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                        >
                            {saving === 'new' ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            Guardar
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            disabled={saving === 'new'}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-sm rounded-lg transition-colors flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!activeFAQ.length && isOwner && !isCreating && (
                <div className="rounded-lg p-6 -mx-6 border border-dashed border-purple-600/30 bg-purple-600/5 text-center">
                    <p className="text-sm text-zinc-400 mb-3">
                        Responde las dudas más comunes de tus clientes
                    </p>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar pregunta
                    </button>
                </div>
            )}

            {/* Lista de FAQs */}
            {activeFAQ.length > 0 && (
                <div className="space-y-2">
                    {activeFAQ
                        .sort((a, b) => a.orden - b.orden)
                        .map((faqItem) => {
                            const isOpen = openItems.has(faqItem.id);
                            const isEditing = editingId === faqItem.id;
                            const isSaving = saving === faqItem.id;

                            // Modo edición
                            if (isEditing) {
                                return (
                                    <div key={faqItem.id} className="rounded-lg p-4 -mx-6 border border-purple-500/50 bg-zinc-800/30 space-y-3">
                                        <ZenInput
                                            label="Pregunta"
                                            value={editData.pregunta}
                                            onChange={(e) => setEditData(prev => ({ ...prev, pregunta: e.target.value }))}
                                            required
                                        />
                                        <ZenTextarea
                                            label="Respuesta"
                                            value={editData.respuesta}
                                            onChange={(e) => setEditData(prev => ({ ...prev, respuesta: e.target.value }))}
                                            rows={3}
                                            required
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSave(faqItem.id)}
                                                disabled={isSaving}
                                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                {isSaving ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                                Guardar
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-sm rounded-lg transition-colors flex items-center gap-2"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            // Modo lectura
                            return (
                                <div
                                    key={faqItem.id}
                                    className={`relative group rounded-lg -mx-6 border border-zinc-800 overflow-hidden transition-all duration-200 ${isOwner ? 'hover:border-purple-600/30' : ''}`}
                                >
                                    <div className="flex items-center justify-between gap-3 p-4 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                                        <button
                                            onClick={() => toggleItem(faqItem.id)}
                                            className="flex-1 text-left min-w-0"
                                        >
                                            <span className={`font-medium text-sm truncate block ${isOpen ? 'text-purple-300' : 'text-white'}`}>
                                                {faqItem.pregunta}
                                            </span>
                                        </button>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Botones edición - izquierda del chevron */}
                                            {isOwner && (
                                                <div className="flex gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                                                    <button
                                                        onClick={() => handleEdit(faqItem)}
                                                        className="p-1.5 rounded-md bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 transition-all"
                                                        aria-label="Editar"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(faqItem.id, faqItem.pregunta)}
                                                        className="p-1.5 rounded-md bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-all"
                                                        aria-label="Eliminar"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Chevron */}
                                            <button
                                                onClick={() => toggleItem(faqItem.id)}
                                                className={`rounded-full p-1 transition-all ${isOpen ? 'bg-purple-600/20 text-purple-400' : 'bg-zinc-700/50 text-zinc-500'}`}
                                                aria-label={isOpen ? 'Cerrar' : 'Abrir'}
                                            >
                                                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Respuesta */}
                                    {isOpen && (
                                        <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
                                            <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">
                                                {faqItem.respuesta}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                    {/* Botón agregar más */}
                    {isOwner && !isCreating && activeFAQ.length > 0 && (
                        <button
                            onClick={handleCreate}
                            className="w-full py-2.5 rounded-lg border border-dashed border-purple-600/30 bg-purple-600/5 hover:bg-purple-600/10 text-purple-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar pregunta
                        </button>
                    )}
                </div>
            )}

            {/* Modal de confirmación para eliminar */}
            <ZenConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar pregunta"
                description={`¿Eliminar "${confirmDelete?.pregunta}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={saving === confirmDelete?.id}
            />
        </div>
    );
}
