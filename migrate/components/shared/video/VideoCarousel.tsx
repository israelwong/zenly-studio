'use client'
import React, { useEffect, useRef } from 'react'
import Glide from '@glidejs/glide'
import VideoPlayer from './VideoPlayer'

export type VideoCarouselVariant = 'single' | 'multiple' | 'fullwidth'

interface VideoCarouselProps {
    videos: Array<{
        src: string
        poster?: string
        title?: string
        description?: string
    }>
    variant?: VideoCarouselVariant
    autoplay?: boolean | number
    perView?: number
    gap?: number
    animationDuration?: number
    className?: string
    // Configuración responsive
    breakpoints?: {
        [key: number]: {
            perView?: number
            gap?: number
        }
    }
    // Props para videos individuales
    videoAutoPlay?: boolean
    videoMuted?: boolean
    videoLoop?: boolean
}

export default function VideoCarousel({
    videos,
    variant = 'multiple',
    autoplay = false, // Por defecto no autoplay en carousels de video
    perView = 1.5,
    gap = 20,
    animationDuration = 700,
    className = '',
    breakpoints = {
        1024: { perView: 2 },
        640: { perView: 1 }
    },
    videoAutoPlay = false,
    videoMuted = true,
    videoLoop = true
}: VideoCarouselProps) {
    const sliderRef = useRef<HTMLDivElement>(null)
    const glideRef = useRef<Glide | null>(null)

    // Configuraciones predefinidas por variante
    const getVariantConfig = (): any => {
        switch (variant) {
            case 'single':
                return {
                    type: 'carousel',
                    startAt: 0,
                    perView: 1,
                    gap: 0,
                    focusAt: 'center',
                    autoplay: autoplay || false,
                    animationDuration
                }
            case 'fullwidth':
                return {
                    type: 'carousel',
                    startAt: 0,
                    perView: perView,
                    gap: gap,
                    autoplay: autoplay || false,
                    animationDuration,
                    breakpoints
                }
            default: // multiple
                return {
                    type: 'carousel',
                    startAt: 0,
                    perView: perView,
                    gap: gap,
                    autoplay: autoplay || false,
                    animationDuration,
                    breakpoints
                }
        }
    }

    useEffect(() => {
        if (sliderRef.current && videos.length > 0) {
            try {
                const config = getVariantConfig()
                glideRef.current = new Glide(sliderRef.current, config)
                glideRef.current.mount()

                return () => {
                    if (glideRef.current) {
                        glideRef.current.destroy()
                    }
                }
            } catch (error) {
                console.error('Error inicializando VideoCarousel:', error)
            }
        }
    }, [videos, variant, perView, gap, autoplay, animationDuration])

    const containerClasses = {
        single: 'max-w-screen-lg mx-auto',
        multiple: 'max-w-screen-xl mx-auto',
        fullwidth: 'w-full'
    }

    if (videos.length === 0) {
        return (
            <div className="text-center py-8 text-zinc-400">
                No hay videos disponibles
            </div>
        )
    }

    return (
        <div className={`${containerClasses[variant]} ${className}`}>
            <div className="glide" ref={sliderRef}>
                <div className="glide__track" data-glide-el="track">
                    <ul className="glide__slides">
                        {videos.map((video, index) => (
                            <li key={index} className="glide__slide">
                                <div className="relative group">
                                    <div className="w-full h-auto rounded-lg overflow-hidden">
                                        <VideoPlayer
                                            src={video.src}
                                            autoPlay={videoAutoPlay}
                                            muted={videoMuted}
                                            loop={videoLoop}
                                            poster={video.poster}
                                        />
                                    </div>

                                    {/* Overlay con información del video */}
                                    {(video.title || video.description) && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            {video.title && (
                                                <h4 className="text-white font-semibold text-lg mb-1">
                                                    {video.title}
                                                </h4>
                                            )}
                                            {video.description && (
                                                <p className="text-zinc-300 text-sm">
                                                    {video.description}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Controles de navegación */}
                {videos.length > 1 && (
                    <div className="glide__arrows" data-glide-el="controls">
                        <button
                            className="glide__arrow glide__arrow--left absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-300 z-10"
                            data-glide-dir="<"
                            aria-label="Video anterior"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            className="glide__arrow glide__arrow--right absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-300 z-10"
                            data-glide-dir=">"
                            aria-label="Siguiente video"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
