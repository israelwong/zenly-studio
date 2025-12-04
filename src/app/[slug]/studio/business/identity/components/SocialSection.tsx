'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton } from '@/components/ui/zen';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Plus, Share2, GripVertical } from 'lucide-react';
import { RedSocialItem } from './RedSocialItem';
import { RedSocialModal } from './RedSocialModal';
import { Plataforma, RedSocial } from '../types';
import { IdentidadData } from '../../identidad/types';
import { toast } from 'sonner';
import {
    obtenerRedesSocialesStudio,
    obtenerPlataformasDisponibles,
    crearRedSocial,
    actualizarRedSocial,
    eliminarRedSocial,
    reordenarRedesSociales,
    toggleRedSocialEstado
} from '@/lib/actions/studio/profile/identidad';
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

interface SocialSectionProps {
    studioSlug: string;
    onLocalUpdate?: (data: Partial<IdentidadData>) => void;
    redesSociales?: unknown[];
    loading?: boolean;
}

export function SocialSection({ studioSlug, onLocalUpdate, loading: initialLoading = false, onDataChange }: SocialSectionProps) {
    const [redes, setRedes] = useState<RedSocial[]>([]);
    const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRed, setEditingRed] = useState<RedSocial | null>(null);
    const [saving, setSaving] = useState(false);

    // Cargar datos iniciales
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                // Cargar redes sociales del studio
                const redesResult = await obtenerRedesSocialesStudio(studioSlug);
                if (Array.isArray(redesResult)) {
                    const redesFormateadas = redesResult.map((red) => ({
                        id: red.id,
                        studio_id: red.studio_id,
                        plataformaId: red.platform_id,
                        url: red.url,
                        activo: red.is_active,
                        createdAt: red.created_at,
                        updatedAt: red.updated_at,
                        plataforma: red.platform ? {
                            id: red.platform.id,
                            name: red.platform.name,
                            slug: red.platform.slug,
                            description: red.platform.description,
                            color: red.platform.color,
                            icon: red.platform.icon,
                            baseUrl: red.platform.base_url,
                            order: red.platform.order,
                            isActive: red.platform.is_active,
                            createdAt: red.platform.created_at,
                            updatedAt: red.platform.updated_at
                        } : null
                    }));
                    setRedes(redesFormateadas);

                    // Enviar datos iniciales al FooterPreview (solo redes activas)
                    const redesActivas = redesFormateadas
                        .filter(red => red.activo)
                        .map(red => ({
                            plataforma: red.plataforma?.slug || red.plataformaId || 'unknown',
                            url: red.url
                        }));
                    onLocalUpdate?.({ redes_sociales: redesActivas } as Partial<IdentidadData>);
                }

                // Cargar plataformas disponibles
                const plataformasResult = await obtenerPlataformasDisponibles();
                if (Array.isArray(plataformasResult)) {
                    const plataformasFormateadas = plataformasResult.map((plataforma) => ({
                        id: plataforma.id,
                        name: plataforma.name,
                        slug: plataforma.slug,
                        description: plataforma.description,
                        color: plataforma.color,
                        icon: plataforma.icon,
                        baseUrl: plataforma.base_url,
                        order: plataforma.order,
                        isActive: plataforma.is_active,
                        createdAt: plataforma.created_at,
                        updatedAt: plataforma.updated_at
                    }));
                    setPlataformas(plataformasFormateadas);
                }
            } catch (error) {
                console.error('Error loading redes sociales:', error);
                toast.error('Error al cargar las redes sociales');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studioSlug, onLocalUpdate]);


    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = redes.findIndex(item => item.id === active.id);
            const newIndex = redes.findIndex(item => item.id === over?.id);

            const newOrder = arrayMove(redes, oldIndex, newIndex);
            setRedes(newOrder); // Optimistic update

            try {
                // Reordenar en backend
                const redesParaReordenar = newOrder.map((red, index) => ({
                    id: red.id,
                    order: index
                }));

                const result = await reordenarRedesSociales(studioSlug, redesParaReordenar);
                if (result.success) {
                    toast.success("Orden de redes sociales actualizado");
                    // Convertir a formato esperado por FooterPreview
                    const redesFormateadas = newOrder
                        .filter(red => red.activo)
                        .map(red => ({
                            plataforma: red.plataforma?.slug || red.plataformaId || 'unknown',
                            url: red.url
                        }));
                    onLocalUpdate?.({ redes_sociales: redesFormateadas } as Partial<IdentidadData>);
                } else {
                    throw new Error(result.error);
                }
            } catch {
                toast.error("Error al reordenar redes sociales");
                setRedes(redes); // Revert on error
            }
        }
    };


    const handleAddRed = () => {
        setEditingRed(null);
        setShowModal(true);
    };

    const handleEditRed = (red: RedSocial) => {
        setEditingRed(red);
        setShowModal(true);
    };

    const handleDeleteRed = async (id: string) => {
        try {
            const result = await eliminarRedSocial(studioSlug, id);
            if (result.success) {
                const updatedRedes = redes.filter(red => red.id !== id);
                setRedes(updatedRedes);
                toast.success("Red social eliminada");
                await onDataChange?.();
                // Convertir a formato esperado por FooterPreview
                const redesFormateadas = updatedRedes.map(red => ({
                    plataforma: red.plataforma?.slug || red.plataformaId || 'unknown',
                    url: red.url
                }));
                onLocalUpdate({ redes_sociales: redesFormateadas } as Partial<IdentidadData>);
            } else {
                throw new Error(result.error);
            }
        } catch {
            toast.error("Error al eliminar la red social");
        }
    };

    const handleToggleActive = async (id: string, activo: boolean) => {
        try {
            const result = await toggleRedSocialEstado(studioSlug, id, activo);
            if (result.success) {
                const updatedRedes = redes.map(red =>
                    red.id === id ? { ...red, activo } : red
                );
                setRedes(updatedRedes);
                toast.success(activo ? "Red social activada" : "Red social desactivada");
                // Convertir a formato esperado por FooterPreview
                const redesFormateadas = updatedRedes.map(red => ({
                    plataforma: red.plataforma?.slug || red.plataformaId || 'unknown',
                    url: red.url
                }));
                onLocalUpdate({ redes_sociales: redesFormateadas } as Partial<IdentidadData>);
            } else {
                throw new Error(result.error);
            }
        } catch {
            toast.error("Error al actualizar la red social");
        }
    };

    const handleSaveRed = async (data: { plataformaId: string; url: string }) => {
        try {
            setSaving(true);

            if (editingRed) {
                // Editar red existente
                const result = await actualizarRedSocial(studioSlug, editingRed.id, {
                    platform_id: data.plataformaId,
                    url: data.url
                });

                if (result.success) {
                    const updatedRedes = redes.map(red =>
                        red.id === editingRed.id
                            ? { ...red, plataformaId: data.plataformaId, url: data.url }
                            : red
                    );
                    setRedes(updatedRedes);
                    toast.success("Red social actualizada");
                    await onDataChange?.();
                    // Convertir a formato esperado por FooterPreview
                    const redesFormateadas = updatedRedes
                        .filter(red => red.activo)
                        .map(red => ({
                            plataforma: red.plataforma?.slug || red.plataformaId || 'unknown',
                            url: red.url
                        }));
                    onLocalUpdate?.({ redes_sociales: redesFormateadas } as Partial<IdentidadData>);
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Agregar nueva red
                const result = await crearRedSocial(studioSlug, {
                    platform_id: data.plataformaId,
                    url: data.url
                });

                if (result.success && result.data) {
                    const nuevaRed: RedSocial = {
                        id: result.data.id,
                        studio_id: result.data.studio_id,
                        plataformaId: result.data.platform_id,
                        url: result.data.url,
                        activo: result.data.is_active,
                        createdAt: result.data.created_at,
                        updatedAt: result.data.updated_at,
                        plataforma: result.data.platform ? {
                            id: result.data.platform.id,
                            name: result.data.platform.name,
                            slug: result.data.platform.slug,
                            description: result.data.platform.description,
                            color: result.data.platform.color,
                            icon: result.data.platform.icon,
                            baseUrl: result.data.platform.base_url,
                            order: result.data.platform.order,
                            isActive: result.data.platform.is_active,
                            createdAt: result.data.platform.created_at,
                            updatedAt: result.data.platform.updated_at
                        } : null
                    };
                    const updatedRedes = [...redes, nuevaRed];
                    setRedes(updatedRedes);
                    toast.success("Red social agregada");
                    await onDataChange?.();
                    // Convertir a formato esperado por FooterPreview
                    const redesFormateadas = updatedRedes
                        .filter(red => red.activo)
                        .map(red => ({
                            plataforma: red.plataforma?.slug || red.plataformaId || 'unknown',
                            url: red.url
                        }));
                    onLocalUpdate?.({ redes_sociales: redesFormateadas } as Partial<IdentidadData>);
                } else {
                    throw new Error(result.error || 'Error desconocido');
                }
            }

            setShowModal(false);
            setEditingRed(null);
        } catch {
            toast.error("Error al guardar la red social");
        } finally {
            setSaving(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingRed(null);
    };

    return (
        <ZenCard variant="default" padding="none">
            <ZenCardHeader className="border-b border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Share2 className="h-5 w-5 text-blue-400" />
                        <ZenCardTitle>Redes Sociales</ZenCardTitle>
                    </div>
                    <ZenButton
                        variant="outline"
                        size="sm"
                        onClick={handleAddRed}
                        disabled={plataformas.filter(p => p.isActive).length === 0}
                        title={plataformas.filter(p => p.isActive).length === 0 ? 'No hay plataformas disponibles' : ''}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Red Social
                    </ZenButton>
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-6">
                {initialLoading || loading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse border border-zinc-800 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 bg-zinc-700/50 rounded-full"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-32 bg-zinc-700/50 rounded"></div>
                                            <div className="h-3 w-48 bg-zinc-700/50 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-5 bg-zinc-700/50 rounded-full"></div>
                                        <div className="w-8 h-8 bg-zinc-700/50 rounded"></div>
                                        <div className="w-8 h-8 bg-zinc-700/50 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : redes.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-zinc-800 rounded-full flex items-center justify-center">
                            <Share2 className="h-8 w-8 text-zinc-500" />
                        </div>
                        <p className="text-zinc-400 mb-2">No hay redes sociales configuradas</p>
                        <p className="text-zinc-500 text-sm mb-4">
                            Agrega enlaces a tus redes sociales para que los clientes puedan encontrarte
                        </p>
                        <div className="text-xs text-zinc-600">
                            Plataformas disponibles: {plataformas.filter(p => p.isActive).length} de {plataformas.length}
                        </div>
                        {plataformas.filter(p => p.isActive).length === 0 && (
                            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                                <p className="text-yellow-400 text-sm">
                                    ⚠️ No hay plataformas de redes sociales configuradas en el sistema.
                                </p>
                                <p className="text-yellow-300 text-xs mt-1">
                                    Contacta al administrador para configurar las plataformas disponibles.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={redes.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3">
                                {redes.map((red) => {
                                    return (
                                        <RedSocialItem
                                            key={red.id}
                                            red={red}
                                            plataforma={red.plataforma || null}
                                            onEdit={handleEditRed}
                                            onDelete={handleDeleteRed}
                                            onToggleActive={handleToggleActive}
                                        />
                                    );
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}

                {/* Información adicional */}
                <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <GripVertical className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-white font-medium text-sm">Información sobre redes sociales</h4>
                            <div className="text-xs text-zinc-400 space-y-1">
                                <p>• Arrastra las redes sociales para reordenarlas según tu preferencia</p>
                                <p>• Las redes activas aparecerán en tu perfil público</p>
                                <p>• Puedes configurar diferentes redes para cada plataforma</p>
                                <p>• El orden se guarda automáticamente</p>
                            </div>
                        </div>
                    </div>
                </div>
            </ZenCardContent>

            {/* Modal para agregar/editar redes sociales */}
            <RedSocialModal
                isOpen={showModal}
                onClose={handleCloseModal}
                onSave={handleSaveRed}
                plataformas={plataformas}
                editingRed={editingRed}
                loading={saving}
            />
        </ZenCard>
    );
}
