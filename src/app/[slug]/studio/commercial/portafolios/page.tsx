'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FolderOpen, Plus } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle,
    ZenCardDescription,
    ZenButton,
    ZenConfirmModal,
} from '@/components/ui/zen';
import {
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
} from '@dnd-kit/sortable';
import { 
    getStudioPortfoliosBySlug, 
    deleteStudioPortfolio, 
    duplicatePortfolio, 
    reorderPortfolios,
    toggleStudioPortfolioPublish 
} from '@/lib/actions/studio/portfolios/portfolios.actions';
import { archivePortfolio } from '@/lib/actions/studio/archive.actions';
import type { StudioPortfolio } from '@/types/studio-portfolios';
import { toast } from 'sonner';
import { PortfoliosTable } from './components/PortfoliosTable';

export default function PortafoliosPage() {
    const params = useParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [portfolios, setPortfolios] = useState<StudioPortfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [portfolioToDelete, setPortfolioToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [duplicatingPortfolioId, setDuplicatingPortfolioId] = useState<string | null>(null);
    const [isReordering, setIsReordering] = useState(false);

    usePageTitle('Portafolios');

    useEffect(() => {
        loadPortfolios();
    }, [studioSlug]);

    const loadPortfolios = async () => {
        try {
            setLoading(true);
            const result = await getStudioPortfoliosBySlug(studioSlug, undefined);

            if (result.success && result.data) {
                // Ordenar por order
                const sortedPortfolios = [...result.data].sort((a, b) => a.order - b.order);
                setPortfolios(sortedPortfolios);
            } else {
                toast.error(result.error || 'Error al cargar los portafolios');
            }
        } catch (error) {
            console.error('[PortafoliosPage] Error:', error);
            toast.error('Error al cargar los portafolios');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!portfolioToDelete) return;

        setIsDeleting(true);

        const deletedPortfolioId = portfolioToDelete;

        try {
            const result = await deleteStudioPortfolio(deletedPortfolioId);

            if (result.success) {
                setPortfolios(prev => prev.filter(p => p.id !== deletedPortfolioId));
                setShowDeleteModal(false);
                setPortfolioToDelete(null);
                toast.success('Portafolio eliminado exitosamente');
            } else {
                setShowDeleteModal(false);
                setPortfolioToDelete(null);
                toast.error(result.error || 'Error al eliminar el portafolio');
            }
        } catch (error) {
            console.error('[PortafoliosPage] Error eliminando portafolio:', error);
            setShowDeleteModal(false);
            setPortfolioToDelete(null);
            toast.error('Error al eliminar el portafolio');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (portfolioId: string) => {
        router.push(`/${studioSlug}/studio/commercial/portafolios/${portfolioId}`);
    };

    const handleDuplicate = async (portfolioId: string) => {
        setDuplicatingPortfolioId(portfolioId);
        try {
            const result = await duplicatePortfolio(portfolioId, studioSlug);

            if (result.success && result.data) {
                const newPortfolio = result.data;
                setPortfolios(prev => [...prev, newPortfolio].sort((a, b) => a.order - b.order));
                toast.success('Portafolio duplicado exitosamente');
            } else {
                toast.error(result.error || 'Error al duplicar el portafolio');
            }
        } catch (error) {
            console.error('[PortafoliosPage] Error duplicando portafolio:', error);
            toast.error('Error al duplicar el portafolio');
        } finally {
            setDuplicatingPortfolioId(null);
        }
    };

    const handleDeleteClick = (portfolioId: string) => {
        setPortfolioToDelete(portfolioId);
        setShowDeleteModal(true);
    };

    const handleArchive = async (portfolioId: string) => {
        const portfolio = portfolios.find(p => p.id === portfolioId);

        const previousIsPublished = portfolio?.is_published;
        setPortfolios(prev => prev.map(p =>
            p.id === portfolioId ? { ...p, is_published: false } : p
        ));

        try {
            const result = await archivePortfolio(portfolioId, studioSlug);

            if (result.success) {
                toast.success('Portafolio archivado exitosamente');
            } else {
                setPortfolios(prev => prev.map(p =>
                    p.id === portfolioId ? { ...p, is_published: previousIsPublished ?? false } : p
                ));
                toast.error(result.error || 'Error al archivar el portafolio');
            }
        } catch (error) {
            console.error('[PortafoliosPage] Error archivando portafolio:', error);
            setPortfolios(prev => prev.map(p =>
                p.id === portfolioId ? { ...p, is_published: previousIsPublished ?? false } : p
            ));
            toast.error('Error al archivar el portafolio');
        }
    };

    const handleToggleActive = async (portfolioId: string, isActive: boolean) => {
        const portfolio = portfolios.find(p => p.id === portfolioId);

        const previousIsPublished = portfolio?.is_published;
        setPortfolios(prev => prev.map(p =>
            p.id === portfolioId ? { ...p, is_published: isActive } : p
        ));

        try {
            const result = await toggleStudioPortfolioPublish(portfolioId);

            if (result.success) {
                toast.success(isActive ? 'Portafolio publicado' : 'Portafolio despublicado');
            } else {
                setPortfolios(prev => prev.map(p =>
                    p.id === portfolioId ? { ...p, is_published: previousIsPublished ?? false } : p
                ));
                toast.error(result.error || 'Error al actualizar el portafolio');
            }
        } catch (error) {
            console.error('[PortafoliosPage] Error actualizando portafolio:', error);
            setPortfolios(prev => prev.map(p =>
                p.id === portfolioId ? { ...p, is_published: previousIsPublished ?? false } : p
            ));
            toast.error('Error al actualizar el portafolio');
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (isReordering || !over || active.id === over.id) {
            return;
        }

        const oldIndex = portfolios.findIndex((portfolio) => portfolio.id === active.id);
        const newIndex = portfolios.findIndex((portfolio) => portfolio.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const newPortfolios = arrayMove(portfolios, oldIndex, newIndex);

        try {
            setIsReordering(true);
            setPortfolios(newPortfolios);

            const portfolioIds = newPortfolios.map((portfolio) => portfolio.id);
            const result = await reorderPortfolios(studioSlug, portfolioIds);

            if (!result.success) {
                toast.error(result.error || 'Error al reordenar los portafolios');
                await loadPortfolios();
            }
        } catch (error) {
            console.error('[PortafoliosPage] Error reordenando portafolios:', error);
            toast.error('Error al reordenar los portafolios');
            await loadPortfolios();
        } finally {
            setIsReordering(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <FolderOpen className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Portafolios</ZenCardTitle>
                                <ZenCardDescription>
                                    Gestiona tus proyectos y trabajos destacados
                                </ZenCardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ZenButton onClick={() => router.push(`/${studioSlug}/studio/commercial/portafolios/nuevo`)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Portafolio
                            </ZenButton>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    {loading ? (
                        <div className="rounded-lg border border-zinc-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <div className="min-w-[1000px]">
                                    {/* Header skeleton */}
                                    <div className="border-b border-zinc-800">
                                        <div className="grid grid-cols-7 gap-4 px-4 py-4">
                                            <div className="h-4 w-8 bg-zinc-800/50 rounded animate-pulse"></div>
                                            <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse"></div>
                                            <div className="h-4 w-32 bg-zinc-800/50 rounded animate-pulse"></div>
                                            <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                            <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse"></div>
                                            <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                            <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                    {/* Rows skeleton */}
                                    <div className="divide-y divide-zinc-800">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div key={i} className="grid grid-cols-7 gap-4 px-4 py-4">
                                                <div className="flex items-center justify-center">
                                                    <div className="h-4 w-4 bg-zinc-800/50 rounded animate-pulse"></div>
                                                </div>
                                                <div className="flex items-center justify-center">
                                                    <div className="h-5 w-11 bg-zinc-800/50 rounded-full animate-pulse"></div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-4 w-32 bg-zinc-800/50 rounded animate-pulse"></div>
                                                        <div className="h-3 w-48 bg-zinc-800/50 rounded animate-pulse"></div>
                                                        <div className="h-3 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse"></div>
                                                </div>
                                                <div className="flex items-center justify-center">
                                                    <div className="h-4 w-12 bg-zinc-800/50 rounded animate-pulse"></div>
                                                </div>
                                                <div className="flex items-center">
                                                    <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                                </div>
                                                <div className="flex items-center">
                                                    <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : portfolios.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="mb-4">
                                <FolderOpen className="h-16 w-16 text-zinc-600 mx-auto" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                No hay portafolios creados
                            </h3>
                            <p className="text-zinc-400 max-w-md mx-auto mb-6">
                                Crea tu primer portafolio para mostrar tus mejores trabajos y proyectos a tus clientes.
                            </p>
                            <ZenButton onClick={() => router.push(`/${studioSlug}/studio/commercial/portafolios/nuevo`)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Primer Portafolio
                            </ZenButton>
                        </div>
                    ) : (
                        <PortfoliosTable
                            portfolios={portfolios}
                            studioSlug={studioSlug}
                            onEdit={handleEdit}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDeleteClick}
                            onArchive={handleArchive}
                            onToggleActive={handleToggleActive}
                            onDragEnd={handleDragEnd}
                            duplicatingPortfolioId={duplicatingPortfolioId}
                            isReordering={isReordering}
                        />
                    )}
                </ZenCardContent>
            </ZenCard>

            <ZenConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    if (!isDeleting) {
                        setShowDeleteModal(false);
                        setPortfolioToDelete(null);
                    }
                }}
                onConfirm={handleDelete}
                title="Eliminar Portafolio"
                description="¿Estás seguro de que quieres eliminar este portafolio? Esta acción no se puede deshacer y se eliminará todo el contenido asociado."
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeleting}
            />
        </div>
    );
}
