'use client';

import React, { useEffect, useState } from 'react';
import { Archive, RotateCcw, Loader2, FileText, Folder, Sparkles, Trash2 } from 'lucide-react';
import { getArchivedContent } from '@/lib/actions/public/archived-content.actions';
import { restorePost, restorePortfolio, activateOffer, deletePost, deletePortfolio, deleteOffer } from '@/lib/actions/studio/archive.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ArchivedContentProps {
    studioSlug: string;
    onPostClick?: (postSlug: string) => void;
    onPortfolioClick?: (portfolioSlug: string) => void;
    onPostRestored?: (postId: string) => void;
    onPortfolioRestored?: (portfolioId: string) => void;
}

interface ArchivedItem {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_url: string | null;
    updated_at: Date;
    type: 'post' | 'portfolio' | 'offer';
}

export function ArchivedContent({ studioSlug, onPostClick, onPortfolioClick, onPostRestored, onPortfolioRestored }: ArchivedContentProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState<ArchivedItem[]>([]);
    const [portfolios, setPortfolios] = useState<ArchivedItem[]>([]);
    const [offers, setOffers] = useState<ArchivedItem[]>([]);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ArchivedItem | null>(null);

    useEffect(() => {
        loadArchivedContent();
    }, [studioSlug]);

    // Función para actualizar estado local cuando se restaura desde el modal
    const handleLocalRestore = (itemId: string, type: 'post' | 'portfolio') => {
        if (type === 'post') {
            setPosts(prev => prev.filter(p => p.id !== itemId));
        } else if (type === 'portfolio') {
            setPortfolios(prev => prev.filter(p => p.id !== itemId));
        }
    };

    // Exponer callbacks para que el padre pueda actualizar el estado local
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const win = window as typeof window & {
                __handleArchivedPostRestore?: (id: string) => void;
                __handleArchivedPortfolioRestore?: (id: string) => void;
            };

            if (onPostRestored) {
                win.__handleArchivedPostRestore = (postId: string) => {
                    handleLocalRestore(postId, 'post');
                };
            }
            if (onPortfolioRestored) {
                win.__handleArchivedPortfolioRestore = (portfolioId: string) => {
                    handleLocalRestore(portfolioId, 'portfolio');
                };
            }
        }
    }, [onPostRestored, onPortfolioRestored]);

    const loadArchivedContent = async () => {
        setLoading(true);
        try {
            const result = await getArchivedContent(studioSlug);
            if (result.success && result.data) {
                setPosts(result.data.posts.map(p => ({
                    id: p.id,
                    title: p.title || p.caption || 'Post sin título',
                    slug: p.slug,
                    description: p.caption,
                    cover_url: p.cover_media_url,
                    updated_at: p.updated_at,
                    type: 'post' as const
                })));

                setPortfolios(result.data.portfolios.map(p => ({
                    id: p.id,
                    title: p.title,
                    slug: p.slug,
                    description: p.description,
                    cover_url: p.cover_image_url,
                    updated_at: p.updated_at,
                    type: 'portfolio' as const
                })));

                setOffers(result.data.offers.map(o => ({
                    id: o.id,
                    title: o.name,
                    slug: o.slug,
                    description: o.description,
                    cover_url: o.cover_media_url,
                    updated_at: o.updated_at,
                    type: 'offer' as const
                })));
            }
        } catch (error) {
            console.error('Error loading archived content:', error);
            toast.error('Error al cargar archivados');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (item: ArchivedItem) => {
        setRestoringId(item.id);
        try {
            let result;

            if (item.type === 'post') {
                result = await restorePost(item.id, studioSlug);
            } else if (item.type === 'portfolio') {
                result = await restorePortfolio(item.id, studioSlug);
            } else {
                result = await activateOffer(item.id, studioSlug);
            }

            if (result.success) {
                toast.success(
                    item.type === 'post' ? 'Post restaurado' :
                        item.type === 'portfolio' ? 'Portfolio restaurado' :
                            'Oferta activada'
                );
                // Remover del listado
                if (item.type === 'post') {
                    setPosts(prev => prev.filter(p => p.id !== item.id));
                } else if (item.type === 'portfolio') {
                    setPortfolios(prev => prev.filter(p => p.id !== item.id));
                } else {
                    setOffers(prev => prev.filter(o => o.id !== item.id));
                }
                router.refresh();
            } else {
                toast.error(result.error || 'Error al restaurar');
            }
        } catch (error) {
            console.error('Error restoring:', error);
            toast.error('Error al restaurar contenido');
        } finally {
            setRestoringId(null);
        }
    };

    const totalArchived = posts.length + portfolios.length + offers.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
            </div>
        );
    }

    if (totalArchived === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                    <Archive className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                    No hay contenido archivado
                </h3>
                <p className="text-sm text-zinc-500 text-center max-w-md">
                    El contenido archivado aparecerá aquí. Puedes archivar posts, portfolios y ofertas desde sus menús contextuales.
                </p>
            </div>
        );
    }

    const handleDeleteClick = (item: ArchivedItem) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;

        setDeletingId(itemToDelete.id);
        try {
            let result;

            // Ejecutar action de eliminación según el tipo
            if (itemToDelete.type === 'post') {
                result = await deletePost(itemToDelete.id, studioSlug);
            } else if (itemToDelete.type === 'portfolio') {
                result = await deletePortfolio(itemToDelete.id, studioSlug);
            } else {
                result = await deleteOffer(itemToDelete.id, studioSlug);
            }

            if (result.success) {
                toast.success(
                    itemToDelete.type === 'post' ? 'Post eliminado permanentemente' :
                        itemToDelete.type === 'portfolio' ? 'Portfolio eliminado permanentemente' :
                            'Oferta eliminada permanentemente'
                );

                // Remover del listado local
                if (itemToDelete.type === 'post') {
                    setPosts(prev => prev.filter(p => p.id !== itemToDelete.id));
                } else if (itemToDelete.type === 'portfolio') {
                    setPortfolios(prev => prev.filter(p => p.id !== itemToDelete.id));
                } else {
                    setOffers(prev => prev.filter(o => o.id !== itemToDelete.id));
                }

                setShowDeleteModal(false);
                setItemToDelete(null);
                router.refresh();
            } else {
                toast.error(result.error || 'Error al eliminar');
            }
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Error al eliminar contenido');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            <div className="space-y-8 py-6 px-4">
                {/* Posts Archivados */}
                {posts.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-zinc-400" />
                            <h2 className="text-lg font-semibold text-zinc-300">
                                Posts ({posts.length})
                            </h2>
                        </div>
                        <div className="space-y-2">
                            {posts.map(post => (
                                <ArchivedCard
                                    key={post.id}
                                    item={post}
                                    onRestore={handleRestore}
                                    onDelete={handleDeleteClick}
                                    isRestoring={restoringId === post.id}
                                    isDeleting={deletingId === post.id}
                                    onView={() => {
                                        if (onPostClick) {
                                            onPostClick(post.slug);
                                        } else {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('post', post.slug);
                                            router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Portfolios Archivados */}
                {portfolios.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Folder className="w-5 h-5 text-zinc-400" />
                            <h2 className="text-lg font-semibold text-zinc-300">
                                Portfolios ({portfolios.length})
                            </h2>
                        </div>
                        <div className="space-y-2">
                            {portfolios.map(portfolio => (
                                <ArchivedCard
                                    key={portfolio.id}
                                    item={portfolio}
                                    onRestore={handleRestore}
                                    onDelete={handleDeleteClick}
                                    isRestoring={restoringId === portfolio.id}
                                    isDeleting={deletingId === portfolio.id}
                                    onView={() => {
                                        if (onPortfolioClick) {
                                            onPortfolioClick(portfolio.slug);
                                        } else {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('portfolio', portfolio.slug);
                                            router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Ofertas Inactivas */}
                {offers.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            <h2 className="text-lg font-semibold text-zinc-300">
                                Ofertas ({offers.length})
                            </h2>
                        </div>
                        <div className="space-y-2">
                            {offers.map(offer => (
                                <ArchivedCard
                                    key={offer.id}
                                    item={offer}
                                    onRestore={handleRestore}
                                    onDelete={handleDeleteClick}
                                    isRestoring={restoringId === offer.id}
                                    isDeleting={deletingId === offer.id}
                                    actionLabel="Activar"
                                    onView={() => {
                                        // Las ofertas van a su propia página
                                        router.push(`/${studioSlug}/offer/${offer.slug}`);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de confirmación - Eliminar */}
            {showDeleteModal && itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !deletingId && setShowDeleteModal(false)} />
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold text-red-400 mb-2">
                            ¿Eliminar {itemToDelete.type === 'post' ? 'post' : itemToDelete.type === 'portfolio' ? 'portfolio' : 'oferta'}?
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            Esta acción no se puede deshacer. El contenido se eliminará permanentemente.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={!!deletingId}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors disabled:opacity-50"
                            >
                                {deletingId ? 'Eliminando...' : 'Eliminar'}
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={!!deletingId}
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

interface ArchivedCardProps {
    item: ArchivedItem;
    onRestore: (item: ArchivedItem) => void;
    onDelete: (item: ArchivedItem) => void;
    isRestoring: boolean;
    isDeleting: boolean;
    actionLabel?: string;
    onView?: () => void;
}

function ArchivedCard({ item, onRestore, onDelete, isRestoring, isDeleting, actionLabel = 'Restaurar', onView }: ArchivedCardProps) {
    return (
        <div
            className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden hover:bg-zinc-900 transition-colors cursor-pointer"
            onClick={onView}
        >
            <div className="flex gap-3 p-3">
                {/* Imagen izquierda */}
                <div className="relative w-20 h-20 bg-zinc-800 rounded-md shrink-0 overflow-hidden">
                    {item.cover_url ? (
                        <Image
                            src={item.cover_url}
                            alt={item.title}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Archive className="w-8 h-8 text-zinc-600" />
                        </div>
                    )}
                </div>

                {/* Detalles derecha */}
                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-zinc-300 truncate">
                            {item.title}
                        </h3>
                        {item.description && (
                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                                {item.description}
                            </p>
                        )}
                        <p className="text-xs text-zinc-600 mt-1">
                            {new Date(item.updated_at).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </p>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2">
                        {/* Botón restaurar */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRestore(item);
                            }}
                            disabled={isRestoring || isDeleting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {isRestoring ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span className="hidden sm:inline">Restaurando...</span>
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{actionLabel}</span>
                                </>
                            )}
                        </button>

                        {/* Botón eliminar */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item);
                            }}
                            disabled={isRestoring || isDeleting}
                            className="p-1.5 rounded-md text-red-400 hover:bg-red-950/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Eliminar permanentemente"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
