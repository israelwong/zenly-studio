'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { ZenInput } from '@/components/ui/zen';
import { Search } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import CanalItem from './CanalItem';

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

interface CanalesListProps {
    canales: CanalAdquisicion[];
    loading: boolean;
    isReordering: boolean;
    onEdit: (canal: CanalAdquisicion) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
    onToggleVisible: (id: string, isVisible: boolean) => void;
    onReorder: (canales: CanalAdquisicion[]) => void;
}


export default function CanalesList({
    canales,
    loading,
    isReordering,
    onEdit,
    onDelete,
    onToggleActive,
    onToggleVisible,
    onReorder
}: CanalesListProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = canales.findIndex((canal) => canal.id === active.id);
            const newIndex = canales.findIndex((canal) => canal.id === over.id);

            const reorderedCanales = arrayMove(canales, oldIndex, newIndex);
            onReorder(reorderedCanales);
        }
    };

    const filteredCanales = canales.filter(canal => {
        const matchesSearch = canal.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            canal.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });


    if (loading) {
        return (
            <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="border-b border-zinc-800">
                    <CardTitle className="text-lg font-semibold text-white">Canales de Adquisición</CardTitle>
                    <div className="text-sm text-zinc-400">
                        Cargando canales...
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-zinc-800">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                                <div className="flex items-center space-x-4">
                                    <div className="h-4 w-4 bg-zinc-700 rounded"></div>
                                    <div className="h-4 w-6 bg-zinc-700 rounded"></div>
                                    <div className="h-4 w-4 bg-zinc-700 rounded-full"></div>
                                    <div className="h-4 bg-zinc-700 rounded w-32"></div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="h-6 w-16 bg-zinc-700 rounded"></div>
                                    <div className="h-6 w-16 bg-zinc-700 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-sm">
                    <ZenInput
                        placeholder="Buscar canales..."
                        icon={Search}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista de canales con drag and drop */}
            <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="border-b border-zinc-800">
                    <CardTitle className="text-lg font-semibold text-white">Canales de Adquisición</CardTitle>
                    <div className="text-sm text-zinc-400">
                        {isReordering ? (
                            <span className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                                <span>Actualizando posición...</span>
                            </span>
                        ) : (
                            "Arrastra para reordenar los canales de adquisición"
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={filteredCanales.map(canal => canal.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className={`divide-y divide-zinc-800 ${isReordering ? 'pointer-events-none opacity-50' : ''}`}>
                                {filteredCanales.map((canal) => (
                                    <CanalItem
                                        key={canal.id}
                                        canal={canal}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onToggleActive={onToggleActive}
                                        onToggleVisible={onToggleVisible}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {filteredCanales.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-zinc-400">No se encontraron canales</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
