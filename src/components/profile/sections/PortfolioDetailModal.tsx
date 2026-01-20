'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Link2, X, RotateCcw, AlertCircle, Home, Image as ImageIcon } from 'lucide-react';
import { PortfolioDetailSection } from './PortfolioDetailSection';
import { PublicPortfolio } from '@/types/public-profile';
import { ContentBlock } from '@/types/content-blocks';
import { useContentAnalytics, useTimeTracking, useScrollTracking } from '@/hooks/useContentAnalytics';

interface PortfolioDetailModalProps {
    portfolio: PublicPortfolio | null;
    studioSlug: string;
    studioId?: string;
    ownerUserId?: string | null;
    isOpen: boolean;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
    isArchived?: boolean;
    onRestore?: () => void;
    hideShareButton?: boolean; // Ocultar botón de copiar link
}

/**
 * PortfolioDetailModal - Modal para mostrar portafolio completo
 * Replica la misma UX que PostDetailModal con tracking incluido
 */
export function PortfolioDetailModal({
    portfolio,
    studioSlug,
    studioId,
    ownerUserId,
    isOpen,
    onClose,
    onNext,
    onPrev,
    hasNext = false,
    hasPrev = false,
    isArchived = false,
    onRestore,
    hideShareButton = false
}: PortfolioDetailModalProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    // Analytics hooks
    const {
        trackModalOpen,
        trackModalClose,
        trackLinkCopy
    } = useContentAnalytics({
        studioId: studioId || '',
        contentType: 'PORTFOLIO',
        contentId: portfolio?.id || '',
        ownerUserId
    });

    useTimeTracking({
        studioId: studioId || '',
        contentType: 'PORTFOLIO',
        contentId: portfolio?.id || '',
        ownerUserId
    });

    useScrollTracking({
        studioId: studioId || '',
        contentType: 'PORTFOLIO',
        contentId: portfolio?.id || '',
        ownerUserId,
        elementRef: contentRef as React.RefObject<HTMLElement>
    });

    // Track modal open/close
    useEffect(() => {
        if (isOpen && portfolio?.id && studioId) {
            trackModalOpen();
        }
    }, [isOpen, portfolio?.id, studioId, trackModalOpen]);

    // Manejar ESC para cerrar
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                trackModalClose();
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, trackModalClose]);

    // Manejar navegación con flechas
    useEffect(() => {
        const handleArrow = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
            if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleArrow);
        }

        return () => {
            document.removeEventListener('keydown', handleArrow);
        };
    }, [isOpen, hasNext, hasPrev, onNext, onPrev]);

    const handleClose = () => {
        trackModalClose();
        onClose();
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            trackLinkCopy();
        } catch (error) {
            console.error('Error al copiar enlace:', error);
        }
    };

    if (!isOpen) return null;

    // Si el modal está abierto pero no hay portfolio, mostrar mensaje de "no disponible"
    if (!portfolio) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Overlay */}
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    onClick={onClose}
                />

                {/* Modal de "Portafolio no disponible" */}
                <div className="relative w-full max-w-md mx-auto p-4 flex items-center justify-center">
                    <div className="relative w-full bg-zinc-900/95 backdrop-blur-xl rounded-lg border border-zinc-800/50 shadow-2xl p-6">
                        {/* Icono de alerta */}
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>

                            {/* Título */}
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-zinc-100">
                                    Portafolio no disponible
                                </h3>
                                <p className="text-sm text-zinc-400">
                                    Este portafolio fue eliminado, movido o ya no está disponible públicamente.
                                </p>
                            </div>

                            {/* Acciones */}
                            <div className="w-full space-y-3 pt-4">
                                <Link
                                    href={`/${studioSlug}`}
                                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                                    onClick={onClose}
                                >
                                    <Home className="w-4 h-4" />
                                    <span>Ver perfil</span>
                                </Link>

                                <Link
                                    href={`/${studioSlug}?section=portafolio`}
                                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-transparent border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 rounded-lg transition-colors"
                                    onClick={onClose}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    <span>Ver otros portafolios</span>
                                </Link>

                                <button
                                    onClick={onClose}
                                    className="w-full px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md lg:bg-black/80"
                onClick={handleClose}
            />

            {/* Modal Container - Full screen en mobile, centrado en desktop */}
            <div className="relative w-full h-full lg:w-auto lg:h-auto lg:max-w-md lg:mx-auto lg:p-4 flex items-center justify-center">
                <div className="relative w-full h-full lg:w-full lg:h-auto lg:max-h-[95vh] overflow-hidden bg-zinc-900/95 backdrop-blur-xl lg:rounded-lg flex flex-col lg:border lg:border-zinc-800/50 lg:shadow-2xl">
                    {/* Header - Fixed con backdrop-blur */}
                    <div className="shrink-0 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/50 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 mr-3">
                                <h1 className="font-semibold text-zinc-100 text-lg">
                                    {portfolio.title.length > 20
                                        ? `${portfolio.title.slice(0, 20)}...`
                                        : portfolio.title}
                                </h1>
                                {portfolio.category && (
                                    <p className="text-xs text-zinc-400">
                                        {portfolio.category}
                                    </p>
                                )}
                            </div>

                            {/* Actions: Share/Restore + Navigation + Close */}
                            <div className="flex items-center gap-2">
                                {/* Restore button - Solo si está archivado */}
                                {isArchived && onRestore ? (
                                    <button
                                        onClick={onRestore}
                                        className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                                        aria-label="Restaurar"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Restaurar</span>
                                    </button>
                                ) : (
                                    <>
                                        {/* Share button - Solo si NO está archivado y NO está oculto */}
                                        {!hideShareButton && (
                                            <button
                                                onClick={handleCopyLink}
                                                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
                                                aria-label="Compartir"
                                            >
                                                <Link2 className="w-5 h-5" />
                                            </button>
                                        )}

                                        {/* Navigation buttons - Solo si NO está archivado */}
                                        {(hasPrev || hasNext) && (
                                            <>
                                                {!hideShareButton && <div className="h-5 w-px bg-zinc-700" />}
                                                <button
                                                    onClick={onPrev}
                                                    disabled={!hasPrev}
                                                    className={`p-2 rounded-full transition-colors ${hasPrev
                                                        ? 'hover:bg-zinc-800 text-zinc-400'
                                                        : 'text-zinc-700 cursor-not-allowed'
                                                        }`}
                                                    aria-label="Portafolio anterior"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={onNext}
                                                    disabled={!hasNext}
                                                    className={`p-2 rounded-full transition-colors ${hasNext
                                                        ? 'hover:bg-zinc-800 text-zinc-400'
                                                        : 'text-zinc-700 cursor-not-allowed'
                                                        }`}
                                                    aria-label="Siguiente portafolio"
                                                >
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                                <div className="h-5 w-px bg-zinc-700" />
                                            </>
                                        )}
                                    </>
                                )}

                                {/* Close button - Siempre visible */}
                                <button
                                    onClick={handleClose}
                                    className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
                                    aria-label="Cerrar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content - Con scroll interno */}
                    <div
                        ref={contentRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden p-4"
                    >
                        <PortfolioDetailSection
                            portfolio={{
                                ...portfolio,
                                caption: portfolio.caption || null,
                                tags: portfolio.tags || [],
                                is_featured: portfolio.is_featured || false,
                                is_published: true,
                                published_at: portfolio.published_at || null,
                                view_count: portfolio.view_count || 0,
                                media: portfolio.media || [],
                                cover_index: portfolio.cover_index || 0,
                                content_blocks: (portfolio.content_blocks || []) as ContentBlock[],
                                event_type: portfolio.event_type || null
                            }}
                            hideHeader={true}
                        />
                    </div>

                    {/* Footer - Botón cerrar discreto */}
                    <div className="shrink-0 py-2 px-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                        <button
                            onClick={handleClose}
                            className="w-full py-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
