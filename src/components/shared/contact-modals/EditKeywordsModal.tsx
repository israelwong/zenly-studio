'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Hash, Loader2, X } from 'lucide-react';
import { actualizarPalabrasClave } from '@/lib/actions/studio/profile/identidad';
import { toast } from 'sonner';

interface EditKeywordsModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    currentValue?: string | string[] | null;
    onSuccess?: () => void;
}

export function EditKeywordsModal({
    isOpen,
    onClose,
    studioSlug,
    currentValue,
    onSuccess
}: EditKeywordsModalProps) {
    const [keywords, setKeywords] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && currentValue) {
            // Parse keywords from string or array
            const keywordsArray = Array.isArray(currentValue)
                ? currentValue
                : typeof currentValue === 'string'
                    ? currentValue.split(',').map(k => k.trim()).filter(k => k)
                    : [];
            setKeywords(keywordsArray);
        } else if (isOpen) {
            setKeywords([]);
        }
        setInputValue('');
    }, [currentValue, isOpen]);

    const handleAddKeyword = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        if (keywords.includes(trimmed)) {
            toast.error('Esta palabra clave ya existe');
            return;
        }

        if (keywords.length >= 10) {
            toast.error('Máximo 10 palabras clave');
            return;
        }

        setKeywords([...keywords, trimmed]);
        setInputValue('');
    };

    const handleRemoveKeyword = (index: number) => {
        setKeywords(keywords.filter((_, i) => i !== index));
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddKeyword();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            await actualizarPalabrasClave(studioSlug, keywords);
            toast.success('Palabras clave actualizadas');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error updating keywords:', error);
            toast.error('Error al actualizar palabras clave');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-zinc-100">
                        <Hash className="h-5 w-5 text-emerald-400" />
                        Editar Palabras Clave
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <ZenInput
                                    label="Agregar palabra clave"
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ej: fotografía, bodas, eventos"
                                    disabled={keywords.length >= 10}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddKeyword}
                                disabled={!inputValue.trim() || keywords.length >= 10}
                                className="mt-7 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                            >
                                Agregar
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                            {keywords.length}/10 palabras clave • Presiona Enter para agregar rápido
                        </p>

                        {/* Keywords list */}
                        {keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                {keywords.map((keyword, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-full transition-colors group"
                                    >
                                        <Hash className="w-3 h-3 text-zinc-400" />
                                        {keyword}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveKeyword(index)}
                                            className="ml-1 p-0.5 hover:bg-zinc-500 rounded-full transition-colors"
                                            aria-label={`Eliminar ${keyword}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            type="submit"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar'
                            )}
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
