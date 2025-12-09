'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { PublicProfileData } from '@/types/public-profile';
import {
    ProfileHeader,
    ProfileNavTabs,
    ProfileFooter,
    ZenCreditsCard,
    BusinessPresentationCard,
    OffersCard,
    MobilePromotionsSection,
    QuickActions
} from '@/components/profile';
import { PostDetailModal } from '@/components/profile/sections/PostDetailModal';
import { PortfolioDetailModal } from '@/components/profile/sections/PortfolioDetailModal';
import { SearchCommandPalette } from '@/components/profile/SearchCommandPalette';
import { PostEditorSheet } from '@/components/profile/sheets/PostEditorSheet';
import { ProfileContentView } from './ProfileContentView';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
}

interface ProfilePageClientProps {
    profileData: PublicProfileData;
    studioSlug: string;
    offers?: PublicOffer[];
}

/**
 * ProfilePageClient - Main client component for public profile
 * Nueva estructura unificada responsive: mobile-first con 2 columnas en desktop
 * Maneja modals de post y portfolio con query params
 */
export function ProfilePageClient({ profileData, studioSlug, offers = [] }: ProfilePageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Inicializar con el section param desde URL para evitar parpadeo
    const initialTab = searchParams.get('section') || 'inicio';
    const [activeTab, setActiveTab] = useState<string>(initialTab);
    const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);
    const [selectedPortfolioSlug, setSelectedPortfolioSlug] = useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isPostEditorOpen, setIsPostEditorOpen] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);

    const { studio, paquetes, posts, portfolios } = profileData;


    // Keyboard shortcut para abrir buscador (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Sincronizar query params con modals y tab
    useEffect(() => {
        const postParam = searchParams.get('post');
        const portfolioParam = searchParams.get('portfolio');
        const sectionParam = searchParams.get('section');

        // Sincronizar tab desde URL
        if (sectionParam && ['inicio', 'portafolio', 'contacto', 'faq', 'archivados'].includes(sectionParam)) {
            setActiveTab(sectionParam);
        }

        if (postParam) {
            setSelectedPostSlug(postParam);
            setSelectedPortfolioSlug(null);
        } else if (portfolioParam) {
            setSelectedPortfolioSlug(portfolioParam);
            setSelectedPostSlug(null);
        } else {
            setSelectedPostSlug(null);
            setSelectedPortfolioSlug(null);
        }
    }, [searchParams]);

    // Helper para construir URL con section
    const buildUrl = (params: { post?: string; portfolio?: string; tab?: string }) => {
        const urlParams = new URLSearchParams();

        if (params.tab && params.tab !== 'inicio') {
            urlParams.set('section', params.tab);
        }
        if (params.post) {
            urlParams.set('post', params.post);
        }
        if (params.portfolio) {
            urlParams.set('portfolio', params.portfolio);
        }

        const queryString = urlParams.toString();
        return `/${studioSlug}${queryString ? `?${queryString}` : ''}`;
    };

    // Handler para cambio de tab
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        router.push(buildUrl({ tab }), { scroll: false });
    };

    // Handlers para modal
    const handlePostClick = (postSlug: string) => {
        setSelectedPostSlug(postSlug);
        router.push(buildUrl({ post: postSlug, tab: activeTab }), { scroll: false });
    };

    const handleCloseModal = () => {
        setSelectedPostSlug(null);
        setSelectedPortfolioSlug(null);
        router.push(buildUrl({ tab: activeTab }), { scroll: false });
    };

    const handleNextPost = () => {
        if (!selectedPostSlug || publishedPosts.length === 0) return;
        const currentIndex = publishedPosts.findIndex(p => p.slug === selectedPostSlug);
        if (currentIndex >= 0 && currentIndex < publishedPosts.length - 1) {
            const nextSlug = publishedPosts[currentIndex + 1].slug;
            setSelectedPostSlug(nextSlug);
            router.push(buildUrl({ post: nextSlug, tab: activeTab }), { scroll: false });
        }
    };

    const handlePrevPost = () => {
        if (!selectedPostSlug || publishedPosts.length === 0) return;
        const currentIndex = publishedPosts.findIndex(p => p.slug === selectedPostSlug);
        if (currentIndex > 0) {
            const prevSlug = publishedPosts[currentIndex - 1].slug;
            setSelectedPostSlug(prevSlug);
            router.push(buildUrl({ post: prevSlug, tab: activeTab }), { scroll: false });
        }
    };

    // Handlers para modal de portfolio
    const handlePortfolioClick = (portfolioSlug: string) => {
        setSelectedPortfolioSlug(portfolioSlug);
        router.push(buildUrl({ portfolio: portfolioSlug, tab: activeTab }), { scroll: false });
    };

    const handleNextPortfolio = () => {
        if (!selectedPortfolioSlug || portfolios.length === 0) return;
        const currentIndex = portfolios.findIndex(p => p.slug === selectedPortfolioSlug);
        if (currentIndex >= 0 && currentIndex < portfolios.length - 1) {
            const nextSlug = portfolios[currentIndex + 1].slug;
            setSelectedPortfolioSlug(nextSlug);
            router.push(buildUrl({ portfolio: nextSlug, tab: activeTab }), { scroll: false });
        }
    };

    const handlePrevPortfolio = () => {
        if (!selectedPortfolioSlug || portfolios.length === 0) return;
        const currentIndex = portfolios.findIndex(p => p.slug === selectedPortfolioSlug);
        if (currentIndex > 0) {
            const prevSlug = portfolios[currentIndex - 1].slug;
            setSelectedPortfolioSlug(prevSlug);
            router.push(buildUrl({ portfolio: prevSlug, tab: activeTab }), { scroll: false });
        }
    };

    // Filtrar y ordenar posts publicados para navegación (mismo orden que MainSection)
    const publishedPosts = React.useMemo(() => {
        const filtered = posts?.filter(p => p.is_published) || [];
        return [...filtered].sort((a, b) => {
            // Primero destacados
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;

            // Luego por fecha de creación (más nueva primero)
            const dateA = a.created_at ? new Date(a.created_at).getTime() : (a.published_at ? new Date(a.published_at).getTime() : 0);
            const dateB = b.created_at ? new Date(b.created_at).getTime() : (b.published_at ? new Date(b.published_at).getTime() : 0);
            return dateB - dateA;
        });
    }, [posts]);

    // Preparar post con info del studio para el modal
    // Buscar en todos los posts (incluyendo archivados si el usuario es owner)
    const selectedPost = selectedPostSlug
        ? posts?.find(p => p.slug === selectedPostSlug)
        : null;

    const selectedPostWithStudio = selectedPost ? {
        ...selectedPost,
        studio: {
            studio_name: studio.studio_name,
            logo_url: studio.logo_url
        }
    } : null;

    // Calcular índice y disponibilidad de navegación para posts
    const currentPostIndex = publishedPosts.findIndex(p => p.slug === selectedPostSlug);
    const hasNextPost = currentPostIndex >= 0 && currentPostIndex < publishedPosts.length - 1;
    const hasPrevPost = currentPostIndex > 0;

    // Preparar portfolio seleccionado con info de disponibilidad de navegación
    // Buscar en todos los portfolios (incluyendo archivados) si hay slug seleccionado
    const selectedPortfolio = selectedPortfolioSlug
        ? portfolios?.find(p => p.slug === selectedPortfolioSlug)
        : null;
    const currentPortfolioIndex = portfolios.findIndex(p => p.slug === selectedPortfolioSlug);
    const hasNextPortfolio = currentPortfolioIndex >= 0 && currentPortfolioIndex < portfolios.length - 1;
    const hasPrevPortfolio = currentPortfolioIndex > 0;

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header - Compartido sticky */}
            <header className="sticky top-0 z-50">
                <ProfileHeader
                    data={{
                        studio_name: studio.studio_name,
                        slogan: studio.slogan,
                        logo_url: studio.logo_url
                    }}
                    studioSlug={studioSlug}
                    onCreatePost={() => {
                        setEditingPostId(undefined);
                        setIsPostEditorOpen(true);
                    }}
                />
            </header>

            {/* Main Content - Responsive Grid con max-width centrado en desktop */}
            {/* Columnas con ancho mobile-friendly: ~430px cada una */}
            <main className="w-full mx-auto max-w-[920px]">
                <div className="grid grid-cols-1 lg:grid-cols-[430px_430px] gap-4 p-4 lg:p-6 lg:justify-center">
                    {/* Col 1: Main content */}
                    <div className="space-y-4">
                        {/* Navigation Tabs - Sticky */}
                        <div className="sticky top-[72px] z-20 bg-zinc-900/50 backdrop-blur-lg rounded-lg border border-zinc-800/20">
                            <ProfileNavTabs
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                onSearchClick={() => setIsSearchOpen(true)}
                            />
                        </div>

                        {/* Content View */}
                        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800/20 overflow-hidden">
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
                            />

                            {/* Mobile-only: Promociones inline */}
                            <div className="lg:hidden">
                                <MobilePromotionsSection
                                    paquetes={paquetes}
                                    activeTab={activeTab}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Col 2: Sidebar (solo desktop) */}
                    <aside className="hidden lg:block space-y-4 lg:sticky lg:top-24 lg:h-fit">
                        {/* Card Ofertas */}
                        <OffersCard
                            offers={offers}
                            studioSlug={studioSlug}
                            studioId={studio.id}
                            ownerUserId={studio.owner_id}
                        />

                        {/* Card Presentación del Negocio */}
                        <BusinessPresentationCard
                            presentation={studio.presentation || undefined}
                            studioName={studio.studio_name}
                        />

                        {/* Card Créditos ZEN */}
                        <ZenCreditsCard />
                    </aside>
                </div>
            </main>

            {/* Mobile-only: Footer */}
            <footer className="lg:hidden">
                <ProfileFooter />
            </footer>

            {/* Quick Actions FAB - Solo mobile */}
            <QuickActions studioSlug={studioSlug} />

            {/* Post Detail Modal */}
            <PostDetailModal
                post={selectedPostWithStudio}
                studioSlug={studioSlug}
                isOpen={!!selectedPostSlug}
                onClose={handleCloseModal}
                onNext={handleNextPost}
                onPrev={handlePrevPost}
                hasNext={hasNextPost}
                hasPrev={hasPrevPost}
                isArchived={selectedPost?.is_published === false}
                onRestore={selectedPost?.is_published === false ? async () => {
                    // Importar y llamar restorePost
                    const { restorePost } = await import('@/lib/actions/studio/archive.actions');
                    const result = await restorePost(selectedPost.id, studioSlug);
                    if (result.success) {
                        // Actualizar estado local de ArchivedContent
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
