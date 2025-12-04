'use client';

import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';

interface BusinessPresentationCardProps {
    presentation?: string;
    studioName: string;
}

/**
 * BusinessPresentationCard - Card con presentación del negocio
 * Muestra el texto de presentación del studio con opción de expandir
 */
export function BusinessPresentationCard({ presentation, studioName }: BusinessPresentationCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // No mostrar card si no hay presentación
    if (!presentation || presentation.trim().length === 0) {
        return null;
    }

    const MAX_LENGTH = 200;
    const shouldTruncate = presentation.length > MAX_LENGTH;
    const displayText = !shouldTruncate || isExpanded
        ? presentation
        : `${presentation.substring(0, MAX_LENGTH)}...`;

    return (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800/50 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-zinc-400" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100">
                    Acerca de {studioName}
                </h3>
            </div>

            {/* Content */}
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {displayText}
            </p>

            {/* Toggle button */}
            {shouldTruncate && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                    {isExpanded ? (
                        <>
                            Ver menos
                            <ChevronUp className="h-3 w-3" />
                        </>
                    ) : (
                        <>
                            Ver más
                            <ChevronDown className="h-3 w-3" />
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
