'use client';

import React, { useRef } from 'react';
import { ProfileContent, ProfileFooter } from '@/components/profile';
import { Share2, ArrowLeft } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface MobilePreviewFullProps {
    children?: React.ReactNode;
    // Datos para header y footer
    data?: Record<string, unknown>;
    loading?: boolean;
    // Configuración de contenido
    contentVariant?: 'skeleton' | 'posts' | 'post-detail' | 'portfolio' | 'portfolio-detail' | 'info' | 'paquetes';
    activeTab?: string;
    // Callbacks
    onClose?: () => void;
    onBack?: () => void;
    // Modo edición - deshabilita botones de navegación
    isEditMode?: boolean;
    // Ocultar header del portfolio (título y categoría) cuando está en modo preview del editor
    hidePortfolioHeader?: boolean;
    // Ocultar header completo (regresar y compartir) - para landing pages
    hideHeader?: boolean;
}

/**
 * MobilePreviewFull - Preview móvil full-page sin navbar
 * Para editor de posts con vista previa en tiempo real
 */
export function MobilePreviewFull({
    children,
    data,
    loading = false,
    contentVariant = 'post-detail',
    onClose,
    onBack,
    isEditMode = false,
    hidePortfolioHeader = false,
    hideHeader = false
}: MobilePreviewFullProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="w-full max-w-sm mx-auto relative">
            {/* Simulador de móvil con proporciones reales */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl w-[375px] h-[812px] flex flex-col relative overflow-hidden">
                {/* Header simple - fijo con bordes redondeados */}
                {!hideHeader && (
                    <div className="shrink-0 rounded-t-3xl bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-3">
                        <div className="flex items-center justify-between">
                            {/* Botón de regresar */}
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                onClick={isEditMode ? undefined : (onBack || onClose)}
                                disabled={isEditMode}
                                className="p-2 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowLeft className="h-5 w-5 text-zinc-300" /> Regresar
                            </ZenButton>

                            {/* Icono de compartir */}
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                onClick={isEditMode ? undefined : () => {
                                    // TODO: Implementar funcionalidad de compartir
                                    console.log('Compartir post');
                                }}
                                disabled={isEditMode}
                                className="p-2 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Share2 className="h-5 w-5 text-zinc-300" />
                            </ZenButton>
                        </div>
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
                    {/* Si hay children custom (landing page), sin padding ni footer. Si no, con padding para ProfileContent */}
                    {children ? (
                        children
                    ) : (
                        <div className="p-5">
                            <ProfileContent
                                variant={contentVariant}
                                data={data}
                                loading={loading}
                                hidePortfolioHeader={hidePortfolioHeader}
                            />

                            {/* Footer dentro del contenido */}
                            <div className="mt-4">
                                <ProfileFooter />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
