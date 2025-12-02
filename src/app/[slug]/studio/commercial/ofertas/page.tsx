'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Megaphone, Plus, FileText, Copy, Trash2, Eye } from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/shadcn/table';
import { listOffers, deleteOffer, duplicateOffer } from '@/lib/actions/studio/offers/offers.actions';
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
    const [duplicatingOfferId, setDuplicatingOfferId] = useState<string | null>(null);
    const [stats, setStats] = useState<Record<string, {
        total_visits: number;
        total_leadform_visits: number;
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

    const handleDuplicate = async (offerId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDuplicatingOfferId(offerId);
        try {
            const result = await duplicateOffer(offerId, studioSlug);

            if (result.success) {
                toast.success('Oferta duplicada exitosamente');
                await loadOffers();
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

    const handleLeadformClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        toast.info('Funcionalidad de Leadform pendiente de implementación');
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
                        <div className="flex items-center gap-2">
                            <ZenButton
                                variant="outline"
                                onClick={handleLeadformClick}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Leadform
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
                        <div className="rounded-lg border border-zinc-800 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-zinc-800 hover:bg-transparent">
                                        <TableHead className="text-zinc-400 font-medium">Oferta</TableHead>
                                        <TableHead className="text-zinc-400 font-medium text-center">Visitas</TableHead>
                                        <TableHead className="text-zinc-400 font-medium text-center">Carrito Olvidado</TableHead>
                                        <TableHead className="text-zinc-400 font-medium text-center">Conversiones</TableHead>
                                        <TableHead className="text-zinc-400 font-medium text-center">Estatus</TableHead>
                                        <TableHead className="text-zinc-400 font-medium text-center w-24">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {offers.map((offer) => {
                                        const offerStats = stats[offer.id] || {
                                            total_visits: 0,
                                            total_leadform_visits: 0,
                                            total_submissions: 0,
                                            conversion_rate: 0,
                                        };

                                        const carritoOlvidado = Math.max(0, offerStats.total_leadform_visits - offerStats.total_submissions);

                                        return (
                                            <TableRow
                                                key={offer.id}
                                                className="border-zinc-800 cursor-pointer hover:bg-zinc-900/50 transition-colors"
                                                onClick={() => router.push(`/${studioSlug}/studio/commercial/ofertas/${offer.id}`)}
                                            >
                                                <TableCell className="font-medium text-zinc-100">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{offer.name}</span>
                                                        {offer.description && (
                                                            <span className="text-xs text-zinc-500 line-clamp-1">
                                                                {offer.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-zinc-300">
                                                    {offerStats.total_visits}
                                                </TableCell>
                                                <TableCell className="text-center text-zinc-300">
                                                    {carritoOlvidado}
                                                </TableCell>
                                                <TableCell className="text-center text-zinc-300">
                                                    {offerStats.total_submissions}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <ZenBadge
                                                        variant={offer.is_active ? 'success' : 'secondary'}
                                                        size="sm"
                                                    >
                                                        {offer.is_active ? 'Activa' : 'Inactiva'}
                                                    </ZenBadge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <ZenButton
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => handleDuplicate(offer.id, e)}
                                                            disabled={duplicatingOfferId === offer.id}
                                                            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200"
                                                            title="Duplicar oferta"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </ZenButton>
                                                        <ZenButton
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOfferToDelete(offer.id);
                                                                setShowDeleteModal(true);
                                                            }}
                                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                                                            title="Eliminar oferta"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </ZenButton>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
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
