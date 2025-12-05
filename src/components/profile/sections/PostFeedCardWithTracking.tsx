'use client';

import React, { useEffect, useRef } from 'react';
import { PostFeedCard } from './PostFeedCard';
import { useContentAnalytics } from '@/hooks/useContentAnalytics';

interface PostMedia {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    thumbnail_url?: string;
    display_order: number;
}

interface PostFeedCardWithTrackingProps {
    post: {
        id: string;
        slug: string;
        title?: string | null;
        caption: string | null;
        tags?: string[];
        media: PostMedia[];
        is_published: boolean;
        is_featured?: boolean;
        published_at: Date | null;
        view_count?: number;
    };
    studioId: string;
    ownerUserId?: string | null;
    onPostClick?: (postSlug: string) => void;
}

/**
 * PostFeedCardWithTracking - Wrapper de PostFeedCard con analytics
 * Trackea FEED_VIEW usando Intersection Observer
 * 
 * Criterios de vista:
 * - Post visible ≥50% del área
 * - Durante ≥1 segundo
 * - Solo una vez por sesión
 */
export function PostFeedCardWithTracking({ 
    post, 
    studioId,
    ownerUserId,
    onPostClick 
}: PostFeedCardWithTrackingProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const hasTrackedView = useRef(false);
    const viewTimer = useRef<NodeJS.Timeout>();

    const analytics = useContentAnalytics({
        studioId,
        contentType: 'POST',
        contentId: post.id,
        ownerUserId,
    });

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Post visible al menos 50%
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
                threshold: 0.5, // 50% del post visible
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

    return (
        <div ref={cardRef}>
            <PostFeedCard 
                post={post} 
                onPostClick={onPostClick}
            />
        </div>
    );
}
