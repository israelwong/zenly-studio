'use client';

import React from 'react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Save, Check } from 'lucide-react';
import { IdentidadData } from '../types';
import { LogoManagerZen } from './LogoManagerZen';

interface HeaderSectionProps {
    data: IdentidadData;
    onLocalUpdate: (data: Partial<IdentidadData>) => void;
    onLogoUpdate: (url: string) => Promise<void>;
    onLogoLocalUpdate: (url: string | null) => void;
    studioSlug: string;
    loading?: boolean;
    onSave: () => Promise<void>;
    isSaving: boolean;
    saveSuccess: boolean;
}

export function HeaderSection({
    data,
    onLocalUpdate,
    onLogoUpdate,
    onLogoLocalUpdate,
    studioSlug,
    loading = false,
    onSave,
    isSaving,
    saveSuccess
}: HeaderSectionProps) {
    const handleInputChange = (field: keyof IdentidadData, value: string) => {
        console.log('🔄 handleInputChange:', field, value);
        onLocalUpdate({ [field]: value });
    };

    if (loading) {
        return (
            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6 space-y-4">
                    <div className="animate-pulse">
                        <div className="h-32 bg-zinc-700 rounded-lg mb-4"></div>
                        <div className="h-12 bg-zinc-700 rounded-lg mb-4"></div>
                        <div className="h-20 bg-zinc-700 rounded-lg"></div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        );
    }

    return (
        <ZenCard variant="default" padding="none">
            <ZenCardContent className="p-6 space-y-4">
                {/* Ficha de Logo */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Logo Principal
                    </h3>
                    <LogoManagerZen
                        tipo="logo"
                        url={data.logo_url}
                        onUpdate={async (url: string) => {
                            await onLogoUpdate(url);
                        }}
                        onLocalUpdate={(url: string | null) => {
                            onLogoLocalUpdate(url);
                        }}
                        studioSlug={studioSlug}
                    />
                </div>

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
    );
}
