// Content Blocks - Sistema de componentes drag & drop
export { ComponentSelector } from './ComponentSelector';
export { ComponentSelectorModal } from './ComponentSelectorModal';
export { BaseModal } from './BaseModal';
export { SortableBlock } from './SortableBlock';
export { DropZone } from './DropZone';
export { ContentBlocksEditor } from './ContentBlocksEditor';
export { BlockRenderer } from './BlockRenderer';
export { ContentBlocksPreview } from './ContentBlocksPreview';

// Types
export type {
    ComponentType,
    PresentationType,
    TextAlignment,
    MediaItem,
    ContentBlock,
    VideoBlockConfig,
    GalleryBlockConfig,
    GridBlockConfig,
    TextBlockConfig,
    SliderBlockConfig,
    BlockConfig,
    BaseBlockProps,
    BlockEditorProps,
    ComponentSelectorProps
} from '@/types/content-blocks';
