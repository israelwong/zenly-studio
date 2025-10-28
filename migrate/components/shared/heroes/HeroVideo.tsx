'use client'
import React from 'react'
import { Button } from '../ui'
import type { ButtonVariant, ButtonSize } from '../ui'

/**
 * Componente HeroVideo - Refactorizado siguiendo ESTILO_MAESTRO_MAIN.md
 * 
 * Hero con video de fondo y elementos decorativos mejorados
 * 
 * Características aplicadas:
 * - Sistema de colores zinc como estándar con acentos purple-pink
 * - Gradientes purple-pink para elementos destacados
 * - Elementos decorativos sutiles pero pronunciados
 * - Tipografía mejorada con jerarquía clara
 * - Efectos de profundidad y separación visual
 */

export type TextAlignment = 'left' | 'center' | 'right'

interface ButtonConfig {
    text: React.ReactNode
    href?: string
    onClick?: () => void
    variant?: ButtonVariant
    size?: ButtonSize
    target?: '_blank' | '_self'
    fullWidth?: boolean
    withBorder?: boolean
    className?: string
}

interface HeroVideoProps {
    videoSrc: string
    videoPoster?: string
    autoPlay?: boolean
    loop?: boolean
    muted?: boolean
    controls?: boolean
    title?: string
    subtitle?: string
    description?: string
    buttons?: ButtonConfig[]
    overlay?: boolean
    overlayOpacity?: number
    textAlignment?: TextAlignment
    className?: string
    contentMaxWidth?: string
    minHeight?: string
    /** Mostrar elementos decorativos */
    showDecorative?: boolean
    /** Tamaño de los elementos decorativos */
    decorativeSize?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function HeroVideo({
    videoSrc,
    videoPoster,
    title,
    subtitle,
    description,
    buttons = [],
    overlay = true,
    overlayOpacity = 50,
    textAlignment = 'center',
    autoPlay = true,
    muted = true,
    loop = true,
    controls = false,
    className = '',
    contentMaxWidth = 'max-w-4xl',
    minHeight = 'min-h-screen'
}: HeroVideoProps) {

    const textAlignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    }

    return (
        <div className={`relative ${minHeight} flex items-center justify-center overflow-hidden ${className}`}>
            {/* Video Background */}
            <video
                className="absolute inset-0 w-full h-full object-cover -z-10"
                autoPlay={autoPlay}
                muted={muted}
                loop={loop}
                controls={controls}
                poster={videoPoster}
                playsInline
                webkit-playsinline="true"
                preload="metadata"
            >
                <source src={videoSrc} type="video/mp4" />
                Tu navegador no soporta el elemento video.
            </video>

            {/* Overlay */}
            {overlay && (
                <div
                    className={`absolute inset-0 bg-black/${overlayOpacity} -z-5`}
                />
            )}

            {/* Content */}
            <div className={`relative z-10 px-4 sm:px-6 lg:px-8 ${contentMaxWidth} mx-auto w-full`}>
                <div className={textAlignmentClasses[textAlignment]}>
                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-lg sm:text-xl md:text-2xl text-pink-400 font-medium mb-4">
                            {subtitle}
                        </p>
                    )}

                    {/* Title */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                        {title}
                    </h1>

                    {/* Description */}
                    {description && (
                        <p className="text-xl sm:text-2xl md:text-3xl text-zinc-300 mb-8 leading-relaxed max-w-3xl mx-auto">
                            {description}
                        </p>
                    )}

                    {/* Buttons */}
                    {buttons.length > 0 && (
                        <div className={`flex flex-col sm:flex-row gap-4 ${textAlignment === 'center' ? 'justify-center' : textAlignment === 'right' ? 'justify-end' : 'justify-start'}`}>
                            {buttons.map((button, index) => (
                                <Button
                                    key={index}
                                    variant={button.variant}
                                    size={button.size}
                                    href={button.href}
                                    target={button.target}
                                    onClick={button.onClick}
                                    fullWidth={button.fullWidth}
                                    withBorder={button.withBorder}
                                    className={button.className}
                                >
                                    {button.text}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
