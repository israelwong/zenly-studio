/**
 * Tipos para el sistema de componentes drag & drop
 * Reutilizables entre ZEN Posts, ZEN Invitations y otros módulos
 */

export type ComponentType = 'image' | 'gallery' | 'video' | 'text' | 'grid' | 'slider' | 'hero-contact' | 'hero-image' | 'hero-video' | 'hero-text' | 'hero' | 'separator' | 'media-gallery';

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
    borderStyle?: 'normal' | 'rounded';
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
    text?: string;
    textType?: 'heading-1' | 'heading-3' | 'text' | 'blockquote'; // Tipo de texto
    alignment?: TextAlignment;
    fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    italic?: boolean; // Cursiva
    color?: string;
}

// Configuraciones para Heroes
export interface HeroContactConfig {
    evento?: string;
    titulo?: string;
    descripcion?: string;
    gradientFrom?: string;
    gradientTo?: string;
    showScrollIndicator?: boolean;
}

export interface ButtonConfig {
    text: string;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    target?: '_blank' | '_self';
    fullWidth?: boolean;
    withBorder?: boolean;
    borderRadius?: 'normal' | 'sm' | 'full';
    shadow?: boolean;
    shadowPosition?: 'full' | 'bottom';
    customColor?: string; // Color personalizado para el botón
    pulse?: boolean; // Deprecated - usar buttonEffect
    buttonEffect?: 'none' | 'pulse' | 'border-spin' | 'radial-glow';
    linkType?: 'internal' | 'external';
    className?: string;
}

export interface HeroImageConfig {
    title?: string;
    subtitle?: string;
    description?: string;
    buttons?: ButtonConfig[];
    overlay?: boolean;
    overlayOpacity?: number;
    textAlignment?: TextAlignment;
    imagePosition?: 'top' | 'center' | 'bottom';
}

export interface HeroVideoConfig {
    title?: string;
    subtitle?: string;
    description?: string;
    buttons?: ButtonConfig[];
    overlay?: boolean;
    overlayOpacity?: number;
    textAlignment?: TextAlignment;
    autoPlay?: boolean;
    muted?: boolean;
    loop?: boolean;
    poster?: string;
}

export interface HeroTextConfig {
    title?: string;
    subtitle?: string;
    description?: string;
    buttons?: ButtonConfig[];
    backgroundVariant?: 'solid' | 'gradient' | 'pattern';
    backgroundColor?: string;
    backgroundGradient?: string;
    textAlignment?: TextAlignment;
    pattern?: 'dots' | 'grid' | 'waves' | 'none';
    textColor?: string;
}

export interface HeroConfig {
    title?: string;
    subtitle?: string;
    description?: string;
    buttons?: ButtonConfig[];
    overlay?: boolean;
    overlayOpacity?: number;
    textAlignment?: TextAlignment;
    verticalAlignment?: 'top' | 'center' | 'bottom';
    layout?: 'fullwidth' | 'wrapped';
    backgroundType?: 'image' | 'video';
    autoPlay?: boolean;
    muted?: boolean;
    loop?: boolean;
    borderRadius?: 'none' | 'md' | 'lg';
    containerStyle?: 'fullscreen' | 'wrapped';
    aspectRatio?: 'square' | 'vertical';
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    // Configuración global de botones
    buttonSize?: 'sm' | 'md' | 'lg';
    buttonBorderRadius?: 'normal' | 'sm' | 'full';
    // Degradado para contrastar contenido
    gradientOverlay?: boolean;
    gradientPosition?: 'top' | 'bottom' | 'left' | 'right';
    // Efecto parallax en el fondo
    parallax?: boolean;
}

export interface SeparatorBlockConfig {
    style: 'space' | 'solid' | 'dotted';
    height?: number; // Altura en píxeles (default: 24 para space, 0.5 para lines)
    color?: string; // Color de la línea (default: zinc-600)
}

// Union type para todas las configuraciones
export type BlockConfig = MediaBlockConfig | TextBlockConfig | HeroContactConfig | HeroImageConfig | HeroVideoConfig | HeroTextConfig | HeroConfig | SeparatorBlockConfig;

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
