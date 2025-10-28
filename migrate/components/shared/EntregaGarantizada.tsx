'use client'
import React from 'react'
import { Clock, CheckCircle, Calendar, Truck, Shield } from 'lucide-react'

/**
 * Componente de Entrega Garantizada
 * 
 * Características mejoradas:
 * - Diseño totalmente responsivo
 * - Comunicación visual clara de los beneficios
 * - Jerarquía visual mejorada
 * - Iconografía más descriptiva
 * - Estados hover interactivos
 */

interface EntregaGarantizadaProps {
    variant?: 'default' | 'compact'
    className?: string
    title?: string
    description?: string
    guaranteeDays?: number
    showDecorative?: boolean
}

const guaranteeFeatures = [
    {
        id: 'timeline',
        icon: <Calendar className="w-5 h-5" />,
        title: '40 días hábiles garantizados',
        description: 'Tiempo máximo de entrega establecido en contrato'
    },
    {
        id: 'progress',
        icon: <Shield className="w-5 h-5" />,
        title: 'Notificaciones de progreso',
        description: 'Te mantenemos informado durante todo el proceso'
    },
    {
        id: 'delivery',
        icon: <Truck className="w-5 h-5" />,
        title: 'Entrega sin costo adicional',
        description: 'Incluye envío y transferencia digital gratuita'
    },
    {
        id: 'quality',
        icon: <CheckCircle className="w-5 h-5" />,
        title: 'Garantía de calidad',
        description: 'Revisiones incluidas hasta tu satisfacción'
    }
]

export default function EntregaGarantizada({
    variant = 'default',
    className = '',
    title = 'Entrega Garantizada',
    description = 'Cumplimos con los tiempos de entrega establecidos en el contrato. Tu material estará listo cuando lo prometemos.',
    guaranteeDays = 40,
    showDecorative = true
}: EntregaGarantizadaProps) {

    if (variant === 'compact') {
        return (
            <div className={`${className}`}>
                <div className="bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 border border-zinc-700/50 rounded-lg p-6 relative overflow-hidden">
                    {/* Gradient overlay sutil */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/3 to-pink-600/3" />

                    <div className="relative">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex-shrink-0">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{title}</h3>
                                <p className="text-zinc-300 text-sm">{guaranteeDays} días hábiles máximo</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {guaranteeFeatures.slice(0, 2).map((feature) => (
                                <div key={feature.id} className="flex items-center gap-2 text-zinc-300 text-sm">
                                    <div className="text-emerald-400 flex-shrink-0">
                                        {feature.icon}
                                    </div>
                                    <span>{feature.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Variant Default (Full)
    return (
        <div className={`${className}`}>
            <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50 rounded-xl overflow-hidden relative group hover:border-zinc-600/50 transition-all duration-300">
                {/* Gradient overlay principal */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5" />

                {/* Header con icono y título */}
                <div className="relative p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                        {/* Icono principal - Responsivo */}
                        <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex-shrink-0 shadow-lg shadow-purple-600/20 group-hover:shadow-purple-600/30 transition-all duration-300">
                            <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        </div>

                        {/* Contenido principal */}
                        <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="mb-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                                        {title}
                                    </h3>
                                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-3 py-1 rounded-full border border-purple-500/30">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="text-emerald-300 text-sm font-medium">
                                            {guaranteeDays} días máximo
                                        </span>
                                    </div>
                                </div>
                                <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
                                    {description}
                                </p>
                            </div>

                            {/* Grid de características - Completamente responsivo */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
                                {guaranteeFeatures.map((feature) => (
                                    <div
                                        key={feature.id}
                                        className="flex items-start gap-3 p-3 sm:p-4 bg-zinc-800/60 rounded-lg border border-zinc-700/40 hover:border-zinc-600/60 hover:bg-zinc-800/80 transition-all duration-300 group/item"
                                    >
                                        <div className="text-emerald-400 flex-shrink-0 mt-0.5 group-hover/item:text-emerald-300 transition-colors">
                                            {feature.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-zinc-200 text-sm font-medium block leading-tight mb-1">
                                                {feature.title}
                                            </span>
                                            <span className="text-zinc-400 text-xs leading-tight hidden sm:block">
                                                {feature.description}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer con compromiso */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-zinc-700/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" />
                                    <span className="text-purple-300 text-sm font-medium">
                                        Compromiso contractual respaldado
                                    </span>
                                </div>

                                <div className="text-zinc-400 text-xs">
                                    <span className="hidden sm:inline">Garantía de cumplimiento • </span>
                                    <span className="text-emerald-400">100% seguro</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Elementos decorativos - Solo en pantallas grandes */}
                {showDecorative && (
                    <>
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300 hidden lg:block" />
                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-purple-600/5 to-pink-600/5 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 hidden lg:block" />

                        {/* Línea decorativa inferior */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-600/20 to-transparent" />
                    </>
                )}
            </div>
        </div>
    )
}
