import { z } from "zod";
import { ContentBlock } from "@/types/content-blocks";

// Media Item Schema (reutilizable para portfolios y posts)
export const mediaItemSchema = z.object({
    id: z.string().optional(),
    file_url: z.string().url("URL inválida"),
    file_type: z.enum(["image", "video"]),
    filename: z.string(),
    storage_bytes: z.number().optional(),
    mime_type: z.string().optional(),
    dimensions: z.object({ width: z.number(), height: z.number() }).optional().nullable(),
    duration_seconds: z.number().optional(),
    display_order: z.number().optional(),
    alt_text: z.string().optional(),
    thumbnail_url: z.string().url().optional().nullable(),
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

// Create/Update Portfolio Schema
export const portfolioFormSchema = z.object({
    id: z.string().optional(),
    title: z.string().max(200),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    caption: z.string().max(2000).optional().nullable(), // Descripción con soporte para links
    cover_image_url: z.string().url().optional().nullable(),
    cover_storage_bytes: z.number().optional().nullable(),
    cover_index: z.number().min(0).default(0),

    // Clasificación
    category: z.enum(["portfolio", "blog", "promo"]).optional().nullable(),
    event_type_id: z.string().cuid().optional().nullable(),
    tags: z.array(z.string()).default([]),

    // Visibilidad
    is_featured: z.boolean().default(false),
    is_published: z.boolean().default(false),

    // Media y Content Blocks
    // Media es opcional si hay content_blocks con media
    media: z.array(mediaItemSchema).optional().default([]),
    content_blocks: z.array(z.any()).optional().default([]), // ContentBlock[] - validación más flexible

    // Orden
    order: z.number().default(0),
});

export type PortfolioFormData = z.infer<typeof portfolioFormSchema>;

// Filters Schema
export const portfolioFiltersSchema = z.object({
    is_published: z.boolean().optional(),
    category: z.enum(["portfolio", "blog", "promo"]).optional(),
    event_type_id: z.string().cuid().optional(),
});

export type PortfolioFilters = z.infer<typeof portfolioFiltersSchema>;

