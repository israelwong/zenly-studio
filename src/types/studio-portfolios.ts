import { MediaItem } from "@/lib/actions/schemas/post-schemas";
import { ContentBlock } from "@/types/content-blocks";

export interface StudioPortfolio {
    id: string;
    studio_id: string;
    title: string;
    slug: string;
    description: string | null;
    caption: string | null;
    cover_image_url: string | null;
    cover_index: number;
    
    // Clasificación
    category: string | null;
    event_type_id: string | null;
    tags: string[];
    
    // CTA
    cta_enabled: boolean;
    cta_text: string;
    cta_action: string;
    cta_link: string | null;
    
    // Visibilidad
    is_featured: boolean;
    is_published: boolean;
    published_at: Date | null;
    
    // Orden y métricas
    order: number;
    view_count: number;
    
    // Timestamps
    created_at: Date;
    updated_at: Date;
    
    // Relations
    event_type: { id: string; name: string } | null;
    media?: MediaItem[];
    content_blocks?: ContentBlock[];
}

