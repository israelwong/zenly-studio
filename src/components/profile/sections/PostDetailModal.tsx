'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { PostRenderer } from '@/components/posts/PostRenderer';
import { AlertCircle, Home, Image as ImageIcon } from 'lucide-react';

interface PostMedia {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    storage_path: string;
    thumbnail_url?: string;
    display_order: number;
}

interface Post {
    id: string;
    slug: string;
    title?: string | null;
    caption: string | null;
    tags?: string[];
    media: PostMedia[];
    is_published: boolean;
    is_featured?: boolean;
    published_at: Date | null;
    cta_enabled?: boolean;
    cta_action?: string;
    cta_text?: string;
    studio?: {
        studio_name: string;
        logo_url?: string | null;
    };
}

interface PostDetailModalProps {
    post: Post | null;
    studioSlug: string;
    isOpen: boolean;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
    isArchived?: boolean;
    onRestore?: () => void;
}

/**
 * PostDetailModal - Modal para mostrar post completo
 * - Overlay con fondo oscuro
 * - Navegación prev/next entre posts
 * - Cierra con ESC o click en X
 * - Actualiza URL con query param ?post=slug
 */
export function PostDetailModal({
    post,
    studioSlug,
    isOpen,
    onClose,
    onNext,
    onPrev,
    hasNext = false,
    hasPrev = false,
    isArchived = false,
    onRestore
}: PostDetailModalProps) {
    // Manejar ESC para cerrar
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    // Manejar navegación con flechas
    useEffect(() => {
        const handleArrow = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
            if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleArrow);
        }

        return () => {
            document.removeEventListener('keydown', handleArrow);
        };
    }, [isOpen, hasNext, hasPrev, onNext, onPrev]);

    if (!isOpen) return null;

    // Si el modal está abierto pero no hay post, mostrar mensaje de "no disponible"
    if (!post) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Overlay */}
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    onClick={onClose}
                />

                {/* Modal de "Post no disponible" */}
                <div className="relative w-full max-w-md mx-auto p-4 flex items-center justify-center">
                    <div className="relative w-full bg-zinc-900/95 backdrop-blur-xl rounded-lg border border-zinc-800/50 shadow-2xl p-6">
                        {/* Icono de alerta */}
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>

                            {/* Título */}
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-zinc-100">
                                    Post no disponible
                                </h3>
                                <p className="text-sm text-zinc-400">
                                    Este post fue eliminado, movido o ya no está disponible públicamente.
                                </p>
                            </div>

                            {/* Acciones */}
                            <div className="w-full space-y-3 pt-4">
                                <Link
                                    href={`/${studioSlug}`}
                                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                                    onClick={onClose}
                                >
                                    <Home className="w-4 h-4" />
                                    <span>Ver perfil</span>
                                </Link>

                                <Link
                                    href={`/${studioSlug}?section=portafolio`}
                                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-transparent border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 rounded-lg transition-colors"
                                    onClick={onClose}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    <span>Ver portafolios</span>
                                </Link>

                                <button
                                    onClick={onClose}
                                    className="w-full px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Preparar post con campos requeridos por PostRenderer
    const postWithCTA = {
        ...post,
        title: post.title ?? null,
        tags: post.tags ?? [],
        media: post.media.map(m => ({
            ...m,
            storage_path: m.storage_path || '',
        })),
        cta_enabled: post.cta_enabled ?? false,
        cta_action: post.cta_action ?? '',
        cta_text: post.cta_text ?? '',
        created_at: new Date(),
        view_count: 0,
        event_type: null,
        studio: {
            studio_name: post.studio?.studio_name ?? '',
            logo_url: post.studio?.logo_url ?? null,
            whatsapp_number: null,
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay con blur mejorado */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal Container - Mobile-friendly max-width con altura dinámica */}
            <div className="relative w-full max-w-md mx-auto p-0 sm:p-4 flex items-center justify-center max-h-screen">
                {/* Content - Con backdrop-blur en el fondo */}
                <div className="relative w-full h-auto max-h-[95vh] overflow-hidden bg-zinc-900/95 backdrop-blur-xl sm:rounded-lg flex flex-col border border-zinc-800/50 shadow-2xl">
                    <PostRenderer
                        post={postWithCTA}
                        studioSlug={studioSlug}
                        onNext={onNext}
                        onPrev={onPrev}
                        hasNext={hasNext}
                        hasPrev={hasPrev}
                        onClose={onClose}
                        isArchived={isArchived}
                        onRestore={onRestore}
                    />

                    {/* Footer con botón cerrar discreto - Menos alto */}
                    <div className="shrink-0 py-2 px-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                        <button
                            onClick={onClose}
                            className="w-full py-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
