'use client';

import React, { useCallback } from 'react';
import { IdentidadForm } from '../components/IdentidadForm';
import { actualizarLogo } from '@/lib/actions/studio/profile/identidad';
import { IdentidadData } from '../types';
import { BuilderProfileData, BuilderStudioProfile } from '@/types/builder-profile';

interface BrandTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onUpdate: (data: BuilderProfileData | null) => void;
    onDataChange?: () => Promise<void>;
}

export function BrandTab({ builderData, loading, studioSlug, onUpdate }: BrandTabProps) {
    
    const handleLocalUpdate = useCallback((data: unknown) => {
        onUpdate((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            const updateData = data as Partial<IdentidadData>;

            const studioUpdate: Partial<BuilderStudioProfile> = {};

            if ('studio_name' in updateData) studioUpdate.studio_name = updateData.studio_name;
            if ('slogan' in updateData) studioUpdate.slogan = updateData.slogan;
            if ('presentacion' in updateData) studioUpdate.presentation = updateData.presentacion;
            if ('logo_url' in updateData) studioUpdate.logo_url = updateData.logo_url;
            if ('pagina_web' in updateData) studioUpdate.website = updateData.pagina_web;
            if ('palabras_clave' in updateData) {
                studioUpdate.keywords = Array.isArray(updateData.palabras_clave)
                    ? updateData.palabras_clave.join(', ')
                    : updateData.palabras_clave;
            }

            return {
                ...prev,
                studio: { ...prev.studio, ...studioUpdate },
            };
        });
    }, [onUpdate]);

    const handleLogoLocalUpdate = useCallback((url: string | null) => {
        onUpdate((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            return {
                ...prev,
                studio: { ...prev.studio, logo_url: url }
            };
        });
    }, [onUpdate]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-24 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    return (
        <IdentidadForm
            data={builderData?.studio ? {
                id: builderData.studio.id,
                studio_name: builderData.studio.studio_name,
                slug: studioSlug,
                slogan: builderData.studio.slogan,
                presentacion: builderData.studio.presentation,
                palabras_clave: builderData.studio.keywords ? builderData.studio.keywords.split(',').map(k => k.trim()) : [],
                logo_url: builderData.studio.logo_url,
                pagina_web: builderData.studio.website,
            } : {
                id: 'temp-id',
                studio_name: 'Mi Estudio',
                slug: studioSlug,
                slogan: null,
                presentacion: null,
                palabras_clave: [],
                logo_url: null,
                pagina_web: null,
            }}
            onLocalUpdate={handleLocalUpdate}
            onLogoUpdate={async (url: string) => {
                try {
                    await actualizarLogo(studioSlug, { tipo: 'logo', url });
                } catch (error) {
                    console.error('Error updating logo:', error);
                }
            }}
            onLogoLocalUpdate={handleLogoLocalUpdate}
            studioSlug={studioSlug}
        />
    );
}
