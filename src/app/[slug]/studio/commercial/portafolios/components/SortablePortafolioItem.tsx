'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ZenButton } from '@/components/ui/zen';
import { Edit, Trash2, GripVertical, Image, Video } from 'lucide-react';
import { PortafolioItem, Portafolio } from '../types';

interface SortablePortafolioItemProps {
    item: PortafolioItem;
    portfolio: Portafolio;
    onEdit: (item: PortafolioItem, portfolio: Portafolio) => void;
    onDelete: (itemId: string, portfolioId: string) => void;
}

export function SortablePortafolioItem({ item, portfolio, onEdit, onDelete }: SortablePortafolioItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="h-4 w-4 text-zinc-500" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {item.item_type === 'PHOTO' ? (
                        <Image className="h-4 w-4 text-zinc-400" />
                    ) : (
                        <Video className="h-4 w-4 text-zinc-400" />
                    )}
                    <span className="font-medium text-zinc-200 truncate">{item.title}</span>
                </div>
                {item.description && (
                    <p className="text-sm text-zinc-400 truncate">{item.description}</p>
                )}
            </div>

            <div className="flex items-center gap-1">
                <ZenButton
                    onClick={() => onEdit(item, portfolio)}
                    variant="outline"
                    size="sm"
                    className="p-2"
                >
                    <Edit className="h-3 w-3" />
                </ZenButton>
                <ZenButton
                    onClick={() => onDelete(item.id, portfolio.id)}
                    variant="outline"
                    size="sm"
                    className="p-2 text-red-400 hover:text-red-300"
                >
                    <Trash2 className="h-3 w-3" />
                </ZenButton>
            </div>
        </div>
    );
}

