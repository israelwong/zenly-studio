'use client';

import React, { useState } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Plus, X, Save, Check } from 'lucide-react';
import { IdentidadData } from '../types';

interface FooterSectionProps {
    data: IdentidadData;
    onLocalUpdate: (data: Partial<IdentidadData>) => void;
    loading?: boolean;
    onSave: () => Promise<void>;
    isSaving: boolean;
    saveSuccess: boolean;
}

export function FooterSection({
    data,
    onLocalUpdate,
    loading = false,
    onSave,
    isSaving,
    saveSuccess
}: FooterSectionProps) {
    const [showPalabrasModal, setShowPalabrasModal] = useState(false);
    const [nuevaPalabra, setNuevaPalabra] = useState('');

    const handleInputChange = (field: keyof IdentidadData, value: string) => {
        console.log('🔄 handleInputChange:', field, value);
        onLocalUpdate({ [field]: value });
    };

    const handleAddPalabra = () => {
        if (nuevaPalabra.trim() && !data.palabras_clave?.includes(nuevaPalabra.trim())) {
            const nuevasPalabras = [...(data.palabras_clave || []), nuevaPalabra.trim()];
            onLocalUpdate({ palabras_clave: nuevasPalabras });
            setNuevaPalabra('');
            setShowPalabrasModal(false);
        }
    };

    const handleRemovePalabra = (palabra: string) => {
        const nuevasPalabras = data.palabras_clave?.filter(p => p !== palabra) || [];
        onLocalUpdate({ palabras_clave: nuevasPalabras });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-zinc-700 rounded-lg mb-4"></div>
                    <div className="h-24 bg-zinc-700 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Ficha 1: Palabras Clave SEO */}
            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-white">
                                Palabras Clave SEO
                            </label>
                            <ZenButton
                                size="sm"
                                variant="outline"
                                onClick={() => setShowPalabrasModal(true)}
                                disabled={loading}
                                className="text-xs px-2 py-1"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Agregar
                            </ZenButton>
                        </div>

                        {/* Lista de palabras clave */}
                        {data.palabras_clave && data.palabras_clave.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {data.palabras_clave.map((palabra, index) => (
                                    <div key={index} className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm">
                                        <span>{palabra}</span>
                                        <button
                                            onClick={() => handleRemovePalabra(palabra)}
                                            className="text-zinc-400 hover:text-red-400 transition-colors ml-1"
                                            disabled={loading}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Modal para agregar palabra */}
                        {showPalabrasModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md mx-4">
                                    <h3 className="text-lg font-semibold text-white mb-4">
                                        Agregar Palabra Clave
                                    </h3>
                                    <ZenInput
                                        label="Palabra Clave"
                                        value={nuevaPalabra}
                                        onChange={(e) => setNuevaPalabra(e.target.value)}
                                        placeholder="Ej: fotografía, eventos, retratos"
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddPalabra()}
                                    />
                                    <div className="flex gap-3 mt-4">
                                        <ZenButton
                                            onClick={handleAddPalabra}
                                            disabled={!nuevaPalabra.trim()}
                                            size="sm"
                                        >
                                            Agregar
                                        </ZenButton>
                                        <ZenButton
                                            variant="outline"
                                            onClick={() => {
                                                setShowPalabrasModal(false);
                                                setNuevaPalabra('');
                                            }}
                                            size="sm"
                                        >
                                            Cancelar
                                        </ZenButton>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Ficha 2: Página Web y Botón de Guardar */}
            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6 space-y-4">
                    <ZenInput
                        label="Página Web (Opcional)"
                        value={data.pagina_web || ''}
                        onChange={(e) => handleInputChange('pagina_web', e.target.value)}
                        placeholder="https://tuestudio.com"
                        disabled={loading}
                        hint="Tu sitio web principal"
                    />

                    {/* Botón de Guardar */}
                    <div className="pt-4">
                        <div className="flex justify-end">
                            <ZenButton
                                onClick={onSave}
                                disabled={loading || isSaving}
                                loading={isSaving}
                                loadingText="Guardando..."
                                variant="primary"
                                size="sm"
                            >
                                {saveSuccess ? (
                                    <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Guardado
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </>
                                )}
                            </ZenButton>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
