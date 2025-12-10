'use client';

import React from 'react';
import { X, Image as ImageIcon, Type, Minus, Sparkles } from 'lucide-react';
import { ComponentType, MediaMode, MediaType } from '@/types/content-blocks';

export interface ComponentOption {
    type: ComponentType;
    mode?: MediaMode;
    mediaType?: MediaType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    isPremium?: boolean;
}

interface CategorizedComponentSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (component: ComponentOption) => void;
    context?: 'portfolio' | 'offer'; // Contexto para determinar tipo de hero
}

// Función para obtener componentes según contexto
const getComponents = (context: 'portfolio' | 'offer' = 'portfolio'): ComponentOption[] => {
    const baseComponents: ComponentOption[] = [
        {
            type: 'text',
            label: 'Texto',
            icon: Type,
            description: 'Bloque de texto con formato completo',
        },
        {
            type: 'separator',
            label: 'Separador',
            icon: Minus,
            description: 'Espacio o línea divisoria',
        },
        {
            type: 'media-gallery',
            mode: 'grid',
            mediaType: 'images',
            label: 'Multimedia',
            icon: ImageIcon,
            description: 'Sube una o más fotos y videos y personaliza cómo se ven',
        },
    ];

    // Hero según contexto
    const heroComponent: ComponentOption = context === 'offer'
        ? {
            type: 'hero-offer',
            label: 'Hero Offer',
            icon: Sparkles,
            description: 'Hero con imagen de fondo, título, descripción y botones CTA',
        }
        : {
            type: 'hero-portfolio',
            label: 'Hero Portfolio',
            icon: Sparkles,
            description: 'Hero con imagen de fondo, título y descripción (sin botones)',
        };

    return [...baseComponents, heroComponent];
};

export function CategorizedComponentSelector({
    isOpen,
    onClose,
    onSelect,
    context = 'portfolio',
}: CategorizedComponentSelectorProps) {
    if (!isOpen) return null;

    const COMPONENTS = getComponents(context);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-zinc-300">Seleccionar Componente</h3>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {COMPONENTS.map((component, index) => (
                        <button
                            key={`${component.type}-${component.mode}-${component.mediaType}-${index}`}
                            onClick={() => {
                                onSelect(component);
                                onClose();
                            }}
                            className="p-4 border border-zinc-700 rounded-lg hover:border-emerald-500 hover:bg-emerald-500/10 transition-all text-left group"
                        >
                            <component.icon className="h-6 w-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                            <div className="font-medium text-zinc-300 text-sm mb-1">
                                {component.label}
                            </div>
                            <div className="text-xs text-zinc-500 leading-tight">
                                {component.description}
                            </div>
                            {component.isPremium && (
                                <div className="mt-2">
                                    <span className="text-xs text-yellow-400 font-medium">Premium</span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

