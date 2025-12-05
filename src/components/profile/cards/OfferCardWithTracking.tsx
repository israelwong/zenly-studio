'use client';

import React, { useEffect, useRef } from 'react';
import { useContentAnalytics } from '@/hooks/useContentAnalytics';
import { OfferCardMenu } from './OfferCardMenu';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
}

interface OfferCardWithTrackingProps {
    offer: PublicOffer;
    studioId: string;
    studioSlug: string;
    ownerUserId?: string | null;
    showMenu?: boolean;
}

/**
 * OfferCardWithTracking - Wrapper de oferta con analytics
 * 
 * Trackea:
 * - SIDEBAR_VIEW: Oferta visible ≥50% durante ≥1s
 * - OFFER_CLICK: Click en la oferta
 * 
 * Criterios de vista:
 * - Oferta visible ≥50% del área
 * - Durante ≥1 segundo
 * - Solo una vez por sesión
 */
export function OfferCardWithTracking({
    offer,
    studioId,
    studioSlug,
    ownerUserId,
    showMenu = false
}: OfferCardWithTrackingProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const hasTrackedView = useRef(false);
    const viewTimer = useRef<NodeJS.Timeout>();

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
                // Oferta visible al menos 50%
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {

                    // Iniciar timer de 1 segundo para confirmar vista
                    if (!hasTrackedView.current && !viewTimer.current) {
                        viewTimer.current = setTimeout(() => {
                            // Verificar que sigue visible después de 1s
                            if (entry.isIntersecting && !hasTrackedView.current) {
                                hasTrackedView.current = true;
                                analytics.trackOnce('SIDEBAR_VIEW');
                            }
                            viewTimer.current = undefined;
                        }, 1000);
                    }
                } else {
                    // Si sale del viewport, cancelar timer
                    if (viewTimer.current) {
                        clearTimeout(viewTimer.current);
                        viewTimer.current = undefined;
                    }
                }
            },
            {
                threshold: 0.5, // 50% de la oferta visible
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

    // Handler para click
    const handleClick = () => {
        analytics.track('OFFER_CLICK');
    };

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
                <div className="bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800/50 backdrop-blur-sm hover:border-purple-500/30 transition-all group">
                    {/* Cover Media */}
                    <div className="relative w-full bg-zinc-800 aspect-[4/3]">
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
                                <img
                                    src={offer.cover_media_url}
                                    alt={offer.name}
                                    className="w-full h-full object-cover"
                                />
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 border-t border-zinc-800/50">
                        <p className="text-sm font-medium text-zinc-300 group-hover:text-purple-400 transition-colors">
                            {offer.name}
                        </p>
                    </div>
                </div>
            </a>
        </div>
    );
}
