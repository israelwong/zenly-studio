'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { CaptionWithLinks } from '@/app/[slug]/studio/builder/content/posts/components/CaptionWithLinks';
import { PostCarouselContent } from './PostCarouselContent';
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
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
        caption: string | null;
        tags?: string[];
        media: PostMedia[];
        is_published: boolean;
        published_at: Date | null;
    };
}

/**
 * PostFeedCard - Componente para mostrar posts en el feed
 * Basado en PostDetailSection pero simplificado para feed:
 * - NO muestra título
 * - Muestra descripción
 * - Galería con carousel y lightbox completo
 */
export function PostFeedCard({ post }: PostFeedCardProps) {
    const params = useParams();
    const router = useRouter();
    const studioSlug = params?.slug as string;
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const firstMedia = post.media?.[0];

    // Helpers para verificar valores vacíos
    const hasCaption = post.caption && post.caption.trim().length > 0;
    const hasMedia = post.media && post.media.length > 0;
    const hasTags = post.tags && post.tags.length > 0;

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

    const postDetailUrl = studioSlug ? `/${studioSlug}/p/${post.id}` : '#';

    return (
        <div className="space-y-3">
            {/* Descripción con links, sin saltos de línea, truncada - clickeable para post detalle */}
            {processedCaption && (
                <div
                    onClick={(e) => {
                        // Si el click es en un link, no navegar al post detalle
                        const target = e.target as HTMLElement;
                        if (target.closest('a')) {
                            return;
                        }
                        router.push(postDetailUrl);
                    }}
                    className="block w-full hover:opacity-80 transition-opacity cursor-pointer"
                >
                    <CaptionWithLinks caption={processedCaption} className="text-zinc-300 text-sm leading-relaxed" />
                </div>
            )}

            {/* Media - Una imagen, galería (si hay más de una), o video */}
            {hasMedia && (
                <>
                    {/* Si hay más de una imagen, mostrar carousel/galería */}
                    {post.media.length > 1 ? (
                        <PostCarouselContent media={post.media} />
                    ) : (
                        /* Si hay solo un elemento, mostrar tamaño original sin recortar */
                        firstMedia && (
                            <>
                                <div
                                    className="relative w-full cursor-pointer"
                                    onClick={() => setLightboxOpen(true)}
                                >
                                    {firstMedia.file_type === 'image' ? (
                                        <Image
                                            src={firstMedia.file_url}
                                            alt={firstMedia.filename || 'Post'}
                                            width={800}
                                            height={800}
                                            className="w-full h-auto object-contain rounded-md"
                                            sizes="(max-width: 768px) 100vw, 80vw"
                                            unoptimized
                                            style={{ maxHeight: 'none' }}
                                        />
                                    ) : (
                                        <video
                                            src={firstMedia.file_url}
                                            controls
                                            className="w-full h-auto rounded-md cursor-pointer"
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
                <div className="flex flex-wrap gap-2">
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
        </div>
    );
}

