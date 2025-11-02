import React from 'react';
import Image from 'next/image';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Eye, Calendar, Tag, Star } from 'lucide-react';
import { ContentBlocksPreview } from '@/components/content-blocks';
import { ContentBlock } from '@/types/content-blocks';

interface PortfolioMedia {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    thumbnail_url?: string;
    display_order: number;
}

interface PortfolioDetail {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    caption: string | null;
    category: string | null;
    event_type?: {
        id: string;
        nombre: string;
    } | null;
    tags: string[];
    is_featured: boolean;
    is_published: boolean;
    published_at: Date | null;
    view_count: number;
    media: PortfolioMedia[];
    cover_index: number;
    content_blocks?: ContentBlock[];
}

interface PortfolioDetailSectionProps {
    portfolio: PortfolioDetail;
    hideHeader?: boolean; // Ocultar título y categoría cuando está en modo preview del editor
}

/**
 * PortfolioDetailSection - Vista detallada de un portfolio individual
 * Usado en el editor para preview del portfolio que se está editando
 */
export function PortfolioDetailSection({ portfolio, hideHeader = false }: PortfolioDetailSectionProps) {
    // Si hideHeader es true (modo editor), mostrar bloques de contenido y palabras clave
    if (hideHeader) {
        return (
            <div className="space-y-6">
                {/* Bloques de Contenido */}
                <ContentBlocksPreview blocks={portfolio.content_blocks || []} />

                {/* Tags/Palabras Clave - Minimalista */}
                {portfolio.tags && portfolio.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {portfolio.tags.map((tag, index) => (
                            <span
                                key={index}
                                className="text-xs text-zinc-400 px-2 py-0.5"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Vista completa para visualización pública
    const coverMedia = portfolio.media[portfolio.cover_index] || portfolio.media[0];

    return (
        <div className="space-y-6">
            {/* Header del Portfolio */}
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">
                    {portfolio.title || 'Sin título'}
                </h1>

                <div className="flex items-center justify-center gap-2 flex-wrap">
                    {portfolio.is_featured && (
                        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Destacado
                        </span>
                    )}
                    {portfolio.category && (
                        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">
                            {portfolio.category}
                        </span>
                    )}
                    {portfolio.event_type && (
                        <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                            {portfolio.event_type.nombre}
                        </span>
                    )}
                </div>
            </div>

            {/* Descripción */}
            {portfolio.description && (
                <div className="w-full">
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap font-normal break-words overflow-wrap-anywhere">
                        {portfolio.description}
                    </p>
                </div>
            )}

            {/* Media Principal */}
            {coverMedia && (
                <div className="relative">
                    <ZenCard className="overflow-hidden">
                        {/* Si solo hay un item, mostrar en aspecto automático y full width */}
                        {portfolio.media.length === 1 ? (
                            <div className="relative bg-zinc-800">
                                {coverMedia.file_type === 'image' ? (
                                    <Image
                                        src={coverMedia.file_url}
                                        alt={portfolio.title || 'Portfolio image'}
                                        width={800}
                                        height={600}
                                        className="w-full h-auto object-contain"
                                        sizes="100vw"
                                    />
                                ) : (
                                    <video
                                        src={coverMedia.file_url}
                                        controls
                                        autoPlay
                                        muted
                                        playsInline
                                        loop
                                        className="w-full h-auto"
                                        poster={coverMedia.thumbnail_url}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="aspect-video relative bg-zinc-800">
                                {coverMedia.file_type === 'image' ? (
                                    <Image
                                        src={coverMedia.file_url}
                                        alt={portfolio.title || 'Portfolio image'}
                                        fill
                                        className="object-cover"
                                        sizes="100vw"
                                    />
                                ) : (
                                    <video
                                        src={coverMedia.file_url}
                                        controls
                                        className="w-full h-full object-cover"
                                        poster={coverMedia.thumbnail_url}
                                    />
                                )}
                            </div>
                        )}
                    </ZenCard>
                </div>
            )}

            {/* Caption */}
            {portfolio.caption && (
                <div className="w-full">
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap font-normal break-words overflow-wrap-anywhere">
                        {portfolio.caption}
                    </p>
                </div>
            )}

            {/* Bloques de Contenido */}
            <ContentBlocksPreview blocks={portfolio.content_blocks || []} />

            {/* Tags/Palabras Clave */}
            {portfolio.tags && portfolio.tags.length > 0 && (
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="text-sm flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Palabras Clave
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent className="p-4 pt-0">
                        <div className="flex flex-wrap justify-start gap-2">
                            {portfolio.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="text-xs text-zinc-300 bg-zinc-700 px-2 py-0.5 rounded-full border border-zinc-600 text-center"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Media Adicional */}
            {portfolio.media.length > 1 && (
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="text-sm">
                            Galería ({portfolio.media.length} elementos)
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent className="p-4 pt-0">
                        <div className="grid grid-cols-2 gap-2">
                            {portfolio.media.slice(0, 4).map((media, index) => (
                                <div key={media.id} className="aspect-square relative bg-zinc-800 rounded-lg overflow-hidden">
                                    {media.file_type === 'image' ? (
                                        <Image
                                            src={media.file_url}
                                            alt={`${portfolio.title} - ${index + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                        />
                                    ) : (
                                        <video
                                            src={media.file_url}
                                            className="w-full h-full object-cover"
                                            poster={media.thumbnail_url}
                                        />
                                    )}
                                    {index === 3 && portfolio.media.length > 4 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                +{portfolio.media.length - 4}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {portfolio.view_count} vistas
                </div>
                {portfolio.published_at && (
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(portfolio.published_at).toLocaleDateString()}
                    </div>
                )}
            </div>
        </div>
    );
}

