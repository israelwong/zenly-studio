import React, { useMemo } from 'react';
import { PostFeedCard } from './PostFeedCard';

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
    caption: string | null;
    tags?: string[];
    media: PostMedia[];
    is_published: boolean;
    is_featured: boolean;
    published_at: Date | null;
}

interface MainSectionProps {
    posts: PublicPost[];
}

/**
 * MainSection - Feed de inicio con posts
 * Diseño consistente, fluido y usable con separadores entre posts
 * Ordenamiento: destacados primero, luego por fecha (más nueva primero)
 */
export function MainSection({ posts }: MainSectionProps) {
    // Filtrar solo posts publicados
    const publishedPosts = posts.filter(post => post.is_published);

    // Ordenar: destacados primero, luego por fecha (más nueva primero)
    const sortedPosts = useMemo(() => {
        return [...publishedPosts].sort((a, b) => {
            // Primero destacados
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;

            // Luego por fecha (más nueva primero)
            const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
            const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
            return dateB - dateA;
        });
    }, [publishedPosts]);

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
            {sortedPosts.map((post, index) => (
                <React.Fragment key={post.id}>
                    {/* Separador zinc-700 */}
                    {index > 0 && (
                        <div className="border-t border-zinc-700" />
                    )}

                    {/* Post */}
                    <div className="py-6 px-4">
                        <PostFeedCard post={post} />
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}
