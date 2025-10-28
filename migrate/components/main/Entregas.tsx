'use client'
import React from 'react'
import { CheckCircle, Package, Clock, Shield } from 'lucide-react'
import EntregaGarantizada from '@/app/components/shared/EntregaGarantizada'

/**
 * Componente de Entregas siguiendo el Estilo Maestro v1.9
 * 
 * Características:
 * - Sistema de colores zinc como estándar
 * - Gradientes purple-pink para elementos destacados
 * - Espaciado responsivo (py-16 lg:py-24)
 * - Transiciones suaves (transition-all duration-300)
 * - Tipografía con jerarquía clara
 * - Estructura semántica mejorada
 */

interface EntregasProps {
    variant?: 'default' | 'compact'
    className?: string
    title?: string
    subtitle?: string
    description?: string
}

// Datos de entregas siguiendo el patrón del estilo maestro
const deliverables = [
    {
        id: 'photos',
        title: 'Fotografías en Alta Resolución',
        description: 'Listas para impresión o compartir en redes sociales',
        details: 'Formato JPEG procesados profesionalmente',
        icon: <Package className="w-6 h-6" />
    },
    {
        id: 'videos',
        title: 'Videos Cinemáticos 4K',
        description: 'Entregamos un video Entre 90min y 2hrs que capturan la esencia de tu evento',
        details: 'Edición profesional con música y efectos incluidos',
        icon: <Clock className="w-6 h-6" />
    },
    {
        id: 'guarantee',
        title: 'Garantías Post-Producción',
        description: 'Edición y ajustes en video sin costo adicional',
        details: 'Revisiones y ajustes hasta tu completa satisfacción',
        icon: <Shield className="w-6 h-6" />
    },
    {
        id: 'support',
        title: 'Soporte Continuo',
        description: 'Asistencia personalizada durante todo el proceso',
        details: 'Comunicación directa con nuestro equipo especializado',
        icon: <CheckCircle className="w-6 h-6" />
    }
]

export default function Entregas({
    variant = 'default',
    className = '',
    title = '¿Qué entregamos?',
    subtitle = 'Garantías y resultados',
    description = 'Nos comprometemos a entregarte en 40 días hábiles posteriores a tu evento'
}: EntregasProps) {

    if (variant === 'compact') {
        return (
            <section className={`py-12 lg:py-16 ${className}`}>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header Compacto */}
                    <div className="text-center mb-8 lg:mb-12">
                        <div className="inline-flex items-center justify-center mb-4">
                            <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                                {title}
                            </span>
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                            {subtitle}
                        </h2>
                    </div>

                    {/* Lista Compacta */}
                    <div className="space-y-4">
                        {deliverables.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-zinc-600/50 transition-colors"
                            >
                                <div className="text-purple-400 flex-shrink-0 mt-1">
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 className="text-white font-medium mb-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-zinc-300 text-sm">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )
    }

    // Variant Default (Full)
    return (
        <section className={`py-16 lg:py-24 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12 lg:mb-16">
                    <div className="inline-flex items-center justify-center mb-4">
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                            {title}
                        </span>
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                        {subtitle}
                    </h2>
                    <p className="text-zinc-300 text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Grid de Entregas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {deliverables.map((item, index) => (
                        <div
                            key={item.id}
                            className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-zinc-600 transition-all duration-300 group relative overflow-hidden"
                        >
                            {/* Gradient overlay sutil */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* Content */}
                            <div className="relative">
                                {/* Icon */}
                                <div className="mb-4">
                                    <div className="text-purple-400">
                                        {item.icon}
                                    </div>
                                </div>

                                {/* Título y descripción */}
                                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-purple-100 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-zinc-300 leading-relaxed mb-3 text-sm">
                                    {item.description}
                                </p>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    {item.details}
                                </p>

                                {/* Línea decorativa */}
                                <div className="mt-4 h-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA Section - Entrega Garantizada */}
                <div className="mt-16">
                    <EntregaGarantizada
                        variant="default"
                        title="Entrega Garantizada"
                        description="Cumplimos con los tiempos de entrega establecidos en el contrato. Tu material estará listo cuando lo prometemos."
                        guaranteeDays={40}
                        showDecorative={true}
                    />
                </div>
            </div>
        </section>
    )
}
