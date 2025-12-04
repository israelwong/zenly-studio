'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { PublicPaquete } from '@/types/public-profile';
import { PaqueteCard } from '../sections/PaqueteCard';

interface MobilePromotionsSectionProps {
    paquetes: PublicPaquete[];
    activeTab: string;
}

/**
 * MobilePromotionsSection - Sección inline de promociones para mobile
 * Muestra promociones destacadas en tabs específicos (no en "paquetes")
 */
export function MobilePromotionsSection({ paquetes, activeTab }: MobilePromotionsSectionProps) {
    // Filtrar solo paquetes destacados
    const featuredPaquetes = paquetes.filter(p => p.is_featured);

    // No mostrar en tab "paquetes" (para evitar duplicación)
    if (activeTab === 'paquetes') {
        return null;
    }

    // No mostrar si no hay promociones
    if (featuredPaquetes.length === 0) {
        return null;
    }

    return (
        <div className="px-4 py-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-semibold text-zinc-100">
                    Promociones Especiales
                </h3>
                {featuredPaquetes.length > 1 && (
                    <span className="text-xs text-zinc-400">
                        ({featuredPaquetes.length})
                    </span>
                )}
            </div>

            {/* Cards Grid */}
            <div className="space-y-4">
                {featuredPaquetes.map((paquete) => (
                    <PaqueteCard key={paquete.id} paquete={paquete} />
                ))}
            </div>
        </div>
    );
}
