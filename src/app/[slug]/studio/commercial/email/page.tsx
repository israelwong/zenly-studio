'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { SectionLayout, StorageIndicator } from '../../components';
import { EmailWrapper } from './components';
import { getBuilderData } from '@/lib/actions/studio/builder-data.actions';
import type { BuilderProfileData } from '@/types/builder-profile';

export default function EmailPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [loading, setLoading] = useState(true);
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);

    useEffect(() => {
        const loadBuilderData = async () => {
            try {
                setLoading(true);
                const result = await getBuilderData(studioSlug);

                if (result.success && result.data) {
                    setBuilderData(result.data);
                } else {
                    console.error('Error loading builder data:', result.error);
                }
            } catch (error) {
                console.error('Error in loadBuilderData:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBuilderData();
    }, [studioSlug]);

    const previewData = builderData ? {
        studio_name: builderData.studio.studio_name,
        logo_url: builderData.studio.logo_url,
        slogan: builderData.studio.slogan,
        studio: builderData.studio,
        items: builderData.items,
        paquetes: builderData.paquetes,
        pagina_web: builderData.studio.website,
        palabras_clave: builderData.studio.keywords,
        redes_sociales: builderData.socialNetworks.map(network => ({
            plataforma: network.platform?.name || 'Red Social',
            url: network.url
        })),
        email: null,
        telefonos: builderData.contactInfo.phones.map(phone => ({
            numero: phone.number,
            tipo: phone.type === 'principal' ? 'ambos' as const :
                phone.type === 'whatsapp' ? 'whatsapp' as const : 'llamadas' as const,
            is_active: true
        })),
        direccion: builderData.contactInfo.address,
        google_maps_url: builderData.studio.maps_url
    } : null;

    return (
        <SectionLayout
            section="email"
            studioSlug={studioSlug}
            data={previewData as unknown as Record<string, unknown>}
            loading={loading}
        >
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600/20 rounded-lg">
                            <Mail className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Email</ZenCardTitle>
                            <ZenCardDescription>
                                Gestiona tus campañas de email marketing
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <div className="space-y-6">
                        <StorageIndicator studioSlug={studioSlug} />
                        <EmailWrapper studioSlug={studioSlug} />
                    </div>
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}

