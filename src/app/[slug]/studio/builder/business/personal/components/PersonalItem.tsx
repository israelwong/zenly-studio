'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Edit, Trash2, Mail, Phone, User, GripVertical } from 'lucide-react';
import {
    ZenButton,
    ZenCard,
    ZenCardContent
} from '@/components/ui/zen';
import { Switch } from '@/components/ui/shadcn/switch';
import {
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PersonalData } from '@/lib/actions/schemas/personal-schemas';

interface PersonalItemProps {
    personal: PersonalData;
    onEdit: (personal: PersonalData) => void;
    onDelete: (personalId: string) => void;
    onToggleStatus?: (personalId: string, newStatus: boolean) => void;
}

export function PersonalItem({
    personal,
    onEdit,
    onDelete,
    onToggleStatus
}: PersonalItemProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: personal.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleDelete = async () => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar a "${personal.nombre}"?`)) {
            setIsDeleting(true);
            try {
                await onDelete(personal.id);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleToggleStatus = async (checked: boolean) => {
        if (!onToggleStatus) return;

        setIsTogglingStatus(true);
        try {
            await onToggleStatus(personal.id, checked);
        } finally {
            setIsTogglingStatus(false);
        }
    };

    return (
        <div ref={setNodeRef} style={style}>
            <ZenCard className="hover:bg-zinc-800/50 transition-colors">
                <ZenCardContent className="p-4">
                    <div className="flex items-center justify-between">
                        {/* Drag Handle */}
                        <div
                            className="flex-shrink-0 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 transition-colors mr-3"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>

                        <div className="flex items-center gap-3 flex-1">
                            {/* Avatar/Icono */}
                            <div className="flex-shrink-0">
                                {personal.platformUser?.avatarUrl ? (
                                    <Image
                                        src={personal.platformUser.avatarUrl}
                                        alt={personal.nombre}
                                        width={40}
                                        height={40}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                                        <User className="h-5 w-5 text-zinc-400" />
                                    </div>
                                )}
                            </div>

                            {/* Información principal */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white truncate mb-1">
                                    {personal.nombre}
                                </h4>

                                {/* Información de contacto */}
                                <div className="flex items-center gap-4 text-sm text-zinc-400">
                                    {personal.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate">{personal.email}</span>
                                        </div>
                                    )}

                                    {personal.telefono && (
                                        <div className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            <span>{personal.telefono}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Switch de estatus y acciones */}
                        <div className="flex items-center gap-3 ml-4">
                            {/* Switch de estatus */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-400">
                                    {personal.status === 'activo' ? 'Activo' : 'Inactivo'}
                                </span>
                                <Switch
                                    checked={personal.status === 'activo'}
                                    onCheckedChange={handleToggleStatus}
                                    disabled={isTogglingStatus}
                                />
                            </div>

                            {/* Botones de acción */}
                            <div className="flex items-center gap-1">
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEdit(personal)}
                                    className="h-8 w-8 p-0"
                                >
                                    <Edit className="h-3 w-3" />
                                </ZenButton>

                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </ZenButton>
                            </div>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}