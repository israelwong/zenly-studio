"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ZenButton, ZenInput, ZenTextarea, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenConfirmModal, ZenBadge, ZenSwitch } from "@/components/ui/zen";
import { Star } from "lucide-react";
import { MobilePreviewFull } from "../../../components/MobilePreviewFull";
import { ImageGrid } from "@/components/shared/media";
import { MediaItem } from "@/types/content-blocks";
import { obtenerIdentidadStudio } from "@/lib/actions/studio/builder/identidad.actions";
import { getStudioPostsBySlug, createStudioPostBySlug, updateStudioPost } from "@/lib/actions/studio/builder/posts";
import { PostFormData, MediaItem as PostMediaItem } from "@/lib/actions/schemas/post-schemas";
import { useTempCuid } from "@/hooks/useTempCuid";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import cuid from "cuid";
import { calculateTotalStorage, formatBytes } from "@/lib/utils/storage";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";

interface PostEditorProps {
    studioSlug: string;
    eventTypes?: { id: string; name: string }[];
    mode: "create" | "edit";
    post?: PostFormData;
}

interface PostItem {
    id: string;
    title?: string | null;
    caption?: string | null;
    tags?: string[];
    media: PostMediaItem[];
    is_published?: boolean;
    published_at?: Date;
    view_count?: number;
    [key: string]: unknown;
}

interface StudioData {
    studio_name?: string;
    logo_url?: string | null;
    slogan?: string;
    address?: string;
    maps_url?: string;
}

interface PreviewData {
    studio_name?: string;
    logo_url?: string | null;
    slogan?: string;
    posts?: PostItem[];
    studio?: unknown;
    redes_sociales?: unknown[];
    email?: string;
    telefonos?: unknown[];
    direccion?: string;
    google_maps_url?: string;
}

export function PostEditor({ studioSlug, mode, post }: PostEditorProps) {
    const router = useRouter();
    const tempCuid = useTempCuid();
    const { uploadFiles, isUploading } = useMediaUpload();
    const { triggerRefresh } = useStorageRefresh(studioSlug);

    // Estado del formulario simplificado
    const [formData, setFormData] = useState<{ title: string; caption: string; tags: string[]; media: PostMediaItem[]; is_published: boolean; is_featured: boolean }>({
        title: post?.title || "",
        caption: post?.caption || "",
        tags: post?.tags || [],
        media: post?.media || [],
        is_published: post?.is_published ?? true,
        is_featured: post?.is_featured ?? false,
    });

    // Estado para input de palabras clave
    const [tagInput, setTagInput] = useState("");

    // Estado para preview
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    // Estado para modal de confirmación
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isMediaUploading, setIsMediaUploading] = useState(false);

    // Cargar datos del estudio para preview
    useEffect(() => {
        const loadPreviewData = async () => {
            try {
                setIsLoadingPreview(true);

                // Obtener datos del estudio
                const identidadResult = await obtenerIdentidadStudio(studioSlug);
                // obtenerIdentidadStudio devuelve directamente los datos del studio o { success: false, error: "..." }
                const studioData = identidadResult && !('success' in identidadResult && identidadResult.success === false)
                    ? (identidadResult as unknown as StudioData)
                    : undefined;

                console.log('[PostEditor] Studio data:', studioData);
                console.log('[PostEditor] Logo URL:', studioData?.logo_url);

                // Obtener posts publicados
                const postsResult = await getStudioPostsBySlug(studioSlug, { is_published: true });
                const publishedPosts = postsResult.success && postsResult.data ? postsResult.data : [];

                // Crear datos de preview
                const preview: PreviewData = {
                    studio_name: studioData?.studio_name,
                    logo_url: studioData?.logo_url ?? null,
                    slogan: studioData?.slogan,
                    posts: publishedPosts as unknown as PostItem[],
                    studio: studioData,
                    redes_sociales: [],
                    email: undefined,
                    telefonos: [],
                    direccion: studioData?.address,
                    google_maps_url: studioData?.maps_url
                };

                console.log('[PostEditor] Preview data logo_url:', preview.logo_url);

                setPreviewData(preview);
            } catch (error) {
                console.error("Error loading preview data:", error);
            } finally {
                setIsLoadingPreview(false);
            }
        };

        loadPreviewData();
    }, [studioSlug]);

    // Crear preview data con post temporal usando useMemo para evitar loops
    const finalPreviewData = useMemo(() => {
        if (!previewData) return null;

        // Crear un post temporal simplificado para el preview
        const tempPost: PostItem = {
            id: tempCuid,
            title: formData.title || null,
            caption: formData.caption || null,
            tags: formData.tags,
            is_published: true,
            published_at: new Date(),
            view_count: 0,
            media: formData.media,
        };

        return {
            ...previewData,
            post: tempPost,
            // Asegurar que logo_url y studioSlug estén presentes
            logo_url: previewData.logo_url || undefined,
            studioSlug: studioSlug
        };
    }, [previewData, formData, tempCuid, studioSlug]);

    // Helper para obtener dimensions de una imagen
    const getImageDimensions = (file: File): Promise<{ width: number; height: number } | undefined> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(undefined);
                return;
            }

            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
                URL.revokeObjectURL(objectUrl);
            };

            img.onerror = () => {
                resolve(undefined);
                URL.revokeObjectURL(objectUrl);
            };

            img.src = objectUrl;
        });
    };

    // Manejar subida de archivos
    const handleDropFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        try {
            setIsMediaUploading(true);

            const uploadedFiles = await uploadFiles(files, studioSlug, 'posts', 'content');

            // Convertir UploadedFile a MediaItem con todos los campos del schema
            const mediaItemsPromises = uploadedFiles.map(async (uploadedFile, index) => {
                const originalFile = files[index];
                const isVideo = originalFile.type.startsWith('video/');
                const isImage = originalFile.type.startsWith('image/');

                // Obtener dimensions para imágenes
                let dimensions: { width: number; height: number } | undefined;
                if (isImage) {
                    dimensions = await getImageDimensions(originalFile);
                }

                return {
                    id: uploadedFile.id,
                    file_url: uploadedFile.url,
                    file_type: isVideo ? 'video' as const : 'image' as const,
                    filename: uploadedFile.fileName,
                    storage_path: uploadedFile.url,
                    storage_bytes: uploadedFile.size,
                    mime_type: originalFile.type,
                    dimensions: dimensions,
                    duration_seconds: undefined, // Para videos se puede obtener después si es necesario
                    display_order: formData.media.length + index,
                    alt_text: undefined,
                    thumbnail_url: undefined, // Para videos se puede generar después si es necesario
                } as PostMediaItem;
            });

            const mediaItems = await Promise.all(mediaItemsPromises);

            setFormData(prev => ({
                ...prev,
                media: [...prev.media, ...mediaItems]
            }));

            toast.success(`${files.length} archivo(s) subido(s) correctamente`);
        } catch (error) {
            console.error('Error uploading files:', error);
            toast.error('Error al subir archivos');
        } finally {
            setIsMediaUploading(false);
        }
    }, [uploadFiles, studioSlug, formData.media.length]);

    // Manejar eliminación de media
    const handleDeleteMedia = useCallback((mediaId: string) => {
        setFormData(prev => ({
            ...prev,
            media: prev.media.filter(item => item.id !== mediaId)
        }));
    }, []);

    // Manejar reordenamiento de media
    const handleReorderMedia = useCallback((reorderedMedia: MediaItem[]) => {
        const convertedMedia: PostMediaItem[] = reorderedMedia.map((item, index) => ({
            ...item as PostMediaItem,
            display_order: index
        }));
        setFormData(prev => ({
            ...prev,
            media: convertedMedia
        }));
    }, []);

    // Manejar click de upload
    const handleUploadClick = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,video/*';
        input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length > 0) {
                handleDropFiles(files);
            }
        };
        input.click();
    }, [handleDropFiles]);

    // Manejar agregar tag
    const handleAddTag = useCallback(() => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !formData.tags.includes(trimmedTag)) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, trimmedTag]
            }));
            setTagInput("");
        } else if (formData.tags.includes(trimmedTag)) {
            toast.error("Esta palabra clave ya existe");
        }
    }, [tagInput, formData.tags]);

    // Manejar eliminar tag
    const handleRemoveTag = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter((_, i) => i !== index)
        }));
    }, []);

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Validación básica
            if (!formData.title || formData.title.trim() === "") {
                toast.error("El título es obligatorio");
                return;
            }
            if (!formData.media || formData.media.length === 0) {
                toast.error("Agrega al menos una imagen o video");
                return;
            }

            // Preparar datos para guardar con ordenamiento preservado
            const postData: PostFormData = {
                id: post?.id || tempCuid,
                title: formData.title,
                caption: formData.caption || null,
                media: formData.media.map((item, index) => ({
                    ...item,
                    id: item.id || cuid(),
                    display_order: index
                })),
                cover_index: 0,
                event_type_id: null,
                tags: formData.tags,
                is_featured: formData.is_featured,
                is_published: formData.is_published,
            };

            let result;
            if (mode === "create") {
                result = await createStudioPostBySlug(studioSlug, postData);
            } else {
                if (!post?.id) {
                    toast.error("ID del post no encontrado");
                    return;
                }
                result = await updateStudioPost(post.id, postData);
            }

            if (result.success) {
                toast.success(mode === "create" ? "Post creado exitosamente" : "Post actualizado exitosamente");
                // Actualizar almacenamiento
                triggerRefresh();
                router.push(`/${studioSlug}/studio/builder/content/posts`);
            } else {
                toast.error(result.error || "Error al guardar el post");
            }

        } catch (error) {
            console.error("Error saving post:", error);
            toast.error(error instanceof Error ? error.message : "Error al guardar el post");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const handleCancel = () => {
        setShowCancelModal(true);
    };

    const handleConfirmCancel = () => {
        setShowCancelModal(false);
        router.back();
    };

    // Calcular tamaño total del post
    const postSize = useMemo(() => {
        return calculateTotalStorage(formData.media);
    }, [formData.media]);

    return (
        <div className="space-y-6">
            {/* Header con botón de regresar */}
            <div className="flex items-center gap-4">
                <ZenButton variant="ghost" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Regresar
                </ZenButton>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">
                        {mode === "create" ? "Nuevo Post" : "Editar Post"}
                    </h1>
                    <p className="text-zinc-400">
                        {mode === "create" ? "Crea una nueva publicación" : "Modifica tu publicación"}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel de Edición */}
                <div className="space-y-6">
                    <ZenCard>
                        <ZenCardHeader>
                            <div className="flex items-center justify-between">
                                <ZenCardTitle>
                                    {mode === "create" ? "Crear Nuevo Post" : "Editar Post"}
                                </ZenCardTitle>
                                <div className="flex items-center gap-4">
                                    <ZenSwitch
                                        checked={formData.is_published}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                                        label="Publicado"
                                    />
                                    <ZenButton
                                        type="button"
                                        variant={formData.is_featured ? undefined : "outline"}
                                        size="sm"
                                        onClick={() => setFormData(prev => ({ ...prev, is_featured: !prev.is_featured }))}
                                        className={`rounded-full ${formData.is_featured ? "bg-amber-500 hover:bg-amber-600 text-black border-amber-500" : ""}`}
                                    >
                                        <Star className={`w-4 h-4 mr-1.5 ${formData.is_featured ? 'fill-current' : ''}`} />
                                        Destacar
                                    </ZenButton>
                                </div>
                            </div>
                        </ZenCardHeader>

                        <ZenCardContent className="space-y-4">
                            {/* Título */}
                            <ZenInput
                                label="Título"
                                value={formData.title || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Título del post"
                                required
                            />

                            {/* Descripción */}
                            <ZenTextarea
                                label="Descripción"
                                value={formData.caption || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                                placeholder="Escribe una descripción... Los enlaces se convertirán automáticamente en links"
                                rows={4}
                            />

                            {/* Multimedia */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-zinc-300">
                                        Multimedia
                                    </label>
                                    {postSize > 0 && (
                                        <span className="text-xs text-zinc-400">
                                            Tamaño del post: <span className="text-zinc-300 font-medium">{formatBytes(postSize)}</span>
                                        </span>
                                    )}
                                </div>
                                <ImageGrid
                                    media={formData.media as MediaItem[]}
                                    columns={3}
                                    gap={4}
                                    showDeleteButtons={true}
                                    onDelete={handleDeleteMedia}
                                    onReorder={handleReorderMedia}
                                    isEditable={true}
                                    lightbox={true}
                                    onDrop={handleDropFiles}
                                    onUploadClick={handleUploadClick}
                                    isUploading={isMediaUploading || isUploading}
                                />
                            </div>

                            {/* Palabras clave */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Palabras clave
                                </label>
                                <div className="flex gap-2 w-full items-center">
                                    <div className="flex-1 [&>div]:!space-y-0 [&>div>div>input]:h-10">
                                        <ZenInput
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddTag();
                                                }
                                            }}
                                            placeholder="Escribe una palabra clave y presiona Enter"
                                            label=""
                                        />
                                    </div>
                                    <ZenButton
                                        type="button"
                                        onClick={handleAddTag}
                                        variant="outline"
                                        className="px-3 h-10"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </ZenButton>
                                </div>

                                {/* Mostrar tags agregados */}
                                {formData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {formData.tags.map((tag, index) => (
                                            <ZenBadge
                                                key={index}
                                                variant="secondary"
                                                className="flex items-center gap-1.5 pr-1"
                                            >
                                                <span>{tag}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTag(index)}
                                                    className="hover:bg-zinc-700 rounded-full p-0.5 transition-colors"
                                                    aria-label={`Eliminar ${tag}`}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </ZenBadge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Botones */}
                            <div className="flex gap-3 pt-4">
                                <ZenButton
                                    onClick={handleSave}
                                    className="flex-1"
                                    loading={isSaving}
                                    disabled={isSaving}
                                >
                                    {mode === "create" ? "Crear Post" : "Actualizar Post"}
                                </ZenButton>
                                <ZenButton
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                >
                                    Cancelar
                                </ZenButton>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
                </div>

                {/* Panel de Preview */}
                <div className="hidden lg:block">
                    <div className="sticky top-6">
                        <MobilePreviewFull
                            data={finalPreviewData as Record<string, unknown>}
                            contentVariant="post-detail"
                            activeTab="inicio"
                            loading={isLoadingPreview}
                            onClose={handleBack}
                            isEditMode={true}
                        />
                    </div>
                </div>
            </div>

            {/* Modal de Confirmación */}
            <ZenConfirmModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleConfirmCancel}
                title="Cancelar Edición"
                description="¿Estás seguro de que quieres cancelar? Se perderán todos los cambios no guardados."
                confirmText="Sí, Cancelar"
                cancelText="Continuar Editando"
                variant="destructive"
            />

        </div>
    );
}
