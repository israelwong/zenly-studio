'use client'
import React from 'react';

/**
 * Componente QuoteSection - Refactorizado siguiendo ESTILO_MAESTRO_MAIN.md
 * 
 * Muestra citas destacadas y frases importantes de manera elegante
 * 
 * Características aplicadas:
 * - Sistema de colores zinc como estándar con acentos purple-pink
 * - Gradientes purple-pink para elementos destacados
 * - Tipografía mejorada con jerarquía clara
 * - Bordes sutiles y efectos de profundidad
 * - Espaciado consistente y responsive
 */

interface QuoteSectionProps {
    /** Mensaje principal o cita a destacar */
    message: string;
    /** Variante visual del componente */
    variant?: 'default' | 'gradient' | 'minimal';
    /** Clases CSS adicionales */
    className?: string;
}

export default function QuoteSection({
    message,
    variant = 'default',
    className = ""
}: QuoteSectionProps) {
    // Configuración de estilos por variante
    const variantStyles = {
        default: {
            container: "bg-zinc-900/50 border border-zinc-700/50 backdrop-blur-sm",
            text: "text-white",
            accent: "text-purple-300"
        },
        gradient: {
            container: "bg-gradient-to-br from-zinc-900/60 via-zinc-800/40 to-zinc-900/60 border border-purple-500/20 backdrop-blur-sm",
            text: "text-white",
            accent: "text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text"
        },
        minimal: {
            container: "bg-zinc-950/30 border border-zinc-800/30",
            text: "text-zinc-100",
            accent: "text-zinc-300"
        }
    };

    const styles = variantStyles[variant];

    return (
        <section className={`py-8 lg:py-12 ${className}`}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`relative rounded-xl p-8 lg:p-12 ${styles.container} shadow-lg transition-all duration-300 hover:shadow-xl`}>
                    {/* Elementos decorativos mejorados - Más grandes pero sutiles */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                        {/* Círculos principales más grandes */}
                        <div className="absolute -top-8 left-1/4 w-24 h-24 bg-gradient-to-br from-purple-500/15 to-purple-600/8 rounded-full blur-xl animate-pulse" />
                        <div className="absolute -bottom-6 right-1/3 w-20 h-20 bg-gradient-to-br from-pink-500/12 to-pink-600/6 rounded-full blur-lg animate-pulse" />

                        {/* Círculos secundarios para profundidad */}
                        <div className="absolute top-1/4 right-1/4 w-16 h-16 bg-purple-400/8 rounded-full blur-lg" />
                        <div className="absolute bottom-1/3 left-1/5 w-14 h-14 bg-pink-400/10 rounded-full blur-md" />

                        {/* Círculos terciarios muy sutiles */}
                        <div className="absolute top-1/2 left-1/6 w-12 h-12 bg-purple-300/5 rounded-full blur-md" />
                        <div className="absolute top-3/4 right-1/6 w-10 h-10 bg-pink-300/8 rounded-full blur-sm animate-pulse" />

                        {/* Efecto de destello central muy sutil */}
                        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white/15 rounded-full blur-sm animate-ping" />
                    </div>

                    {/* Contenido principal */}
                    <div className="relative z-10">
                        <blockquote className={`text-xl lg:text-2xl xl:text-3xl font-bold leading-tight tracking-wide ${styles.text}`}>
                            <span className="inline-block">
                                {message.split(' ').map((word, index, array) => {
                                    // Resaltar las últimas 2-3 palabras como acento
                                    const isAccent = index >= array.length - 3;
                                    return (
                                        <span
                                            key={index}
                                            className={isAccent ? styles.accent : ''}
                                        >
                                            {word}
                                            {index < array.length - 1 && ' '}
                                        </span>
                                    );
                                })}
                            </span>
                        </blockquote>
                    </div>

                    {/* Línea decorativa inferior */}
                    <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent" />
                </div>
            </div>
        </section>
    );
}