'use client';

import React from 'react';
import { PublicProfileData } from '@/types/public-profile';
import { ProfileContent } from '@/components/profile';
import { ArchivedContent } from '@/components/profile/sections/ArchivedContent';
// PostGridView, ShopView, and InfoView are now handled by ProfileContent component

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
    const { studio, contactInfo, portfolios, posts, paquetes } = profileData;

    switch (activeTab) {
        case 'inicio':
            return (
                <ProfileContent
                    variant="inicio"
                    data={{ posts: posts || [] }}
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
                />
            );

        case 'contacto':
            return (
                <ProfileContent
                    variant="info"
                    data={{
                        studio,
                        contactInfo
                    }}
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
