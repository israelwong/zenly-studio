'use client';

import React from 'react';
import Image from 'next/image';
import { FolderOpen, Copy, Trash2, GripVertical, MoreVertical, Edit, Archive, Eye } from 'lucide-react';
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
import type { StudioPortfolio } from '@/types/studio-portfolios';

interface SortablePortfolioRowProps {
    portfolio: StudioPortfolio;
    studioSlug: string;
    onEdit: (portfolioId: string) => void;
    onDuplicate: (portfolioId: string) => void;
    onDelete: (portfolioId: string) => void;
    onArchive: (portfolioId: string) => void;
    onToggleActive: (portfolioId: string, isActive: boolean) => void;
    isDuplicating: boolean;
}

function SortablePortfolioRow({
    portfolio,
    studioSlug,
    onEdit,
    onDuplicate,
    onDelete,
    onArchive,
    onToggleActive,
    isDuplicating,
}: SortablePortfolioRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: portfolio.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            className="border-zinc-800 cursor-pointer hover:bg-zinc-900/50 transition-colors group"
            onClick={() => onEdit(portfolio.id)}
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
                    checked={portfolio.is_published}
                    onCheckedChange={(checked) => {
                        onToggleActive(portfolio.id, checked);
                    }}
                />
            </TableCell>
            <TableCell className="font-medium text-zinc-100 py-4 w-[300px] max-w-[300px] sticky left-[88px] bg-zinc-800 z-10 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800">
                <div className="flex items-center gap-2 min-w-0 max-w-full">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                        {portfolio.cover_image_url ? (
                            <Image
                                src={portfolio.cover_image_url}
                                alt={portfolio.title}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                <FolderOpen className="h-4 w-4 text-zinc-600" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">
                        <span className="truncate text-sm">{portfolio.title}</span>
                        {portfolio.description ? (
                            <span className="text-xs text-zinc-500 truncate">
                                {portfolio.description}
                            </span>
                        ) : (
                            <span className="text-xs text-zinc-600 italic">
                                Sin descripción
                            </span>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                            {portfolio.category && (
                                <ZenBadge variant="outline" className="text-xs px-1.5 py-0">
                                    {portfolio.category}
                                </ZenBadge>
                            )}
                            {portfolio.is_featured && (
                                <ZenBadge variant="primary" className="text-xs px-1.5 py-0">
                                    Destacado
                                </ZenBadge>
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
                                <ZenDropdownMenuItem onClick={() => onEdit(portfolio.id)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuItem
                                    onClick={() => onDuplicate(portfolio.id)}
                                    disabled={isDuplicating}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicar
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={() => onArchive(portfolio.id)}
                                    className="text-zinc-400 focus:text-zinc-300"
                                >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archivar
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={() => onDelete(portfolio.id)}
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
                    {portfolio.event_type ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm">{portfolio.event_type.name}</span>
                        </div>
                    ) : (
                        <span className="text-sm text-zinc-500">Sin tipo de evento</span>
                    )}
                    {portfolio.tags && portfolio.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {portfolio.tags.slice(0, 2).map((tag, idx) => (
                                <ZenBadge key={idx} variant="outline" className="text-xs px-1.5 py-0">
                                    {tag}
                                </ZenBadge>
                            ))}
                            {portfolio.tags.length > 2 && (
                                <span className="text-xs text-zinc-500">+{portfolio.tags.length - 2}</span>
                            )}
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-center text-zinc-300 py-4 px-4 w-[120px]">
                <div className="flex items-center justify-center gap-1">
                    <Eye className="h-4 w-4 text-zinc-500" />
                    <span className="text-base">{portfolio.view_count || 0}</span>
                </div>
            </TableCell>
            <TableCell className="text-zinc-300 py-4 px-4 w-[150px]">
                {portfolio.published_at ? (
                    <span className="text-sm">
                        {format(new Date(portfolio.published_at), 'dd MMM yyyy', { locale: es })}
                    </span>
                ) : (
                    <span className="text-sm text-zinc-500">No publicado</span>
                )}
            </TableCell>
            <TableCell className="text-zinc-300 py-4 px-4 w-[150px]">
                <span className="text-sm">
                    {format(new Date(portfolio.created_at), 'dd MMM yyyy', { locale: es })}
                </span>
            </TableCell>
        </TableRow>
    );
}

interface PortfoliosTableProps {
    portfolios: StudioPortfolio[];
    studioSlug: string;
    onEdit: (portfolioId: string) => void;
    onDuplicate: (portfolioId: string) => void;
    onDelete: (portfolioId: string) => void;
    onArchive: (portfolioId: string) => void;
    onToggleActive: (portfolioId: string, isActive: boolean) => void;
    onDragEnd: (event: DragEndEvent) => void;
    duplicatingPortfolioId: string | null;
    isReordering: boolean;
}

export function PortfoliosTable({
    portfolios,
    studioSlug,
    onEdit,
    onDuplicate,
    onDelete,
    onArchive,
    onToggleActive,
    onDragEnd,
    duplicatingPortfolioId,
    isReordering,
}: PortfoliosTableProps) {
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
                    <Table className="min-w-[1000px]">
                        <TableHeader>
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-400 font-medium w-8 py-4 sticky left-0 bg-zinc-900 z-20 border-r border-zinc-800"></TableHead>
                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[80px] sticky left-8 bg-zinc-900 z-20 border-r border-zinc-800">Status</TableHead>
                                <TableHead className="text-zinc-400 font-medium py-4 w-[400px] max-w-[400px] sticky left-[88px] bg-zinc-900 z-20 border-r border-zinc-800">Portafolio</TableHead>
                                <TableHead className="text-zinc-400 font-medium py-4 px-4 min-w-[180px]">Categoría</TableHead>
                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[120px]">Vistas</TableHead>
                                <TableHead className="text-zinc-400 font-medium py-4 px-4 w-[150px]">Publicado</TableHead>
                                <TableHead className="text-zinc-400 font-medium py-4 px-4 w-[150px]">Creado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <SortableContext
                                items={portfolios.map((portfolio) => portfolio.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {portfolios.map((portfolio) => (
                                    <SortablePortfolioRow
                                        key={portfolio.id}
                                        portfolio={portfolio}
                                        studioSlug={studioSlug}
                                        onEdit={onEdit}
                                        onDuplicate={onDuplicate}
                                        onDelete={onDelete}
                                        onArchive={onArchive}
                                        onToggleActive={onToggleActive}
                                        isDuplicating={duplicatingPortfolioId === portfolio.id}
                                    />
                                ))}
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

