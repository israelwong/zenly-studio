'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ZonasTrabajoSection } from './components/ZonasTrabajoSection';
import { SectionLayout } from '../../components';
import { useParams } from 'next/navigation';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import { BuilderProfileData } from '@/types/builder-profile';

export default function ZonasTrabajoPage() {
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
            const updateData = data as Partial<{ zonas_trabajo: Array<{ id?: string; nombre: string; orden?: number }> }>;

            if ('zonas_trabajo' in updateData && updateData.zonas_trabajo) {
                return {
                    ...prev,
                    studio: {
                        ...prev.studio,
                        zonas_trabajo: updateData.zonas_trabajo.map(zona => ({
                            id: zona.id || '',
                            nombre: zona.nombre,
                            orden: zona.orden || 0
                        }))
                    }
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
        telefonos: builderData.contactInfo.phones.map(phone => ({
            numero: phone.number,
            tipo: phone.type === 'WHATSAPP' ? 'whatsapp' as const :
                phone.type === 'LLAMADAS' ? 'llamadas' as const : 'ambos' as const,
            etiqueta: phone.label || undefined,
            is_active: phone.is_active
        })),
        direccion: builderData.contactInfo.address,
        google_maps_url: builderData.studio.maps_url,
        zonas_trabajo: builderData.studio.zonas_trabajo || []
    } : null;

    return (
        <SectionLayout section="contacto" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <ZonasTrabajoSection
                studioId={builderData ? builderData.studio.id : 'temp-id'}
                zonas={builderData ? (builderData.studio.zonas_trabajo?.map(z => ({
                    id: z.id,
                    nombre: z.nombre,
                    orden: z.orden
                })) || []) : []}
                onLocalUpdate={handleLocalUpdate}
                loading={loading}
            />
        </SectionLayout>
    );
}

