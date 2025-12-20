import { MediaItem } from "@/lib/actions/schemas/post-schemas";

export interface StudioPost {
    id: string;
    slug: string;
    title: string | null;
    caption: string | null;
    is_featured: boolean;
    is_published: boolean;
    cover_index: number;
    created_at: Date;
    updated_at: Date;
    studio_id: string;
    event_type_id: string | null;
    tags: string[];
    published_at: Date | null;
    view_count: number;
    event_type: { id: string; name: string } | null;
    media?: MediaItem[];
}
