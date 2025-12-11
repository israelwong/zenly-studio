'use client';

import React, { useState, useRef, useEffect } from 'react';
import { OfferCard } from '../cards/OfferCard';
import { cn } from '@/lib/utils';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
    discount_percentage?: number | null;
    is_permanent?: boolean;
    has_date_range?: boolean;
    start_date?: string | null;
    valid_until?: string | null;
}

interface MobilePromotionsSectionProps {
    offers: PublicOffer[];
    activeTab: string;
    studioSlug: string;
    studioId?: string;
    ownerUserId?: string | null;
}

/**
 * MobilePromotionsSection - Carousel de ofertas para mobile
 * Diseño estilo Apple con autoplay y indicadores de paginación
 */
export function MobilePromotionsSection({
    offers,
    activeTab,
    studioSlug,
    studioId = '',
    ownerUserId
}: MobilePromotionsSectionProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const autoplayTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const restartTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // No mostrar si no hay ofertas
    if (!offers || offers.length === 0) {
        return null;
    }

    // Detectar scroll para actualizar indicador
    const handleScroll = () => {
        if (!scrollRef.current) return;
        const scrollLeft = scrollRef.current.scrollLeft;
        const cardWidth = scrollRef.current.scrollWidth / offers.length;
        const index = Math.round(scrollLeft / cardWidth);
        setActiveIndex(index);
    };

    // Autoplay con loop infinito cada 3 segundos
    useEffect(() => {
        if (offers.length <= 1) return;

        autoplayTimerRef.current = setInterval(() => {
            setActiveIndex((prevIndex) => {
                const nextIndex = (prevIndex + 1) % offers.length;

                // Scroll usando ref actualizado
                if (scrollRef.current) {
                    const cardWidth = scrollRef.current.scrollWidth / offers.length;
                    scrollRef.current.scrollTo({
                        left: cardWidth * nextIndex,
                        behavior: 'smooth'
                    });
                }

                return nextIndex;
            });
        }, 3000);

        return () => {
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current);
            }
            if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current);
            }
        };
    }, [offers.length]);

    // Pausar autoplay al interactuar manualmente
    const handleManualScroll = () => {
        // Limpiar timers existentes
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
        }
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
        }

        handleScroll();

        // Reiniciar autoplay después de 5 segundos de inactividad
        restartTimerRef.current = setTimeout(() => {
            if (offers.length > 1) {
                autoplayTimerRef.current = setInterval(() => {
                    setActiveIndex((prevIndex) => {
                        const nextIndex = (prevIndex + 1) % offers.length;

                        if (scrollRef.current) {
                            const cardWidth = scrollRef.current.scrollWidth / offers.length;
                            scrollRef.current.scrollTo({
                                left: cardWidth * nextIndex,
                                behavior: 'smooth'
                            });
                        }

                        return nextIndex;
                    });
                }, 3000);
            }
        }, 5000);
    };

    return (
        <div className="mt-5 mb-1 px-4">
            {/* Label fijo */}
            {/* <h3 className="text-sm font-semibold text-zinc-100 mb-3">
                Ofertas Especiales
            </h3> */}

            {/* Carousel */}
            <div
                ref={scrollRef}
                onScroll={handleManualScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
            >
                {offers.map((offer) => (
                    <div
                        key={offer.id}
                        className="shrink-0 w-[calc(100vw-2rem)] snap-center"
                    >
                        <OfferCard
                            offer={offer}
                            studioId={studioId}
                            studioSlug={studioSlug}
                            ownerUserId={ownerUserId}
                            variant="compact"
                        />
                    </div>
                ))}
            </div>

            {/* Indicadores de paginación */}
            {offers.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-4">
                    {offers.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                // Limpiar timers
                                if (autoplayTimerRef.current) {
                                    clearInterval(autoplayTimerRef.current);
                                }
                                if (restartTimerRef.current) {
                                    clearTimeout(restartTimerRef.current);
                                }

                                // Scroll a índice
                                if (scrollRef.current) {
                                    const cardWidth = scrollRef.current.scrollWidth / offers.length;
                                    scrollRef.current.scrollTo({
                                        left: cardWidth * index,
                                        behavior: 'smooth'
                                    });
                                }
                                setActiveIndex(index);

                                // Reiniciar autoplay después de 5 segundos
                                restartTimerRef.current = setTimeout(() => {
                                    if (offers.length > 1) {
                                        autoplayTimerRef.current = setInterval(() => {
                                            setActiveIndex((prevIndex) => {
                                                const nextIndex = (prevIndex + 1) % offers.length;

                                                if (scrollRef.current) {
                                                    const cardWidth = scrollRef.current.scrollWidth / offers.length;
                                                    scrollRef.current.scrollTo({
                                                        left: cardWidth * nextIndex,
                                                        behavior: 'smooth'
                                                    });
                                                }

                                                return nextIndex;
                                            });
                                        }, 3000);
                                    }
                                }, 5000);
                            }}
                            className={cn(
                                "h-1.5 rounded-full transition-all",
                                index === activeIndex
                                    ? "w-6 bg-zinc-100"
                                    : "w-1.5 bg-zinc-600 hover:bg-zinc-500"
                            )}
                            aria-label={`Ir a oferta ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
