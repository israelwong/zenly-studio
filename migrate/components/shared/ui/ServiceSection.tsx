'use client'
import React from 'react'

/**
 * Componente ServiceSection - Refactorizado siguiendo el sistema de diseño
 * 
 * Sección de servicios con diseño premium y efectos sofisticados
 * 
 * Características aplicadas:
 * - Sistema de colores zinc como estándar con acentos purple-pink
 * - Gradientes purple-pink para elementos destacados
 * - Elementos decorativos sutiles pero pronunciados
 * - Tipografía mejorada con jerarquía clara
 * - Efectos de profundidad y separación visual
 */

interface ServiceSectionProps {
    titulo: string
    descripcion: string
    children: React.ReactNode
    className?: string
    titleGradient?: string
    showSeparator?: boolean
    SeparatorComponent?: React.ComponentType
    showDecorations?: boolean
}

// Componente de separador reutilizable mejorado
export const AnimatedSeparator = () => (
    <div className="relative text-center mx-auto py-8">
        {/* Línea decorativa */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />

        {/* Ícono central */}
        <div className="relative z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-purple-500/20">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-400/60 to-pink-400/60 animate-pulse" />
        </div>
    </div>
)

export default function ServiceSection({
    titulo,
    descripcion,
    children,
    className = '',
    titleGradient = 'from-purple-400 to-pink-400',
    showSeparator = true,
    SeparatorComponent = AnimatedSeparator,
    showDecorations = true
}: ServiceSectionProps) {
    return (
        <>
            <section className={`relative py-12 lg:py-16 ${className}`}>
                {/* Elementos decorativos de fondo */}
                {showDecorations && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-gradient-to-br from-purple-500/3 to-pink-500/3 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-gradient-to-br from-pink-500/3 to-purple-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                    </div>
                )}

                {/* Header con título y descripción */}
                <div className="relative px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto mb-12">
                    <div className="text-center space-y-6">
                        {/* Título principal dentro de un badge elegante */}
                        <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-purple-500/8 to-pink-500/8 border border-purple-500/15 backdrop-blur-sm">
                            <h3 className={`bg-gradient-to-r ${titleGradient} bg-clip-text text-transparent font-bold text-lg sm:text-xl lg:text-2xl`}>
                                {titulo}
                            </h3>
                        </div>

                        <p className="text-lg sm:text-xl lg:text-2xl text-zinc-300 font-light leading-relaxed max-w-3xl mx-auto">
                            {descripcion}
                        </p>
                    </div>
                </div>

                {/* Contenido multimedia - manteniendo w-full */}
                <div className="w-full">
                    {children}
                </div>
            </section>

            {/* Separador opcional */}
            {showSeparator && <SeparatorComponent />}
        </>
    )
}
