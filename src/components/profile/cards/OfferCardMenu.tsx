'use client';

import React, { useState } from 'react';
import { MoreVertical, Edit, Copy, Archive, Trash2 } from 'lucide-react';

interface OfferCardMenuProps {
    offerId: string;
    studioSlug: string;
}

/**
 * OfferCardMenu - Menú contextual para gestión de ofertas
 * Solo visible para usuarios autenticados
 * Todas las acciones abren Studio en nueva pestaña
 */
export function OfferCardMenu({ offerId, studioSlug }: OfferCardMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(`/${studioSlug}/studio/commercial/ofertas/${offerId}`, '_blank');
        setIsOpen(false);
    };

    const handleDuplicate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Implementar duplicado de oferta
        console.log('Duplicar oferta:', offerId);
        setIsOpen(false);
    };

    const handleArchive = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Implementar archivado de oferta
        console.log('Archivar oferta:', offerId);
        setIsOpen(false);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Implementar eliminación de oferta con confirmación
        console.log('Eliminar oferta:', offerId);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/90 backdrop-blur-sm rounded transition-colors"
                aria-label="Opciones de oferta"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop para cerrar al hacer click fuera */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 overflow-hidden">
                        {/* Edit */}
                        <button
                            onClick={handleEdit}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                            Editar
                        </button>

                        {/* Duplicate */}
                        <button
                            onClick={handleDuplicate}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                            Duplicar
                        </button>

                        {/* Archive */}
                        <button
                            onClick={handleArchive}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                        >
                            <Archive className="w-4 h-4" />
                            Archivar
                        </button>

                        {/* Divider */}
                        <div className="border-t border-zinc-800" />

                        {/* Delete */}
                        <button
                            onClick={handleDelete}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
