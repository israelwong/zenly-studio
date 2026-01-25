'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
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
    const mediaIdsRef = useRef<string>('');

    // Convertir PostMedia a MediaItem - memoizado para evitar re-renders innecesarios
    const mediaItems: MediaItem[] = useMemo(() => {
        return media.map(item => ({
            id: item.id,
            file_url: item.file_url,
            file_type: item.file_type,
            filename: item.filename,
            thumbnail_url: item.thumbnail_url,
            storage_path: item.file_url,
            display_order: item.display_order,
        }));
    }, [media]);

    // Preparar slides para lightbox - memoizado
    const lightboxSlides = useMemo(() => {
        return mediaItems.map(item => {
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
    }, [mediaItems]);

    useEffect(() => {
        if (!glideRef.current || !mediaItems.length) return;

        // Crear un string único basado en los IDs de media para comparar
        const currentMediaIds = mediaItems.map(m => m.id).join(',');

        // Si los mediaItems no han cambiado Y Glide ya está montado, no hacer nada
        if (mediaIdsRef.current === currentMediaIds && glideInstanceRef.current) {
            return;
        }

        // Guardar el índice actual antes de destruir (solo si existe instancia)
        const currentIndex = glideInstanceRef.current?.index ?? 0;

        // Limpiar instancia anterior si existe
        if (glideInstanceRef.current) {
            // Limpiar event listeners primero
            const oldTrackElement = glideRef.current.querySelector('[data-glide-el="track"]') as HTMLElement;
            if (oldTrackElement) {
                // Los listeners se limpian automáticamente al destruir Glide
            }
            glideInstanceRef.current.destroy();
            glideInstanceRef.current = null;
        }

        // Actualizar referencia de IDs
        mediaIdsRef.current = currentMediaIds;

        // Prevenir scroll vertical durante swipe horizontal
        let touchStartX = 0;
        let touchStartY = 0;
        let isSwiping = false;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isSwiping = false;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!touchStartX || !touchStartY) return;

            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const deltaX = Math.abs(touchX - touchStartX);
            const deltaY = Math.abs(touchY - touchStartY);

            // Solo bloquear scroll si el movimiento horizontal es claramente dominante
            // Ratio 1.5:1 y mínimo 20px de movimiento horizontal para evitar falsos positivos
            // Si el movimiento vertical es mayor o igual, permitir scroll normal
            if (deltaX > deltaY * 1.5 && deltaX > 20) {
                isSwiping = true;
                // Prevenir scroll vertical solo durante swipe horizontal claro
                e.preventDefault();
            }
            // Si no es un swipe horizontal claro, permitir scroll vertical normal
        };

        const handleTouchEnd = () => {
            touchStartX = 0;
            touchStartY = 0;
            isSwiping = false;
        };

        const trackElement = glideRef.current.querySelector('[data-glide-el="track"]') as HTMLElement;
        if (trackElement) {
            trackElement.addEventListener('touchstart', handleTouchStart, { passive: false });
            trackElement.addEventListener('touchmove', handleTouchMove, { passive: false });
            trackElement.addEventListener('touchend', handleTouchEnd, { passive: true });
        }

        const glideInstance = new Glide(glideRef.current, {
            type: 'carousel',
            focusAt: 'center',
            perView: 1,
            peek: { before: 0, after: 100 },
            autoplay: false,
            animationDuration: 180,
            gap: 8,
            dragThreshold: 12,
            swipeThreshold: 12,
            throttle: 8,
            touchRatio: 1.2,
            touchAngle: 45,
            perTouch: 1,
            classes: {
                activeNav: '[&>*]:bg-white',
            },
            breakpoints: {
                768: {
                    peek: { before: 0, after: 190 },
                    gap: 5,
                    dragThreshold: 10,
                    swipeThreshold: 10,
                    touchRatio: 1.2,
                    touchAngle: 45,
                    throttle: 8
                },
                640: {
                    peek: { before: 0, after: 150 },
                    gap: 4,
                    dragThreshold: 8,
                    swipeThreshold: 8,
                    touchRatio: 1.3,
                    touchAngle: 45,
                    throttle: 6
                }
            }
        });

        glideInstance.mount();
        glideInstanceRef.current = glideInstance;

        // Restaurar índice solo si los mediaItems cambiaron pero queremos mantener posición
        // (En este caso, siempre empezamos desde 0 para evitar confusión)

        return () => {
            // Limpiar event listeners
            if (trackElement) {
                trackElement.removeEventListener('touchstart', handleTouchStart);
                trackElement.removeEventListener('touchmove', handleTouchMove);
                trackElement.removeEventListener('touchend', handleTouchEnd);
            }
            // Destruir Glide solo en unmount completo del componente
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
                .post-carousel-glide {
                    user-select: none;
                    -webkit-user-select: none;
                    -webkit-touch-callout: none;
                }
                .post-carousel-glide .glide__slide {
                    height: 100% !important;
                    flex-shrink: 0;
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    user-select: none;
                    -webkit-user-select: none;
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
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    pointer-events: none;
                    user-select: none;
                    -webkit-user-select: none;
                }
                .post-carousel-glide .glide__slide video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    cursor: pointer;
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    pointer-events: none;
                    user-select: none;
                    -webkit-user-select: none;
                }
                .post-carousel-glide .glide__track {
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    touch-action: pan-x pan-y !important;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior-x: contain;
                }
                .post-carousel-glide .glide__slides {
                    touch-action: pan-x pan-y !important;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior-x: contain;
                }
                .post-carousel-glide .glide__slide {
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                @media (max-width: 640px) {
                    .post-carousel-glide .glide__track {
                        touch-action: pan-x pan-y !important;
                        overscroll-behavior-x: contain;
                    }
                    .post-carousel-glide .glide__slides {
                        touch-action: pan-x pan-y !important;
                        overscroll-behavior-x: contain;
                    }
                    .post-carousel-glide .glide__slide {
                        will-change: transform;
                        backface-visibility: hidden;
                        -webkit-backface-visibility: hidden;
                    }
                    .post-carousel-glide .glide__slide > div {
                        touch-action: pan-x pan-y !important;
                    }
                }
            `}</style>

            {/* Glide Carousel con altura fija - todas las imágenes del mismo tamaño - Full-bleed en móviles */}
            <div className="relative w-full aspect-square bg-zinc-900 overflow-hidden mx-0 lg:rounded-md">
                <div ref={glideRef} className="glide post-carousel-glide h-full">
                    <div className="overflow-hidden h-full" data-glide-el="track">
                        <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility: hidden] [transform-style: preserve-3d] [will-change: transform] relative flex w-full overflow-hidden p-0 h-full">
                            {mediaItems.map((item, index) => (
                                <li key={`${item.id}-${index}`} className="glide__slide">
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
