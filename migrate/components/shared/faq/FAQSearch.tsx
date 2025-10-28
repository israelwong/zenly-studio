'use client'
import React from 'react'

interface FAQSearchProps {
    searchTerm: string
    onSearchChange: (term: string) => void
    placeholder?: string
    className?: string
}

export default function FAQSearch({
    searchTerm,
    onSearchChange,
    placeholder = 'Buscar preguntas...',
    className = ''
}: FAQSearchProps) {
    return (
        <div className={`relative ${className}`}>
            {/* Search Icon */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                    className="h-5 w-5 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>

            {/* Input */}
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 border border-zinc-600 rounded-lg bg-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-zinc-100"
                placeholder={placeholder}
            />

            {/* Clear Button */}
            {searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                        onClick={() => onSearchChange('')}
                        className="text-zinc-400 hover:text-zinc-200 transition-colors"
                        aria-label="Limpiar búsqueda"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Search hint */}
            {searchTerm && (
                <div className="mt-2 text-sm text-zinc-400">
                    Buscando: "<span className="font-medium text-zinc-200">{searchTerm}</span>"
                </div>
            )}
        </div>
    )
}
