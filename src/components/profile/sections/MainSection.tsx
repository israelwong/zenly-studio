'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Image, Video, Grid3x3 } from 'lucide-react';
import { PostFeedCardWithTracking } from './PostFeedCardWithTracking';

interface PostMedia {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    thumbnail_url?: string;
    display_order: number;
}

interface PublicPost {
    id: string;
    slug: string;
    title?: string | null;
    caption: string | null;
    tags?: string[];
    media: PostMedia[];
    is_published: boolean;
    is_featured: boolean;
    published_at: Date | null;
    created_at?: Date;
}

type FilterType = 'all' | 'photos' | 'videos';

interface MainSectionProps {
    posts: PublicPost[];
    filter?: FilterType; // Filtro recibido desde props (controlado por tabs de navegación)
    onPostClick?: (postSlug: string) => void;
    onEditPost?: (postId: string) => void;
    studioId?: string;
    ownerUserId?: string | null;
}

/**
 * MainSection - Feed de inicio con posts
 * Diseño consistente, fluido y usable con separadores entre posts
 * Ordenamiento: destacados primero (sin importar fecha de creación), 
 * luego no destacados por fecha de creación (más nueva primero)
 * 
 * Filtros client-side (controlados desde ProfileNavTabs):
 * - Todos: muestra todos los posts
 * - Fotos: posts con imágenes (incluye mixtos)
 * - Videos: posts con videos (incluye mixtos)
 * 
 * Smart Feed Analytics:
 * - Tracking automático de FEED_VIEW con Intersection Observer
 * - Solo trackea posts visibles ≥50% durante ≥1s
 */
export function MainSection({ posts, filter = 'all', onPostClick, onEditPost, studioId, ownerUserId }: MainSectionProps) {

    // Filtrar solo posts publicados
    const publishedPosts = posts.filter(post => post.is_published);

    // Función helper para determinar tipo de post
    const getPostType = (post: PublicPost): 'photo' | 'video' | 'mixed' => {
        const hasImages = post.media.some(m => m.file_type === 'image');
        const hasVideos = post.media.some(m => m.file_type === 'video');
        
        if (hasImages && hasVideos) return 'mixed';
        if (hasVideos && !hasImages) return 'video';
        return 'photo';
    };

    // Ordenar: destacados primero (sin importar fecha), luego por fecha de creación (más nueva primero)
    const sortedPosts = useMemo(() => {
        return [...publishedPosts].sort((a, b) => {
            // Primero destacados (sin importar fecha de creación)
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;

            // Si ambos son destacados o ambos no son destacados, ordenar por fecha de creación
            // Usar created_at si está disponible, sino published_at como fallback
            const dateA = a.created_at
                ? new Date(a.created_at).getTime()
                : (a.published_at ? new Date(a.published_at).getTime() : 0);
            const dateB = b.created_at
                ? new Date(b.created_at).getTime()
                : (b.published_at ? new Date(b.published_at).getTime() : 0);
            return dateB - dateA; // Más nueva primero
        });
    }, [publishedPosts]);

    // Filtrar posts según filtro seleccionado
    const filteredPosts = useMemo(() => {
        if (filter === 'all') return sortedPosts;
        
        return sortedPosts.filter(post => {
            const postType = getPostType(post);
            
            if (filter === 'photos') {
                // Mostrar: solo fotos O mixtos (que tienen fotos)
                return postType === 'photo' || postType === 'mixed';
            }
            
            if (filter === 'videos') {
                // Mostrar: solo videos O mixtos (que tienen videos)
                return postType === 'video' || postType === 'mixed';
            }
            
            return true;
        });
    }, [sortedPosts, filter]);

    if (sortedPosts.length === 0) {
        return (
            <div className="p-8 text-center">
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    No hay publicaciones aún
                </h3>
                <p className="text-sm text-zinc-500">
                    Este estudio aún no ha compartido su trabajo
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-0">
            {/* Posts filtrados */}
            {filteredPosts.length === 0 ? (
                <div className="p-8 text-center">
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">
                        No hay publicaciones con este filtro
                    </h3>
                    <p className="text-sm text-zinc-500">
                        Prueba con otro filtro para ver más contenido
                    </p>
                </div>
            ) : (
                filteredPosts.map((post, index) => (
                    <React.Fragment key={post.id}>
                        {/* Separador zinc-700 */}
                        {index > 0 && (
                            <div className="border-t border-zinc-700" />
                        )}

                        {/* Post con Analytics Tracking */}
                        <div className="py-6 px-4">
                            <PostFeedCardWithTracking
                                post={post}
                                studioId={studioId || ''}
                                ownerUserId={ownerUserId}
                                onPostClick={onPostClick}
                                onEditPost={onEditPost}
                            />
                        </div>
                    </React.Fragment>
                ))
            )}
        </div>
    );
}
