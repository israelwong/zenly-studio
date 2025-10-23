'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Edit, Trash2, Copy } from 'lucide-react';
import { ZenButton, ZenCard } from '@/components/ui/zen';
import {
    eliminarPaquete,
    duplicarPaquete,
} from '@/lib/actions/studio/builder/catalogo/paquetes.actions';
import { formatearMoneda } from '@/lib/actions/studio/builder/catalogo/calcular-precio';

interface PaqueteItemProps {
    paquete: {
        id: string;
        name: string;
        precio?: number | null;
        cost?: number | null;
        expense?: number | null;
        event_type_id: string;
    };
    studioSlug: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
}

export function PaqueteItem({
    paquete,
    studioSlug,
    onEdit,
    onDelete,
    onDuplicate,
}: PaqueteItemProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);

    const precioFormateado = formatearMoneda(paquete.precio || 0);

    const handleEliminar = async () => {
        if (
            !confirm(
                `¿Estás seguro de que quieres eliminar "${paquete.name}"? Esta acción no se puede deshacer.`
            )
        ) {
            return;
        }

        setIsDeleting(true);
        try {
            const result = await eliminarPaquete(studioSlug, paquete.id);

            if (result.success) {
                toast.success('Paquete eliminado correctamente');
                onDelete(paquete.id);
            } else {
                toast.error(result.error || 'Error al eliminar el paquete');
            }
        } catch (error) {
            toast.error('Error al eliminar el paquete');
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicar = async () => {
        setIsDuplicating(true);
        try {
            const result = await duplicarPaquete(studioSlug, paquete.id);

            if (result.success && result.data) {
                toast.success('Paquete duplicado correctamente');
                onDuplicate(result.data.id);
            } else {
                toast.error(result.error || 'Error al duplicar el paquete');
            }
        } catch (error) {
            toast.error('Error al duplicar el paquete');
            console.error(error);
        } finally {
            setIsDuplicating(false);
        }
    };

    return (
        <ZenCard className="group relative overflow-hidden hover:shadow-lg hover:shadow-blue-500/10 transition-all">
            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {paquete.name}
                        </h3>
                    </div>
                </div>

                {/* Precio */}
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-400">
                        {precioFormateado}
                    </span>
                    {paquete.cost !== null && paquete.cost !== undefined && (
                        <span className="text-sm text-zinc-500">
                            Costo: {formatearMoneda(paquete.cost)}
                        </span>
                    )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
                    <ZenButton
                        onClick={() => onEdit(paquete.id)}
                        variant="secondary"
                        size="sm"
                        className="flex-1 flex items-center justify-center gap-2"
                    >
                        <Edit className="w-4 h-4" />
                        Editar
                    </ZenButton>
                    <ZenButton
                        onClick={handleDuplicar}
                        variant="secondary"
                        size="sm"
                        disabled={isDuplicating}
                        className="flex items-center justify-center gap-2"
                    >
                        <Copy className="w-4 h-4" />
                    </ZenButton>
                    <ZenButton
                        onClick={handleEliminar}
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting}
                        className="flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                    </ZenButton>
                </div>
            </div>
        </ZenCard>
    );
}
