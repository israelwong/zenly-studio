'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import { FAQSection, type FAQSectionRef } from './components/FAQSection';
import { SectionLayout } from '../../components';
import { useParams } from 'next/navigation';
import { getBuilderData } from '@/lib/actions/studio/builder/builder-data.actions';
import { IdentidadData } from '../../profile/identidad/types';
import { BuilderProfileData } from '@/types/builder-profile';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';

type FAQViewMode = 'compact' | 'expanded';

export default function FAQPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    // TODO: Próxima iteración - Reactivar setFaqViewMode cuando se implementen opciones de visualización
    const [faqViewMode] = useState<FAQViewMode>('expanded');
    const faqSectionRef = useRef<FAQSectionRef>(null);

    // Función para actualizar solo los FAQ en el preview (sin recargar todo)
    const updatePreviewFAQ = useCallback((faq: Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }>) => {
        setBuilderData((prev: BuilderProfileData | null) => {
            if (!prev) return null;

            return {
                ...prev,
                faq: faq
            };
        });
    }, []);

    // Función para recargar datos del builder (para actualizar preview móvil)
    const refreshPreviewData = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getBuilderData(studioSlug);

            if (result.success && result.data) {
                setBuilderData(result.data);
            } else {
                console.error('Error loading builder data:', result.error);
            }
        } catch (error) {
            console.error('Error in refreshPreviewData:', error);
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    // Memoizar función para actualizar datos locales (compatibilidad con FAQSection)
    const handleLocalUpdate = useCallback((data: unknown) => {
        const updateData = data as Partial<IdentidadData>;

        // Manejar FAQ si están en updateData
        if ('faq' in updateData && updateData.faq) {
            const faqData = updateData.faq as Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }>;
            updatePreviewFAQ(faqData);
        }
    }, [updatePreviewFAQ]);

    // Cargar datos del builder (para preview móvil)
    useEffect(() => {
        refreshPreviewData();
    }, [refreshPreviewData]);

    // Datos para el preview móvil - se recalcula automáticamente cuando cambia builderData
    const previewData = builderData ? {
        // Para ProfileIdentity
        studio_name: builderData.studio.studio_name,
        logo_url: builderData.studio.logo_url,
        slogan: builderData.studio.slogan,
        // Para ProfileContent (sección FAQ) - ordenado por orden
        faq: builderData.faq ? [...builderData.faq].sort((a, b) => a.orden - b.orden) : [],
        // Para ProfileFooter
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
            section="faq"
            studioSlug={studioSlug}
            data={previewData as unknown as Record<string, unknown>}
            loading={loading}
            faqViewMode={faqViewMode}
        >
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <HelpCircle className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Preguntas Frecuentes</ZenCardTitle>
                                <ZenCardDescription className='pr-4'>
                                    Gestiona las preguntas frecuentes que tus clientes pueden tener de tu estudio.
                                </ZenCardDescription>
                            </div>
                        </div>
                        <ZenButton
                            variant="outline"
                            size="sm"
                            onClick={() => faqSectionRef.current?.openModal()}
                            disabled={loading}
                            className="pr-2"
                        >
                            <Plus className="h-4 w-4" />
                            Agregar FAQ
                        </ZenButton>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <div className="space-y-6">
                        {/* TODO: Próxima iteración - Opciones de visualización
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                            <span className="text-sm text-zinc-400">Estilo de visualización</span>
                            <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                                <ZenButton
                                    variant={faqViewMode === 'compact' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFaqViewMode('compact')}
                                    className="h-8 px-3"
                                    title="Vista agrupada"
                                >
                                    <SquareStack className="h-4 w-4" />
                                </ZenButton>
                                <ZenButton
                                    variant={faqViewMode === 'expanded' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFaqViewMode('expanded')}
                                    className="h-8 px-3"
                                    title="Vista separada"
                                >
                                    <LayoutList className="h-4 w-4" />
                                </ZenButton>
                            </div>
                        </div>
                        */}
                        <FAQSection
                            ref={faqSectionRef}
                            studioSlug={studioSlug}
                            onLocalUpdate={handleLocalUpdate}
                            loading={loading}
                        />
                    </div>
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}

