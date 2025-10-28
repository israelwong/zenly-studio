'use client'
import React from 'react'
import { Shield, Star, Clock, Headphones, CheckCircle, Award } from 'lucide-react'
import { CTACard, ctaConfigs } from '@/app/components/cta'

/**
 * Componente de Garantías siguiendo el Estilo Maestro v1.9
 * 
 * Características:
 * - Sistema de colores zinc como estándar
 * - Gradientes purple-pink para elementos destacados
 * - Espaciado responsivo (py-16 lg:py-24)
 * - Transiciones suaves (transition-all duration-300)
 * - Tipografía con jerarquía clara
 * - Accesibilidad con estructura semántica
 */

interface GuaranteeItem {
    id: string
    title: string
    description: string
    icon: React.ReactNode
    features: string[]
}

interface GarantiasProps {
    /** Variante del componente - compact para versión simplificada, full para versión completa */
    variant?: 'compact' | 'full'
    /** Clases CSS adicionales */
    className?: string
    /** Título principal de la sección */
    title?: string
    /** Subtítulo descriptivo */
    subtitle?: string
    /** Mostrar badges de confianza */
    showBadges?: boolean
    /** Texto del badge CTA personalizado */
    ctaBadgeText?: string
    /** Clases CSS para el fondo (gradientes, etc.) */
    backgroundClassName?: string
}


const defaultGuarantees: GuaranteeItem[] = [
    {
        id: 'satisfaction',
        title: 'Satisfacción 100% Garantizada',
        description: 'Si no quedas completamente satisfecho con el resultado, reharemos las tomas necesarias sin costo adicional.',
        icon: <Shield className="w-8 h-8" />,
        features: [
            'Revisión completa del material',
            'Refilmación gratuita si es necesario',
            'Satisfacción garantizada al 100%',
            'Soporte post-entrega por 30 días'
        ]
    },
    {
        id: 'quality',
        title: 'Calidad Profesional',
        description: 'Utilizamos equipos de última generación y técnicas profesionales para asegurar la máxima calidad en cada proyecto.',
        icon: <Star className="w-8 h-8" />,
        features: [
            'Equipos 4K y profesionales',
            'Edición con software especializado',
            'Respaldo triple de archivos',
            'Entrega en múltiples formatos'
        ]
    },
    {
        id: 'timing',
        title: 'Entrega Puntual',
        description: 'Cumplimos religiosamente con los tiempos de entrega acordados. Tu material estará listo cuando lo prometemos.',
        icon: <Clock className="w-8 h-8" />,
        features: [
            'Galería preview en 48-72 horas',
            'Material final en tiempo acordado',
            'Notificaciones de progreso',
            'Entrega anticipada cuando sea posible'
        ]
    },
    {
        id: 'support',
        title: 'Soporte Continuo',
        description: 'Te acompañamos durante todo el proceso, desde la consulta inicial hasta después de la entrega final.',
        icon: <Headphones className="w-8 h-8" />,
        features: [
            'Consulta inicial gratuita',
            'Comunicación directa con el equipo',
            'Asistencia durante el evento',
            'Soporte post-entrega'
        ]
    }
]

const trustBadges = [
    {
        icon: <Award className="w-6 h-6" />,
        title: '+500 Eventos',
        subtitle: 'Experiencia comprobada'
    },
    {
        icon: <Star className="w-6 h-6" />,
        title: '4.9/5 Estrellas',
        subtitle: 'Calificación promedio'
    },
    {
        icon: <Shield className="w-6 h-6" />,
        title: '100% Seguro',
        subtitle: 'Respaldo garantizado'
    },
    {
        icon: <CheckCircle className="w-6 h-6" />,
        title: 'Certificados',
        subtitle: 'Profesionales verificados'
    }
]

export default function Garantias({
    variant = 'full',
    className = '',
    title = 'Nuestras Garantías',
    subtitle = 'Trabajamos con la confianza y tranquilidad que mereces para tu evento especial',
    showBadges = true,
    ctaBadgeText,
    backgroundClassName = ''
}: GarantiasProps) {

    if (variant === 'compact') {
        return (
            <section className={`py-16 lg:py-24 ${backgroundClassName} ${className}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-12 lg:mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                            {title}
                        </h2>
                        <p className="text-zinc-300 text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
                            {subtitle}
                        </p>
                    </div>

                    {/* Garantías Grid Compacto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {defaultGuarantees.map((guarantee) => (
                            <div
                                key={guarantee.id}
                                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center hover:border-zinc-600 transition-all duration-300 hover:scale-105"
                            >
                                <div className="text-purple-400 mb-4 flex justify-center">
                                    {guarantee.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {guarantee.title}
                                </h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    {guarantee.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Trust Badges */}
                    {showBadges && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {trustBadges.map((badge, index) => (
                                <div
                                    key={index}
                                    className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 text-center hover:border-zinc-600/50 transition-colors"
                                >
                                    <div className="text-zinc-400 mb-2 flex justify-center">
                                        {badge.icon}
                                    </div>
                                    <div className="text-white font-medium text-sm">
                                        {badge.title}
                                    </div>
                                    <div className="text-zinc-500 text-xs">
                                        {badge.subtitle}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        )
    }

    // Variant Full (default)
    return (
        <section className={`py-16 lg:py-24 ${backgroundClassName} ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16 lg:mb-20">
                    <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                        {title}
                    </h2>
                    <p className="text-zinc-300 text-lg lg:text-xl max-w-4xl mx-auto leading-relaxed">
                        {subtitle}
                    </p>
                </div>

                {/* Garantías Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
                    {defaultGuarantees.map((guarantee, index) => (
                        <div
                            key={guarantee.id}
                            className="bg-zinc-800 border border-zinc-700 rounded-xl p-8 hover:border-zinc-600 transition-all duration-300 group"
                        >
                            {/* Header de la garantía */}
                            <div className="flex items-start gap-4 mb-6">
                                <div className="text-purple-400 group-hover:text-purple-300 transition-colors">
                                    {guarantee.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl lg:text-2xl font-bold text-white mb-3">
                                        {guarantee.title}
                                    </h3>
                                    <p className="text-zinc-300 leading-relaxed">
                                        {guarantee.description}
                                    </p>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-3">
                                {guarantee.features.map((feature, featureIndex) => (
                                    <div
                                        key={featureIndex}
                                        className="flex items-center gap-3"
                                    >
                                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        <span className="text-zinc-300 text-sm lg:text-base">
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust Badges Full */}
                {showBadges && (
                    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-8">
                        <div className="text-center mb-8">
                            <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
                                Respaldados por la Experiencia
                            </h3>
                            <p className="text-zinc-300 leading-relaxed">
                                Números que hablan por nuestra calidad y profesionalismo
                            </p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {trustBadges.map((badge, index) => (
                                <div
                                    key={index}
                                    className="text-center p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors"
                                >
                                    <div className="text-purple-400 mb-3 flex justify-center">
                                        {badge.icon}
                                    </div>
                                    <div className="text-white font-bold text-lg lg:text-xl mb-1">
                                        {badge.title}
                                    </div>
                                    <div className="text-zinc-400 text-sm">
                                        {badge.subtitle}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA Card Integrado */}
                <div className="mt-16">
                    <CTACard
                        {...ctaConfigs.guarantees}
                        title="¿Listo para tu evento perfecto?"
                        description="Agenda tu cita y descubre cómo podemos hacer realidad el evento de tus sueños con todas nuestras garantías."
                        badge={ctaBadgeText}
                        showBadge={!!ctaBadgeText}
                        showAdditionalInfo={false}
                    />
                </div>
            </div>
        </section>
    )
}
