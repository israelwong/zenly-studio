'use client'
import React from 'react'
import { Calendar, ArrowRight, Zap, Users, Briefcase } from 'lucide-react'
import { type LaunchItem } from './ComingSoon'

/**
 * Componente CompactComingSoon - Versión compacta para sidebars/dashboards
 * 
 * Versión minimalista del componente ComingSoon para espacios reducidos
 */

interface CompactComingSoonProps {
    className?: string
    maxItems?: number
    showViewAll?: boolean
    onViewAll?: () => void
}

const upcomingLaunches: LaunchItem[] = [
    {
        id: 'platform-saas',
        title: 'ProSocial Platform',
        description: 'Plataforma SaaS completa',
        icon: <Zap className="w-4 h-4" />,
        status: 'in-development',
        estimatedDate: 'Q1 2026',
        priority: 'high'
    },
    {
        id: 'client-portal-v2',
        title: 'Portal Cliente 2.0',
        description: 'Nueva experiencia para clientes',
        icon: <Users className="w-4 h-4" />,
        status: 'coming-soon',
        estimatedDate: 'Q4 2025',
        priority: 'high'
    },
    {
        id: 'bolsa-trabajo',
        title: 'Bolsa de Trabajo',
        description: 'Portal de empleos especializado',
        icon: <Briefcase className="w-4 h-4" />,
        status: 'beta',
        estimatedDate: 'Q4 2025',
        priority: 'high'
    }
]

export default function CompactComingSoon({
    className = '',
    maxItems = 2,
    showViewAll = true,
    onViewAll
}: CompactComingSoonProps) {
    const launches = upcomingLaunches.slice(0, maxItems)

    return (
        <div className={`bg-zinc-800 border border-zinc-700 rounded-xl p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                    Próximos Lanzamientos
                </h3>
                <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            </div>

            {/* Launch Items */}
            <div className="space-y-3">
                {launches.map((launch, index) => (
                    <div
                        key={launch.id}
                        className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-lg hover:bg-zinc-900 transition-colors"
                    >
                        <div className="p-1.5 bg-zinc-700 rounded-md">
                            <div className="text-zinc-300">
                                {launch.icon}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white truncate">
                                {launch.title}
                            </h4>
                            <p className="text-xs text-zinc-400 line-clamp-1">
                                {launch.description}
                            </p>
                            {launch.estimatedDate && (
                                <p className="text-xs text-zinc-500 mt-1">
                                    {launch.estimatedDate}
                                </p>
                            )}
                        </div>
                        <div className="flex-shrink-0">
                            <span className={`inline-block w-2 h-2 rounded-full ${launch.status === 'in-development' ? 'bg-purple-500' :
                                launch.status === 'beta' ? 'bg-emerald-500' :
                                    'bg-blue-500'
                                }`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* View All Button */}
            {showViewAll && (
                <button
                    onClick={onViewAll}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-sm text-zinc-400 hover:text-white transition-colors group"
                >
                    <span>Ver todos</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    )
}
