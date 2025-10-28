'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { ComponentType } from '@/types/content-blocks';

interface DropZoneProps {
    index: number;
    onAddComponent: (type: ComponentType, index: number) => void;
    className?: string;
}

export function DropZone({ index, onAddComponent, className = '' }: DropZoneProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: `drop-zone-${index}`,
    });

    return (
        <div
            ref={setNodeRef}
            className={`relative transition-all duration-200 ${isOver
                    ? 'h-16 border-2 border-blue-500 border-dashed bg-blue-500/10'
                    : 'h-2'
                } ${className}`}
        >
            {isOver && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-blue-400">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            Suelta aquí para agregar componente
                        </span>
                    </div>
                </div>
            )}

            {/* Invisible clickable area for adding components */}
            <div
                className="absolute inset-0 cursor-pointer"
                onClick={() => {
                    // Aquí se abriría el selector de componentes
                    console.log('Add component at index:', index);
                }}
                title="Haz clic para agregar componente"
            />
        </div>
    );
}
