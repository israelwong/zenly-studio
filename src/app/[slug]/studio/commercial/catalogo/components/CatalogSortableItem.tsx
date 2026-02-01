'use client';

import React from 'react';
import { GripVertical, MoreHorizontal, Eye, EyeOff, Copy, MoveVertical, Trash2, Link, X, Clock, DollarSign, Hash } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import {
    ZenDropdownMenu,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { calcularPrecio as calcularPrecioSistema } from '@/lib/actions/studio/catalogo/calcular-precio';

export interface CatalogItem {
    id: string;
    name: string;
    cost: number;
    description?: string;
    tipoUtilidad?: 'servicio' | 'producto';
    billing_type?: 'HOUR' | 'SERVICE' | 'UNIT';
    order?: number;
    isNew?: boolean;
    isFeatured?: boolean;
    categoriaId?: string;
    status?: string;
    gastos?: Array<{ nombre: string; costo: number }>;
}

export type ServiceLinksMap = Record<string, string[]>;

const GROUP_BADGE_NAME_MAX = 18;

export interface CatalogSortableItemProps {
    item: CatalogItem;
    itemIndex: number;
    seccionId: string;
    isSelectionMode: boolean;
    selectedIds: string[];
    selectedSectionId: string | null;
    onToggleSelect: (item: CatalogItem) => void;
    hoverHighlightGroupIds: Set<string> | null;
    onHoverGroup: (ids: string[] | null) => void;
    getGroupIds: (itemId: string) => string[];
    serviceLinksMap: ServiceLinksMap;
    linkedIdsSet: Set<string>;
    parentNameByLinkedId: Record<string, string>;
    allItemsFlat: CatalogItem[];
    onClearLinksForItem: (itemId: string) => void | Promise<void>;
    onEditLinkFromBadge: (item: CatalogItem) => void;
    onEditItem: (item: CatalogItem) => void;
    onDeleteItem: (item: CatalogItem) => void;
    onTogglePublish: (item: CatalogItem) => void;
    onDuplicateItem: (item: CatalogItem) => void;
    onMoveItem: (item: CatalogItem) => void;
    isItemModalOpen: boolean;
    itemToEdit: CatalogItem | null;
    preciosConfig: ConfiguracionPrecios | null;
}

export function CatalogSortableItem({
    item,
    itemIndex,
    seccionId,
    isSelectionMode,
    selectedIds,
    selectedSectionId,
    onToggleSelect,
    hoverHighlightGroupIds,
    onHoverGroup,
    getGroupIds,
    serviceLinksMap: serviceLinksMapProp,
    linkedIdsSet: linkedIdsSetProp,
    parentNameByLinkedId: parentNameByLinkedIdProp,
    allItemsFlat,
    onClearLinksForItem,
    onEditLinkFromBadge,
    onEditItem,
    onDeleteItem,
    onTogglePublish,
    onDuplicateItem,
    onMoveItem,
    isItemModalOpen,
    itemToEdit,
    preciosConfig,
}: CatalogSortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const precios = preciosConfig
        ? calcularPrecioSistema(
            item.cost,
            item.gastos?.reduce((acc, g) => acc + g.costo, 0) || 0,
            item.tipoUtilidad || 'servicio',
            preciosConfig
        )
        : { precio_final: 0 };

    const isInactive = item.status !== 'active';
    const isSelected = selectedIds.includes(item.id);
    const isOtherSection = selectedSectionId != null && seccionId !== selectedSectionId;
    const groupIds = getGroupIds(item.id);
    const isHighlighted =
        hoverHighlightGroupIds != null && groupIds.length > 0 && hoverHighlightGroupIds.has(item.id);
    const isParent = (serviceLinksMapProp[item.id]?.length ?? 0) > 0;
    const isChild = linkedIdsSetProp.has(item.id);
    const parentName = parentNameByLinkedIdProp[item.id];
    const groupDisplayName = isParent ? item.name : (parentName ?? '');
    const truncateGroupName = (s: string) =>
        s.length > GROUP_BADGE_NAME_MAX ? s.slice(0, GROUP_BADGE_NAME_MAX) + '…' : s;

    const handleRowClick = () => {
        if (isSelectionMode) {
            onToggleSelect(item);
            return;
        }
        onEditItem(item);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'relative z-20 flex items-center justify-between p-2 pl-6 transition-colors cursor-pointer',
                itemIndex > 0 && 'border-t border-zinc-700/30',
                isItemModalOpen && itemToEdit?.id === item.id && 'bg-zinc-700/40',
                !isSelectionMode && !(isItemModalOpen && itemToEdit?.id === item.id) && 'hover:bg-zinc-700/20',
                isSelectionMode && isSelected && 'ring-2 ring-emerald-500 ring-inset rounded',
                isSelectionMode && isOtherSection && 'opacity-50'
            )}
            onClick={handleRowClick}
            onMouseEnter={() => {
                if (groupIds.length > 0) onHoverGroup(groupIds);
            }}
            onMouseLeave={() => onHoverGroup(null)}
        >
            {isHighlighted && (
                <div
                    className="absolute inset-0 z-0 rounded bg-emerald-500/15 [transition:none]"
                    style={{ pointerEvents: 'none' }}
                    aria-hidden
                />
            )}
            <div className="relative z-20 flex items-center gap-2 flex-1 min-w-0 text-left py-1">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className={`shrink-0 p-1 hover:bg-zinc-600 rounded cursor-grab active:cursor-grabbing ${isInactive ? 'opacity-50' : ''}`}
                    title="Arrastrar para reordenar"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className={`h-4 w-4 ${isInactive ? 'text-zinc-500' : 'text-zinc-500'}`} />
                </button>

                <div className="flex-1 min-w-0">
                    <div className={`text-sm font-light leading-tight ${isInactive ? 'text-zinc-500' : 'text-zinc-300'}`}>
                        <span className="break-words">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <ZenBadge
                            variant="outline"
                            size="sm"
                            className={`px-1 py-0 text-[10px] font-light rounded-sm ${isInactive
                                ? 'border-zinc-500 text-zinc-500'
                                : (item.tipoUtilidad || 'servicio') === 'servicio'
                                    ? 'border-blue-600 text-blue-400'
                                    : 'border-purple-600 text-purple-400'
                                }`}
                        >
                            {(item.tipoUtilidad || 'servicio') === 'servicio' ? 'Servicio' : 'Producto'}
                        </ZenBadge>
                        {item.billing_type && (item.tipoUtilidad || 'servicio') === 'servicio' && (
                            <ZenBadge
                                variant="outline"
                                size="sm"
                                className={`px-1 py-0 text-[10px] font-light rounded-sm flex items-center gap-0.5 ${isInactive
                                    ? 'border-zinc-500 text-zinc-500'
                                    : item.billing_type === 'HOUR'
                                        ? 'border-amber-600 text-amber-400'
                                        : item.billing_type === 'UNIT'
                                            ? 'border-purple-600 text-purple-400'
                                            : 'border-emerald-600 text-emerald-400'
                                    }`}
                            >
                                {item.billing_type === 'HOUR' ? (
                                    <>
                                        <Clock className="w-2.5 h-2.5" />
                                        Por Hora
                                    </>
                                ) : item.billing_type === 'UNIT' ? (
                                    <>
                                        <Hash className="w-2.5 h-2.5" />
                                        Por Unidad
                                    </>
                                ) : (
                                    <>
                                        <DollarSign className="w-2.5 h-2.5" />
                                        Fijo
                                    </>
                                )}
                            </ZenBadge>
                        )}
                        <span className={`text-xs ${isInactive ? 'text-zinc-500' : 'text-green-400'}`}>
                            ${precios.precio_final.toLocaleString()}
                            {item.billing_type === 'HOUR' && <span className="ml-0.5">/h</span>}
                        </span>
                        {isInactive && (
                            <ZenBadge
                                variant="outline"
                                size="sm"
                                className="px-1 py-0 text-[10px] font-light rounded-full border-zinc-600 text-zinc-500 bg-zinc-800/50"
                            >
                                Inactivo
                            </ZenBadge>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative z-20 flex items-center gap-3">
                <div className="flex items-center gap-1">
                    {(isParent || (isChild && parentName)) && groupDisplayName && (
                        <span
                            data-catalog-badge-link
                            className="relative z-30 inline-flex cursor-pointer items-center gap-0.5 rounded-md border border-emerald-600/60 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="Editar vínculo"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditLinkFromBadge(item);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onEditLinkFromBadge(item);
                                }
                            }}
                        >
                            <Link className="h-2.5 w-2.5 shrink-0 pointer-events-none" />
                            {truncateGroupName(groupDisplayName)}
                            <button
                                type="button"
                                className="relative z-10 ml-0.5 inline-flex h-5 w-5 min-w-5 shrink-0 cursor-pointer items-center justify-center rounded p-0 text-zinc-400 hover:bg-emerald-500/20 hover:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50"
                                title="Romper vínculo"
                                aria-label="Romper vínculo"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const id = item.id;
                                    void (async () => {
                                        try {
                                            await onClearLinksForItem(id);
                                        } catch {
                                            toast.error('Error al romper vínculo');
                                        }
                                    })();
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                            >
                                <X className="h-2.5 w-2.5 pointer-events-none" />
                            </button>
                        </span>
                    )}
                    <ZenDropdownMenu>
                        <ZenDropdownMenuTrigger asChild>
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 ${isInactive ? 'text-zinc-500 hover:text-zinc-400' : ''}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className={`h-4 w-4 ${isInactive ? 'text-zinc-500' : ''}`} />
                            </ZenButton>
                        </ZenDropdownMenuTrigger>
                        <ZenDropdownMenuContent align="end" className="w-48">
                            <ZenDropdownMenuItem onClick={() => onTogglePublish(item)}>
                                {item.status === 'active' ? (
                                    <>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        Desactivar
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Activar
                                    </>
                                )}
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem onClick={() => onDuplicateItem(item)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem onClick={() => onMoveItem(item)}>
                                <MoveVertical className="h-4 w-4 mr-2" />
                                Mover a
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem
                                onClick={() => onDeleteItem(item)}
                                className="text-red-400 focus:text-red-300"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                            </ZenDropdownMenuItem>
                        </ZenDropdownMenuContent>
                    </ZenDropdownMenu>
                </div>
            </div>
        </div>
    );
}
