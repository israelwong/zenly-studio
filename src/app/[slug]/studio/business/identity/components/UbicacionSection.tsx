'use client';

import React, { useState } from 'react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Save, Check, MapPin } from 'lucide-react';
import { UbicacionData } from '../types';
import { actualizarUbicacion } from '@/lib/actions/studio/profile/ubicacion';
import { toast } from 'sonner';

interface UbicacionSectionProps {
    ubicacion?: UbicacionData | null;
    onLocalUpdate?: (data: Partial<UbicacionData>) => void;
    studioSlug: string;
    loading?: boolean;
    onDataChange?: () => Promise<void>;
}

export function UbicacionSection({
    ubicacion: data,
    onLocalUpdate,
    studioSlug,
    loading = false,
    onDataChange
}: UbicacionSectionProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Asegurar que data tenga valores por defecto
    const ubicacionData = data || { direccion: '', google_maps_url: '' };

    const handleInputChange = (field: keyof UbicacionData, value: string) => {
        onLocalUpdate?.({ [field]: value });
    };

    const handleSave = async () => {
        if (isSaving) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const resultado = await actualizarUbicacion(studioSlug, {
                direccion: ubicacionData.direccion || undefined,
                google_maps_url: ubicacionData.google_maps_url || undefined,
            });

            if (resultado.success) {
                setSaveSuccess(true);
                toast.success('Ubicación guardada correctamente');
                await onDataChange?.();
                setTimeout(() => setSaveSuccess(false), 2000);
            } else {
                throw new Error(resultado.error || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error saving ubicacion:', error);
            toast.error('Error al guardar la ubicación. Inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-24 bg-zinc-700 rounded-lg mb-4"></div>
                    <div className="h-12 bg-zinc-700 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">
                            Ubicación del Estudio
                        </h3>
                    </div>

                    <ZenTextarea
                        label="Dirección"
                        value={ubicacionData.direccion || ''}
                        onChange={(e) => handleInputChange('direccion', e.target.value)}
                        placeholder="Dirección completa de tu estudio"
                        rows={3}
                        disabled={loading}
                        hint="Dirección física de tu estudio"
                    />

                    <ZenInput
                        label="Enlace de Google Maps (Opcional)"
                        value={ubicacionData.google_maps_url || ''}
                        onChange={(e) => handleInputChange('google_maps_url', e.target.value)}
                        placeholder="https://maps.google.com/..."
                        disabled={loading}
                        hint="Enlace directo a tu ubicación en Google Maps"
                    />

                    {ubicacionData.google_maps_url && (
                        <div className="mt-2">
                            <a
                                href={ubicacionData.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-400 hover:text-blue-300 underline"
                            >
                                Abrir en Google Maps
                            </a>
                        </div>
                    )}
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

