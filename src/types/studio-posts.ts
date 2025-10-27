import { MediaItem } from "@/lib/actions/schemas/post-schemas";

export interface StudioPost {
    id: string;
    title: string | null;
    caption: string | null;
    category: string;
    is_featured: boolean;
    is_published: boolean;
    cover_index: number;
    created_at: Date;
    updated_at: Date;
    studio_id: string;
    event_type_id: string | null;
    tags: string[];
    cta_enabled: boolean;
    cta_text: string;
    cta_action: string;
    cta_link: string | null;
    published_at: Date | null;
    view_count: number;
    event_type: { id: string; name: string } | null;
    media?: MediaItem[];
}
