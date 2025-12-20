'use client';

import React, { useState } from 'react';
import { ZenButton, ZenInput, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { X, Plus } from 'lucide-react';

export interface ZenTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTag: (tag: string) => void;
    existingTags: string[];
    maxTags?: number;
}

export function ZenTagModal({
    isOpen,
    onClose,
    onAddTag,
    existingTags,
    maxTags = 10
}: ZenTagModalProps) {
    const [newTag, setNewTag] = useState('');
    const [error, setError] = useState('');

    const handleAddTag = () => {
        const trimmedTag = newTag.trim().toLowerCase();
        
        // Validaciones
        if (!trimmedTag) {
            setError('La palabra clave no puede estar vacía');
            return;
        }
        
        if (trimmedTag.length < 2) {
            setError('La palabra clave debe tener al menos 2 caracteres');
            return;
        }
        
        if (trimmedTag.length > 20) {
            setError('La palabra clave no puede tener más de 20 caracteres');
            return;
        }
        
        if (existingTags.includes(trimmedTag)) {
            setError('Esta palabra clave ya existe');
            return;
        }
        
        if (existingTags.length >= maxTags) {
            setError(`No puedes agregar más de ${maxTags} palabras clave`);
            return;
        }

        // Agregar tag
        onAddTag(trimmedTag);
        setNewTag('');
        setError('');
        onClose();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-md mx-4">
                <ZenCard className="border-0 shadow-none">
                    <ZenCardHeader>
                        <div className="flex items-center justify-between">
                            <ZenCardTitle className="text-lg">
                                Agregar Palabra Clave
                            </ZenCardTitle>
                            <button
                                onClick={onClose}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </ZenCardHeader>
                    
                    <ZenCardContent className="space-y-4">
                        <div>
                            <ZenInput
                                label="Palabra Clave"
                                value={newTag}
                                onChange={(e) => {
                                    setNewTag(e.target.value);
                                    setError('');
                                }}
                                onKeyPress={handleKeyPress}
                                placeholder="Ej: fotografía, bodas, eventos..."
                                maxLength={20}
                            />
                            
                            {error && (
                                <p className="text-red-400 text-sm mt-1">{error}</p>
                            )}
                            
                            <p className="text-xs text-zinc-400 mt-1">
                                {existingTags.length}/{maxTags} palabras clave utilizadas
                            </p>
                        </div>

                        {/* Tags existentes */}
                        {existingTags.length > 0 && (
                            <div>
                                <p className="text-sm text-zinc-300 mb-2">Palabras clave existentes:</p>
                                <div className="flex flex-wrap gap-2">
                                    {existingTags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Botones */}
                        <div className="flex gap-3 pt-4">
                            <ZenButton
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancelar
                            </ZenButton>
                            <ZenButton
                                onClick={handleAddTag}
                                className="flex-1"
                                disabled={!newTag.trim()}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar
                            </ZenButton>
                        </div>
                    </ZenCardContent>
                </ZenCard>
            </div>
        </div>
    );
}
