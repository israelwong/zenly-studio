"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ZenCard, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator, ZenConfirmModal } from "@/components/ui/zen";
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Star,
    MoreVertical,
    Video,
    Grid3X3,
    HardDrive,
    Copy
} from "lucide-react";
import {
    deleteStudioPortfolio,
    toggleStudioPortfolioPublish,
    updateStudioPortfolio,
    getStudioPortfolioById,
    createStudioPortfolioFromSlug
} from "@/lib/actions/studio/builder/portfolios/portfolios.actions";
import { toast } from "sonner";
import { MediaItem } from "@/lib/actions/schemas/post-schemas";
import { StudioPortfolio } from "@/types/studio-portfolios";
import { formatBytes } from "@/lib/utils/storage";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";

interface PortfolioCardProps {
    portfolio: StudioPortfolio;
    studioSlug: string;
    onUpdate: (updatedPortfolio: StudioPortfolio | null) => void; // null para eliminación
    onDuplicatingStart?: () => void; // Callback cuando inicia la duplicación
}

// Helper para generar slug desde título
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export function PortfolioCard({ portfolio, studioSlug, onUpdate, onDuplicatingStart }: PortfolioCardProps) {
    const router = useRouter();
    const { triggerRefresh, triggerLocalUpdate } = useStorageRefresh(studioSlug);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [isTogglingFeatured, setIsTogglingFeatured] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [localPortfolio, setLocalPortfolio] = useState<StudioPortfolio>(portfolio);

    // Sincronizar portfolio local cuando cambia el prop
    useEffect(() => {
        setLocalPortfolio(portfolio);
    }, [portfolio]);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            // Calcular storage del portfolio antes de eliminarlo
            const portfolioMedia = localPortfolio.media || [];
            const portfolioTotalBytes = portfolioMedia.reduce((total, item) => {
                const bytes = typeof item.storage_bytes === 'bigint'
                    ? Number(item.storage_bytes)
                    : (item.storage_bytes || 0);
                return total + bytes;
            }, 0);

            const result = await deleteStudioPortfolio(localPortfolio.id);
            if (result.success) {
                toast.success("Portfolio eliminado");
                // Actualizar almacenamiento localmente (restar bytes)
                if (portfolioTotalBytes > 0) {
                    triggerLocalUpdate(-portfolioTotalBytes);
                }
                onUpdate(null);
                setShowDeleteModal(false);
            } else {
                toast.error(result.error || "Error al eliminar portfolio");
            }
        } catch (error) {
            toast.error("Error al eliminar portfolio");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTogglePublish = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Actualización optimista
        const newPublishedState = !localPortfolio.is_published;
        const optimisticPortfolio: StudioPortfolio = {
            ...localPortfolio,
            is_published: newPublishedState,
            // Si se despublica y está destacado, quitar también el destacado
            is_featured: newPublishedState ? localPortfolio.is_featured : false
        };
        setLocalPortfolio(optimisticPortfolio);
        onUpdate(optimisticPortfolio);

        setIsToggling(true);
        try {
            const result = await toggleStudioPortfolioPublish(localPortfolio.id);
            if (result.success) {
                toast.success(
                    newPublishedState ? "Portfolio publicado" : "Portfolio despublicado"
                );
                // La actualización optimista ya aplicó el cambio
                // PortfoliosList recargará desde el servidor en background para sincronización completa
            } else {
                // Revertir en caso de error
                setLocalPortfolio(portfolio);
                onUpdate(portfolio);
                toast.error(result.error || "Error al cambiar estado");
            }
        } catch (error) {
            // Revertir en caso de error
            setLocalPortfolio(portfolio);
            onUpdate(portfolio);
            toast.error("Error al cambiar estado");
        } finally {
            setIsToggling(false);
        }
    };

    const handleToggleFeatured = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Actualización optimista
        const newFeaturedState = !localPortfolio.is_featured;
        const optimisticPortfolio: StudioPortfolio = {
            ...localPortfolio,
            is_featured: newFeaturedState,
            // Si se destaca un portfolio no publicado, publicarlo automáticamente
            // Si se quita el destacado, mantener el estado de publicación actual
            is_published: newFeaturedState && !localPortfolio.is_published
                ? true
                : localPortfolio.is_published,
            published_at: newFeaturedState && !localPortfolio.is_published
                ? new Date()
                : localPortfolio.published_at
        };
        setLocalPortfolio(optimisticPortfolio);
        onUpdate(optimisticPortfolio);

        setIsTogglingFeatured(true);
        try {
            const result = await updateStudioPortfolio(localPortfolio.id, {
                is_featured: newFeaturedState
            });
            if (result.success) {
                // Si se destacó un portfolio no publicado, mencionar que se publicó automáticamente
                if (newFeaturedState && !localPortfolio.is_published) {
                    toast.success("Portfolio destacado y publicado automáticamente");
                } else {
                    toast.success(
                        newFeaturedState ? "Portfolio destacado" : "Portfolio desmarcado como destacado"
                    );
                }
                // Actualizar con datos del servidor (que incluyen la publicación automática si aplica)
                if (result.data) {
                    setLocalPortfolio(result.data as StudioPortfolio);
                    onUpdate(result.data as StudioPortfolio);
                }
            } else {
                // Revertir en caso de error
                setLocalPortfolio(portfolio);
                onUpdate(portfolio);
                toast.error(result.error || "Error al cambiar destacado");
            }
        } catch (error) {
            // Revertir en caso de error
            setLocalPortfolio(portfolio);
            onUpdate(portfolio);
            toast.error("Error al cambiar destacado");
        } finally {
            setIsTogglingFeatured(false);
        }
    };

    const handleDuplicate = async (e: React.MouseEvent) => {
        e.stopPropagation();

        setIsDuplicating(true);
        // Notificar al componente padre que se está duplicando
        if (onDuplicatingStart) {
            onDuplicatingStart();
        }

        try {
            // Obtener el portfolio completo con todas sus relaciones
            const portfolioResult = await getStudioPortfolioById(localPortfolio.id);

            if (!portfolioResult.success || !portfolioResult.data) {
                toast.error("Error al obtener el portfolio para duplicar");
                return;
            }

            const sourcePortfolio = portfolioResult.data;

            // Mapear media items al formato PortfolioFormData
            const duplicatedMedia = (sourcePortfolio.media || []).map(item => ({
                id: undefined, // Sin ID para que se cree nuevo
                file_url: item.file_url,
                file_type: item.file_type as "image" | "video",
                filename: item.filename,
                storage_bytes: Number(item.storage_bytes),
                mime_type: item.mime_type,
                dimensions: item.dimensions as { width: number; height: number } | undefined,
                duration_seconds: item.duration_seconds || undefined,
                display_order: item.display_order,
                alt_text: item.alt_text || undefined,
                thumbnail_url: item.thumbnail_url || undefined,
                storage_path: item.storage_path,
            }));

            // Mapear content blocks al formato PortfolioFormData
            const duplicatedContentBlocks = (sourcePortfolio.content_blocks || []).map(block => ({
                id: undefined, // Sin ID para que se cree nuevo
                type: block.type,
                title: block.title || undefined,
                description: block.description || undefined,
                presentation: block.presentation as 'block' | 'fullwidth',
                order: block.order,
                config: block.config as Record<string, unknown> || undefined,
                media: (block.block_media || []).map(bm => ({
                    id: undefined,
                    file_url: bm.media.file_url,
                    file_type: bm.media.file_type as "image" | "video",
                    filename: bm.media.filename,
                    storage_bytes: Number(bm.media.storage_bytes),
                    thumbnail_url: bm.media.thumbnail_url || undefined,
                    storage_path: bm.media.storage_path || bm.media.file_url,
                })),
            }));

            // Crear título para la copia
            const duplicatedTitle = `${sourcePortfolio.title} (copia)`;
            const duplicatedSlug = generateSlug(duplicatedTitle);

            // Crear el portfolio duplicado
            const duplicateData = {
                title: duplicatedTitle,
                slug: duplicatedSlug,
                description: sourcePortfolio.description || null,
                caption: sourcePortfolio.caption || null,
                cover_image_url: sourcePortfolio.cover_image_url || null,
                media: duplicatedMedia,
                cover_index: sourcePortfolio.cover_index || 0,
                category: sourcePortfolio.category as "portfolio" | "blog" | "promo" | null,
                event_type_id: sourcePortfolio.event_type_id || null,
                tags: sourcePortfolio.tags || [],
                is_featured: false, // La copia no está destacada
                is_published: false, // La copia no está publicada
                content_blocks: duplicatedContentBlocks,
                order: 0,
            };

            const result = await createStudioPortfolioFromSlug(studioSlug, duplicateData);

            if (!result.success) {
                const errorMessage = 'error' in result ? result.error : "Error al duplicar portfolio";
                toast.error(errorMessage);
                return;
            }

            // TypeScript type narrowing: si success es true, data existe
            const successResult = result as { success: true; data: StudioPortfolio };
            toast.success("Portfolio duplicado exitosamente");
            // Actualizar almacenamiento
            triggerRefresh();
            // Notificar al componente padre para que actualice la lista
            onUpdate(successResult.data);
        } catch (error) {
            console.error("Error duplicating portfolio:", error);
            toast.error("Error al duplicar portfolio");
        } finally {
            setIsDuplicating(false);
        }
    };

    const getCoverImage = () => {
        // Prioridad 1: Si cover_image_url está definido, usarlo directamente como portada
        if (localPortfolio.cover_image_url) {
            return {
                url: localPortfolio.cover_image_url,
                file_url: localPortfolio.cover_image_url,
                thumbnail_url: localPortfolio.cover_image_url,
                file_type: 'image' as const,
                filename: 'cover',
                id: 'cover-image',
                storage_path: localPortfolio.cover_image_url
            } as MediaItem;
        }

        // Prioridad 2: Si hay media, usar el índice cover_index para seleccionar el media como portada
        if (localPortfolio.media && localPortfolio.media.length > 0) {
            const media = Array.isArray(localPortfolio.media) ? localPortfolio.media : [];
            const coverIndex = Math.min(localPortfolio.cover_index || 0, media.length - 1);
            return media[coverIndex];
        }

        // Sin portada disponible
        return null;
    };

    const coverImage = getCoverImage();

    // Para videos, siempre usar thumbnail_url como prioridad (frame 1)
    // Para imágenes, usar thumbnail_url si existe, sino file_url
    const imageUrl = coverImage
        ? (coverImage.file_type === 'video'
            ? coverImage.thumbnail_url || null
            : (coverImage.thumbnail_url || coverImage.file_url || (coverImage as { url?: string }).url))
        : null;
    const isValidImageUrl = imageUrl && imageUrl.trim() !== "";

    // Video ref para capturar frame 1 si no hay thumbnail_url
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);

    // Capturar frame 1 del video si no hay thumbnail_url
    useEffect(() => {
        if (coverImage?.file_type === 'video' && !coverImage.thumbnail_url && (coverImage.file_url || (coverImage as { url?: string }).url)) {
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
        } else {
            // Si no es video o ya tiene thumbnail, limpiar el estado
            setVideoThumbnail(null);
        }
    }, [coverImage]);

    // Formatear fecha de publicación
    const publishedDate = localPortfolio.published_at
        ? new Date(localPortfolio.published_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
        : null;

    const handleCardClick = () => {
        router.push(`/${studioSlug}/studio/builder/content/portfolios/${localPortfolio.id}/editar`);
    };

    // Mostrar hasta 3 tags, si hay más mostrar +
    const visibleTags = localPortfolio.tags?.slice(0, 3) || [];
    const remainingTagsCount = localPortfolio.tags && localPortfolio.tags.length > 3 ? localPortfolio.tags.length - 3 : 0;

    return (
        <ZenCard
            className="overflow-hidden hover:bg-zinc-800/50 transition-colors cursor-pointer relative"
            onClick={handleCardClick}
        >
            <div className="flex gap-4 p-4">
                {/* Columna 1: Portada */}
                <div className="relative w-32 h-32 flex-shrink-0 bg-zinc-800 rounded-lg overflow-hidden">
                    {/* Video oculto para capturar frame si no hay thumbnail_url */}
                    {coverImage?.file_type === 'video' && !coverImage.thumbnail_url && (coverImage.file_url || (coverImage as { url?: string }).url) && (
                        <>
                            <video
                                ref={videoRef}
                                src={coverImage.file_url || (coverImage as { url?: string }).url}
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
                                    alt={localPortfolio.title || "Portfolio"}
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
                            alt={localPortfolio.title || "Portfolio"}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            <Grid3X3 className="w-8 h-8" />
                        </div>
                    )}

                    {/* Badge cantidad de media */}
                    {localPortfolio.media && Array.isArray(localPortfolio.media) && localPortfolio.media.length > 0 && (() => {
                        const videoCount = localPortfolio.media.filter(m => m.file_type === 'video').length;
                        const imageCount = localPortfolio.media.filter(m => m.file_type === 'image').length;
                        const isOnlyVideo = videoCount > 0 && imageCount === 0;
                        const isOnlyImage = imageCount > 0 && videoCount === 0;

                        let label = '';
                        if (isOnlyVideo) {
                            label = localPortfolio.media.length === 1 ? 'video' : 'videos';
                        } else if (isOnlyImage) {
                            label = localPortfolio.media.length === 1 ? 'foto' : 'fotos';
                        } else {
                            label = localPortfolio.media.length === 1 ? 'archivo' : 'archivos';
                        }

                        return (
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white text-xs rounded">
                                {localPortfolio.media.length} {label}
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
                            {localPortfolio.is_published ? 'Publicado' : 'No publicado'}
                        </span>

                        {/* Indicador de destacado */}
                        {localPortfolio.is_featured && (
                            <span title="Portfolio destacado" className="flex items-center">
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
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${localPortfolio.is_published ? 'bg-emerald-500' : 'bg-zinc-500'
                                }`}
                            title={localPortfolio.is_published ? 'Publicado' : 'No publicado'}
                        />

                        {/* Separador */}
                        <span className="text-zinc-700">—</span>

                        {/* Vistas */}
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                            {localPortfolio.view_count || 0} {localPortfolio.view_count === 1 ? 'vista' : 'vistas'}
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
                                        {localPortfolio.is_published ? (
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
                                        <Star className={`w-4 h-4 mr-2 ${localPortfolio.is_featured ? 'text-amber-400' : ''}`} />
                                        {localPortfolio.is_featured ? 'Quitar destacado' : 'Destacar'}
                                    </ZenDropdownMenuItem>

                                    <ZenDropdownMenuSeparator />

                                    <ZenDropdownMenuItem
                                        onClick={handleDuplicate}
                                        disabled={isDuplicating}
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Duplicar
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
                        {localPortfolio.title || "Sin título"}
                    </h3>

                    {/* Peso del portfolio - debajo del título */}
                    {(() => {
                        const portfolioMedia = localPortfolio.media || [];
                        const totalBytes = portfolioMedia.reduce((total, item) => {
                            const bytes = typeof item.storage_bytes === 'bigint'
                                ? Number(item.storage_bytes)
                                : (item.storage_bytes || 0);
                            return total + bytes;
                        }, 0);
                        return totalBytes > 0 ? (
                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                                <HardDrive className="w-3 h-3" />
                                {formatBytes(totalBytes)}
                            </p>
                        ) : null;
                    })()}

                    {/* Línea 3: Descripción */}
                    {(localPortfolio.description || localPortfolio.caption) && (
                        <p className="text-sm text-zinc-400 line-clamp-2">
                            {localPortfolio.description || localPortfolio.caption}
                        </p>
                    )}

                    {/* Línea 4: Categoría y Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {localPortfolio.category && (
                            <span className="text-xs text-zinc-500 capitalize">
                                {localPortfolio.category}
                            </span>
                        )}
                        {visibleTags.length > 0 && (
                            <>
                                {localPortfolio.category && <span className="text-zinc-600">—</span>}
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
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ZenConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar portfolio"
                description="¿Estás seguro de que quieres eliminar este portfolio? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeleting}
            />
        </ZenCard>
    );
}
