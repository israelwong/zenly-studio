'use client';

import React, { useEffect } from 'react';
import { ProfileNavTabs } from '@/components/profile';
import { PromoIsland } from '@/components/profile';
import { PostDetailModal } from '@/components/profile/sections/PostDetailModal';
import { PortfolioDetailModal } from '@/components/profile/sections/PortfolioDetailModal';
import { SearchCommandPalette } from '@/components/profile/SearchCommandPalette';
import { PostEditorSheet } from '@/components/profile/sheets/PostEditorSheet';
import { ProfileContentView } from './ProfileContentView';
import { PublicProfileData } from '@/types/public-profile';
import { toast } from 'sonner';
import { ProfilePageLogic } from './hooks/useProfilePageLogic';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
    discount_percentage?: number | null;
    is_permanent?: boolean;
    has_date_range?: boolean;
    start_date?: string | null;
    valid_until?: string | null;
    event_type_name?: string | null;
    banner_destination?: "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING";
}

interface ProfilePageMobileProps {
    profileData: PublicProfileData;
    studioSlug: string;
    offers?: PublicOffer[];
    logic: ProfilePageLogic;
}

export function ProfilePageMobile({ profileData, studioSlug, offers = [], logic }: ProfilePageMobileProps) {
    const {
        activeTab,
        selectedPostId,
        selectedPortfolioSlug,
        isSearchOpen,
        isPostEditorOpen,
        editingPostId,
        isOwner,
        hasActiveFAQs,
        posts,
        portfolios,
        offers: logicOffers,
        selectedPost,
        selectedPostWithStudio,
        selectedPortfolio,
        handleTabChange,
        handlePostClick,
        handlePortfolioClick,
        handleCloseModal,
        handleNextPost,
        handlePrevPost,
        handleNextPortfolio,
        handlePrevPortfolio,
        hasNextPost,
        hasPrevPost,
        hasNextPortfolio,
        hasPrevPortfolio,
        setIsSearchOpen,
        setIsPostEditorOpen,
        setEditingPostId,
        router,
    } = logic;

    const { studio } = profileData;

    // Bloqueo de scroll global (Body Lock) - Native Shell
    useEffect(() => {
        const originalHtmlStyle = {
            overflow: document.documentElement.style.overflow,
            height: document.documentElement.style.height,
            position: document.documentElement.style.position,
            width: document.documentElement.style.width,
        };
        const originalBodyStyle = {
            overflow: document.body.style.overflow,
            height: document.body.style.height,
            position: document.body.style.position,
            width: document.body.style.width,
        };

        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100%';
        document.documentElement.style.position = 'fixed';
        document.documentElement.style.width = '100%';

        document.body.style.overflow = 'hidden';
        document.body.style.height = '100%';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        const updateCSSVariables = () => {
            const header = document.querySelector('header.sticky');
            const headerHeight = header ? header.getBoundingClientRect().height : 72;
            document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
            document.documentElement.style.setProperty('--vabar-height', '80px');
        };

        const timeoutId = setTimeout(updateCSSVariables, 100);
        updateCSSVariables();
        window.addEventListener('resize', updateCSSVariables);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updateCSSVariables);

            document.documentElement.style.overflow = originalHtmlStyle.overflow;
            document.documentElement.style.height = originalHtmlStyle.height;
            document.documentElement.style.position = originalHtmlStyle.position;
            document.documentElement.style.width = originalHtmlStyle.width;

            document.body.style.overflow = originalBodyStyle.overflow;
            document.body.style.height = originalBodyStyle.height;
            document.body.style.position = originalBodyStyle.position;
            document.body.style.width = originalBodyStyle.width;
        };
    }, []);

    return (
        <div className="h-dvh w-full flex flex-col overflow-hidden bg-zinc-950">
            {/* Navigation Tabs - Mobile: debajo del ProfileHeader (sticky del page) */}
            <div
                className="fixed left-0 right-0 z-40 h-14 min-h-14 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 flex items-center"
                style={{ top: 'var(--header-height, 72px)', '--vabar-height': '56px' } as React.CSSProperties}
            >
                <ProfileNavTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onSearchClick={() => setIsSearchOpen(true)}
                    hasActiveFAQs={hasActiveFAQs}
                    isOwner={isOwner}
                    studioSlug={studioSlug}
                    onCreatePost={() => {
                        setEditingPostId(undefined);
                        setIsPostEditorOpen(true);
                    }}
                />
            </div>

            <main
                className="flex-1 w-full relative overflow-hidden pt-14"
            >
                <div className="h-full w-full">
                    <div className="flex flex-col h-full w-full min-h-0 min-w-0 relative overflow-hidden">
                        <div className="flex-1 w-full relative overflow-hidden min-h-0">
                            <ProfileContentView
                                activeTab={activeTab}
                                profileData={profileData}
                                onPostClick={handlePostClick}
                                onPortfolioClick={handlePortfolioClick}
                                onEditPost={(postId) => {
                                    setEditingPostId(postId);
                                    setIsPostEditorOpen(true);
                                }}
                                studioId={studio.id}
                                ownerUserId={studio.owner_id}
                                studioSlug={studioSlug}
                                isOwner={isOwner}
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* PromoIsland - Overlay fixed sobre navbar */}
            {offers.length > 0 && (
                <PromoIsland
                    offers={offers}
                    studioSlug={studioSlug}
                    studioId={studio.id}
                    ownerUserId={studio.owner_id}
                />
            )}

            {/* Post Detail Modal */}
            <PostDetailModal
                post={selectedPostWithStudio}
                studioSlug={studioSlug}
                studioId={studio.id}
                ownerUserId={studio.owner_id}
                isOpen={!!selectedPostId}
                onClose={handleCloseModal}
                onNext={handleNextPost}
                onPrev={handlePrevPost}
                hasNext={hasNextPost}
                hasPrev={hasPrevPost}
                isArchived={selectedPost?.is_published === false}
                isOwner={isOwner}
                onRestore={selectedPost?.is_published === false ? async () => {
                    const { restorePost } = await import('@/lib/actions/studio/archive.actions');
                    const result = await restorePost(selectedPost.id, studioSlug);
                    if (result.success) {
                        if (typeof window !== 'undefined') {
                            const win = window as typeof window & { __handleArchivedPostRestore?: (id: string) => void };
                            win.__handleArchivedPostRestore?.(selectedPost.id);
                        }
                        toast.success('Post restaurado exitosamente');
                        handleCloseModal();
                        setTimeout(() => router.refresh(), 300);
                    } else {
                        toast.error(result.error || 'Error al restaurar');
                    }
                } : undefined}
            />

            {/* Portfolio Detail Modal */}
            <PortfolioDetailModal
                portfolio={selectedPortfolio || null}
                studioSlug={studioSlug}
                studioId={studio.id}
                ownerUserId={studio.owner_id}
                isOpen={!!selectedPortfolioSlug}
                loading={!!selectedPortfolioSlug && !selectedPortfolio}
                onClose={handleCloseModal}
                onNext={handleNextPortfolio}
                onPrev={handlePrevPortfolio}
                hasNext={hasNextPortfolio}
                hasPrev={hasPrevPortfolio}
                isArchived={selectedPortfolio?.is_published === false}
                onRestore={selectedPortfolio?.is_published === false ? async () => {
                    const { restorePortfolio } = await import('@/lib/actions/studio/archive.actions');
                    const result = await restorePortfolio(selectedPortfolio.id, studioSlug);
                    if (result.success) {
                        if (typeof window !== 'undefined') {
                            const win = window as typeof window & { __handleArchivedPortfolioRestore?: (id: string) => void };
                            win.__handleArchivedPortfolioRestore?.(selectedPortfolio.id);
                        }
                        toast.success('Portfolio restaurado exitosamente');
                        handleCloseModal();
                        setTimeout(() => router.refresh(), 300);
                    } else {
                        toast.error(result.error || 'Error al restaurar');
                    }
                } : undefined}
            />

            {/* Search Command Palette */}
            <SearchCommandPalette
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                posts={posts}
                portfolios={portfolios}
                offers={offers}
                onSelectPost={handlePostClick}
                onSelectPortfolio={handlePortfolioClick}
                onSelectOffer={(slug) => {
                    window.location.href = `/${studioSlug}/offer/${slug}`;
                }}
            />

            {/* Post Editor Sheet */}
            <PostEditorSheet
                isOpen={isPostEditorOpen}
                onClose={() => {
                    setIsPostEditorOpen(false);
                    setEditingPostId(undefined);
                }}
                studioSlug={studioSlug}
                mode={editingPostId ? "edit" : "create"}
                postId={editingPostId}
                onSuccess={() => {
                    router.refresh();
                }}
            />
        </div>
    );
}
