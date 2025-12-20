'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Switch } from '@/components/ui/shadcn/switch';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    Edit,
    Trash2,
    GripVertical,
    ExternalLink,
    Facebook,
    Instagram,
    Twitter,
    Youtube,
    Linkedin,
    Music,
    Globe
} from 'lucide-react';
import { toast } from 'sonner';

interface PlataformaRedSocial {
    id: string;
    nombre: string;
    slug: string;
    descripcion: string | null;
    color: string | null;
    icono: string | null;
    urlBase: string | null;
    isActive: boolean;
    orden: number;
    createdAt: Date;
    updatedAt: Date;
}

interface PlataformasListProps {
    plataformas: PlataformaRedSocial[];
    loading: boolean;
    isReordering: boolean;
    onEdit: (plataforma: PlataformaRedSocial) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
    onReorder: (reorderedPlataformas: PlataformaRedSocial[]) => void;
}

// Mapeo de íconos de Lucide
const iconMap: Record<string, any> = {
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    youtube: Youtube,
    linkedin: Linkedin,
    music: Music,
    globe: Globe,
};

export function PlataformasList({
    plataformas,
    loading,
    isReordering,
    onEdit,
    onDelete,
    onToggleActive,
    onReorder,
}: PlataformasListProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const newPlataformas = [...plataformas];
        const draggedPlataforma = newPlataformas[draggedIndex];

        // Remover el elemento arrastrado
        newPlataformas.splice(draggedIndex, 1);

        // Insertar en la nueva posición
        newPlataformas.splice(dropIndex, 0, draggedPlataforma);

        // Actualizar el orden
        onReorder(newPlataformas);
        setDraggedIndex(null);
    };

    const handleDelete = async (id: string, nombre: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar la plataforma "${nombre}"?`)) {
            try {
                await onDelete(id);
            } catch (error) {
                toast.error('Error al eliminar la plataforma');
            }
        }
    };

    const getIconComponent = (icono: string | null) => {
        if (!icono) return Globe;
        return iconMap[icono] || Globe;
    };

    if (loading) {
        return (
            <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-zinc-400">Cargando plataformas...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (plataformas.length === 0) {
        return (
            <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-6">
                    <div className="text-center">
                        <p className="text-zinc-400 mb-4">No hay plataformas de redes sociales configuradas</p>
                        <p className="text-sm text-zinc-500">Crea tu primera plataforma para que los estudios puedan usarla</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-border bg-card shadow-sm">
            <CardHeader>
                <CardTitle className="text-white">Plataformas de Redes Sociales</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="space-y-2">
                    {plataformas.map((plataforma, index) => {
                        const IconComponent = getIconComponent(plataforma.icono);

                        return (
                            <div
                                key={plataforma.id}
                                draggable={!isReordering}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                className={`
                  flex items-center justify-between p-4 border-b border-border last:border-b-0
                  hover:bg-zinc-800/50 transition-colors
                  ${draggedIndex === index ? 'opacity-50' : ''}
                  ${isReordering ? 'cursor-move' : ''}
                `}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <GripVertical className="h-4 w-4 text-zinc-400 cursor-move" />
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: plataforma.color || '#6B7280' }}
                                        >
                                            <IconComponent className="h-4 w-4 text-white" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-medium text-white">{plataforma.nombre}</h3>
                                            <Badge variant={plataforma.isActive ? "default" : "secondary"}>
                                                {plataforma.isActive ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-zinc-400">{plataforma.descripcion}</p>
                                        <div className="flex items-center space-x-4 mt-1">
                                            <span className="text-xs text-zinc-500">Slug: {plataforma.slug}</span>
                                            {plataforma.urlBase && (
                                                <span className="text-xs text-zinc-500">Base: {plataforma.urlBase}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={plataforma.isActive}
                                        onCheckedChange={(checked) => onToggleActive(plataforma.id, checked)}
                                        disabled={isReordering}
                                    />

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEdit(plataforma)}
                                        disabled={isReordering}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(plataforma.id, plataforma.nombre)}
                                        disabled={isReordering}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
