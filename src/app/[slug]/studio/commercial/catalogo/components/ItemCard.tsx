"use client";

import React, { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { ZenCard, ZenBadge } from "@/components/ui/zen";

interface Item {
    id: string;
    name: string;
    cost?: number;
    mediaSize?: number;
    isNew?: boolean;
    isFeatured?: boolean;
    tipoUtilidad?: 'servicio' | 'producto';
}

interface ItemCardProps {
    item: Item;
    onEdit: (item: Item) => void;
    onDelete: (item: Item) => void;
    precioPublico?: number;
}

/**
 * Tarjeta de Item con drag handle, nombre, precio calculado y acciones
 * Utilizable en cualquier vista de lista de items
 */
export function ItemCard({ item, onEdit, onDelete, precioPublico }: ItemCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        data: {
            type: "item",
            item,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const cardElement = document.querySelector(`.card-${item.id}`);
            if (cardElement && !cardElement.contains(target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [item.id]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    // Usar precio público calculado si está disponible, sino usar el costo
    const displayPrice = precioPublico !== undefined ? precioPublico : (item.cost || 0);

    return (
        <div ref={setNodeRef} style={style} className="group">
            <ZenCard className={`p-2 hover:bg-zinc-800/80 transition-colors card-${item.id}`}>
                <div className="flex items-center gap-2">
                    {/* Drag Handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                        aria-label="Arrastrar item"
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>

                    {/* Contenido principal */}
                    <div className="flex-1 min-w-0">
                        {/* Nombre del item */}
                        <div className="text-sm text-zinc-200">
                            {item.name}
                        </div>
                        {/* Badge de tipo de utilidad y conteo de bytes */}
                        <div className="flex items-center gap-2 mt-0.5">
                            {/* Badge de tipo de utilidad */}
                            {item.tipoUtilidad && (
                                <ZenBadge
                                    variant={item.tipoUtilidad === 'servicio' ? 'secondary' : 'default'}
                                    className={`text-[10px] px-1.5 py-0.5 ${item.tipoUtilidad === 'servicio'
                                        ? 'bg-blue-900/50 text-blue-300 border-blue-700/50'
                                        : 'bg-green-900/50 text-green-300 border-green-700/50'
                                        }`}
                                >
                                    {item.tipoUtilidad === 'servicio' ? 'Servicio' : 'Producto'}
                                </ZenBadge>
                            )}
                            {/* Conteo de bytes */}
                            {item.mediaSize !== undefined && item.mediaSize > 0 && (
                                <div className="text-xs text-zinc-500">
                                    {formatBytes(item.mediaSize)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Precio público calculado */}
                    <div className="text-sm font-semibold text-zinc-100 min-w-[80px] text-right flex-shrink-0">
                        {formatCurrency(displayPrice)}
                    </div>

                    {/* Botón de menú */}
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(!menuOpen);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded transition-colors"
                            title="Opciones"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>

                        {/* Menú desplegable */}
                        {menuOpen && (
                            <div className={`absolute top-full right-0 mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50 py-1 card-${item.id}`}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(item);
                                        setMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors text-left"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(item);
                                        setMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </ZenCard>
        </div>
    );
}
