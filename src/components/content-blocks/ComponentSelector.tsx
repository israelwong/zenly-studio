'use client';

import React from 'react';
import { Video, Images, Grid3X3, Type, Sliders } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { ComponentType, ComponentSelectorProps } from '@/types/content-blocks';

const componentTypes: Array<{
    type: ComponentType;
    label: string;
    icon: React.ReactNode;
    description: string;
}> = [
        {
            type: 'video',
            label: 'Video',
            icon: <Video className="h-5 w-5" />,
            description: 'Reproductor de video individual'
        },
        {
            type: 'gallery',
            label: 'Galería',
            icon: <Images className="h-5 w-5" />,
            description: 'Galería de imágenes con lightbox'
        },
        {
            type: 'grid',
            label: 'Grid',
            icon: <Grid3X3 className="h-5 w-5" />,
            description: 'Cuadrícula de imágenes organizadas'
        },
        {
            type: 'text',
            label: 'Texto',
            icon: <Type className="h-5 w-5" />,
            description: 'Bloque de texto con formato'
        },
        {
            type: 'slider',
            label: 'Slider',
            icon: <Sliders className="h-5 w-5" />,
            description: 'Carrusel deslizable de contenido'
        }
    ];

export function ComponentSelector({ onSelect, className = '' }: ComponentSelectorProps) {
    return (
        <div className={`space-y-4 ${className}`}>
            <div className="text-center">
                <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                    Agregar Componente
                </h3>
                <p className="text-sm text-zinc-500">
                    Selecciona el tipo de contenido que quieres agregar
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {componentTypes.map((component) => (
                    <ZenButton
                        key={component.type}
                        variant="outline"
                        onClick={() => onSelect(component.type)}
                        className="w-full justify-start h-auto p-4 hover:bg-zinc-800 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="text-zinc-400">
                                {component.icon}
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-zinc-300">
                                    {component.label}
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {component.description}
                                </div>
                            </div>
                        </div>
                    </ZenButton>
                ))}
            </div>
        </div>
    );
}
