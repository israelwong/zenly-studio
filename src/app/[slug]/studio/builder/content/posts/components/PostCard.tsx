"use client";

import { useState, useRef, useEffect } from "react";
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
import { useStorageRefresh } from "@/hooks/useStorageRefresh";

interface PostCardProps {
    post: StudioPost;
    studioSlug: string;
    onUpdate: (updatedPost: StudioPost | null) => void; // null para eliminación
}

export function PostCard({ post, studioSlug, onUpdate }: PostCardProps) {
    const router = useRouter();
    const { triggerRefresh } = useStorageRefresh(studioSlug);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [isTogglingFeatured, setIsTogglingFeatured] = useState(false);
    const [localPost, setLocalPost] = useState<StudioPost>(post);

    // Sincronizar post local cuando cambia el prop
    useEffect(() => {
        setLocalPost(post);
    }, [post]);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("¿Estás seguro de que quieres eliminar este post?")) {
            return;
        }

        setIsDeleting(true);
        try {
            const result = await deleteStudioPost(localPost.id);
            if (result.success) {
                toast.success("Post eliminado");
                // Actualizar almacenamiento
                triggerRefresh();
                // Notificar eliminación (null = eliminar)
                onUpdate(null);
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

        // Actualización optimista
        const newPublishedState = !localPost.is_published;
        const optimisticPost: StudioPost = {
            ...localPost,
            is_published: newPublishedState,
            // Si se despublica y está destacado, quitar también el destacado
            is_featured: newPublishedState ? localPost.is_featured : false
        };
        setLocalPost(optimisticPost);
        onUpdate(optimisticPost);

        setIsToggling(true);
        try {
            const result = await toggleStudioPostPublish(localPost.id);
            if (result.success) {
                toast.success(
                    newPublishedState ? "Post publicado" : "Post despublicado"
                );
                // La actualización optimista ya aplicó el cambio
                // PostsList recargará desde el servidor en background para sincronización completa
            } else {
                // Revertir en caso de error
                setLocalPost(post);
                onUpdate(post);
                toast.error(result.error || "Error al cambiar estado");
            }
        } catch (error) {
            // Revertir en caso de error
            setLocalPost(post);
            onUpdate(post);
            toast.error("Error al cambiar estado");
        } finally {
            setIsToggling(false);
        }
    };

    const handleToggleFeatured = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Actualización optimista
        const newFeaturedState = !localPost.is_featured;
        const optimisticPost: StudioPost = {
            ...localPost,
            is_featured: newFeaturedState,
            // Si se destaca un post no publicado, publicarlo automáticamente
            // Si se quita el destacado, mantener el estado de publicación actual
            is_published: newFeaturedState && !localPost.is_published
                ? true
                : localPost.is_published,
            published_at: newFeaturedState && !localPost.is_published
                ? new Date()
                : localPost.published_at
        };
        setLocalPost(optimisticPost);
        onUpdate(optimisticPost);

        setIsTogglingFeatured(true);
        try {
            const result = await updateStudioPost(localPost.id, {
                is_featured: newFeaturedState
            });
            if (result.success) {
                // Si se destacó un post no publicado, mencionar que se publicó automáticamente
                if (newFeaturedState && !localPost.is_published) {
                    toast.success("Post destacado y publicado automáticamente");
                } else {
                    toast.success(
                        newFeaturedState ? "Post destacado" : "Post desmarcado como destacado"
                    );
                }
                // Actualizar con datos del servidor (que incluyen la publicación automática si aplica)
                if (result.data) {
                    setLocalPost(result.data);
                    onUpdate(result.data);
                } else {
                    // Fallback: usar el estado optimista que ya está aplicado
                    // PostsList recargará desde el servidor en background
                }
            } else {
                // Revertir en caso de error
                setLocalPost(post);
                onUpdate(post);
                toast.error(result.error || "Error al cambiar destacado");
            }
        } catch (error) {
            // Revertir en caso de error
            setLocalPost(post);
            onUpdate(post);
            toast.error("Error al cambiar destacado");
        } finally {
            setIsTogglingFeatured(false);
        }
    };

    const getCoverImage = () => {
        if (!localPost.media || localPost.media.length === 0) return null;
        const media = Array.isArray(localPost.media) ? localPost.media : [];
        const coverIndex = Math.min(localPost.cover_index || 0, media.length - 1);
        return media[coverIndex];
    };

    const coverImage = getCoverImage();

    // Para videos, siempre usar thumbnail_url como prioridad (frame 1)
    // Para imágenes, usar thumbnail_url si existe, sino file_url
    const imageUrl = coverImage
        ? (coverImage.file_type === 'video'
            ? coverImage.thumbnail_url || null
            : (coverImage.thumbnail_url || coverImage.file_url))
        : null;
    const isValidImageUrl = imageUrl && imageUrl.trim() !== "";

    // Video ref para capturar frame 1 si no hay thumbnail_url
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);

    // Capturar frame 1 del video si no hay thumbnail_url
    useEffect(() => {
        if (coverImage?.file_type === 'video' && !coverImage.thumbnail_url && coverImage.file_url) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas) return;

            const captureFrame = () => {
                try {
                    video.currentTime = 0.1; // Ir al primer frame
                    const onSeeked = () => {
                        const ctx = canvas.getContext('2d');
                        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            setVideoThumbnail(dataUrl);
                        }
                    };
                    video.addEventListener('seeked', onSeeked, { once: true });
                } catch (error) {
                    console.error('Error capturing video frame:', error);
                }
            };

            video.addEventListener('loadedmetadata', captureFrame, { once: true });
            video.load();

            return () => {
                video.removeEventListener('loadedmetadata', captureFrame);
            };
        }
    }, [coverImage?.file_type, coverImage?.file_url, coverImage?.thumbnail_url]);

    // Truncar descripción a 100 caracteres y remover markdown básico
    const truncateText = (text: string, maxLength: number) => {
        // Remover markdown básico
        const cleanText = text
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

    const truncatedCaption = localPost.caption ? truncateText(localPost.caption, 100) : null;

    // Mostrar hasta 3 tags, si hay más mostrar +
    const visibleTags = localPost.tags?.slice(0, 3) || [];
    const remainingTagsCount = localPost.tags && localPost.tags.length > 3 ? localPost.tags.length - 3 : 0;

    // Formatear fecha de publicación
    const publishedDate = localPost.published_at
        ? new Date(localPost.published_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
        : null;

    const handleCardClick = () => {
        router.push(`/${studioSlug}/studio/builder/content/posts/${localPost.id}/editar`);
    };

    return (
        <ZenCard
            className="overflow-hidden hover:bg-zinc-800/50 transition-colors cursor-pointer relative"
            onClick={handleCardClick}
        >
            <div className="flex gap-4 p-4">
                {/* Columna 1: Portada */}
                <div className="relative w-32 h-32 flex-shrink-0 bg-zinc-800 rounded-lg overflow-hidden">
                    {/* Video oculto para capturar frame si no hay thumbnail_url */}
                    {coverImage?.file_type === 'video' && !coverImage.thumbnail_url && (
                        <>
                            <video
                                ref={videoRef}
                                src={coverImage.file_url}
                                className="hidden"
                                preload="metadata"
                                muted
                                crossOrigin="anonymous"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                        </>
                    )}

                    {coverImage?.file_type === 'video' ? (
                        // Video: usar thumbnail_url o frame capturado
                        (coverImage.thumbnail_url || videoThumbnail) ? (
                            <>
                                <Image
                                    src={coverImage.thumbnail_url || videoThumbnail!}
                                    alt={localPost.title || "Post"}
                                    fill
                                    className="object-cover"
                                    unoptimized={!!videoThumbnail}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Video className="w-6 h-6 text-white" />
                                </div>
                            </>
                        ) : (
                            // Fallback mientras carga/captura frame
                            <div className="w-full h-full flex items-center justify-center bg-black/50">
                                <Video className="w-6 h-6 text-white" />
                            </div>
                        )
                    ) : isValidImageUrl ? (
                        // Imagen normal
                        <Image
                            src={imageUrl!}
                            alt={localPost.title || "Post"}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            <ImageIcon className="w-8 h-8" />
                        </div>
                    )}

                    {/* Badge cantidad de media */}
                    {localPost.media && Array.isArray(localPost.media) && localPost.media.length > 0 && (() => {
                        const videoCount = localPost.media.filter(m => m.file_type === 'video').length;
                        const imageCount = localPost.media.filter(m => m.file_type === 'image').length;
                        const isOnlyVideo = videoCount > 0 && imageCount === 0;
                        const isOnlyImage = imageCount > 0 && videoCount === 0;

                        let label = '';
                        if (isOnlyVideo) {
                            label = localPost.media.length === 1 ? 'video' : 'videos';
                        } else if (isOnlyImage) {
                            label = localPost.media.length === 1 ? 'foto' : 'fotos';
                        } else {
                            label = localPost.media.length === 1 ? 'archivo' : 'archivos';
                        }

                        return (
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-xs rounded">
                                {localPost.media.length} {label}
                            </div>
                        );
                    })()}
                </div>

                {/* Columna 2: Contenido */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Línea 1: Publicado - Fecha [dot] Vistas [menu modal] */}
                    <div className="flex items-center gap-2">
                        {/* Estado publicado */}
                        <span className="text-xs text-zinc-400">
                            {localPost.is_published ? 'Publicado' : 'No publicado'}
                        </span>

                        {/* Indicador de destacado */}
                        {localPost.is_featured && (
                            <span title="Post destacado" className="flex items-center">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            </span>
                        )}

                        {/* Separador y fecha de publicación - mostrar siempre si existe */}
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
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${localPost.is_published ? 'bg-emerald-500' : 'bg-zinc-500'
                                }`}
                            title={localPost.is_published ? 'Publicado' : 'No publicado'}
                        />

                        {/* Separador */}
                        <span className="text-zinc-700">—</span>

                        {/* Vistas */}
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                            {localPost.view_count || 0} {localPost.view_count === 1 ? 'vista' : 'vistas'}
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
                                        {localPost.is_published ? (
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
                                        <Star className={`w-4 h-4 mr-2 ${localPost.is_featured ? 'text-amber-400' : ''}`} />
                                        {localPost.is_featured ? 'Quitar destacado' : 'Destacar'}
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
                        {localPost.title || "Sin título"}
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
