'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Edit, Copy, Archive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PortfolioCardMenuProps {
    portfolioId: string;
    portfolioSlug: string;
    studioSlug: string;
    isPublished: boolean;
}

/**
 * PortfolioCardMenu - Menú contextual para acciones de portfolio
 * Solo visible si el usuario está autenticado
 * Acciones: Editar, Duplicar, Archivar, Eliminar
 */
export function PortfolioCardMenu({ portfolioId, portfolioSlug, studioSlug, isPublished }: PortfolioCardMenuProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);

    // No mostrar si no hay usuario
    if (!user) {
        return null;
    }

    const handleEdit = () => {
        router.push(`/${studioSlug}/profile/edit/content/portfolios/${portfolioId}/editar`);
        setIsOpen(false);
    };

    const handleDuplicate = async () => {
        setIsDuplicating(true);
        try {
            // TODO: Implementar acción de duplicar
            toast.success('Portfolio duplicado correctamente');
            setIsOpen(false);
            router.refresh();
        } catch (error) {
            toast.error('Error al duplicar el portfolio');
        } finally {
            setIsDuplicating(false);
        }
    };

    const handleArchiveConfirm = async () => {
        setIsArchiving(true);
        try {
            // TODO: Implementar acción de archivar
            toast.success('Portfolio archivado correctamente');
            setShowArchiveModal(false);
            router.refresh();
        } catch (error) {
            toast.error('Error al archivar el portfolio');
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        try {
            // TODO: Implementar acción de eliminar
            toast.success('Portfolio eliminado correctamente');
            setShowDeleteModal(false);
            router.refresh();
        } catch (error) {
            toast.error('Error al eliminar el portfolio');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            {/* Botón del menú */}
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label="Opciones"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <>
                        {/* Overlay para cerrar */}
                        <div
                            className="fixed inset-0 z-20"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                        />

                        {/* Menu */}
                        <div
                            className="absolute right-0 top-8 z-30 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Editar */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Editar
                            </button>

                            {/* Duplicar */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate();
                                }}
                                disabled={isDuplicating}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                            >
                                <Copy className="w-4 h-4" />
                                {isDuplicating ? 'Duplicando...' : 'Duplicar'}
                            </button>

                            {/* Archivar */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowArchiveModal(true);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                                <Archive className="w-4 h-4" />
                                Archivar
                            </button>

                            {/* Eliminar */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteModal(true);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-950/20 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de confirmación - Archivar */}
            {showArchiveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isArchiving && setShowArchiveModal(false)} />
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                            ¿Archivar portfolio?
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            El portfolio dejará de ser visible en tu perfil público. Podrás restaurarlo más tarde.
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
                </div>
            )}

            {/* Modal de confirmación - Eliminar */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteModal(false)} />
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-red-400 mb-2">
                            ¿Eliminar portfolio?
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            Esta acción no se puede deshacer. El portfolio y todo su contenido se eliminarán permanentemente.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
