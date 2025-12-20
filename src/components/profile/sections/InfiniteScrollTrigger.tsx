'use client';

import React, { useEffect, useRef } from 'react';

interface InfiniteScrollTriggerProps {
    onVisible: () => void;
    rootMargin?: string;
}

/**
 * InfiniteScrollTrigger - Trigger invisible para infinite scroll
 * Ejecuta callback cuando entra en viewport
 */
export function InfiniteScrollTrigger({ 
    onVisible, 
    rootMargin = '400px' 
}: InfiniteScrollTriggerProps) {
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onVisible();
                }
            },
            { 
                rootMargin, // Pre-cargar antes de que sea visible
                threshold: 0 
            }
        );

        if (triggerRef.current) {
            observer.observe(triggerRef.current);
        }

        return () => observer.disconnect();
    }, [onVisible, rootMargin]);

    return <div ref={triggerRef} className="h-4" aria-hidden="true" />;
}
