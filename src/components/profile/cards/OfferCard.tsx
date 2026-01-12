'use client';

import React, { useEffect, useRef } from 'react';
import { useContentAnalytics } from '@/hooks/useContentAnalytics';
import { OfferCardMenu } from './OfferCardMenu';
import { OfferCardPreview } from '@/components/previews/OfferCardPreview';

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
    banner_destination?: "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING";
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
 * Usa OfferCardPreview para mantener consistencia de diseño
 * 
 * Variants:
 * - desktop: Horizontal con imagen w-28 h-28 (sidebar)
 * - compact: Horizontal con imagen w-20 h-20 (mobile carousel)
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
                href={offer.banner_destination === "LEADFORM_ONLY" || offer.banner_destination === "LEADFORM_WITH_LANDING"
                    ? `/${studioSlug}/offer/${offer.slug}/leadform`
                    : `/${studioSlug}/offer/${offer.slug}`}
                onClick={handleClick}
                className="block"
            >
                <OfferCardPreview
                    name={offer.name}
                    description={offer.description || undefined}
                    coverMediaUrl={offer.cover_media_url}
                    coverMediaType={offer.cover_media_type}
                    discountPercentage={offer.discount_percentage}
                    validUntil={offer.valid_until || null}
                    isPermanent={offer.is_permanent}
                    hasDateRange={offer.has_date_range}
                    startDate={offer.start_date || null}
                    eventTypeName={offer.event_type_name || null}
                    variant={variant}
                />
            </a>
        </div>
    );
}
