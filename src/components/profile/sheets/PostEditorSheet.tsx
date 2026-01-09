"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { X, Plus, Star, Check, Copy } from "lucide-react";
import { ZenButton, ZenInput, ZenTextarea, ZenBadge, ZenSwitch } from "@/components/ui/zen";
import { ImageGrid } from "@/components/shared/media";
import { MediaItem } from "@/types/content-blocks";
import { createStudioPostBySlug, updateStudioPost, checkPostSlugExists, getStudioPostById } from "@/lib/actions/studio/posts";
import { PostFormData, MediaItem as PostMediaItem } from "@/lib/actions/schemas/post-schemas";
import { useTempCuid } from "@/hooks/useTempCuid";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useVideoThumbnailGenerator } from "@/hooks/useVideoThumbnailGenerator";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";
import { toast } from "sonner";
import { generateSlug } from "@/lib/utils/slug-utils";
import { calculateTotalStorage, formatBytes } from "@/lib/utils/storage";
import cuid from "cuid";

interface PostEditorSheetProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    mode: "create" | "edit";
    postId?: string;
    onSuccess?: () => void;
}

export function PostEditorSheet({
    isOpen,
    onClose,
    studioSlug,
    mode,
    postId,
    onSuccess
}: PostEditorSheetProps) {
    const tempCuid = useTempCuid();
    const { uploadFiles, isUploading } = useMediaUpload();
    const { generateMissingThumbnails, isGenerating: isGeneratingThumbnails } = useVideoThumbnailGenerator();
    const { triggerRefresh } = useStorageRefresh(studioSlug);

    // Estado del formulario
    const [formData, setFormData] = useState<{
        title: string;
        slug: string;
        caption: string;
        tags: string[];
        media: PostMediaItem[];
        is_published: boolean;
        is_featured: boolean;
    }>({
        title: "",
        slug: "",
        caption: "",
        tags: [],
        media: [],
        is_published: true,
        is_featured: false,
    });

    const [tagInput, setTagInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isMediaUploading, setIsMediaUploading] = useState(false);
    const [isLoadingPost, setIsLoadingPost] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [isValidatingSlug, setIsValidatingSlug] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Generar slug automáticamente cuando cambia el título (solo en modo create)
    useEffect(() => {
        if (formData.title && mode === "create") {
            const newSlug = generateSlug(formData.title);
            if (newSlug !== formData.slug) {
                setFormData(prev => ({ ...prev, slug: newSlug }));
            }
        }
    }, [formData.title, formData.slug, mode]);

    // Cargar post si es modo edición
    useEffect(() => {
        const loadPost = async () => {
            if (mode === "edit" && postId && isOpen) {
                try {
                    setIsLoadingPost(true);
                    const result = await getStudioPostById(postId);

                    if (result.success && result.data) {
                        const post = result.data;

                        // Generar thumbnails para videos que no los tienen
                        const postMediaItems = (post.media || []).map(item => ({
                            ...item,
                            storage_path: item.storage_path || item.file_url,
                        })) as MediaItem[];

                        const mediaWithThumbnails = await generateMissingThumbnails(
                            postMediaItems,
                            studioSlug
                        );

                        /* PROBLEMA: Parpadeo al abrir el sheet
                         * 
                         * CAUSA RAÍZ:
                         * - setFormData causa un re-render completo del componente
                         * - ImageGrid se monta con media vacío primero, luego se actualiza con los datos
                         * - generateMissingThumbnails es asíncrono y causa múltiples actualizaciones
                         * 
                         * DIFERENCIA CON ContentBlocksEditor (que funciona bien):
                         * - En ContentBlocksEditor, cada bloque es un componente separado (SortableBlock)
                         * - Cuando se carga un bloque, solo ese componente se re-renderiza
                         * - Aquí, todo el PostEditorSheet se re-renderiza cuando cambia formData.media
                         * 
                         * SOLUCIÓN:
                         * 1. Cargar datos parciales primero (sin thumbnails) y luego actualizar
                         * 2. Usar React.memo en ImageGrid para evitar re-renders cuando media no cambia realmente
                         * 3. O usar un estado separado para loading que no cause re-render del grid completo
                         */
                        setFormData({
                            title: post.title || "",
                            slug: generateSlug(post.title || ""), // Generar slug desde el título, no usar el de DB
                            caption: post.caption || "",
                            tags: post.tags || [],
                            media: mediaWithThumbnails as PostMediaItem[],
                            is_published: post.is_published ?? true,
                            is_featured: post.is_featured ?? false,
                        });
                        // Marcar que terminó la carga inicial después de un pequeño delay
                        setTimeout(() => setIsInitialLoad(false), 100);
                    } else {
                        toast.error("No se pudo cargar el post");
                        onClose();
                    }
                } catch (error) {
                    console.error("Error loading post:", error);
                    toast.error("Error al cargar el post");
                    onClose();
                } finally {
                    setIsLoadingPost(false);
                }
            }
        };

        loadPost();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, postId, isOpen, studioSlug]);

    // Reset form cuando se cierra
    useEffect(() => {
        if (!isOpen) {
            setFormData({
                title: "",
                slug: "",
                caption: "",
                tags: [],
                media: [],
                is_published: true,
                is_featured: false,
            });
            setTagInput("");
            setTitleError(null);
            setIsValidatingSlug(false);
            setLinkCopied(false);
            setIsInitialLoad(true);
        }
    }, [isOpen]);

    // Marcar que no es carga inicial cuando se abre en modo crear
    useEffect(() => {
        if (isOpen && mode === "create") {
            setIsInitialLoad(false);
        }
    }, [isOpen, mode]);

    // Validar slug único (solo después de la carga inicial)
    useEffect(() => {
        if (isInitialLoad) {
            return;
        }

        const validateSlug = async () => {
            if (!formData.slug || !formData.slug.trim() || formData.slug.length < 3) {
                setTitleError(null);
                setIsValidatingSlug(false);
                return;
            }

            setIsValidatingSlug(true);
            setTitleError(null);

            try {
                const slugExists = await checkPostSlugExists(
                    studioSlug,
                    formData.slug,
                    mode === "edit" ? postId : undefined
                );

                if (slugExists) {
                    setTitleError("Ya existe un post con este título");
                } else {
                    setTitleError(null);
                }
            } catch (error) {
                console.error("Error validating slug:", error);
                setTitleError(null);
            } finally {
                setIsValidatingSlug(false);
            }
        };

        const timeoutId = setTimeout(() => {
            validateSlug();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.slug, studioSlug, mode, postId, isInitialLoad]);

    // Helper para obtener dimensions de imagen
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

            // Si no se subió ningún archivo, el hook ya mostró los errores específicos
            // (tamaño, permisos, etc.), así que solo retornamos sin mostrar toast adicional
            if (uploadedFiles.length === 0) {
                return;
            }

            // Verificar que todos los archivos subidos tengan URL válida
            const invalidFiles = uploadedFiles.filter(f => !f.url || !f.id);
            if (invalidFiles.length > 0) {
                console.error('[PostEditorSheet] Archivos con datos inválidos:', invalidFiles);
                toast.error(`${invalidFiles.length} archivo(s) no se procesaron correctamente`);
            }

            // Crear mediaItems de forma síncrona primero (sin dimensions) para evitar parpadeos
            const baseMediaItems: PostMediaItem[] = uploadedFiles.map((uploadedFile, index) => {
                const originalFile = files[index];
                const isVideo = originalFile.type.startsWith('video/');
                const isImage = originalFile.type.startsWith('image/');

                return {
                    id: uploadedFile.id,
                    file_url: uploadedFile.url,
                    file_type: isVideo ? 'video' as const : 'image' as const,
                    filename: uploadedFile.fileName,
                    storage_path: uploadedFile.url,
                    storage_bytes: uploadedFile.size,
                    mime_type: originalFile.type,
                    dimensions: undefined, // Se actualizará después
                    duration_seconds: undefined,
                    display_order: 0, // Se calculará en el setFormData
                    alt_text: undefined,
                    thumbnail_url: uploadedFile.thumbnailUrl,
                } as PostMediaItem;
            });

            /* PROBLEMA: Parpadeos al subir imágenes
             * 
             * CAUSA RAÍZ:
             * - setFormData causa re-render completo de ImageGrid
             * - Dos actualizaciones de estado (una inmediata, otra para dimensions) causan múltiples parpadeos
             * - El array media se recrea completamente en cada actualización
             * 
             * DIFERENCIA CON ContentBlocksEditor (que funciona bien):
             * - En ContentBlocksEditor, handleDropFiles actualiza solo el bloque específico:
             *   `handleUpdateBlock(blockId, { media: updatedMedia })`
             * - Solo ese SortableBlock se re-renderiza, no todo el editor
             * - Aquí, se actualiza todo formData.media, causando re-render completo de ImageGrid
             * 
             * SOLUCIÓN:
             * 1. Usar React.memo en ImageGrid para evitar re-renders cuando media no cambia realmente
             * 2. O usar una estructura similar donde cada item de media sea un componente separado
             * 3. O batch las actualizaciones usando React.startTransition o useDeferredValue
             */
            // Actualizar estado inmediatamente para evitar parpadeos
            setFormData(prev => {
                const startOrder = prev.media.length;
                return {
                    ...prev,
                    media: [...prev.media, ...baseMediaItems.map((item, index) => ({
                        ...item,
                        display_order: startOrder + index
                    }))]
                };
            });

            // Actualizar dimensions de forma asíncrona después (sin bloquear UI)
            const mediaItemsWithDimensions = await Promise.all(
                baseMediaItems.map(async (item, index) => {
                    const originalFile = files[index];
                    const isImage = originalFile.type.startsWith('image/');

                    if (isImage) {
                        const dimensions = await getImageDimensions(originalFile);
                        return { ...item, dimensions };
                    }
                    return item;
                })
            );

            // Actualizar solo las dimensions sin recrear todo el array
            setFormData(prev => ({
                ...prev,
                media: prev.media.map(item => {
                    const updatedItem = mediaItemsWithDimensions.find(m => m.id === item.id);
                    if (updatedItem && updatedItem.dimensions) {
                        return { ...item, dimensions: updatedItem.dimensions };
                    }
                    return item;
                })
            }));

            toast.success(`${uploadedFiles.length} archivo${uploadedFiles.length > 1 ? 's' : ''} subido${uploadedFiles.length > 1 ? 's' : ''} correctamente`);
        } catch (error) {
            console.error('[PostEditorSheet] Error uploading files:', error);
            toast.error('Error al subir archivos');
        } finally {
            setIsMediaUploading(false);
        }
    }, [uploadFiles, studioSlug]);

    // Manejar eliminación de media
    /* PROBLEMA: Parpadeo al eliminar imágenes
     * 
     * CAUSA RAÍZ:
     * - filter() crea un nuevo array, causando re-render completo de ImageGrid
     * - Los items restantes se remontan aunque no hayan cambiado
     * 
     * DIFERENCIA CON ContentBlocksEditor (que funciona bien):
     * - En ContentBlocksEditor, removeMedia actualiza solo el bloque específico:
     *   `onUpdate(block.id, { media: newMedia })`
     * - Solo ese SortableBlock se re-renderiza
     * - Aquí, se actualiza todo formData.media, causando re-render completo
     * 
     * SOLUCIÓN:
     * 1. Usar React.memo en SortableImageItem para evitar re-renders innecesarios
     * 2. O usar una key estable que no cambie cuando solo se elimina un item
     */
    const handleDeleteMedia = useCallback((mediaId: string) => {
        setFormData(prev => ({
            ...prev,
            media: prev.media.filter(item => item.id !== mediaId)
        }));
    }, []);

    // Manejar reordenamiento de media - optimizado para evitar parpadeos
    /* PROBLEMA: Parpadeo al reordenar imágenes
     * 
     * CAUSA RAÍZ:
     * - Aunque se intenta mantener referencias, sort() y map() crean nuevos arrays
     * - ImageGrid re-renderiza todos los items aunque solo cambió el orden
     * - DndKit ya maneja el reordenamiento visual, pero el estado causa parpadeo adicional
     * 
     * DIFERENCIA CON ContentBlocksEditor (que funciona bien):
     * - En ContentBlocksEditor, onReorder actualiza solo el bloque específico:
     *   `onUpdate(block.id, { media: reorderedMedia })`
     * - Solo ese SortableBlock se re-renderiza
     * - Aquí, se actualiza todo formData.media, causando re-render completo
     * 
     * SOLUCIÓN:
     * 1. Usar React.memo en SortableImageItem con comparación personalizada
     * 2. O usar useMemo para memoizar el array ordenado antes de pasarlo a ImageGrid
     * 3. O sincronizar mejor con DndKit para evitar actualización de estado durante el drag
     */
    const handleReorderMedia = useCallback((reorderedMedia: MediaItem[]) => {
        setFormData(prev => {
            // Crear un mapa de los nuevos items por ID para acceso rápido
            const reorderedMap = new Map<string, number>();
            reorderedMedia.forEach((item, index) => {
                // MediaItem de @/types/content-blocks tiene id: string (no opcional)
                // pero verificamos por seguridad
                if (item.id) {
                    reorderedMap.set(item.id as string, index);
                }
            });

            // Reordenar el array existente manteniendo las referencias cuando sea posible
            const newMedia = prev.media
                .slice()
                .sort((a, b) => {
                    const aId: string | undefined = a.id;
                    const bId: string | undefined = b.id;
                    const orderA = (aId && typeof aId === 'string' && aId.length > 0)
                        ? (reorderedMap.get(aId) ?? prev.media.length)
                        : prev.media.length;
                    const orderB = (bId && typeof bId === 'string' && bId.length > 0)
                        ? (reorderedMap.get(bId) ?? prev.media.length)
                        : prev.media.length;
                    return orderA - orderB;
                })
                .map((item, index) => ({
                    ...item,
                    display_order: index
                }));

            return {
                ...prev,
                media: newMedia
            };
        });
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
    const handleAddTag = useCallback((tag?: string) => {
        const tagToAdd = tag || tagInput.trim();
        if (!tagToAdd) return;

        // Procesar múltiples tags separados por coma o punto
        const tagsToProcess = tagToAdd
            .split(/[,.]/)
            .map(t => t.trim())
            .filter(t => t.length > 0);

        if (tagsToProcess.length === 0) return;

        const newTags: string[] = [];
        const duplicateTags: string[] = [];

        tagsToProcess.forEach(tag => {
            const normalizedTag = tag.toLowerCase();
            if (!formData.tags.some(t => t.toLowerCase() === normalizedTag)) {
                newTags.push(tag);
            } else {
                duplicateTags.push(tag);
            }
        });

        if (newTags.length > 0) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, ...newTags]
            }));
        }

        if (duplicateTags.length > 0) {
            toast.error(`${duplicateTags.length} palabra(s) clave ya existe(n)`);
        }

        setTagInput("");
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

            // Validación
            if (!formData.title || formData.title.trim() === "") {
                toast.error("El título es obligatorio");
                return;
            }

            if (!formData.slug || !formData.slug.trim()) {
                toast.error("El slug es requerido");
                return;
            }

            if (titleError) {
                toast.error(titleError);
                return;
            }

            if (!formData.media || formData.media.length === 0) {
                toast.error("Agrega al menos una imagen o video");
                return;
            }

            // Preparar datos
            const postData: PostFormData = {
                id: postId || tempCuid,
                slug: formData.slug,
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
                if (!postId) {
                    toast.error("ID del post no encontrado");
                    return;
                }
                result = await updateStudioPost(postId, postData);
            }

            if (result.success) {
                toast.success(mode === "create" ? "Post creado" : "Post actualizado");
                triggerRefresh();
                onSuccess?.();
                onClose();
            } else {
                toast.error(result.error || "Error al guardar");
            }

        } catch (error) {
            console.error("Error saving post:", error);
            toast.error("Error al guardar el post");
        } finally {
            setIsSaving(false);
        }
    };

    // Calcular tamaño total
    const postSize = useMemo(() => {
        return calculateTotalStorage(formData.media);
    }, [formData.media]);

    // Memoizar el array de media para evitar re-renders innecesarios en ImageGrid
    // Usar una comparación más inteligente: solo actualizar si realmente cambió el contenido
    const memoizedMedia = useMemo(() => {
        return formData.media as MediaItem[];
    }, [
        // Solo recalcular si cambió la longitud o los IDs
        formData.media.length,
        formData.media.map(m => m.id).join(',')
    ]);

    // Memoizar el estado de uploading para evitar cambios frecuentes
    const isUploadingState = useMemo(() => {
        return isMediaUploading || isUploading;
    }, [isMediaUploading, isUploading]);

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="fixed top-0 right-0 h-full w-full sm:max-w-md md:max-w-lg bg-zinc-900 border-l border-zinc-800 z-[70] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 truncate">
                                {mode === "create" ? "Nuevo Post" : "Editar Post"}
                            </h2>
                            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 truncate">
                                {mode === "create" ? "Crea una nueva publicación" : "Modifica tu publicación"}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {isLoadingPost || isGeneratingThumbnails ? (
                    <div className="p-4 sm:p-6 space-y-6">
                        {/* Skeleton para controles superiores */}
                        <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                            <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-8 w-28 bg-zinc-800 rounded animate-pulse" />
                        </div>

                        {/* Skeleton para título */}
                        <div className="space-y-2">
                            <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                        </div>

                        {/* Skeleton para slug */}
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                        </div>

                        {/* Skeleton para descripción */}
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-32 w-full bg-zinc-800 rounded animate-pulse" />
                        </div>

                        {/* Skeleton para multimedia */}
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                            <div className="grid grid-cols-3 gap-2">
                                <div className="aspect-square bg-zinc-800 rounded animate-pulse" />
                                <div className="aspect-square bg-zinc-800 rounded animate-pulse" />
                                <div className="aspect-square bg-zinc-800 rounded animate-pulse" />
                            </div>
                        </div>

                        {/* Skeleton para palabras clave */}
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                        </div>
                    </div>
                ) : (
                    <div className="p-4 sm:p-6 space-y-6">
                        {/* Controles superiores */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-zinc-800">
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
                                className={`rounded-full w-full sm:w-auto ${formData.is_featured ? "bg-amber-500 hover:bg-amber-600 text-black border-amber-500" : ""}`}
                            >
                                <Star className={`w-4 h-4 mr-1.5 ${formData.is_featured ? 'fill-current' : ''}`} />
                                Destacar
                            </ZenButton>
                        </div>

                        {/* Título */}
                        <div className="space-y-2">
                            <ZenInput
                                label="Título"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    title: e.target.value
                                }))}
                                placeholder="Título del post"
                                required
                                error={titleError || undefined}
                            />

                            {/* URL Preview */}
                            {formData.slug && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <p className="text-xs text-zinc-500 break-all">
                                        URL: <span className="text-zinc-400 font-mono">
                                            /{studioSlug}?post={formData.slug}
                                        </span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {isValidatingSlug && (
                                            <span className="text-xs text-zinc-500">Validando...</span>
                                        )}
                                        {!isValidatingSlug && formData.slug && !titleError && (
                                            <span className="text-xs text-emerald-500">✓ Disponible</span>
                                        )}
                                        {formData.slug && !titleError && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const postUrl = `${window.location.origin}/${studioSlug}?post=${formData.slug}`;
                                                    try {
                                                        await navigator.clipboard.writeText(postUrl);
                                                        setLinkCopied(true);
                                                        toast.success("Link copiado");
                                                        setTimeout(() => setLinkCopied(false), 2000);
                                                    } catch {
                                                        toast.error("Error al copiar");
                                                    }
                                                }}
                                                className="p-1 hover:bg-zinc-800 rounded transition-colors"
                                            >
                                                {linkCopied ? (
                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                ) : (
                                                    <Copy className="w-3 h-3 text-zinc-400" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Caption */}
                        <ZenTextarea
                            label="Descripción"
                            value={formData.caption}
                            onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                            placeholder="Escribe una descripción..."
                            rows={4}
                        />

                        {/* Media */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-zinc-300">
                                    Multimedia
                                </label>
                                {postSize > 0 && (
                                    <span className="text-xs text-zinc-400">
                                        {formatBytes(postSize)}
                                    </span>
                                )}
                            </div>
                            <ImageGrid
                                media={memoizedMedia}
                                columns={3}
                                gap={2}
                                showDeleteButtons={true}
                                onDelete={handleDeleteMedia}
                                onReorder={handleReorderMedia}
                                isEditable={true}
                                lightbox={true}
                                onDrop={handleDropFiles}
                                onUploadClick={handleUploadClick}
                                isUploading={isUploadingState}
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Palabras clave
                            </label>
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <ZenInput
                                        value={tagInput}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const lastChar = value[value.length - 1];

                                            // Si el último carácter es coma o punto, agregar el tag antes del separador
                                            if (lastChar === ',' || lastChar === '.') {
                                                const tagBeforeSeparator = value.slice(0, -1).trim();
                                                if (tagBeforeSeparator) {
                                                    handleAddTag(tagBeforeSeparator);
                                                } else {
                                                    setTagInput("");
                                                }
                                            } else {
                                                setTagInput(value);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                        placeholder="Escribe y presiona Enter, coma o punto"
                                        label=""
                                    />
                                </div>
                                <ZenButton
                                    type="button"
                                    onClick={() => handleAddTag()}
                                    variant="outline"
                                    size="md"
                                    className="h-10 px-3 shrink-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </ZenButton>
                            </div>

                            {/* Tags list */}
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
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </ZenBadge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <ZenButton
                            onClick={handleSave}
                            className="flex-1 w-full"
                            loading={isSaving}
                            disabled={isSaving || isValidatingSlug || !!titleError || isLoadingPost || isGeneratingThumbnails}
                        >
                            {mode === "create" ? "Crear Post" : "Actualizar"}
                        </ZenButton>
                        <ZenButton
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </ZenButton>
                    </div>
                </div>
            </div>
        </>
    );
}
