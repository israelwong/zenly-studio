'use client';

import React from 'react';
import { ProfileNavTabs, ZenCreditsCard, OffersCard } from '@/components/profile';
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

interface ProfilePageDesktopProps {
    profileData: PublicProfileData;
    studioSlug: string;
    offers?: PublicOffer[];
    logic: ProfilePageLogic;
}

export function ProfilePageDesktop({ profileData, studioSlug, offers = [], logic }: ProfilePageDesktopProps) {
    const {
        activeTab,
        selectedPostId,
        selectedPortfolioSlug,
        isSearchOpen,
        isPostEditorOpen,
        editingPostId,
        isScrolled,
        isOwner,
        hasActiveFAQs,
        posts,
        portfolios,
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

    return (
        <div className="w-full min-h-screen bg-zinc-950">
            <main className="w-full">
                <div className={`w-full ${offers.length > 0 || isOwner ? 'grid grid-cols-[430px_430px] gap-4' : 'flex justify-center'} max-w-[920px] mx-auto px-6 py-6`}>
                    {/* Col 1: Main content */}
                    <div className="flex flex-col w-full">
                        {/* Navigation Tabs - Desktop: Sticky arriba */}
                        <div className={`sticky z-20 bg-zinc-900/50 backdrop-blur-lg rounded-lg border border-zinc-800/20 transition-all duration-300 shrink-0 ${isScrolled ? 'top-[88px]' : 'top-[72px]'}`}>
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

                        {/* Content View - Scroll natural en desktop */}
                        <div className="w-full mt-4">
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
                                isDesktop={true}
                                isOwner={isOwner}
                            />
                        </div>
                    </div>

                    {/* Col 2: Sidebar */}
                    {(offers.length > 0 || isOwner) && (
                        <aside className="space-y-4 sticky top-24 self-start pl-0">
                            {offers.length > 0 ? (
                                <OffersCard
                                    offers={offers}
                                    studioSlug={studioSlug}
                                    studioId={studio.id}
                                    ownerUserId={studio.owner_id}
                                />
                            ) : (
                                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800/20 p-5">
                                    <div className="text-center space-y-3">
                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                            <svg
                                                className="w-6 h-6 text-emerald-500"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 4v16m8-8H4"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-zinc-100 mb-1">
                                                Crea tu primera oferta
                                            </h3>
                                            <p className="text-xs text-zinc-400 mb-3">
                                                Comienza a capturar leads desde tus campañas de marketing.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                window.open(`/${studioSlug}/studio/commercial/ofertas/nuevo`, '_blank');
                                            }}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition-colors"
                                        >
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 4v16m8-8H4"
                                                />
                                            </svg>
                                            Crear Oferta
                                        </button>
                                    </div>
                                </div>
                            )}

                            <ZenCreditsCard />
                        </aside>
                    )}
                </div>
            </main>


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
