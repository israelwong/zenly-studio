"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ZenButton, ZenInput, ZenTextarea, ZenSelect, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenConfirmModal, ZenSwitch, ZenBadge, ZenTagModal } from "@/components/ui/zen";
import { MobilePreviewFull } from "../../components/MobilePreviewFull";
import { obtenerIdentidadStudio } from "@/lib/actions/studio/builder/identidad.actions";
import { getStudioPostsBySlug } from "@/lib/actions/studio/builder/posts";
import { PostFormData, MediaItem } from "@/lib/actions/schemas/post-schemas";
import { MediaUploadZone } from "./MediaUploadZone";
import { useTempCuid } from "@/hooks/useTempCuid";
import { toast } from "sonner";
import { ArrowLeft, Video, Plus, X, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import cuid from "cuid";

interface PostEditorProps {
    studioSlug: string;
    eventTypes: { id: string; name: string }[];
    mode: "create" | "edit";
    post?: PostFormData;
}

interface PostItem {
    id: string;
    [key: string]: unknown;
}

interface StudioData {
    studio_name?: string;
    logo_url?: string;
    slogan?: string;
    address?: string;
    maps_url?: string;
}

interface PreviewData {
    studio_name?: string;
    logo_url?: string;
    slogan?: string;
    posts?: PostItem[];
    studio?: unknown;
    redes_sociales?: unknown[];
    email?: string;
    telefonos?: unknown[];
    direccion?: string;
    google_maps_url?: string;
}

export function PostEditorSimplified({ studioSlug, eventTypes, mode, post }: PostEditorProps) {
    const router = useRouter();
    const tempCuid = useTempCuid();

    // Estado del formulario
    const [formData, setFormData] = useState<PostFormData>({
        id: post?.id || tempCuid, // Usar CUID temporal para nuevos posts
        title: post?.title || "",
        caption: post?.caption || "",
        media: post?.media || [],
        cover_index: post?.cover_index || 0,
        category: post?.category || "portfolio",
        event_type_id: post?.event_type_id || "",
        tags: post?.tags || [],
        cta_enabled: post?.cta_enabled || false,
        cta_text: post?.cta_text || "",
        cta_action: post?.cta_action || "whatsapp",
        cta_link: post?.cta_link || "",
        is_featured: post?.is_featured || false,
        is_published: post?.is_published || false,
    });

    // Estado para preview
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    // Estado para modal de confirmación
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);

    // Cargar datos del estudio para preview
    useEffect(() => {
        const loadPreviewData = async () => {
            try {
                setIsLoadingPreview(true);

                // Obtener datos del estudio
                const identidadResult = await obtenerIdentidadStudio(studioSlug);
                const studioData = identidadResult.success && 'data' in identidadResult ? identidadResult.data as StudioData : undefined;

                // Obtener posts publicados
                const postsResult = await getStudioPostsBySlug(studioSlug, { is_published: true });
                const publishedPosts = postsResult.success && postsResult.data ? postsResult.data : [];

                // Crear datos de preview
                const preview: PreviewData = {
                    studio_name: studioData?.studio_name,
                    logo_url: studioData?.logo_url,
                    slogan: studioData?.slogan,
                    posts: publishedPosts as unknown as PostItem[],
                    studio: studioData,
                    redes_sociales: [],
                    email: undefined,
                    telefonos: [],
                    direccion: studioData?.address,
                    google_maps_url: studioData?.maps_url
                };

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

        // Crear un post temporal para el preview (siempre marcado como publicado para preview)
        const tempPost = {
            id: tempCuid,
            title: formData.title,
            caption: formData.caption,
            category: formData.category,
            event_type: eventTypes.find(et => et.id === formData.event_type_id) ? {
                id: formData.event_type_id,
                nombre: eventTypes.find(et => et.id === formData.event_type_id)?.name || ''
            } : null,
            tags: formData.tags,
            is_featured: formData.is_featured,
            is_published: true, // Siempre true para preview
            published_at: new Date(),
            view_count: 0,
            media: formData.media,
            cover_index: formData.cover_index,
            cta_enabled: formData.cta_enabled,
            cta_text: formData.cta_text,
            cta_action: formData.cta_action,
            cta_link: formData.cta_link,
        };

        return {
            ...previewData,
            post: tempPost // Usar 'post' en lugar de 'posts' para PostDetailSection
        };
    }, [previewData, formData, eventTypes, tempCuid]);

    const handleInputChange = (field: keyof PostFormData, value: string | boolean | number | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMediaChange = (media: MediaItem[]) => {
        // Asegurar que todos los items tengan id
        const mediaWithIds = media.map(item => ({
            ...item,
            id: item.id || cuid()
        }));

        // Actualizar cover_index si es necesario
        const newCoverIndex = Math.min(formData.cover_index, mediaWithIds.length - 1);

        setFormData(prev => ({
            ...prev,
            media: mediaWithIds,
            cover_index: newCoverIndex >= 0 ? newCoverIndex : 0
        }));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Validación básica
            if (!formData.title?.trim()) {
                toast.error("El título es requerido");
                return;
            }

            if (!formData.media || formData.media.length === 0) {
                toast.error("Agrega al menos una imagen o video");
                return;
            }

            // Preparar datos para guardar con ordenamiento preservado
            const postData = {
                ...formData,
                // Asegurar que el cover_index esté dentro del rango válido
                cover_index: Math.min(formData.cover_index, formData.media.length - 1),
                // Asegurar que todos los media items tengan IDs
                media: formData.media.map((item, index) => ({
                    ...item,
                    id: item.id || cuid(),
                    display_order: index // Agregar orden explícito
                }))
            };

            console.log("Guardando post con datos:", postData);

            // Aquí iría la lógica para guardar el post
            // Por ahora simulamos el guardado
            await new Promise(resolve => setTimeout(resolve, 2000));

            toast.success(mode === "create" ? "Post creado exitosamente" : "Post actualizado exitosamente");

            // Redirigir a la lista de posts
            router.push(`/${studioSlug}/studio/builder/posts`);

        } catch (error) {
            console.error("Error saving post:", error);
            toast.error("Error al guardar el post");
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

    const handleAddTag = (tag: string) => {
        const currentTags = formData.tags || [];
        if (!currentTags.includes(tag)) {
            setFormData(prev => ({
                ...prev,
                tags: [...currentTags, tag]
            }));
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
        }));
    };

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

                                {/* Botón de Destacar */}
                                <ZenButton
                                    variant={formData.is_featured ? "primary" : "outline"}
                                    size="sm"
                                    onClick={() => handleInputChange("is_featured", !formData.is_featured)}
                                    className={`gap-2 transition-all ${formData.is_featured
                                        ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                                        : "hover:bg-yellow-500/10 hover:border-yellow-500/50"
                                        }`}
                                >
                                    <Star className={`h-4 w-4 ${formData.is_featured ? "fill-current" : ""}`} />
                                    {formData.is_featured ? "Destacado" : "Destacar"}
                                </ZenButton>
                            </div>
                        </ZenCardHeader>
                        <ZenCardContent className="space-y-6">
                            {/* Título */}
                            <ZenInput
                                label="Título"
                                value={formData.title || ""}
                                onChange={(e) => handleInputChange("title", e.target.value)}
                                placeholder="Título del post"
                            />

                            {/* Descripción */}
                            <ZenTextarea
                                label="Descripción"
                                value={formData.caption || ""}
                                onChange={(e) => handleInputChange("caption", e.target.value)}
                                placeholder="Descripción del post"
                                rows={4}
                            />

                            {/* Palabras Clave */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-zinc-300">
                                        Palabras Clave
                                    </label>
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowTagModal(true)}
                                        disabled={(formData.tags || []).length >= 10}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Agregar
                                    </ZenButton>
                                </div>

                                {formData.tags && formData.tags.length > 0 ? (
                                    <div className="flex flex-wrap justify-start gap-2">
                                        {formData.tags.map((tag, index) => (
                                            <ZenBadge
                                                key={index}
                                                variant="secondary"
                                                size="sm"
                                                className="cursor-pointer hover:bg-zinc-600 transition-colors group rounded-full px-2 py-0.5 text-xs text-center"
                                                onClick={() => handleRemoveTag(tag)}
                                            >
                                                #{tag}
                                                <X className="h-2.5 w-2.5 ml-1 opacity-100 transition-opacity" />
                                            </ZenBadge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-700 italic mb-4">
                                        No hay palabras clave agregadas. Haz clic en &quot;Agregar&quot; para añadir algunas.
                                    </p>
                                )}

                                <p className="text-xs text-zinc-400 mt-2">
                                    Las palabras clave ayudan a que tu post sea más fácil de encontrar
                                </p>
                            </div>

                            {/* Categoría y Tipo de Evento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Categoría
                                    </label>
                                    <ZenSelect
                                        value={formData.category}
                                        onValueChange={(value: string) => handleInputChange("category", value)}
                                        options={[
                                            { value: "portfolio", label: "Portfolio" },
                                            { value: "blog", label: "Blog" },
                                            { value: "promo", label: "Promoción" },
                                        ]}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Tipo de Evento
                                    </label>
                                    <ZenSelect
                                        value={formData.event_type_id || ""}
                                        onValueChange={(value: string) => handleInputChange("event_type_id", value)}
                                        options={[
                                            { value: "", label: "Sin especificar" },
                                            ...eventTypes.map(et => ({ value: et.id, label: et.name }))
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Zona de Media */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Multimedia
                                </label>
                                <MediaUploadZone
                                    media={formData.media.map(item => ({
                                        ...item,
                                        id: item.id || cuid()
                                    }))}
                                    onMediaChange={handleMediaChange}
                                    studioSlug={studioSlug}
                                    postId={tempCuid} // Usar CUID temporal para uploads
                                />

                                {/* Selector de imagen de portada */}
                                {formData.media.length > 1 && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            Imagen de Portada
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {formData.media.map((item, index) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleInputChange("cover_index", index)}
                                                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${formData.cover_index === index
                                                        ? "border-blue-500 ring-2 ring-blue-500/20"
                                                        : "border-zinc-600 hover:border-zinc-500"
                                                        }`}
                                                >
                                                    {item.file_type === 'image' ? (
                                                        <Image
                                                            src={item.file_url}
                                                            alt={`Portada ${index + 1}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                                                            <Video className="h-4 w-4 text-zinc-400" />
                                                        </div>
                                                    )}

                                                    {/* Indicador de selección */}
                                                    {formData.cover_index === index && (
                                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                            <div className="bg-blue-500 text-white rounded-full p-1">
                                                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Número de orden */}
                                                    <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                                                        {index + 1}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1">
                                            Selecciona la imagen que aparecerá como portada del post
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* CTA */}
                            <div className="space-y-4">
                                <ZenSwitch
                                    checked={formData.cta_enabled}
                                    onCheckedChange={(checked) => handleInputChange("cta_enabled", checked)}
                                    label="Habilitar Call-to-Action"
                                    description="Agrega un botón de acción al final del post"
                                />

                                {formData.cta_enabled && (
                                    <div className="space-y-3">
                                        <ZenInput
                                            label="Texto del CTA"
                                            value={formData.cta_text || ""}
                                            onChange={(e) => handleInputChange("cta_text", e.target.value)}
                                            placeholder="¡Contáctanos!"
                                        />

                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Acción
                                            </label>
                                            <ZenSelect
                                                value={formData.cta_action}
                                                onValueChange={(value: string) => handleInputChange("cta_action", value)}
                                                options={[
                                                    { value: "whatsapp", label: "WhatsApp" },
                                                    { value: "lead_form", label: "Formulario" },
                                                    { value: "calendar", label: "Calendario" },
                                                ]}
                                            />
                                        </div>

                                        {formData.cta_action === "lead_form" && (
                                            <ZenInput
                                                label="Enlace"
                                                value={formData.cta_link || ""}
                                                onChange={(e) => handleInputChange("cta_link", e.target.value)}
                                                placeholder="https://..."
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Opciones de Publicación */}
                            <div className="space-y-4">
                                <ZenSwitch
                                    checked={formData.is_published}
                                    onCheckedChange={(checked) => handleInputChange("is_published", checked)}
                                    label="Publicar Post"
                                    description="Haz visible este post en tu perfil público"
                                />
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
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-zinc-200">Preview Móvil</h2>
                            <p className="text-sm text-zinc-400">
                                Vista previa en tiempo real
                            </p>
                        </div>

                        <MobilePreviewFull
                            data={finalPreviewData as Record<string, unknown>}
                            contentVariant="post-detail"
                            activeTab="inicio"
                            loading={isLoadingPreview}
                            onClose={handleBack}
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

            <ZenTagModal
                isOpen={showTagModal}
                onClose={() => setShowTagModal(false)}
                onAddTag={handleAddTag}
                existingTags={formData.tags || []}
                maxTags={10}
            />
        </div>
    );
}
