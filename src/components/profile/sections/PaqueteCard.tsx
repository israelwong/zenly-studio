'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { PublicPaquete } from '@/types/public-profile';

interface PaqueteCardProps {
    paquete: PublicPaquete;
    variant?: 'default' | 'compact';
}

export function PaqueteCard({ paquete, variant = 'default' }: PaqueteCardProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const forceMutedIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(price);
    };

    // Si no está publicado, no renderizar
    if (paquete.status && paquete.status !== 'active') {
        return null;
    }

    const coverUrl = paquete.cover_url;
    const hasCover = !!coverUrl && typeof coverUrl === 'string' && coverUrl.trim() !== '';

    // Función robusta para detectar si es video (incluso con query strings)
    const isVideo = hasCover && (() => {
        if (!coverUrl) return false;
        const urlLower = coverUrl.toLowerCase();
        // Remover query string y fragmentos para validar extensión
        const urlPath = urlLower.split('?')[0].split('#')[0];
        // Verificar extensión de video
        const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.m4v', '.mkv'];
        return videoExtensions.some(ext => urlPath.endsWith(ext));
    })();

    const isFeatured = paquete.is_featured === true;

    // Función agresiva para forzar muted
    const forceMuted = React.useCallback(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Múltiples intentos de silenciar
        try {
            videoElement.muted = true;
            videoElement.volume = 0;

            // Forzar muted también desde el atributo HTML
            videoElement.setAttribute('muted', '');

            // Override temporal de volume para prevenir cambios
            if (!videoElement.dataset.volumeOverridden) {
                const originalVolume = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(videoElement), 'volume');
                if (originalVolume) {
                    Object.defineProperty(videoElement, 'volume', {
                        get: () => 0,
                        set: () => { },
                        configurable: true
                    });
                    videoElement.dataset.volumeOverridden = 'true';
                }
            }
        } catch (e) {
            // Silenciar errores
        }
    }, []);

    // Forzar muted en el video cuando se actualiza el componente
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
            e.preventDefault();
            forceMuted();
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

        // Agregar todos los listeners con capture para interceptar antes
        videoElement.addEventListener('volumechange', handleVolumeChange, { capture: true });
        videoElement.addEventListener('play', handlePlay, { capture: true });
        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('canplay', handleCanPlay);
        videoElement.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            if (forceMutedIntervalRef.current) {
                clearInterval(forceMutedIntervalRef.current);
            }
            videoElement.removeEventListener('volumechange', handleVolumeChange, { capture: true });
            videoElement.removeEventListener('play', handlePlay, { capture: true });
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('canplay', handleCanPlay);
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [coverUrl, isVideo, forceMuted]);

    const isCompact = variant === 'compact';

    return (
        <div className={`relative w-full ${isCompact ? 'aspect-[16/9]' : 'aspect-[4/5]'} rounded-lg overflow-hidden group cursor-pointer bg-zinc-900`}>
            {/* Imagen o video de fondo */}
            {hasCover ? (
                isVideo ? (
                    <video
                        key={`${paquete.id}-${coverUrl}`}
                        ref={videoRef}
                        src={coverUrl || undefined}
                        className="absolute inset-0 w-full h-full object-cover z-0"
                        autoPlay
                        muted
                        playsInline
                        loop
                        preload="auto"
                        style={{ pointerEvents: 'none' }}
                        onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            video.muted = true;
                            video.volume = 0;
                        }}
                        onCanPlay={(e) => {
                            const video = e.currentTarget;
                            video.muted = true;
                            video.volume = 0;
                        }}
                        onPlay={(e) => {
                            const video = e.currentTarget;
                            video.muted = true;
                            video.volume = 0;
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={coverUrl}
                            alt={paquete.nombre}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            priority={false}
                        />
                    </div>
                )
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 z-0" />
            )}

            {/* Gradiente de sombra de abajo hacia arriba - semi-transparente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[1]" />

            {/* Label "Recomendado" si está destacado */}
            {isFeatured && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-white text-white" />
                    <span className="text-[10px] font-medium text-white leading-tight whitespace-nowrap">Recomendado</span>
                </div>
            )}

            {/* Contenido */}
            <div className={`absolute bottom-0 left-0 right-0 ${isCompact ? 'p-3' : 'p-6'} z-10`}>
                <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
                    {/* Nombre */}
                    <h3 className={`${isCompact ? 'text-base' : 'text-xl'} font-bold text-white leading-tight ${isCompact ? 'line-clamp-1' : ''}`}>
                        {paquete.nombre}
                    </h3>

                    {/* Precio */}
                    <div className={`${isCompact ? 'text-lg' : 'text-2xl'} font-semibold text-purple-400`}>
                        {formatPrice(paquete.precio)}
                    </div>

                    {/* Descripción - solo en variant default */}
                    {!isCompact && paquete.descripcion && (
                        <p className="text-sm text-zinc-200 line-clamp-2 leading-relaxed">
                            {paquete.descripcion}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
