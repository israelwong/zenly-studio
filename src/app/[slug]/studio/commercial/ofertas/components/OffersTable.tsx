'use client';

import React from 'react';
import Image from 'next/image';
import { Megaphone, Copy, Trash2, GripVertical, MoreVertical, Edit, Infinity, Percent, DollarSign, Clock, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ZenButton,
    ZenBadge,
    ZenSwitch
} from '@/components/ui/zen';
import {
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuSeparator,
} from '@/components/ui/zen/overlays/ZenDropdownMenu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/shadcn/table';
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
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StudioOffer } from '@/types/offers';

interface OfferStats {
    total_visits: number;
    total_leadform_visits: number;
    total_submissions: number;
    conversion_rate: number;
}

interface SortableOfferRowProps {
    offer: StudioOffer;
    stats: OfferStats;
    studioSlug: string;
    onEdit: (offerId: string) => void;
    onDuplicate: (offerId: string) => void;
    onDelete: (offerId: string) => void;
    onArchive: (offerId: string) => void;
    onToggleActive: (offerId: string, isActive: boolean) => void;
    isDuplicating: boolean;
}

function SortableOfferRow({
    offer,
    stats,
    studioSlug,
    onEdit,
    onDuplicate,
    onDelete,
    onArchive,
    onToggleActive,
    isDuplicating,
}: SortableOfferRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: offer.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const noConvertidos = Math.max(0, stats.total_leadform_visits - stats.total_submissions);

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            className="border-zinc-800 cursor-pointer hover:bg-zinc-900/50 transition-colors group"
            onClick={() => onEdit(offer.id)}
        >
            <TableCell className="w-8 py-4 sticky left-0 bg-zinc-800 z-10 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800" onClick={(e) => e.stopPropagation()}>
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing flex items-center justify-center"
                >
                    <GripVertical className="h-4 w-4 text-zinc-500" />
                </div>
            </TableCell>
            <TableCell className="text-center py-4 px-4 w-[80px] sticky left-8 bg-zinc-800 z-10 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800" onClick={(e) => e.stopPropagation()}>
                <ZenSwitch
                    checked={offer.is_active}
                    onCheckedChange={(checked) => {
                        onToggleActive(offer.id, checked);
                    }}
                />
            </TableCell>
            <TableCell className="font-medium text-zinc-100 py-4 w-[300px] max-w-[300px] sticky left-[88px] bg-zinc-800 z-10 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800">
                <div className="flex items-center gap-2 min-w-0 max-w-full">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                        {offer.cover_media_url ? (
                            offer.cover_media_type === 'video' ? (
                                <video
                                    src={offer.cover_media_url}
                                    className="w-full h-full object-cover"
                                    muted
                                    playsInline
                                />
                            ) : (
                                <Image
                                    src={offer.cover_media_url}
                                    alt={offer.name}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                    unoptimized
                                />
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                <Megaphone className="h-4 w-4 text-zinc-600" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">
                        <span className="truncate text-sm">{offer.name}</span>
                        {offer.description ? (
                            <span className="text-xs text-zinc-500 truncate">
                                {offer.description}
                            </span>
                        ) : (
                            <span className="text-xs text-zinc-600 italic">
                                Agrega una descripción
                            </span>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                            {offer.is_permanent ? (
                                <>
                                    <Infinity className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <span className="truncate">Permanente</span>
                                </>
                            ) : (offer.has_date_range || offer.start_date || offer.end_date) && offer.start_date && offer.end_date ? (
                                <>
                                    <Clock className="h-3 w-3 text-blue-400 shrink-0" />
                                    <span className="truncate">
                                        {format(new Date(offer.start_date), 'dd MMM', { locale: es })} - {format(new Date(offer.end_date), 'dd MMM yyyy', { locale: es })}
                                    </span>
                                </>
                            ) : (
                                <span className="text-zinc-600 truncate">Sin vigencia</span>
                            )}
                        </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end">
                                <ZenDropdownMenuItem onClick={() => onEdit(offer.id)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuItem
                                    onClick={() => onDuplicate(offer.id)}
                                    disabled={isDuplicating}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicar
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={() => onArchive(offer.id)}
                                    className="text-zinc-400 focus:text-zinc-300"
                                >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archivar
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={() => onDelete(offer.id)}
                                    className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-zinc-300 py-4 px-4 min-w-[180px]">
                <div className="flex flex-col gap-1.5">
                    {offer.business_term?.discount_percentage ? (
                        <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span className="text-sm">{offer.business_term.discount_percentage}% desc.</span>
                        </div>
                    ) : null}
                    {(() => {
                        const businessTerm = offer.business_term;
                        if (!businessTerm) return null;
                        const advanceType = businessTerm.advance_type || 'percentage';
                        if (advanceType === 'fixed_amount' && businessTerm.advance_amount) {
                            return (
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-blue-400 shrink-0" />
                                    <span className="text-sm">${businessTerm.advance_amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} anticipo</span>
                                </div>
                            );
                        } else if (advanceType === 'percentage' && businessTerm.advance_percentage) {
                            return (
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-blue-400 shrink-0" />
                                    <span className="text-sm">{businessTerm.advance_percentage}% anticipo</span>
                                </div>
                            );
                        }
                        return null;
                    })()}
                    {!offer.business_term?.discount_percentage && !offer.business_term?.advance_percentage && (
                        <span className="text-sm text-zinc-500">Sin condiciones</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-center text-zinc-300 py-4 px-4 w-[100px]">
                <span className="text-base">{stats.total_visits}</span>
            </TableCell>
            <TableCell className="text-center text-zinc-300 py-4 px-4 w-[120px]">
                <span className="text-base">{noConvertidos}</span>
            </TableCell>
            <TableCell className="text-center text-zinc-300 py-4 px-4 w-[120px]">
                <span className="text-base">{stats.total_submissions}</span>
            </TableCell>

        </TableRow>
    );
}

interface OffersTableProps {
    offers: StudioOffer[];
    stats: Record<string, OfferStats>;
    studioSlug: string;
    onEdit: (offerId: string) => void;
    onDuplicate: (offerId: string) => void;
    onDelete: (offerId: string) => void;
    onArchive: (offerId: string) => void;
    onToggleActive: (offerId: string, isActive: boolean) => void;
    onDragEnd: (event: DragEndEvent) => void;
    duplicatingOfferId: string | null;
    isReordering: boolean;
}

export function OffersTable({
    offers,
    stats,
    studioSlug,
    onEdit,
    onDuplicate,
    onDelete,
    onArchive,
    onToggleActive,
    onDragEnd,
    duplicatingOfferId,
    isReordering,
}: OffersTableProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    return (
        <div className="rounded-lg border border-zinc-800 overflow-hidden relative">
            <div className="overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                >
                    <Table className="min-w-[870px]">
                        <TableHeader>
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-400 font-medium w-8 py-4 sticky left-0 bg-zinc-900 z-20 border-r border-zinc-800"></TableHead>
                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[80px] sticky left-8 bg-zinc-900 z-20 border-r border-zinc-800">Status</TableHead>
                                <TableHead className="text-zinc-400 font-medium py-4 w-[400px] max-w-[400px] sticky left-[88px] bg-zinc-900 z-20 border-r border-zinc-800">Oferta</TableHead>
                                <TableHead className="text-zinc-400 font-medium py-4 px-4 min-w-[180px]">Condiciones</TableHead>
                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[100px]">Visitas Landing</TableHead>
                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[120px]">Visitas Leadform</TableHead>
                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[120px]">Conversiones Leadform</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <SortableContext
                                items={offers.map((offer) => offer.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {offers.map((offer) => {
                                    const offerStats = stats[offer.id] || {
                                        total_visits: 0,
                                        total_leadform_visits: 0,
                                        total_submissions: 0,
                                        conversion_rate: 0,
                                    };

                                    return (
                                        <SortableOfferRow
                                            key={offer.id}
                                            offer={offer}
                                            stats={offerStats}
                                            studioSlug={studioSlug}
                                            onEdit={onEdit}
                                            onDuplicate={onDuplicate}
                                            onDelete={onDelete}
                                            onArchive={onArchive}
                                            onToggleActive={onToggleActive}
                                            isDuplicating={duplicatingOfferId === offer.id}
                                        />
                                    );
                                })}
                            </SortableContext>
                        </TableBody>
                    </Table>
                </DndContext>
            </div>
            {isReordering && (
                <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center z-10 rounded-lg">
                    <div className="flex items-center gap-2 text-zinc-300">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm">Actualizando orden...</span>
                    </div>
                </div>
            )}
        </div>
    );
}