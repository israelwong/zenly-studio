'use client';

import React, { useState } from 'react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Save, Check, Plus, X } from 'lucide-react';
import { IdentidadData } from '../types';
import { AvatarManager } from '@/components/shared/avatar';
import { actualizarIdentidadCompleta } from '@/lib/actions/studio/builder/identidad';
import { actualizarContacto } from '@/lib/actions/studio/builder/contacto';
import { toast } from 'sonner';

interface IdentidadSimplificadaProps {
    data: IdentidadData;
    onLocalUpdate: (data: Partial<IdentidadData>) => void;
    onLogoUpdate: (url: string) => Promise<void>;
    onLogoLocalUpdate: (url: string | null) => void;
    studioSlug: string;
    loading?: boolean;
}

export function IdentidadSimplificada({
    data,
    onLocalUpdate,
    onLogoUpdate,
    onLogoLocalUpdate,
    studioSlug,
    loading = false
}: IdentidadSimplificadaProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showPalabrasModal, setShowPalabrasModal] = useState(false);
    const [nuevaPalabra, setNuevaPalabra] = useState('');

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
                pagina_web: data.pagina_web || undefined,
                palabras_clave: Array.isArray(data.palabras_clave) ? data.palabras_clave.join(', ') : data.palabras_clave || '',
                descripcion: data.descripcion || undefined
            } as Parameters<typeof actualizarIdentidadCompleta>[1];

            await actualizarIdentidadCompleta(studioSlug, identidadData);

            // Guardar datos de contacto (dirección y google_maps_url)
            if (data.direccion !== undefined || data.google_maps_url !== undefined) {
                await actualizarContacto(studioSlug, {
                    descripcion: data.descripcion || '',
                    direccion: data.direccion || '',
                    google_maps_url: data.google_maps_url || ''
                });
            }

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
        <div className="space-y-6">
            {/* Información Básica con Logo */}
            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Columna 1: Logo - Izquierda */}
                        <div className="flex justify-center lg:justify-start flex-shrink-0 w-full lg:w-auto">
                            <div className="flex flex-col items-center gap-4">
                                <AvatarManager
                                    url={data.logo_url}
                                    onUpdate={async (url: string) => {
                                        await onLogoUpdate(url);
                                    }}
                                    onLocalUpdate={(url: string | null) => {
                                        onLogoLocalUpdate(url);
                                    }}
                                    studioSlug={studioSlug}
                                    category="identidad"
                                    subcategory="logos"
                                    size="lg"
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
                                <p className="text-xs text-zinc-400 text-center max-w-[250px]">
                                    PNG, SVG, JPG (máximo 5MB)
                                </p>
                            </div>
                        </div>

                        {/* Columna 2: Información Básica - Derecha */}
                        <div className="flex-1 w-full space-y-4">
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

                            {/* Slogan */}
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

                            {/* Website */}
                            <ZenInput
                                label="Página Web (Opcional)"
                                value={data.pagina_web || ''}
                                onChange={(e) => handleInputChange('pagina_web', e.target.value)}
                                placeholder="https://tuestudio.com"
                                disabled={loading}
                                hint="Tu sitio web principal"
                            />
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Información de Contacto */}
            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Información de Contacto
                    </h3>

                    <ZenTextarea
                        label="Descripción del Estudio"
                        value={data.descripcion || ''}
                        onChange={(e) => handleInputChange('descripcion', e.target.value)}
                        placeholder="Describe tu estudio, servicios y especialidades..."
                        rows={4}
                        disabled={loading}
                        hint="Esta descripción aparecerá en tu perfil público"
                    />

                    <ZenTextarea
                        label="Dirección"
                        value={data.direccion || ''}
                        onChange={(e) => handleInputChange('direccion', e.target.value)}
                        placeholder="Dirección completa de tu estudio"
                        rows={3}
                        disabled={loading}
                        hint="Dirección física de tu estudio"
                    />

                    <ZenInput
                        label="Enlace de Google Maps (Opcional)"
                        value={data.google_maps_url || ''}
                        onChange={(e) => handleInputChange('google_maps_url', e.target.value)}
                        placeholder="https://maps.google.com/..."
                        disabled={loading}
                        hint="Enlace directo a tu ubicación en Google Maps"
                    />
                </ZenCardContent>
            </ZenCard>

            {/* Palabras Clave */}
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

                        {(!data.palabras_clave || data.palabras_clave.length === 0) && (
                            <p className="text-sm text-zinc-500">
                                No hay palabras clave agregadas. Agrega palabras clave para mejorar el SEO.
                            </p>
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

            {/* Botón de Guardar */}
            <div className="flex justify-end pt-4">
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

