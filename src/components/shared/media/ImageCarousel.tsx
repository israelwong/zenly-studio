'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { MediaItem } from '@/types/content-blocks';
import Glide from '@glidejs/glide';
import '@glidejs/glide/dist/css/glide.core.min.css';
import '@glidejs/glide/dist/css/glide.theme.min.css';
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { VideoPostCarousel } from './VideoPostCarousel';
import { useDynamicBackground } from '@/contexts/DynamicBackgroundContext';
import ColorThief from 'colorthief';

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
    const [imagesReady, setImagesReady] = useState(false);
    const loadedCountRef = useRef(0);
    const totalImages = media.filter(m => m.file_type !== 'video').length;

    const handleImageLoaded = () => {
        loadedCountRef.current += 1;
        if (loadedCountRef.current >= totalImages) {
            setImagesReady(true);
        }
    };

    // Intentar usar el context, pero no fallar si no existe
    let setColors: ((colors: { primary: string; accent: string }) => void) | undefined;
    try {
        const context = useDynamicBackground();
        setColors = context.setColors;
    } catch {
        // No hay context, no pasa nada
        setColors = undefined;
    }

    // Detectar si hay múltiples videos para limitar altura
    const hasMultipleVideos = media.length > 1 && media.some(item => item.file_type === 'video');

    // Función para extraer colores de una imagen
    const extractColors = (imageUrl: string) => {
        if (!setColors) return; // No hay context, saltar

        const img = document.createElement('img');
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 2);

                if (palette && setColors) {
                    const rgbToHex = (r: number, g: number, b: number): string => {
                        return '#' + [r, g, b].map(x => {
                            const hex = x.toString(16);
                            return hex.length === 1 ? '0' + hex : hex;
                        }).join('');
                    };

                    setColors({
                        primary: rgbToHex(palette[0][0], palette[0][1], palette[0][2]),
                        accent: rgbToHex(palette[1][0], palette[1][1], palette[1][2]),
                    });
                }
            } catch (error) {
                console.error('Error extracting colors from carousel:', error);
            }
        };

        img.src = imageUrl;
    };

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

    // Fallback: si las imágenes tardan más de 3s, montar Glide de todas formas
    useEffect(() => {
        if (imagesReady || totalImages === 0) return;
        const timer = setTimeout(() => setImagesReady(true), 3000);
        return () => clearTimeout(timer);
    }, [imagesReady, totalImages]);

    // Si no hay imágenes (solo videos), marcar ready de inmediato
    useEffect(() => {
        if (totalImages === 0 && media.length > 0) {
            setImagesReady(true);
        }
    }, [totalImages, media.length]);

    // Reset al cambiar media
    useEffect(() => {
        loadedCountRef.current = 0;
        setImagesReady(totalImages === 0);
    }, [media, totalImages]);

    useEffect(() => {
        if (!glideRef.current || !media.length || !imagesReady) return;

        const glideInstance = new Glide(glideRef.current, {
            type: 'carousel',
            focusAt: 'center',
            perView: 1,
            peek: { before: 0, after: 80 },
            autoplay: autoplay > 0 ? autoplay : false,
            animationDuration: 200,
            gap: 12,
            dragThreshold: 15,
            swipeThreshold: 15,
            touchAngle: 45,
            touchRatio: 1.5,
            throttle: 16,
            classes: {
                activeNav: '[&>*]:bg-white',
            },
            breakpoints: {
                768: { peek: { before: 0, after: 60 }, gap: 10 },
                640: { peek: { before: 0, after: 50 }, gap: 8 }
            }
        });

        // Detectar cambios de slide y extraer colores
        glideInstance.on('run.after', () => {
            const currentIndex = glideInstance.index;
            const currentMedia = media[currentIndex];

            // Solo extraer colores de imágenes
            if (currentMedia && currentMedia.file_type === 'image') {
                extractColors(currentMedia.file_url);
            }
        });

        glideInstance.mount();
        glideInstanceRef.current = glideInstance;

        // Extraer colores de la primera imagen al montar
        if (media[0] && media[0].file_type === 'image') {
            extractColors(media[0].file_url);
        }

        return () => {
            if (glideInstanceRef.current) {
                glideInstanceRef.current.destroy();
                glideInstanceRef.current = null;
            }
        };
    }, [media, autoplay, setColors, imagesReady]);

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
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                }
                .glide__slide img {
                    width: 100% !important;
                    height: auto !important;
                    object-fit: contain !important;
                    cursor: pointer;
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                }
                .glide__slide video {
                    width: 100% !important;
                    height: auto !important;
                    object-fit: contain !important;
                    cursor: pointer;
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                }
                .glide__track {
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
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

            {/* Skeleton: [peek izq] [slide principal] [peek der] como el slider real */}
            {!imagesReady && (
                <div className="w-full overflow-hidden rounded-lg">
                    <div className="flex gap-1.5 sm:gap-2 w-full items-stretch min-h-[280px] sm:min-h-[320px]">
                        <div className="w-12 sm:w-16 shrink-0 min-h-[280px] sm:min-h-[320px] bg-zinc-700/90 rounded-l-lg animate-pulse" aria-hidden />
                        <div className="flex-1 min-w-0 min-h-[280px] sm:min-h-[320px] bg-zinc-800 rounded-lg animate-pulse shrink-0" aria-hidden />
                        <div className="w-14 sm:w-20 shrink-0 min-h-[280px] sm:min-h-[320px] bg-zinc-700/90 rounded-r-lg animate-pulse" aria-hidden />
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin shrink-0" />
                        <span className="text-xs text-zinc-500">Cargando galería...</span>
                    </div>
                </div>
            )}

            {/* Glide Carousel - visible solo cuando las imágenes cargaron */}
            <div ref={glideRef} className={`glide relative w-full ${imagesReady ? '' : 'h-0 overflow-hidden'}`}>
                <div className="overflow-hidden" data-glide-el="track">
                    <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility:hidden] [transform-style:preserve-3d] touch-pan-y [will-change:transform] relative flex w-full overflow-hidden p-0">
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
                                            onLoad={handleImageLoaded}
                                            onError={handleImageLoaded}
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
                    plugins={[Video, Zoom]}
                    video={{
                        controls: true,
                        playsInline: true,
                        autoPlay: true,
                        muted: true,
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
                        fade: 200,
                        swipe: 250
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

