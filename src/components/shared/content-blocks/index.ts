// Content Blocks - Sistema de componentes drag & drop
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
    BlockEditorProps
} from '@/types/content-blocks';
