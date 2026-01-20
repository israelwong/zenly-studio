'use client';

import React from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ZenCard, ZenBadge, ZenButton } from '@/components/ui/zen';
import { Image as ImageIcon, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { PortfolioCardMenu } from './PortfolioCardMenu';

interface PortfolioFeedCardProps {
    portfolio: {
        id: string;
        slug: string;
        title: string;
        description?: string | null;
        category?: string | null;
        cover_image_url?: string | null;
        items: Array<{ id: string }>;
        view_count?: number;
        is_published?: boolean;
        tags?: string[];
        order?: number;
    };
    onPortfolioClick?: (portfolioSlug: string) => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    isOwner?: boolean;
}

/**
 * PortfolioFeedCard - Card horizontal compacto para portfolios
 * Diseño diferenciado de posts:
 * - Layout horizontal: [Portada] [Info] [Controles]
 * - Portada compacta a la izquierda
 * - Info: Título, descripción, tags
 * - Controles de orden (solo owner)
 */
export function PortfolioFeedCard({
    portfolio,
    onPortfolioClick,
    onMoveUp,
    onMoveDown,
    canMoveUp = true,
    canMoveDown = true,
    isOwner = false
}: PortfolioFeedCardProps) {
    const params = useParams();
    const studioSlug = params?.slug as string;
    const { user } = useAuth();

    // Formatear números grandes
    const formatCount = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    const handleClick = (e: React.MouseEvent) => {
        // Evitar click si se hace en los botones de control
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        onPortfolioClick?.(portfolio.slug);
    };

    return (
        <ZenCard
            className="cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/50 transition-all duration-200 group overflow-visible mx-0 lg:mx-0"
            onClick={handleClick}
        >
            <div className="flex items-start gap-4 px-4 py-4 pr-2">
                {/* Portada */}
                <div className="relative w-28 h-28 shrink-0 bg-zinc-800 rounded-lg overflow-hidden">
                    {portfolio.cover_image_url ? (
                        <>
                            <Image
                                src={portfolio.cover_image_url}
                                alt={portfolio.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="112px"
                            />
                            {/* Badge de estado - solo si está autenticado */}
                            {user && (
                                <div className="absolute top-2 left-2">
                                    {portfolio.is_published === true ? (
                                        <ZenBadge
                                            variant="outline"
                                            className="text-[10px] bg-emerald-900/80 backdrop-blur-sm border-emerald-700 text-emerald-300 px-1.5 py-0.5"
                                        >
                                            Publicado
                                        </ZenBadge>
                                    ) : (
                                        <ZenBadge
                                            variant="outline"
                                            className="text-[10px] bg-zinc-900/80 backdrop-blur-sm border-zinc-700 text-zinc-300 px-1.5 py-0.5"
                                        >
                                            Borrador
                                        </ZenBadge>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-zinc-600" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2 pt-1">
                    {/* Título */}
                    <h3 className="text-base font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {portfolio.title}
                    </h3>

                    {/* Descripción */}
                    {portfolio.description && (
                        <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                            {portfolio.description}
                        </p>
                    )}

                    {/* Tags + Stats */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                        {/* Tags - Máximo 2 visibles */}
                        {portfolio.tags && portfolio.tags.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                {portfolio.tags.slice(0, 2).map((tag, index) => (
                                    <span key={index} className="text-xs text-zinc-500">
                                        #{tag}
                                    </span>
                                ))}
                                {portfolio.tags.length > 2 && (
                                    <span className="text-xs text-zinc-500">
                                        +{portfolio.tags.length - 2}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Stats - Solo si está autenticado */}
                        {user && portfolio.view_count !== undefined && portfolio.view_count > 0 && (
                            <>
                                {portfolio.tags && portfolio.tags.length > 0 && (
                                    <span className="text-zinc-700">•</span>
                                )}
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{formatCount(portfolio.view_count)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Controles - Solo si está autenticado */}
                {user && (
                    <div className="flex items-start gap-1 shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
                        {/* Flechas de ordenamiento */}
                        {isOwner && (onMoveUp || onMoveDown) && (
                            <div className="flex flex-col gap-0.5">
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMoveUp?.();
                                    }}
                                    disabled={!canMoveUp}
                                    className="h-8 w-8 p-0 hover:bg-zinc-800"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </ZenButton>
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMoveDown?.();
                                    }}
                                    disabled={!canMoveDown}
                                    className="h-8 w-8 p-0 hover:bg-zinc-800"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </ZenButton>
                            </div>
                        )}

                        {/* Menú de acciones */}
                        <PortfolioCardMenu
                            portfolioId={portfolio.id}
                            portfolioSlug={portfolio.slug}
                            studioSlug={studioSlug}
                            isPublished={portfolio.is_published ?? true}
                        />
                    </div>
                )}
            </div>
        </ZenCard>
    );
}
