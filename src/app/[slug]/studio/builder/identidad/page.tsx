'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IdentidadEditorZen } from './components/';
import { SectionLayout } from '../components';
import { useParams } from 'next/navigation';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import { actualizarLogo } from '@/lib/actions/studio/builder/identidad';
import { IdentidadData } from './types';
import { BuilderProfileData, BuilderStudioProfile } from '@/types/builder-profile';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Image as ImageIcon } from 'lucide-react';

export default function IdentidadPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // ✅ UNA SOLA CONSULTA - Estrategia homologada con perfil público
                const result = await getBuilderProfileData(studioSlug);
                if (result.success && result.data) {
                    setBuilderData(result.data);
                } else {
                    console.error('Error loading builder data:', result.error);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studioSlug]);

    // Memoizar funciones para evitar re-renders
    const handleLocalUpdate = useCallback((data: unknown) => {
        setBuilderData((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            const updateData = data as Partial<IdentidadData>;

            // Mapear campos específicos de IdentidadData a BuilderStudioProfile
            const studioUpdate: Partial<BuilderStudioProfile> = {};

            if ('studio_name' in updateData) studioUpdate.studio_name = updateData.studio_name;
            if ('slogan' in updateData) studioUpdate.slogan = updateData.slogan;
            if ('descripcion' in updateData) studioUpdate.description = updateData.descripcion;
            if ('logo_url' in updateData) studioUpdate.logo_url = updateData.logo_url;
            if ('pagina_web' in updateData) studioUpdate.website = updateData.pagina_web;
            if ('palabras_clave' in updateData) {
                studioUpdate.keywords = Array.isArray(updateData.palabras_clave)
                    ? updateData.palabras_clave.join(', ')
                    : updateData.palabras_clave;
            }

            // Manejar redes sociales si están en updateData
            if ('redes_sociales' in updateData) {
                const redesSociales = updateData.redes_sociales as Array<{ plataforma: string, url: string }>;
                return {
                    ...prev,
                    studio: { ...prev.studio, ...studioUpdate },
                    socialNetworks: redesSociales.map((red, index) => ({
                        id: `temp-${index}`,
                        url: red.url,
                        platform: {
                            id: `temp-platform-${index}`,
                            name: red.plataforma,
                            icon: null
                        },
                        order: index
                    }))
                };
            }

            return {
                ...prev,
                studio: { ...prev.studio, ...studioUpdate }
            };
        });
    }, []);

    const handleLogoLocalUpdate = useCallback((url: string | null) => {
        setBuilderData((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            return {
                ...prev,
                studio: { ...prev.studio, logo_url: url }
            };
        });
    }, []);

    // ✅ Mapear datos para preview - Header y Footer necesitan estructura específica
    const previewData = builderData ? {
        // Para ProfileIdentity
        studio_name: builderData.studio.studio_name,
        slogan: builderData.studio.slogan,
        logo_url: builderData.studio.logo_url,
        // Para ProfileFooter
        pagina_web: builderData.studio.website,
        palabras_clave: builderData.studio.keywords,
        redes_sociales: builderData.socialNetworks.map(network => ({
            plataforma: network.platform?.name || '',
            url: network.url
        })),
        email: null, // No hay email en BuilderProfileData
        telefonos: builderData.contactInfo.phones.map(phone => ({
            numero: phone.number,
            tipo: phone.type === 'WHATSAPP' ? 'whatsapp' as const :
                phone.type === 'LLAMADAS' ? 'llamadas' as const : 'ambos' as const,
            is_active: true
        })),
        direccion: builderData.contactInfo.address,
        google_maps_url: builderData.studio.maps_url
    } : null;

    return (
        <SectionLayout section="identidad" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <ImageIcon className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Editor de Identidad</ZenCardTitle>
                            <ZenCardDescription>
                                Configura la información y elementos visuales
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    {loading ? (
                        <div className="space-y-6">
                            <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                            <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                            <div className="h-24 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                        </div>
                    ) : (
                        <IdentidadEditorZen
                            data={builderData?.studio ? {
                                id: builderData.studio.id,
                                studio_name: builderData.studio.studio_name,
                                slug: studioSlug,
                                slogan: builderData.studio.slogan,
                                descripcion: builderData.studio.description,
                                palabras_clave: builderData.studio.keywords ? builderData.studio.keywords.split(',').map(k => k.trim()) : [],
                                logo_url: builderData.studio.logo_url,
                                pagina_web: builderData.studio.website,
                            } : {
                                id: 'temp-id',
                                studio_name: 'Mi Estudio',
                                slug: studioSlug,
                                slogan: null,
                                descripcion: null,
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
                    )}
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
