'use client'
import React from 'react'
import { Calendar, Zap, Users, Briefcase, Mail, Database, ArrowRight } from 'lucide-react'

/**
 * Componente ComingSoon - Anuncios de próximos lanzamientos
 * 
 * Siguiendo ESTILO_MAESTRO_MAIN.md:
 * - Sistema de colores zinc con acentos purple-pink
 * - Tarjetas con gradientes sutiles y efectos hover
 * - Tipografía jerárquica clara
 * - Responsive design mobile-first
 * - Animaciones suaves y transiciones
 */

export interface LaunchItem {
    id: string
    title: string
    description: string
    icon: React.ReactNode
    status: 'coming-soon' | 'in-development' | 'beta'
    estimatedDate?: string
    priority: 'high' | 'medium' | 'low'
    features?: string[]
}

export interface ComingSoonProps {
    className?: string
    variant?: 'grid' | 'list'
    showFeatures?: boolean
    maxItems?: number
}

const upcomingLaunches: LaunchItem[] = [
    {
        id: 'prosocial-platform-whitelabel',
        title: 'ProSocial Platform',
        description: 'Plataforma SaaS completa con personalización de marca para fotógrafos profesionales',
        icon: <Zap className="w-6 h-6" />,
        status: 'in-development',
        estimatedDate: 'Q1 2026',
        priority: 'high',
        features: [
            'Branding personalizado',
            'Integraciones con pagos Stripe',
            'Dashboard avanzado',
            'Creación de paquetes',
            'Cotizador realtime',
        ]
    },
    {
        id: 'client-portal-v2',
        title: 'Portal Cliente 2.0',
        description: 'Nueva experiencia para clientes con gestión completa de eventos',
        icon: <Users className="w-6 h-6" />,
        status: 'coming-soon',
        estimatedDate: 'Q4 2025',
        priority: 'high',
        features: [
            'Timeline interactivo',
            'Pasarela de pago',
            'Galería personalizada',
            'Descarga de archivos HD',
        ]
    },
    {
        id: 'digital-invitations',
        title: 'Invitaciones Digitales',
        description: 'Crea y envía invitaciones digitales interactivas para tus eventos',
        icon: <Mail className="w-6 h-6" />,
        status: 'coming-soon',
        estimatedDate: 'Q2 2026',
        priority: 'high',
        features: [
            'Contenido personalizable',
            'Recordatorios automáticos',
            'Analytics de respuestas',
            'Compartir por WhatsApp/Email'
        ]
    },
    {
        id: 'bolsa-trabajo',
        title: 'Bolsa de Trabajo',
        description: 'Portal de empleos especializado para fotógrafos y profesionales del sector',
        icon: <Briefcase className="w-6 h-6" />,
        status: 'beta',
        estimatedDate: 'Q4 2025',
        priority: 'medium',
        features: [
            'Ofertas especializadas en fotografía',
            'Matching inteligente de perfiles',
            'Portafolio integrado',
            'Red de contactos profesionales',
            'Evaluaciones y referencias',
            'Oportunidades freelance y fijas'
        ]
    }
]

const StatusBadge = ({ status }: { status: LaunchItem['status'] }) => {
    const statusConfig = {
        'coming-soon': {
            label: 'Próximamente',
            className: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        },
        'in-development': {
            label: 'En Desarrollo',
            className: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
        },
        'beta': {
            label: 'Beta',
            className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        }
    }

    const config = statusConfig[status]

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-current mr-2"></div>
            {config.label}
        </span>
    )
}

const PriorityIndicator = ({ priority }: { priority: LaunchItem['priority'] }) => {
    const priorityConfig = {
        'high': 'border-l-red-500',
        'medium': 'border-l-yellow-500',
        'low': 'border-l-green-500'
    }

    return <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityConfig[priority]} rounded-l-xl`} />
}

export default function ComingSoon({
    className = '',
    variant = 'grid',
    showFeatures = true,
    maxItems
}: ComingSoonProps) {
    const launches = maxItems ? upcomingLaunches.slice(0, maxItems) : upcomingLaunches

    const gridClasses = variant === 'grid'
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6'
        : 'space-y-4'

    return (
        <div className={`w-full ${className}`}>
            {/* Header */}
            <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                    Próximas Funcionalidades
                </h2>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                    Nuevas herramientas diseñadas para mejorar la experiencia de tus clientes y hacer crecer tu negocio
                </p>
            </div>

            {/* Launch Cards */}
            <div className={gridClasses}>
                {launches.map((launch) => (
                    <div
                        key={launch.id}
                        className="group relative bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-zinc-600 transition-all duration-300 hover:transform hover:scale-[1.02] overflow-hidden"
                    >
                        {/* Priority Indicator */}
                        <PriorityIndicator priority={launch.priority} />

                        {/* Background Gradient Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Content */}
                        <div className="relative z-10">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-700 rounded-lg group-hover:bg-gradient-to-br group-hover:from-purple-600/20 group-hover:to-pink-600/20 transition-all duration-300">
                                        <div className="text-zinc-300 group-hover:text-white transition-colors">
                                            {launch.icon}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:to-pink-300 group-hover:bg-clip-text transition-all duration-300">
                                            {launch.title}
                                        </h3>
                                        {launch.estimatedDate && (
                                            <p className="text-sm text-zinc-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {launch.estimatedDate}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <StatusBadge status={launch.status} />
                            </div>

                            {/* Description */}
                            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                                {launch.description}
                            </p>

                            {/* Features */}
                            {showFeatures && launch.features && (
                                <div className="space-y-2 mb-4">
                                    {launch.features.slice(0, 3).map((feature, index) => (
                                        <div key={index} className="flex items-center gap-2 text-xs text-zinc-500">
                                            <ArrowRight className="w-3 h-3 text-zinc-600" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                    {launch.features.length > 3 && (
                                        <p className="text-xs text-zinc-600 pl-5">
                                            +{launch.features.length - 3} funcionalidades más
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Progress Bar (visual only) */}
                            <div className="w-full bg-zinc-700 rounded-full h-1 mb-3">
                                <div
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-1 rounded-full transition-all duration-500"
                                    style={{
                                        width: launch.status === 'beta' ? '80%' :
                                            launch.status === 'in-development' ? '60%' : '30%'
                                    }}
                                />
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span>Progreso estimado</span>
                                <span className="font-medium">
                                    {launch.status === 'beta' ? '80%' :
                                        launch.status === 'in-development' ? '60%' : '30%'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* CTA Footer */}
            <div className="text-center mt-12 p-8 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                <h3 className="text-xl font-semibold text-white mb-2">
                    ¿Listo para transformar tu negocio?
                </h3>
                <p className="text-zinc-400 mb-4">
                    Sé el primero en conocer estas nuevas funcionalidades y cómo pueden ayudarte a ofrecer una mejor experiencia a tus clientes
                </p>
                <button className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105">
                    <span>Mantenerme informado</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
