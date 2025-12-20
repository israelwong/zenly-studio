'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CanalAdquisicion {
    id: string;
    nombre: string;
    descripcion: string | null;
    color: string | null;
    icono: string | null;
    isActive: boolean;
    isVisible: boolean;
    orden: number;
    createdAt: Date;
    updatedAt: Date;
}

interface CanalItemProps {
    canal: CanalAdquisicion;
    onEdit: (canal: CanalAdquisicion) => void;
    onDelete: (id: string) => void;
    onToggleVisible: (id: string, isVisible: boolean) => Promise<void>;
}

export default function CanalItem({
    canal,
    onEdit,
    onDelete,
    onToggleVisible
}: CanalItemProps) {
    const [isUpdating, setIsUpdating] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: canal.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de que quieres eliminar este canal?')) {
            try {
                await onDelete(id);
                toast.success('Canal eliminado correctamente');
            } catch {
                toast.error('Error al eliminar el canal');
            }
        }
    };


    const handleToggleVisible = async (id: string, isVisible: boolean) => {
        if (isUpdating) return;

        setIsUpdating(true);
        try {
            await onToggleVisible(id, isVisible);
        } catch {
            // El error ya se maneja en la función padre
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="h-4 w-4 text-zinc-500" />
                    </div>
                    <span className="text-sm font-medium text-zinc-400 w-6">
                        {canal.orden}
                    </span>
                </div>

                <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: canal.color || '#3B82F6' }}
                ></div>

                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-white">{canal.nombre}</h3>
                        <Badge
                            variant="outline"
                            className={`text-xs ${canal.isActive
                                ? 'border-green-500 text-green-400'
                                : 'border-red-500 text-red-400'
                                }`}
                        >
                            {canal.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge
                            variant="outline"
                            className={`text-xs ${canal.isVisible
                                ? 'border-blue-500 text-blue-400'
                                : 'border-zinc-500 text-zinc-400'
                                }`}
                        >
                            {canal.isVisible ? 'Visible' : 'Oculto'}
                        </Badge>
                    </div>
                    {canal.descripcion && (
                        <p className="text-sm text-zinc-400">{canal.descripcion}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleVisible(canal.id, !canal.isVisible)}
                    disabled={isUpdating}
                >
                    {canal.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(canal)}
                    disabled={isUpdating}
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(canal.id)}
                    disabled={isUpdating}
                    className="text-red-400 hover:text-red-300"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
