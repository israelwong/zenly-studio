'use client';

import React from 'react';
import { MainSection, PortfolioSection, PortfolioDetailSection, PostSection, PostDetailSection, ContactSection, PaquetesSection, FaqSection } from './sections';
import { PublicPortfolio, PublicStudioProfile, PublicContactInfo, PublicPaquete } from '@/types/public-profile';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileContentProps {
    variant?: 'skeleton' | 'inicio' | 'posts' | 'post-detail' | 'portfolio' | 'portfolio-detail' | 'info' | 'paquetes' | 'faq';
    data?: Record<string, unknown>;
    loading?: boolean;
    hidePortfolioHeader?: boolean; // Ocultar título y categoría en portfolio-detail cuando está en modo preview del editor
    filter?: 'all' | 'photos' | 'videos'; // Filtro para posts (solo en variant 'inicio')
    onPostClick?: (postId: string) => void;
    onPortfolioClick?: (portfolioSlug: string) => void;
    onEditPost?: (postId: string) => void;
    studioId?: string;
    ownerUserId?: string | null;
    studioSlug?: string;
    isDesktop?: boolean;
    studioName?: string | null;
    studioLogoUrl?: string | null;
    isOwner?: boolean;
}

/**
 * ProfileContent - Componente reutilizable para contenido del perfil
 * Migrado desde ContentPreviewSkeleton del builder con mejor naming
 * 
 * Usado en:
 * - Builder preview (contenido de skeleton)
 * - Perfil público (contenido dinámico)
 */
export function ProfileContent({
    variant = 'skeleton',
    data,
    loading = false,
    hidePortfolioHeader = false,
    filter = 'all',
    onPostClick,
    onPortfolioClick,
    onEditPost,
    studioId,
    ownerUserId,
    studioSlug,
    isDesktop = false,
    studioName,
    studioLogoUrl,
    isOwner = false
}: ProfileContentProps) {
    const { user } = useAuth();
    // Skeleton loading state
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square bg-zinc-800 rounded-lg animate-pulse"></div>
                    ))}
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-zinc-800 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-zinc-800 rounded w-1/2 animate-pulse"></div>
                    <div className="h-3 bg-zinc-800 rounded w-5/6 animate-pulse"></div>
                </div>
            </div>
        );
    }

    // Skeleton placeholder (builder preview)
    if (variant === 'skeleton') {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square bg-zinc-800 rounded-lg"></div>
                    ))}
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-zinc-800 rounded w-3/4"></div>
                    <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
                    <div className="h-3 bg-zinc-800 rounded w-5/6"></div>
                </div>
            </div>
        );
    }

    // Inicio/Feed content - Usa MainSection para feed de posts
    if (variant === 'inicio' || variant === 'posts') {
        const posts = Array.isArray(data?.posts) ? (data.posts as unknown[]) : [];
        if (variant === 'inicio' || (variant === 'posts' && !data?.portfolios)) {
            return (
                <div className="h-full overflow-hidden">
                    <MainSection posts={posts as Parameters<typeof MainSection>[0]['posts']} filter={filter} onPostClick={onPostClick} onEditPost={onEditPost} studioId={studioId} ownerUserId={ownerUserId} isDesktop={isDesktop} studioName={studioName} studioLogoUrl={studioLogoUrl} isOwner={isOwner} />
                </div>
            );
        }
        // Fallback a PostSection si no hay posts pero hay variant posts
        return <PostSection posts={posts as Parameters<typeof PostSection>[0]['posts']} />;
    }

    // Post detail content (para editor)
    if (variant === 'post-detail') {
        const post = data?.post as {
            id: string;
            title?: string | null;
            caption: string | null;
            tags?: string[];
            media: Array<{
                id: string;
                file_url: string;
                file_type: 'image' | 'video';
                filename: string;
                thumbnail_url?: string;
                display_order: number;
            }>;
            is_published: boolean;
            published_at: Date | null;
            view_count: number;
        } | undefined;
        const logoUrl = data?.logo_url as string | null | undefined;
        const studioSlug = data?.studioSlug as string | undefined;

        if (!post) {
            return (
                <div className="p-8 text-center">
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">
                        Sin contenido
                    </h3>
                    <p className="text-sm text-zinc-500">
                        Agrega contenido al post para ver la vista previa
                    </p>
                </div>
            );
        }
        return <PostDetailSection post={post} logoUrl={logoUrl} studioSlug={studioSlug} />;
    }

    // Portfolio content
    if (variant === 'portfolio') {
        const portfolios = data?.portfolios as PublicPortfolio[] || [];
        return (
            <div className="h-full overflow-hidden">
                <PortfolioSection portfolios={portfolios} onPortfolioClick={onPortfolioClick} studioId={studioId} ownerUserId={ownerUserId} currentUserId={user?.id || null} isDesktop={isDesktop} />
            </div>
        );
    }

    // Portfolio detail content (para editor)
    if (variant === 'portfolio-detail') {
        const portfolio = data?.portfolio as Parameters<typeof PortfolioDetailSection>[0]['portfolio'] | undefined;
        if (!portfolio) {
            return (
                <div className="p-8 text-center">
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">
                        Sin contenido
                    </h3>
                    <p className="text-sm text-zinc-500">
                        Agrega contenido al portfolio para ver la vista previa
                    </p>
                </div>
            );
        }
        // Los datos vienen dinámicamente desde el editor
        return <PortfolioDetailSection portfolio={portfolio as unknown as Parameters<typeof PortfolioDetailSection>[0]['portfolio']} hideHeader={hidePortfolioHeader} />;
    }

    // Paquetes content
    if (variant === 'paquetes') {
        const paquetes = data?.paquetes as PublicPaquete[] || [];
        return <PaquetesSection paquetes={paquetes} />;
    }

    // FAQ content
    if (variant === 'faq') {
        const faq = data?.faq as Array<{
            id: string;
            pregunta: string;
            respuesta: string;
            orden: number;
            is_active: boolean;
        }> || [];

        return (
            <FaqSection
                faq={faq}
                loading={loading}
                studioSlug={studioSlug || ''}
                ownerId={ownerUserId || null}
            />
        );
    }

    // Info/Contact content
    if (variant === 'info') {
        const studio = data?.studio as PublicStudioProfile;
        const contactInfo = data?.contactInfo as PublicContactInfo;
        const socialNetworks = data?.socialNetworks as Array<{
            id: string;
            url: string;
            platform: {
                id: string;
                name: string;
                icon: string | null;
            } | null;
            order: number;
        }> || [];

        if (!studio || !contactInfo) {
            return (
                <div className="p-8 text-center">
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">
                        Información no disponible
                    </h3>
                    <p className="text-sm text-zinc-500">
                        Los datos de contacto no están disponibles
                    </p>
                </div>
            );
        }

        return <ContactSection studio={studio} contactInfo={contactInfo} socialNetworks={socialNetworks} studioSlug={studioSlug || ''} />;
    }

    // Default fallback
    return (
        <div className="p-8 text-center">
            <h3 className="text-lg font-medium text-zinc-300 mb-2">
                Contenido no disponible
            </h3>
            <p className="text-sm text-zinc-500">
                No se pudo cargar el contenido solicitado
            </p>
        </div>
    );
}
