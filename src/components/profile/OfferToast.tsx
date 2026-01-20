'use client';

import React, { useState, useEffect } from 'react';
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

interface OfferToastProps {
    offers: PublicOffer[];
    studioSlug: string;
    studioId: string;
    ownerUserId?: string | null;
}

/**
 * OfferToast - Toast dismissible para mostrar ofertas
 * Se muestra arriba, se puede cerrar y guarda el estado en localStorage
 */
export function OfferToast({ offers, studioSlug, studioId, ownerUserId }: OfferToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!offers || offers.length === 0) return;

        // Verificar si el usuario cerró el toast para este estudio
        const storageKey = `offer-toast-closed-${studioId}`;
        const isClosed = localStorage.getItem(storageKey) === 'true';

        if (!isClosed) {
            setIsVisible(true);
        }
    }, [offers, studioId]);

    const handleClose = () => {
        setIsVisible(false);
        // Guardar en localStorage que se cerró
        const storageKey = `offer-toast-closed-${studioId}`;
        localStorage.setItem(storageKey, 'true');
    };

    if (!isVisible || !offers || offers.length === 0) {
        return null;
    }

    // Mostrar solo la primera oferta
    const firstOffer = offers[0];

    return (
        <div className="absolute bottom-4 left-0 right-0 z-50 lg:left-auto lg:right-0 lg:max-w-md pointer-events-none">
            <div className="relative bg-gradient-to-br from-zinc-900/80 via-zinc-800/70 to-zinc-900/80 backdrop-blur-xl rounded-lg border border-zinc-700/30 shadow-2xl p-4 pointer-events-auto 
                before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/5 before:via-transparent before:to-transparent before:pointer-events-none
                after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-t after:from-black/10 after:via-transparent after:to-transparent after:pointer-events-none">
                {/* Botón cerrar */}
                <button
                    onClick={handleClose}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full text-zinc-300 hover:text-zinc-100 bg-zinc-900/80 hover:bg-zinc-800/90 backdrop-blur-sm transition-colors"
                    aria-label="Cerrar oferta"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Oferta */}
                <OfferCard
                    offer={firstOffer}
                    studioId={studioId}
                    studioSlug={studioSlug}
                    ownerUserId={ownerUserId}
                    variant="compact"
                />
            </div>
        </div>
    );
}
