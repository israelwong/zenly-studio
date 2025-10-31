"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ZenCard, ZenBadge, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from "@/components/ui/zen";
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Star,
    Calendar,
    MoreVertical,
    ImageIcon,
    Video
} from "lucide-react";
import {
    deleteStudioPost,
    toggleStudioPostPublish,
    updateStudioPost
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
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [isTogglingFeatured, setIsTogglingFeatured] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
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

    const handleTogglePublish = async (e: React.MouseEvent) => {
        e.stopPropagation();
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

    const handleToggleFeatured = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsTogglingFeatured(true);
        try {
            const result = await updateStudioPost(post.id, {
                is_featured: !post.is_featured
            });
            if (result.success) {
                toast.success(
                    post.is_featured ? "Post desmarcado como destacado" : "Post destacado"
                );
                onUpdate();
            } else {
                toast.error(result.error || "Error al cambiar destacado");
            }
        } catch (error) {
            toast.error("Error al cambiar destacado");
        } finally {
            setIsTogglingFeatured(false);
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
        ? (coverImage.thumbnail_url || coverImage.file_url)
        : null;
    const isValidImageUrl = imageUrl && imageUrl.trim() !== "";

    // Truncar descripción a 100 caracteres y remover markdown básico
    const truncateText = (text: string, maxLength: number) => {
        // Remover markdown básico
        let cleanText = text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links markdown
            .replace(/#{1,6}\s+/g, '') // Headers
            .replace(/`([^`]+)`/g, '$1') // Code
            .trim();
        
        if (cleanText.length > maxLength) {
            return cleanText.substring(0, maxLength) + "...";
        }
        return cleanText;
    };

    const truncatedCaption = post.caption ? truncateText(post.caption, 100) : null;

    // Mostrar hasta 3 tags, si hay más mostrar +
    const visibleTags = post.tags?.slice(0, 3) || [];
    const remainingTagsCount = post.tags && post.tags.length > 3 ? post.tags.length - 3 : 0;

    // Formatear fecha de publicación
    const publishedDate = post.published_at 
        ? new Date(post.published_at).toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        })
        : null;

    const handleCardClick = () => {
        router.push(`/${studioSlug}/studio/builder/content/posts/${post.id}/editar`);
    };

    return (
        <ZenCard 
            className="overflow-hidden hover:bg-zinc-800/50 transition-colors cursor-pointer relative"
            onClick={handleCardClick}
        >
            <div className="flex gap-4 p-4">
                {/* Columna 1: Portada */}
                <div className="relative w-32 h-32 flex-shrink-0 bg-zinc-800 rounded-lg overflow-hidden">
                    {isValidImageUrl ? (
                        <>
                            <Image
                                src={imageUrl}
                                alt={post.title || "Post"}
                                fill
                                className="object-cover"
                            />
                            {coverImage?.file_type === 'video' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Video className="w-6 h-6 text-white" />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            <ImageIcon className="w-8 h-8" />
                        </div>
                    )}
                    
                    {/* Badge cantidad de fotos */}
                    {post.media && Array.isArray(post.media) && post.media.length > 0 && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-xs rounded">
                            {post.media.length} {post.media.length === 1 ? 'foto' : 'fotos'}
                        </div>
                    )}
                </div>

                {/* Columna 2: Contenido */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Línea 1: Publicado - Fecha [dot] Vistas [menu modal] */}
                    <div className="flex items-center gap-2">
                        {/* Estado publicado */}
                        <span className="text-xs text-zinc-400">
                            {post.is_published ? 'Publicado' : 'No publicado'}
                        </span>

                        {/* Separador */}
                        {publishedDate && (
                            <>
                                <span className="text-zinc-600">—</span>
                                <span className="text-xs text-zinc-500">{publishedDate}</span>
                            </>
                        )}

                        {/* Espaciado para dot */}
                        <span className="w-2" />

                        {/* Dot status de publicación */}
                        <div 
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                post.is_published ? 'bg-emerald-500' : 'bg-zinc-500'
                            }`}
                            title={post.is_published ? 'Publicado' : 'No publicado'}
                        />

                        {/* Separador */}
                        <span className="text-zinc-700">—</span>

                        {/* Vistas */}
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                            {post.view_count || 0} {post.view_count === 1 ? 'vista' : 'vistas'}
                        </span>

                        {/* Menú de acciones - Alineado a la derecha */}
                        <div className="ml-auto">
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger 
                                asChild
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    className="p-1 hover:bg-zinc-700/50 rounded transition-colors ml-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="w-4 h-4 text-zinc-400" />
                                </button>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <ZenDropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCardClick();
                                    }}
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                </ZenDropdownMenuItem>
                                
                                <ZenDropdownMenuItem
                                    onClick={handleTogglePublish}
                                    disabled={isToggling}
                                >
                                    {post.is_published ? (
                                        <>
                                            <EyeOff className="w-4 h-4 mr-2" />
                                            No publicar
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-4 h-4 mr-2" />
                                            Publicar
                                        </>
                                    )}
                                </ZenDropdownMenuItem>

                                <ZenDropdownMenuItem
                                    onClick={handleToggleFeatured}
                                    disabled={isTogglingFeatured}
                                >
                                    <Star className={`w-4 h-4 mr-2 ${post.is_featured ? 'text-amber-400' : ''}`} />
                                    {post.is_featured ? 'Quitar destacado' : 'Destacar'}
                                </ZenDropdownMenuItem>

                                <ZenDropdownMenuSeparator />

                                <ZenDropdownMenuItem
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="text-red-400 focus:text-red-300"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                        </div>
                    </div>

                    {/* Línea 2: Título */}
                    <h3 className="font-medium text-zinc-100 line-clamp-1">
                        {post.title || "Sin título"}
                    </h3>

                    {/* Línea 3: Descripción truncada */}
                    {truncatedCaption && (
                        <p className="text-sm text-zinc-400 line-clamp-2">
                            {truncatedCaption}
                        </p>
                    )}

                    {/* Línea 4: Palabras clave con hashtag (sin badge) */}
                    {visibleTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            {visibleTags.map((tag, index) => (
                                <span key={index} className="text-xs text-zinc-500">
                                    #{tag}
                                </span>
                            ))}
                            {remainingTagsCount > 0 && (
                                <span className="text-xs text-zinc-500 font-medium">
                                    +{remainingTagsCount}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </ZenCard>
    );
}
