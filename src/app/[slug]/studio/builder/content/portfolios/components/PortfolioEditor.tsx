"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ZenButton, ZenInput, ZenSelect, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenConfirmModal, ZenSwitch, ZenBadge, ZenTagModal } from "@/components/ui/zen";
import { MobilePreviewFull } from "../../../components/MobilePreviewFull";
import { ContentBlocksEditor } from "@/components/content-blocks";
import { ContentBlock } from "@/types/content-blocks";
import { CategorizedComponentSelector, ComponentOption } from "./CategorizedComponentSelector";
import { obtenerIdentidadStudio } from "@/lib/actions/studio/builder/identidad.actions";
import { getStudioPortfoliosBySlug } from "@/lib/actions/studio/builder/portfolios/portfolios.actions";
import { PortfolioFormData } from "@/lib/actions/schemas/portfolio-schemas";
import { useTempCuid } from "@/hooks/useTempCuid";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Star, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import cuid from "cuid";
import Image from "next/image";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { calculateTotalStorage, formatBytes } from "@/lib/utils/storage";

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
    useEffect(() => {
        console.log('🔵 [InjectAddButtons] useEffect ejecutado:', {
            contentBlocksLength: contentBlocks.length,
            activeBlockId,
            timestamp: new Date().toISOString()
        });

        // Remover todos los botones inyectados cuando se arrastra (solo cuando es 'dragging')
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

            // Para cada bloque, agregar botón después (entre bloques)
            contentBlocks.forEach((block, index) => {
                const blockElement = document.getElementById(block.id);
                if (!blockElement) {
                    console.log('🔵 [InjectAddButtons] No se encontró elemento para bloque:', block.id);
                    return;
                }

                // Verificar si ya existe un botón inyectado para este bloque
                const existingButton = document.querySelector(`[data-injected-add-button="${block.id}"]`);
                if (existingButton) {
                    console.log('🔵 [InjectAddButtons] Botón ya existe para bloque:', block.id);
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
                button.className = 'w-full py-2 px-4 text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-md transition-all bg-zinc-900 hover:bg-zinc-400 hover:text-zinc-900 hover:border-zinc-400';

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

                button.onclick = () => onInsertAt(index + 1);

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
    }, [contentBlocks.length, activeBlockId, onInsertAt]); // Solo re-ejecutar cuando cambia la cantidad de bloques o el estado de drag

    return null;
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
        is_published: portfolio?.is_published ?? true,
        content_blocks: portfolio?.content_blocks || [],
        order: portfolio?.order || 0,
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

    // Estado para preview
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    // Estado para modal de confirmación
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [showComponentSelector, setShowComponentSelector] = useState(false);
    const [insertAtIndex, setInsertAtIndex] = useState<number | undefined>(undefined);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [isDragOverCover, setIsDragOverCover] = useState(false);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const { uploadFiles } = useMediaUpload();

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

    // Calcular tamaño total de todos los componentes
    const totalComponentsSize = useMemo(() => {
        const allMedia = contentBlocks.flatMap(block => block.media || []);
        return calculateTotalStorage(allMedia);
    }, [contentBlocks]);

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

    // Función para crear un bloque desde el selector categorizado
    const handleAddComponentFromSelector = (component: ComponentOption) => {
        const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let config: Record<string, unknown> = {};

        // Configuración específica por tipo
        if (component.type === 'image') {
            config = {
                aspectRatio: 'square',
                showCaptions: false
            };
        } else if (component.type === 'gallery') {
            config = {
                mode: component.mode,
                columns: component.mode === 'grid' ? 3 : undefined,
                gap: 4,
                aspectRatio: 'square',
                showCaptions: false,
                showTitles: false,
                lightbox: component.mode !== 'slide',
                autoplay: component.mode === 'slide' ? 3000 : undefined,
                perView: component.mode === 'slide' ? 1 : undefined,
                showArrows: component.mode === 'slide',
                showDots: component.mode === 'slide'
            };
        } else if (component.type === 'video') {
            config = {
                autoPlay: false,
                muted: true,
                loop: false,
                controls: true
            };
        } else if (component.type === 'heading-1') {
            config = {
                text: 'Tu Título Principal',
                fontSize: '2xl',
                fontWeight: 'bold',
                alignment: 'left'
            };
        } else if (component.type === 'heading-3') {
            config = {
                text: 'Tu Subtítulo',
                fontSize: 'xl',
                fontWeight: 'semibold',
                alignment: 'left'
            };
        } else if (component.type === 'blockquote') {
            config = {
                text: 'Tu cita destacada aquí',
                fontSize: 'lg',
                fontWeight: 'medium',
                alignment: 'left'
            };
        } else if (component.type === 'text') {
            config = {
                text: '',
                alignment: 'left'
            };
        } else if (component.type === 'hero-contact') {
            config = {
                evento: 'Eventos',
                titulo: 'Contáctanos Hoy Mismo',
                descripcion: 'Nos emociona saber que nos estás considerando para cubrir tu evento. Especialistas en bodas, XV años y eventos corporativos.',
                gradientFrom: 'from-purple-600',
                gradientTo: 'to-blue-600',
                showScrollIndicator: true
            };
        } else if (component.type === 'hero-image') {
            config = {
                title: 'Tu Título Aquí',
                subtitle: 'Subtítulo Impactante',
                description: 'Descripción que cautive a tus prospectos',
                buttons: [
                    {
                        text: 'Ver Trabajo',
                        variant: 'primary',
                        size: 'lg'
                    },
                    {
                        text: 'Contactar',
                        variant: 'outline',
                        size: 'lg'
                    }
                ],
                overlay: true,
                overlayOpacity: 50,
                textAlignment: 'center',
                imagePosition: 'center'
            };
        } else if (component.type === 'hero-video') {
            config = {
                title: 'Tu Título Aquí',
                subtitle: 'Subtítulo Impactante',
                description: 'Descripción que cautive a tus prospectos',
                buttons: [
                    {
                        text: 'Ver Trabajo',
                        variant: 'primary',
                        size: 'lg'
                    },
                    {
                        text: 'Contactar',
                        variant: 'outline',
                        size: 'lg'
                    }
                ],
                overlay: true,
                overlayOpacity: 50,
                textAlignment: 'center',
                autoPlay: true,
                muted: true,
                loop: true
            };
        } else if (component.type === 'hero-text') {
            config = {
                title: 'Tu Título Aquí',
                subtitle: 'Subtítulo Impactante',
                description: 'Descripción que cautive a tus prospectos',
                buttons: [
                    {
                        text: 'Ver Trabajo',
                        variant: 'primary',
                        size: 'lg'
                    },
                    {
                        text: 'Contactar',
                        variant: 'outline',
                        size: 'lg'
                    }
                ],
                backgroundVariant: 'gradient',
                backgroundGradient: 'from-zinc-900 via-zinc-800 to-zinc-900',
                textAlignment: 'center',
                pattern: 'dots',
                textColor: 'text-white'
            };
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
                setFormData(prev => ({
                    ...prev,
                    cover_image_url: uploadedFiles[0].url
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
            cover_image_url: null
        }));
        toast.success('Carátula eliminada');
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

                                <div className="flex items-center gap-4">
                                    {/* Switch de Publicado */}
                                    <ZenSwitch
                                        checked={formData.is_published}
                                        onCheckedChange={(checked) => handleInputChange("is_published", checked)}
                                        label="Publicado"
                                    />

                                    {/* Botón de Destacar */}
                                    <ZenButton
                                        type="button"
                                        variant={formData.is_featured ? undefined : "outline"}
                                        size="sm"
                                        onClick={() => handleInputChange("is_featured", !formData.is_featured)}
                                        className={`rounded-full gap-2 transition-all ${formData.is_featured
                                            ? "bg-amber-500 hover:bg-amber-600 text-black border-amber-500"
                                            : ""
                                            }`}
                                    >
                                        <Star className={`h-4 w-4 ${formData.is_featured ? 'fill-current' : ''}`} />
                                        Destacar
                                    </ZenButton>
                                </div>
                            </div>
                        </ZenCardHeader>

                        <ZenCardContent className="space-y-4">
                            {/* Layout 3 columnas: Portada | Título y Slug */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Columna 1: Portada */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-zinc-300">
                                        Portada
                                    </label>
                                    {formData.cover_image_url ? (
                                        <div className="relative group">
                                            <div className="aspect-square relative bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                                                <Image
                                                    src={formData.cover_image_url}
                                                    alt="Carátula del portfolio"
                                                    fill
                                                    className="object-cover"
                                                />
                                                <button
                                                    onClick={handleRemoveCover}
                                                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="block">
                                            <div
                                                className={`aspect-square border-2 border-dashed rounded-lg transition-colors cursor-pointer flex items-center justify-center bg-zinc-800/30 ${isDragOverCover
                                                    ? 'border-emerald-500 bg-emerald-500/10'
                                                    : 'border-zinc-700 hover:border-emerald-500'
                                                    }`}
                                                onDragOver={handleCoverDragOver}
                                                onDragLeave={handleCoverDragLeave}
                                                onDrop={handleCoverDrop}
                                            >
                                                {isUploadingCover ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent"></div>
                                                        <span className="text-sm text-zinc-400">Subiendo...</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                                                        <Upload className="h-8 w-8" />
                                                        <span className="text-sm text-center px-2">Haz clic para subir</span>
                                                    </div>
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
                                    )}
                                </div>

                                {/* Columnas 2-3: Título y Slug */}
                                <div className="col-span-2 space-y-4">
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
                                        placeholder="slug-del-portfolio"
                                        hint="Se genera automáticamente desde el título. Solo lectura."
                                        readOnly
                                    />
                                </div>
                            </div>

                            {/* Divisor superior */}
                            <div className="border-t border-dotted border-zinc-800 my-8" />

                            {/* Sistema de Bloques de Contenido */}
                            <div className="space-y-2">
                                {/* Cabecera informativa única - Siempre visible */}
                                <div className="mb-6 pb-4 border-b border-zinc-800/50">
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
                                                <span className="text-xs text-zinc-500">Almacenamiento:</span>
                                                <span className="text-xs font-medium text-zinc-300">
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

                                <div data-content-blocks-container className="space-y-2">
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

                            {/* Divisor inferior */}
                            <div className="border-t border-dotted border-zinc-800 my-8" />

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
                            isEditMode={true}
                            hidePortfolioHeader={true}
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

