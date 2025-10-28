import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Image, Video, Eye, Calendar, Tag, Star } from 'lucide-react';
import { ContentBlocksPreview } from '@/components/content-blocks';
import { ContentBlock } from '@/types/content-blocks';

interface PostMedia {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    thumbnail_url?: string;
    display_order: number;
}

interface PostDetail {
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
    content_blocks?: ContentBlock[]; // Agregar soporte para bloques de contenido
}

interface PostDetailSectionProps {
    post: PostDetail;
}

/**
 * PostDetailSection - Vista detallada de un post individual
 * Usado en el editor para preview del post que se está editando
 */
export function PostDetailSection({ post }: PostDetailSectionProps) {
    const coverMedia = post.media[post.cover_index] || post.media[0];

    return (
        <div className="space-y-6">
            {/* Header del Post */}
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">
                    {post.title || 'Sin título'}
                </h1>

                <div className="flex items-center justify-center gap-2 flex-wrap">
                    {post.is_featured && (
                        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Destacado
                        </span>
                    )}
                    <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">
                        {post.category}
                    </span>
                    {post.event_type && (
                        <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                            {post.event_type.nombre}
                        </span>
                    )}
                </div>
            </div>

            {/* Media Principal */}
            {coverMedia && (
                <div className="relative">
                    <ZenCard className="overflow-hidden">
                        <div className="aspect-video relative bg-zinc-800">
                            {coverMedia.file_type === 'image' ? (
                                <img
                                    src={coverMedia.file_url}
                                    alt={post.title || 'Post image'}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <video
                                    src={coverMedia.file_url}
                                    controls
                                    className="w-full h-full object-cover"
                                    poster={coverMedia.thumbnail_url}
                                />
                            )}
                        </div>
                    </ZenCard>
                </div>
            )}

            {/* Descripción */}
            {post.caption && (
                <ZenCard>
                    <ZenCardContent className="p-4">
                        <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {post.caption}
                        </p>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Bloques de Contenido */}
            {post.content_blocks && post.content_blocks.length > 0 && (
                <ContentBlocksPreview blocks={post.content_blocks} />
            )}

            {/* Tags/Palabras Clave */}
            {post.tags && post.tags.length > 0 && (
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="text-sm flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Palabras Clave
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent className="p-4 pt-0">
                        <div className="flex flex-wrap justify-start gap-2">
                            {post.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="text-xs text-zinc-300 bg-zinc-700 px-2 py-0.5 rounded-full border border-zinc-600 text-center"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Media Adicional */}
            {post.media.length > 1 && (
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle className="text-sm">
                            Galería ({post.media.length} elementos)
                        </ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent className="p-4 pt-0">
                        <div className="grid grid-cols-2 gap-2">
                            {post.media.slice(0, 4).map((media, index) => (
                                <div key={media.id} className="aspect-square relative bg-zinc-800 rounded-lg overflow-hidden">
                                    {media.file_type === 'image' ? (
                                        <img
                                            src={media.file_url}
                                            alt={`${post.title} - ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <video
                                            src={media.file_url}
                                            className="w-full h-full object-cover"
                                            poster={media.thumbnail_url}
                                        />
                                    )}
                                    {index === 3 && post.media.length > 4 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                +{post.media.length - 4}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* CTA */}
            {post.cta_enabled && post.cta_text && (
                <ZenCard>
                    <ZenCardContent className="p-4">
                        <div className="text-center space-y-3">
                            <p className="text-zinc-300">{post.cta_text}</p>
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                {post.cta_action === 'whatsapp' && '📱 WhatsApp'}
                                {post.cta_action === 'lead_form' && '📝 Formulario'}
                                {post.cta_action === 'calendar' && '📅 Agendar'}
                            </button>
                        </div>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {post.view_count} vistas
                </div>
                {post.published_at && (
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.published_at).toLocaleDateString()}
                    </div>
                )}
            </div>
        </div>
    );
}
