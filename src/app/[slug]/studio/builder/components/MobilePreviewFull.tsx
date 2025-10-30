'use client';

import React, { useRef } from 'react';
import { ProfileIdentity, ProfileContent, ProfileFooter } from '@/components/profile';
import { X } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface MobilePreviewFullProps {
    children?: React.ReactNode;
    // Datos para header y footer
    data?: Record<string, unknown>;
    loading?: boolean;
    // Configuración de contenido
    contentVariant?: 'skeleton' | 'posts' | 'post-detail' | 'portfolio' | 'portfolio-detail' | 'shop' | 'info' | 'paquetes';
    activeTab?: string;
    // Callbacks
    onClose?: () => void;
    onBack?: () => void;
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
    activeTab = 'inicio',
    onClose,
    onBack
}: MobilePreviewFullProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="w-full max-w-sm mx-auto relative">
            {/* Botón de cerrar/regresar */}
            <div className="absolute top-4 right-4 z-10">
                <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={onClose || onBack}
                    className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 hover:bg-zinc-800"
                >
                    <X className="h-4 w-4" />
                </ZenButton>
            </div>

            {/* Simulador de móvil con proporciones reales */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl w-[375px] h-[812px] flex flex-col relative overflow-hidden">
                {/* Header de identidad - fijo con bordes redondeados */}
                <div className="flex-shrink-0 rounded-t-3xl overflow-hidden">
                    <ProfileIdentity
                        data={data}
                        loading={loading}
                    />
                </div>

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
                        {!children && (
                            <ProfileContent
                                variant={contentVariant}
                                data={data}
                                loading={loading}
                            />
                        )}

                        {children}

                        {/* Footer dentro del contenido */}
                        <div className="mt-4">
                            <ProfileFooter
                                data={data}
                                loading={loading}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
