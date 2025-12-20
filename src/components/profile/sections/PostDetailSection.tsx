import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { CaptionWithLinks } from '@/components/shared/CaptionWithLinks';
import { ImageCarousel } from '@/components/shared/media';
import { MediaItem } from '@/types/content-blocks';
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { obtenerIdentidadStudio } from '@/lib/actions/studio/profile/identidad';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';

// Función para formatear tiempo relativo corto (1h, 2d)
function formatTimeAgo(date: Date | null): string {
    if (!date) return "";

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return "1h"; // Menos de 1 minuto = 1h
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return "1h"; // Menos de 1 hora = 1h
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}h`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
}

interface PostMedia {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    thumbnail_url?: string;
    display_order: number;
}

interface PostDetail {
    id: string;
    title?: string | null;
    caption: string | null;
    tags?: string[];
    media: PostMedia[];
    is_published: boolean;
    published_at: Date | null;
    view_count: number;
}

interface PostDetailSectionProps {
    post: PostDetail;
    logoUrl?: string | null;
    studioSlug?: string;
}

/**
 * PostDetailSection - Vista detallada de un post individual
 * Usado en el editor para preview del post que se está editando
 * 
 * Reglas de visualización:
 * - Una sola foto: fullwidth
 * - Múltiples fotos/videos: carousel usando ImageCarousel
 */
export function PostDetailSection({ post, logoUrl: logoUrlProp, studioSlug }: PostDetailSectionProps) {
    const hasMultipleMedia = post.media.length > 1;
    const firstMedia = post.media[0];
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null | undefined>(logoUrlProp);
    const [isLoadingLogo, setIsLoadingLogo] = useState(false);

    // Si no hay logoUrl pero hay studioSlug, obtener el logo del studio
    useEffect(() => {
        if (!logoUrl && studioSlug && !isLoadingLogo) {
            setIsLoadingLogo(true);
            obtenerIdentidadStudio(studioSlug)
                .then((result) => {
                    if (result && !('success' in result && result.success === false)) {
                        const studioData = result as { logo_url?: string | null };
                        setLogoUrl(studioData.logo_url || null);
                    }
                })
                .catch((error) => {
                    console.error('[PostDetailSection] Error obteniendo logo:', error);
                })
                .finally(() => {
                    setIsLoadingLogo(false);
                });
        }
    }, [logoUrl, studioSlug, isLoadingLogo]);

    // Actualizar logoUrl si cambia el prop
    useEffect(() => {
        if (logoUrlProp !== undefined) {
            setLogoUrl(logoUrlProp);
        }
    }, [logoUrlProp]);

    const timeAgo = useMemo(() => formatTimeAgo(post.published_at), [post.published_at]);

    // Convertir PostMedia a MediaItem para ImageCarousel
    const mediaItems: MediaItem[] = post.media.map(item => ({
        id: item.id,
        file_url: item.file_url,
        file_type: item.file_type,
        filename: item.filename,
        thumbnail_url: item.thumbnail_url,
        storage_path: item.file_url,
        display_order: item.display_order,
    }));

    // Preparar slide para lightbox de video único
    const videoLightboxSlide = firstMedia && firstMedia.file_type === 'video' ? {
        type: 'video' as const,
        sources: [{
            src: firstMedia.file_url,
            type: 'video/mp4'
        }],
        poster: firstMedia.thumbnail_url || firstMedia.file_url,
        // No especificar width/height para que use tamaño natural del video
        autoPlay: true,
        muted: false,
        controls: true,
        playsInline: true
    } : null;

    // Helpers para verificar valores vacíos
    const hasTitle = post.title && post.title.trim().length > 0;
    const hasCaption = post.caption && post.caption.trim().length > 0;
    const hasMedia = post.media && post.media.length > 0;
    const hasTags = post.tags && post.tags.length > 0;

    return (
        <div className="mt-3 space-y-2">
            {/* Logo, Título y tiempo de publicación */}
            <div className="flex items-center gap-2 mb-2">
                {/* Avatar con logo */}
                {logoUrl ? (
                    <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        <Image
                            src={logoUrl}
                            alt="Logo"
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 bg-zinc-700" />
                )}

                {hasTitle ? (
                    <span className="text-white font-light leading-relaxed whitespace-pre-wrap break-words text-base">
                        {post.title}
                    </span>
                ) : (
                    <Skeleton className="h-5 w-48 bg-zinc-700" />
                )}

                {timeAgo ? (
                    <span className="text-zinc-500 text-sm flex-shrink-0">
                        {timeAgo}
                    </span>
                ) : (
                    <Skeleton className="h-4 w-8 flex-shrink-0 bg-zinc-700" />
                )}
            </div>

            {/* Descripción */}
            {hasCaption ? (
                <div className="w-full mb-2">
                    <CaptionWithLinks caption={post.caption!} className="text-zinc-400" />
                </div>
            ) : (
                <div className="w-full mb-2 space-y-2">
                    <Skeleton className="h-4 w-full bg-zinc-700" />
                    <Skeleton className="h-4 w-3/4 bg-zinc-700" />
                </div>
            )}

            {/* Media */}
            {hasMedia && firstMedia ? (
                <div className="relative">
                    {/* Una sola foto/video: fullwidth */}
                    {!hasMultipleMedia ? (
                        <div className="relative w-full">
                            {firstMedia.file_type === 'image' ? (
                                <div
                                    onClick={() => setLightboxOpen(true)}
                                    className="cursor-pointer"
                                >
                                    <Image
                                        src={firstMedia.file_url}
                                        alt="Post"
                                        width={800}
                                        height={800}
                                        className="w-full h-auto object-contain rounded-md"
                                        unoptimized
                                        style={{ maxHeight: 'none' }}
                                    />
                                </div>
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
                                    onClick={() => setLightboxOpen(true)}
                                />
                            )}
                        </div>
                    ) : (
                        /* Múltiples elementos: usar ImageCarousel */
                        <ImageCarousel
                            media={mediaItems}
                            showArrows={false}
                            showDots={false}
                            autoplay={0}
                            className=""
                        />
                    )}
                </div>
            ) : (
                <div className="relative w-full">
                    <Skeleton className="w-full aspect-square rounded-md bg-zinc-700" />
                </div>
            )}

            {/* Lightbox para imagen única */}
            {!hasMultipleMedia && firstMedia && firstMedia.file_type === 'image' && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    slides={[{
                        src: firstMedia.file_url,
                        alt: firstMedia.filename || 'Post',
                        width: 1920,
                        height: 1080
                    }]}
                />
            )}

            {/* Lightbox para video único */}
            {!hasMultipleMedia && videoLightboxSlide && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    slides={[videoLightboxSlide]}
                    plugins={[Video]}
                    video={{
                        controls: true,
                        playsInline: true,
                        autoPlay: true,
                        muted: false,
                        loop: false
                    }}
                    styles={{
                        container: {
                            backgroundColor: "rgba(0, 0, 0, .98)",
                            padding: 0
                        },
                        slide: {
                            padding: 0,
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100vw',
                            height: '100vh'
                        }
                    }}
                    render={{
                        slide: ({ slide }) => {
                            if (slide.type === 'video') {
                                return (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '100%',
                                        height: '100%'
                                    }}>
                                        <video
                                            src={slide.sources?.[0]?.src}
                                            poster={slide.poster}
                                            autoPlay={slide.autoPlay}
                                            muted={slide.muted}
                                            controls={slide.controls}
                                            playsInline={slide.playsInline}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100vh',
                                                width: 'auto',
                                                height: 'auto',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </div>
                                );
                            }
                            return undefined;
                        }
                    }}
                />
            )}

            {/* Palabras clave */}
            {hasTags ? (
                <div className="flex flex-wrap gap-2 mt-3">
                    {post.tags!.map((tag, index) => (
                        <span
                            key={index}
                            className="text-zinc-600 text-sm"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                    <Skeleton className="h-5 w-16 rounded-full bg-zinc-700" />
                    <Skeleton className="h-5 w-20 rounded-full bg-zinc-700" />
                    <Skeleton className="h-5 w-14 rounded-full bg-zinc-700" />
                </div>
            )}
        </div>
    );
}
