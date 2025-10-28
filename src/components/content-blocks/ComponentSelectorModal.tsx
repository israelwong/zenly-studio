'use client';

import React from 'react';
import { Video, Images, Grid3X3, Type, Sliders } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/shadcn/dialog';
import { ZenButton } from '@/components/ui/zen';
import { ComponentType } from '@/types/content-blocks';

interface ComponentSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: ComponentType) => void;
}

const componentTypes: Array<{
    type: ComponentType;
    label: string;
    icon: React.ReactNode;
    description: string;
    color: string;
}> = [
        {
            type: 'video',
            label: 'Video',
            icon: <Video className="h-6 w-6" />,
            description: 'Reproductor de video individual con controles personalizables',
            color: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
        },
        {
            type: 'gallery',
            label: 'Galería',
            icon: <Images className="h-6 w-6" />,
            description: 'Galería de imágenes con lightbox y diferentes layouts',
            color: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
        },
        {
            type: 'text',
            label: 'Texto',
            icon: <Type className="h-6 w-6" />,
            description: 'Bloque de texto con formato, alineación y estilos',
            color: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
        },
        {
            type: 'grid',
            label: 'Grid',
            icon: <Grid3X3 className="h-6 w-6" />,
            description: 'Cuadrícula de imágenes organizadas (próximamente)',
            color: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
        },
        {
            type: 'slider',
            label: 'Slider',
            icon: <Sliders className="h-6 w-6" />,
            description: 'Carrusel deslizable de contenido (próximamente)',
            color: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20'
        }
    ];

export function ComponentSelectorModal({ isOpen, onClose, onSelect }: ComponentSelectorModalProps) {
    const handleSelect = (type: ComponentType) => {
        onSelect(type);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border border-zinc-700 text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-zinc-100 text-xl">
                        Agregar Componente
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Selecciona el tipo de contenido que quieres agregar a tu post
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {componentTypes.map((component) => (
                            <button
                                key={component.type}
                                onClick={() => handleSelect(component.type)}
                                className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${component.color}`}
                                disabled={component.type === 'grid' || component.type === 'slider'}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 mt-1">
                                        {component.icon}
                                    </div>
                                    <div className="text-left flex-1">
                                        <h3 className="font-semibold text-lg mb-1">
                                            {component.label}
                                        </h3>
                                        <p className="text-sm opacity-80 leading-relaxed">
                                            {component.description}
                                        </p>
                                        {(component.type === 'grid' || component.type === 'slider') && (
                                            <span className="inline-block mt-2 px-2 py-1 bg-zinc-700 text-zinc-400 text-xs rounded">
                                                Próximamente
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <ZenButton variant="ghost" onClick={onClose}>
                        Cancelar
                    </ZenButton>
                </div>
            </DialogContent>
        </Dialog>
    );
}
