'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, ExternalLink, Archive } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { activateOffer } from '@/lib/actions/studio/archive.actions';
import { useAuth } from '@/contexts/AuthContext';

interface OfferCardMenuProps {
    offerId: string;
    studioSlug: string;
}

/**
 * OfferCardMenu - Menú contextual minimalista para ofertas
 * Gestionar: Abre Studio en nueva pestaña (duplicar/eliminar están ahí)
 * Archivar: Oculta oferta del perfil público
 */
export function OfferCardMenu({ offerId, studioSlug }: OfferCardMenuProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    // No mostrar si no hay usuario
    if (!user) {
        return null;
    }

    const handleManage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(`/${studioSlug}/studio/commercial/ofertas/${offerId}`, '_blank');
        setIsOpen(false);
    };

    const handleArchiveClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        // Esperar al siguiente frame para que el dropdown se cierre completamente
        requestAnimationFrame(() => {
            setShowArchiveModal(true);
        });
    };

    const handleArchiveConfirm = async () => {
        setIsArchiving(true);
        try {
            const result = await activateOffer(offerId, studioSlug, false);

            if (result.success) {
                toast.success('Oferta archivada', {
                    description: 'La oferta ya no es visible en tu perfil público'
                });
                setShowArchiveModal(false);

                // Esperar un poco antes de refresh
                setTimeout(() => {
                    router.refresh();
                }, 500);
            } else {
                toast.error(result.error || 'Error al archivar la oferta');
            }
        } catch (error) {
            console.error('Error archiving offer:', error);
            toast.error('Error al archivar la oferta');
        } finally {
            setIsArchiving(false);
        }
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
                        {/* Editar (abre Studio) */}
                        <button
                            onClick={handleManage}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Editar
                        </button>

                        {/* Divider */}
                        <div className="border-t border-zinc-800" />

                        {/* Archivar */}
                        <button
                            onClick={handleArchiveClick}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                        >
                            <Archive className="w-4 h-4" />
                            Archivar
                        </button>
                    </div>
                </>
            )}

            {/* Modal de confirmación - Archivar (Portal) */}
            {showArchiveModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => !isArchiving && setShowArchiveModal(false)}
                    />
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                            ¿Archivar oferta?
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            La oferta dejará de ser visible en tu perfil público. Podrás restaurarla más tarde desde la sección de Archivados.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleArchiveConfirm}
                                disabled={isArchiving}
                                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors disabled:opacity-50"
                            >
                                {isArchiving ? 'Archivando...' : 'Archivar'}
                            </button>
                            <button
                                onClick={() => setShowArchiveModal(false)}
                                disabled={isArchiving}
                                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
