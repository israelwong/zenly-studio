'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { X } from 'lucide-react';
import { OfferCard } from './cards/OfferCard';

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
    event_type_name?: string | null;
    banner_destination?: "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING";
}

interface PromoIslandProps {
    offers: PublicOffer[];
    studioSlug: string;
    studioId: string;
    ownerUserId?: string | null;
}

/**
 * PromoIsland - Isla de ofertas flotante con carrusel swipeable
 * Posicionada fixed bottom-24, con scroll horizontal nativo
 */
export function PromoIsland({ offers, studioSlug, studioId, ownerUserId }: PromoIslandProps) {
    const [isVisible, setIsVisible] = useState(false);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!offers || offers.length === 0) {
            console.log('[PromoIsland] No offers available');
            return;
        }

        // Limpiar sessionStorage si existe (para que se muestre de nuevo)
        const sessionKey = `promo-island-closed-${studioId}`;
        if (sessionStorage.getItem(sessionKey) === 'true') {
            sessionStorage.removeItem(sessionKey);
        }

        // Mostrar siempre si hay ofertas
        setIsVisible(true);
    }, [offers, studioId]);

    const handleClose = () => {
        startTransition(() => {
            setIsVisible(false);
            // No guardar en sessionStorage - permitir que se muestre de nuevo al recargar
        });
    };

    if (!isVisible || !offers || offers.length === 0) {
        return null;
    }

    return (
        <div
            className="fixed left-4 right-4 z-40 lg:hidden pointer-events-none"
            style={{ bottom: 'calc(var(--vabar-height, 80px)' }}
        >
            <div className="relative p-4 pointer-events-auto">
                {/* Botón cerrar */}
                <button
                    onClick={handleClose}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full text-zinc-300 hover:text-zinc-100 bg-zinc-900/80 hover:bg-zinc-800/90 backdrop-blur-sm transition-colors"
                    aria-label="Cerrar ofertas"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Carrusel swipeable - Solo si hay múltiples ofertas */}
                {offers.length > 1 ? (
                    <div
                        ref={scrollRef}
                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4"
                    >
                        {offers.map((offer) => (
                            <div
                                key={offer.id}
                                className="shrink-0 w-[calc(100vw-4rem)] snap-center"
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
                ) : (
                    // Una sola oferta - sin carrusel
                    <OfferCard
                        offer={offers[0]}
                        studioId={studioId}
                        studioSlug={studioSlug}
                        ownerUserId={ownerUserId}
                        variant="compact"
                    />
                )}
            </div>
        </div>
    );
}
