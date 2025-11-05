'use client';

import React, { useRef } from 'react';
import { ProfileHeader, ProfileContent, ProfileFooter, ProfileNavigation, FaqSection } from '@/components/profile';

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
    activeTab
}: MobilePreviewContainerProps) {
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
                        />
                    </div>
                )}

                {/* Navbar de navegación - fijo */}
                {showNavbar && (
                    <div className="flex-shrink-0">
                        <ProfileNavigation
                            activeSection={activeTab}
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
                        {showContent && !children && (
                            <ProfileContent
                                variant={contentVariant}
                                data={data}
                                loading={loading}
                            />
                        )}

                        {children}

                        {/* FAQ Section - Persistente antes del footer (solo si no está en el contenido principal) */}
                        {contentVariant !== 'faq' && data?.faq && Array.isArray(data.faq) && data.faq.length > 0 ? (
                            <div className="mt-6">
                                <FaqSection
                                    data={data}
                                    loading={loading}
                                />
                            </div>
                        ) : null}

                        {/* Footer dentro del contenido */}
                        {showFooter && (
                            <div className="mt-4">
                                <ProfileFooter
                                    data={data}
                                    loading={loading}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
