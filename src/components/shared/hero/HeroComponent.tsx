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
}

export default function HeroComponent({
    config,
    media,
    className = '',
    isEditable = false
}: HeroComponentProps) {
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [showPlayButton, setShowPlayButton] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

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
    } = config;

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

    // Padding uniforme: mismo valor para todos los lados (p-3)
    const contentPaddingClass = 'p-3';

    return (
        <div
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
                <Image
                    src={imageSrc}
                    alt={backgroundMedia?.filename || 'Hero image'}
                    fill
                    priority
                    className="object-cover"
                    sizes="100vw"
                    style={{ zIndex: 1 }}
                />
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
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 1
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
                    "max-w-3xl w-full",
                    contentPaddingClass,
                    textAlignmentClasses[textAlignment]
                )}>
                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-zinc-400 font-medium mb-2 sm:mb-3 uppercase tracking-wide">
                            {subtitle}
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

                    {/* Buttons */}
                    {buttons.length > 0 && (
                        <div className={cn(
                            "flex flex-col sm:flex-row gap-2 sm:gap-3",
                            textAlignment === 'center' ? 'justify-center' : textAlignment === 'right' ? 'justify-end' : 'justify-start',
                            "w-full"
                        )}>
                            {buttons.slice(0, 2).map((button, index) => {
                                const buttonEffect = (button.buttonEffect || (button.pulse ? 'pulse' : 'none')) as 'none' | 'pulse' | 'border-spin' | 'radial-glow';

                                // Estilos de borderRadius (sobrescriben el rounded-md default)
                                const borderRadiusClasses = {
                                    normal: '',
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

                                return button.href ? (
                                    <ZenButtonWithEffects
                                        key={index}
                                        asChild
                                        variant={getButtonVariant(button.variant)}
                                        size="md"
                                        effect={buttonEffect}
                                        className={cn(
                                            "text-xs sm:text-base",
                                            "w-full sm:w-auto sm:min-w-0",
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
                                            className="block w-full"
                                        >
                                            {button.text}
                                        </Link>
                                    </ZenButtonWithEffects>
                                ) : (
                                    <ZenButtonWithEffects
                                        key={index}
                                        variant={getButtonVariant(button.variant)}
                                        size="md"
                                        effect={buttonEffect}
                                        className={cn(
                                            "text-xs sm:text-base",
                                            "w-full sm:w-auto sm:min-w-0",
                                            "whitespace-normal break-words",
                                            "text-center",
                                            borderRadiusClass,
                                            borderClass,
                                            shadowClass
                                        )}
                                        style={customColorStyle}
                                        onClick={button.onClick}
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

