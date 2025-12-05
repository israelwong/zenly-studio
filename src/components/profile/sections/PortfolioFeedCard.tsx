'use client';

import React from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ZenCard, ZenCardContent, ZenCardTitle } from '@/components/ui/zen';
import { Image as ImageIcon, Eye } from 'lucide-react';
import { PortfolioCardMenu } from './PortfolioCardMenu';

interface PortfolioFeedCardProps {
    portfolio: {
        id: string;
        slug: string;
        title: string;
        category?: string | null;
        cover_image_url?: string | null;
        items: Array<{ id: string }>;
        view_count?: number;
        is_published?: boolean;
    };
    onPortfolioClick?: (portfolioSlug: string) => void;
}

/**
 * PortfolioFeedCard - Componente para mostrar portfolios en el feed
 * Equivalente a PostFeedCard pero para portfolios:
 * - Cover image full width (aspect-video)
 * - Title + Category
 * - Item count
 * - View count si autenticado
 * - Hover effects
 * - Click handler para abrir modal
 */
export function PortfolioFeedCard({ portfolio, onPortfolioClick }: PortfolioFeedCardProps) {
    const params = useParams();
    const studioSlug = params?.slug as string;
    const { user } = useAuth();

    // Formatear números grandes
    const formatCount = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    const handleClick = () => {
        onPortfolioClick?.(portfolio.slug);
    };

    return (
        <ZenCard
            className="cursor-pointer hover:border-zinc-700 transition-all duration-300 group overflow-hidden"
            onClick={handleClick}
        >
            <div className="flex flex-col">
                {/* Header: Title + Menu - Arriba de la imagen */}
                <div className="p-4 pb-3 flex items-center justify-between gap-2 relative z-10">
                    <h3 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors flex-1 truncate">
                        {portfolio.title}
                    </h3>

                    {/* Menú contextual - Solo si está autenticado */}
                    <PortfolioCardMenu
                        portfolioId={portfolio.id}
                        portfolioSlug={portfolio.slug}
                        studioSlug={studioSlug}
                        isPublished={portfolio.is_published ?? true}
                    />
                </div>

                {/* Cover Image - Full width aspect-video */}
                <div className="relative w-full aspect-video bg-zinc-800 overflow-hidden">
                    {portfolio.cover_image_url ? (
                        <Image
                            src={portfolio.cover_image_url}
                            alt={portfolio.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={false}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-zinc-500" />
                        </div>
                    )}
                </div>

                {/* Content - Category y Stats */}
                <ZenCardContent className="p-4 pt-3">
                    <div className="space-y-2">
                        {/* Category */}
                        {portfolio.category && (
                            <p className="text-sm text-zinc-400">
                                {portfolio.category}
                            </p>
                        )}

                        {/* Footer: Item count + Stats */}
                        <div className="flex items-center justify-between pt-1">
                            {/* Item count */}
                            <p className="text-xs text-zinc-500">
                                {portfolio.items.length} {portfolio.items.length === 1 ? 'elemento' : 'elementos'}
                            </p>

                            {/* Stats - Solo si está autenticado */}
                            {user && portfolio.view_count !== undefined && (
                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                    <div className="flex items-center gap-1">
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>{formatCount(portfolio.view_count)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </ZenCardContent>
            </div>
        </ZenCard>
    );
}
