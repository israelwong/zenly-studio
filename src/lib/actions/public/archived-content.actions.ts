"use server";

import { prisma } from "@/lib/prisma";

interface ArchivedPost {
    id: string;
    title: string | null;
    caption: string | null;
    slug: string;
    cover_media_url: string | null;
    created_at: Date;
    updated_at: Date;
}

interface ArchivedPortfolio {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    created_at: Date;
    updated_at: Date;
}

interface ArchivedOffer {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    cover_media_url: string | null;
    created_at: Date;
    updated_at: Date;
}

interface ArchivedContentResult {
    posts: ArchivedPost[];
    portfolios: ArchivedPortfolio[];
    offers: ArchivedOffer[];
}

/**
 * Obtiene todo el contenido archivado de un estudio
 * - Posts: is_published = false
 * - Portfolios: is_published = false
 * - Ofertas: is_active = false
 */
export async function getArchivedContent(
    studioSlug: string
): Promise<{ success: boolean; data?: ArchivedContentResult; error?: string }> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: "Estudio no encontrado" };
        }

        // Obtener posts archivados (no publicados)
        const posts = await prisma.studio_posts.findMany({
            where: {
                studio_id: studio.id,
                is_published: false
            },
            select: {
                id: true,
                title: true,
                caption: true,
                slug: true,
                created_at: true,
                updated_at: true,
                media: {
                    where: { display_order: 0 },
                    take: 1,
                    select: { file_url: true }
                }
            },
            orderBy: { updated_at: 'desc' }
        });

        // Obtener portfolios archivados (no publicados)
        const portfolios = await prisma.studio_portfolios.findMany({
            where: {
                studio_id: studio.id,
                is_published: false
            },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                cover_image_url: true,
                created_at: true,
                updated_at: true
            },
            orderBy: { updated_at: 'desc' }
        });

        // Obtener ofertas inactivas
        const offers = await prisma.studio_offers.findMany({
            where: {
                studio_id: studio.id,
                is_active: false
            },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                cover_media_url: true,
                created_at: true,
                updated_at: true
            },
            orderBy: { updated_at: 'desc' }
        });

        // Mapear resultados
        const archivedPosts: ArchivedPost[] = posts.map(post => ({
            id: post.id,
            title: post.title,
            caption: post.caption,
            slug: post.slug,
            cover_media_url: post.media[0]?.file_url || null,
            created_at: post.created_at,
            updated_at: post.updated_at
        }));

        const archivedPortfolios: ArchivedPortfolio[] = portfolios.map(portfolio => ({
            id: portfolio.id,
            title: portfolio.title,
            slug: portfolio.slug,
            description: portfolio.description,
            cover_image_url: portfolio.cover_image_url,
            created_at: portfolio.created_at,
            updated_at: portfolio.updated_at
        }));

        const archivedOffers: ArchivedOffer[] = offers.map(offer => ({
            id: offer.id,
            name: offer.name,
            slug: offer.slug,
            description: offer.description,
            cover_media_url: offer.cover_media_url,
            created_at: offer.created_at,
            updated_at: offer.updated_at
        }));

        return {
            success: true,
            data: {
                posts: archivedPosts,
                portfolios: archivedPortfolios,
                offers: archivedOffers
            }
        };
    } catch (error) {
        console.error("[getArchivedContent] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al obtener contenido archivado"
        };
    }
}
