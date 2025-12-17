'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Package, ChevronRight, Clock, Star } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';
import type { PublicPaquete } from '@/types/public-promise';
import { PaqueteDetailSheet } from './PaqueteDetailSheet';
import { getTotalServicios, getFirstServicios } from '@/lib/utils/public-promise';
import { cn } from '@/lib/utils';

interface CondicionComercial {
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    discount_percentage: number | null;
    metodos_pago: Array<{
        id: string;
        metodo_pago_id: string;
        metodo_pago_name: string;
    }>;
}

interface TerminoCondicion {
    id: string;
    title: string;
    content: string;
    is_required: boolean;
}

interface PaquetesSectionProps {
    paquetes: PublicPaquete[];
    promiseId: string;
    studioSlug: string;
    showAsAlternative?: boolean;
    condicionesComerciales?: CondicionComercial[];
    terminosCondiciones?: TerminoCondicion[];
    minDaysToHire?: number;
    showCategoriesSubtotals?: boolean;
    showItemsPrices?: boolean;
}

export function PaquetesSection({
    paquetes,
    promiseId,
    studioSlug,
    showAsAlternative = false,
    condicionesComerciales,
    terminosCondiciones,
    minDaysToHire,
    showCategoriesSubtotals = false,
    showItemsPrices = false,
}: PaquetesSectionProps) {
    const [selectedPaquete, setSelectedPaquete] = useState<PublicPaquete | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [autoplayEnabled, setAutoplayEnabled] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const autoplayTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

    // Detectar scroll para actualizar indicador
    const handleScroll = () => {
        if (!scrollRef.current) return;
        const scrollLeft = scrollRef.current.scrollLeft;
        const cardWidth = scrollRef.current.scrollWidth / paquetes.length;
        const index = Math.round(scrollLeft / cardWidth);
        setActiveIndex(index);
    };

    // Autoplay con loop infinito cada 4 segundos
    useEffect(() => {
        if (paquetes.length <= 1 || !autoplayEnabled) return;

        autoplayTimerRef.current = setInterval(() => {
            setActiveIndex((prevIndex) => {
                const nextIndex = (prevIndex + 1) % paquetes.length;

                if (scrollRef.current) {
                    const cardWidth = scrollRef.current.scrollWidth / paquetes.length;
                    scrollRef.current.scrollTo({
                        left: cardWidth * nextIndex,
                        behavior: 'smooth'
                    });
                }

                return nextIndex;
            });
        }, 4000);

        return () => {
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current);
            }
        };
    }, [paquetes.length, autoplayEnabled]);

    // Desactivar autoplay permanentemente al hacer scroll manual
    const handleManualScroll = () => {
        // Desactivar autoplay permanentemente
        setAutoplayEnabled(false);

        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
        }

        handleScroll();
    };

    return (
        <>
            <section className="py-8 md:py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="h-5 w-5 text-blue-400" />
                            <h2 className="text-xl md:text-3xl font-bold text-white">
                                {showAsAlternative ? 'Paquetes Prediseñados' : 'Paquetes Disponibles'}
                            </h2>
                        </div>
                        <p className="text-zinc-400">
                            {showAsAlternative
                                ? 'Explora otras opciones que podrían interesarte'
                                : 'Conoce nuestros paquetes predefinidos con excelente relación precio-calidad'}
                        </p>
                    </div>

                    {/* Carousel de paquetes */}
                    <div
                        ref={scrollRef}
                        onScroll={handleManualScroll}
                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none"
                    >
                        {paquetes.map((paquete) => {
                            return (
                                <div
                                    key={paquete.id}
                                    className="shrink-0 w-[calc(100vw-2rem)] snap-center md:w-auto md:shrink"
                                >
                                    <ZenCard
                                        className="bg-zinc-900/50 border-zinc-800 hover:border-blue-500/50 transition-all duration-200 cursor-pointer group h-full overflow-hidden"
                                        onClick={() => setSelectedPaquete(paquete)}
                                    >
                                        <div className="flex items-stretch gap-4 p-4">
                                            {/* Cover cuadrado */}
                                            <div className="relative w-24 h-24 flex-shrink-0 bg-zinc-800 rounded overflow-hidden">
                                                {paquete.cover_url ? (
                                                    <Image
                                                        src={paquete.cover_url}
                                                        alt={paquete.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                                                        sizes="96px"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                                        <Package className="w-8 h-8 text-zinc-600" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                {/* Header */}
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                                                                {paquete.name}
                                                            </h3>
                                                            {paquete.recomendado && (
                                                                <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                                                    <Star className="h-3 w-3 fill-amber-400" />
                                                                    <span className="text-[8px] font-bold uppercase tracking-wide">Más vendido</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {paquete.description && (
                                                            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                                                                {paquete.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                                </div>

                                                {/* Footer */}
                                                <div className="mt-auto space-y-1">
                                                    {/* Precio */}
                                                    <p className="text-xl font-bold text-blue-400">
                                                        {formatPrice(paquete.price)}
                                                    </p>

                                                </div>
                                            </div>
                                        </div>
                                    </ZenCard>
                                </div>
                            );
                        })}
                    </div>

                    {/* Indicadores de paginación - Solo mobile */}
                    {paquetes.length > 1 && (
                        <div className="flex justify-center gap-1.5 mt-4 md:hidden">
                            {paquetes.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        // Desactivar autoplay permanentemente
                                        setAutoplayEnabled(false);

                                        if (autoplayTimerRef.current) {
                                            clearInterval(autoplayTimerRef.current);
                                        }

                                        if (scrollRef.current) {
                                            const cardWidth = scrollRef.current.scrollWidth / paquetes.length;
                                            scrollRef.current.scrollTo({
                                                left: cardWidth * index,
                                                behavior: 'smooth'
                                            });
                                        }
                                        setActiveIndex(index);
                                    }}
                                    className={cn(
                                        "h-1.5 rounded-full transition-all",
                                        index === activeIndex
                                            ? "w-6 bg-blue-400"
                                            : "w-1.5 bg-zinc-600 hover:bg-zinc-500"
                                    )}
                                    aria-label={`Ir a paquete ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
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
                    condicionesComerciales={condicionesComerciales}
                    terminosCondiciones={terminosCondiciones}
                    showCategoriesSubtotals={false}
                    showItemsPrices={false}
                    minDaysToHire={minDaysToHire}
                />
            )}
        </>
    );
}

