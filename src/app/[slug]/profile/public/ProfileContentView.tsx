'use client';

import React, { Suspense, lazy } from 'react';
import { PublicProfileData } from '@/types/public-profile';
import { ProfileContent } from '@/components/profile';
import { ArchivedContent } from '@/components/profile/sections/ArchivedContent';

// Lazy load de componentes pesados (solo se cargan cuando se necesitan)
const LazyPortfolioContent = lazy(() => 
    import('@/components/profile').then(module => ({ default: () => (
        <ProfileContent variant="portfolio" data={{ portfolios: [] }} />
    )}))
);

const LazyPaquetesContent = lazy(() => 
    import('@/components/profile').then(module => ({ default: () => (
        <ProfileContent variant="paquetes" data={{ paquetes: [] }} />
    )}))
);

interface ProfileContentViewProps {
    activeTab: string;
    profileData: PublicProfileData;
    onPostClick?: (postSlug: string) => void;
    onPortfolioClick?: (portfolioSlug: string) => void;
    onEditPost?: (postId: string) => void;
    studioId?: string;
    ownerUserId?: string | null;
    studioSlug?: string;
}

/**
 * ProfileContentView - Container that switches between different views
 * Renders the appropriate view based on active tab
 * Handles tab switching logic and post/portfolio modals
 */
export function ProfileContentView({ activeTab, profileData, onPostClick, onPortfolioClick, onEditPost, studioId, ownerUserId, studioSlug }: ProfileContentViewProps) {
    const { studio, contactInfo, socialNetworks, portfolios, posts, paquetes } = profileData;

    switch (activeTab) {
        case 'inicio':
        case 'inicio-fotos':
        case 'inicio-videos':
            // Determinar filtro según el tab activo
            const filter = activeTab === 'inicio-fotos' ? 'photos' :
                activeTab === 'inicio-videos' ? 'videos' : 'all';
            return (
                <ProfileContent
                    variant="inicio"
                    data={{ posts: posts || [] }}
                    filter={filter}
                    onPostClick={onPostClick}
                    onEditPost={onEditPost}
                    studioId={studioId}
                    ownerUserId={ownerUserId}
                />
            );

        case 'portafolio':
            return (
                <ProfileContent
                    variant="portfolio"
                    data={{ portfolios }}
                    onPortfolioClick={onPortfolioClick}
                    studioId={studioId}
                    ownerUserId={ownerUserId}
                />
            );

        case 'paquetes':
            return (
                <ProfileContent
                    variant="paquetes"
                    data={{ paquetes: paquetes || [] }}
                />
            );

        case 'faq':
            return (
                <ProfileContent
                    variant="faq"
                    data={{ faq: (studio as unknown as { faq?: Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }> }).faq || [] }}
                    studioSlug={studioSlug}
                    ownerUserId={ownerUserId}
                />
            );

        case 'contacto':
            return (
                <ProfileContent
                    variant="info"
                    data={{
                        studio,
                        contactInfo,
                        socialNetworks
                    }}
                    studioSlug={studioSlug}
                />
            );

        case 'archivados':
            return studioSlug ? (
                <ArchivedContent
                    studioSlug={studioSlug}
                    onPostClick={onPostClick}
                    onPortfolioClick={onPortfolioClick}
                    onPostRestored={(postId) => {
                        // Callback para actualizar estado local
                        if (typeof window !== 'undefined') {
                            const win = window as typeof window & { __handleArchivedPostRestore?: (id: string) => void };
                            win.__handleArchivedPostRestore?.(postId);
                        }
                    }}
                    onPortfolioRestored={(portfolioId) => {
                        // Callback para actualizar estado local
                        if (typeof window !== 'undefined') {
                            const win = window as typeof window & { __handleArchivedPortfolioRestore?: (id: string) => void };
                            win.__handleArchivedPortfolioRestore?.(portfolioId);
                        }
                    }}
                />
            ) : (
                <div className="text-center py-20 text-zinc-400">
                    Error: Studio slug no disponible
                </div>
            );

        default:
            return (
                <ProfileContent
                    variant="posts"
                    data={{ portfolios }}
                />
            );
    }
}
