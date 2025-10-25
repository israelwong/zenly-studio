'use client';

import React, { useRef } from 'react';
import { ProfileIdentity, ProfileContent, ProfileFooter, ProfileNavigation, ProfileFAQ } from '@/components/profile';

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
    contentVariant?: 'skeleton' | 'posts' | 'shop' | 'info' | 'paquetes';
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

    return (
        <div className="w-full max-w-sm mx-auto">
            {/* Simulador de móvil con proporciones reales */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl w-[375px] h-[812px] flex flex-col relative overflow-hidden">
                {/* Header de identidad - fijo con bordes redondeados */}
                {showHeader && (
                    <div className="flex-shrink-0 rounded-t-3xl overflow-hidden">
                        <ProfileIdentity
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

                        {/* FAQ Section - Persistente antes del footer */}
                        {data?.faq && Array.isArray(data.faq) && data.faq.length > 0 && (
                            <div className="mt-6">
                                <ProfileFAQ
                                    data={data}
                                    loading={loading}
                                />
                            </div>
                        )}

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
