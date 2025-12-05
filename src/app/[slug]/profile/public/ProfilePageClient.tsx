'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    offers: PublicOffer[];
}

/**
 * ProfilePageClient - Main client component for public profile
 * Nueva estructura unificada responsive: mobile-first con 2 columnas en desktop
 * Maneja modal de post detalle con query params
 */
export function ProfilePageClient({ profileData, studioSlug, offers }: ProfilePageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<string>('inicio');
    const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);

    const { studio, paquetes, posts } = profileData;

    // Sincronizar query param con modal
    useEffect(() => {
        const postParam = searchParams.get('post');
        if (postParam) {
            setSelectedPostSlug(postParam);
        } else {
            setSelectedPostSlug(null);
        }
    }, [searchParams]);

    // Handlers para modal
    const handlePostClick = (postSlug: string) => {
        setSelectedPostSlug(postSlug);
        router.push(`/${studioSlug}?post=${postSlug}`, { scroll: false });
    };

    const handleCloseModal = () => {
        setSelectedPostSlug(null);
        router.push(`/${studioSlug}`, { scroll: false });
    };

    const handleNextPost = () => {
        if (!selectedPostSlug || publishedPosts.length === 0) return;
        const currentIndex = publishedPosts.findIndex(p => p.slug === selectedPostSlug);
        if (currentIndex >= 0 && currentIndex < publishedPosts.length - 1) {
            const nextSlug = publishedPosts[currentIndex + 1].slug;
            setSelectedPostSlug(nextSlug);
            router.push(`/${studioSlug}?post=${nextSlug}`, { scroll: false });
        }
    };

    const handlePrevPost = () => {
        if (!selectedPostSlug || publishedPosts.length === 0) return;
        const currentIndex = publishedPosts.findIndex(p => p.slug === selectedPostSlug);
        if (currentIndex > 0) {
            const prevSlug = publishedPosts[currentIndex - 1].slug;
            setSelectedPostSlug(prevSlug);
            router.push(`/${studioSlug}?post=${prevSlug}`, { scroll: false });
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
    const selectedPost = publishedPosts.find(p => p.slug === selectedPostSlug);
    const selectedPostWithStudio = selectedPost ? {
        ...selectedPost,
        studio: {
            studio_name: studio.studio_name,
            logo_url: studio.logo_url
        }
    } : null;

    // Calcular índice y disponibilidad de navegación
    const currentPostIndex = publishedPosts.findIndex(p => p.slug === selectedPostSlug);
    const hasNext = currentPostIndex >= 0 && currentPostIndex < publishedPosts.length - 1;
    const hasPrev = currentPostIndex > 0;

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
                    showEditButton={true}
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
                                onTabChange={setActiveTab}
                            />
                        </div>

                        {/* Content View */}
                        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800/20 overflow-hidden">
                            <ProfileContentView
                                activeTab={activeTab}
                                profileData={profileData}
                                onPostClick={handlePostClick}
                                studioId={studio.id}
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
                hasNext={hasNext}
                hasPrev={hasPrev}
            />
        </div>
    );
}
