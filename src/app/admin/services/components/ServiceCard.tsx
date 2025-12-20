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
import { Service } from '../types';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ServiceCardProps {
    service: Service;
    onEdit: (service: Service) => void;
    onDelete: (serviceId: string) => void;
    onToggleActive: (service: Service) => void;
}

export function ServiceCard({
    service,
    onEdit,
    onDelete,
    onToggleActive
}: ServiceCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: service.id });

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
                    style={{ backgroundColor: service.active ? '#10B981' : '#EF4444' }}
                ></div>

                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white">{service.name}</h3>
                        <Badge
                            variant="outline"
                            className={`text-xs ${service.active
                                ? 'border-green-500 text-green-400'
                                : 'border-red-500 text-red-400'
                                }`}
                        >
                            {service.active ? "Activo" : "Inactivo"}
                        </Badge>
                    </div>
                    {service.description && (
                        <div className="text-sm text-zinc-400">
                            {service.description}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="text-right mr-4">
                    <p className="text-xs text-zinc-400">
                        Creado: {new Date(service.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleActive(service)}
                    title={service.active ? "Desactivar" : "Activar"}
                >
                    {service.active ? (
                        <Eye className="h-4 w-4" />
                    ) : (
                        <EyeOff className="h-4 w-4" />
                    )}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(service)}
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(service.id)}
                    className="text-red-400 hover:text-red-300"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
