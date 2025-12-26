'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ZenButtonWithEffects } from '@/components/ui/zen';
import { HeroConfig } from '@/types/content-blocks';
import { cn } from '@/lib/utils';

interface HeroComponentProps {
    config: HeroConfig;
    media: Array<{ file_url: string; file_type: string; filename: string; thumbnail_url?: string }>;
    className?: string;
    isEditable?: boolean;
    // Contexto para determinar comportamiento de botones
    context?: 'portfolio' | 'offer';
    // Modo preview: deshabilitar botones
    isPreview?: boolean;
}

export default function HeroComponent({
    config,
    media,
    className = '',
    isEditable = false,
    context,
    isPreview = false
}: HeroComponentProps) {
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [showPlayButton, setShowPlayButton] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const [parallaxOffset, setParallaxOffset] = useState(0);

    const {
        title,
        subtitle,
        description,
        buttons = [],
        overlay = true,
        overlayOpacity = 50,
        textAlignment = 'center',
        verticalAlignment = 'center',
        backgroundType = 'image',
        containerStyle = 'fullscreen',
        borderRadius = 'none',
        aspectRatio,
        borderColor,
        borderWidth,
        borderStyle,
        gradientOverlay = false,
        gradientPosition = 'top',
        parallax = false,
    } = config;

    const backgroundMedia = media[0];
    const isVideo = backgroundType === 'video' || backgroundMedia?.file_type === 'video';
    const videoSrc = isVideo ? backgroundMedia?.file_url : null;
    const imageSrc = !isVideo ? backgroundMedia?.file_url : null;
    const videoPoster = backgroundMedia?.thumbnail_url || backgroundMedia?.file_url;

    // Carga proactiva del video (forzar carga inmediata)
    useEffect(() => {
        if (!isVideo || !videoSrc || isEditable) return;

        const video = videoRef.current;
        if (!video) return;

        // Forzar carga inmediata del video
        video.load();
    }, [videoSrc, isVideo, isEditable]);

    // Manejo de video y autoplay
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

    const getButtonVariant = (variant?: string): 'primary' | 'secondary' | 'outline' | 'ghost' => {
        switch (variant) {
            case 'primary': return 'primary';
            case 'secondary': return 'secondary';
            case 'outline': return 'outline';
            case 'ghost': return 'ghost';
            case 'gradient': return 'primary';
            default: return 'primary';
        }
    };


    const borderStyles = borderColor && borderWidth && borderWidth > 0 && borderStyle
        ? {
            borderColor,
            borderWidth: `${borderWidth}px`,
            borderStyle
        }
        : {};

    const containerClassName = containerStyle === 'wrapped'
        ? `${containerStyleClasses.wrapped} ${borderRadiusClasses[borderRadius]}`
        : '';

    // Padding: siempre agregar padding para respiración del contenido
    const contentPaddingClass = containerStyle === 'wrapped' ? 'p-5' : 'px-4 py-8 sm:px-6 sm:py-12';

    // Efecto parallax mejorado para mobile preview
    useEffect(() => {
        if (!parallax || isEditable) return;

        // Buscar contenedor con scroll (para mobile preview)
        const findScrollContainer = (element: HTMLElement | null): HTMLElement | Window => {
            if (!element) return window;

            let parent = element.parentElement;
            while (parent) {
                const style = window.getComputedStyle(parent);
                const overflowY = style.overflowY || style.overflow;
                const overflowX = style.overflowX || style.overflow;
                if ((overflowY === 'auto' || overflowY === 'scroll') ||
                    (overflowX === 'auto' || overflowX === 'scroll')) {
                    // Verificar que realmente tenga scroll
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

            // Obtener scroll position del contenedor
            let scrollTop = 0;
            let containerHeight = window.innerHeight;

            if (scrollContainer instanceof Window) {
                scrollTop = window.scrollY || window.pageYOffset || 0;
                containerHeight = window.innerHeight;
            } else {
                scrollTop = scrollContainer.scrollTop || 0;
                const containerRect = scrollContainer.getBoundingClientRect();
                containerHeight = containerRect.height;
            }

            // Calcular posición del hero en el viewport
            // heroRect.top: distancia desde el top del viewport hasta el top del hero
            // Cuando heroRect.top <= 0, el hero ya empezó a salirse del viewport
            const heroTopInViewport = heroRect.top;
            const heroVisibleHeight = Math.max(0, Math.min(heroRect.height, containerHeight - heroTopInViewport));
            const scrollProgress = 1 - (heroVisibleHeight / heroRect.height);

            // Parallax: el fondo se mueve más lento que el scroll (50% de velocidad)
            const parallaxFactor = 0.5;

            // Calcular offset: cuando scrollProgress = 0 (hero completamente visible arriba), offset = 0
            // Offset inicial centrado: la imagen al 130% necesita estar desplazada 15% hacia abajo para centrarse
            // Si el hero tiene altura h, necesitamos mover (130% - 100%) / 2 = 15% hacia abajo
            const heroHeight = heroRect.height;
            const centeringOffset = parallax ? heroHeight * 0.15 : 0; // 15% de la altura para centrar 130%

            // Parallax scroll offset: conforme scrolleas, el fondo se mueve más lento
            const maxOffset = 150; // Máximo desplazamiento en píxeles
            const scrollOffset = -scrollProgress * maxOffset * parallaxFactor;

            // Offset total: centrado inicial + movimiento parallax
            const offset = centeringOffset + scrollOffset;

            setParallaxOffset(offset);
            ticking = false;
        };

        const handleScroll = () => {
            if (ticking) return;
            ticking = true;
            rafId = requestAnimationFrame(calculateParallax);
        };

        // Agregar listener al contenedor correcto
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        // También escuchar resize para recalcular
        window.addEventListener('resize', handleScroll, { passive: true });
        handleScroll(); // Calcular valor inicial

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
            style={containerStyle === 'wrapped' && Object.keys(borderStyles).length > 0 ? borderStyles : undefined}
        >
            {/* Fallback Background */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 -z-20",
                containerStyle === 'wrapped' && borderRadiusClasses[borderRadius]
            )} />

            {/* Background: Image */}
            {imageSrc && !isVideo && (
                <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                        zIndex: 1
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: parallax ? '-15%' : 0,
                            left: parallax ? '-15%' : 0,
                            width: parallax ? '130%' : '100%',
                            height: parallax ? '130%' : '100%',
                            transform: parallax
                                ? `translate3d(0, ${parallaxOffset}px, 0)`
                                : undefined,
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
                            style={{
                                transition: 'none'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Background: Video */}
            {isVideo && videoSrc && videoSrc !== '/placeholder-video.mp4' && (
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
                        // @ts-expect-error - fetchPriority no está en tipos pero es soportado
                        fetchPriority="high"
                        onLoadedData={() => {
                            setIsVideoLoaded(true);
                            setVideoError(false);
                        }}
                        onCanPlay={() => {
                            setIsVideoLoaded(true);
                            setVideoError(false);
                        }}
                        onLoadedMetadata={() => {
                            // Marcar como cargado cuando los metadatos están listos (más rápido)
                            setIsVideoLoaded(true);
                        }}
                        onError={() => {
                            setVideoError(true);
                            setIsVideoLoaded(false);
                        }}
                        style={{
                            position: 'absolute',
                            top: parallax ? '-15%' : 0,
                            left: parallax ? '-15%' : 0,
                            width: parallax ? '130%' : '100%',
                            height: parallax ? '130%' : '100%',
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

                    {/* Loading state */}
                    {!isVideoLoaded && !videoError && (
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center" style={{ zIndex: 3 }}>
                            <div className="text-center">
                                <div className="w-8 h-8 mx-auto mb-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-zinc-400 text-sm">Cargando video...</p>
                            </div>
                        </div>
                    )}

                    {/* Play button for mobile */}
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

                    {/* Error state */}
                    {videoError && (
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-blue-900/20 flex items-center justify-center" style={{ zIndex: 3 }}>
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
                    "w-full",
                    containerStyle === 'wrapped' ? "max-w-3xl" : "",
                    contentPaddingClass,
                    textAlignmentClasses[textAlignment]
                )}>
                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-zinc-400 font-medium mb-1 sm:mb-2 uppercase tracking-wide">
                            {subtitle}
                        </p>
                    )}

                    {/* Title */}
                    {title && (
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 leading-tight">
                            {title}
                        </h1>
                    )}

                    {/* Description */}
                    {description && (
                        <p className="text-sm sm:text-lg text-zinc-300 mb-3 sm:mb-4 leading-relaxed max-w-2xl mx-auto">
                            {description}
                        </p>
                    )}

                    {/* Buttons - Ocultar en portfolios (objetivo: presentar, no generar leads) */}
                    {buttons.length > 0 && context !== 'portfolio' && (
                        <div className={cn(
                            "flex flex-wrap gap-3",
                            textAlignment === 'center' ? 'justify-center' : textAlignment === 'right' ? 'justify-end' : 'justify-start',
                            "w-full"
                        )}>
                            {buttons.map((button, index) => {
                                const buttonEffect = (button.buttonEffect || (button.pulse ? 'pulse' : 'none')) as 'none' | 'pulse' | 'border-spin' | 'radial-glow';
                                const shouldDisable = isPreview || isEditable;

                                // Estilos de borderRadius (sobrescriben el rounded-md default)
                                const borderRadiusClasses = {
                                    normal: '!rounded-none',
                                    sm: '!rounded-sm',
                                    full: '!rounded-full'
                                };
                                const borderRadiusClass = borderRadiusClasses[button.borderRadius || 'normal'];

                                // Estilos de borde adicional
                                const borderClass = button.withBorder ? 'border-2 border-zinc-400/30' : '';

                                // Estilos de sombra (sutil para separar del fondo)
                                const shadowPosition = button.shadowPosition || 'full';
                                const shadowClass = button.shadow
                                    ? shadowPosition === 'bottom'
                                        ? 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2)]'
                                        : 'shadow-lg shadow-black/20'
                                    : '';

                                // Estilos personalizados para color personalizado
                                const customColorStyle = button.customColor ? (() => {
                                    const variant = button.variant || 'primary';
                                    if (variant === 'outline') {
                                        return {
                                            borderColor: button.customColor,
                                            color: button.customColor
                                        };
                                    } else if (variant === 'ghost') {
                                        return {
                                            color: button.customColor
                                        };
                                    } else {
                                        // primary, secondary, etc.
                                        return {
                                            backgroundColor: button.customColor,
                                            borderColor: button.customColor,
                                            color: '#ffffff'
                                        };
                                    }
                                })() : undefined;

                                // Si tiene href
                                if (button.href) {
                                    // Si está deshabilitado, renderizar como botón simple sin Link
                                    if (shouldDisable) {
                                        return (
                                            <ZenButtonWithEffects
                                                key={index}
                                                variant={getButtonVariant(button.variant)}
                                                size="md"
                                                effect="none"
                                                disabled={true}
                                                className={cn(
                                                    "text-xs sm:text-base",
                                                    "w-auto min-w-fit max-w-[calc(50%-0.75rem)]",
                                                    "whitespace-normal break-words",
                                                    "text-center",
                                                    borderRadiusClass,
                                                    borderClass,
                                                    shadowClass,
                                                    "opacity-50 cursor-not-allowed"
                                                )}
                                                style={customColorStyle}
                                                onClick={(e) => e.preventDefault()}
                                            >
                                                {button.text}
                                            </ZenButtonWithEffects>
                                        );
                                    }

                                    // Si NO está deshabilitado, renderizar con Link
                                    return (
                                        <ZenButtonWithEffects
                                            key={index}
                                            asChild
                                            variant={getButtonVariant(button.variant)}
                                            size="md"
                                            effect={buttonEffect}
                                            className={cn(
                                                "text-xs sm:text-base",
                                                "w-auto min-w-fit max-w-[calc(50%-0.75rem)]",
                                                "whitespace-normal break-words",
                                                "text-center",
                                                borderRadiusClass,
                                                borderClass,
                                                shadowClass
                                            )}
                                            style={customColorStyle}
                                        >
                                            <Link
                                                href={button.href}
                                                target={button.target || (button.linkType === 'external' ? '_blank' : '_self')}
                                                onClick={button.onClick}
                                                className="block"
                                                prefetch={false}
                                            >
                                                {button.text}
                                            </Link>
                                        </ZenButtonWithEffects>
                                    );
                                }

                                // Botones sin href
                                return (
                                    <ZenButtonWithEffects
                                        key={index}
                                        variant={getButtonVariant(button.variant)}
                                        size="md"
                                        effect={shouldDisable ? 'none' : buttonEffect}
                                        disabled={shouldDisable}
                                        className={cn(
                                            "text-xs sm:text-base",
                                            "w-auto min-w-fit max-w-[calc(50%-0.75rem)]",
                                            "whitespace-normal break-words",
                                            "text-center",
                                            borderRadiusClass,
                                            borderClass,
                                            shadowClass,
                                            shouldDisable && "opacity-50 cursor-not-allowed"
                                        )}
                                        style={customColorStyle}
                                        onClick={shouldDisable ? (e) => e.preventDefault() : button.onClick}
                                    >
                                        {button.text}
                                    </ZenButtonWithEffects>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

