'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CreditCard, Banknote } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { SectionLayout, StorageIndicator } from '../../components';
import { PagosWrapper } from './components';
import { getBuilderData } from '@/lib/actions/studio/builder/builder-data.actions';
import type { BuilderProfileData } from '@/types/builder-profile';
import { toast } from 'sonner';

export default function PagosPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [loading, setLoading] = useState(true);
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);

    // Cargar datos del builder (para preview móvil)
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

    // Datos para el preview móvil
    const previewData = builderData ? {
        // Para ProfileIdentity
        studio_name: builderData.studio.studio_name,
        logo_url: builderData.studio.logo_url,
        slogan: builderData.studio.slogan,
        // Para ProfileContent (sección pagos)
        studio: builderData.studio,
        items: builderData.items,
        paquetes: builderData.paquetes,
        // Para ProfileFooter
        pagina_web: builderData.studio.website,
        palabras_clave: builderData.studio.keywords,
        redes_sociales: builderData.socialNetworks.map(network => ({
            plataforma: network.platform?.name || 'Red Social',
            url: network.url
        })),
        email: null, // No hay email en BuilderProfileData
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
            section="pagos"
            studioSlug={studioSlug}
            data={previewData as unknown as Record<string, unknown>}
            loading={loading}
        >
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-600/20 rounded-lg">
                            <CreditCard className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Pagos</ZenCardTitle>
                            <ZenCardDescription>
                                Configura los métodos de pago para tus servicios
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <div className="space-y-6">
                        {/* Storage Indicator */}
                        <StorageIndicator studioSlug={studioSlug} />

                        {/* Pagos Wrapper */}
                        <PagosWrapper studioSlug={studioSlug} />
                    </div>
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
