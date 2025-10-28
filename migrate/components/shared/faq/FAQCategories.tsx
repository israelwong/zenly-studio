'use client'
import React from 'react'
import { FAQCategory } from './FAQSection'

interface FAQCategoriesProps {
    selectedCategory: FAQCategory
    onCategoryChange: (category: FAQCategory) => void
    className?: string
}

const categories = [
    {
        value: 'all' as FAQCategory,
        label: 'Todas',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        ),
        count: 0
    },
    {
        value: 'bodas' as FAQCategory,
        label: 'Bodas',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        ),
        color: 'text-pink-400 bg-zinc-800 border-zinc-600',
        activeColor: 'text-pink-300 bg-pink-900 border-pink-600',
        count: 3
    },
    {
        value: 'xv-anos' as FAQCategory,
        label: 'XV Años',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
        ),
        color: 'text-purple-400 bg-zinc-800 border-zinc-600',
        activeColor: 'text-purple-300 bg-purple-900 border-purple-600',
        count: 2
    },
    {
        value: 'corporativo' as FAQCategory,
        label: 'Corporativo',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
        color: 'text-blue-400 bg-zinc-800 border-zinc-600',
        activeColor: 'text-blue-300 bg-blue-900 border-blue-600',
        count: 2
    },
    {
        value: 'general' as FAQCategory,
        label: 'General',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        color: 'text-zinc-400 bg-zinc-800 border-zinc-600',
        activeColor: 'text-zinc-300 bg-zinc-700 border-zinc-500',
        count: 3
    }
]

export default function FAQCategories({
    selectedCategory,
    onCategoryChange,
    className = ''
}: FAQCategoriesProps) {
    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {categories.map((category) => {
                const isSelected = selectedCategory === category.value
                const baseClasses = "inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-all duration-200 hover:shadow-sm"

                let classes = baseClasses

                if (category.value === 'all') {
                    classes += isSelected
                        ? " text-white bg-purple-600 border-purple-600 shadow-md"
                        : " text-zinc-300 bg-zinc-800 border-zinc-600 hover:border-zinc-500 hover:text-zinc-200"
                } else {
                    classes += isSelected
                        ? ` ${category.activeColor} shadow-md`
                        : ` ${category.color} hover:shadow-sm hover:border-zinc-500`
                }

                return (
                    <button
                        key={category.value}
                        onClick={() => onCategoryChange(category.value)}
                        className={classes}
                        aria-pressed={isSelected}
                    >
                        {category.icon}
                        <span>{category.label}</span>
                        {category.count > 0 && (
                            <span className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full ${isSelected
                                ? (category.value === 'all' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-current')
                                : 'bg-zinc-700 text-current'
                                }`}>
                                {category.count}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
