'use client';

import React, { useMemo } from 'react';
import { VList } from 'virtua';
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
    filter?: FilterType;
    onPostClick?: (postSlug: string) => void;
    onEditPost?: (postId: string) => void;
    studioId?: string;
    ownerUserId?: string | null;
}

/**
 * MainSection - Feed de inicio con posts (Virtual Scrolling)
 * Renderiza solo posts visibles en viewport + overscan para mejor performance
 */
export function MainSection({ posts, filter = 'all', onPostClick, onEditPost, studioId, ownerUserId }: MainSectionProps) {
    const publishedPosts = posts.filter(post => post.is_published);

    const getPostType = (post: PublicPost): 'photo' | 'video' | 'mixed' => {
        const hasImages = post.media.some(m => m.file_type === 'image');
        const hasVideos = post.media.some(m => m.file_type === 'video');
        
        if (hasImages && hasVideos) return 'mixed';
        if (hasVideos && !hasImages) return 'video';
        return 'photo';
    };

    const sortedPosts = useMemo(() => {
        return [...publishedPosts].sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;

            const dateA = a.created_at
                ? new Date(a.created_at).getTime()
                : (a.published_at ? new Date(a.published_at).getTime() : 0);
            const dateB = b.created_at
                ? new Date(b.created_at).getTime()
                : (b.published_at ? new Date(b.published_at).getTime() : 0);
            return dateB - dateA;
        });
    }, [publishedPosts]);

    const filteredPosts = useMemo(() => {
        if (filter === 'all') return sortedPosts;
        
        return sortedPosts.filter(post => {
            const postType = getPostType(post);
            
            if (filter === 'photos') {
                return postType === 'photo' || postType === 'mixed';
            }
            
            if (filter === 'videos') {
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

    if (filteredPosts.length === 0) {
        return (
            <div className="p-8 text-center">
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    No hay publicaciones con este filtro
                </h3>
                <p className="text-sm text-zinc-500">
                    Prueba con otro filtro para ver más contenido
                </p>
            </div>
        );
    }

    return (
        <VList
            data={filteredPosts}
            overscan={2}
            itemSize={400}
        >
            {(post, index) => (
                <React.Fragment key={post.id}>
                    {index > 0 && <div className="border-t border-zinc-700" />}
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
            )}
        </VList>
    );
}
