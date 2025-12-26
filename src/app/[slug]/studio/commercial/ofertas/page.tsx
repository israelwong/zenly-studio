'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Megaphone, Plus } from 'lucide-react';
import {
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle,
    ZenCardDescription,
    ZenButton,
    ZenConfirmModal,
} from '@/components/ui/zen';
import { TipoEventoManagementModal } from '@/components/shared/tipos-evento/TipoEventoManagementModal';
import {
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
} from '@dnd-kit/sortable';
import { listOffers, deleteOffer, duplicateOffer, reorderOffers, updateOffer, archiveOffer } from '@/lib/actions/studio/offers/offers.actions';
import { getOfferStats } from '@/lib/actions/studio/offers/offer-stats.actions';
import type { StudioOffer } from '@/types/offers';
import { toast } from 'sonner';
import { OffersTable } from './components/OffersTable';


export default function OfertasPage() {
    const params = useParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [offers, setOffers] = useState<StudioOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [duplicatingOfferId, setDuplicatingOfferId] = useState<string | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    const [showEventTypesModal, setShowEventTypesModal] = useState(false);
    const [stats, setStats] = useState<Record<string, {
        total_visits: number;
        total_leadform_visits: number;
        total_submissions: number;
        conversion_rate: number;
    }>>({});

    useEffect(() => {
        document.title = 'ZEN Studio - Ofertas';
    }, []);

    useEffect(() => {
        loadOffers();
    }, [studioSlug]);

    const loadOffers = async () => {
        try {
            setLoading(true);
            const result = await listOffers(studioSlug, { include_inactive: true });

            if (result.success && result.data) {
                setOffers(result.data);

                // Cargar estadísticas para cada oferta
                const statsPromises = result.data.map(async (offer) => {
                    const statsResult = await getOfferStats({
                        offer_id: offer.id,
                    });

                    if (statsResult.success && statsResult.data) {
                        return {
                            offerId: offer.id,
                            stats: {
                                total_visits: statsResult.data.total_landing_visits,
                                total_leadform_visits: statsResult.data.total_leadform_visits,
                                total_submissions: statsResult.data.total_submissions,
                                conversion_rate: statsResult.data.conversion_rate,
                            },
                        };
                    }
                    return null;
                });

                const statsResults = await Promise.all(statsPromises);
                const statsMap: Record<string, {
                    total_visits: number;
                    total_leadform_visits: number;
                    total_submissions: number;
                    conversion_rate: number;
                }> = {};

                statsResults.forEach((result) => {
                    if (result) {
                        statsMap[result.offerId] = result.stats;
                    }
                });

                setStats(statsMap);
            } else {
                toast.error(result.error || 'Error al cargar las ofertas');
            }
        } catch (error) {
            console.error('[OfertasPage] Error:', error);
            toast.error('Error al cargar las ofertas');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!offerToDelete) return;

        setIsDeleting(true);

        const deletedOfferId = offerToDelete;

        try {
            // Primero validar y eliminar en el servidor
            const result = await deleteOffer(deletedOfferId, studioSlug);

            if (result.success) {
                // Solo actualizar estado local si la eliminación fue exitosa
                setOffers(prev => prev.filter(o => o.id !== deletedOfferId));
                const prevStats = { ...stats };
                delete prevStats[deletedOfferId];
                setStats(prevStats);

                setShowDeleteModal(false);
                setOfferToDelete(null);
                toast.success('Oferta eliminada exitosamente');
            } else {
                // Si hay error, no cambiar el estado y mostrar el error
                setShowDeleteModal(false);
                setOfferToDelete(null);
                toast.error(result.error || 'Error al eliminar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error eliminando oferta:', error);
            setShowDeleteModal(false);
            setOfferToDelete(null);
            toast.error('Error al eliminar la oferta');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (offerId: string) => {
        router.push(`/${studioSlug}/studio/commercial/ofertas/${offerId}`);
    };

    const handleDuplicate = async (offerId: string) => {
        setDuplicatingOfferId(offerId);
        try {
            const result = await duplicateOffer(offerId, studioSlug);

            if (result.success && result.data) {
                // Optimistic update: agregar al estado local
                const newOffer = result.data;
                setOffers(prev => [...prev, newOffer].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ));

                // Cargar stats para la nueva oferta
                const statsResult = await getOfferStats({
                    offer_id: newOffer.id,
                });
                if (statsResult.success && statsResult.data) {
                    setStats(prev => ({
                        ...prev,
                        [newOffer.id]: {
                            total_visits: statsResult.data!.total_landing_visits,
                            total_leadform_visits: statsResult.data!.total_leadform_visits,
                            total_submissions: statsResult.data!.total_submissions,
                            conversion_rate: statsResult.data!.conversion_rate,
                        },
                    }));
                }

                toast.success('Oferta duplicada exitosamente');
            } else {
                toast.error(result.error || 'Error al duplicar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error duplicando oferta:', error);
            toast.error('Error al duplicar la oferta');
        } finally {
            setDuplicatingOfferId(null);
        }
    };

    const handleDeleteClick = (offerId: string) => {
        setOfferToDelete(offerId);
        setShowDeleteModal(true);
    };

    const handleArchive = async (offerId: string) => {
        const offer = offers.find(o => o.id === offerId);

        // Optimistic update: desactivar en estado local
        const previousIsActive = offer?.is_active;
        setOffers(prev => prev.map(o =>
            o.id === offerId ? { ...o, is_active: false } : o
        ));

        try {
            const result = await archiveOffer(offerId, studioSlug);

            if (result.success) {
                toast.success('Oferta archivada exitosamente');
            } else {
                // Revertir si falla
                setOffers(prev => prev.map(o =>
                    o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
                ));
                toast.error(result.error || 'Error al archivar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error archivando oferta:', error);
            // Revertir si falla
            setOffers(prev => prev.map(o =>
                o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
            ));
            toast.error('Error al archivar la oferta');
        }
    };

    const handleToggleActive = async (offerId: string, isActive: boolean) => {
        const offer = offers.find(o => o.id === offerId);

        if (isActive && (!offer?.landing_page || !offer.landing_page.content_blocks || offer.landing_page.content_blocks.length === 0)) {
            toast.error('Debes crear una landing page con al menos un bloque antes de activar la oferta');
            return;
        }

        // Optimistic update: actualizar estado local
        const previousIsActive = offer?.is_active;
        setOffers(prev => prev.map(o =>
            o.id === offerId ? { ...o, is_active: isActive } : o
        ));

        try {
            const result = await updateOffer(offerId, studioSlug, { id: offerId, is_active: isActive });

            if (result.success) {
                // Solo actualizar is_active, preservar todos los demás campos (incluyendo vigencia)
                setOffers(prev => prev.map(o =>
                    o.id === offerId ? { ...o, is_active: isActive } : o
                ));
                toast.success(isActive ? 'Oferta activada' : 'Oferta desactivada');
            } else {
                // Revertir si falla
                setOffers(prev => prev.map(o =>
                    o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
                ));
                console.error('[OfertasPage] Error al actualizar oferta:', result.error);
                toast.error(result.error || 'Error al actualizar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error actualizando oferta:', error);
            // Revertir si falla
            setOffers(prev => prev.map(o =>
                o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
            ));
            toast.error('Error al actualizar la oferta');
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (isReordering || !over || active.id === over.id) {
            return;
        }

        const oldIndex = offers.findIndex((offer) => offer.id === active.id);
        const newIndex = offers.findIndex((offer) => offer.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const newOffers = arrayMove(offers, oldIndex, newIndex);

        try {
            setIsReordering(true);
            setOffers(newOffers);

            const offerIds = newOffers.map((offer) => offer.id);
            const result = await reorderOffers(studioSlug, offerIds);

            if (!result.success) {
                toast.error(result.error || 'Error al reordenar las ofertas');
                await loadOffers();
            }
        } catch (error) {
            console.error('[OfertasPage] Error reordenando ofertas:', error);
            toast.error('Error al reordenar las ofertas');
            await loadOffers();
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
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                                <Megaphone className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Ofertas Comerciales</ZenCardTitle>
                                <ZenCardDescription>
                                    Gestiona tus ofertas, landing pages y formularios de captura de leads
                                </ZenCardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ZenButton
                                variant="outline"
                                size="sm"
                                onClick={() => setShowEventTypesModal(true)}
                            >
                                Gestionar tipos de evento
                            </ZenButton>
                            <ZenButton onClick={() => router.push(`/${studioSlug}/studio/commercial/ofertas/nuevo`)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nueva Oferta
                            </ZenButton>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 bg-zinc-800/50 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : offers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="mb-4">
                                <Megaphone className="h-16 w-16 text-zinc-600 mx-auto" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                No hay ofertas creadas
                            </h3>
                            <p className="text-zinc-400 max-w-md mx-auto mb-6">
                                Crea tu primera oferta comercial para comenzar a capturar leads desde tus campañas de marketing.
                            </p>
                            <ZenButton onClick={() => router.push(`/${studioSlug}/studio/commercial/ofertas/nuevo`)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Primera Oferta
                            </ZenButton>
                        </div>
                    ) : (
                        <OffersTable
                            offers={offers}
                            stats={stats}
                            studioSlug={studioSlug}
                            onEdit={handleEdit}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDeleteClick}
                            onArchive={handleArchive}
                            onToggleActive={handleToggleActive}
                            onDragEnd={handleDragEnd}
                            duplicatingOfferId={duplicatingOfferId}
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
                        setOfferToDelete(null);
                    }
                }}
                onConfirm={handleDelete}
                title="Eliminar Oferta"
                description="¿Estás seguro de que quieres eliminar esta oferta? Esta acción no se puede deshacer y se eliminarán todas las estadísticas asociadas. Si la oferta tiene promesas asociadas, no podrá ser eliminada."
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeleting}
            />

            <TipoEventoManagementModal
                isOpen={showEventTypesModal}
                onClose={() => setShowEventTypesModal(false)}
                studioSlug={studioSlug}
            />
        </div>
    );
}
