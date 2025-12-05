'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Edit, Archive, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { archivePost, deletePost } from '@/lib/actions/studio/archive.actions';

interface PostCardMenuProps {
    postId: string;
    postSlug: string;
    studioSlug: string;
    isPublished: boolean;
    onEdit?: (postId: string) => void; // Callback para abrir sheet de edición
}

/**
 * PostCardMenu - Menú contextual para acciones de post
 * Solo visible si el usuario está autenticado
 * Acciones: Editar, Archivar, Eliminar
 */
export function PostCardMenu({ postId, postSlug, studioSlug, isPublished, onEdit }: PostCardMenuProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    // No mostrar si no hay usuario
    if (!user) {
        return null;
    }

    const handleEdit = () => {
        if (onEdit) {
            onEdit(postId);
        } else {
            // Fallback a ruta antigua si no hay callback
            router.push(`/${studioSlug}/profile/edit/content/posts/${postId}/editar`);
        }
        setIsOpen(false);
    };

    const handleArchiveConfirm = async () => {
        setIsArchiving(true);
        try {
            const result = await archivePost(postId, studioSlug);

            if (result.success) {
                setShowArchiveModal(false);
                setIsOpen(false);

                toast.success('Post archivado', {
                    description: 'El post ya no es visible en tu perfil público'
                });

                // Esperar un poco antes de refresh para que el toast se vea
                setTimeout(() => {
                    router.refresh();
                }, 500);
            } else {
                toast.error(result.error || 'Error al archivar el post');
            }
        } catch (error) {
            console.error('Error archiving post:', error);
            toast.error('Error al archivar el post');
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        try {
            const result = await deletePost(postId, studioSlug);

            if (result.success) {
                toast.success('Post eliminado correctamente', {
                    description: 'El post ha sido eliminado permanentemente'
                });
                setShowDeleteModal(false);
                setIsOpen(false);

                // Esperar un poco antes de refresh para que el toast se vea
                setTimeout(() => {
                    router.refresh();
                }, 500);
            } else {
                toast.error(result.error || 'Error al eliminar el post');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            toast.error('Error al eliminar el post');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            {/* Botón del menú */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
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
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Menu */}
                        <div className="absolute right-0 top-8 z-30 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
                            {/* Editar */}
                            <button
                                onClick={handleEdit}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Editar
                            </button>

                            {/* Archivar */}
                            <button
                                onClick={() => {
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
                                onClick={() => {
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
                            ¿Archivar post?
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            El post dejará de ser visible en tu perfil público. Podrás restaurarlo más tarde.
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
                            ¿Eliminar post?
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            Esta acción no se puede deshacer. El post y todo su contenido se eliminarán permanentemente.
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
