'use client';

import React from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    GripVertical
} from 'lucide-react';
import { ServiceCategory } from '../types';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ServiceCategoryCardProps {
    category: ServiceCategory;
    onEdit: (category: ServiceCategory) => void;
    onDelete: (categoryId: string) => void;
    onToggleActive: (category: ServiceCategory) => void;
}

export function ServiceCategoryCard({
    category,
    onEdit,
    onDelete,
    onToggleActive
}: ServiceCategoryCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
            <div className="flex items-center space-x-4">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing"
                    title="Arrastrar para reordenar"
                >
                    <GripVertical className="h-4 w-4 text-zinc-500" />
                </div>

                <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.active ? '#10B981' : '#EF4444' }}
                ></div>

                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white">{category.name}</h3>
                        <Badge
                            variant="outline"
                            className={`text-xs ${category.active
                                ? 'border-green-500 text-green-400'
                                : 'border-red-500 text-red-400'
                                }`}
                        >
                            {category.active ? "Activo" : "Inactivo"}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span className="font-mono">{category.icon}</span>
                        <span className="line-clamp-1">{category.description}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="text-right mr-4">
                    <p className="text-xs text-zinc-400">
                        Creado: {new Date(category.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleActive(category)}
                    title={category.active ? "Desactivar" : "Activar"}
                >
                    {category.active ? (
                        <Eye className="h-4 w-4" />
                    ) : (
                        <EyeOff className="h-4 w-4" />
                    )}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(category)}
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(category.id)}
                    className="text-red-400 hover:text-red-300"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
