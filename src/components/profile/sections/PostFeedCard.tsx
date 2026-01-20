'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CaptionWithLinks } from '@/components/shared/CaptionWithLinks';
import { PostCarouselContent } from './PostCarouselContent';
import { PostCardMenu } from './PostCardMenu';
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import { Star, Eye, MousePointerClick } from "lucide-react";
import "yet-another-react-lightbox/styles.css";

interface PostMedia {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    thumbnail_url?: string;
    display_order: number;
}

interface PostFeedCardProps {
    post: {
        id: string;
        slug: string;
        title?: string | null;
        caption: string | null;
        tags?: string[];
        media: PostMedia[];
        is_published: boolean;
        is_featured?: boolean;
        published_at: Date | null;
        view_count?: number;
    };
    onPostClick?: (postSlug: string) => void;
    onEditPost?: (postId: string) => void; // Callback para editar post
    onMediaClick?: (mediaId: string) => void; // Callback para tracking de clicks en media
}

/**
 * PostFeedCard - Componente para mostrar posts en el feed
 * Basado en PostDetailSection pero simplificado para feed:
 * - Encabezado minimalista: título, tiempo relativo y estrella si destacado
 * - Muestra descripción
 * - Galería con carousel y lightbox completo
 * - Click en caption abre modal de post detalle
 */
export function PostFeedCard({ post, onPostClick, onEditPost, onMediaClick }: PostFeedCardProps) {
    const params = useParams();
    const studioSlug = params?.slug as string;
    const { user } = useAuth();
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const firstMedia = post.media?.[0];

    // Evitar hydration mismatch - solo calcular tiempo en cliente
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Formatear números grandes
    const formatCount = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    // Función para calcular tiempo relativo
    const getRelativeTime = (date: Date | null): string => {
        if (!date) return 'ahora';

        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffSeconds < 60) return diffSeconds < 5 ? 'ahora' : `${diffSeconds}s`;
        if (diffMinutes < 60) return `${diffMinutes}min`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 30) return `${diffDays}d`;
        if (diffMonths < 12) return `${diffMonths}mes`;
        return `${diffYears}año`;
    };

    const relativeTime = useMemo(() => {
        // Solo calcular en cliente para evitar hydration mismatch
        if (!isClient) return '';
        return getRelativeTime(post.published_at);
    }, [post.published_at, isClient]);

    // Helpers para verificar valores vacíos
    const hasCaption = post.caption && post.caption.trim().length > 0;
    const hasMedia = post.media && post.media.length > 0;
    const hasTags = post.tags && post.tags.length > 0;
    const hasTitle = post.title && post.title.trim().length > 0;

    // Preparar caption: remover saltos de línea pero mantener links, truncar a 80 caracteres, primera letra mayúscula
    const prepareCaption = (caption: string): string => {
        // Remover saltos de línea pero mantener el contenido (incluyendo links markdown)
        let cleanCaption = caption
            .replace(/\r\n/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Truncar a 80 caracteres si excede
        if (cleanCaption.length > 80) {
            cleanCaption = cleanCaption.substring(0, 80) + '...';
        }

        // Capitalizar primera letra si existe
        if (cleanCaption.length > 0) {
            cleanCaption = cleanCaption.charAt(0).toUpperCase() + cleanCaption.slice(1);
        }

        return cleanCaption;
    };

    const processedCaption = hasCaption ? prepareCaption(post.caption!) : null;

    // Handler para abrir modal de post
    const handlePostClick = () => {
        if (onPostClick) {
            onPostClick(post.slug);
        }
    };

    return (
        <div className="space-y-3 py-6">
            {/* Encabezado: título, tiempo, estrella y menú contextual */}
            <div className="flex items-center justify-between gap-2 px-4">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                    {hasTitle && (
                        <h3 className="text-zinc-300 font-medium text-sm">
                            {post.title}
                        </h3>
                    )}
                    {post.published_at && isClient && relativeTime && (
                        <span className="text-zinc-500 text-xs">
                            {relativeTime}
                        </span>
                    )}
                    {post.is_featured && (
                        <span className="flex items-center" title="Post destacado">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        </span>
                    )}
                </div>

                {/* Menú contextual - Solo si está autenticado */}
                <PostCardMenu
                    postId={post.id}
                    postSlug={post.slug}
                    studioSlug={studioSlug}
                    isPublished={post.is_published}
                    onEdit={onEditPost}
                />
            </div>

            {/* Descripción con links, sin saltos de línea, truncada - clickeable para abrir modal */}
            {processedCaption && (
                <div
                    onClick={(e) => {
                        // Si el click es en un link, no abrir modal
                        const target = e.target as HTMLElement;
                        if (target.closest('a')) {
                            return;
                        }
                        handlePostClick();
                    }}
                    className="block w-full hover:opacity-80 transition-opacity cursor-pointer px-4"
                >
                    <CaptionWithLinks caption={processedCaption} className="text-zinc-300 text-sm leading-relaxed" />
                </div>
            )}

            {/* Media - Una imagen, galería (si hay más de una), o video */}
            {hasMedia && (
                <>
                    {/* Si hay más de una imagen, mostrar carousel/galería */}
                    {post.media.length > 1 ? (
                        <PostCarouselContent 
                            media={post.media}
                            {...(onMediaClick && { onMediaClick })}
                        />
                    ) : (
                        /* Si hay solo un elemento, mostrar tamaño original sin recortar */
                        firstMedia && (
                            <>
                                <div
                                    className="relative w-full cursor-pointer mx-0"
                                    onClick={() => {
                                        setLightboxOpen(true);
                                        if (onMediaClick && firstMedia.id) {
                                            onMediaClick(firstMedia.id);
                                        }
                                    }}
                                >
                                    {firstMedia.file_type === 'image' ? (
                                        <Image
                                            src={firstMedia.file_url}
                                            alt={firstMedia.filename || 'Post'}
                                            width={800}
                                            height={800}
                                            className="w-full h-auto object-contain lg:rounded-md"
                                            sizes="(max-width: 768px) 100vw, 80vw"
                                            unoptimized
                                            style={{ maxHeight: 'none' }}
                                        />
                                    ) : (
                                        <video
                                            src={firstMedia.file_url}
                                            controls
                                            className="w-full h-auto lg:rounded-md cursor-pointer"
                                            autoPlay
                                            muted
                                            playsInline
                                            loop
                                            poster={firstMedia.thumbnail_url}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxOpen(true);
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Lightbox para imagen/video único */}
                                <Lightbox
                                    open={lightboxOpen}
                                    close={() => setLightboxOpen(false)}
                                    slides={firstMedia.file_type === 'video' ? [{
                                        type: 'video' as const,
                                        sources: [{
                                            src: firstMedia.file_url,
                                            type: 'video/mp4'
                                        }],
                                        poster: firstMedia.thumbnail_url || firstMedia.file_url,
                                        autoPlay: true,
                                        muted: false,
                                        controls: true,
                                        playsInline: true
                                    }] : [{
                                        src: firstMedia.file_url,
                                        alt: firstMedia.filename || 'Post',
                                        width: 1920,
                                        height: 1080
                                    }]}
                                    plugins={firstMedia.file_type === 'video' ? [Video] : []}
                                    video={{
                                        controls: true,
                                        playsInline: true,
                                        autoPlay: true,
                                        muted: false,
                                        loop: false
                                    }}
                                    controller={{
                                        closeOnPullDown: true,
                                        closeOnBackdropClick: true
                                    }}
                                />
                            </>
                        )
                    )}
                </>
            )}

            {/* Palabras clave */}
            {hasTags && (
                <div className="flex flex-wrap gap-2 px-4">
                    {post.tags!.map((tag, index) => (
                        <span
                            key={index}
                            className="text-zinc-600 text-sm"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer con analytics - Solo visible si usuario autenticado */}
            {user && (
                <div className="flex items-center gap-4 pt-2 border-t border-zinc-800/50 px-4">
                    {/* Vistas */}
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{formatCount(post.view_count || 0)}</span>
                        <span className="text-zinc-600">vistas</span>
                    </div>

                    {/* Clics - TODO: Implementar tracking */}
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                        <MousePointerClick className="w-3.5 h-3.5" />
                        <span>0</span>
                        <span className="text-zinc-600">clics</span>
                    </div>
                </div>
            )}
        </div>
    );
}

