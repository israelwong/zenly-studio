"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ZenButton, ZenCard } from "@/components/ui/zen";
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Star,
    Calendar,
    MoreVertical
} from "lucide-react";
import {
    deleteStudioPost,
    toggleStudioPostPublish
} from "@/lib/actions/studio/builder/posts";
import { toast } from "sonner";
import { MediaItem } from "@/lib/actions/schemas/post-schemas";
import { StudioPost } from "@/types/studio-posts";

interface PostCardProps {
    post: StudioPost;
    studioSlug: string;
    onUpdate: () => void;
}

export function PostCard({ post, studioSlug, onUpdate }: PostCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de que quieres eliminar este post?")) {
            return;
        }

        setIsDeleting(true);
        try {
            const result = await deleteStudioPost(post.id);
            if (result.success) {
                toast.success("Post eliminado");
                onUpdate();
            } else {
                toast.error(result.error || "Error al eliminar post");
            }
        } catch (error) {
            toast.error("Error al eliminar post");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTogglePublish = async () => {
        setIsToggling(true);
        try {
            const result = await toggleStudioPostPublish(post.id);
            if (result.success) {
                toast.success(
                    post.is_published ? "Post despublicado" : "Post publicado"
                );
                onUpdate();
            } else {
                toast.error(result.error || "Error al cambiar estado");
            }
        } catch (error) {
            toast.error("Error al cambiar estado");
        } finally {
            setIsToggling(false);
        }
    };

    const getCoverImage = () => {
        if (!post.media || post.media.length === 0) return null;
        const media = Array.isArray(post.media) ? post.media : [];
        const coverIndex = Math.min(post.cover_index || 0, media.length - 1);
        return media[coverIndex];
    };

    const coverImage = getCoverImage();
    
    // Obtener URL válida para la imagen (no vacía)
    const imageUrl = coverImage 
        ? (coverImage.thumbnail_url || coverImage.url || coverImage.file_url)
        : null;
    const isValidImageUrl = imageUrl && imageUrl.trim() !== "";

    return (
        <ZenCard className="overflow-hidden">
            {/* Cover Image */}
            <div className="aspect-square relative bg-zinc-800">
                {isValidImageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={post.title || "Post"}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <Calendar className="w-12 h-12" />
                    </div>
                )}

                {/* Status Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                    {post.is_featured && (
                        <div className="px-2 py-1 bg-yellow-500 text-black text-xs font-medium rounded">
                            <Star className="w-3 h-3 inline mr-1" />
                            Destacado
                        </div>
                    )}
                    {post.is_published ? (
                        <div className="px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded">
                            <Eye className="w-3 h-3 inline mr-1" />
                            Publicado
                        </div>
                    ) : (
                        <div className="px-2 py-1 bg-zinc-600 text-white text-xs font-medium rounded">
                            <EyeOff className="w-3 h-3 inline mr-1" />
                            Borrador
                        </div>
                    )}
                </div>

                {/* Media Count */}
                {post.media && Array.isArray(post.media) && post.media.length > 1 && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded">
                        {post.media.length} fotos
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Title */}
                <div>
                    <h3 className="font-medium text-zinc-100 line-clamp-2">
                        {post.title || "Sin título"}
                    </h3>
                    {post.caption && (
                        <p className="text-sm text-zinc-400 line-clamp-2 mt-1">
                            {post.caption}
                        </p>
                    )}
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-end text-xs text-zinc-500">
                    <span>{post.created_at.toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Link href={`/${studioSlug}/studio/builder/content/posts/${post.id}/editar`}>
                        <ZenButton size="sm" variant="secondary" className="flex-1">
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                        </ZenButton>
                    </Link>

                    <ZenButton
                        size="sm"
                        variant="secondary"
                        onClick={handleTogglePublish}
                        disabled={isToggling}
                    >
                        {post.is_published ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </ZenButton>

                    <ZenButton
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        <Trash2 className="w-4 h-4" />
                    </ZenButton>
                </div>
            </div>
        </ZenCard>
    );
}
