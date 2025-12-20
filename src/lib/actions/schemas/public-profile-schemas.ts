// ============================================
// PUBLIC PROFILE SCHEMAS
// ============================================
// Zod validation schemas for public profile data
// Used in server actions for data validation

import { z } from 'zod';
import { ComponentType } from '@/types/content-blocks';

// Base schemas
export const PublicFAQSchema = z.object({
    id: z.string(),
    pregunta: z.string(),
    respuesta: z.string(),
    orden: z.number(),
    is_active: z.boolean(),
});

export const PublicStudioProfileSchema = z.object({
    id: z.string(),
    owner_id: z.string().nullable().optional(),
    studio_name: z.string(),
    presentation: z.string().nullable(),
    keywords: z.string().nullable(),
    logo_url: z.string().nullable(),
    slogan: z.string().nullable(),
    website: z.string().nullable(),
    address: z.string().nullable(),
    plan_id: z.string().nullable(),
    plan: z.object({
        name: z.string(),
        slug: z.string(),
    }).nullable().optional(),
    faq: z.array(PublicFAQSchema).optional(),
});

export const PublicSocialNetworkSchema = z.object({
    id: z.string(),
    url: z.string(),
    platform: z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().nullable(),
    }).nullable(),
    order: z.number(),
});

export const PublicCatalogItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    price: z.number().nullable(),
    image_url: z.string().nullable(),
    category: z.string().nullable(),
    order: z.number(),
});

export const PublicPortfolioItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    image_url: z.string().optional(),
    video_url: z.string().optional(),
    item_type: z.enum(['PHOTO', 'VIDEO']),
    order: z.number(),
});

export const PublicPortfolioSchema = z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    caption: z.string().nullable(),
    cover_image_url: z.string().nullable(),
    category: z.string().nullable(),
    order: z.number(),
    is_featured: z.boolean(),
    is_published: z.boolean().optional(),
    published_at: z.date().nullable(),
    view_count: z.number(),
    cover_index: z.number(),
    tags: z.array(z.string()),
    items: z.array(PublicPortfolioItemSchema),
    media: z.array(z.object({
        id: z.string(),
        file_url: z.string(),
        file_type: z.enum(['image', 'video']),
        filename: z.string(),
        thumbnail_url: z.string().optional(),
        display_order: z.number(),
    })),
    content_blocks: z.array(z.object({
        id: z.string(),
        type: z.enum(['image', 'gallery', 'video', 'text', 'grid', 'slider', 'hero-contact', 'hero-image', 'hero-video', 'hero-text', 'hero', 'separator', 'media-gallery'] as const),
        title: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        presentation: z.enum(['block', 'fullwidth'] as const),
        config: z.any().optional(),
        order: z.number(),
        media: z.array(z.object({
            id: z.string(),
            file_url: z.string(),
            file_type: z.enum(['image', 'video'] as const),
            filename: z.string(),
            storage_path: z.string().optional(),
            storage_bytes: z.number().optional(),
            thumbnail_url: z.string().nullable().optional(),
            display_order: z.number().optional(),
        })),
    })),
    event_type: z.object({
        id: z.string(),
        nombre: z.string(),
    }).nullable(),
});

export const PublicPaqueteSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    descripcion: z.string().nullable().optional(),
    precio: z.number(),
    tipo_evento: z.string().nullable().optional(),
    tipo_evento_order: z.number().nullable().optional(),
    cover_url: z.string().nullable().optional(),
    duracion_horas: z.number().nullable().optional(),
    incluye: z.array(z.string()).nullable().optional(),
    no_incluye: z.array(z.string()).nullable().optional(),
    condiciones: z.string().nullable().optional(),
    order: z.number(),
});

export const PublicContactInfoSchema = z.object({
    phones: z.array(z.object({
        id: z.string(),
        number: z.string(),
        type: z.string(),
        label: z.string().nullable(),
        is_active: z.boolean(),
    })),
    address: z.string().nullable(),
    website: z.string().nullable(),
    email: z.string().nullable(),
    maps_url: z.string().nullable(),
    horarios: z.array(z.object({
        id: z.string(),
        dia: z.string(),
        apertura: z.string(),
        cierre: z.string(),
        cerrado: z.boolean(),
    })),
});

export const PublicPostSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string().nullable().optional(),
    caption: z.string().nullable(),
    tags: z.array(z.string()).optional(),
    media: z.array(z.object({
        id: z.string(),
        file_url: z.string(),
        file_type: z.enum(['image', 'video']),
        filename: z.string(),
        storage_path: z.string(),
        thumbnail_url: z.string().optional(),
        display_order: z.number(),
    })),
    is_published: z.boolean(),
    is_featured: z.boolean(),
    published_at: z.date().nullable(),
    created_at: z.date().optional(),
    view_count: z.number().optional(),
});

export const PublicProfileDataSchema = z.object({
    studio: PublicStudioProfileSchema,
    socialNetworks: z.array(PublicSocialNetworkSchema),
    contactInfo: PublicContactInfoSchema,
    items: z.array(PublicCatalogItemSchema),
    portfolios: z.array(PublicPortfolioSchema),
    paquetes: z.array(PublicPaqueteSchema),
    posts: z.array(PublicPostSchema),
});

// Input schemas for server actions
export const GetStudioProfileInputSchema = z.object({
    slug: z.string().min(1, 'Slug is required'),
});

// Output schemas for server actions
export const GetStudioProfileOutputSchema = z.object({
    success: z.boolean(),
    data: PublicProfileDataSchema.optional(),
    error: z.string().optional(),
});

// Type exports
export type PublicStudioProfileForm = z.infer<typeof PublicStudioProfileSchema>;
export type PublicSocialNetworkForm = z.infer<typeof PublicSocialNetworkSchema>;
export type PublicCatalogItemForm = z.infer<typeof PublicCatalogItemSchema>;
export type PublicPortfolioItemForm = z.infer<typeof PublicPortfolioItemSchema>;
export type PublicPortfolioForm = z.infer<typeof PublicPortfolioSchema>;
export type PublicPaqueteForm = z.infer<typeof PublicPaqueteSchema>;
export type PublicContactInfoForm = z.infer<typeof PublicContactInfoSchema>;
export type PublicProfileDataForm = z.infer<typeof PublicProfileDataSchema>;
export type GetStudioProfileInputForm = z.infer<typeof GetStudioProfileInputSchema>;
export type GetStudioProfileOutputForm = z.infer<typeof GetStudioProfileOutputSchema>;
