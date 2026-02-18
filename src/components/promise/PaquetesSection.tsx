'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Package, ChevronRight, ChevronLeft, Clock, Star } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge } from '@/components/ui/zen';
import { ImageSkeleton } from '@/components/ui/ImageSkeleton';
import type { PublicPaquete, PublicCotizacion } from '@/types/public-promise';
import { PaqueteDetailSheet } from './PaqueteDetailSheet';
import { ComparadorButton } from './ComparadorButton';
import { getTotalServicios, getFirstServicios } from '@/lib/utils/public-promise';
import { cn } from '@/lib/utils';
import { formatPackagePriceSimple } from '@/lib/utils/package-price-formatter';

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
    showStandardConditions?: boolean;
    showOfferConditions?: boolean;
    showPackages?: boolean;
    cotizaciones?: Array<{ id: string; paquete_origen?: { id: string } | null; selected_by_prospect?: boolean }>;
    cotizacionesCompletas?: PublicCotizacion[];
    durationHours?: number | null;
}

/**
 * ⚠️ HIGIENE UI: Componente de tarjeta de paquete con skeleton de imagen
 */
function PaqueteCard({
    paquete,
    onClick,
}: {
    paquete: PublicPaquete;
    onClick: () => void;
}) {
    const [isImageLoading, setIsImageLoading] = useState(true);

    return (
        <ZenCard
            className="bg-zinc-900/50 border-zinc-800 hover:border-blue-500/50 transition-all duration-200 cursor-pointer group h-full overflow-hidden w-full"
            onClick={onClick}
        >
                <div className="flex items-stretch gap-4 p-4">
                    {/* Cover cuadrado con skeleton */}
                    <div className="relative w-24 h-24 shrink-0 rounded overflow-hidden">
                        {paquete.cover_url ? (
                            <>
                                {/* Skeleton mientras carga */}
                                {isImageLoading && (
                                    <div className="absolute inset-0 z-10">
                                        <ImageSkeleton
                                            aspectRatio="aspect-square"
                                            className="w-full h-full"
                                        />
                                    </div>
                                )}
                                {/* Imagen */}
                                <Image
                                    src={paquete.cover_url}
                                    alt={paquete.name}
                                    fill
                                    className={cn(
                                        "object-cover group-hover:scale-105 transition-transform duration-200",
                                        isImageLoading && "opacity-0"
                                    )}
                                    sizes="96px"
                                    onLoad={() => setIsImageLoading(false)}
                                />
                            </>
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
                                            <span className="text-[8px] font-bold uppercase tracking-wide">POPULAR</span>
                                        </div>
                                    )}
                                </div>
                                {paquete.description && (
                                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                                        {paquete.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-auto space-y-2">
                            {/* Precio */}
                            <p className="text-xl font-bold text-blue-400">
                                {formatPackagePriceSimple(paquete.price)}
                            </p>
                        </div>
                    </div>
                </div>
            </ZenCard>
    );
}

export function PaquetesSection({
    paquetes,
    promiseId,
    studioSlug,
    studioId,
    showAsAlternative = false,
    condicionesComerciales,
    terminosCondiciones,
    minDaysToHire,
    showCategoriesSubtotals = false,
    showItemsPrices = false,
    showStandardConditions = true,
    showOfferConditions = false,
    showPackages = false,
    cotizaciones = [],
    cotizacionesCompletas = [],
    durationHours,
}: PaquetesSectionProps & { studioId?: string }) {
    const [selectedPaquete, setSelectedPaquete] = useState<PublicPaquete | null>(null);

    const handlePaqueteClick = (paquete: PublicPaquete) => {
        setSelectedPaquete(paquete);
    };
    const [activeIndex, setActiveIndex] = useState(0);
    const [autoplayEnabled, setAutoplayEnabled] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const autoplayTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

    if (paquetes.length === 0) {
        return null;
    }


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
            <section className="py-8 md:py-12 px-4 relative">
                {/* Línea superior con degradado */}
                <div className="absolute top-0 left-16 right-16 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                {/* Línea inferior con degradado */}
                <div className="absolute bottom-0 left-16 right-16 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="h-5 w-5 text-blue-400" />
                            <h2 className="text-xl md:text-3xl font-bold text-white">
                                {showAsAlternative 
                                    ? `${paquetes.length} ${paquetes.length === 1 ? 'Paquete Prediseñado' : 'Paquetes Prediseñados'}`
                                    : `${paquetes.length} ${paquetes.length === 1 ? 'Paquete Disponible' : 'Paquetes Disponibles'}`
                                }
                            </h2>
                        </div>
                        <p className="text-zinc-400">
                            {showAsAlternative
                                ? (
                                    <>
                                        Explora otros paquetes disponibles
                                        {durationHours !== null && durationHours !== undefined && durationHours > 0 && (
                                            <span className="block mt-1 text-xs text-zinc-500">
                                                Precios calculados para tu evento por <span className="font-semibold text-blue-400">{durationHours} {durationHours === 1 ? 'hora' : 'horas'}</span>. El precio puede variar según las horas configuradas.
                                            </span>
                                        )}
                                    </>
                                )
                                : (
                                    <>
                                        Conoce nuestros paquetes predefinidos con excelente relación precio-calidad
                                        {durationHours !== null && durationHours !== undefined && durationHours > 0 && (
                                            <span className="block mt-1 text-xs text-zinc-500">
                                                Precios calculados para tu evento por <span className="font-semibold text-blue-400">{durationHours} {durationHours === 1 ? 'hora' : 'horas'}</span>. El precio puede variar según las horas configuradas.
                                            </span>
                                        )}
                                    </>
                                )}
                        </p>
                    </div>

                    {/* Paquetes - Grid en mobile, carousel solo en desktop si hay más de 3 */}
                    <div className="relative -mx-4 px-4">
                        <div className="relative">
                            {paquetes.length <= 3 ? (
                                // Grid estático para 3 o menos paquetes (mobile y desktop)
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {paquetes.map((paquete) => (
                                        <PaqueteCard
                                            key={paquete.id}
                                            paquete={paquete}
                                            onClick={() => handlePaqueteClick(paquete)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                // Grid en mobile, scroll horizontal solo en desktop para más de 3 paquetes
                                <>
                                    <div className="grid grid-cols-1 gap-4 md:hidden">
                                        {paquetes.map((paquete) => (
                                            <PaqueteCard
                                                key={paquete.id}
                                                paquete={paquete}
                                                onClick={() => handlePaqueteClick(paquete)}
                                            />
                                        ))}
                                    </div>
                                    <div className="hidden md:block relative">
                                        <div
                                            ref={scrollRef}
                                            onScroll={handleManualScroll}
                                            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                                            style={{
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none',
                                            }}
                                        >
                                            {paquetes.map((paquete) => (
                                                <div
                                                    key={paquete.id}
                                                    className="shrink-0 w-[calc(33.333%-0.67rem)] min-w-[calc(33.333%-0.67rem)] snap-center"
                                                >
                                                    <PaqueteCard
                                                        paquete={paquete}
                                                        onClick={() => handlePaqueteClick(paquete)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Botones de navegación - Solo desktop para más de 3 paquetes */}
                                        <div className="absolute right-3 top-[70%] -translate-y-1/2 z-[100] flex flex-col gap-1.5 pointer-events-none">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (activeIndex < paquetes.length - 1) {
                                                        const nextIndex = activeIndex + 1;
                                                        if (scrollRef.current) {
                                                            const cardWidth = scrollRef.current.scrollWidth / paquetes.length;
                                                            scrollRef.current.scrollTo({
                                                                left: cardWidth * nextIndex,
                                                                behavior: 'smooth'
                                                            });
                                                        }
                                                        setActiveIndex(nextIndex);
                                                        setAutoplayEnabled(false);
                                                    }
                                                }}
                                                disabled={activeIndex >= paquetes.length - 1}
                                                className="p-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800/95 backdrop-blur-sm transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
                                                style={{
                                                    pointerEvents: activeIndex >= paquetes.length - 1 ? 'none' : 'auto',
                                                }}
                                                aria-label="Siguiente paquete"
                                            >
                                                <ChevronRight className="h-3 w-3 text-zinc-300" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (activeIndex > 0) {
                                                        const prevIndex = activeIndex - 1;
                                                        if (scrollRef.current) {
                                                            const cardWidth = scrollRef.current.scrollWidth / paquetes.length;
                                                            scrollRef.current.scrollTo({
                                                                left: cardWidth * prevIndex,
                                                                behavior: 'smooth'
                                                            });
                                                        }
                                                        setActiveIndex(prevIndex);
                                                        setAutoplayEnabled(false);
                                                    }
                                                }}
                                                disabled={activeIndex <= 0}
                                                className="p-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800/95 backdrop-blur-sm transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
                                                style={{
                                                    pointerEvents: activeIndex <= 0 ? 'none' : 'auto',
                                                }}
                                                aria-label="Paquete anterior"
                                            >
                                                <ChevronLeft className="h-3 w-3 text-zinc-300" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparador de opciones */}
            {(cotizacionesCompletas.length > 0 || paquetes.length > 0) && (
                <ComparadorButton
                    cotizaciones={cotizacionesCompletas}
                    paquetes={paquetes}
                    promiseId={promiseId}
                    studioSlug={studioSlug}
                />
            )}

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
                    showPackages={showPackages}
                    cotizaciones={cotizaciones}
                />
            )}
        </>
    );
}

