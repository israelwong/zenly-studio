'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Megaphone, Plus, ExternalLink, BarChart3, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import {
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle,
    ZenCardDescription,
    ZenButton,
    ZenBadge,
    ZenConfirmModal
} from '@/components/ui/zen';
import { listOffers, deleteOffer } from '@/lib/actions/studio/offers/offers.actions';
import { getOfferStats } from '@/lib/actions/studio/offers/offer-stats.actions';
import type { StudioOffer } from '@/types/offers';
import { toast } from 'sonner';

export default function OfertasPage() {
    const params = useParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [offers, setOffers] = useState<StudioOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [stats, setStats] = useState<Record<string, {
        total_visits: number;
        total_submissions: number;
        conversion_rate: number;
    }>>({});

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
                                total_visits: statsResult.data.total_landing_visits + statsResult.data.total_leadform_visits,
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
        try {
            const result = await deleteOffer(offerToDelete, studioSlug);

            if (result.success) {
                toast.success('Oferta eliminada exitosamente');
                setShowDeleteModal(false);
                setOfferToDelete(null);
                await loadOffers();
            } else {
                toast.error(result.error || 'Error al eliminar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error eliminando oferta:', error);
            toast.error('Error al eliminar la oferta');
        } finally {
            setIsDeleting(false);
        }
    };

    const getPublicUrl = (offer: StudioOffer) => {
        return `/${studioSlug}/offer/${offer.id}`;
    };

    const getLeadformUrl = (offer: StudioOffer) => {
        return `/${studioSlug}/offer/${offer.id}/leadform`;
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
                                    Gestiona tus ofertas, landing pages y campañas publicitarias
                                </ZenCardDescription>
                            </div>
                        </div>
                        <ZenButton onClick={() => router.push(`/${studioSlug}/studio/commercial/ofertas/nuevo`)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Oferta
                        </ZenButton>
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
                        <div className="space-y-4">
                            {offers.map((offer) => {
                                const offerStats = stats[offer.id] || {
                                    total_visits: 0,
                                    total_submissions: 0,
                                    conversion_rate: 0,
                                };

                                return (
                                    <div
                                        key={offer.id}
                                        className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-zinc-100 truncate">
                                                        {offer.name}
                                                    </h3>
                                                    {!offer.is_active && (
                                                        <ZenBadge variant="secondary" size="sm">
                                                            Inactiva
                                                        </ZenBadge>
                                                    )}
                                                    <ZenBadge
                                                        variant={offer.objective === 'presencial' ? 'success' : 'info'}
                                                        size="sm"
                                                    >
                                                        {offer.objective === 'presencial' ? 'Presencial' : 'Virtual'}
                                                    </ZenBadge>
                                                </div>

                                                {offer.description && (
                                                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                                                        {offer.description}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <Eye className="h-4 w-4" />
                                                        <span>{offerStats.total_visits} visitas</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <BarChart3 className="h-4 w-4" />
                                                        <span>{offerStats.total_submissions} conversiones</span>
                                                    </div>
                                                    {offerStats.total_visits > 0 && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-emerald-400">
                                                                {offerStats.conversion_rate.toFixed(1)}% tasa de conversión
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
                                                    <span>Slug: {offer.slug}</span>
                                                    <span>•</span>
                                                    <span>
                                                        Creada: {new Date(offer.created_at).toLocaleDateString('es-MX')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <ZenButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(getPublicUrl(offer), '_blank')}
                                                    title="Ver landing page pública"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </ZenButton>
                                                <ZenButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/${studioSlug}/studio/commercial/ofertas/${offer.id}/estadisticas`)}
                                                    title="Ver estadísticas"
                                                >
                                                    <BarChart3 className="h-4 w-4" />
                                                </ZenButton>
                                                <ZenButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/${studioSlug}/studio/commercial/ofertas/${offer.id}/editar`)}
                                                    title="Editar oferta"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </ZenButton>
                                                <ZenButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setOfferToDelete(offer.id);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-950/20 border-red-800/50"
                                                    title="Eliminar oferta"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </ZenButton>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
                description="¿Estás seguro de que quieres eliminar esta oferta? Esta acción no se puede deshacer y se eliminarán todas las estadísticas asociadas."
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeleting}
            />
        </div>
    );
}
