import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Image, Video, Eye, Calendar, Tag } from 'lucide-react';

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
    title: string | null;
    caption: string | null;
    category: string;
    event_type?: {
        id: string;
        nombre: string;
    } | null;
    tags: string[];
    is_featured: boolean;
    is_published: boolean;
    published_at: Date | null;
    view_count: number;
    media: PostMedia[];
    cover_index: number;
    cta_enabled: boolean;
    cta_text: string | null;
    cta_action: string | null;
    cta_link: string | null;
}

interface PostSectionProps {
    posts: PublicPost[];
}

/**
 * PostSection - Sección específica de posts/publicaciones
 * Muestra los posts del estudio de forma organizada
 */
export function PostSection({ posts }: PostSectionProps) {
    // Filtrar solo posts publicados
    const publishedPosts = posts.filter(post => post.is_published);

    if (publishedPosts.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="text-zinc-400 mb-2">
                    <Image className="h-12 w-12 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    Sin publicaciones
                </h3>
                <p className="text-sm text-zinc-500">
                    Aún no hay posts publicados disponibles
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                    Nuestras Publicaciones
                </h2>
                <p className="text-zinc-400">
                    Descubre nuestro trabajo y proyectos recientes
                </p>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {publishedPosts.map((post) => {
                    const coverMedia = post.media[post.cover_index] || post.media[0];

                    return (
                        <ZenCard key={post.id} className="overflow-hidden">
                            <ZenCardHeader>
                                <div className="flex items-center justify-between">
                                    <ZenCardTitle className="text-lg">
                                        {post.title || 'Sin título'}
                                    </ZenCardTitle>
                                    <div className="flex items-center gap-2">
                                        {post.is_featured && (
                                            <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                                                Destacado
                                            </span>
                                        )}
                                        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                                            {post.category}
                                        </span>
                                    </div>
                                </div>

                                {post.caption && (
                                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                                        {post.caption}
                                    </p>
                                )}

                                {/* Event Type */}
                                {post.event_type && (
                                    <div className="flex items-center gap-1 mt-2">
                                        <Calendar className="h-3 w-3 text-zinc-500" />
                                        <span className="text-xs text-zinc-500">
                                            {post.event_type.nombre}
                                        </span>
                                    </div>
                                )}

                                {/* Tags */}
                                {post.tags.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                                        <Tag className="h-3 w-3 text-zinc-500" />
                                        {post.tags.slice(0, 3).map((tag, index) => (
                                            <span key={index} className="text-xs text-zinc-500 bg-zinc-800 px-1 py-0.5 rounded">
                                                #{tag}
                                            </span>
                                        ))}
                                        {post.tags.length > 3 && (
                                            <span className="text-xs text-zinc-500">
                                                +{post.tags.length - 3} más
                                            </span>
                                        )}
                                    </div>
                                )}
                            </ZenCardHeader>

                            <ZenCardContent>
                                {/* Cover Media */}
                                {coverMedia ? (
                                    <div className="aspect-video bg-zinc-800 rounded-lg mb-4 overflow-hidden">
                                        {coverMedia.file_type === 'image' ? (
                                            <img
                                                src={coverMedia.file_url}
                                                alt={post.title || 'Post'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="relative w-full h-full">
                                                <video
                                                    src={coverMedia.file_url}
                                                    poster={coverMedia.thumbnail_url}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Video className="h-8 w-8 text-white/80" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="aspect-video bg-zinc-800 rounded-lg mb-4 flex items-center justify-center">
                                        <Image className="h-8 w-8 text-zinc-500" />
                                    </div>
                                )}

                                {/* Media Preview */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-zinc-300">
                                            {post.media.length} elementos
                                        </span>
                                        <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            Ver todo
                                        </button>
                                    </div>

                                    {/* Media Grid Preview */}
                                    {post.media.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {post.media.slice(0, 3).map((media, index) => (
                                                <div key={media.id} className="aspect-square bg-zinc-800 rounded overflow-hidden">
                                                    {media.file_type === 'image' ? (
                                                        <img
                                                            src={media.file_url}
                                                            alt={media.filename}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                                                            <Video className="h-4 w-4 text-zinc-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {post.media.length > 3 && (
                                                <div className="aspect-square bg-zinc-800 rounded flex items-center justify-center">
                                                    <span className="text-xs text-zinc-400">
                                                        +{post.media.length - 3}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* CTA */}
                                {post.cta_enabled && post.cta_text && (
                                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <p className="text-sm text-blue-300 font-medium">
                                            {post.cta_text}
                                        </p>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-700">
                                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            {post.view_count} vistas
                                        </span>
                                        {post.published_at && (
                                            <span>
                                                {new Date(post.published_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </ZenCardContent>
                        </ZenCard>
                    );
                })}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                        {publishedPosts.length}
                    </div>
                    <div className="text-sm text-zinc-400">Posts</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                        {publishedPosts.reduce((total, post) => total + post.media.length, 0)}
                    </div>
                    <div className="text-sm text-zinc-400">Elementos</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                        {publishedPosts.reduce((total, post) => total + post.view_count, 0)}
                    </div>
                    <div className="text-sm text-zinc-400">Vistas</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                        {publishedPosts.filter(p => p.is_featured).length}
                    </div>
                    <div className="text-sm text-zinc-400">Destacados</div>
                </div>
            </div>
        </div>
    );
}
