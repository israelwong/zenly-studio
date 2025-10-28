'use client'
import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '../shared/ui'

/**
 * Componente CTA Paquetes siguiendo el Estilo Maestro v1.9
 * 
 * Características:
 * - Sistema de colores zinc como estándar
 * - Gradientes purple-pink para elementos destacados
 * - Espaciado responsivo y separación visual sutil
 * - Estructura semántica mejorada
 * - Botón principal optimizado para conversión
 */

interface CTAPaquetesProps {
    /** Título principal del CTA */
    title?: string
    /** Subtítulo o texto de urgencia */
    subtitle?: string
    /** Texto del botón principal */
    buttonText?: string
    /** URL del botón principal */
    buttonHref?: string
    /** ID para tracking del botón */
    buttonId?: string
    /** Target del enlace */
    buttonTarget?: '_blank' | '_self'
    /** Mostrar separación visual superior */
    showTopSeparator?: boolean
    /** Mostrar separación visual inferior */
    showBottomSeparator?: boolean
    /** Tamaño de los elementos decorativos (sm, md, lg, xl) */
    decorativeSize?: 'sm' | 'md' | 'lg' | 'xl'
    /** Clases CSS adicionales */
    className?: string
}

export default function CTAPaquetes({
    title = "¡Contacta hoy mismo!",
    subtitle = "tenemos fechas limitadas.",
    buttonText = "Ver Paquetes XV Años",
    buttonHref = "/contacto?ref=fifteen",
    buttonId = "btn-contacto-desde-hero",
    buttonTarget = "_self",
    showTopSeparator = true,
    showBottomSeparator = true,
    decorativeSize = "lg",
    className = ""
}: CTAPaquetesProps) {
    // Configuración de tamaños para elementos decorativos
    const decorativeSizes = {
        sm: {
            main: 'w-20 h-20',
            secondary: 'w-12 h-12',
            tertiary: 'w-10 h-10',
            small: 'w-8 h-8',
            tiny: 'w-6 h-6',
            sparkle: 'w-2 h-2',
            spacing: { main: '-top-10', secondary: '-top-6', tertiary: '-top-4', small: '-top-2', tiny: '-top-1' }
        },
        md: {
            main: 'w-28 h-28',
            secondary: 'w-18 h-18',
            tertiary: 'w-14 h-14',
            small: 'w-12 h-12',
            tiny: 'w-8 h-8',
            sparkle: 'w-3 h-3',
            spacing: { main: '-top-14', secondary: '-top-9', tertiary: '-top-6', small: '-top-3', tiny: '-top-2' }
        },
        lg: {
            main: 'w-32 h-32',
            secondary: 'w-20 h-20',
            tertiary: 'w-16 h-16',
            small: 'w-12 h-12',
            tiny: 'w-10 h-10',
            sparkle: 'w-4 h-4',
            spacing: { main: '-top-16', secondary: '-top-10', tertiary: '-top-7', small: '-top-4', tiny: '-top-2' }
        },
        xl: {
            main: 'w-40 h-40',
            secondary: 'w-24 h-24',
            tertiary: 'w-20 h-20',
            small: 'w-16 h-16',
            tiny: 'w-12 h-12',
            sparkle: 'w-5 h-5',
            spacing: { main: '-top-20', secondary: '-top-12', tertiary: '-top-8', small: '-top-5', tiny: '-top-3' }
        }
    }

    const sizes = decorativeSizes[decorativeSize]
    return (
        <section className={`relative ${className}`}>
            {/* Separación visual superior */}
            {showTopSeparator && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
            )}

            {/* Contenido principal */}
            <div className="py-12 lg:py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* CTA Content */}
                    <div className="text-center space-y-6">
                        {/* Título y subtítulo */}
                        <div className="space-y-2">
                            <p className="text-xl lg:text-2xl text-white font-medium tracking-wide">
                                {title}{' '}
                                <span className="text-purple-400 underline decoration-purple-400/50 underline-offset-4">
                                    {subtitle}
                                </span>
                            </p>
                        </div>

                        {/* Botón principal mejorado - Sin ícono de teléfono */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
                            <Button
                                href={buttonHref}
                                target={buttonTarget}
                                variant="primary"
                                size="lg"
                                fullWidth={false}
                                className="sm:w-auto min-w-[200px]"
                            >
                                <span>{buttonText}</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>

                        {/* Información adicional sutil */}
                        <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span>Consulta gratuita disponible</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Separación visual inferior */}
            {showBottomSeparator && (
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
            )}

            {/* Elementos decorativos mejorados - Centrados en parte superior */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Círculo principal grande centrado arriba */}
                <div className={`absolute ${sizes.spacing.main} left-1/2 transform -translate-x-1/2 ${sizes.main} bg-gradient-to-br from-purple-500/25 to-purple-600/15 rounded-full blur-lg animate-pulse`} />

                {/* Círculos secundarios alrededor del principal */}
                <div className={`absolute ${sizes.spacing.secondary} left-1/2 transform -translate-x-20 ${sizes.secondary} bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-full blur-md animate-pulse`} />
                <div className={`absolute ${sizes.spacing.tertiary} left-1/2 transform translate-x-12 ${sizes.tertiary} bg-gradient-to-br from-purple-400/18 to-purple-500/12 rounded-full blur-md`} />

                {/* Círculos pequeños para completar el conjunto */}
                <div className={`absolute ${sizes.spacing.small} left-1/2 transform -translate-x-32 ${sizes.small} bg-gradient-to-br from-pink-400/15 to-pink-500/8 rounded-full blur-sm`} />
                <div className={`absolute ${sizes.spacing.tiny} left-1/2 transform translate-x-28 ${sizes.tiny} bg-purple-300/12 rounded-full blur-sm animate-pulse`} />

                {/* Efecto de destello central */}
                <div className={`absolute ${sizes.spacing.tertiary} left-1/2 transform -translate-x-1/2 ${sizes.sparkle} bg-white/25 rounded-full blur-xs animate-ping`} />
            </div>
        </section>
    )
}
