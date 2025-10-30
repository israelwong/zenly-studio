"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ZenButton, ZenInput, ZenTextarea, ZenSelect, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenConfirmModal, ZenSwitch, ZenBadge, ZenTagModal } from "@/components/ui/zen";
import { MobilePreviewFull } from "../../../components/MobilePreviewFull";
import { ContentBlocksEditor } from "@/components/content-blocks";
import { ContentBlock } from "@/types/content-blocks";
import { obtenerIdentidadStudio } from "@/lib/actions/studio/builder/identidad.actions";
import { getStudioPortfoliosBySlug } from "@/lib/actions/studio/builder/portfolios/portfolios.actions";
import { PortfolioFormData } from "@/lib/actions/schemas/portfolio-schemas";
import { useTempCuid } from "@/hooks/useTempCuid";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import cuid from "cuid";

interface PortfolioEditorProps {
    studioSlug: string;
    eventTypes: { id: string; name: string }[];
    mode: "create" | "edit";
    portfolio?: PortfolioFormData;
}

interface PortfolioItem {
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
    portfolios?: PortfolioItem[];
    studio?: unknown;
    redes_sociales?: unknown[];
    email?: string;
    telefonos?: unknown[];
    direccion?: string;
    google_maps_url?: string;
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

export function PortfolioEditor({ studioSlug, eventTypes, mode, portfolio }: PortfolioEditorProps) {
    const router = useRouter();
    const tempCuid = useTempCuid();

    // Estado del formulario
    const [formData, setFormData] = useState<PortfolioFormData>({
        id: portfolio?.id || tempCuid, // Usar CUID temporal para nuevos portfolios
        title: portfolio?.title || "",
        slug: portfolio?.slug || generateSlug(portfolio?.title || ""),
        description: portfolio?.description || "",
        caption: portfolio?.caption || "",
        cover_image_url: portfolio?.cover_image_url || null,
        media: portfolio?.media || [],
        cover_index: portfolio?.cover_index || 0,
        category: portfolio?.category || "portfolio",
        event_type_id: portfolio?.event_type_id || "",
        tags: portfolio?.tags || [],
        cta_enabled: portfolio?.cta_enabled || false,
        cta_text: portfolio?.cta_text || "",
        cta_action: portfolio?.cta_action || "whatsapp",
        cta_link: portfolio?.cta_link || "",
        is_featured: portfolio?.is_featured || false,
        is_published: portfolio?.is_published || false,
        content_blocks: portfolio?.content_blocks || [],
        order: portfolio?.order || 0,
    });

    // Estado para bloques de contenido
    const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(portfolio?.content_blocks || []);

    // Estado para preview
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    // Estado para modal de confirmación
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);

    // Generar slug automáticamente cuando cambia el título
    useEffect(() => {
        if (mode === "create" && formData.title && (!formData.slug || formData.slug === generateSlug(formData.title))) {
            const newSlug = generateSlug(formData.title);
            if (newSlug !== formData.slug) {
                setFormData(prev => ({
                    ...prev,
                    slug: newSlug
                }));
            }
        }
    }, [formData.title, formData.slug, mode]);

    // Cargar datos del estudio para preview
    useEffect(() => {
        const loadPreviewData = async () => {
            try {
                setIsLoadingPreview(true);

                // Obtener datos del estudio
                const identidadResult = await obtenerIdentidadStudio(studioSlug);
                const studioData = identidadResult.success && 'data' in identidadResult ? identidadResult.data as StudioData : undefined;

                // Obtener portfolios publicados
                const portfoliosResult = await getStudioPortfoliosBySlug(studioSlug, { is_published: true });
                const publishedPortfolios = portfoliosResult.success && portfoliosResult.data ? portfoliosResult.data : [];

                // Crear datos de preview
                const preview: PreviewData = {
                    studio_name: studioData?.studio_name,
                    logo_url: studioData?.logo_url,
                    slogan: studioData?.slogan,
                    portfolios: publishedPortfolios as unknown as PortfolioItem[],
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

    // Crear preview data con portfolio temporal usando useMemo para evitar loops
    const finalPreviewData = useMemo(() => {
        if (!previewData) return null;

        // Mapear media al formato esperado por PortfolioDetailSection
        const mappedMedia = formData.media.map((item, index) => ({
            id: item.id || `${tempCuid}-media-${index}`,
            file_url: item.file_url || item.url || '',
            file_type: (item.file_type || item.type || 'image') as 'image' | 'video',
            filename: item.filename || item.fileName || '',
            thumbnail_url: item.thumbnail_url,
            display_order: item.display_order ?? index,
        }));

        // Crear un portfolio temporal para el preview (siempre marcado como publicado para preview)
        const tempPortfolio = {
            id: tempCuid,
            title: formData.title,
            slug: formData.slug || generateSlug(formData.title || ""),
            description: formData.description,
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
            media: mappedMedia,
            cover_index: formData.cover_index,
            cta_enabled: formData.cta_enabled,
            cta_text: formData.cta_text,
            cta_action: formData.cta_action,
            cta_link: formData.cta_link,
            content_blocks: contentBlocks, // Agregar bloques de contenido
        };

        return {
            ...previewData,
            portfolio: tempPortfolio // Usar 'portfolio' en lugar de 'portfolios' para PortfolioDetailSection
        };
    }, [previewData, formData, eventTypes, tempCuid, contentBlocks]);

    const handleInputChange = (field: keyof PortfolioFormData, value: string | boolean | number | string[] | null | ContentBlock[]) => {
        setFormData(prev => {
            // Si cambia el título y estamos creando, actualizar slug automáticamente
            if (field === "title" && mode === "create" && typeof value === "string") {
                return { ...prev, [field]: value, slug: generateSlug(value) };
            }
            return { ...prev, [field]: value };
        });
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Validación básica
            if (!formData.title?.trim()) {
                toast.error("El título es requerido");
                return;
            }

            if (!formData.slug?.trim()) {
                toast.error("El slug es requerido");
                return;
            }

            if (!formData.media || formData.media.length === 0) {
                toast.error("Agrega al menos una imagen o video");
                return;
            }

            // Preparar datos para guardar con ordenamiento preservado
            const portfolioData = {
                ...formData,
                // Asegurar que el cover_index esté dentro del rango válido
                cover_index: Math.min(formData.cover_index, formData.media.length - 1),
                // Asegurar que todos los media items tengan IDs
                media: formData.media.map((item, index) => ({
                    ...item,
                    id: item.id || cuid(),
                    display_order: index // Agregar orden explícito
                })),
                content_blocks: contentBlocks, // Incluir bloques de contenido
                slug: formData.slug || generateSlug(formData.title || ""),
            };

            console.log("Guardando portfolio con datos:", portfolioData);

            // TODO: Aquí iría la lógica para guardar el portfolio usando createStudioPortfolio o updateStudioPortfolio
            // Por ahora simulamos el guardado
            await new Promise(resolve => setTimeout(resolve, 2000));

            toast.success(mode === "create" ? "Portfolio creado exitosamente" : "Portfolio actualizado exitosamente");

            // Redirigir a la lista de portfolios
            router.push(`/${studioSlug}/studio/builder/content/portfolios`);

        } catch (error) {
            console.error("Error saving portfolio:", error);
            toast.error("Error al guardar el portfolio");
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
                        {mode === "create" ? "Nuevo Portfolio" : "Editar Portfolio"}
                    </h1>
                    <p className="text-zinc-400">
                        {mode === "create" ? "Crea un nuevo portfolio" : "Modifica tu portfolio"}
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
                                    {mode === "create" ? "Crear Nuevo Portfolio" : "Editar Portfolio"}
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

                        <ZenCardContent className="space-y-4">
                            {/* Título */}
                            <ZenInput
                                label="Título"
                                value={formData.title || ""}
                                onChange={(e) => handleInputChange("title", e.target.value)}
                                placeholder="Título del portfolio"
                            />

                            {/* Slug */}
                            <ZenInput
                                label="Slug (URL)"
                                value={formData.slug || ""}
                                onChange={(e) => handleInputChange("slug", e.target.value)}
                                placeholder="slug-del-portfolio"
                                hint="Se genera automáticamente desde el título. Puedes editarlo manualmente."
                            />

                            {/* Descripción */}
                            <ZenTextarea
                                label="Descripción"
                                value={formData.description || ""}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                placeholder="Descripción del portfolio"
                                rows={4}
                            />

                            {/* Caption */}
                            <ZenTextarea
                                label="Caption (con soporte para links)"
                                value={formData.caption || ""}
                                onChange={(e) => handleInputChange("caption", e.target.value)}
                                placeholder="Texto adicional con enlaces"
                                rows={3}
                            />

                            {/* //! Sistema de Bloques de Contenido */}
                            <div>
                                <ContentBlocksEditor
                                    blocks={contentBlocks}
                                    onBlocksChange={setContentBlocks}
                                    studioSlug={studioSlug}
                                />
                            </div>

                            {/* Categoría y Tipo de Evento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Categoría
                                    </label>
                                    <ZenSelect
                                        value={formData.category || ""}
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


                            {/* Palabras Clave */}
                            <div className="space-y-4 p-4 bg-zinc-950/50 rounded-sm">
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
                                    Las palabras clave ayudan a que tu portfolio sea más fácil de encontrar
                                </p>
                            </div>

                            {/* CTA */}
                            <div className="space-y-4">
                                <ZenSwitch
                                    checked={formData.cta_enabled}
                                    onCheckedChange={(checked) => handleInputChange("cta_enabled", checked)}
                                    label="Habilitar Call-to-Action"
                                    description="Agrega un botón de acción al final del portfolio"
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
                                    label="Publicar Portfolio"
                                    description="Haz visible este portfolio en tu perfil público"
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
                                    {mode === "create" ? "Crear Portfolio" : "Actualizar Portfolio"}
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
                            contentVariant="portfolio-detail"
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

