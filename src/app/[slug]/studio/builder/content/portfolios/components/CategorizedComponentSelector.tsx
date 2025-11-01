'use client';

import React from 'react';
import { X, Image as ImageIcon, MessageCircle, FileText, Type, Minus, Sparkles } from 'lucide-react';
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

interface Category {
    id: string;
    label: string;
    components: ComponentOption[];
}

interface CategorizedComponentSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (component: ComponentOption) => void;
}

const COMPONENT_CATEGORIES: Category[] = [
    {
        id: 'texto',
        label: 'Texto',
        components: [
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
        ],
    },
    {
        id: 'multimedia',
        label: 'Multimedia',
        components: [
            {
                type: 'media-gallery',
                mode: 'grid',
                mediaType: 'images',
                label: 'Multimedia',
                icon: ImageIcon,
                description: 'Sube una o más fotos y videos y personaliza cómo se ven',
            },
        ],
    },
    {
        id: 'heros',
        label: 'Heros',
        components: [
            {
                type: 'hero',
                label: 'Hero',
                icon: Sparkles,
                description: 'Hero unificado con imagen o video de fondo, título, descripción y botones',
            },
            {
                type: 'hero-contact',
                label: 'Hero Contacto',
                icon: MessageCircle,
                description: 'Hero con call-to-action',
                isPremium: true,
            },
            {
                type: 'hero-image',
                mode: 'single',
                mediaType: 'images',
                label: 'Hero Imagen',
                icon: ImageIcon,
                description: 'Hero con imagen de fondo',
                isPremium: true,
            },
            {
                type: 'hero-video',
                mode: 'single',
                mediaType: 'videos',
                label: 'Hero Video',
                icon: ImageIcon,
                description: 'Hero con video de fondo',
                isPremium: true,
            },
            {
                type: 'hero-text',
                label: 'Hero Texto',
                icon: FileText,
                description: 'Hero con fondo decorativo',
                isPremium: true,
            },
        ],
    },
];

export function CategorizedComponentSelector({
    isOpen,
    onClose,
    onSelect,
}: CategorizedComponentSelectorProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-zinc-300">Seleccionar Componente</h3>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Todas las categorías y componentes */}
                <div className="space-y-6">
                    {COMPONENT_CATEGORIES.map((category) => (
                        <div key={category.id}>
                            <h4 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wide">
                                {category.label}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {category.components.map((component, index) => (
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
                    ))}
                </div>
            </div>
        </div>
    );
}

