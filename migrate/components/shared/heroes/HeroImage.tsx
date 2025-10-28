'use client'
import React from 'react'
import Image from 'next/image'
import { Button } from '../ui'
import type { ButtonVariant, ButtonSize } from '../ui'

/**
 * Componente HeroImage - Refactorizado siguiendo ESTILO_MAESTRO_MAIN.md
 * 
 * Hero con imagen de fondo y elementos decorativos mejorados
 * Mantiene consistencia visual con HeroVideo
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

interface HeroImageProps {
    imageSrc: string
    imageAlt: string
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
    imagePosition?: 'top' | 'center' | 'bottom'
    imageClassName?: string
    imagePriority?: boolean
    /** Mostrar elementos decorativos */
    showDecorative?: boolean
    /** Tamaño de los elementos decorativos */
    decorativeSize?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function HeroImage({
    imageSrc,
    imageAlt = 'Hero image',
    title,
    subtitle,
    description,
    buttons = [],
    overlay = true,
    overlayOpacity = 50,
    textAlignment = 'center',
    className = '',
    contentMaxWidth = 'max-w-4xl',
    minHeight = 'min-h-screen',
    imagePosition = 'center',
    imagePriority = true
}: HeroImageProps) {

    const textAlignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    }

    const imagePositionClasses = {
        center: 'object-center',
        top: 'object-top',
        bottom: 'object-bottom'
    }

    return (
        <div className={`relative ${minHeight} flex items-center justify-center overflow-hidden ${className}`}>
            {/* Image Background */}
            <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                priority={imagePriority}
                className={`object-cover ${imagePositionClasses[imagePosition]} -z-10`}
                sizes="100vw"
            />

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
                    {title && (
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                            {title}
                        </h1>
                    )}

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