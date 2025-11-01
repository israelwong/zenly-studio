'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { MediaItem } from '@/types/content-blocks';
import Glide from '@glidejs/glide';
import '@glidejs/glide/dist/css/glide.core.min.css';
import '@glidejs/glide/dist/css/glide.theme.min.css';
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { VideoPostCarousel } from './VideoPostCarousel';

interface ImageCarouselProps {
    media: MediaItem[];
    title?: string;
    description?: string;
    showArrows?: boolean;
    showDots?: boolean;
    autoplay?: number; // milliseconds (0 = deshabilitado)
    className?: string;
    enableLightbox?: boolean;
}

export function ImageCarousel({
    media,
    title,
    description,
    showArrows = true,
    showDots = false,
    autoplay = 0,
    className = '',
    enableLightbox = true
}: ImageCarouselProps) {
    const glideRef = useRef<HTMLDivElement>(null);
    const glideInstanceRef = useRef<Glide | null>(null);
    const videoRefsRef = useRef<Map<number, HTMLVideoElement>>(new Map());
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    
    // Detectar si hay múltiples videos para limitar altura
    const hasMultipleVideos = media.length > 1 && media.some(item => item.file_type === 'video');

    // Obtener referencias de videos desde VideoPostCarousel
    const setVideoRef = (index: number) => (video: HTMLVideoElement | null) => {
        if (video) {
            videoRefsRef.current.set(index, video);
        } else {
            videoRefsRef.current.delete(index);
        }
    };

    // Preparar slides para lightbox
    const lightboxSlides = media.map(item => {
        if (item.file_type === 'video') {
            return {
                type: 'video' as const,
                sources: [{
                    src: item.file_url,
                    type: 'video/mp4'
                }],
                poster: item.thumbnail_url || item.file_url,
                // No especificar width/height para que use tamaño natural del video
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
        if (!glideRef.current || !media.length) return;

        const glideInstance = new Glide(glideRef.current, {
            type: 'carousel',
            focusAt: 'center',
            perView: 1,
            peek: { before: 0, after: 80 },
            autoplay: autoplay > 0 ? autoplay : false,
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

        // No necesitamos trackear el slide actual ya que los videos no se reproducen en preview

        glideInstance.mount();
        glideInstanceRef.current = glideInstance;

        return () => {
            if (glideInstanceRef.current) {
                glideInstanceRef.current.destroy();
                glideInstanceRef.current = null;
            }
        };
    }, [media, autoplay]);

    const handleImageClick = (index: number) => {
        if (enableLightbox) {
            setLightboxIndex(index);
            setLightboxOpen(true);
        }
    };

    if (!media || media.length === 0) {
        return (
            <div className={`text-center py-8 ${className}`}>
                <p className="text-zinc-500">No hay imágenes disponibles</p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Custom CSS para diseño estilo Threads */}
            <style jsx>{`
                .glide__slide {
                    height: auto !important;
                    flex-shrink: 0;
                }
                .glide__slide img {
                    width: 100% !important;
                    height: auto !important;
                    object-fit: contain !important;
                    cursor: pointer;
                }
                .glide__slide video {
                    width: 100% !important;
                    height: auto !important;
                    object-fit: contain !important;
                    cursor: pointer;
                }
            `}</style>

            {/* Header - Descripción arriba */}
            {(title || description) && (
                <div className="mb-4">
                    {title && (
                        <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
            )}

            {/* Glide Carousel - Estilo Threads */}
            <div ref={glideRef} className="glide relative w-full">
                <div className="overflow-hidden" data-glide-el="track">
                    <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility: hidden] [transform-style: preserve-3d] [touch-action: pan-Y] [will-change: transform] relative flex w-full overflow-hidden p-0">
                        {media.map((item, index) => (
                            <li key={item.id} className="glide__slide">
                                <div
                                    className="relative w-full flex items-center justify-center cursor-pointer overflow-hidden"
                                    onClick={() => handleImageClick(index)}
                                >
                                    {item.file_type === 'video' ? (
                                        <VideoPostCarousel
                                            video={item}
                                            onVideoRef={setVideoRef(index)}
                                            limitHeight={hasMultipleVideos}
                                            onPlay={() => {
                                                // Pausar otros videos cuando este se reproduce
                                                videoRefsRef.current.forEach((vid, idx) => {
                                                    if (vid && idx !== index) {
                                                        vid.pause();
                                                    }
                                                });
                                            }}
                                        />
                                    ) : (
                                        <Image
                                            src={item.file_url}
                                            alt={item.filename}
                                            width={800}
                                            height={800}
                                            className="w-full h-auto object-contain rounded-md"
                                            sizes="(max-width: 768px) 100vw, 80vw"
                                            priority={index === 0}
                                            unoptimized
                                        />
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Lightbox */}
            {enableLightbox && (
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
                    on={{
                        view: ({ index }) => setLightboxIndex(index),
                    }}
                    carousel={{
                        finite: false,
                        preload: 2,
                        padding: 0,
                        spacing: 0
                    }}
                    animation={{
                        fade: 300,
                        swipe: 500
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
        </div>
    );
}

