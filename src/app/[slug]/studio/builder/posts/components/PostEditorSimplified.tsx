"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ZenButton, ZenInput, ZenTextarea, ZenSelect, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from "@/components/ui/zen";
import { MobilePreviewContainer } from "../../components/MobilePreviewContainer";
import { obtenerIdentidadStudio } from "@/lib/actions/studio/builder/identidad.actions";
import { getStudioPosts } from "@/lib/actions/studio/builder/posts";
import { PostFormData } from "@/lib/actions/schemas/post-schemas";
import { MediaUploadZone } from "./MediaUploadZone";
import { toast } from "sonner";

interface PostEditorProps {
    studioSlug: string;
    eventTypes: { id: string; name: string }[];
    mode: "create" | "edit";
    post?: PostFormData;
}

interface PreviewData {
    studio_name?: string;
    logo_url?: string;
    slogan?: string;
    posts?: any[];
    studio?: any;
    redes_sociales?: any[];
    email?: string;
    telefonos?: any[];
    direccion?: string;
    google_maps_url?: string;
}

export function PostEditorSimplified({ studioSlug, eventTypes, mode, post }: PostEditorProps) {
    // Estado del formulario
    const [formData, setFormData] = useState<PostFormData>({
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

    // Cargar datos del estudio para preview
    useEffect(() => {
        const loadPreviewData = async () => {
            try {
                setIsLoadingPreview(true);

                // Obtener datos del estudio
                const identidadResult = await obtenerIdentidadStudio(studioSlug);
                const studioData = identidadResult.success ? identidadResult.data : null;

                // Obtener posts publicados
                const postsResult = await getStudioPosts(studioSlug, { is_published: true });
                const publishedPosts = postsResult.success ? postsResult.data || [] : [];

                // Crear datos de preview
                const preview: PreviewData = {
                    studio_name: studioData?.studio_name,
                    logo_url: studioData?.logo_url,
                    slogan: studioData?.slogan,
                    posts: publishedPosts,
                    studio: studioData,
                    redes_sociales: [],
                    email: null,
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

    // Actualizar preview cuando cambie el formulario
    useEffect(() => {
        if (previewData && formData.is_published) {
            // Crear un post temporal para el preview
            const tempPost = {
                id: "temp-preview",
                title: formData.title,
                caption: formData.caption,
                category: formData.category,
                event_type: eventTypes.find(et => et.id === formData.event_type_id),
                tags: formData.tags,
                is_featured: formData.is_featured,
                is_published: formData.is_published,
                published_at: new Date(),
                view_count: 0,
                media: formData.media,
                cover_index: formData.cover_index,
                cta_enabled: formData.cta_enabled,
                cta_text: formData.cta_text,
                cta_action: formData.cta_action,
                cta_link: formData.cta_link,
            };

            setPreviewData(prev => ({
                ...prev,
                posts: [tempPost, ...(prev?.posts?.filter(p => p.id !== "temp-preview") || [])]
            }));
        }
    }, [formData, eventTypes]);

    const handleInputChange = (field: keyof PostFormData, value: string | boolean | number | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMediaChange = (media: any[]) => {
        setFormData(prev => ({ ...prev, media }));
    };

    const handleSave = async () => {
        try {
            // Aquí iría la lógica para guardar el post
            toast.success(mode === "create" ? "Post creado exitosamente" : "Post actualizado exitosamente");
        } catch (error) {
            toast.error("Error al guardar el post");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel de Edición */}
            <div className="space-y-6">
                <ZenCard>
                    <ZenCardHeader>
                        <ZenCardTitle>
                            {mode === "create" ? "Crear Nuevo Post" : "Editar Post"}
                        </ZenCardTitle>
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
                            rows={3}
                        />

                        {/* Zona de Media */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Multimedia
                            </label>
                            <MediaUploadZone
                                media={formData.media}
                                onMediaChange={handleMediaChange}
                                studioSlug={studioSlug}
                            />
                        </div>

                        {/* Categoría y Tipo de Evento */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ZenSelect
                                label="Categoría"
                                value={formData.category}
                                onChange={(value) => handleInputChange("category", value)}
                                options={[
                                    { value: "portfolio", label: "Portfolio" },
                                    { value: "blog", label: "Blog" },
                                    { value: "promo", label: "Promoción" },
                                ]}
                            />

                            <ZenSelect
                                label="Tipo de Evento"
                                value={formData.event_type_id}
                                onChange={(value) => handleInputChange("event_type_id", value)}
                                options={[
                                    { value: "", label: "Sin especificar" },
                                    ...eventTypes.map(et => ({ value: et.id, label: et.name }))
                                ]}
                            />
                        </div>

                        {/* CTA */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="cta_enabled"
                                    checked={formData.cta_enabled}
                                    onChange={(e) => handleInputChange("cta_enabled", e.target.checked)}
                                    className="rounded border-zinc-600 bg-zinc-800 text-blue-500"
                                />
                                <label htmlFor="cta_enabled" className="text-sm text-zinc-300">
                                    Habilitar Call-to-Action
                                </label>
                            </div>

                            {formData.cta_enabled && (
                                <div className="space-y-3">
                                    <ZenInput
                                        label="Texto del CTA"
                                        value={formData.cta_text || ""}
                                        onChange={(e) => handleInputChange("cta_text", e.target.value)}
                                        placeholder="¡Contáctanos!"
                                    />

                                    <ZenSelect
                                        label="Acción"
                                        value={formData.cta_action}
                                        onChange={(value) => handleInputChange("cta_action", value)}
                                        options={[
                                            { value: "whatsapp", label: "WhatsApp" },
                                            { value: "lead_form", label: "Formulario" },
                                            { value: "calendar", label: "Calendario" },
                                        ]}
                                    />

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

                        {/* Opciones */}
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="is_featured"
                                    checked={formData.is_featured}
                                    onChange={(e) => handleInputChange("is_featured", e.target.checked)}
                                    className="rounded border-zinc-600 bg-zinc-800 text-blue-500"
                                />
                                <label htmlFor="is_featured" className="text-sm text-zinc-300">
                                    Post Destacado
                                </label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="is_published"
                                    checked={formData.is_published}
                                    onChange={(e) => handleInputChange("is_published", e.target.checked)}
                                    className="rounded border-zinc-600 bg-zinc-800 text-blue-500"
                                />
                                <label htmlFor="is_published" className="text-sm text-zinc-300">
                                    Publicar Inmediatamente
                                </label>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 pt-4">
                            <ZenButton onClick={handleSave} className="flex-1">
                                {mode === "create" ? "Crear Post" : "Actualizar Post"}
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

                    <MobilePreviewContainer
                        data={previewData}
                        contentVariant="posts"
                        activeTab="posts"
                        showNavbar={true}
                        loading={isLoadingPreview}
                    />
                </div>
            </div>
        </div>
    );
}
