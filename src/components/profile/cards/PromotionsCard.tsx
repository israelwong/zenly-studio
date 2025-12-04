'use client';

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { PublicPaquete } from '@/types/public-profile';
import { PaqueteCard } from '../sections/PaqueteCard';
import { PaqueteCarousel } from '../sections/PaqueteCarousel';

interface PromotionsCardProps {
    paquetes: PublicPaquete[];
    onViewAll?: () => void;
}

/**
 * PromotionsCard - Card de promociones/paquetes destacados para sidebar
 * Muestra paquetes con is_featured=true usando componentes existentes
 */
export function PromotionsCard({ paquetes, onViewAll }: PromotionsCardProps) {
    // Filtrar solo paquetes destacados
    const featuredPaquetes = paquetes.filter(p => p.is_featured);

    // No mostrar card si no hay promociones
    if (featuredPaquetes.length === 0) {
        return null;
    }

    const hasMultiple = featuredPaquetes.length > 1;

    return (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <h3 className="text-base font-semibold text-zinc-100">
                        Promociones
                    </h3>
                </div>
                {featuredPaquetes.length > 1 && (
                    <span className="text-xs text-zinc-400">
                        {featuredPaquetes.length} ofertas
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="space-y-4">
                {hasMultiple ? (
                    <PaqueteCarousel paquetes={featuredPaquetes} />
                ) : (
                    <PaqueteCard paquete={featuredPaquetes[0]} />
                )}
            </div>

            {/* View all link */}
            {onViewAll && (
                <button
                    onClick={onViewAll}
                    className="w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors py-2 border-t border-zinc-800/50"
                >
                    Ver todos los paquetes
                    <ArrowRight className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
