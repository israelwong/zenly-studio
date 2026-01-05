"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ZenButton, ZenInput, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenConfirmModal, ZenSwitch, ZenBadge, ZenTagModal, ZenTextarea, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from "@/components/ui/zen";
import { MobilePreviewFull } from "@/components/previews";
import { ContentBlocksEditor } from "@/components/shared/content-blocks";
import { ContentBlock } from "@/types/content-blocks";
import { CategorizedComponentSelector, ComponentOption } from "./CategorizedComponentSelector";
import { TipoEventoSelector } from "@/components/shared/tipos-evento";
import { obtenerIdentidadStudio } from "@/lib/actions/studio/profile/identidad";
import { obtenerTiposEvento } from "@/lib/actions/studio/negocio/tipos-evento.actions";
import {
    getStudioPortfoliosBySlug,
    createStudioPortfolioFromSlug,
    updateStudioPortfolioFromSlug,
    checkPortfolioSlugExists,
    deleteStudioPortfolio
} from "@/lib/actions/studio/portfolios/portfolios.actions";
import { PortfolioFormData } from "@/lib/actions/schemas/portfolio-schemas";
import { useTempCuid } from "@/hooks/useTempCuid";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Upload, HardDrive, Loader2, Copy, Check, Trash2, MoreVertical, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import cuid from "cuid";
import Image from "next/image";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { calculateTotalStorage, formatBytes } from "@/lib/utils/storage";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";

// Tipo extendido que incluye published_at para determinar estado
type PortfolioWithStatus = PortfolioFormData & {
    published_at?: Date | null;
};

interface PortfolioEditorProps {
    studioSlug: string;
    mode: "create" | "edit";
    portfolio?: PortfolioWithStatus;
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

import { generateSlug } from "@/lib/utils/slug-utils";

// Helper para determinar estado del portfolio
function getPortfolioStatus(portfolio: { is_published: boolean; published_at: Date | null }): "draft" | "published" | "unpublished" {
    if (portfolio.is_published && portfolio.published_at) return "published";
    if (!portfolio.is_published && portfolio.published_at) return "unpublished";
    return "draft"; // !is_published && !published_at
}

// Componente para inyectar botones entre cada bloque renderizado por ContentBlocksEditor
function InjectAddButtons({
    contentBlocks,
    activeBlockId,
    onInsertAt
}: {
    contentBlocks: ContentBlock[];
    activeBlockId: string | null;
    onInsertAt: (index: number) => void;
}) {
    // Ref para mantener siempre la versión más actualizada de contentBlocks
    const contentBlocksRef = useRef(contentBlocks);

    useEffect(() => {
        contentBlocksRef.current = contentBlocks;
    }, [contentBlocks]);

    useEffect(() => {
        console.log('🔵 [InjectAddButtons] useEffect ejecutado:', {
            contentBlocksLength: contentBlocks.length,
            activeBlockId,
            timestamp: new Date().toISOString()
        });

        // Remover todos los botones inyectados cuando se arrastra (solo cuando es 'dragging')
        // NO remover el botón persistente [data-persistent-add-button]
        if (activeBlockId === 'dragging') {
            console.log('🔵 [InjectAddButtons] Ocultando botones - drag activo');
            document.querySelectorAll('[data-injected-add-button]').forEach(btn => btn.remove());
            return;
        }

        if (contentBlocks.length === 0) {
            console.log('🔵 [InjectAddButtons] No hay bloques - saliendo');
            return;
        }

        // Esperar a que el DOM se actualice
        const timeoutId = setTimeout(() => {
            console.log('🔵 [InjectAddButtons] Agregando botones para', contentBlocks.length, 'bloques');

            // Primero, limpiar TODOS los botones inyectados y recrearlos para asegurar índices correctos
            document.querySelectorAll('[data-injected-add-button]').forEach(btn => btn.remove());

            // Para cada bloque, agregar botón después (entre bloques)
            contentBlocks.forEach((block, index) => {
                const blockElement = document.getElementById(block.id);
                if (!blockElement) {
                    console.log('🔵 [InjectAddButtons] No se encontró elemento para bloque:', block.id);
                    return;
                }

                // Buscar el contenedor del bloque (el div con bg-zinc-800 que contiene el bloque)
                // Este es el elemento raíz del componente SortableBlock
                // Buscar el elemento padre que tiene las clases características del bloque
                let blockContainer = blockElement.closest('div.bg-zinc-800.border.rounded-lg');

                // Si no se encuentra con clases específicas, buscar cualquier div padre con bg-zinc-800
                if (!blockContainer) {
                    blockContainer = blockElement.closest('div[class*="bg-zinc-800"]');
                }

                if (!blockContainer) {
                    console.log('🔵 [InjectAddButtons] No se encontró contenedor para bloque:', block.id);
                    return;
                }

                console.log('🔵 [InjectAddButtons] Creando botón para bloque:', block.id, 'índice:', index);

                // Crear botón usando React.createElement para mejor integración
                const button = document.createElement('button');
                button.setAttribute('data-injected-add-button', block.id);
                button.className = 'w-full py-2 px-4 mb-4 text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-md transition-all bg-zinc-900 hover:bg-zinc-400 hover:text-zinc-900 hover:border-zinc-400';

                // Crear el icono SVG
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('class', 'w-4 h-4 inline mr-2');
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'currentColor');
                svg.setAttribute('viewBox', '0 0 24 24');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('d', 'M12 4v16m8-8H4');
                svg.appendChild(path);

                button.appendChild(svg);
                button.appendChild(document.createTextNode('Agregar componente aquí'));

                // Calcular la posición actual del bloque al hacer click usando la ref actualizada
                button.onclick = () => {
                    // Usar la ref para obtener siempre la versión más actualizada de contentBlocks
                    const currentBlocks = contentBlocksRef.current;
                    const blockId = block.id;

                    // Buscar el índice actual del bloque en el array actualizado
                    const currentIndex = currentBlocks.findIndex(b => b.id === blockId);

                    console.log('🔵 [InjectAddButtons] Click en botón:', {
                        blockId,
                        currentIndex,
                        totalBlocks: currentBlocks.length,
                        blockIds: currentBlocks.map(b => b.id)
                    });

                    if (currentIndex !== -1) {
                        // Insertar después del bloque actual (índice + 1)
                        onInsertAt(currentIndex + 1);
                    } else {
                        // Si el bloque no se encuentra (fue eliminado), agregar al final
                        onInsertAt(currentBlocks.length);
                    }
                };

                // Insertar después del contenedor del bloque (entre bloques, no dentro)
                // Esto lo coloca como elemento hermano del bloque, fuera del componente
                blockContainer.insertAdjacentElement('afterend', button);
                console.log('🔵 [InjectAddButtons] ✅ Botón agregado después de bloque:', block.id);
            });
        }, 200); // Delay para asegurar que el DOM esté listo

        return () => {
            clearTimeout(timeoutId);
            // NO remover botones aquí para evitar parpadeos durante interacciones
            // Solo se removerán cuando activeBlockId === 'dragging'
        };
    }, [contentBlocks, activeBlockId, onInsertAt]); // Re-ejecutar cuando cambian los bloques, el estado de drag o la función de inserción

    return null;
}

export function PortfolioEditor({ studioSlug, mode, portfolio }: PortfolioEditorProps) {
    const router = useRouter();
    const tempCuid = useTempCuid();

    // Estado del formulario
    const [formData, setFormData] = useState<PortfolioFormData>(() => {
        const baseData = {
            id: portfolio?.id || tempCuid,
            title: portfolio?.title || "",
            slug: portfolio?.slug || generateSlug(portfolio?.title || ""),
            description: portfolio?.description || "",
            caption: portfolio?.caption || null,
            cover_image_url: portfolio?.cover_image_url || null,
            cover_storage_bytes: portfolio?.cover_storage_bytes ? Number(portfolio.cover_storage_bytes) : null,
            cover_index: portfolio?.cover_index ?? 0,
            category: portfolio?.category || null,
            event_type_id: portfolio?.event_type_id || null,
            tags: portfolio?.tags ?? [],
            is_featured: portfolio?.is_featured ?? false,
            is_published: portfolio?.is_published ?? false,
            media: portfolio?.media ?? [],
            content_blocks: portfolio?.content_blocks ?? [],
            order: portfolio?.order ?? 0,
        };
        return baseData as PortfolioFormData;
    });

    // Estado para bloques de contenido - Asegurar que todos tengan IDs
    const normalizeBlocks = (blocks: ContentBlock[]): ContentBlock[] => {
        return blocks.map((block, index) => ({
            ...block,
            id: block.id || `block_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            order: block.order ?? index,
        }));
    };

    const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(
        normalizeBlocks(portfolio?.content_blocks || [])
    );

    // Estado del portfolio (draft/published/unpublished)
    const portfolioStatus = useMemo(() => {
        if (!portfolio) return "draft" as const;
        const publishedAt: Date | null = portfolio.published_at ?? null;
        return getPortfolioStatus({
            is_published: portfolio.is_published,
            published_at: publishedAt
        });
    }, [portfolio]);

    const isDraft = portfolioStatus === "draft";
    const isPublished = portfolioStatus === "published";

    // Inicializar slugHint con slug existente si hay portfolio
    useEffect(() => {
        if (portfolio?.slug && mode === "edit") {
            // Solo inicializar si no hay un hint ya establecido (para evitar sobrescribir validación)
            setSlugHint(prev => prev || `Slug: ${portfolio.slug}`);
        }
    }, [portfolio?.slug, mode]);

    // Estado para preview
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    // Estado para modal de confirmación
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [isPublishingFromModal, setIsPublishingFromModal] = useState(false);
    const [pendingPublishSwitch, setPendingPublishSwitch] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [showComponentSelector, setShowComponentSelector] = useState(false);
    const [insertAtIndex, setInsertAtIndex] = useState<number | undefined>(undefined);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [isDragOverCover, setIsDragOverCover] = useState(false);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [isValidatingSlug, setIsValidatingSlug] = useState(false);
    const [slugHint, setSlugHint] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [eventTypeName, setEventTypeName] = useState<string | null>(null);
    const { uploadFiles } = useMediaUpload();
    const { triggerRefresh } = useStorageRefresh(studioSlug);

    // Manejar cambio de estado de drag desde ContentBlocksEditor
    const handleDragStateChange = useCallback((isDragging: boolean) => {
        if (isDragging) {
            setActiveBlockId('dragging');
        } else {
            // Delay para permitir que la animación termine
            setTimeout(() => {
                setActiveBlockId(null);
            }, 300);
        }
    }, []);

    // Generar slug automáticamente cuando cambia el título (en ambos modos)
    useEffect(() => {
        if (formData.title) {
            const expectedSlug = generateSlug(formData.title);
            // Actualizar slug si está vacío o si coincide con el generado desde el título actual
            // (esto permite que se actualice cuando el título cambia)
            if (!formData.slug || formData.slug === expectedSlug || formData.slug === generateSlug(portfolio?.title || "")) {
                if (expectedSlug !== formData.slug) {
                    setFormData(prev => ({
                        ...prev,
                        slug: expectedSlug
                    }));
                }
            }
        }
    }, [formData.title, formData.slug, mode, portfolio?.title]);

    // Validar slug único cuando cambia el título o slug
    useEffect(() => {
        const validateSlug = async () => {
            if (!formData.slug || !formData.slug.trim()) {
                setTitleError(null);
                setSlugHint(null);
                setIsValidatingSlug(false);
                return;
            }

            // Solo validar si el slug es diferente al original (o si es creación)
            const currentSlug = portfolio?.slug || "";
            if (mode === "edit" && formData.slug === currentSlug) {
                setTitleError(null);
                // Mostrar slug actual si es el mismo (ya inicializado)
                setSlugHint(`Slug: ${formData.slug}`);
                setIsValidatingSlug(false);
                return;
            }

            setIsValidatingSlug(true);
            setTitleError(null);
            setSlugHint(null);

            try {
                const slugExists = await checkPortfolioSlugExists(
                    studioSlug,
                    formData.slug,
                    mode === "edit" ? portfolio?.id : undefined
                );

                if (slugExists) {
                    setTitleError("Los nombres de los portfolios deben ser únicos");
                    setSlugHint(null);
                } else {
                    setTitleError(null);
                    setSlugHint(`Slug: ${formData.slug}`);
                }
            } catch (error) {
                console.error("Error validating slug:", error);
                setTitleError(null);
                setSlugHint(null);
            } finally {
                setIsValidatingSlug(false);
            }
        };

        // Debounce para evitar demasiadas llamadas
        const timeoutId = setTimeout(() => {
            validateSlug();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.slug, formData.title, studioSlug, mode, portfolio?.slug, portfolio?.id]);

    // Cargar nombre del tipo de evento cuando cambia event_type_id
    useEffect(() => {
        const loadEventTypeName = async () => {
            if (!formData.event_type_id) {
                setEventTypeName(null);
                return;
            }

            try {
                const result = await obtenerTiposEvento(studioSlug);
                if (result.success && result.data) {
                    const eventType = result.data.find(t => t.id === formData.event_type_id);
                    setEventTypeName(eventType?.nombre || null);
                }
            } catch (error) {
                console.error("Error loading event type name:", error);
            }
        };

        loadEventTypeName();
    }, [formData.event_type_id, studioSlug]);

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

    // Calcular tamaño total de todos los componentes
    const totalComponentsSize = useMemo(() => {
        const allMedia = contentBlocks.flatMap(block => block.media || []);
        const total = calculateTotalStorage(allMedia);
        console.log('💾 Storage calculation:', {
            coverSize: formData.cover_storage_bytes,
            componentsSize: total,
            totalSize: Number(formData.cover_storage_bytes || 0) + total
        });
        return total;
    }, [contentBlocks, formData.cover_storage_bytes]);

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

        // Calcular cover_image_url desde media si cover_image_url está vacío
        let coverImageUrl = formData.cover_image_url;

        if (!coverImageUrl && mappedMedia.length > 0) {
            const coverIndex = Math.min(formData.cover_index || 0, mappedMedia.length - 1);
            const coverMedia = mappedMedia[coverIndex];

            if (coverMedia) {
                // Si es video, usar thumbnail_url; si es imagen, usar file_url
                coverImageUrl = coverMedia.file_type === 'video'
                    ? (coverMedia.thumbnail_url || coverMedia.file_url)
                    : coverMedia.file_url;
            }
        }

        // Crear un portfolio temporal para el preview (siempre marcado como publicado para preview)
        const tempPortfolio = {
            id: tempCuid,
            title: formData.title,
            slug: formData.slug || generateSlug(formData.title || ""),
            description: formData.description,
            caption: formData.caption,
            tags: formData.tags,
            is_featured: formData.is_featured,
            is_published: true, // Siempre true para preview
            published_at: new Date(),
            view_count: 0,
            media: mappedMedia,
            cover_index: formData.cover_index,
            cover_image_url: coverImageUrl,
            content_blocks: contentBlocks, // Agregar bloques de contenido
        };

        return {
            ...previewData,
            portfolio: tempPortfolio // Usar 'portfolio' en lugar de 'portfolios' para PortfolioDetailSection
        };
    }, [previewData, formData, tempCuid, contentBlocks]);

    const handleInputChange = (field: keyof PortfolioFormData, value: string | boolean | number | string[] | null | ContentBlock[]) => {
        setFormData(prev => {
            // Si cambia el título, actualizar slug automáticamente (tanto en create como edit)
            if (field === "title" && typeof value === "string") {
                return { ...prev, [field]: value, slug: generateSlug(value) };
            }
            return { ...prev, [field]: value };
        });
    };

    // Validar que un componente tenga información válida
    const hasComponentContent = (block: ContentBlock): boolean => {
        const { type, config, media } = block;

        switch (type) {
            case 'text':
                // Text debe tener texto en config
                const textConfig = config as { text?: string };
                return !!(textConfig?.text?.trim());

            case 'image':
            case 'gallery':
            case 'media-gallery':
            case 'video':
            case 'grid':
            case 'slider':
                // Componentes de media deben tener media
                return !!(media && media.length > 0);

            case 'hero':
            case 'hero-image':
            case 'hero-video':
            case 'hero-text':
            case 'hero-contact':
                // Hero debe tener title, subtitle, description, media o buttons
                const heroConfig = config as {
                    title?: string;
                    subtitle?: string;
                    description?: string;
                    buttons?: Array<{ text?: string }>;
                };
                const hasHeroText = !!(heroConfig?.title?.trim() ||
                    heroConfig?.subtitle?.trim() ||
                    heroConfig?.description?.trim());
                const hasHeroButtons = !!(heroConfig?.buttons && heroConfig.buttons.length > 0);
                const hasHeroMedia = !!(media && media.length > 0);
                return hasHeroText || hasHeroButtons || hasHeroMedia;

            case 'separator':
                // Separator siempre es válido (solo necesita existir)
                return true;

            default:
                // Por defecto, cualquier componente con media o config es válido
                return !!(media && media.length > 0) || !!config;
        }
    };

    const handleSave = async (shouldPublish: boolean) => {
        try {
            setIsSaving(true);

            // Mostrar toast de publicación solo si NO viene del modal (el modal ya muestra el estado)
            if (shouldPublish && !isPublishingFromModal) {
                toast.loading("Publicando portfolio...", { id: "publishing" });
            }

            // Validación 1: Título requerido
            if (!formData.title?.trim()) {
                toast.dismiss("publishing");
                toast.error("El título es requerido");
                if (isPublishingFromModal) {
                    setIsPublishingFromModal(false);
                }
                setIsSaving(false);
                return;
            }

            if (!formData.slug?.trim()) {
                toast.dismiss("publishing");
                toast.error("El slug es requerido");
                if (isPublishingFromModal) {
                    setIsPublishingFromModal(false);
                }
                setIsSaving(false);
                return;
            }

            // Validación 2: Slug único
            if (titleError) {
                toast.dismiss("publishing");
                toast.error("Los nombres de los portfolios deben ser únicos");
                if (isPublishingFromModal) {
                    setIsPublishingFromModal(false);
                }
                setIsSaving(false);
                return;
            }

            // Validación 3: Al menos un componente
            if (!contentBlocks || contentBlocks.length === 0) {
                toast.dismiss("publishing");
                toast.error("Agrega al menos un componente de contenido");
                if (isPublishingFromModal) {
                    setIsPublishingFromModal(false);
                }
                setIsSaving(false);
                return;
            }

            // Validación 3: Cada componente debe tener información válida
            const invalidBlocks = contentBlocks.filter(block => !hasComponentContent(block));
            if (invalidBlocks.length > 0) {
                toast.dismiss("publishing");
                toast.error(`Completa la información de los componentes. ${invalidBlocks.length} componente(s) sin contenido`);
                if (isPublishingFromModal) {
                    setIsPublishingFromModal(false);
                }
                setIsSaving(false);
                return;
            }

            // Preparar datos para guardar con ordenamiento preservado
            const portfolioData = {
                ...formData,
                is_published: shouldPublish,
                // Asegurar que el cover_index esté dentro del rango válido
                cover_index: formData.media && formData.media.length > 0
                    ? Math.min(formData.cover_index, formData.media.length - 1)
                    : 0,
                // Asegurar que todos los media items tengan IDs
                media: (formData.media || []).map((item, index) => ({
                    ...item,
                    id: item.id || cuid(),
                    display_order: index // Agregar orden explícito
                })),
                content_blocks: contentBlocks, // Incluir bloques de contenido
                slug: formData.slug || generateSlug(formData.title || ""),
            };

            console.log("💾 Guardando portfolio con datos:", {
                cover_image_url: portfolioData.cover_image_url,
                cover_storage_bytes: portfolioData.cover_storage_bytes,
                title: portfolioData.title
            });

            // Guardar usando server actions
            let result;
            if (mode === "create") {
                result = await createStudioPortfolioFromSlug(studioSlug, portfolioData);
            } else {
                if (!portfolioData.id) {
                    toast.dismiss("publishing");
                    toast.error("ID del portfolio es requerido para actualizar");
                    if (isPublishingFromModal) {
                        setIsPublishingFromModal(false);
                    }
                    setIsSaving(false);
                    return;
                }
                result = await updateStudioPortfolioFromSlug(portfolioData.id, studioSlug, portfolioData);
            }

            if (!result.success) {
                toast.dismiss("publishing");
                toast.error(result.error || "Error al guardar el portfolio");
                if (isPublishingFromModal) {
                    setIsPublishingFromModal(false);
                }
                setIsSaving(false);
                return;
            }

            // Dismiss el toast de publicación si existe
            if (shouldPublish) {
                toast.dismiss("publishing");
            }

            let actionMessage: string;
            if (shouldPublish) {
                actionMessage = mode === "create"
                    ? "Portfolio publicado exitosamente"
                    : "Portfolio actualizado y publicado exitosamente";
            } else {
                // Solo mostrar mensaje de borrador si realmente es un borrador
                actionMessage = mode === "create"
                    ? "Borrador guardado exitosamente"
                    : isDraft
                        ? "Borrador actualizado exitosamente"
                        : "Portfolio actualizado exitosamente";
            }

            toast.success(actionMessage);

            // Actualizar almacenamiento
            triggerRefresh();

            // Si se estaba publicando desde el modal, cerrarlo y resetear estado
            if (isPublishingFromModal) {
                setIsPublishingFromModal(false);
                setShowPublishModal(false);
            }

            // Redirigir a la tabla de portafolios
            router.push(`/${studioSlug}/studio/commercial/portafolios`);

        } catch (error) {
            console.error("Error saving portfolio:", error);
            toast.error("Error al guardar el portfolio");

            // Si viene del modal y hay error, resetear el estado para permitir reintentar
            if (isPublishingFromModal) {
                setIsPublishingFromModal(false);
            }
        } finally {
            if (!isPublishingFromModal) {
                setIsSaving(false);
            } else {
                // Si viene del modal, isSaving se maneja desde el modal
                setIsSaving(false);
            }
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

    // Función para crear un bloque desde el selector categorizado
    const handleAddComponentFromSelector = (component: ComponentOption) => {
        const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let config: Record<string, unknown> = {};

        // Configuración específica por tipo
        switch (component.type) {
            case 'media-gallery':
                config = {
                    mode: component.mode || 'grid',
                    columns: component.mode === 'grid' ? 3 : undefined,
                    gap: 4,
                    borderStyle: 'rounded',
                    aspectRatio: 'auto',
                    showCaptions: false,
                    showTitles: false,
                    lightbox: component.mode !== 'slide',
                    autoplay: component.mode === 'slide' ? 3000 : undefined,
                    perView: component.mode === 'slide' ? 1 : undefined,
                    showArrows: component.mode === 'slide',
                    showDots: component.mode === 'slide'
                };
                break;
            case 'video':
                config = {
                    autoPlay: false,
                    muted: true,
                    loop: false,
                    controls: true
                };
                break;
            case 'text':
                config = {
                    text: '',
                    textType: 'text',
                    fontSize: 'base',
                    fontWeight: 'normal',
                    alignment: 'left',
                    italic: false
                };
                break;
            case 'separator':
                config = {
                    style: 'solid',
                    height: 0.5
                };
                break;
            case 'hero-portfolio':
                // Hero Portfolio: sin botones, eventTypeName desde portfolio
                config = {
                    title: 'Título de tu portafolio',
                    eventTypeName: '', // Se llenará automáticamente desde el selector de tipo de evento
                    description: 'Descripción breve de tu portafolio',
                    overlay: true,
                    overlayOpacity: 50,
                    textAlignment: 'center',
                    verticalAlignment: 'center',
                    backgroundType: 'image',
                    containerStyle: 'fullscreen',
                    autoPlay: false,
                    muted: true,
                    loop: false
                };
                break;
            case 'hero-contact':
            case 'hero-image':
            case 'hero-video':
            case 'hero-text':
            case 'hero':
                // Heroes legacy - mantener compatibilidad
                config = {
                    title: 'Título de tu portafolio',
                    subtitle: 'Categoría o especialidad',
                    description: 'Descripción breve de tu portafolio',
                    buttons: [], // Sin botones en portfolios
                    overlay: true,
                    overlayOpacity: 50,
                    textAlignment: 'center',
                    verticalAlignment: 'center',
                    backgroundType: component.type === 'hero-video' ? 'video' : 'image',
                    containerStyle: 'fullscreen',
                    autoPlay: component.type === 'hero-video' ? true : undefined,
                    muted: component.type === 'hero-video' ? true : undefined,
                    loop: component.type === 'hero-video' ? true : undefined
                };
                break;
            default:
                // Tipo no reconocido o sin configuración específica
                config = {};
        }

        const newBlock: ContentBlock = {
            id: generateId(),
            type: component.type,
            order: insertAtIndex !== undefined ? insertAtIndex : contentBlocks.length,
            presentation: 'block',
            media: [],
            config
        };

        const indexToInsert = insertAtIndex !== undefined ? insertAtIndex : contentBlocks.length;

        if (indexToInsert < contentBlocks.length) {
            // Insertar en posición específica
            const newBlocks = [...contentBlocks];
            newBlocks.splice(indexToInsert, 0, newBlock);
            // Reordenar los orders
            newBlocks.forEach((block, index) => {
                block.order = index;
            });
            setContentBlocks(newBlocks);
        } else {
            // Agregar al final
            setContentBlocks([...contentBlocks, newBlock]);
        }

        setShowComponentSelector(false);
        setInsertAtIndex(undefined);

        // Scroll automático al nuevo componente después de un breve delay
        setTimeout(() => {
            const newBlockElement = document.getElementById(newBlock.id);
            if (newBlockElement) {
                newBlockElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100);
    };

    // Manejar upload de cover
    const handleCoverUpload = async (files: File[]) => {
        if (!files || files.length === 0) return;

        // Solo tomar la primera imagen
        const imageFile = files[0];
        if (!imageFile.type.startsWith('image/')) {
            toast.error('Solo se permiten archivos de imagen');
            return;
        }

        setIsUploadingCover(true);
        try {
            const uploadedFiles = await uploadFiles([imageFile], studioSlug, 'portfolios', 'covers');
            if (uploadedFiles.length > 0) {
                console.log('📸 Cover uploaded:', {
                    url: uploadedFiles[0].url,
                    size: uploadedFiles[0].size,
                    fileName: uploadedFiles[0].fileName
                });
                setFormData(prev => ({
                    ...prev,
                    cover_image_url: uploadedFiles[0].url,
                    cover_storage_bytes: uploadedFiles[0].size
                }));
                toast.success('Carátula subida correctamente');
            }
        } catch (error) {
            console.error("Error uploading cover:", error);
            toast.error('Error al subir la carátula');
        } finally {
            setIsUploadingCover(false);
        }
    };

    const handleCoverFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleCoverUpload(Array.from(files));
            // Reset input
            e.target.value = '';
        }
    };

    const handleCoverDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverCover(true);
    };

    const handleCoverDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverCover(false);
    };

    const handleCoverDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverCover(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleCoverUpload(Array.from(files));
        }
    };

    const handleRemoveCover = () => {
        setFormData(prev => ({
            ...prev,
            cover_image_url: null,
            cover_storage_bytes: null
        }));
        toast.success('Carátula eliminada');
    };

    return (
        <div className="space-y-6">
            {/* Header con botón de regresar y acciones */}
            <div className="flex items-center justify-between gap-4">
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

                {/* Botones de acción en el header */}
                <div className="flex items-center gap-3">
                    <ZenButton
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                    >
                        Cancelar
                    </ZenButton>
                    <ZenButton
                        onClick={() => handleSave(formData.is_published)}
                        loading={isSaving}
                        disabled={isSaving || isValidatingSlug || !!titleError}
                    >
                        {mode === "create"
                            ? (formData.is_published ? "Publicar ahora" : "Guardar borrador")
                            : (isDraft
                                ? (formData.is_published ? "Publicar ahora" : "Actualizar borrador")
                                : "Actualizar Portfolio"
                            )
                        }
                    </ZenButton>

                    {/* Menú de opciones - Solo en modo editar */}
                    {mode === "edit" && (
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    disabled={isSaving || isDeleting}
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end" className="w-48">
                                <ZenDropdownMenuItem
                                    onClick={async () => {
                                        if (!formData.slug) return;
                                        const portfolioUrl = `${window.location.origin}/${studioSlug}/portfolios/${formData.slug}`;
                                        try {
                                            await navigator.clipboard.writeText(portfolioUrl);
                                            setLinkCopied(true);
                                            toast.success("Link copiado al portapapeles");
                                            setTimeout(() => setLinkCopied(false), 2000);
                                        } catch {
                                            toast.error("Error al copiar el link");
                                        }
                                    }}
                                    disabled={!formData.slug}
                                >
                                    <Share2 className="h-4 w-4 mr-2" />
                                    {linkCopied ? "¡Copiado!" : "Copiar link público"}
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={() => setShowDeleteModal(true)}
                                    className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar portfolio
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Panel de Edición */}
                <div className="space-y-6">
                    <ZenCard>
                        <ZenCardHeader>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <ZenCardTitle>
                                        {mode === "create" ? "Nuevo Portfolio" : "Tu Portafolio"}
                                    </ZenCardTitle>

                                    <div className="flex items-center gap-4">
                                        {/* Switch de Publicado */}
                                        <ZenSwitch
                                            checked={formData.is_published || pendingPublishSwitch}
                                            disabled={isSaving || isDeleting}
                                            onCheckedChange={(checked) => {
                                                if (isSaving || isDeleting) return;
                                                if (mode === "edit" && isDraft && checked && !formData.is_published) {
                                                    setPendingPublishSwitch(true);
                                                    setShowPublishModal(true);
                                                } else {
                                                    setPendingPublishSwitch(false);
                                                    handleInputChange("is_published", checked);
                                                }
                                            }}
                                            label="Publicado"
                                        />
                                    </div>
                                </div>

                                {/* Información de almacenamiento total */}
                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                    <span>
                                        {formData.cover_storage_bytes && Number(formData.cover_storage_bytes) > 0 ? 'Portada + ' : ''}
                                        {contentBlocks.length} componente{contentBlocks.length !== 1 ? 's' : ''}
                                    </span>
                                    <span>•</span>
                                    <div className="flex items-center gap-2">
                                        <HardDrive className="w-3 h-3 text-zinc-500" />
                                        <span className="text-xs font-medium text-emerald-400">
                                            {formatBytes(Number(formData.cover_storage_bytes || 0) + totalComponentsSize)}
                                        </span>
                                    </div>
                                    <span>almacenados</span>
                                </div>
                            </div>
                        </ZenCardHeader>

                        <ZenCardContent className="space-y-4">
                            {/* Título y descripción */}
                            <div className="space-y-4">
                                {/* Título */}
                                <div>
                                    <ZenInput
                                        label="Título"
                                        value={formData.title || ""}
                                        onChange={(e) => handleInputChange("title", e.target.value)}
                                        placeholder="Título del portfolio"
                                        error={titleError ?? undefined}
                                    />
                                    {/* Indicador de validación y hint */}
                                    {isValidatingSlug && !titleError && (
                                        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Validando disponibilidad...
                                        </p>
                                    )}
                                    {slugHint && !isValidatingSlug && !titleError && (
                                        <p className="text-xs text-emerald-400 mt-1">
                                            {slugHint}
                                        </p>
                                    )}
                                </div>

                                {/* Descripción breve */}
                                <div>
                                    <ZenTextarea
                                        label="Descripción breve"
                                        value={formData.description || ""}
                                        onChange={(e) => handleInputChange("description", e.target.value)}
                                        placeholder="Descripción del portfolio (máx. 100 caracteres)"
                                        rows={2}
                                        maxLength={100}
                                    />
                                </div>

                                {/* Portada - Versión compacta lado a lado */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-zinc-300">
                                            Imagen de Portada
                                        </label>
                                        {formData.cover_storage_bytes && Number(formData.cover_storage_bytes) > 0 && (
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-3 h-3 text-zinc-500" />
                                                <span className="text-xs font-medium text-emerald-400">
                                                    {formatBytes(Number(formData.cover_storage_bytes))}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/50">
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Preview */}
                                            {formData.cover_image_url ? (
                                                <div className="relative group">
                                                    <div className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                                                        <Image
                                                            src={formData.cover_image_url}
                                                            alt="Portada del portfolio"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveCover}
                                                            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-video bg-zinc-800/50 rounded-lg border border-zinc-800 flex items-center justify-center">
                                                    <span className="text-xs text-zinc-600">Vista previa</span>
                                                </div>
                                            )}

                                            {/* Drop zone */}
                                            <label className="block">
                                                <div
                                                    className={`aspect-video border-2 border-dashed rounded-lg transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${isDragOverCover
                                                        ? 'border-emerald-500 bg-emerald-500/10'
                                                        : 'border-zinc-700 hover:border-emerald-500 bg-zinc-800/30'
                                                        }`}
                                                    onDragOver={handleCoverDragOver}
                                                    onDragLeave={handleCoverDragLeave}
                                                    onDrop={handleCoverDrop}
                                                >
                                                    {isUploadingCover ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-400 border-t-transparent"></div>
                                                            <span className="text-xs text-zinc-400">Subiendo...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-5 w-5 text-zinc-400" />
                                                            <span className="text-xs text-zinc-400 text-center px-2">
                                                                {formData.cover_image_url ? 'Cambiar imagen' : 'Arrastra o haz clic'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleCoverFileInput}
                                                    className="hidden"
                                                    disabled={isUploadingCover}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <p className="text-xs text-zinc-500">
                                        Imagen que se mostrará en la vista previa del portfolio
                                    </p>
                                </div>

                                {/* Divisor */}
                                <div className="border-t border-zinc-800"></div>

                                {/* Tipo de Evento */}
                                <TipoEventoSelector
                                    studioSlug={studioSlug}
                                    selectedEventTypeId={formData.event_type_id || null}
                                    onChange={(eventTypeId) => handleInputChange("event_type_id", eventTypeId)}
                                    showBadge={false}
                                />
                            </div>

                            {/* Sistema de Bloques de Contenido */}
                            <div className="space-y-2">
                                {/* Cabecera informativa única - Siempre visible */}
                                <div className="mb-6 pt-6 pb-4 border-t border-zinc-800">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-semibold text-zinc-200">
                                                Componentes
                                            </h3>
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                {contentBlocks.length}
                                            </span>
                                        </div>
                                        {contentBlocks.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-3 h-3 text-zinc-500" />
                                                <span className="text-xs font-medium text-emerald-400">
                                                    {formatBytes(totalComponentsSize)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {contentBlocks.length > 0 && (
                                        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                                            Arrastra para reordenar o agrega nuevos componentes entre los existentes
                                        </p>
                                    )}
                                </div>

                                <div data-content-blocks-container className="space-y-4">
                                    {/* Botón persistente para agregar componente en posición 0 - Solo si hay componentes */}
                                    {contentBlocks.length > 0 && (
                                        <button
                                            type="button"
                                            data-persistent-add-button="true"
                                            onClick={() => {
                                                setInsertAtIndex(0);
                                                setShowComponentSelector(true);
                                            }}
                                            className="w-full py-2 px-4 text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-md transition-all bg-zinc-900 hover:bg-zinc-400 hover:text-zinc-900 hover:border-zinc-400"
                                        >
                                            <svg
                                                className="w-4 h-4 inline mr-2"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M12 4v16m8-8H4"
                                                />
                                            </svg>
                                            Agregar componente aquí
                                        </button>
                                    )}
                                    {/* Usar un solo ContentBlocksEditor con todos los bloques para ordenamiento */}
                                    <ContentBlocksEditor
                                        blocks={contentBlocks}
                                        onBlocksChange={(updatedBlocksOrFn) => {
                                            // Manejar tanto array como función de actualización
                                            setContentBlocks(prev => {
                                                const updatedBlocks = typeof updatedBlocksOrFn === 'function'
                                                    ? updatedBlocksOrFn(prev)
                                                    : updatedBlocksOrFn;

                                                // Log solo para eliminación
                                                if (updatedBlocks.length < prev.length) {
                                                    const removedIds = prev.map(b => b.id).filter(id => !updatedBlocks.find(b => b.id === id));
                                                    console.log('🟢 [PortfolioEditor] ⚠️ BLOQUE ELIMINADO:', {
                                                        previousCount: prev.length,
                                                        newCount: updatedBlocks.length,
                                                        removedIds,
                                                        previousIds: prev.map(b => ({ id: b.id, order: b.order })),
                                                        newIds: updatedBlocks.map(b => ({ id: b.id, order: b.order }))
                                                    });
                                                }

                                                // Siempre actualizar con el array que viene de ContentBlocksEditor
                                                return updatedBlocks.map((block, index) => ({
                                                    ...block,
                                                    order: index
                                                }));
                                            });
                                        }}
                                        studioSlug={studioSlug}
                                        hideHeader={true}
                                        onAddComponentClick={() => {
                                            // Cuando se hace clic en agregar desde ContentBlocksEditor, usar nuestro selector completo
                                            setInsertAtIndex(undefined);
                                            setShowComponentSelector(true);
                                        }}
                                        onDragStateChange={handleDragStateChange}
                                        heroContext="portfolio"
                                        heroContextData={{
                                            eventTypeName: eventTypeName || undefined
                                        }}
                                    />

                                    {/* Inyectar botones después de cada bloque usando useEffect - Solo si hay componentes */}
                                    {contentBlocks.length > 0 && (
                                        <InjectAddButtons
                                            contentBlocks={contentBlocks}
                                            activeBlockId={activeBlockId}
                                            onInsertAt={(index) => {
                                                setInsertAtIndex(index);
                                                setShowComponentSelector(true);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Modal Selector - Compartido para todos los botones de agregar */}
                            <CategorizedComponentSelector
                                isOpen={showComponentSelector}
                                onClose={() => {
                                    setShowComponentSelector(false);
                                    setInsertAtIndex(undefined);
                                }}
                                onSelect={handleAddComponentFromSelector}
                            />

                            {/* Palabras Clave */}
                            <div className="space-y-4 p-4 border border-zinc-800 rounded-md mt-6">
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
                                        - No hay palabras clave agregadas aún.
                                    </p>
                                )}

                                <p className="text-xs text-zinc-600 mt-2">
                                    Las palabras clave ayudan a que tu portfolio sea más fácil de encontrar
                                </p>
                            </div>

                            {/* Botón Guardar como borrador - Solo en modo create */}
                            {mode === "create" && (
                                <div className="pt-4">
                                    <ZenButton
                                        variant="outline"
                                        onClick={() => handleSave(false)}
                                        loading={isSaving}
                                        disabled={isSaving || isValidatingSlug || !!titleError}
                                        className="w-full"
                                    >
                                        Guardar como borrador
                                    </ZenButton>
                                </div>
                            )}
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
                            isEditMode={true}
                            hidePortfolioHeader={true}
                            hideHeader={true}
                            hideFooter={true}
                        />
                    </div>
                </div>
            </div>

            {/* Modal de Confirmación - Cancelar */}
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

            {/* Modal de Confirmación - Publicar */}
            <ZenConfirmModal
                isOpen={showPublishModal}
                onClose={() => {
                    // No permitir cerrar si se está publicando
                    if (isPublishingFromModal) return;

                    // Si se cancela, revertir el switch a false
                    setPendingPublishSwitch(false);
                    setShowPublishModal(false);
                }}
                onConfirm={async () => {
                    // No permitir múltiples confirmaciones
                    if (isPublishingFromModal || isSaving) return;

                    setIsPublishingFromModal(true);
                    setIsSaving(true);

                    // Confirmar el cambio del switch y publicar
                    setPendingPublishSwitch(false);
                    handleInputChange("is_published", true);

                    // Esperar un momento para que el estado se actualice
                    await new Promise(resolve => setTimeout(resolve, 100));

                    try {
                        await handleSave(true);
                        // El modal se cerrará y redirigirá desde handleSave si es exitoso
                    } catch (error) {
                        console.error("Error publishing portfolio:", error);
                        setIsPublishingFromModal(false);
                        setIsSaving(false);
                        // No cerrar el modal en caso de error para que el usuario pueda intentar de nuevo
                    }
                }}
                title="Publicar Portfolio"
                description="¿Estás seguro de publicar tu portfolio? Al publicar será visible y accesible inmediatamente en tu lista pública de portfolios."
                confirmText={isPublishingFromModal ? "Publicando..." : "Sí, Publicar"}
                cancelText="Cancelar"
                variant="default"
                loading={isPublishingFromModal}
                disabled={isPublishingFromModal}
            />

            {/* Modal de Confirmación - Eliminar */}
            <ZenConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={async () => {
                    if (!portfolio?.id) {
                        toast.error("No se puede eliminar: portfolio no encontrado");
                        return;
                    }

                    setIsDeleting(true);
                    try {
                        const result = await deleteStudioPortfolio(portfolio.id);
                        if (result.success) {
                            toast.success("Portfolio eliminado exitosamente");
                            router.push(`/${studioSlug}/studio/commercial/portafolios`);
                        } else {
                            toast.error(result.error || "Error al eliminar portfolio");
                            setIsDeleting(false);
                        }
                    } catch (error) {
                        console.error("Error deleting portfolio:", error);
                        toast.error("Error al eliminar portfolio");
                        setIsDeleting(false);
                    }
                }}
                title="Eliminar Portfolio"
                description="¿Estás seguro de que quieres eliminar este portfolio? Esta acción no se puede deshacer."
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeleting}
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

