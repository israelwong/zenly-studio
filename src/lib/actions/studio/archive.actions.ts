"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Restaura un post (is_published = true)
 */
export async function restorePost(postId: string, studioSlug: string) {
    try {
        const post = await prisma.studio_posts.findUnique({
            where: { id: postId },
            select: { studio: { select: { slug: true } } }
        });

        if (!post || post.studio.slug !== studioSlug) {
            return { success: false, error: "Post no encontrado" };
        }

        await prisma.studio_posts.update({
            where: { id: postId },
            data: {
                is_published: true,
                published_at: new Date()
            }
        });

        revalidatePath(`/${studioSlug}`);
        return { success: true };
    } catch (error) {
        console.error("[restorePost] Error:", error);
        return { success: false, error: "Error al restaurar post" };
    }
}

/**
 * Restaura un portfolio (is_published = true)
 */
export async function restorePortfolio(portfolioId: string, studioSlug: string) {
    try {
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { studio: { select: { slug: true } } }
        });

        if (!portfolio || portfolio.studio.slug !== studioSlug) {
            return { success: false, error: "Portfolio no encontrado" };
        }

        await prisma.studio_portfolios.update({
            where: { id: portfolioId },
            data: {
                is_published: true,
                published_at: new Date()
            }
        });

        revalidatePath(`/${studioSlug}`);
        return { success: true };
    } catch (error) {
        console.error("[restorePortfolio] Error:", error);
        return { success: false, error: "Error al restaurar portfolio" };
    }
}

/**
 * Activa/Desactiva una oferta (is_active)
 * @param isActive - true para activar, false para archivar
 */
export async function activateOffer(offerId: string, studioSlug: string, isActive: boolean = true) {
    try {
        const offer = await prisma.studio_offers.findUnique({
            where: { id: offerId },
            select: { studio: { select: { slug: true } } }
        });

        if (!offer || offer.studio.slug !== studioSlug) {
            return { success: false, error: "Oferta no encontrada" };
        }

        await prisma.studio_offers.update({
            where: { id: offerId },
            data: { is_active: isActive }
        });

        revalidatePath(`/${studioSlug}`);
        return { success: true };
    } catch (error) {
        console.error("[activateOffer] Error:", error);
        return { success: false, error: isActive ? "Error al activar oferta" : "Error al archivar oferta" };
    }
}

/**
 * Archiva un post (is_published = false)
 */
export async function archivePost(postId: string, studioSlug: string) {
    try {
        const post = await prisma.studio_posts.findUnique({
            where: { id: postId },
            select: { studio: { select: { slug: true } } }
        });

        if (!post || post.studio.slug !== studioSlug) {
            return { success: false, error: "Post no encontrado" };
        }

        await prisma.studio_posts.update({
            where: { id: postId },
            data: { is_published: false }
        });

        revalidatePath(`/${studioSlug}`);
        return { success: true };
    } catch (error) {
        console.error("[archivePost] Error:", error);
        return { success: false, error: "Error al archivar post" };
    }
}

/**
 * Archiva un portfolio (is_published = false)
 */
export async function archivePortfolio(portfolioId: string, studioSlug: string) {
    try {
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { studio: { select: { slug: true } } }
        });

        if (!portfolio || portfolio.studio.slug !== studioSlug) {
            return { success: false, error: "Portfolio no encontrado" };
        }

        await prisma.studio_portfolios.update({
            where: { id: portfolioId },
            data: { is_published: false }
        });

        revalidatePath(`/${studioSlug}`);
        return { success: true };
    } catch (error) {
        console.error("[archivePortfolio] Error:", error);
        return { success: false, error: "Error al archivar portfolio" };
    }
}

/**
 * Desactiva una oferta (is_active = false)
 */
export async function deactivateOffer(offerId: string, studioSlug: string) {
    try {
        const offer = await prisma.studio_offers.findUnique({
            where: { id: offerId },
            select: { studio: { select: { slug: true } } }
        });

        if (!offer || offer.studio.slug !== studioSlug) {
            return { success: false, error: "Oferta no encontrada" };
        }

        await prisma.studio_offers.update({
            where: { id: offerId },
            data: { is_active: false }
        });

        revalidatePath(`/${studioSlug}`);
        return { success: true };
    } catch (error) {
        console.error("[deactivateOffer] Error:", error);
        return { success: false, error: "Error al desactivar oferta" };
    }
}

/**
 * Elimina un post permanentemente
 */
export async function deletePost(postId: string, studioSlug: string) {
    try {
        const post = await prisma.studio_posts.findUnique({
            where: { id: postId },
            select: { studio: { select: { slug: true } } }
        });

        if (!post || post.studio.slug !== studioSlug) {
            return { success: false, error: "Post no encontrado" };
        }

        // Eliminar el post (cascade eliminará media asociado por la relación)
        await prisma.studio_posts.delete({
            where: { id: postId }
        });

        revalidatePath(`/${studioSlug}`);
        return { success: true };
    } catch (error) {
        console.error("[deletePost] Error:", error);
        return { success: false, error: "Error al eliminar post" };
    }
}

/**
 * Elimina un portfolio permanentemente
 */
export async function deletePortfolio(portfolioId: string, studioSlug: string) {
    try {
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { studio: { select: { slug: true } } }
        });

        if (!portfolio || portfolio.studio.slug !== studioSlug) {
            return { success: false, error: "Portfolio no encontrado" };
        }

        // Eliminar el portfolio (cascade eliminará contenido asociado)
        await prisma.studio_portfolios.delete({
            where: { id: portfolioId }
        });

        revalidatePath(`/${studioSlug}`);
        return { success: true };
    } catch (error) {
        console.error("[deletePortfolio] Error:", error);
        return { success: false, error: "Error al eliminar portfolio" };
    }
}

/**
 * Elimina una oferta permanentemente
 */
export async function deleteOffer(offerId: string, studioSlug: string) {
    try {
        const offer = await prisma.studio_offers.findUnique({
            where: { id: offerId },
            select: { studio: { select: { slug: true } } }
        });

        if (!offer || offer.studio.slug !== studioSlug) {
            return { success: false, error: "Oferta no encontrada" };
        }

        // Eliminar la oferta (cascade eliminará contenido asociado)
        await prisma.studio_offers.delete({
            where: { id: offerId }
        });

        revalidatePath(`/${studioSlug}`);
        return { success: true };
    } catch (error) {
        console.error("[deleteOffer] Error:", error);
        return { success: false, error: "Error al eliminar oferta" };
    }
}
