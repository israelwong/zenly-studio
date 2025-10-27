import { create } from "zustand";

interface MediaItem {
    id?: string;
    file_url: string;
    file_type: "image" | "video";
    filename: string;
    storage_bytes?: number;
    mime_type?: string;
    dimensions?: { width: number; height: number };
    duration_seconds?: number;
    display_order?: number;
    alt_text?: string;
    thumbnail_url?: string;
    storage_path: string;
    // Propiedades adicionales para el componente
    url?: string; // Alias para file_url
    type?: "image" | "video"; // Alias para file_type
    width?: number;
    height?: number;
    fileName?: string; // Alias para filename
    isUploading?: boolean;
}

interface PostPreview {
    id?: string;
    title?: string | null;
    caption?: string | null;
    media: MediaItem[];
    cover_index: number;
    category: string;
    event_type_name?: string;
    tags: string[];
    cta_enabled: boolean;
    cta_text: string;
    cta_action: string;
}

interface PostStore {
    preview: PostPreview | null;
    setPreview: (preview: PostPreview) => void;
    updatePreview: (updates: Partial<PostPreview>) => void;
    clearPreview: () => void;
}

export const usePostStore = create<PostStore>((set) => ({
    preview: null,
    setPreview: (preview) => set({ preview }),
    updatePreview: (updates) =>
        set((state) => ({
            preview: state.preview ? { ...state.preview, ...updates } : null,
        })),
    clearPreview: () => set({ preview: null }),
}));
