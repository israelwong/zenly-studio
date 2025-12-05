'use client';

import React from 'react';
import { Sparkles, ArrowRight, Plus } from 'lucide-react';
import { OfferCardWithTracking } from './OfferCardWithTracking';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
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

    const handleCreateOffer = () => {
        window.open(`/${studioSlug}/studio/commercial/ofertas/nuevo`, '_blank');
    };

    return (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <h3 className="text-base font-semibold text-zinc-100">
                        Ofertas Especiales
                    </h3>
                </div>
                {user ? (
                    <button
                        onClick={handleCreateOffer}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                        aria-label="Crear oferta"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Crear
                    </button>
                ) : offers.length > 1 ? (
                    <span className="text-xs text-zinc-400">
                        {offers.length} {offers.length === 1 ? 'oferta' : 'ofertas'}
                    </span>
                ) : null}
            </div>

            {/* Content */}
            <div className="space-y-3">
                {displayOffers.map((offer) => (
                    <OfferCardWithTracking
                        key={offer.id}
                        offer={offer}
                        studioId={studioId || ''}
                        studioSlug={studioSlug}
                        ownerUserId={ownerUserId}
                        showMenu={!!user}
                    />
                ))}
            </div>

            {/* View all link */}
            {offers.length > 3 && (
                <button
                    onClick={() => window.location.href = `/${studioSlug}#ofertas`}
                    className="w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors py-2 border-t border-zinc-800/50"
                >
                    Ver todas las ofertas
                    <ArrowRight className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
