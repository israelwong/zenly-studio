'use client';

import React, { useState } from 'react';
import { ZenButton } from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';
import { Edit, Trash2, ExternalLink, GripVertical } from 'lucide-react';
import { RedSocialIcon } from '@/components/ui/icons/RedSocialIcon';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { Plataforma, RedSocial } from '../types';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RedSocialItemProps {
    red: RedSocial;
    plataforma: Plataforma | null;
    onEdit: (red: RedSocial) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, activo: boolean) => void;
}

export function RedSocialItem({
    red,
    plataforma,
    onEdit,
    onDelete,
    onToggleActive
}: RedSocialItemProps) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: red.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleToggleRed = async () => {
        await onToggleActive(red.id, !red.activo);
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await onDelete(red.id);
            setShowDeleteModal(false);
        } catch {
            // El error ya se maneja en la función padre
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
    };

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const urlIsValid = red.url && isValidUrl(red.url);

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                className={`p-3 bg-zinc-900/30 rounded-lg border transition-all duration-200 hover:bg-zinc-900/50 ${red.activo
                    ? 'border-zinc-700 hover:border-zinc-600'
                    : 'border-zinc-800 opacity-60 hover:opacity-80'
                    } ${isDragging ? 'shadow-lg border-blue-500' : ''}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            {/* Handle de drag */}
                            <div
                                {...attributes}
                                {...listeners}
                                className="flex-shrink-0 p-1.5 cursor-grab hover:bg-zinc-800 rounded-md transition-colors group"
                                title="Arrastrar para reordenar"
                            >
                                <GripVertical className="h-3 w-3 text-zinc-500 group-hover:text-zinc-300" />
                            </div>

                            {/* Ícono de la plataforma */}
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: plataforma?.color || '#6B7280' }}
                            >
                                <RedSocialIcon
                                    icono={plataforma?.icon || 'default'}
                                    className="h-4 w-4 text-white"
                                />
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-white font-medium text-sm">
                                        {plataforma?.name || 'Plataforma desconocida'}
                                    </p>
                                    {/* Solo un indicador sutil de estado */}
                                    <div className={`w-1.5 h-1.5 rounded-full ${red.activo ? 'bg-green-400' : 'bg-zinc-500'}`} />
                                </div>
                                <p className="text-zinc-400 text-xs truncate max-w-xs">
                                    {red.url || 'Sin URL configurada'}
                                </p>
                                {red.url && !urlIsValid && (
                                    <p className="text-xs text-red-400 mt-1">
                                        URL inválida
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Switch de activo/inactivo - más compacto */}
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={red.activo}
                                onCheckedChange={handleToggleRed}
                                className="data-[state=checked]:bg-green-600"
                            />
                        </div>

                        {/* Botón de visitar */}
                        <ZenButton
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(red.url, '_blank')}
                            disabled={!red.activo || !red.url || !urlIsValid}
                            className="h-7 px-2 border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-500 transition-colors text-xs"
                            title="Visitar enlace"
                        >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Visitar
                        </ZenButton>

                        {/* Botones de acción - colores más sutiles */}
                        <div className="flex items-center space-x-1">
                            {/* Botón de editar */}
                            <ZenButton
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(red)}
                                className="h-7 w-7 p-0 border-zinc-600 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
                                title="Editar red social"
                            >
                                <Edit className="h-3 w-3" />
                            </ZenButton>

                            {/* Botón de eliminar */}
                            <ZenButton
                                variant="outline"
                                size="sm"
                                onClick={handleDeleteClick}
                                className="h-7 w-7 p-0 border-zinc-600 text-zinc-400 hover:bg-red-900/20 hover:border-red-600 hover:text-red-400 transition-colors"
                                title="Eliminar red social"
                            >
                                <Trash2 className="h-3 w-3" />
                            </ZenButton>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de confirmación de eliminación */}
            <ZenConfirmModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Eliminar red social"
                description={`¿Estás seguro de que quieres eliminar ${plataforma?.name || 'esta red social'}? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={deleting}
            />
        </>
    );
}
