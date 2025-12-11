'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { OfferCard } from './OfferCard';
import { useAuth } from '@/contexts/AuthContext';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
    discount_percentage?: number | null;
    valid_until?: string | null;
}

interface OffersCardProps {
    offers: PublicOffer[];
    studioSlug: string;
    studioId?: string;
    ownerUserId?: string | null;
}

/**
 * OffersCard - Card de ofertas activas para sidebar
 * Muestra ofertas públicas activas del estudio
 * 
 * Smart Analytics:
 * - SIDEBAR_VIEW: Trackea cuando oferta es visible ≥50% durante ≥1s
 * - OFFER_CLICK: Trackea cuando hacen click
 */
export function OffersCard({ offers, studioSlug, studioId, ownerUserId }: OffersCardProps) {
    const { user } = useAuth();

    // No mostrar card si no hay ofertas
    if (!offers || offers.length === 0) {
        return null;
    }

    // Mostrar máximo 3 ofertas
    const displayOffers = offers.slice(0, 3);

    return (
        <div className="space-y-3">
            {/* Ofertas - Sin card wrapper, cada una es independiente */}
            <div className="space-y-3">
                {displayOffers.map((offer) => (
                    <OfferCard
                        key={offer.id}
                        offer={offer}
                        studioId={studioId || ''}
                        studioSlug={studioSlug}
                        ownerUserId={ownerUserId}
                        showMenu={!!user}
                        variant="desktop"
                    />
                ))}
            </div>

            {/* View all link */}
            {offers.length > 3 && (
                <button
                    onClick={() => window.location.href = `/${studioSlug}#ofertas`}
                    className="w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors py-2"
                >
                    Ver todas las ofertas
                    <ArrowRight className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
