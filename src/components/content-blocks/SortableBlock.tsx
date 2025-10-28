'use client';

import React from 'react';
import { GripVertical, Edit, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ZenButton } from '@/components/ui/zen';
import { ContentBlock, BaseBlockProps } from '@/types/content-blocks';

interface SortableBlockProps extends BaseBlockProps {
    block: ContentBlock;
}

export function SortableBlock({
    block,
    onUpdate,
    onDelete,
    isEditing = false,
    className = ''
}: SortableBlockProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getBlockIcon = (type: string) => {
        switch (type) {
            case 'video':
                return '🎬';
            case 'gallery':
                return '🖼️';
            case 'grid':
                return '📐';
            case 'text':
                return '📝';
            case 'slider':
                return '🎠';
            default:
                return '📦';
        }
    };

    const getBlockTitle = (block: ContentBlock) => {
        if (block.title) return block.title;

        switch (block.type) {
            case 'video':
                return 'Video';
            case 'gallery':
                return `Galería (${block.media.length} imágenes)`;
            case 'grid':
                return `Grid (${block.media.length} elementos)`;
            case 'text':
                return 'Bloque de Texto';
            case 'slider':
                return `Slider (${block.media.length} elementos)`;
            default:
                return 'Componente';
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group border border-zinc-700 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors ${className}`}
        >
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                    {/* Drag Handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-zinc-700 rounded transition-colors"
                        title="Arrastrar para reordenar"
                    >
                        <GripVertical className="h-4 w-4 text-zinc-500" />
                    </div>

                    {/* Block Info */}
                    <div className="flex items-center space-x-3">
                        <span className="text-lg">{getBlockIcon(block.type)}</span>
                        <div>
                            <h4 className="font-medium text-zinc-300">
                                {getBlockTitle(block)}
                            </h4>
                            <p className="text-sm text-zinc-500 capitalize">
                                {block.type} • Orden: {block.order + 1}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                {isEditing && (
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZenButton
                            variant="ghost"
                            size="sm"
                            onClick={() => onUpdate?.(block)}
                            title="Editar componente"
                        >
                            <Edit className="h-4 w-4" />
                        </ZenButton>
                        <ZenButton
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete?.(block.id)}
                            title="Eliminar componente"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </ZenButton>
                    </div>
                )}
            </div>

            {/* Block Preview */}
            <div className="px-4 pb-4">
                <div className="text-xs text-zinc-500 space-y-1">
                    {block.description && (
                        <p className="truncate">{block.description}</p>
                    )}
                    <div className="flex items-center space-x-4">
                        <span>Presentación: {block.presentation}</span>
                        {block.media.length > 0 && (
                            <span>{block.media.length} archivo(s)</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
