'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { HeroPortfolioConfig } from '@/types/content-blocks';
import { cn } from '@/lib/utils';

interface HeroPortfolioComponentProps {
    config: HeroPortfolioConfig;
    media: Array<{ file_url: string; file_type: string; filename: string; thumbnail_url?: string }>;
    className?: string;
    isEditable?: boolean;
    eventTypeName?: string; // Nombre del tipo de evento
}

export default function HeroPortfolioComponent({
    config,
    media,
    className = '',
    isEditable = false,
    eventTypeName
}: HeroPortfolioComponentProps) {
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [showPlayButton, setShowPlayButton] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const [parallaxOffset, setParallaxOffset] = useState(0);

    const {
        title,
        eventTypeName: configEventTypeName,
        description,
        overlay = true,
        overlayOpacity = 50,
        textAlignment = 'center',
        verticalAlignment = 'center',
        backgroundType = 'image',
        containerStyle = 'fullscreen',
        borderRadius = 'none',
        aspectRatio,
        gradientOverlay = false,
        gradientPosition = 'top',
        parallax = false,
    } = config;

    // Usar eventTypeName de props si está disponible, sino del config
    const displayEventTypeName = eventTypeName || configEventTypeName;

    const backgroundMedia = media[0];
    const isVideo = backgroundType === 'video' || backgroundMedia?.file_type === 'video';
    const videoSrc = isVideo ? backgroundMedia?.file_url : null;
    const imageSrc = !isVideo ? backgroundMedia?.file_url : null;
    const videoPoster = backgroundMedia?.thumbnail_url || backgroundMedia?.file_url;

    // Manejo de video
    useEffect(() => {
        if (!isVideo || !videoSrc || isEditable) return;

        const video = videoRef.current;
        if (!video) return;

        const playVideo = async () => {
            try {
                await video.play();
                setShowPlayButton(false);
            } catch (error) {
                console.log('Autoplay failed, user interaction required:', error);
                setShowPlayButton(true);
            }
        };

        const handlePlay = () => setShowPlayButton(false);
        const handlePause = () => setShowPlayButton(true);
        const handleEnded = () => setShowPlayButton(true);

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handleEnded);

        if (video.readyState >= 3) {
            playVideo();
        } else {
            video.addEventListener('canplay', playVideo, { once: true });
        }

        return () => {
            video.removeEventListener('canplay', playVideo);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handleEnded);
        };
    }, [videoSrc, isVideo, isEditable]);

    const handlePlayClick = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
                setShowPlayButton(false);
            } catch (error) {
                console.error('Error playing video:', error);
            }
        }
    };

    const textAlignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    };

    const verticalAlignmentClasses = {
        top: 'items-start',
        center: 'items-center',
        bottom: 'items-end'
    };

    const horizontalJustifyClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end'
    };

    const containerStyleClasses = {
        fullscreen: '',
        wrapped: 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-4'
    };

    const borderRadiusClasses = {
        none: '',
        md: 'rounded-md',
        lg: 'rounded-lg'
    };

    const aspectRatioClasses = {
        square: 'aspect-square',
        vertical: 'aspect-[3/4]'
    };

    const aspectRatioClass = aspectRatio ? aspectRatioClasses[aspectRatio] : '';

    const containerClassName = containerStyle === 'wrapped'
        ? `${containerStyleClasses.wrapped} ${borderRadiusClasses[borderRadius]}`
        : '';

    const contentPaddingClass = 'p-3';

    // Efecto parallax
    useEffect(() => {
        if (!parallax || isEditable) return;

        const findScrollContainer = (element: HTMLElement | null): HTMLElement | Window => {
            if (!element) return window;

            let parent = element.parentElement;
            while (parent) {
                const style = window.getComputedStyle(parent);
                const overflowY = style.overflowY || style.overflow;
                if (overflowY === 'auto' || overflowY === 'scroll') {
                    if (parent.scrollHeight > parent.clientHeight) {
                        return parent;
                    }
                }
                parent = parent.parentElement;
            }
            return window;
        };

        const scrollContainer = heroRef.current ? findScrollContainer(heroRef.current) : window;
        let rafId: number | null = null;
        let ticking = false;

        const calculateParallax = () => {
            if (!heroRef.current) return;

            const heroRect = heroRef.current.getBoundingClientRect();
            const heroTopInViewport = heroRect.top;
            const heroVisibleHeight = Math.max(0, Math.min(heroRect.height, window.innerHeight - heroTopInViewport));
            const scrollProgress = 1 - (heroVisibleHeight / heroRect.height);
            const parallaxFactor = 0.5;
            const heroHeight = heroRect.height;
            const centeringOffset = parallax ? heroHeight * 0.075 : 0;
            const maxOffset = 100;
            const scrollOffset = -scrollProgress * maxOffset * parallaxFactor;
            const offset = centeringOffset + scrollOffset;

            setParallaxOffset(offset);
            ticking = false;
        };

        const handleScroll = () => {
            if (ticking) return;
            ticking = true;
            rafId = requestAnimationFrame(calculateParallax);
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        handleScroll();

        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [parallax, isEditable]);

    return (
        <div
            ref={heroRef}
            className={cn(
                "relative flex",
                verticalAlignmentClasses[verticalAlignment],
                "justify-center overflow-hidden bg-zinc-900",
                aspectRatio ? aspectRatioClass : "min-h-[50vh] sm:min-h-[60vh]",
                containerClassName,
                className
            )}
        >
            {/* Fallback Background */}
            <div className={cn(
                "absolute inset-0 bg-linear-to-br from-zinc-800 to-zinc-900 -z-20",
                containerStyle === 'wrapped' && borderRadiusClasses[borderRadius]
            )} />

            {/* Background: Image */}
            {imageSrc && !isVideo && (
                <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
                    <div
                        style={{
                            position: 'absolute',
                            top: parallax ? '-7.5%' : 0,
                            left: parallax ? '-7.5%' : 0,
                            width: parallax ? '115%' : '100%',
                            height: parallax ? '115%' : '100%',
                            transform: parallax ? `translate3d(0, ${parallaxOffset}px, 0)` : undefined,
                            willChange: parallax ? 'transform' : undefined,
                            transition: 'none'
                        }}
                    >
                        <Image
                            src={imageSrc}
                            alt={backgroundMedia?.filename || 'Hero image'}
                            fill
                            priority
                            className="object-cover"
                            sizes="100vw"
                            style={{ transition: 'none' }}
                        />
                    </div>
                </div>
            )}

            {/* Background: Video */}
            {isVideo && videoSrc && (
                <>
                    <video
                        ref={videoRef}
                        className={`absolute inset-0 w-full h-full object-cover -z-10 transition-opacity duration-500 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                        autoPlay={config.autoPlay !== false}
                        muted={config.muted !== false}
                        loop={config.loop !== false}
                        controls={false}
                        poster={videoPoster}
                        playsInline
                        webkit-playsinline="true"
                        preload="auto"
                        onLoadedData={() => {
                            setIsVideoLoaded(true);
                            setVideoError(false);
                        }}
                        onCanPlay={() => {
                            setIsVideoLoaded(true);
                            setVideoError(false);
                        }}
                        onError={() => {
                            setVideoError(true);
                            setIsVideoLoaded(false);
                        }}
                        style={{
                            position: 'absolute',
                            top: parallax ? '-7.5%' : 0,
                            left: parallax ? '-7.5%' : 0,
                            width: parallax ? '115%' : '100%',
                            height: parallax ? '115%' : '100%',
                            objectFit: 'cover',
                            zIndex: 1,
                            transform: parallax ? `translate3d(0, ${parallaxOffset}px, 0)` : undefined,
                            willChange: parallax ? 'transform' : undefined,
                            transition: parallax ? 'none' : undefined
                        }}
                    >
                        <source src={videoSrc} type="video/mp4" />
                        Tu navegador no soporta el elemento video.
                    </video>

                    {!isVideoLoaded && !videoError && (
                        <div className="absolute inset-0 bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center" style={{ zIndex: 3 }}>
                            <div className="text-center">
                                <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-zinc-400 text-sm">Cargando video...</p>
                            </div>
                        </div>
                    )}

                    {showPlayButton && !videoError && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center" style={{ zIndex: 3 }}>
                            <button
                                onClick={handlePlayClick}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 transition-all duration-200 transform hover:scale-110"
                            >
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {videoError && (
                        <div className="absolute inset-0 bg-linear-to-br from-emerald-900/20 to-blue-900/20 flex items-center justify-center" style={{ zIndex: 3 }}>
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-zinc-700 rounded-lg flex items-center justify-center">
                                    <svg className="w-8 h-8 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                                <p className="text-zinc-400 text-sm">Error al cargar el video</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Overlay */}
            {overlay && (
                <div
                    className={`absolute inset-0 bg-black/${overlayOpacity}`}
                    style={{ zIndex: 2 }}
                />
            )}

            {/* Degradado de contraste */}
            {gradientOverlay && (
                <div
                    className="absolute inset-0"
                    style={{
                        zIndex: 3,
                        background: (() => {
                            const position = gradientPosition || 'top';
                            switch (position) {
                                case 'top':
                                    return 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)';
                                case 'bottom':
                                    return 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)';
                                case 'left':
                                    return 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)';
                                case 'right':
                                    return 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, transparent 100%)';
                                default:
                                    return 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)';
                            }
                        })()
                    }}
                />
            )}

            {/* Content */}
            <div className={cn(
                "relative z-10 w-full flex",
                verticalAlignmentClasses[verticalAlignment],
                horizontalJustifyClasses[textAlignment]
            )}>
                <div className={cn(
                    "max-w-3xl w-full",
                    contentPaddingClass,
                    textAlignmentClasses[textAlignment]
                )}>
                    {/* Event Type Name (Categoría) */}
                    {displayEventTypeName && (
                        <p className="text-xs sm:text-sm text-zinc-400 font-medium mb-2 sm:mb-3 uppercase tracking-wide">
                            {displayEventTypeName}
                        </p>
                    )}

                    {/* Title */}
                    {title && (
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                            {title}
                        </h1>
                    )}

                    {/* Description */}
                    {description && (
                        <p className="text-sm sm:text-lg text-zinc-300 mb-4 sm:mb-6 leading-relaxed max-w-2xl mx-auto">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
