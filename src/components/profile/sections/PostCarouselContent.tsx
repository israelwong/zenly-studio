'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '@/types/content-blocks';
import Glide from '@glidejs/glide';
import '@glidejs/glide/dist/css/glide.core.min.css';
import '@glidejs/glide/dist/css/glide.theme.min.css';
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

interface PostCarouselContentProps {
    media: PostMedia[];
}

/**
 * PostCarouselContent - Réplica de ImageCarousel pero con imágenes ajustadas a tamaño fijo
 * Todas las imágenes se ven del mismo tamaño (aspect-square) usando fill y object-cover
 */
export function PostCarouselContent({ media }: PostCarouselContentProps) {
    const glideRef = useRef<HTMLDivElement>(null);
    const glideInstanceRef = useRef<Glide | null>(null);
    const videoRefsRef = useRef<Map<number, HTMLVideoElement>>(new Map());
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

    // Obtener referencias de videos desde VideoPostCarousel
    const setVideoRef = (index: number) => (video: HTMLVideoElement | null) => {
        if (video) {
            videoRefsRef.current.set(index, video);
        } else {
            videoRefsRef.current.delete(index);
        }
    };

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
                muted: false,
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

            {/* Glide Carousel con altura fija - todas las imágenes del mismo tamaño */}
            <div className="relative w-full aspect-square bg-zinc-900 rounded-md overflow-hidden">
                <div ref={glideRef} className="glide post-carousel-glide h-full">
                    <div className="overflow-hidden h-full" data-glide-el="track">
                        <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility: hidden] [transform-style: preserve-3d] [touch-action: pan-Y] [will-change: transform] relative flex w-full overflow-hidden p-0 h-full">
                            {mediaItems.map((item, index) => (
                                <li key={item.id} className="glide__slide">
                                    <div
                                        className="relative w-full h-full cursor-pointer overflow-hidden"
                                        onClick={() => handleImageClick(index)}
                                    >
                                        {item.file_type === 'video' ? (
                                            <video
                                                ref={(el) => {
                                                    setVideoRef(index)(el);
                                                    if (el) {
                                                        el.addEventListener('play', () => {
                                                            // Pausar otros videos cuando este se reproduce
                                                            videoRefsRef.current.forEach((vid, idx) => {
                                                                if (vid && idx !== index) {
                                                                    vid.pause();
                                                                }
                                                            });
                                                        });
                                                    }
                                                }}
                                                src={item.file_url}
                                                poster={item.thumbnail_url}
                                                className="w-full h-full object-cover"
                                                controls
                                                autoPlay
                                                muted
                                                playsInline
                                                loop
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleImageClick(index);
                                                }}
                                            />
                                        ) : (
                                            <Image
                                                src={item.file_url}
                                                alt={item.filename}
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 100vw, 80vw"
                                                priority={index === 0}
                                            />
                                        )}
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
                plugins={[Video]}
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
