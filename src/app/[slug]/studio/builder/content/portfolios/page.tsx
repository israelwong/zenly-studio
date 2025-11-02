'use client';

import React, { useEffect, useState } from 'react';
import { Suspense } from "react";
import { ZenButton } from "@/components/ui/zen";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PortfoliosList } from "./components/PortfoliosList";
import { SectionLayout } from "../../components";
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Grid3X3 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import { getStudioPortfoliosBySlug } from '@/lib/actions/studio/builder/portfolios/portfolios.actions';
import { BuilderProfileData } from '@/types/builder-profile';
import { StudioPortfolio } from "@/types/studio-portfolios";

export default function PortfoliosPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [portfolios, setPortfolios] = useState<StudioPortfolio[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('🔄 [PortfoliosPage] Loading builder data for slug:', studioSlug);

                // Cargar datos del builder y portfolios en paralelo
                const [builderResult, portfoliosResult] = await Promise.all([
                    getBuilderProfileData(studioSlug),
                    getStudioPortfoliosBySlug(studioSlug) // Sin filtros primero para debug
                ]);

                console.log('📊 [PortfoliosPage] Builder data result:', builderResult);
                console.log('📊 [PortfoliosPage] Portfolios result:', portfoliosResult);

                if (builderResult.success && builderResult.data) {
                    setBuilderData(builderResult.data);
                    console.log('✅ [PortfoliosPage] Builder data loaded successfully');
                } else {
                    console.error('❌ [PortfoliosPage] Error loading builder data:', builderResult.error);
                }

                if (portfoliosResult.success) {
                    setPortfolios(portfoliosResult.data);
                    console.log('✅ [PortfoliosPage] Portfolios loaded successfully:', portfoliosResult.data.length);
                } else {
                    console.error('❌ [PortfoliosPage] Error loading portfolios:', portfoliosResult.error);
                }
            } catch (error) {
                console.error('❌ [PortfoliosPage] Error loading data:', error);
            } finally {
                console.log('🏁 [PortfoliosPage] Setting loading to false');
                setLoading(false);
            }
        };

        loadData();
    }, [studioSlug]);


    // ✅ Mapear datos para preview - Header, Footer y Contenido de portfolios
    // Limitar portfolios para preview a 5 para evitar sobrecarga en mobile preview
    // Filtrar solo portfolios publicados y ordenar: destacados primero, luego por fecha de creación
    const PREVIEW_PORTFOLIOS_LIMIT = 5;
    const publishedPortfolios = portfolios
        .filter(p => p.is_published)
        .sort((a, b) => {
            // Primero destacados (sin importar fecha de creación)
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;

            // Si ambos son destacados o ambos no son destacados, ordenar por fecha de creación (más nueva primero)
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        })
        .slice(0, PREVIEW_PORTFOLIOS_LIMIT)
        .map((portfolio) => {
            // Calcular cover_image_url desde media si cover_image_url está vacío
            let coverImageUrl = portfolio.cover_image_url;

            if (!coverImageUrl && portfolio.media && portfolio.media.length > 0) {
                const media = Array.isArray(portfolio.media) ? portfolio.media : [];
                const coverIndex = Math.min(portfolio.cover_index || 0, media.length - 1);
                const coverMedia = media[coverIndex];

                if (coverMedia) {
                    // Si es video, usar thumbnail_url; si es imagen, usar file_url
                    coverImageUrl = coverMedia.file_type === 'video'
                        ? (coverMedia.thumbnail_url || coverMedia.file_url)
                        : coverMedia.file_url;
                }
            }

            return {
                id: portfolio.id,
                title: portfolio.title,
                slug: portfolio.slug,
                description: portfolio.description,
                cover_image_url: coverImageUrl,
                category: portfolio.category,
                tags: portfolio.tags || [],
                order: portfolio.order,
                // Mapear media a items para PortfolioSection
                items: (portfolio.media || []).map((mediaItem) => ({
                    id: mediaItem.id || '',
                    title: mediaItem.filename || '',
                    description: mediaItem.alt_text || null,
                    image_url: mediaItem.file_type === 'image' ? mediaItem.file_url : null,
                    video_url: mediaItem.file_type === 'video' ? mediaItem.file_url : null,
                    item_type: mediaItem.file_type === 'video' ? 'VIDEO' as const : 'PHOTO' as const,
                    order: mediaItem.display_order || 0
                }))
            };
        });

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
        email: null,
        telefonos: builderData.contactInfo.phones.map(phone => ({
            numero: phone.number,
            tipo: phone.type === 'WHATSAPP' ? 'whatsapp' as const :
                phone.type === 'LLAMADAS' ? 'llamadas' as const : 'ambos' as const,
            etiqueta: phone.label || undefined,
            is_active: phone.is_active
        })),
        direccion: builderData.contactInfo.address,
        google_maps_url: builderData.studio.maps_url,
        // Para ProfileContent (sección portfolios) - Limitado para preview
        portfolios: publishedPortfolios
    } : null;

    return (
        <SectionLayout section="portfolios" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <Grid3X3 className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Gestión de Portfolios</ZenCardTitle>
                                <ZenCardDescription>
                                    Crea y gestiona tus portfolios avanzados
                                </ZenCardDescription>
                            </div>
                        </div>
                        <Link href={`/${studioSlug}/studio/builder/content/portfolios/nuevo`}>
                            <ZenButton className="gap-2">
                                <Plus className="w-4 h-4" />
                                Nuevo Portfolio
                            </ZenButton>
                        </Link>
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
                        <Suspense fallback={<div>Cargando portfolios...</div>}>
                            <PortfoliosList
                                studioSlug={studioSlug}
                                onPortfoliosChange={(updatedPortfolios) => {
                                    // Actualizar portfolios locales y recalcular preview
                                    setPortfolios(updatedPortfolios);
                                }}
                            />
                        </Suspense>
                    )}
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}

