import { z } from "zod";

// Media Item Schema (coincide con studio_post_media)
export const mediaItemSchema = z.object({
    id: z.string().optional(),
    file_url: z.string().url("URL inválida"),
    file_type: z.enum(["image", "video"]),
    filename: z.string(),
    storage_bytes: z.number().optional(),
    mime_type: z.string().optional(),
    dimensions: z.object({ width: z.number(), height: z.number() }).optional(),
    duration_seconds: z.number().optional(),
    display_order: z.number().optional(),
    alt_text: z.string().optional(),
    thumbnail_url: z.string().url().optional(),
    storage_path: z.string(),
    // Propiedades adicionales para compatibilidad
    url: z.string().url().optional(), // Alias para file_url
    type: z.enum(["image", "video"]).optional(), // Alias para file_type
    width: z.number().optional(),
    height: z.number().optional(),
    fileName: z.string().optional(), // Alias para filename
    isUploading: z.boolean().optional(),
});

export type MediaItem = z.infer<typeof mediaItemSchema>;

// Create/Update Post Schema
export const postFormSchema = z.object({
    id: z.string().optional(),
    title: z.string().max(200).optional().nullable(),
    caption: z.string().max(2000).optional().nullable(),
    media: z.array(mediaItemSchema).min(1, "Agrega al menos una foto o video"),
    cover_index: z.number().min(0).default(0),
    category: z.enum(["portfolio", "blog", "promo"]).default("portfolio"),
    event_type_id: z.string().cuid().optional().nullable(),
    tags: z.array(z.string()).default([]),
    cta_enabled: z.boolean().default(true),
    cta_text: z.string().default("Cotiza tu evento"),
    cta_action: z.enum(["whatsapp", "lead_form", "calendar"]).default("whatsapp"),
    cta_link: z.string().url().optional().nullable(),
    is_featured: z.boolean().default(false),
    is_published: z.boolean().default(false),
});

export type PostFormData = z.infer<typeof postFormSchema>;

// Filters Schema
export const postFiltersSchema = z.object({
    is_published: z.boolean().optional(),
    category: z.enum(["portfolio", "blog", "promo"]).optional(),
    event_type_id: z.string().cuid().optional(),
});

export type PostFilters = z.infer<typeof postFiltersSchema>;
