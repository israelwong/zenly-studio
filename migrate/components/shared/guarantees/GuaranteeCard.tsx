'use client'
import React from 'react'
import { Guarantee, GuaranteeVariant } from './types'

interface GuaranteeCardProps {
    guarantee: Guarantee
    variant?: GuaranteeVariant
    className?: string
}

export default function GuaranteeCard({
    guarantee,
    variant = 'full',
    className = ''
}: GuaranteeCardProps) {

    const getColorClasses = (color: string = 'purple') => {
        const colors = {
            purple: {
                icon: 'text-purple-400 bg-zinc-700',
                badge: 'bg-purple-600 text-white',
                border: 'border-zinc-600',
                hover: 'hover:border-zinc-500'
            },
            blue: {
                icon: 'text-blue-400 bg-zinc-700',
                badge: 'bg-blue-600 text-white',
                border: 'border-zinc-600',
                hover: 'hover:border-zinc-500'
            },
            green: {
                icon: 'text-green-400 bg-zinc-700',
                badge: 'bg-green-600 text-white',
                border: 'border-zinc-600',
                hover: 'hover:border-zinc-500'
            },
            pink: {
                icon: 'text-pink-400 bg-zinc-700',
                badge: 'bg-pink-600 text-white',
                border: 'border-zinc-600',
                hover: 'hover:border-zinc-500'
            },
            orange: {
                icon: 'text-orange-400 bg-zinc-700',
                badge: 'bg-orange-600 text-white',
                border: 'border-zinc-600',
                hover: 'hover:border-zinc-500'
            }
        }
        return colors[color as keyof typeof colors] || colors.purple
    }

    const colorClasses = getColorClasses(guarantee.color)

    const getCardStyles = () => {
        switch (variant) {
            case 'compact':
                return {
                    cardClass: 'p-6',
                    titleSize: 'text-lg',
                    descSize: 'text-sm',
                    iconSize: 'w-10 h-10',
                    showFeatures: false
                }
            case 'inline':
                return {
                    cardClass: 'p-6',
                    titleSize: 'text-xl',
                    descSize: 'text-base',
                    iconSize: 'w-12 h-12',
                    showFeatures: true
                }
            default: // full
                return {
                    cardClass: 'p-8',
                    titleSize: 'text-xl',
                    descSize: 'text-base',
                    iconSize: 'w-14 h-14',
                    showFeatures: true
                }
        }
    }

    const cardStyles = getCardStyles()

    return (
        <div className={`relative bg-zinc-800 rounded-xl border-2 ${colorClasses.border} ${colorClasses.hover} shadow-sm hover:shadow-lg transition-all duration-300 group ${cardStyles.cardClass} ${className}`}>
            {/* Badge */}
            {guarantee.badge && (
                <div className="absolute -top-3 left-6">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${colorClasses.badge}`}>
                        {guarantee.badge}
                    </span>
                </div>
            )}

            {/* Icon */}
            <div className={`flex items-center justify-center ${cardStyles.iconSize} ${colorClasses.icon} rounded-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {guarantee.icon}
            </div>

            {/* Content */}
            <div className="space-y-4">
                {/* Title */}
                <h3 className={`${cardStyles.titleSize} font-bold text-zinc-100 leading-tight`}>
                    {guarantee.title}
                </h3>

                {/* Description */}
                <p className={`${cardStyles.descSize} text-zinc-300 leading-relaxed`}>
                    {guarantee.description}
                </p>

                {/* Features */}
                {cardStyles.showFeatures && guarantee.features && guarantee.features.length > 0 && (
                    <div className="pt-4 border-t border-zinc-700">
                        <ul className="space-y-2">
                            {guarantee.features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-3 text-sm text-zinc-300">
                                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
    )
}
