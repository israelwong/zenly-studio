'use client';

import React, { useState } from 'react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Save, Check, Plus, X } from 'lucide-react';
import { IdentidadData } from '../types';
import { AvatarManager } from '@/components/shared/avatar';
import { actualizarIdentidadCompleta } from '@/lib/actions/studio/profile/identidad';
import { useLogoRefresh } from '@/hooks/useLogoRefresh';
import { toast } from 'sonner';

interface IdentidadFormProps {
    data: IdentidadData;
    onLocalUpdate: (data: Partial<IdentidadData>) => void;
    onLogoUpdate: (url: string) => Promise<void>;
    onLogoLocalUpdate: (url: string | null) => void;
    studioSlug: string;
    loading?: boolean;
}

export function IdentidadForm({
    data,
    onLocalUpdate,
    onLogoUpdate,
    onLogoLocalUpdate,
    studioSlug,
    loading = false
}: IdentidadFormProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showPalabrasModal, setShowPalabrasModal] = useState(false);
    const [nuevaPalabra, setNuevaPalabra] = useState('');
    const { triggerRefresh } = useLogoRefresh();

    const handleInputChange = (field: keyof IdentidadData, value: string) => {
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

    const handleSave = async () => {
        if (isSaving) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            // Guardar datos de identidad
            const identidadData = {
                nombre: data.studio_name || '',
                slogan: data.slogan || undefined,
                logo_url: data.logo_url || undefined,
                palabras_clave: Array.isArray(data.palabras_clave) ? data.palabras_clave.join(', ') : data.palabras_clave || '',
                presentacion: data.presentacion || undefined
            } as Parameters<typeof actualizarIdentidadCompleta>[1];

            await actualizarIdentidadCompleta(studioSlug, identidadData);

            setSaveSuccess(true);
            toast.success('Identidad guardada correctamente');

            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Error saving identidad:', error);
            toast.error('Error al guardar la identidad. Inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-zinc-700 rounded-lg mb-4"></div>
                    <div className="h-12 bg-zinc-700 rounded-lg mb-4"></div>
                    <div className="h-20 bg-zinc-700 rounded-lg mb-4"></div>
                    <div className="h-12 bg-zinc-700 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Información Básica sin ficha */}
            <div>
                {/* Logo centrado arriba, más compacto */}
                <div className="flex justify-center mb-8">
                    <div className="flex flex-col items-center gap-3">
                        <AvatarManager
                            url={data.logo_url}
                            onUpdate={async (url: string) => {
                                await onLogoUpdate(url);
                                try {
                                    const identidadData = {
                                        nombre: data.studio_name || '',
                                        slogan: data.slogan || undefined,
                                        logo_url: url,
                                        palabras_clave: Array.isArray(data.palabras_clave) ? data.palabras_clave.join(', ') : data.palabras_clave || '',
                                        presentacion: data.presentacion || undefined
                                    };
                                    await actualizarIdentidadCompleta(studioSlug, identidadData);
                                } catch (error) {
                                    console.error('Error saving identidad after logo update:', error);
                                }
                                triggerRefresh();
                            }}
                            onLocalUpdate={(url: string | null) => {
                                onLogoLocalUpdate(url);
                            }}
                            studioSlug={studioSlug}
                            category="identidad"
                            subcategory="logos"
                            size="md"
                            variant="default"
                            loading={loading}
                            cropTitle="Ajustar logo del estudio"
                            cropDescription="Arrastra y redimensiona el área circular para ajustar tu logo."
                            cropInstructions={[
                                "• Arrastra para mover el área de recorte",
                                "• Usa las esquinas para redimensionar",
                                "• El área circular será tu logo del estudio"
                            ]}
                            successMessage="Logo actualizado exitosamente"
                            deleteMessage="Logo eliminado"
                            showAdjustButton={true}
                        />
                        <p className="text-xs text-zinc-400 text-center">
                            PNG, JPG, SVG hasta 10MB
                        </p>
                    </div>
                </div>

                {/* Campos en columna única con mejor espaciado */}
                <div className="space-y-6 max-w-2xl mx-auto">
                    {/* Nombre del estudio */}
                    <ZenInput
                        label="Nombre del Estudio"
                        required
                        value={data.studio_name || ''}
                        onChange={(e) => handleInputChange('studio_name', e.target.value)}
                        placeholder="Ej: Studio Fotografía María"
                        disabled={loading}
                        hint="Este nombre aparecerá en tu perfil público"
                    />

                    {/* Slogan - textarea compacto */}
                    <ZenTextarea
                        label="Slogan"
                        value={data.slogan || ''}
                        onChange={(e) => handleInputChange('slogan', e.target.value)}
                        placeholder="Ej: Capturando momentos únicos"
                        disabled={loading}
                        maxLength={100}
                        hint="Frase corta que describe tu estudio (máximo 100 caracteres)"
                        rows={2}
                    />

                    {/* Presentación del Estudio */}
                    <ZenTextarea
                        label="Presentación del Estudio"
                        value={data.presentacion || ''}
                        onChange={(e) => handleInputChange('presentacion', e.target.value)}
                        placeholder="Describe tu estudio, servicios y especialidades..."
                        rows={5}
                        disabled={loading}
                        hint="Esta presentación aparecerá en tu perfil público"
                    />
                </div>
            </div>

            {/* Ficha: Palabras Clave */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <ZenCardTitle>Palabras Clave SEO</ZenCardTitle>
                        <ZenButton
                            size="sm"
                            variant="outline"
                            onClick={() => setShowPalabrasModal(true)}
                            disabled={loading}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar
                        </ZenButton>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-8">
                    <div className="max-w-2xl mx-auto">
                        {/* Lista de palabras clave */}
                        {data.palabras_clave && data.palabras_clave.length > 0 ? (
                            <div className="flex flex-wrap gap-2.5">
                                {data.palabras_clave.map((palabra, index) => (
                                    <div key={index} className="inline-flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 px-3 py-1.5 rounded-lg text-sm">
                                        <span>{palabra}</span>
                                        <button
                                            onClick={() => handleRemovePalabra(palabra)}
                                            className="text-zinc-400 hover:text-red-400 transition-colors"
                                            disabled={loading}
                                            type="button"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500">
                                No hay palabras clave agregadas. Agrega palabras clave para mejorar el SEO.
                            </p>
                        )}
                    </div>

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
                                <div className="flex gap-3 mt-6">
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
                </ZenCardContent>
            </ZenCard>

            {/* Botón de Guardar */}
            <div className="flex justify-end pt-2">
                <ZenButton
                    onClick={handleSave}
                    disabled={loading || isSaving}
                    loading={isSaving}
                    loadingText="Guardando..."
                    variant="primary"
                    size="md"
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
    );
}

