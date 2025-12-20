'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/shadcn/button';
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { deletePipelineStage, togglePipelineStageStatus } from '../actions';

interface PipelineStageActionsProps {
    stage: {
        id: string;
        name: string;
        description: string | null;
        color: string;
        order: number;
        isActive: boolean;
        leadCount: number;
    };
    onEdit: (stage: any) => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
}

export function PipelineStageActions({
    stage,
    onEdit,
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown
}: PipelineStageActionsProps) {
    const router = useRouter();
    const handleDelete = async () => {
        if (stage.leadCount > 0) {
            alert(`No se puede eliminar la etapa "${stage.name}" porque tiene ${stage.leadCount} leads asignados.`);
            return;
        }

        if (confirm(`¿Estás seguro de que quieres eliminar la etapa "${stage.name}"?`)) {
            const result = await deletePipelineStage(stage.id);
            if (result.success) {
                router.refresh();
            } else {
                alert(result.error);
            }
        }
    };

    const handleToggleStatus = async () => {
        const result = await togglePipelineStageStatus(stage.id);
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error);
        }
    };

    return (
        <div className="flex items-center space-x-1">
            {onMoveUp && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    title="Mover arriba"
                    onClick={onMoveUp}
                    disabled={!canMoveUp}
                >
                    <ArrowUp className="h-3 w-3" />
                </Button>
            )}
            {onMoveDown && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    title="Mover abajo"
                    onClick={onMoveDown}
                    disabled={!canMoveDown}
                >
                    <ArrowDown className="h-3 w-3" />
                </Button>
            )}
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                title={stage.isActive ? "Desactivar" : "Activar"}
                onClick={handleToggleStatus}
            >
                {stage.isActive ? (
                    <Eye className="h-3 w-3" />
                ) : (
                    <EyeOff className="h-3 w-3" />
                )}
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                title="Editar"
                onClick={() => onEdit(stage)}
            >
                <Edit className="h-3 w-3" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-zinc-700"
                title="Eliminar"
                onClick={handleDelete}
            >
                <Trash2 className="h-3 w-3" />
            </Button>
        </div>
    );
}
