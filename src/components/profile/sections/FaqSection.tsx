'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQItem {
    id: string;
    pregunta: string;
    respuesta: string;
    orden: number;
    is_active: boolean;
}

interface FaqSectionProps {
    faq?: FAQItem[];
    data?: {
        faq?: FAQItem[];
    };
    loading?: boolean;
}

/**
 * FaqSection - Display for studio FAQ section
 * Shows FAQ items in an accordion format
 * 
 * Usado en:
 * - ProfileContent variant="faq" (sección principal)
 * - MobilePreviewContainer (persistente antes del footer)
 * - ProfilePageClient (persistente antes del footer)
 */
export function FaqSection({ faq, data, loading = false }: FaqSectionProps) {
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());
    
    // Soporte para ambos formatos de props
    const faqData = faq || data?.faq || [];
    const activeFAQ = faqData.filter(faq => faq.is_active);

    const toggleItem = (id: string) => {
        setOpenItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-zinc-700 rounded animate-pulse"></div>
                    <div className="h-5 bg-zinc-700 rounded animate-pulse w-32"></div>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="border border-zinc-800 rounded-lg p-4">
                            <div className="h-4 bg-zinc-700 rounded animate-pulse w-3/4 mb-2"></div>
                            <div className="h-3 bg-zinc-700 rounded animate-pulse w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!activeFAQ.length) {
        return (
            <div className="p-8 text-center">
                <div className="text-zinc-400 mb-2">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    Sin preguntas frecuentes
                </h3>
                <p className="text-sm text-zinc-500">
                    Este estudio aún no tiene preguntas frecuentes configuradas
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">
                    Preguntas Frecuentes
                </h3>
            </div>

            {/* FAQ Items */}
            <div className="space-y-2">
                {activeFAQ
                    .sort((a, b) => a.orden - b.orden)
                    .map((faq) => {
                        const isOpen = openItems.has(faq.id);
                        
                        return (
                            <div
                                key={faq.id}
                                className="border border-zinc-800 rounded-lg overflow-hidden transition-all duration-200 hover:border-zinc-700"
                            >
                                <button
                                    onClick={() => toggleItem(faq.id)}
                                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-zinc-800/50 transition-colors"
                                >
                                    <span className="font-medium text-white text-sm leading-relaxed">
                                        {faq.pregunta}
                                    </span>
                                    {isOpen ? (
                                        <ChevronUp className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                    )}
                                </button>
                                
                                {isOpen && (
                                    <div className="px-4 pb-3 border-t border-zinc-800 bg-zinc-900/30">
                                        <p className="text-zinc-300 text-sm leading-relaxed pt-3">
                                            {faq.respuesta}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
