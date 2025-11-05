'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { HorariosSection } from './components/HorariosSection';
import { SectionLayout } from '../../components';
import { useParams } from 'next/navigation';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import { BuilderProfileData } from '@/types/builder-profile';

export default function HorariosPage() {
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
            const updateData = data as Partial<{ horarios: Array<{ id?: string; dia: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'; apertura: string; cierre: string; cerrado: boolean }> }>;

            if ('horarios' in updateData && updateData.horarios) {
                return {
                    ...prev,
                    contactInfo: {
                        ...prev.contactInfo,
                        horarios: updateData.horarios.map(horario => ({
                            id: horario.id || '',
                            dia: horario.dia,
                            apertura: horario.apertura,
                            cierre: horario.cierre,
                            cerrado: horario.cerrado,
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
        horarios: builderData.contactInfo.horarios?.map(h => ({
            dia: h.dia,
            apertura: h.apertura,
            cierre: h.cierre,
            cerrado: h.cerrado
        })) || []
    } : null;

    return (
        <SectionLayout section="contacto" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <HorariosSection
                horarios={builderData ? (builderData.contactInfo.horarios?.map(h => ({
                    id: h.id,
                    dia: h.dia as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
                    apertura: h.apertura,
                    cierre: h.cierre,
                    cerrado: h.cerrado
                })) || []) : []}
                onLocalUpdate={handleLocalUpdate}
                studioSlug={studioSlug}
                loading={loading}
            />
        </SectionLayout>
    );
}

