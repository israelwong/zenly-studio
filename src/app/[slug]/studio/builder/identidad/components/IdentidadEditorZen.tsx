'use client';

import React, { useState } from 'react';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { IdentidadData } from '../types';
import { SocialSection } from './SocialSection';
import { HeaderSection } from './HeaderSection';
import { FooterSection } from './FooterSection';
import { FAQSection } from './FAQSection';
import { actualizarIdentidadCompleta } from '@/lib/actions/studio/builder/identidad';
import { useHashNavigation } from '@/hooks/useHashNavigation';
import { toast } from 'sonner';

interface IdentidadEditorZenProps {
    data: IdentidadData;
    onLocalUpdate: (data: Partial<IdentidadData>) => void;
    onLogoUpdate: (url: string) => Promise<void>;
    onLogoLocalUpdate: (url: string | null) => void;
    studioSlug: string;
    loading?: boolean;
}

export function IdentidadEditorZen({
    data,
    onLocalUpdate,
    onLogoUpdate,
    onLogoLocalUpdate,
    studioSlug,
    loading = false
}: IdentidadEditorZenProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const tabs = [
        { id: 'encabezado', hash: 'header' },
        { id: 'redes', hash: 'social' },
        { id: 'faq', hash: 'faq' },
        { id: 'footer', hash: 'footer' }
    ];

    // Hook para manejar navegación por hash
    const { activeTab, handleTabChange } = useHashNavigation(tabs, 'encabezado');


    const handleSave = async () => {
        if (isSaving) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const updateData = {
                nombre: data.studio_name || '',
                slogan: data.slogan || undefined,
                logo_url: data.logo_url || undefined,
                pagina_web: data.pagina_web || undefined,
                palabras_clave: Array.isArray(data.palabras_clave) ? data.palabras_clave.join(', ') : data.palabras_clave || ''
            } as Parameters<typeof actualizarIdentidadCompleta>[1];

            await actualizarIdentidadCompleta(studioSlug, updateData);

            setSaveSuccess(true);
            toast.success('Identidad guardada correctamente');

            // Reset success state after 2 seconds
            setTimeout(() => setSaveSuccess(false), 2000);

        } catch (error) {
            console.error('Error saving identidad:', error);
            toast.error('Error al guardar la identidad. Inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    const tabLabels = {
        'encabezado': 'Header',
        'redes': 'Social',
        'faq': 'FAQ',
        'footer': 'Footer'
    };

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="bg-zinc-800/50 p-1 rounded-lg flex gap-1 w-full">
                {tabs.map((tab) => {
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex-1 py-2 px-4 font-medium text-sm transition-all duration-200 rounded text-center ${activeTab === tab.id
                                ? 'bg-zinc-900 text-blue-400 shadow-lg'
                                : 'text-zinc-400 hover:text-zinc-300'
                                }`}
                        >
                            {tabLabels[tab.id as keyof typeof tabLabels]}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'encabezado' && (
                    <HeaderSection
                        data={data}
                        onLocalUpdate={onLocalUpdate}
                        onLogoUpdate={onLogoUpdate}
                        onLogoLocalUpdate={onLogoLocalUpdate}
                        studioSlug={studioSlug}
                        loading={loading}
                        onSave={handleSave}
                        isSaving={isSaving}
                        saveSuccess={saveSuccess}
                    />
                )}

                {activeTab === 'redes' && (
                    <ZenCard variant="default" padding="none">
                        <ZenCardContent className="p-6">
                            <SocialSection
                                studioSlug={studioSlug}
                                onLocalUpdate={onLocalUpdate}
                            />
                        </ZenCardContent>
                    </ZenCard>
                )}

                {activeTab === 'faq' && (
                    <FAQSection
                        data={data}
                        onLocalUpdate={onLocalUpdate}
                        loading={loading}
                        onSave={handleSave}
                        isSaving={isSaving}
                        saveSuccess={saveSuccess}
                        studioSlug={studioSlug}
                    />
                )}

                {activeTab === 'footer' && (
                    <FooterSection
                        data={data}
                        onLocalUpdate={onLocalUpdate}
                        loading={loading}
                        onSave={handleSave}
                        isSaving={isSaving}
                        saveSuccess={saveSuccess}
                    />
                )}
            </div>
        </div>
    );
}
