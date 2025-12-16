'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Tag, Clock, Calendar } from 'lucide-react';
import { useContentAnalytics } from '@/hooks/useContentAnalytics';
import { OfferCardMenu } from './OfferCardMenu';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
    discount_percentage?: number | null;
    valid_until?: string | null;
    is_permanent?: boolean;
    has_date_range?: boolean;
    start_date?: string | null;
    event_type_name?: string | null;
}

interface OfferCardProps {
    offer: PublicOffer;
    studioId: string;
    studioSlug: string;
    ownerUserId?: string | null;
    showMenu?: boolean;
    variant?: 'desktop' | 'compact';
}

/**
 * OfferCard - Card de oferta unificado con variants
 * 
 * Variants:
 * - desktop: 4:3 vertical, metadata completa (sidebar)
 * - compact: 16:9 horizontal, metadata mínima (mobile carousel)
 * 
 * Analytics:
 * - SIDEBAR_VIEW: Visible ≥50% durante ≥1s
 * - OFFER_CLICK: Click en la oferta
 */
export function OfferCard({
    offer,
    studioId,
    studioSlug,
    ownerUserId,
    showMenu = false,
    variant = 'desktop'
}: OfferCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const hasTrackedView = useRef(false);
    const viewTimer = useRef<NodeJS.Timeout | undefined>(undefined);

    const analytics = useContentAnalytics({
        studioId,
        contentType: 'OFFER',
        contentId: offer.id,
        ownerUserId,
    });

    // Intersection Observer para SIDEBAR_VIEW
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    if (!hasTrackedView.current && !viewTimer.current) {
                        viewTimer.current = setTimeout(() => {
                            if (entry.isIntersecting && !hasTrackedView.current) {
                                hasTrackedView.current = true;
                                analytics.trackOnce('SIDEBAR_VIEW');
                            }
                            viewTimer.current = undefined;
                        }, 1000);
                    }
                } else {
                    if (viewTimer.current) {
                        clearTimeout(viewTimer.current);
                        viewTimer.current = undefined;
                    }
                }
            },
            {
                threshold: 0.5,
                rootMargin: '0px'
            }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            observer.disconnect();
            if (viewTimer.current) {
                clearTimeout(viewTimer.current);
            }
        };
    }, [analytics]);

    const handleClick = () => {
        analytics.track('OFFER_CLICK');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    };

    // Determinar texto de vigencia
    const getValidityText = () => {
        if (offer.is_permanent) {
            return null; // No mostrar vigencia si es permanente
        }

        if (offer.has_date_range && offer.start_date && offer.valid_until) {
            return `Válido del ${formatDate(offer.start_date)} al ${formatDate(offer.valid_until)}`;
        }

        if (offer.valid_until) {
            return `Válido hasta ${formatDate(offer.valid_until)}`;
        }

        return null;
    };

    const validityText = getValidityText();
    const isCompact = variant === 'compact';

    return (
        <div ref={cardRef} className="relative">
            {/* Menu contextual */}
            {showMenu && (
                <div className="absolute top-2 right-2 z-10">
                    <OfferCardMenu
                        offerId={offer.id}
                        studioSlug={studioSlug}
                    />
                </div>
            )}

            <a
                href={`/${studioSlug}/offer/${offer.slug}`}
                onClick={handleClick}
                className="block"
            >
                {isCompact ? (
                    // Compact variant: Horizontal layout para mobile carousel
                    <div className="bg-purple-950/10 rounded-lg border border-purple-900/40 transition-all group">
                        <div className="flex items-center gap-3 p-3">
                            {/* Cover - Un poco más grande */}
                            <div className="relative w-20 h-20 flex-shrink-0 bg-zinc-800 rounded overflow-hidden">
                                {offer.cover_media_url ? (
                                    offer.cover_media_type === 'video' ? (
                                        <video
                                            src={offer.cover_media_url}
                                            className="w-full h-full object-cover"
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        <Image
                                            src={offer.cover_media_url}
                                            alt={offer.name}
                                            fill
                                            className="object-cover"
                                            sizes="64px"
                                        />
                                    )
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-900">
                                        <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Content - Compacto */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-100 group-hover:text-purple-400 transition-colors line-clamp-1">
                                    {offer.name}
                                </p>

                                {/* Descripción compacta - máximo 100 caracteres */}
                                {offer.description && (
                                    <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5 pr-4">
                                        {offer.description.length > 100
                                            ? `${offer.description.substring(0, 100)}...`
                                            : offer.description
                                        }
                                    </p>
                                )}

                                {/* Badges inline */}
                                <div className="flex items-center gap-2 mt-1">
                                    {offer.discount_percentage && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300">
                                            <Tag className="w-3 h-3" />
                                            {offer.discount_percentage}%
                                        </span>
                                    )}
                                    {validityText && (
                                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                                            <Clock className="w-3 h-3" />
                                            {validityText}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Desktop variant: Card vertical híbrido
                    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800/50 overflow-hidden transition-all group hover:border-purple-500/30">
                        {/* Media - Aspecto 4:3 vertical */}
                        <div className="relative w-full aspect-[4/3] bg-zinc-800">
                            {offer.cover_media_url ? (
                                offer.cover_media_type === 'video' ? (
                                    <video
                                        src={offer.cover_media_url}
                                        className="w-full h-full object-cover"
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                    />
                                ) : (
                                    <Image
                                        src={offer.cover_media_url}
                                        alt={offer.name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 320px"
                                    />
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                    <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}
                            
                            {/* Badge tipo evento - esquina superior derecha */}
                            {offer.event_type_name && (
                                <div className="absolute top-3 right-3">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/90 text-white backdrop-blur-sm">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {offer.event_type_name}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Content - Debajo de media */}
                        <div className="p-4 space-y-3">
                            {/* Nombre */}
                            <h3 className="text-base font-semibold text-zinc-100 group-hover:text-purple-400 transition-colors line-clamp-2">
                                {offer.name}
                            </h3>

                            {/* Descripción */}
                            {offer.description && (
                                <p className="text-sm text-zinc-400 line-clamp-2">
                                    {offer.description}
                                </p>
                            )}

                            {/* Footer - Badges */}
                            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                                {offer.discount_percentage && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-300">
                                        <Tag className="w-3.5 h-3.5" />
                                        {offer.discount_percentage}% OFF
                                    </span>
                                )}
                                {validityText && (
                                    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        {validityText}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </a>
        </div>
    );
}
