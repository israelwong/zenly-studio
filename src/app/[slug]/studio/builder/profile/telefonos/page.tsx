'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TelefonosSection } from './components/TelefonosSection';
import { SectionLayout } from '../../components';
import { useParams } from 'next/navigation';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import { BuilderProfileData } from '@/types/builder-profile';

export default function TelefonosPage() {
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
            const updateData = data as Partial<{ telefonos: Array<{ id?: string; numero: string; tipo: 'llamadas' | 'whatsapp' | 'ambos'; etiqueta?: string; is_active?: boolean }> }>;

            if ('telefonos' in updateData && updateData.telefonos) {
                return {
                    ...prev,
                    contactInfo: {
                        ...prev.contactInfo,
                        phones: updateData.telefonos.map(phone => ({
                            id: phone.id || '',
                            number: phone.numero,
                            type: phone.tipo === 'whatsapp' ? 'WHATSAPP' :
                                phone.tipo === 'llamadas' ? 'LLAMADAS' : 'AMBOS',
                            label: phone.etiqueta || null,
                            is_active: phone.is_active !== undefined ? phone.is_active : true
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
    } : null;

    return (
        <SectionLayout section="contacto" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <TelefonosSection
                telefonos={builderData ? builderData.contactInfo.phones.map(phone => ({
                    id: phone.id,
                    numero: phone.number,
                    tipo: (phone.type === 'WHATSAPP' ? 'whatsapp' :
                        phone.type === 'LLAMADAS' ? 'llamadas' : 'ambos') as 'llamadas' | 'whatsapp' | 'ambos',
                    etiqueta: phone.label || undefined,
                    is_active: phone.is_active
                })) : []}
                onLocalUpdate={handleLocalUpdate}
                studioSlug={studioSlug}
                loading={loading}
            />
        </SectionLayout>
    );
}

