'use client';

import React, { useState } from 'react';
import { Package, ChevronRight, Clock } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';
import type { PublicPaquete } from '@/types/public-promise';
import { PaqueteDetailSheet } from './PaqueteDetailSheet';
import { getTotalServicios, getFirstServicios } from '@/lib/utils/public-promise';

interface PaquetesSectionProps {
    paquetes: PublicPaquete[];
    promiseId: string;
    studioSlug: string;
    showAsAlternative?: boolean;
}

export function PaquetesSection({
    paquetes,
    promiseId,
    studioSlug,
    showAsAlternative = false,
}: PaquetesSectionProps) {
    const [selectedPaquete, setSelectedPaquete] = useState<PublicPaquete | null>(null);

    if (paquetes.length === 0) {
        return null;
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    return (
        <>
            <section className="py-8 md:py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="h-5 w-5 text-blue-400" />
                            <h2 className="text-2xl md:text-3xl font-bold text-white">
                                {showAsAlternative ? 'Paquetes Alternativos' : 'Paquetes Disponibles'}
                            </h2>
                        </div>
                        <p className="text-zinc-400">
                            {showAsAlternative
                                ? 'Explora otras opciones que podrían interesarte'
                                : 'Conoce nuestros paquetes predefinidos con excelente relación precio-calidad'}
                        </p>
                    </div>

                    {/* Grid de paquetes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paquetes.map((paquete) => {
                            return (
                                <ZenCard
                                    key={paquete.id}
                                    className="bg-zinc-900/50 border-zinc-800 hover:border-blue-500/50 transition-all duration-200 cursor-pointer group"
                                    onClick={() => setSelectedPaquete(paquete)}
                                >
                                    <ZenCardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <ZenCardTitle className="text-white group-hover:text-blue-400 transition-colors">
                                                    {paquete.name}
                                                </ZenCardTitle>
                                                {paquete.description && (
                                                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                                                        {paquete.description}
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                                        </div>
                                    </ZenCardHeader>

                                    <ZenCardContent>
                                        {/* Precio */}
                                        <div className="mb-4">
                                            <p className="text-2xl font-bold text-blue-400">
                                                {formatPrice(paquete.price)}
                                            </p>
                                        </div>

                                        {/* Servicios preview */}
                                        <div className="space-y-2">
                                            {(() => {
                                                const totalServicios = getTotalServicios(paquete.servicios);
                                                const primerosServicios = getFirstServicios(paquete.servicios, 2);
                                                return (
                                                    <>
                                                        <p className="text-xs text-zinc-500 font-medium">
                                                            Incluye {totalServicios} servicio
                                                            {totalServicios !== 1 ? 's' : ''}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {primerosServicios.map((servicio) => (
                                                                <ZenBadge
                                                                    key={servicio.id}
                                                                    variant="outline"
                                                                    className="bg-zinc-800/50 text-zinc-300 border-zinc-700 text-xs px-2 py-0.5"
                                                                >
                                                                    {servicio.name}
                                                                </ZenBadge>
                                                            ))}
                                                            {totalServicios > 2 && (
                                                                <ZenBadge
                                                                    variant="outline"
                                                                    className="bg-zinc-800/50 text-zinc-400 border-zinc-700 text-xs px-2 py-0.5"
                                                                >
                                                                    +{totalServicios - 2} más
                                                                </ZenBadge>
                                                            )}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Tiempo mínimo de contratación */}
                                        {paquete.tiempo_minimo_contratacion && (
                                            <div className="mt-3 pt-3 border-t border-zinc-800">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3 w-3 text-amber-400" />
                                                    <span className="text-xs text-zinc-400">
                                                        Requiere {paquete.tiempo_minimo_contratacion} días de anticipación
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </ZenCardContent>
                                </ZenCard>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Sheet de detalle */}
            {selectedPaquete && (
                <PaqueteDetailSheet
                    paquete={selectedPaquete}
                    isOpen={!!selectedPaquete}
                    onClose={() => setSelectedPaquete(null)}
                    promiseId={promiseId}
                    studioSlug={studioSlug}
                />
            )}
        </>
    );
}

