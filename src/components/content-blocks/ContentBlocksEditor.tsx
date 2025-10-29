'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Image as ImageIcon, Video, Type, Grid3X3, X, LayoutGrid } from 'lucide-react';
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
import { ContentBlock, ComponentType, MediaMode, MediaType, MediaItem, MediaBlockConfig } from '@/types/content-blocks';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toast } from 'sonner';
import { VideoSingle } from '@/components/shared/video';
import { ImageSingle, ImageGrid } from '@/components/shared/media';
import { formatBytes, calculateTotalStorage, getStorageInfo } from '@/lib/utils/storage';

// Importar tipo UploadedFile
interface UploadedFile {
    id: string;
    url: string;
    fileName: string;
    size: number;
    isUploading?: boolean;
}

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
                slide: 'Galería Slide'
            };
            return modeLabels[mode];
        case 'video':
            return 'Video';
        case 'text':
            return 'Bloque de Texto';
        default:
            return 'Componente';
    }
}


interface ContentBlocksEditorProps {
    blocks: ContentBlock[];
    onBlocksChange: (blocks: ContentBlock[]) => void;
    studioSlug: string;
    className?: string;
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
    // Galería Slide
    {
        type: 'gallery' as ComponentType,
        mode: 'slide' as MediaMode,
        mediaType: 'images' as MediaType,
        label: 'Galería Slide',
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
];

export function ContentBlocksEditor({
    blocks,
    onBlocksChange,
    studioSlug,
    className = ''
}: ContentBlocksEditorProps) {
    const [activeBlock, setActiveBlock] = useState<ContentBlock | null>(null);
    const [showComponentSelector, setShowComponentSelector] = useState(false);
    const [uploadingBlocks, setUploadingBlocks] = useState<Set<string>>(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [blockToDelete, setBlockToDelete] = useState<ContentBlock | null>(null);
    const { uploadFiles } = useMediaUpload();

    // Configuración de sensores
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
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
        } else if (component.type === 'video') {
            config = {
                autoPlay: false,
                muted: true,
                loop: false,
                controls: true
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
    }, [blocks, onBlocksChange]);


    // Actualizar componente
    const handleUpdateBlock = useCallback((blockId: string, updates: Partial<ContentBlock>) => {
        const newBlocks = blocks.map(block =>
            block.id === blockId ? { ...block, ...updates } : block
        );
        onBlocksChange(newBlocks);
    }, [blocks, onBlocksChange]);

    // Reordenar componentes
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
    }, [blocks, onBlocksChange]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const block = blocks.find(b => b.id === active.id);
        setActiveBlock(block || null);
    }, [blocks]);

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
        // Si tiene media asociada, mostrar modal de confirmación
        if (block.media && block.media.length > 0) {
            setBlockToDelete(block);
            setShowDeleteModal(true);
        } else {
            // Si no tiene media, eliminar directamente
            onBlocksChange(blocks.filter(b => b.id !== block.id));
            toast.success('Componente eliminado correctamente');
        }
    }, [blocks, onBlocksChange]);

    // Función para confirmar eliminación
    const confirmDeleteBlock = useCallback(() => {
        if (blockToDelete) {
            onBlocksChange(blocks.filter(block => block.id !== blockToDelete.id));
            toast.success('Componente eliminado correctamente');
        }
        setShowDeleteModal(false);
        setBlockToDelete(null);
    }, [blockToDelete, blocks, onBlocksChange]);

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

            toast.success(`${files.length} archivo(s) subido(s) correctamente`);
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
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-zinc-300">
                        Componentes del Post ({blocks.length})
                    </h3>
                    <div className="flex items-center space-x-2 text-sm">
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
                    onClick={() => setShowComponentSelector(true)}
                    className="flex items-center space-x-2"
                >
                    <Plus className="h-4 w-4" />
                    <span>Agregar Componente</span>
                </ZenButton>
            </div>

            {/* Modal Selector de Componentes - Todos los componentes */}
            {showComponentSelector && (
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
            )}


            {/* Lista de Componentes */}
            {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] border border-zinc-700 rounded-lg bg-zinc-800/30">
                    <LayoutGrid className="h-12 w-12 text-zinc-500 mb-4" />
                    <h4 className="text-lg font-semibold text-zinc-300 mb-2">Sin componentes</h4>
                    <p className="text-zinc-500 text-center mb-4">Agrega tu primer componente para comenzar</p>
                    <ZenButton
                        onClick={() => setShowComponentSelector(true)}
                        className="flex items-center space-x-2"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Agregar Componente</span>
                    </ZenButton>
                </div>
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
                                    onMediaUpload={uploadFiles}
                                    studioSlug={studioSlug}
                                    isUploading={uploadingBlocks.has(block.id)}
                                    setUploading={setBlockUploading}
                                    onDropFiles={handleDropFiles}
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
                title={blockToDelete?.type === 'text' ? "Eliminar bloque de texto" : "Eliminar componente"}
                description={
                    blockToDelete?.type === 'text'
                        ? "¿Estás seguro de que quieres eliminar este bloque de texto? El contenido se perderá permanentemente."
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
    onMediaUpload,
    studioSlug,
    isUploading,
    setUploading,
    onDropFiles
}: {
    block: ContentBlock;
    onUpdate: (blockId: string, updates: Partial<ContentBlock>) => void;
    onDelete: (block: ContentBlock) => void;
    onMediaUpload: (files: File[], studioSlug: string, category: string, subcategory?: string) => Promise<UploadedFile[]>;
    studioSlug: string;
    isUploading: boolean;
    setUploading: (blockId: string, isUploading: boolean) => void;
    onDropFiles: (files: File[], blockId: string) => Promise<void>;
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
            case 'video':
                return renderVideoContent();
            case 'text':
                return renderTextContent();
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
                        input.accept = 'image/*';
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
        return (
            <div className="space-y-3">
                <textarea
                    value={String(block.config?.text || '')}
                    onChange={(e) => onUpdate(block.id, {
                        config: {
                            ...block.config,
                            text: e.target.value
                        }
                    })}
                    placeholder="Escribe tu texto aquí..."
                    className="w-full min-h-[120px] p-4 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none"
                    rows={4}
                />
            </div>
        );
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-zinc-800 border border-zinc-700 rounded-lg p-4 ${isDragging ? 'opacity-50' : ''
                }`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab hover:cursor-grabbing text-zinc-400 hover:text-zinc-300"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-zinc-300">
                        {getComponentDisplayName(block)}
                    </span>
                </div>
                <button
                    onClick={() => {
                        // Si es bloque de texto con contenido, mostrar confirmación
                        const textContent = block.config?.text;
                        if (block.type === 'text' && textContent && String(textContent).trim()) {
                            const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este bloque de texto? El contenido se perderá permanentemente.');
                            if (confirmed) {
                                onDelete(block);
                            }
                        } else {
                            onDelete(block);
                        }
                    }}
                    className="text-zinc-400 hover:text-red-400 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            {renderContent()}
        </div>
    );
}