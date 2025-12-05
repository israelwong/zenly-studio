'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { createFAQ, updateFAQ, deleteFAQ } from '@/lib/actions/studio/faq.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface FAQItem {
    id: string;
    pregunta: string;
    respuesta: string;
    orden: number;
    is_active: boolean;
}

interface FaqSectionEditableProps {
    faq: FAQItem[];
    studioSlug: string;
    isAuthenticated: boolean;
}

export function FaqSectionEditable({ faq, studioSlug, isAuthenticated }: FaqSectionEditableProps) {
    const router = useRouter();
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editData, setEditData] = useState({ pregunta: '', respuesta: '' });
    const [isSaving, setIsSaving] = useState(false);

    const activeFAQ = faq.filter(f => f.is_active);

    const toggleItem = (id: string) => {
        setOpenItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleCreate = () => {
        setIsCreating(true);
        setEditData({ pregunta: '', respuesta: '' });
    };

    const handleEdit = (faqItem: FAQItem) => {
        setEditingId(faqItem.id);
        setEditData({ pregunta: faqItem.pregunta, respuesta: faqItem.respuesta });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setIsCreating(false);
        setEditData({ pregunta: '', respuesta: '' });
    };

    const handleSave = async () => {
        if (!editData.pregunta.trim() || !editData.respuesta.trim()) {
            toast.error('Pregunta y respuesta son requeridas');
            return;
        }

        setIsSaving(true);
        try {
            if (isCreating) {
                const result = await createFAQ(studioSlug, editData);
                if (result.success) {
                    toast.success('FAQ creada');
                    handleCancelEdit();
                    router.refresh();
                } else {
                    toast.error(result.error || 'Error al crear');
                }
            } else if (editingId) {
                const result = await updateFAQ(editingId, studioSlug, editData);
                if (result.success) {
                    toast.success('FAQ actualizada');
                    handleCancelEdit();
                    router.refresh();
                } else {
                    toast.error(result.error || 'Error al actualizar');
                }
            }
        } catch (error) {
            toast.error('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (faqId: string) => {
        if (!confirm('¿Eliminar esta FAQ?')) return;

        try {
            const result = await deleteFAQ(faqId, studioSlug);
            if (result.success) {
                toast.success('FAQ eliminada');
                router.refresh();
            } else {
                toast.error(result.error || 'Error al eliminar');
            }
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    if (!activeFAQ.length && !isAuthenticated) {
        return (
            <div className="p-8 text-center">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    Sin preguntas frecuentes
                </h3>
                <p className="text-sm text-zinc-500">
                    Este estudio aún no tiene preguntas frecuentes configuradas
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">
                        Preguntas Frecuentes
                    </h3>
                </div>
                {isAuthenticated && !isCreating && (
                    <ZenButton
                        size="sm"
                        variant="outline"
                        onClick={handleCreate}
                        className="gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar
                    </ZenButton>
                )}
            </div>

            {/* Crear nueva FAQ */}
            {isCreating && (
                <div className="border border-emerald-500/50 rounded-lg bg-zinc-900/50 p-4 space-y-3">
                    <ZenInput
                        label="Pregunta"
                        value={editData.pregunta}
                        onChange={(e) => setEditData(prev => ({ ...prev, pregunta: e.target.value }))}
                        placeholder="¿Cuál es tu pregunta?"
                    />
                    <ZenTextarea
                        label="Respuesta"
                        value={editData.respuesta}
                        onChange={(e) => setEditData(prev => ({ ...prev, respuesta: e.target.value }))}
                        placeholder="Escribe la respuesta..."
                        rows={3}
                    />
                    <div className="flex gap-2">
                        <ZenButton
                            size="sm"
                            onClick={handleSave}
                            loading={isSaving}
                            disabled={isSaving}
                            className="gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Guardar
                        </ZenButton>
                        <ZenButton
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                        >
                            <X className="w-4 h-4" />
                        </ZenButton>
                    </div>
                </div>
            )}

            {/* Lista de FAQs */}
            <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
                <div className="space-y-0 divide-y divide-zinc-800">
                    {activeFAQ
                        .sort((a, b) => a.orden - b.orden)
                        .map((faqItem) => {
                            const isOpen = openItems.has(faqItem.id);
                            const isEditing = editingId === faqItem.id;

                            if (isEditing) {
                                return (
                                    <div key={faqItem.id} className="p-4 bg-zinc-800/30 space-y-3">
                                        <ZenInput
                                            label="Pregunta"
                                            value={editData.pregunta}
                                            onChange={(e) => setEditData(prev => ({ ...prev, pregunta: e.target.value }))}
                                        />
                                        <ZenTextarea
                                            label="Respuesta"
                                            value={editData.respuesta}
                                            onChange={(e) => setEditData(prev => ({ ...prev, respuesta: e.target.value }))}
                                            rows={3}
                                        />
                                        <div className="flex gap-2">
                                            <ZenButton
                                                size="sm"
                                                onClick={handleSave}
                                                loading={isSaving}
                                                disabled={isSaving}
                                                className="gap-2"
                                            >
                                                <Check className="w-4 h-4" />
                                                Guardar
                                            </ZenButton>
                                            <ZenButton
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                            >
                                                <X className="w-4 h-4" />
                                            </ZenButton>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={faqItem.id}>
                                    <div className="flex items-center gap-2 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                                        <button
                                            onClick={() => toggleItem(faqItem.id)}
                                            className="flex-1 text-left flex items-center justify-between gap-3 px-3 py-2"
                                        >
                                            <span className="font-medium text-white leading-relaxed text-sm">
                                                {faqItem.pregunta}
                                            </span>
                                            {isOpen ? (
                                                <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                                            )}
                                        </button>
                                        
                                        {isAuthenticated && (
                                            <div className="flex items-center gap-1 pr-2">
                                                <button
                                                    onClick={() => handleEdit(faqItem)}
                                                    className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-3.5 h-3.5 text-zinc-400" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(faqItem.id)}
                                                    className="p-1.5 hover:bg-red-950/50 rounded transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {isOpen && (
                                        <div className="px-3 pb-2 border-t border-zinc-800 bg-zinc-900/30">
                                            <p className="text-zinc-300 leading-relaxed text-sm pt-2">
                                                {faqItem.respuesta}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
