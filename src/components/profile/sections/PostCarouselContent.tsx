'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MediaItem } from '@/types/content-blocks';
import Glide from '@glidejs/glide';
import '@glidejs/glide/dist/css/glide.core.min.css';
import '@glidejs/glide/dist/css/glide.theme.min.css';
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { MediaDisplay } from '../MediaDisplay';

interface PostMedia {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    thumbnail_url?: string;
    display_order: number;
}

interface PostCarouselContentProps {
    media: PostMedia[];
    onMediaClick?: (mediaId: string) => void; // Callback para tracking de clicks en media
}

/**
 * PostCarouselContent - Réplica de ImageCarousel pero con imágenes ajustadas a tamaño fijo
 * Todas las imágenes se ven del mismo tamaño (aspect-square) usando fill y object-cover
 */
export function PostCarouselContent({ media, onMediaClick }: PostCarouselContentProps) {
    const glideRef = useRef<HTMLDivElement>(null);
    const glideInstanceRef = useRef<Glide | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Convertir PostMedia a MediaItem
    const mediaItems: MediaItem[] = media.map(item => ({
        id: item.id,
        file_url: item.file_url,
        file_type: item.file_type,
        filename: item.filename,
        thumbnail_url: item.thumbnail_url,
        storage_path: item.file_url,
        display_order: item.display_order,
    }));

    // Preparar slides para lightbox
    const lightboxSlides = mediaItems.map(item => {
        if (item.file_type === 'video') {
            return {
                type: 'video' as const,
                sources: [{
                    src: item.file_url,
                    type: 'video/mp4'
                }],
                poster: item.thumbnail_url || item.file_url,
                autoPlay: true,
                muted: true,
                controls: true,
                playsInline: true
            };
        }
        return {
            src: item.file_url,
            alt: item.filename,
            width: 1920,
            height: 1080
        };
    });

    useEffect(() => {
        if (!glideRef.current || !mediaItems.length) return;

        const glideInstance = new Glide(glideRef.current, {
            type: 'carousel',
            focusAt: 'center',
            perView: 1,
            peek: { before: 0, after: 80 },
            autoplay: false,
            animationDuration: 300,
            gap: 12,
            classes: {
                activeNav: '[&>*]:bg-white',
            },
            breakpoints: {
                768: { peek: { before: 0, after: 60 }, gap: 10 },
                640: { peek: { before: 0, after: 50 }, gap: 8 }
            }
        });

        glideInstance.mount();
        glideInstanceRef.current = glideInstance;

        return () => {
            if (glideInstanceRef.current) {
                glideInstanceRef.current.destroy();
                glideInstanceRef.current = null;
            }
        };
    }, [mediaItems]);

    // Función para manejar el click en una imagen
    const handleImageClick = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
        // Trackear click en media
        if (typeof onMediaClick === 'function' && mediaItems[index]?.id) {
            onMediaClick(mediaItems[index].id);
        }
    };

    if (mediaItems.length === 0) {
        return null;
    }

    return (
        <>
            {/* Custom CSS para diseño con altura fija - todas las imágenes del mismo tamaño */}
            <style jsx>{`
                .post-carousel-glide .glide__slide {
                    height: 100% !important;
                    flex-shrink: 0;
                }
                .post-carousel-glide .glide__slide > div {
                    position: relative;
                    width: 100%;
                    height: 100%;
                }
                .post-carousel-glide .glide__slide img {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    cursor: pointer;
                }
                .post-carousel-glide .glide__slide video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    cursor: pointer;
                }
            `}</style>

            {/* Glide Carousel con altura fija - todas las imágenes del mismo tamaño - Full-bleed en móviles */}
            <div className="relative w-full aspect-square bg-zinc-900 overflow-hidden mx-0 lg:rounded-md">
                <div ref={glideRef} className="glide post-carousel-glide h-full">
                    <div className="overflow-hidden h-full" data-glide-el="track">
                        <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility: hidden] [transform-style: preserve-3d] [touch-action: pan-Y] [will-change: transform] relative flex w-full overflow-hidden p-0 h-full">
                            {mediaItems.map((item, index) => (
                                <li key={item.id} className="glide__slide">
                                    <div
                                        className="relative w-full h-full cursor-pointer overflow-hidden"
                                        onClick={() => handleImageClick(index)}
                                    >
                                        <MediaDisplay
                                            src={item.file_url}
                                            alt={item.filename}
                                            fileType={item.file_type}
                                            thumbnailUrl={item.thumbnail_url}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 80vw"
                                            priority={index === 0}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIndex}
                slides={lightboxSlides}
                plugins={[Video, Zoom]}
                video={{
                    controls: true,
                    playsInline: true,
                    autoPlay: true,
                    muted: true,
                    loop: false
                }}
                controller={{
                    closeOnPullDown: true,
                    closeOnBackdropClick: true
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
                on={{
                    view: ({ index }) => {
                        // Sincronizar carousel con lightbox
                        if (glideInstanceRef.current && index !== undefined) {
                            glideInstanceRef.current.go(`=${index}`);
                        }
                    }
                }}
            />
        </>
    );
}
