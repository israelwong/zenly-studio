'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { SocialSection } from './components/SocialSection';
import { SectionLayout } from '../../components';
import { useParams } from 'next/navigation';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import { IdentidadData } from '../identidad/types';
import { BuilderProfileData } from '@/types/builder-profile';

export default function RedesSocialesPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
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

    // Memoizar función para actualizar datos locales
    const handleLocalUpdate = useCallback((data: unknown) => {
        setBuilderData((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            const updateData = data as Partial<IdentidadData>;

            // Manejar redes sociales si están en updateData
            if ('redes_sociales' in updateData) {
                const redesSociales = updateData.redes_sociales as Array<{ plataforma: string, url: string }>;
                return {
                    ...prev,
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

            return prev;
        });
    }, []);

    // ✅ Mapear datos para preview
    const previewData = builderData ? {
        studio_name: builderData.studio.studio_name,
        slogan: builderData.studio.slogan,
        logo_url: builderData.studio.logo_url,
        pagina_web: builderData.studio.website,
        palabras_clave: builderData.studio.keywords,
        redes_sociales: builderData.socialNetworks.map(network => ({
            plataforma: network.platform?.name || '',
            url: network.url
        })),
    } : null;

    return (
        <SectionLayout section="identidad" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <SocialSection
                studioSlug={studioSlug}
                onLocalUpdate={handleLocalUpdate}
                loading={loading}
            />
        </SectionLayout>
    );
}

