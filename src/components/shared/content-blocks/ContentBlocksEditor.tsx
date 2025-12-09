'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Image as ImageIcon, Video, Type, Grid3X3, X, LayoutGrid, MessageCircle, Play, FileText, Copy } from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    DragEndEvent,
    DragStartEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { ZenButton } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { ContentBlock, ComponentType, MediaMode, MediaType, MediaItem, MediaBlockConfig, HeroConfig, HeroContactConfig, HeroImageConfig, HeroVideoConfig, HeroTextConfig } from '@/types/content-blocks';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toast } from 'sonner';
import { VideoSingle } from '@/components/shared/video';
import { ImageSingle, ImageGrid, MediaGallery } from '@/components/shared/media';
import { RichTextBlock } from '@/components/shared/text';
import HeroEditor from '@/components/shared/hero/HeroEditor';
import { formatBytes, calculateTotalStorage, getStorageInfo } from '@/lib/utils/storage';

// Función para obtener el nombre de visualización del componente
function getComponentDisplayName(block: ContentBlock): string {
    switch (block.type) {
        case 'image':
            return 'Imagen';
        case 'gallery':
            const mode = (block.config?.mode as MediaMode) || 'grid';
            const modeLabels: Record<MediaMode, string> = {
                single: 'Imagen',
                grid: 'Galería Grid',
                masonry: 'Imagen Masonry',
                slide: 'Galería Carousel'
            };
            return modeLabels[mode];
        case 'media-gallery':
            const mediaMode = (block.config?.mode as MediaMode) || 'grid';
            const mediaModeLabels: Record<MediaMode, string> = {
                single: 'Media Gallery',
                grid: 'Media Gallery Grid',
                masonry: 'Media Gallery Masonry',
                slide: 'Media Gallery Carousel'
            };
            return mediaModeLabels[mediaMode] || 'Media Gallery';
        case 'video':
            return 'Video';
        case 'text':
            const textType = (block.config?.textType as string) || 'text';
            const textTypeLabels: Record<string, string> = {
                'heading-1': 'Título (H1)',
                'heading-3': 'Subtítulo (H3)',
                'text': 'Párrafo',
                'blockquote': 'Cita',
            };
            return textTypeLabels[textType] || 'Bloque de Texto';
        case 'hero-contact':
            return 'Hero Contacto';
        case 'hero-image':
            return 'Hero Imagen';
        case 'hero-video':
            return 'Hero Video';
        case 'hero-text':
            return 'Hero Texto';
        case 'hero':
            return 'Hero';
        default:
            return 'Componente';
    }
}


interface ContentBlocksEditorProps {
    blocks: ContentBlock[];
    onBlocksChange: (blocks: ContentBlock[] | ((prev: ContentBlock[]) => ContentBlock[])) => void;
    studioSlug: string;
    className?: string;
    customSelector?: React.ReactNode;
    onAddComponentClick?: () => void;
    hideHeader?: boolean;
    onDragStateChange?: (isDragging: boolean) => void;
    // Props para contexto del Hero (ofertas, portfolios, etc.)
    heroContext?: 'portfolio' | 'offer';
    heroContextData?: {
        offerSlug?: string;
        offerId?: string;
    };
}

// Componentes esenciales - Simplificados
const ALL_COMPONENTS = [
    // Imagen única
    {
        type: 'image' as ComponentType,
        mode: 'single' as MediaMode,
        mediaType: 'images' as MediaType,
        label: 'Imagen',
        icon: ImageIcon,
        description: 'Una sola imagen'
    },
    // Galería Grid
    {
        type: 'gallery' as ComponentType,
        mode: 'grid' as MediaMode,
        mediaType: 'images' as MediaType,
        label: 'Galería Grid',
        icon: Grid3X3,
        description: 'Cuadrícula de imágenes'
    },
    // Galería Masonry
    {
        type: 'gallery' as ComponentType,
        mode: 'masonry' as MediaMode,
        mediaType: 'images' as MediaType,
        label: 'Galería Masonry',
        icon: Grid3X3,
        description: 'Diseño tipo Pinterest'
    },
    // Galería Carousel
    {
        type: 'gallery' as ComponentType,
        mode: 'slide' as MediaMode,
        mediaType: 'images' as MediaType,
        label: 'Galería Carousel',
        icon: ImageIcon,
        description: 'Carrusel de imágenes'
    },
    // Video único
    {
        type: 'video' as ComponentType,
        mode: 'single' as MediaMode,
        mediaType: 'videos' as MediaType,
        label: 'Video',
        icon: Video,
        description: 'Un solo video'
    },
    // Bloque de texto
    {
        type: 'text' as ComponentType,
        mode: undefined,
        mediaType: undefined,
        label: 'Texto',
        icon: Type,
        description: 'Bloque de texto'
    },
    // Heroes - Componentes Premium
    {
        type: 'hero-contact' as ComponentType,
        mode: undefined,
        mediaType: undefined,
        label: 'Hero Contacto',
        icon: MessageCircle,
        description: 'Hero con call-to-action',
        isPremium: true
    },
    {
        type: 'hero-image' as ComponentType,
        mode: 'single' as MediaMode,
        mediaType: 'images' as MediaType,
        label: 'Hero Imagen',
        icon: ImageIcon,
        description: 'Hero con imagen de fondo',
        isPremium: true
    },
    {
        type: 'hero-video' as ComponentType,
        mode: 'single' as MediaMode,
        mediaType: 'videos' as MediaType,
        label: 'Hero Video',
        icon: Play,
        description: 'Hero con video de fondo',
        isPremium: true
    },
    {
        type: 'hero-text' as ComponentType,
        mode: undefined,
        mediaType: undefined,
        label: 'Hero Texto',
        icon: FileText,
        description: 'Hero con fondo decorativo',
        isPremium: true
    },
];

export function ContentBlocksEditor({
    blocks,
    onBlocksChange,
    studioSlug,
    className = '',
    customSelector,
    onAddComponentClick,
    hideHeader = false,
    onDragStateChange,
    heroContext,
    heroContextData
}: ContentBlocksEditorProps) {
    const [activeBlock, setActiveBlock] = useState<ContentBlock | null>(null);
    const [showComponentSelector, setShowComponentSelector] = useState(false);
    const [uploadingBlocks, setUploadingBlocks] = useState<Set<string>>(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [blockToDelete, setBlockToDelete] = useState<ContentBlock | null>(null);
    const [deletingBlocks, setDeletingBlocks] = useState<Set<string>>(new Set());
    const [isHydrated, setIsHydrated] = useState(false);
    const { uploadFiles } = useMediaUpload();

    // Evitar problemas de hidratación con @dnd-kit
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Configuración de sensores
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
            // Cancelar drag si se hace click en un botón de eliminar o cualquier botón
            shouldCancelStart: (event: PointerEvent) => {
                const target = event.target as HTMLElement;

                console.log('🟠 [SENSOR] shouldCancelStart llamado:', {
                    tagName: target.tagName,
                    isButton: target.tagName === 'BUTTON' || target.closest('button'),
                    isInput: target.tagName === 'INPUT' || target.closest('input'),
                    isTextarea: target.tagName === 'TEXTAREA' || target.closest('textarea'),
                    isDeleteButton: target.closest('[data-delete-button="true"]'),
                    isDuplicateButton: target.closest('[data-duplicate-button="true"]'),
                    isInternalButton: target.closest('[data-internal-button="true"]'),
                    isDragHandle: target.closest('[data-sortable-handle]'),
                    closestHandle: target.closest('[data-sortable-handle]')?.getAttribute('data-sortable-handle')
                });

                // PRIMERO: Si es un botón interno (TextToolbar, etc.), cancelar SIEMPRE
                const internalButton = target.closest('[data-internal-button="true"]');
                if (internalButton) {
                    console.log('🟠 [SENSOR] ✅ Cancelando drag - botón interno detectado');
                    return true;
                }

                // Si es un botón de eliminar o duplicar o está dentro de uno, cancelar SIEMPRE
                const deleteButton = target.closest('[data-delete-button="true"]');
                const duplicateButton = target.closest('[data-duplicate-button="true"]');
                if (deleteButton || duplicateButton) {
                    console.log('🟠 [SENSOR] ✅ Cancelando drag - botón de eliminar/duplicar');
                    return true;
                }

                // Si es un input, textarea o cualquier elemento editable, cancelar SIEMPRE
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
                    target.closest('input') || target.closest('textarea') ||
                    target.isContentEditable || target.closest('[contenteditable="true"]')) {
                    console.log('🟠 [SENSOR] ✅ Cancelando drag - elemento editable');
                    return true;
                }

                // Si es cualquier botón, verificar si es el handle de arrastre
                if (target.tagName === 'BUTTON' || target.closest('button')) {
                    // Permitir drag SOLO si es el handle de arrastre (tiene data-sortable-handle)
                    const isDragHandle = target.closest('[data-sortable-handle]') !== null;
                    if (!isDragHandle) {
                        console.log('🟠 [SENSOR] ✅ Cancelando drag - botón no es handle');
                    } else {
                        console.log('🟠 [SENSOR] ❌ Permitir drag - botón ES handle');
                    }
                    return !isDragHandle;
                }

                // Si NO está dentro del handle de arrastre, cancelar
                // Solo permitir drag si el click viene específicamente del handle
                const isDragHandle = target.closest('[data-sortable-handle]') !== null;
                if (!isDragHandle) {
                    console.log('🟠 [SENSOR] ✅ Cancelando drag - no es handle');
                    return true;
                }

                // Si llegamos aquí, es un click en el handle - permitir drag
                console.log('🟠 [SENSOR] ❌ Permitir drag - es handle');
                return false;
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Generar ID único para componentes
    const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Agregar componente directamente - Tipos específicos
    const handleAddComponent = useCallback((component: typeof ALL_COMPONENTS[0]) => {
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
        } else if (component.type === 'media-gallery') {
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
        } else if (component.type === 'video') {
            config = {
                autoPlay: false,
                muted: true,
                loop: false,
                controls: true
            };
        } else if (component.type === 'hero-contact') {
            config = {
                evento: 'Eventos',
                titulo: 'Contáctanos Hoy Mismo',
                descripcion: 'Nos emociona saber que nos estás considerando para cubrir tu evento. Especialistas en bodas, XV años y eventos corporativos.',
                gradientFrom: 'from-purple-600',
                gradientTo: 'to-blue-600',
                showScrollIndicator: true,
                // Almacenar contexto para persistencia en re-renders
                _context: heroContext,
                _contextData: heroContextData
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
                imagePosition: 'center',
                // Almacenar contexto para persistencia en re-renders
                _context: heroContext,
                _contextData: heroContextData
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
                loop: true,
                // Almacenar contexto para persistencia en re-renders
                _context: heroContext,
                _contextData: heroContextData
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
                textColor: 'text-white',
                // Almacenar contexto para persistencia en re-renders
                _context: heroContext,
                _contextData: heroContextData
            };
        } else if (component.type === 'hero') {
            config = {
                title: 'Tu Título Aquí',
                subtitle: 'Subtítulo Impactante',
                description: 'Descripción que cautive a tus prospectos',
                textAlignment: 'center',
                verticalAlignment: 'center',
                backgroundType: 'image',
                containerStyle: 'fullscreen',
                // Almacenar contexto para persistencia en re-renders
                _context: heroContext,
                _contextData: heroContextData
            };
        } else if (component.type === 'text') {
            config = {
                text: '',
                textType: 'text',
                fontSize: 'base',
                fontWeight: 'normal',
                alignment: 'left',
                italic: false
            };
        } else if (component.type === 'separator') {
            config = {
                style: 'solid',
                height: 0.5
            };
        }

        const newBlock: ContentBlock = {
            id: generateId(),
            type: component.type,
            order: blocks.length,
            presentation: 'block',
            media: [],
            config
        };
        onBlocksChange([...blocks, newBlock]);

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
    }, [blocks, onBlocksChange, heroContext, heroContextData]);


    // Duplicar componente
    const handleDuplicateBlock = useCallback((block: ContentBlock) => {
        console.log('🟢 [handleDuplicateBlock] Duplicando componente:', {
            blockId: block.id,
            blockType: block.type,
            blockOrder: block.order,
            currentBlocksCount: blocks.length,
            timestamp: new Date().toISOString()
        });

        const currentIndex = blocks.findIndex(b => b.id === block.id);
        if (currentIndex === -1) {
            console.log('🟢 [handleDuplicateBlock] ERROR: Componente no encontrado');
            return;
        }

        // Crear componente duplicado con nuevo ID y order
        const duplicatedBlock: ContentBlock = {
            ...block,
            id: generateId(),
            order: block.order + 1,
            // Copiar media si existe (sin duplicar las referencias de archivos)
            media: block.media ? block.media.map(item => ({
                ...item,
                id: `${item.id}_copy_${Date.now()}`
            })) : []
        };

        // Insertar después del componente original y actualizar orders de los siguientes
        const newBlocks = [...blocks];
        newBlocks.splice(currentIndex + 1, 0, duplicatedBlock);

        // Actualizar orders de todos los componentes después del duplicado
        const updatedBlocks = newBlocks.map((b, index) => ({
            ...b,
            order: index
        }));

        onBlocksChange(updatedBlocks);

        // Scroll automático al componente duplicado después de un breve delay
        setTimeout(() => {
            const duplicatedBlockElement = document.getElementById(duplicatedBlock.id);
            if (duplicatedBlockElement) {
                duplicatedBlockElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100);

        toast.success('Componente duplicado correctamente');
    }, [blocks, onBlocksChange]);

    // Actualizar componente
    const handleUpdateBlock = useCallback((blockId: string, updates: Partial<ContentBlock>) => {
        const newBlocks = blocks.map(block =>
            block.id === blockId ? { ...block, ...updates } : block
        );
        onBlocksChange(newBlocks);
    }, [blocks, onBlocksChange]);

    // Reordenar componentes
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;

        // CRITICAL: This function is called by dnd-kit when drag starts
        // But we need to verify it's actually from the handle before notifying parent
        console.log('🟠 [ContentBlocksEditor] handleDragStart llamado:', {
            activeId: active.id,
            event: event
        });

        const block = blocks.find(b => b.id === active.id);
        if (!block) {
            console.log('🟠 [ContentBlocksEditor] Bloque no encontrado - cancelando');
            return;
        }

        // Get the original pointer event that started the drag
        const pointerEvent = (event as unknown as { activatorEvent?: PointerEvent })?.activatorEvent;

        if (!pointerEvent) {
            console.log('🟠 [ContentBlocksEditor] No hay pointerEvent - cancelando notificación');
            return;
        }

        const eventTarget = pointerEvent.target as HTMLElement;
        if (!eventTarget) {
            console.log('🟠 [ContentBlocksEditor] No hay eventTarget - cancelando notificación');
            return;
        }

        console.log('🟠 [ContentBlocksEditor] Event target:', {
            tagName: eventTarget.tagName,
            closestHandle: eventTarget.closest('[data-sortable-handle]'),
            closestButton: eventTarget.closest('button'),
            closestInput: eventTarget.closest('input'),
            closestTextarea: eventTarget.closest('textarea'),
            closestInternalButton: eventTarget.closest('[data-internal-button="true"]'),
            closestDeleteButton: eventTarget.closest('[data-delete-button="true"]')
        });

        // Check if it's an interactive element - if so, DON'T notify parent
        const isInteractive = eventTarget.tagName === 'INPUT' ||
            eventTarget.tagName === 'TEXTAREA' ||
            eventTarget.tagName === 'BUTTON' ||
            eventTarget.closest('button') ||
            eventTarget.closest('input') ||
            eventTarget.closest('textarea') ||
            eventTarget.isContentEditable ||
            eventTarget.closest('[data-delete-button="true"]') ||
            eventTarget.closest('[data-duplicate-button="true"]') ||
            eventTarget.closest('[data-internal-button="true"]'); // NUEVO: Detectar botones internos

        if (isInteractive) {
            console.log('🟠 [ContentBlocksEditor] ❌ Elemento interactivo detectado - NO notificando parent');
            // Still set activeBlock for dnd-kit, but don't notify parent
            setActiveBlock(block);
            return;
        }

        // Verify it came from the drag handle
        const clickedHandle = eventTarget.closest('[data-sortable-handle]');
        if (!clickedHandle) {
            console.log('🟠 [ContentBlocksEditor] ❌ NO se hizo click en handle - NO notificando parent');
            setActiveBlock(block);
            return;
        }

        // Verify it's the correct handle for this block
        if (clickedHandle.getAttribute('data-sortable-handle') !== String(active.id)) {
            console.log('🟠 [ContentBlocksEditor] ❌ Handle incorrecto - NO notificando parent');
            setActiveBlock(block);
            return;
        }

        console.log('🟠 [ContentBlocksEditor] ✅ Drag iniciado correctamente desde handle - notificando parent');

        setActiveBlock(block);
        // ONLY notify parent when drag actually starts from handle
        onDragStateChange?.(true);
    }, [blocks, onDragStateChange]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = blocks.findIndex(block => block.id === active.id);
            const newIndex = blocks.findIndex(block => block.id === over.id);

            const newBlocks = arrayMove(blocks, oldIndex, newIndex);
            newBlocks.forEach((block, index) => {
                block.order = index;
            });
            onBlocksChange(newBlocks);
        }

        setActiveBlock(null);
        // Notificar al padre que terminó el drag
        onDragStateChange?.(false);
    }, [blocks, onBlocksChange, onDragStateChange]);

    // Calcular total de almacenamiento
    const totalStorage = React.useMemo(() => {
        const allMedia = blocks.flatMap(block => block.media || []);
        return calculateTotalStorage(allMedia);
    }, [blocks]);

    const storageInfo = getStorageInfo(totalStorage);

    // Funciones para manejar estado de carga
    const setBlockUploading = useCallback((blockId: string, isUploading: boolean) => {
        setUploadingBlocks(prev => {
            const newSet = new Set(prev);
            if (isUploading) {
                newSet.add(blockId);
            } else {
                newSet.delete(blockId);
            }
            return newSet;
        });
    }, []);

    // Función para solicitar eliminación con confirmación
    const requestDeleteBlock = useCallback((block: ContentBlock) => {
        // Componentes de texto que requieren confirmación si tienen contenido
        const isTextComponent = block.type === 'text';
        const hasTextContent = block.config?.text && String(block.config.text).trim().length > 0;

        // Si tiene media asociada o es componente de texto con contenido, mostrar modal de confirmación
        if ((block.media && block.media.length > 0) || (isTextComponent && hasTextContent)) {
            setBlockToDelete(block);
            setShowDeleteModal(true);
        } else {
            // Si no tiene media, eliminar con animación
            setDeletingBlocks(prev => new Set(prev).add(block.id));

            // Esperar a que termine la animación antes de eliminar del estado
            setTimeout(() => {
                // Eliminar el botón asociado a este componente ANTES de eliminar el componente
                const buttonToRemove = document.querySelector(`[data-injected-add-button="${block.id}"]`);
                if (buttonToRemove) {
                    buttonToRemove.remove();
                }

                onBlocksChange((prevBlocks: ContentBlock[]) => {
                    const filteredBlocks = prevBlocks.filter((b: ContentBlock) => b.id !== block.id);

                    return filteredBlocks;
                });

                setDeletingBlocks(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(block.id);
                    return newSet;
                });
                toast.success('Componente eliminado correctamente');
            }, 300); // Duración de la animación CSS
        }
    }, [onBlocksChange, blocks]);

    // Función para confirmar eliminación
    const confirmDeleteBlock = useCallback(() => {
        if (blockToDelete) {
            const blockIdToDelete = blockToDelete.id;

            setDeletingBlocks(prev => new Set(prev).add(blockIdToDelete));

            // Esperar a que termine la animación antes de eliminar del estado
            setTimeout(() => {
                // Eliminar el botón asociado a este componente ANTES de eliminar el componente
                const buttonToRemove = document.querySelector(`[data-injected-add-button="${blockIdToDelete}"]`);
                if (buttonToRemove) {
                    buttonToRemove.remove();
                }

                onBlocksChange((prevBlocks: ContentBlock[]) => {
                    const filteredBlocks = prevBlocks.filter((block: ContentBlock) => block.id !== blockIdToDelete);

                    return filteredBlocks;
                });

                setDeletingBlocks(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(blockIdToDelete);
                    return newSet;
                });
                toast.success('Componente eliminado correctamente');
            }, 300); // Duración de la animación CSS
        }
        setShowDeleteModal(false);
        setBlockToDelete(null);
    }, [blockToDelete, onBlocksChange, blocks]);

    // Función para cancelar eliminación
    const cancelDeleteBlock = useCallback(() => {
        setShowDeleteModal(false);
        setBlockToDelete(null);
    }, []);

    // Función para manejar subida de archivos (drag & drop y click)
    const handleDropFiles = useCallback(async (files: File[], blockId: string) => {
        if (files.length === 0) return;

        try {
            // Activar estado de carga
            setBlockUploading(blockId, true);

            const uploadedFiles = await uploadFiles(files, studioSlug, 'posts', 'content');

            // Validar que uploadedFiles sea un array
            if (!Array.isArray(uploadedFiles)) {
                console.error('uploadedFiles no es un array:', uploadedFiles);
                throw new Error('Respuesta inválida del servidor');
            }

            // Convertir UploadedFile a MediaItem
            const mediaItems: MediaItem[] = uploadedFiles.map((file) => ({
                id: file.id,
                file_url: file.url,
                file_type: file.fileName.toLowerCase().includes('.mp4') || file.fileName.toLowerCase().includes('.mov') ? 'video' as const : 'image' as const,
                filename: file.fileName,
                storage_path: file.url,
                storage_bytes: file.size
            }));

            // Actualizar el bloque específico con los nuevos media items
            const block = blocks.find(b => b.id === blockId);
            if (block) {
                const updatedMedia = [...(block.media || []), ...mediaItems];
                handleUpdateBlock(blockId, { media: updatedMedia });
            }

            // No mostrar toast aquí - useMediaUpload ya maneja todos los mensajes
        } catch (error) {
            console.error('Error uploading files:', error);
            toast.error('Error al subir archivos');
        } finally {
            // Desactivar estado de carga
            setBlockUploading(blockId, false);
        }
    }, [uploadFiles, studioSlug, blocks, handleUpdateBlock, setBlockUploading]);

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            {!hideHeader && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 w-full sm:w-auto sm:flex-1">
                        <h3 className="text-lg font-semibold text-zinc-300 overflow-hidden text-ellipsis whitespace-nowrap">
                            Componentes del Post ({blocks.length})
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span className="text-zinc-500">Almacenamiento:</span>
                            <span className={`font-medium ${storageInfo.status.color}`}>
                                {formatBytes(storageInfo.used)}
                            </span>
                            <span className="text-zinc-500">/ {formatBytes(storageInfo.limit)}</span>
                            <span className="text-xs text-zinc-500">
                                ({storageInfo.percentage.toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                    <ZenButton
                        onClick={() => {
                            if (onAddComponentClick) {
                                onAddComponentClick();
                            } else {
                                setShowComponentSelector(true);
                            }
                        }}
                        className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Agregar Componente</span>
                        <span className="sm:hidden">Agregar</span>
                    </ZenButton>
                </div>
            )}

            {/* Modal Selector de Componentes - Todos los componentes */}
            {customSelector ? (
                customSelector
            ) : (
                showComponentSelector && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-zinc-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-zinc-300">Seleccionar Componente</h3>
                                <button
                                    onClick={() => setShowComponentSelector(false)}
                                    className="text-zinc-400 hover:text-zinc-200"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Grid de todos los componentes */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {ALL_COMPONENTS.map((component, index) => (
                                    <button
                                        key={`${component.type}-${component.mode}-${component.mediaType}-${index}`}
                                        onClick={() => {
                                            handleAddComponent(component);
                                            setShowComponentSelector(false);
                                        }}
                                        className="p-4 border border-zinc-700 rounded-lg hover:border-emerald-500 hover:bg-emerald-500/10 transition-all text-left group"
                                    >
                                        <component.icon className="h-6 w-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                                        <div className="font-medium text-zinc-300 text-sm mb-1">{component.label}</div>
                                        <div className="text-xs text-zinc-500 leading-tight">{component.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            )}


            {/* Lista de Componentes */}
            {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] border border-zinc-700 rounded-lg bg-zinc-800/30">
                    <LayoutGrid className="h-12 w-12 text-zinc-500 mb-4" />
                    <h4 className="text-lg font-semibold text-zinc-300 mb-2">Sin componentes</h4>
                    <p className="text-zinc-500 text-center mb-4">Agrega tu primer componente para comenzar</p>
                    <ZenButton
                        onClick={() => {
                            if (onAddComponentClick) {
                                onAddComponentClick();
                            } else {
                                setShowComponentSelector(true);
                            }
                        }}
                        className="flex items-center space-x-2"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Agregar Componente</span>
                    </ZenButton>
                </div>
            ) : !isHydrated ? (
                // Renderizar versión estática durante la hidratación (sin DndContext pero con SortableContext para evitar errores)
                <SortableContext
                    items={blocks.map(block => block.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-4">
                        {blocks.map((block) => (
                            <SortableBlock
                                key={block.id}
                                block={block}
                                onUpdate={handleUpdateBlock}
                                onDelete={requestDeleteBlock}
                                onDuplicate={handleDuplicateBlock}
                                studioSlug={studioSlug}
                                isUploading={uploadingBlocks.has(block.id)}
                                isDeleting={deletingBlocks.has(block.id)}
                                onDropFiles={handleDropFiles}
                                heroContext={heroContext}
                                heroContextData={heroContextData}
                            />
                        ))}
                    </div>
                </SortableContext>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={blocks.map(block => block.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-4">
                            {blocks.map((block) => (
                                <SortableBlock
                                    key={block.id}
                                    block={block}
                                    onUpdate={handleUpdateBlock}
                                    onDelete={requestDeleteBlock}
                                    onDuplicate={handleDuplicateBlock}
                                    studioSlug={studioSlug}
                                    isUploading={uploadingBlocks.has(block.id)}
                                    isDeleting={deletingBlocks.has(block.id)}
                                    onDropFiles={handleDropFiles}
                                    heroContext={heroContext}
                                    heroContextData={heroContextData}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeBlock ? (
                            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 opacity-90">
                                <div className="text-sm text-zinc-300">
                                    {activeBlock.type === 'image' ? 'Imagen' :
                                        activeBlock.type === 'gallery' ? 'Galería' :
                                            activeBlock.type === 'video' ? 'Video' : 'Texto'}
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Modal de confirmación para eliminar componente */}
            <ZenConfirmModal
                isOpen={showDeleteModal}
                onClose={cancelDeleteBlock}
                onConfirm={confirmDeleteBlock}
                title={
                    blockToDelete?.type === 'text' ? (
                        blockToDelete?.config?.textType === 'heading-1' ? "Eliminar título" :
                            blockToDelete?.config?.textType === 'heading-3' ? "Eliminar subtítulo" :
                                blockToDelete?.config?.textType === 'blockquote' ? "Eliminar cita" :
                                    "Eliminar párrafo"
                    ) : "Eliminar componente"
                }
                description={
                    blockToDelete?.type === 'text'
                        ? "¿Estás seguro de que quieres eliminar este componente de texto? El contenido se perderá permanentemente."
                        : "¿Estás seguro de que deseas eliminar este componente? Esta acción no se puede deshacer."
                }
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
            />
        </div>
    );
}

// Componente SortableBlock
function SortableBlock({
    block,
    onUpdate,
    onDelete,
    onDuplicate,
    studioSlug,
    isUploading,
    isDeleting,
    onDropFiles,
    heroContext,
    heroContextData
}: {
    block: ContentBlock;
    onUpdate: (blockId: string, updates: Partial<ContentBlock>) => void;
    onDelete: (block: ContentBlock) => void;
    onDuplicate: (block: ContentBlock) => void;
    studioSlug: string;
    isUploading: boolean;
    isDeleting: boolean;
    onDropFiles: (files: File[], blockId: string) => Promise<void>;
    heroContext?: 'portfolio' | 'offer';
    heroContextData?: {
        offerSlug?: string;
        offerId?: string;
    };
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
    };

    const handleDrop = async (e: React.DragEvent, blockId: string) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await onDropFiles(files, blockId);
        }
    };


    const removeMedia = (mediaId: string) => {
        console.log('removeMedia called with mediaId:', mediaId);
        console.log('Current block.media:', block.media);
        console.log('Looking for item with id:', mediaId);
        console.log('Items in media array:', block.media.map(item => ({ id: item.id, filename: item.filename })));

        const itemToRemove = block.media.find(item => item.id === mediaId);
        console.log('Item found to remove:', itemToRemove);

        const newMedia = block.media.filter(item => item.id !== mediaId);
        console.log('New media after filter:', newMedia);
        console.log('Original length:', block.media.length, 'New length:', newMedia.length);

        onUpdate(block.id, { media: newMedia });
        console.log('onUpdate called with block.id:', block.id);
    };

    const renderContent = () => {
        switch (block.type) {
            case 'image':
                return renderImageContent();
            case 'gallery':
                return renderGalleryContent();
            case 'media-gallery':
                return renderMediaGalleryContent();
            case 'video':
                return renderVideoContent();
            case 'text':
                return renderTextContent();
            case 'separator':
                return renderSeparatorContent();
            case 'hero-contact':
            case 'hero-image':
            case 'hero-video':
            case 'hero-text':
            case 'hero':
                return renderHeroContent();
            default:
                return null;
        }
    };

    const renderImageContent = () => {
        return (
            <div className="space-y-2">
                {block.media && block.media.length > 0 ? (
                    // Solo mostrar la imagen sin header cuando hay contenido
                    <ImageSingle
                        media={block.media[0]}
                        aspectRatio={(block.config?.aspectRatio as 'video' | 'square' | 'portrait' | 'landscape' | 'auto') || 'square'}
                        className=""
                        showDeleteButton={true}
                        onDelete={() => removeMedia(block.media[0].id)}
                        onMediaChange={(newMedia) => {
                            if (newMedia) {
                                const updatedMedia = [...block.media];
                                updatedMedia[0] = newMedia;
                                onUpdate(block.id, { media: updatedMedia });
                            }
                        }}
                        studioSlug={studioSlug}
                        category="posts"
                        subcategory="content"
                        showBorder={false}
                    />
                ) : (
                    // Solo área de drop cuando está vacío
                    <div
                        className="border-2 border-dashed border-zinc-700 rounded-lg text-center hover:border-emerald-500 transition-colors relative"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, block.id)}
                    >
                        <div className="p-6 space-y-2">
                            {isUploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent mx-auto"></div>
                                    <div className="text-sm text-zinc-500">Subiendo imagen...</div>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="h-8 w-8 text-zinc-500 mx-auto" />
                                    <div className="text-sm text-zinc-500">Arrastra una imagen aquí</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderGalleryContent = () => {
        return (
            <div className="space-y-2">
                {/* Siempre mostrar ImageGrid con dropzone integrado */}
                <ImageGrid
                    media={block.media || []}
                    config={block.config as Partial<MediaBlockConfig>}
                    className=""
                    showDeleteButtons={true}
                    onDelete={(mediaId) => removeMedia(mediaId)}
                    onReorder={(reorderedMedia) => {
                        onUpdate(block.id, { media: reorderedMedia });
                    }}
                    isEditable={true}
                    lightbox={true}
                    onDrop={(files) => onDropFiles(files, block.id)}
                    onUploadClick={() => {
                        // Crear input file temporal para trigger upload
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*,video/*';
                        input.onchange = (e) => {
                            const files = Array.from((e.target as HTMLInputElement).files || []);
                            if (files.length > 0) {
                                onDropFiles(files, block.id);
                            }
                        };
                        input.click();
                    }}
                    isUploading={isUploading}
                />
            </div>
        );
    };

    const renderMediaGalleryContent = () => {
        return (
            <div className="space-y-2">
                <MediaGallery
                    media={block.media || []}
                    config={block.config as Partial<MediaBlockConfig>}
                    className=""
                    showDeleteButtons={true}
                    onDelete={(mediaId) => removeMedia(mediaId)}
                    onReorder={(reorderedMedia) => {
                        onUpdate(block.id, { media: reorderedMedia });
                    }}
                    isEditable={true}
                    lightbox={true}
                    onDrop={(files) => onDropFiles(files, block.id)}
                    onUploadClick={() => {
                        // Crear input file temporal para trigger upload
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*,video/*';
                        input.onchange = (e) => {
                            const files = Array.from((e.target as HTMLInputElement).files || []);
                            if (files.length > 0) {
                                onDropFiles(files, block.id);
                            }
                        };
                        input.click();
                    }}
                    isUploading={isUploading}
                    onModeChange={(mode) => {
                        onUpdate(block.id, {
                            config: {
                                ...block.config,
                                mode
                            }
                        });
                    }}
                    onConfigChange={(newConfig) => {
                        onUpdate(block.id, {
                            config: {
                                ...block.config,
                                ...newConfig
                            }
                        });
                    }}
                />
            </div>
        );
    };

    const renderVideoContent = () => {
        return (
            <div className="space-y-2">
                {block.media && block.media.length > 0 ? (
                    // Solo mostrar el video sin header cuando hay contenido
                    <VideoSingle
                        src={block.media[0].file_url}
                        config={block.config as Partial<MediaBlockConfig>}
                        storageBytes={block.media[0].storage_bytes}
                        className=""
                        showDeleteButton={true}
                        onDelete={() => removeMedia(block.media[0].id)}
                    />
                ) : (
                    // Solo área de drop cuando está vacío
                    <div
                        className="border-2 border-dashed border-zinc-700 rounded-lg text-center hover:border-emerald-500 transition-colors relative"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, block.id)}
                    >
                        <div className="p-6 space-y-2">
                            {isUploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent mx-auto"></div>
                                    <div className="text-sm text-zinc-500">Subiendo video...</div>
                                </>
                            ) : (
                                <>
                                    <Video className="h-8 w-8 text-zinc-500 mx-auto" />
                                    <div className="text-sm text-zinc-500">Arrastra un video aquí</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderTextContent = () => {
        // Migrar bloques antiguos: si el tipo es heading-1, heading-3, blockquote, convertir a text con textType
        const currentConfig = block.config || {};
        let textType = currentConfig.textType;

        // Si no tiene textType, usar 'text' por defecto
        if (!textType || (typeof textType !== 'string')) {
            textType = 'text';
        }

        // Validar que textType sea uno de los valores permitidos
        const validTextTypes = ['heading-1', 'heading-3', 'text', 'blockquote'] as const;
        const validTextType = validTextTypes.includes(textType as typeof validTextTypes[number])
            ? (textType as typeof validTextTypes[number])
            : 'text';

        return (
            <RichTextBlock
                config={{
                    ...currentConfig,
                    textType: validTextType,
                }}
                onConfigChange={(newConfig) => {
                    onUpdate(block.id, {
                        config: {
                            ...currentConfig,
                            ...newConfig,
                        }
                    });
                }}
                placeholder={
                    textType === 'heading-1' ? 'Escribe tu título principal...' :
                        textType === 'heading-3' ? 'Escribe tu subtítulo...' :
                            textType === 'blockquote' ? 'Escribe tu cita destacada...' :
                                'Escribe tu texto aquí...'
                }
            />
        );
    };

    const renderSeparatorContent = () => {
        const separatorConfig = block.config as { style?: 'space' | 'solid' | 'dotted'; height?: number; color?: string };
        const style = separatorConfig?.style || 'solid';
        const height = separatorConfig?.height ?? (style === 'space' ? 24 : 0.5);

        const getSliderMin = () => style === 'space' ? 8 : 0.5;
        const getSliderMax = () => style === 'space' ? 100 : 8;
        const getSliderStep = () => style === 'space' ? 1 : 0.5;

        return (
            <div className="space-y-2">
                {/* Controles minimalistas */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        {(['space', 'solid', 'dotted'] as const).map((sepStyle) => (
                            <button
                                key={sepStyle}
                                onClick={() => onUpdate(block.id, {
                                    config: {
                                        ...block.config,
                                        style: sepStyle,
                                        height: sepStyle === 'space' ? 24 : 0.5
                                    }
                                })}
                                className={`px-2 py-1 text-xs rounded transition-colors ${style === sepStyle
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {sepStyle === 'space' ? 'Espacio' : sepStyle === 'solid' ? 'Línea' : 'Puntos'}
                            </button>
                        ))}
                    </div>

                    {/* Slider para altura/grosor */}
                    <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-zinc-500 min-w-[3rem]">
                            {height}px
                        </span>
                        <input
                            type="range"
                            min={getSliderMin()}
                            max={getSliderMax()}
                            value={height}
                            step={getSliderStep()}
                            onChange={(e) => onUpdate(block.id, {
                                config: {
                                    ...block.config,
                                    height: parseFloat(e.target.value)
                                }
                            })}
                            className="flex-1 h-0.5 rounded-lg appearance-none cursor-pointer bg-zinc-700/50"
                            style={{
                                background: `linear-gradient(to right, #22c55e 0%, #22c55e ${((height - getSliderMin()) / (getSliderMax() - getSliderMin())) * 100}%, #3f3f46 ${((height - getSliderMin()) / (getSliderMax() - getSliderMin())) * 100}%, #3f3f46 100%)`
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    const renderHeroContent = () => {
        // Helper para convertir configs antiguos a HeroConfig unificado
        const convertToHeroConfig = (): HeroConfig & Record<string, unknown> => {
            const configWithContext = block.config as Record<string, unknown> & {
                _context?: 'portfolio' | 'offer';
                _contextData?: { offerSlug?: string; offerId?: string };
            };

            // Si es tipo 'hero' nuevo, usar directamente
            if (block.type === 'hero') {
                return { ...(block.config || {}) } as HeroConfig & Record<string, unknown>;
            }

            // Convertir tipos antiguos a HeroConfig
            const baseConfig: HeroConfig & Record<string, unknown> = {
                textAlignment: 'center',
                verticalAlignment: 'center',
                containerStyle: 'fullscreen',
                backgroundType: 'image',
                _context: configWithContext._context,
                _contextData: configWithContext._contextData
            };

            switch (block.type) {
                case 'hero-contact': {
                    const oldConfig = block.config as HeroContactConfig;
                    return {
                        ...baseConfig,
                        title: oldConfig.titulo,
                        subtitle: oldConfig.evento,
                        description: oldConfig.descripcion
                    };
                }
                case 'hero-image': {
                    const oldConfig = block.config as HeroImageConfig;
                    return {
                        ...baseConfig,
                        title: oldConfig.title,
                        subtitle: oldConfig.subtitle,
                        description: oldConfig.description,
                        buttons: oldConfig.buttons,
                        overlay: oldConfig.overlay,
                        overlayOpacity: oldConfig.overlayOpacity,
                        textAlignment: oldConfig.textAlignment || 'center',
                        verticalAlignment: oldConfig.imagePosition === 'top' ? 'top' : oldConfig.imagePosition === 'bottom' ? 'bottom' : 'center'
                    };
                }
                case 'hero-video': {
                    const oldConfig = block.config as HeroVideoConfig;
                    return {
                        ...baseConfig,
                        title: oldConfig.title,
                        subtitle: oldConfig.subtitle,
                        description: oldConfig.description,
                        buttons: oldConfig.buttons,
                        overlay: oldConfig.overlay,
                        overlayOpacity: oldConfig.overlayOpacity,
                        textAlignment: oldConfig.textAlignment || 'center',
                        backgroundType: 'video',
                        autoPlay: oldConfig.autoPlay,
                        muted: oldConfig.muted,
                        loop: oldConfig.loop
                    };
                }
                case 'hero-text': {
                    const oldConfig = block.config as HeroTextConfig;
                    return {
                        ...baseConfig,
                        title: oldConfig.title,
                        subtitle: oldConfig.subtitle,
                        description: oldConfig.description,
                        buttons: oldConfig.buttons,
                        textAlignment: oldConfig.textAlignment || 'center'
                    };
                }
                default:
                    return baseConfig;
            }
        };

        const heroConfig = convertToHeroConfig();

        // Usar contexto de props si está disponible, sino usar el almacenado en config
        const effectiveContext = heroContext || (heroConfig._context as 'portfolio' | 'offer' | undefined);
        const effectiveContextData = heroContextData || (heroConfig._contextData as { offerSlug?: string; offerId?: string } | undefined);

        // Asegurar que el contexto esté en el config para futuras referencias
        // (sin actualizar durante el render, solo para uso local)
        if (effectiveContext && !heroConfig._context) {
            heroConfig._context = effectiveContext;
        }
        if (effectiveContextData && !heroConfig._contextData) {
            heroConfig._contextData = effectiveContextData;
        }


        const handleConfigChange = (newConfig: HeroConfig) => {
            // Preservar contexto en el config al actualizar
            // Usar props si están disponibles, sino usar el contexto del config existente
            const contextToSave = heroContext || effectiveContext || heroConfig._context;
            const contextDataToSave = heroContextData || effectiveContextData || heroConfig._contextData;

            const configToSave = {
                ...newConfig,
                _context: contextToSave,
                _contextData: contextDataToSave
            } as Record<string, unknown>;

            onUpdate(block.id, {
                config: configToSave
            });
        };

        const handleMediaChange = (newMedia: MediaItem[]) => {
            onUpdate(block.id, {
                media: newMedia
            });
        };

        const handleDropFiles = async (files: File[]) => {
            await onDropFiles(files, block.id);
        };

        return (
            <HeroEditor
                config={heroConfig}
                media={block.media || []}
                onConfigChange={handleConfigChange}
                onMediaChange={handleMediaChange}
                onDropFiles={handleDropFiles}
                isUploading={isUploading}
                studioSlug={studioSlug}
                context={effectiveContext}
                contextData={effectiveContextData}
            />
        );
    };

    return (
        <div
            id={block.id}
            ref={setNodeRef}
            style={style}
            className={`bg-zinc-800 border border-zinc-700 rounded-lg p-4 transition-all duration-300 ${isDragging ? 'opacity-50' : ''
                } ${isDeleting ? 'opacity-0 scale-95 transform -translate-y-2' : 'opacity-100 scale-100'
                }`}
            onMouseDown={(e) => {
                // Prevenir que clicks en el contenedor activen el drag
                const target = e.target as HTMLElement;
                // Solo permitir drag si es específicamente el handle
                if (!target.closest('.cursor-grab') &&
                    !target.closest('[data-sortable-handle]') &&
                    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button'))) {
                    e.stopPropagation();
                }
            }}
            suppressHydrationWarning
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div
                        {...attributes}
                        {...listeners}
                        suppressHydrationWarning
                        className="cursor-grab hover:cursor-grabbing text-zinc-400 hover:text-zinc-300"
                        onMouseDown={(e) => {
                            // Solo permitir drag si NO es el botón de eliminar o duplicar
                            const target = e.target as HTMLElement;
                            if (target.closest('[data-delete-button="true"]') || target.closest('[data-duplicate-button="true"]')) {
                                e.stopPropagation();
                            }
                        }}
                        data-sortable-handle={block.id}
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-zinc-300">
                        {getComponentDisplayName(block)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                            }
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                            }
                            console.log('🟢 [SORTABLE_BLOCK] Botón duplicar clickeado:', {
                                blockId: block.id,
                                blockType: block.type,
                                timestamp: new Date().toISOString()
                            });
                            onDuplicate(block);
                        }}
                        className="text-zinc-400 hover:text-emerald-400 transition-colors relative z-50"
                        style={{
                            pointerEvents: 'auto',
                            position: 'relative',
                            cursor: 'pointer',
                            zIndex: 9999
                        }}
                        data-duplicate-button="true"
                        title="Duplicar componente"
                    >
                        <Copy className="h-4 w-4 pointer-events-none" />
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            // CRÍTICO: Detener inmediatamente para evitar que drag capture el evento
                            e.stopPropagation();
                            e.preventDefault();
                            if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                            }
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                            }

                            // requestDeleteBlock maneja la confirmación automáticamente
                            onDelete(block);
                        }}
                        className="text-zinc-400 hover:text-red-400 transition-colors relative z-50"
                        style={{
                            pointerEvents: 'auto',
                            position: 'relative',
                            cursor: 'pointer',
                            zIndex: 9999
                        }}
                        data-delete-button="true"
                        title="Eliminar componente"
                    >
                        <X className="h-4 w-4 pointer-events-none" />
                    </button>
                </div>
            </div>
            {renderContent()}
        </div>
    );
}