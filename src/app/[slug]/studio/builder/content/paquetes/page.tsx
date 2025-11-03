'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Package } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { SectionLayout } from '../../components';
import { PaquetesWrapper } from './components';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import type { BuilderProfileData } from '@/types/builder-profile';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';
import { toast } from 'sonner';

export default function PaquetesPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [loading, setLoading] = useState(true);
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);

    // Función para recargar datos del builder (para actualizar preview móvil)
    const refreshPreviewData = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getBuilderProfileData(studioSlug);

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
    }, [studioSlug]);

    // Función para actualizar solo los paquetes en el preview (sin recargar todo)
    const updatePreviewPaquetes = useCallback((paquetes: PaqueteFromDB[]) => {
        setBuilderData(prev => {
            if (!prev) return prev;
            
            // Convertir PaqueteFromDB a BuilderPaquete (que es compatible con PublicPaquete)
            const builderPaquetes = paquetes
                .filter(p => !p.id.startsWith('duplicating-')) // Excluir placeholders temporales
                .map(paquete => ({
                    id: paquete.id,
                    nombre: paquete.name,
                    descripcion: paquete.description ? paquete.description : undefined,
                    precio: paquete.precio || paquete.cost || 0,
                    tipo_evento: paquete.event_types?.name || undefined,
                    cover_url: paquete.cover_url ? paquete.cover_url : undefined,
                    is_featured: paquete.is_featured ?? false,
                    duracion_horas: undefined,
                    incluye: undefined,
                    no_incluye: undefined,
                    condiciones: undefined,
                    order: paquete.position || 0,
                }));

            return {
                ...prev,
                paquetes: builderPaquetes,
            };
        });
    }, []);

    // Cargar datos del builder (para preview móvil)
    useEffect(() => {
        refreshPreviewData();
    }, [refreshPreviewData]);

    // Datos para el preview móvil
    const previewData = builderData ? {
        // Para ProfileIdentity
        studio_name: builderData.studio.studio_name,
        logo_url: builderData.studio.logo_url,
        slogan: builderData.studio.slogan,
        // Para ProfileContent (sección paquetes)
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
            section="paquetes"
            studioSlug={studioSlug}
            data={previewData as unknown as Record<string, unknown>}
            loading={loading}
        >
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                            <Package className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Paquetes</ZenCardTitle>
                            <ZenCardDescription>
                                Gestiona tus paquetes de servicios y eventos
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <div className="space-y-6">
                        {/* Paquetes Wrapper */}
                        <PaquetesWrapper 
                            studioSlug={studioSlug} 
                            onPreviewRefresh={refreshPreviewData}
                            onPreviewPaquetesUpdate={updatePreviewPaquetes}
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
