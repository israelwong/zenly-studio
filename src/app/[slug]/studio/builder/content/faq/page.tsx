'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FAQSection } from './components/FAQSection';
import { SectionLayout } from '../../components';
import { useParams } from 'next/navigation';
import { getBuilderData } from '@/lib/actions/studio/builder/builder-data.actions';
import { IdentidadData } from '../../profile/identidad/types';
import { BuilderProfileData } from '@/types/builder-profile';

export default function FAQPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const result = await getBuilderData(studioSlug);
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

            // Manejar FAQ si están en updateData
            if ('faq' in updateData) {
                const faqData = updateData.faq as Array<{ id: string, pregunta: string, respuesta: string, orden: number, is_active: boolean }>;
                return {
                    ...prev,
                    faq: faqData
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
        faq: builderData.faq
    } : null;

    return (
        <SectionLayout section="identidad" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <FAQSection
                studioSlug={studioSlug}
                onLocalUpdate={handleLocalUpdate}
                loading={loading}
            />
        </SectionLayout>
    );
}

