'use client';

import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Link2, X } from 'lucide-react';
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
}

/**
 * PortfolioDetailModal - Modal para mostrar portafolio completo
 * Replica la misma UX que PostDetailModal con tracking incluido
 */
export function PortfolioDetailModal({
    portfolio,
    studioId,
    ownerUserId,
    isOpen,
    onClose,
    onNext,
    onPrev,
    hasNext = false,
    hasPrev = false
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

    if (!isOpen || !portfolio) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={handleClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-md mx-auto p-0 sm:p-4 flex items-center justify-center max-h-screen">
                <div className="relative w-full h-auto max-h-[95vh] overflow-hidden bg-zinc-900/95 backdrop-blur-xl sm:rounded-lg flex flex-col border border-zinc-800/50 shadow-2xl">
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

                            {/* Actions: Share + Navigation + Close */}
                            <div className="flex items-center gap-2">
                                {/* Share button */}
                                <button
                                    onClick={handleCopyLink}
                                    className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
                                    aria-label="Compartir"
                                >
                                    <Link2 className="w-5 h-5" />
                                </button>

                                {/* Navigation buttons */}
                                {(hasPrev || hasNext) && (
                                    <>
                                        <div className="h-5 w-px bg-zinc-700" />
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

                                {/* Close button */}
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
