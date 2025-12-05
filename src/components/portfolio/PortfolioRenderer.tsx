"use client";

import React from "react";
import Image from "next/image";
import { PublicPortfolio } from "@/types/public-profile";
import { useContentAnalytics } from "@/hooks/useContentAnalytics";
import { ImageIcon, PlayCircle } from "lucide-react";
import { ZenButton } from "@/components/ui/zen";

interface PortfolioRendererProps {
    portfolio: PublicPortfolio;
    studioSlug: string;
    studioId?: string;
    ownerUserId?: string | null;
}

/**
 * PortfolioRenderer - Renderiza el contenido completo de un portafolio
 * Incluye tracking de analytics para cada interacción
 */
export function PortfolioRenderer({
    portfolio,
    studioSlug,
    studioId,
    ownerUserId
}: PortfolioRendererProps) {
    const { trackMediaClick } = useContentAnalytics({
        studioId: studioId || '',
        contentType: 'PORTFOLIO',
        contentId: portfolio.id,
        ownerUserId
    });

    // Ordenar items por orden
    const sortedItems = [...portfolio.items].sort((a, b) => a.order - b.order);

    const handleMediaClick = (itemId: string) => {
        trackMediaClick(itemId);
    };

    return (
        <div className="w-full bg-transparent">
            {/* Description */}
            {portfolio.description && (
                <div className="p-4 border-b border-zinc-800/50">
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                        {portfolio.description}
                    </p>
                </div>
            )}

            {/* Tags */}
            {portfolio.tags && portfolio.tags.length > 0 && (
                <div className="px-4 py-3 border-b border-zinc-800/50">
                    <div className="flex flex-wrap gap-2">
                        {portfolio.tags.map((tag, index) => (
                            <span
                                key={index}
                                className="text-zinc-500 text-sm"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Portfolio Items */}
            <div className="divide-y divide-zinc-800/50">
                {sortedItems.length === 0 ? (
                    <div className="p-8 text-center">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                        <p className="text-zinc-500">
                            Este portafolio no tiene elementos aún
                        </p>
                    </div>
                ) : (
                    sortedItems.map((item) => (
                        <div key={item.id} className="p-4 space-y-3">
                            {/* Item Title */}
                            {item.title && (
                                <h3 className="font-semibold text-zinc-100">
                                    {item.title}
                                </h3>
                            )}

                            {/* Item Description */}
                            {item.description && (
                                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                                    {item.description}
                                </p>
                            )}

                            {/* Item Media */}
                            <div className="relative w-full">
                                {item.item_type === 'PHOTO' && item.image_url ? (
                                    <div
                                        className="relative w-full aspect-video bg-zinc-800 rounded-lg overflow-hidden cursor-pointer group"
                                        onClick={() => handleMediaClick(item.id)}
                                    >
                                        <Image
                                            src={item.image_url}
                                            alt={item.title || 'Portfolio item'}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            sizes="(max-width: 768px) 100vw, 430px"
                                            unoptimized
                                        />
                                    </div>
                                ) : item.item_type === 'VIDEO' && item.video_url ? (
                                    <div
                                        className="relative w-full aspect-video bg-zinc-800 rounded-lg overflow-hidden"
                                        onClick={() => handleMediaClick(item.id)}
                                    >
                                        <video
                                            src={item.video_url}
                                            controls
                                            playsInline
                                            className="w-full h-full object-cover"
                                            poster={item.image_url || undefined}
                                        />
                                        {!item.video_url.includes('controls') && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <PlayCircle className="w-16 h-16 text-white/80" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                                        <ImageIcon className="h-12 w-12 text-zinc-600" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* CTA Section - Contactar */}
            <div className="p-4 border-t border-zinc-800/50">
                <ZenButton
                    onClick={() => {
                        // Tracking handled by useContentAnalytics
                        window.location.href = `/${studioSlug}?tab=contacto`;
                    }}
                    className="w-full"
                    size="lg"
                >
                    Contáctanos para tu evento
                </ZenButton>
            </div>
        </div>
    );
}
