'use client';

import React, { useRef, useEffect } from 'react';
import { PortfolioFeedCard } from './PortfolioFeedCard';
import { useContentAnalytics } from '@/hooks/useContentAnalytics';

interface PortfolioFeedCardWithTrackingProps {
    portfolio: {
        id: string;
        slug: string;
        title: string;
        category?: string | null;
        cover_image_url?: string | null;
        items: Array<{ id: string }>;
        view_count?: number;
    };
    studioId: string;
    ownerUserId?: string | null;
    onPortfolioClick?: (portfolioSlug: string) => void;
}

/**
 * PortfolioFeedCardWithTracking - Wrapper para PortfolioFeedCard con analytics
 * Trackea FEED_VIEW cuando el card es visible ≥50% por ≥1 segundo
 * Equivalente a PostFeedCardWithTracking
 */
export function PortfolioFeedCardWithTracking({
    portfolio,
    studioId,
    ownerUserId,
    onPortfolioClick
}: PortfolioFeedCardWithTrackingProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const hasTrackedView = useRef(false);
    const viewTimer = useRef<NodeJS.Timeout>();

    const analytics = useContentAnalytics({
        studioId,
        contentType: 'PORTFOLIO',
        contentId: portfolio.id,
        ownerUserId,
    });

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Portfolio visible al menos 50%
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {

                    // Iniciar timer de 1 segundo para confirmar vista
                    if (!hasTrackedView.current && !viewTimer.current) {
                        viewTimer.current = setTimeout(() => {
                            // Verificar que sigue visible después de 1s
                            if (entry.isIntersecting && !hasTrackedView.current) {
                                hasTrackedView.current = true;
                                analytics.trackOnce('FEED_VIEW');
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
                threshold: 0.5, // 50% del portfolio visible
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
    }, [analytics, portfolio.id]);

    return (
        <div ref={cardRef}>
            <PortfolioFeedCard
                portfolio={portfolio}
                onPortfolioClick={onPortfolioClick}
            />
        </div>
    );
}
