'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { MediaItem } from '@/types/content-blocks';

interface VideoPostCarouselProps {
    video: MediaItem;
    className?: string;
    onPlay?: () => void;
    onPause?: () => void;
    onVideoRef?: (video: HTMLVideoElement | null) => void;
}

/**
 * VideoPostCarousel - Componente de video para carrusel de posts
 * 
 * Características:
 * - Autoplay activado
 * - Sonido COMPLETAMENTE desactivado (muted + volumen 0 + override de propiedades)
 * - Sin controles de volumen visibles
 * - Se puede pausar/reproducir manualmente
 * - Pausa automáticamente cuando sale de vista
 */
export function VideoPostCarousel({
    video,
    className = '',
    onPlay,
    onPause,
    onVideoRef
}: VideoPostCarouselProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const forceMutedIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Función agresiva para forzar muted
    const forceMuted = useCallback(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Múltiples intentos de silenciar
        try {
            videoElement.muted = true;
            videoElement.volume = 0;
            
            // Override de propiedades para prevenir cambios
            Object.defineProperty(videoElement, 'volume', {
                get: () => 0,
                set: () => {},
                configurable: true
            });
            
            // Forzar muted también desde el atributo HTML
            videoElement.setAttribute('muted', '');
            videoElement.removeAttribute('volume');
        } catch (e) {
            // Silenciar errores
        }
    }, []);

    // Exponer la referencia al componente padre
    useEffect(() => {
        if (onVideoRef) {
            onVideoRef(videoRef.current);
        }
        return () => {
            if (onVideoRef) {
                onVideoRef(null);
            }
        };
    }, [onVideoRef]);

    // Manejo agresivo de muted con verificación continua
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Forzar inmediatamente
        forceMuted();

        // Verificar cada 50ms (más frecuente)
        forceMutedIntervalRef.current = setInterval(forceMuted, 50);

        // Handlers para todos los eventos posibles
        const handleVolumeChange = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            forceMuted();
        };

        const handlePlay = (e: Event) => {
            forceMuted();
            onPlay?.();
        };

        const handlePause = () => {
            onPause?.();
        };

        const handleLoadedMetadata = () => {
            forceMuted();
        };

        const handleCanPlay = () => {
            forceMuted();
        };

        const handleTimeUpdate = () => {
            // Verificar en cada frame de actualización
            if (!videoElement.muted || videoElement.volume > 0) {
                forceMuted();
            }
        };

        // Agregar todos los listeners
        videoElement.addEventListener('volumechange', handleVolumeChange, { capture: true });
        videoElement.addEventListener('play', handlePlay);
        videoElement.addEventListener('pause', handlePause);
        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('canplay', handleCanPlay);
        videoElement.addEventListener('timeupdate', handleTimeUpdate);

        // Interceptar cambios de propiedad
        const originalVolumeSetter = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume')?.set;
        if (originalVolumeSetter) {
            Object.defineProperty(videoElement, 'volume', {
                get: () => 0,
                set: () => {
                    // No hacer nada, mantener en 0
                },
                configurable: true
            });
        }

        return () => {
            if (forceMutedIntervalRef.current) {
                clearInterval(forceMutedIntervalRef.current);
            }
            videoElement.removeEventListener('volumechange', handleVolumeChange, { capture: true });
            videoElement.removeEventListener('play', handlePlay);
            videoElement.removeEventListener('pause', handlePause);
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('canplay', handleCanPlay);
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [video.file_url, onPlay, onPause, forceMuted]);

    // Intersection Observer para pausar cuando sale de vista
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        videoElement.pause();
                    } else {
                        if (videoElement.autoplay) {
                            forceMuted(); // Asegurar muted antes de reproducir
                            videoElement.play().catch(() => {
                                // Silenciar errores de autoplay
                            });
                        }
                    }
                });
            },
            {
                threshold: 0.5
            }
        );

        observerRef.current.observe(videoElement);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [forceMuted]);

    return (
        <>
            <style jsx>{`
                video {
                    --video-volume: 0 !important;
                }
                video::-webkit-media-controls-volume-slider {
                    display: none !important;
                }
                video::-webkit-media-controls-mute-button {
                    display: none !important;
                }
            `}</style>
            <video
                ref={videoRef}
                src={video.file_url}
                poster={video.thumbnail_url}
                className={`w-full h-auto object-contain rounded-md ${className}`}
                controls={false}
                playsInline
                muted
                autoPlay
                loop
                disableRemotePlayback
                disablePictureInPicture
                onLoadedMetadata={(e) => {
                    forceMuted();
                }}
                onCanPlay={(e) => {
                    forceMuted();
                }}
                onPlay={(e) => {
                    forceMuted();
                }}
            />
        </>
    );
}

