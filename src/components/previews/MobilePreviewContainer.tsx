'use client';

import React, { useRef } from 'react';
import { ProfileHeader, ProfileContent, ProfileNavTabs, FaqSection } from '@/components/profile';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';

interface MobilePreviewContainerProps {
    children?: React.ReactNode;
    // Datos para header y footer
    data?: Record<string, unknown>;
    loading?: boolean;
    // Opciones de renderizado
    showHeader?: boolean;
    showFooter?: boolean;
    showContent?: boolean;
    showNavbar?: boolean;
    // Configuración de contenido
    contentVariant?: 'skeleton' | 'posts' | 'info' | 'paquetes' | 'faq';
    activeTab?: string;
    // Modo de visualización FAQ
    faqViewMode?: 'compact' | 'expanded';
    // Studio slug para ProfileHeader y FAQ
    studioSlug?: string;
    // Owner ID para permisos de edición
    ownerId?: string | null;
}

/**
 * MobilePreviewContainer - Contenedor para preview móvil
 * Migrado desde la carpeta previews del builder
 * 
 * Actualizado para usar ProfileHeader unificado con transición fluida
 * 
 * Usado en:
 * - Builder preview (contenedor de preview móvil)
 * - Perfil público (contenedor de preview móvil)
 */
export function MobilePreviewContainer({
    children,
    data,
    loading = false,
    showHeader = true,
    showFooter = true,
    showContent = true,
    showNavbar = false,
    contentVariant = 'skeleton',
    activeTab,
    faqViewMode,
    studioSlug,
    ownerId
}: MobilePreviewContainerProps) {
    // Default: expanded para mobile preview, compact solo si se especifica explícitamente
    const effectiveFaqViewMode = faqViewMode ?? (contentVariant === 'faq' ? 'expanded' : 'compact');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Debug: Log FAQ data
    console.log('🔍 [MobilePreviewContainer] Data received:', data);
    console.log('🔍 [MobilePreviewContainer] FAQ data:', data?.faq);

    return (
        <div className="w-full max-w-sm mx-auto">
            {/* Simulador de móvil con proporciones reales */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl w-[375px] h-[812px] flex flex-col relative overflow-hidden">
                {/* Header de identidad - fijo con bordes redondeados */}
                {showHeader && (
                    <div className="flex-shrink-0 rounded-t-3xl overflow-hidden">
                        <ProfileHeader
                            data={data}
                            loading={loading}
                            studioSlug={studioSlug}
                        />
                    </div>
                )}

                {/* Navbar de navegación - fijo */}
                {showNavbar && (
                    <div className="flex-shrink-0">
                        <ProfileNavTabs
                            activeTab={activeTab || 'inicio'}
                            onTabChange={() => { }} // Preview no interactivo
                        />
                    </div>
                )}

                {/* Contenido con scroll interno */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#71717a transparent'
                    }}
                >
                    <div className="p-5">
                        {showContent && !children && contentVariant === 'faq' ? (
                            <FaqSection
                                data={data}
                                loading={loading}
                                viewMode={effectiveFaqViewMode}
                                studioSlug={studioSlug || ''}
                                ownerId={ownerId}
                            />
                        ) : showContent && !children ? (
                            <ProfileContent
                                variant={contentVariant}
                                data={data}
                                loading={loading}
                            />
                        ) : null}

                        {children}

                        {/* FAQ Section - Persistente antes del footer (solo si no está en el contenido principal) */}
                        {contentVariant !== 'faq' && data?.faq && Array.isArray(data.faq) && data.faq.length > 0 ? (
                            <div className="mt-6">
                                <FaqSection
                                    data={data}
                                    loading={loading}
                                    viewMode={effectiveFaqViewMode}
                                    studioSlug={studioSlug || ''}
                                    ownerId={ownerId}
                                />
                            </div>
                        ) : null}

                        {/* Footer dentro del contenido */}
                        {showFooter && (
                            <div className="mt-4">
                                <PublicPageFooter />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
