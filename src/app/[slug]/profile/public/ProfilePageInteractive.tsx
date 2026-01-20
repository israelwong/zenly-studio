'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PublicProfileData } from '@/types/public-profile';
import {
    ProfileHeader,
    ProfileNavTabs,
    ZenCreditsCard,
    OffersCard,
    MobilePromotionsSection
} from '@/components/profile';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import { QuickActions } from '@/components/profile/QuickActions';
import { PostDetailModal } from '@/components/profile/sections/PostDetailModal';
import { PortfolioDetailModal } from '@/components/profile/sections/PortfolioDetailModal';
import { SearchCommandPalette } from '@/components/profile/SearchCommandPalette';
import { PostEditorSheet } from '@/components/profile/sheets/PostEditorSheet';
import { ProfileContentView } from './ProfileContentView';
import { trackContentEvent } from '@/lib/actions/studio/analytics/analytics.actions';

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

interface ProfilePageInteractiveProps {
    profileData: PublicProfileData;
    studioSlug: string;
    offers?: PublicOffer[];
}

/**
 * ProfilePageInteractive - Componente interactivo del perfil público
 * Maneja toda la lógica de interactividad: tabs, modals, search, tracking
 * Nueva estructura unificada responsive: mobile-first con 2 columnas en desktop
 */
export function ProfilePageInteractive({ profileData, studioSlug, offers = [] }: ProfilePageInteractiveProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    // Inicializar con el section param desde URL para evitar parpadeo
    const initialTab = searchParams.get('section') || 'inicio';
    const [activeTab, setActiveTab] = useState<string>(initialTab);
    const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);
    const [selectedPortfolioSlug, setSelectedPortfolioSlug] = useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isPostEditorOpen, setIsPostEditorOpen] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
    const [isScrolled, setIsScrolled] = useState(false);

    const { studio, paquetes, posts, portfolios } = profileData;

    // Verificar si el usuario autenticado es el owner del studio
    const isOwner = user?.id === studio.owner_id;

    // Verificar si hay FAQs activas (solo para usuarios públicos)
    const faq = (studio as unknown as { faq?: Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }> }).faq || [];
    const hasActiveFAQs = faq.some(f => f.is_active);

    // Tracking de visita al perfil público (solo una vez por sesión)
    useEffect(() => {
        if (isOwner || !studio?.id) return;

        const sessionKey = `profile_view_${studio.id}`;
        const alreadyTracked = sessionStorage.getItem(sessionKey);

        if (alreadyTracked) return;

        // Obtener o crear sessionId
        let sessionId = localStorage.getItem(`profile_session_${studio.id}`);
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem(`profile_session_${studio.id}`, sessionId);
        }

        // Detectar origen del tráfico
        const referrer = typeof window !== 'undefined' ? document.referrer : undefined;
        const trafficSource = referrer?.includes(window.location.origin) ? 'profile' : 'external';

        // Trackear visita al perfil
        trackContentEvent({
            studioId: studio.id,
            contentType: 'PACKAGE', // Usamos PACKAGE como placeholder, metadata indica que es perfil
            contentId: studio.id,
            eventType: 'PAGE_VIEW',
            sessionId,
            metadata: {
                profile_view: true,
                traffic_source: trafficSource,
                referrer: referrer || undefined,
            },
        }).catch(() => {
            // Silencioso - no interrumpir UX
        });

        // Marcar como trackeado en esta sesión
        sessionStorage.setItem(sessionKey, 'true');
    }, [studio?.id, isOwner]);

    // Detectar scroll para agregar margen al NavTabs
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        if (sectionParam && ['inicio', 'inicio-fotos', 'inicio-videos', 'portafolio', 'contacto', 'faq', 'archivados'].includes(sectionParam)) {
            // ⚠️ HIGIENE UI: Si cambia el tab, cerrar overlays
            if (sectionParam !== activeTab) {
                setSelectedPostSlug(null);
                setSelectedPortfolioSlug(null);
                setIsSearchOpen(false);
                setIsPostEditorOpen(false);
            }
            setActiveTab(sectionParam);
        }

        if (postParam) {
            setSelectedPostSlug(postParam);
            setSelectedPortfolioSlug(null);
        } else if (portfolioParam) {
            setSelectedPortfolioSlug(portfolioParam);
            setSelectedPostSlug(null);
        } else {
            // ⚠️ HIGIENE UI: Si no hay params de modal, asegurar que estén cerrados
            if (!postParam && !portfolioParam) {
                setSelectedPostSlug(null);
                setSelectedPortfolioSlug(null);
            }
        }
    }, [searchParams, activeTab]);

    // Detectar parámetro createPost para abrir sheet
    useEffect(() => {
        const createPostParam = searchParams.get('createPost');

        if (createPostParam === 'true' && isOwner) {
            setIsPostEditorOpen(true);
            // Limpiar URL sin recargar página
            const newUrl = `/${studioSlug}`;
            window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams, isOwner, studioSlug]);

    // Exponer callbacks para ProfilePageHeader
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__profilePageCallbacks = {
                onCreatePost: () => {
                    setEditingPostId(undefined);
                    setIsPostEditorOpen(true);
                },
                onCreateOffer: () => {
                    window.open(`/${studioSlug}/studio/commercial/ofertas/nuevo`, '_blank');
                },
            };
        }
    }, [studioSlug]);

    // Helper para construir URL con section
    const buildUrl = (params: { post?: string; portfolio?: string; tab?: string }) => {
        const urlParams = new URLSearchParams();

        // Incluir section si no es 'inicio' o si es un filtro de inicio
        if (params.tab && (params.tab !== 'inicio' || params.tab.startsWith('inicio-'))) {
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

    // Handler para cambio de tab con startTransition
    const handleTabChange = (tab: string) => {
        // ⚠️ HIGIENE UI: Cerrar overlays al cambiar tabs
        setSelectedPostSlug(null);
        setSelectedPortfolioSlug(null);
        setIsSearchOpen(false);
        setIsPostEditorOpen(false);
        setEditingPostId(undefined);
        
        // Usar startTransition para no bloquear UI durante cambio de tab
        startTransition(() => {
            setActiveTab(tab);
            router.push(buildUrl({ tab }), { scroll: false });
        });
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
            {/* ⚠️ STREAMING: Header se renderiza en ProfilePageHeader, no aquí */}
            
            {/* Main Content - Responsive Grid con max-width centrado en desktop */}
            {/* Columnas con ancho mobile-friendly: ~430px cada una */}
            <main className="w-full mx-auto max-w-[920px]">
                {/* Mobile-only: Sticky Promotions Banner - Fuera del grid */}
                <div className="lg:hidden">
                    <MobilePromotionsSection
                        offers={offers}
                        activeTab={activeTab}
                        studioSlug={studioSlug}
                        studioId={studio.id}
                        ownerUserId={studio.owner_id}
                    />
                </div>

                <div className={`grid grid-cols-1 ${offers.length > 0 || isOwner ? 'lg:grid-cols-[430px_430px]' : 'lg:grid-cols-[430px]'} gap-4 p-4 lg:p-6 lg:justify-center`}>
                    {/* Col 1: Main content */}
                    <div className="space-y-4">
                        {/* Navigation Tabs - Sticky con margen dinámico */}
                        <div className={`sticky z-20 bg-zinc-900/50 backdrop-blur-lg rounded-lg border border-zinc-800/20 transition-all duration-300 ${isScrolled ? 'top-[88px]' : 'top-[72px]'
                            }`}>
                            <ProfileNavTabs
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                onSearchClick={() => setIsSearchOpen(true)}
                                hasActiveFAQs={hasActiveFAQs}
                                isOwner={isOwner}
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
                        </div>
                    </div>

                    {/* Col 2: Sidebar (solo desktop) */}
                    {/* Mostrar si hay ofertas O si el usuario está autenticado (owner) */}
                    {(offers.length > 0 || isOwner) && (
                        <aside className="hidden lg:block space-y-4 lg:sticky lg:top-24 lg:h-fit">
                            {/* Si hay ofertas, mostrar OffersCard */}
                            {offers.length > 0 ? (
                                <OffersCard
                                    offers={offers}
                                    studioSlug={studioSlug}
                                    studioId={studio.id}
                                    ownerUserId={studio.owner_id}
                                />
                            ) : (
                                /* Si no hay ofertas pero el usuario está autenticado, mostrar banner */
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

                            {/* Card Créditos ZEN - Siempre visible cuando la columna 2 está visible */}
                            <ZenCreditsCard />
                        </aside>
                    )}
                </div>
            </main>

            {/* Mobile-only: Footer */}
            <footer className="lg:hidden">
                <PublicPageFooter />
            </footer>

            {/* Quick Actions FAB - Solo mobile */}
            <QuickActions
                studioSlug={studioSlug}
                onCreatePost={() => {
                    setEditingPostId(undefined);
                    setIsPostEditorOpen(true);
                }}
            />

            {/* Post Detail Modal */}
            <PostDetailModal
                post={selectedPostWithStudio}
                studioSlug={studioSlug}
                studioId={studio.id}
                ownerUserId={studio.owner_id}
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
                isArchived={selectedPortfolio?.is_published === false}
                onRestore={selectedPortfolio?.is_published === false ? async () => {
                    // Importar y llamar restorePortfolio
                    const { restorePortfolio } = await import('@/lib/actions/studio/archive.actions');
                    const result = await restorePortfolio(selectedPortfolio.id, studioSlug);
                    if (result.success) {
                        // Actualizar estado local de ArchivedContent
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
