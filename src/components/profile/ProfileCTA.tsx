'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { Sparkles, ArrowRight } from 'lucide-react';

/**
 * ProfileCTA - Componente reutilizable para CTAs del perfil
 * Migrado desde HeroCTA del perfil público con mejor naming
 * 
 * Usado en:
 * - Perfil público (CTA promocional)
 * - Builder preview (preview de CTA)
 */
export function ProfileCTA() {
    const handleCTAClick = () => {
        // TODO: Implement CTA action (redirect to booking, contact, etc.)
        console.log('Hero CTA clicked');
    };

    return (
        <ZenCard className="lg:sticky lg:top-4">
            <ZenCardHeader>
                <ZenCardTitle className="flex items-center gap-2 text-purple-400">
                    <Sparkles className="h-5 w-5" />
                    Oferta Especial
                </ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent className="space-y-4">
                {/* Hero Image Placeholder */}
                <div className="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                        <Sparkles className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm font-medium">¡Reserva tu sesión!</p>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-zinc-100">
                        Sesión de Fotos Profesional
                    </h3>

                    <p className="text-sm text-zinc-400">
                        Captura momentos únicos con nuestro equipo profesional.
                        Incluye edición y entrega digital.
                    </p>

                    {/* Features */}
                    <ul className="space-y-2 text-sm text-zinc-300">
                        <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                            Fotografía profesional
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                            Edición incluida
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                            Entrega digital
                        </li>
                    </ul>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-purple-400">$2,500</span>
                        <span className="text-sm text-zinc-500 line-through">$3,000</span>
                    </div>
                </div>

                {/* CTA Button */}
                <ZenButton
                    onClick={handleCTAClick}
                    className="w-full flex items-center gap-2"
                >
                    Reservar Ahora
                    <ArrowRight className="h-4 w-4" />
                </ZenButton>

                {/* Additional Info */}
                <p className="text-xs text-zinc-500 text-center">
                    Oferta válida hasta fin de mes
                </p>
            </ZenCardContent>
        </ZenCard>
    );
}
