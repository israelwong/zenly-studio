/**
 * Tipos para el sistema de componentes drag & drop
 * Reutilizables entre ZEN Posts, ZEN Invitations y otros módulos
 */

export type ComponentType = 'image' | 'gallery' | 'video' | 'text';

export type MediaMode = 'single' | 'grid' | 'masonry' | 'slide';

export type MediaType = 'images' | 'videos';

export type PresentationType = 'block' | 'fullwidth';

export type TextAlignment = 'left' | 'center' | 'right';

export interface MediaItem {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    storage_path: string;
    storage_bytes?: number;
    thumbnail_url?: string;
    display_order?: number;
}

export interface ContentBlock {
    id: string;
    type: ComponentType;
    title?: string;
    description?: string;
    presentation: PresentationType;
    media: MediaItem[];
    order: number;
    config?: Record<string, unknown>;
}

// Configuraciones específicas por tipo de componente
export interface MediaBlockConfig {
    mode: MediaMode;
    mediaType: MediaType;
    columns?: number;
    gap?: number;
    aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape' | 'auto';
    showCaptions?: boolean;
    showTitles?: boolean;
    lightbox?: boolean;
    autoplay?: number;
    perView?: number;
    showArrows?: boolean;
    showDots?: boolean;
    // Video specific
    autoPlay?: boolean;
    muted?: boolean;
    loop?: boolean;
    poster?: string;
    maxWidth?: string;
    [key: string]: unknown;
}

export interface TextBlockConfig {
    alignment?: TextAlignment;
    fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    color?: string;
}

// Union type para todas las configuraciones
export type BlockConfig = MediaBlockConfig | TextBlockConfig;

// Props base para todos los componentes de bloque
export interface BaseBlockProps {
    block: ContentBlock;
    onUpdate?: (block: ContentBlock) => void;
    onDelete?: (blockId: string) => void;
    onReorder?: (fromIndex: number, toIndex: number) => void;
    isEditing?: boolean;
    className?: string;
}

// Props para el editor de bloques
export interface BlockEditorProps {
    block: ContentBlock;
    onSave: (block: ContentBlock) => void;
    onCancel: () => void;
    isOpen: boolean;
}

// Props para el selector de componentes
export interface ComponentSelectorProps {
    onSelect: (type: ComponentType) => void;
    className?: string;
}
