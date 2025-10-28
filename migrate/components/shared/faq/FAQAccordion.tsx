'use client'
import React from 'react'
import { FAQItem } from './FAQSection'

interface FAQAccordionProps {
    item: FAQItem
    isOpen: boolean
    onToggle: () => void
    className?: string
}

export default function FAQAccordion({
    item,
    isOpen,
    onToggle,
    className = ''
}: FAQAccordionProps) {

    const getCategoryBadge = (category: string) => {
        const badges = {
            'bodas': { label: 'Bodas', color: 'bg-pink-900 text-pink-300' },
            'xv-anos': { label: 'XV Años', color: 'bg-purple-900 text-purple-300' },
            'corporativo': { label: 'Corporativo', color: 'bg-blue-900 text-blue-300' },
            'general': { label: 'General', color: 'bg-zinc-700 text-zinc-300' }
        }

        const badge = badges[category as keyof typeof badges] || badges.general

        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${badge.color}`}>
                {badge.label}
            </span>
        )
    }

    return (
        <div className={`bg-zinc-800 rounded-lg border border-zinc-600 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset"
                aria-expanded={isOpen}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                        {/* Question */}
                        <div className="flex items-start gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-zinc-100 leading-6">
                                {item.question}
                            </h3>
                            {item.featured && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-900 text-yellow-300">
                                    ⭐ Popular
                                </span>
                            )}
                        </div>

                        {/* Category Badge */}
                        <div className="flex items-center gap-2">
                            {getCategoryBadge(item.category)}
                            {item.tags && item.tags.length > 0 && (
                                <div className="flex items-center gap-1">
                                    {item.tags.slice(0, 2).map((tag, index) => (
                                        <span key={index} className="text-xs text-zinc-400 bg-zinc-700 px-2 py-1 rounded">
                                            #{tag}
                                        </span>
                                    ))}
                                    {item.tags.length > 2 && (
                                        <span className="text-xs text-zinc-500">
                                            +{item.tags.length - 2}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Toggle Icon */}
                    <div className="flex-shrink-0 ml-2">
                        <svg
                            className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                                }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </button>

            {/* Content */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-6' : 'max-h-0'
                    }`}
            >
                <div className="px-6">
                    <div className="pl-0 border-l-2 border-zinc-600 ml-4">
                        <div className="pl-4">
                            <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
                                {item.answer}
                            </p>

                            {/* Additional info for featured items */}
                            {/* {item.featured && (
                                <div className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm font-medium text-purple-300">
                                            ¿Necesitas más información?
                                        </span>
                                    </div>
                                    <p className="text-sm text-purple-200">
                                        Contáctanos por WhatsApp para una consulta personalizada gratuita.
                                    </p>
                                    <button className="mt-2 text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1">
                                        <span>Consulta gratuita</span>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            )} */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
