"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ContentBlock } from "@/types/content-blocks";

// CREATE CONTENT BLOCK
export async function createPortfolioContentBlock(
    portfolioId: string,
    block: Omit<ContentBlock, 'id'>
): Promise<{ success: boolean; data?: ContentBlock; error?: string }> {
    try {
        // Obtener el siguiente order
        const lastBlock = await prisma.studio_portfolio_content_blocks.findFirst({
            where: { portfolio_id: portfolioId },
            orderBy: { order: 'desc' },
            select: { order: true },
        });
        const nextOrder = (lastBlock?.order || 0) + 1;

        // Crear content block
        const contentBlock = await prisma.studio_portfolio_content_blocks.create({
            data: {
                portfolio_id: portfolioId,
                type: block.type,
                title: block.title || null,
                description: block.description || null,
                presentation: block.presentation || 'block',
                order: block.order ?? nextOrder,
                config: block.config || null,
            },
        });

        // Crear relaciones con media si existen
        if (block.media && block.media.length > 0) {
            await Promise.all(
                block.media.map(async (mediaItem, index) => {
                    // Verificar si el media existe
                    const existingMedia = await prisma.studio_portfolio_media.findFirst({
                        where: {
                            portfolio_id: portfolioId,
                            file_url: mediaItem.file_url,
                        },
                    });

                    if (existingMedia) {
                        // Crear relación many-to-many
                        await prisma.studio_portfolio_content_block_media.create({
                            data: {
                                content_block_id: contentBlock.id,
                                media_id: existingMedia.id,
                                order: index,
                            },
                        });
                    } else {
                        // Si el media no existe, crear un registro básico
                        // (Esto debería pasar solo si se está usando media que ya está en portfolio_media)
                        console.warn(`Media no encontrado: ${mediaItem.file_url}`);
                    }
                })
            );
        }

        // Obtener portfolio para revalidar
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { studio: { select: { slug: true } } },
        });

        // Obtener content block completo con media
        const blockWithMedia = await getContentBlockWithMedia(contentBlock.id);

        // Revalidar paths
        if (portfolio?.studio.slug) {
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios/${portfolioId}`);
        }

        return {
            success: true,
            data: blockWithMedia,
        };
    } catch (error) {
        console.error("Error creating content block:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al crear bloque",
        };
    }
}

// UPDATE CONTENT BLOCK
export async function updatePortfolioContentBlock(
    blockId: string,
    block: Partial<Omit<ContentBlock, 'id'>>
): Promise<{ success: boolean; data?: ContentBlock; error?: string }> {
    try {
        // Obtener block existente para revalidar
        const existingBlock = await prisma.studio_portfolio_content_blocks.findUnique({
            where: { id: blockId },
            select: {
                portfolio: {
                    select: {
                        id: true,
                        studio: { select: { slug: true } },
                    },
                },
            },
        });

        if (!existingBlock) {
            return { success: false, error: "Bloque no encontrado" };
        }

        // Actualizar content block
        const updatedBlock = await prisma.studio_portfolio_content_blocks.update({
            where: { id: blockId },
            data: {
                type: block.type,
                title: block.title ?? undefined,
                description: block.description ?? undefined,
                presentation: block.presentation,
                order: block.order,
                config: block.config ?? undefined,
            },
        });

        // Actualizar relaciones con media si se proporcionan
        if (block.media !== undefined) {
            // Eliminar relaciones existentes
            await prisma.studio_portfolio_content_block_media.deleteMany({
                where: { content_block_id: blockId },
            });

            // Crear nuevas relaciones
            if (block.media.length > 0) {
                await Promise.all(
                    block.media.map(async (mediaItem, index) => {
                        const existingMedia = await prisma.studio_portfolio_media.findFirst({
                            where: {
                                portfolio_id: existingBlock.portfolio.id,
                                file_url: mediaItem.file_url,
                            },
                        });

                        if (existingMedia) {
                            await prisma.studio_portfolio_content_block_media.create({
                                data: {
                                    content_block_id: blockId,
                                    media_id: existingMedia.id,
                                    order: index,
                                },
                            });
                        }
                    })
                );
            }
        }

        // Obtener block completo con media
        const blockWithMedia = await getContentBlockWithMedia(blockId);

        // Revalidar paths
        if (existingBlock.portfolio.studio.slug) {
            revalidatePath(`/${existingBlock.portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${existingBlock.portfolio.studio.slug}/profile/edit/content/portfolios/${existingBlock.portfolio.id}`);
        }

        return {
            success: true,
            data: blockWithMedia,
        };
    } catch (error) {
        console.error("Error updating content block:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al actualizar bloque",
        };
    }
}

// DELETE CONTENT BLOCK
export async function deletePortfolioContentBlock(blockId: string) {
    try {
        // Obtener block para revalidar
        const block = await prisma.studio_portfolio_content_blocks.findUnique({
            where: { id: blockId },
            select: {
                portfolio: {
                    select: {
                        id: true,
                        studio: { select: { slug: true } },
                    },
                },
            },
        });

        if (!block) {
            return { success: false, error: "Bloque no encontrado" };
        }

        // Eliminar (las relaciones se eliminan automáticamente por cascade)
        await prisma.studio_portfolio_content_blocks.delete({
            where: { id: blockId },
        });

        // Revalidar paths
        if (block.portfolio.studio.slug) {
            revalidatePath(`/${block.portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${block.portfolio.studio.slug}/profile/edit/content/portfolios/${block.portfolio.id}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting content block:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al eliminar bloque",
        };
    }
}

// REORDER CONTENT BLOCKS
export async function reorderPortfolioContentBlocks(
    portfolioId: string,
    blockIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        // Obtener portfolio para revalidar
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { studio: { select: { slug: true } } },
        });

        // Actualizar order para cada block
        await Promise.all(
            blockIds.map((blockId, index) =>
                prisma.studio_portfolio_content_blocks.update({
                    where: { id: blockId },
                    data: { order: index },
                })
            )
        );

        // Revalidar paths
        if (portfolio?.studio.slug) {
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios/${portfolioId}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error reordering content blocks:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al reordenar bloques",
        };
    }
}

// GET PORTFOLIO CONTENT BLOCKS
export async function getPortfolioContentBlocks(
    portfolioId: string
): Promise<{ success: boolean; data?: ContentBlock[]; error?: string }> {
    try {
        const blocks = await prisma.studio_portfolio_content_blocks.findMany({
            where: { portfolio_id: portfolioId },
            orderBy: { order: 'asc' },
        });

        // Obtener bloques con media
        const blocksWithMedia = await Promise.all(
            blocks.map((block) => getContentBlockWithMedia(block.id))
        );

        return {
            success: true,
            data: blocksWithMedia,
        };
    } catch (error) {
        console.error("Error fetching content blocks:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al obtener bloques",
        };
    }
}

// GET SINGLE CONTENT BLOCK WITH MEDIA
async function getContentBlockWithMedia(blockId: string): Promise<ContentBlock> {
    const block = await prisma.studio_portfolio_content_blocks.findUnique({
        where: { id: blockId },
        include: {
            block_media: {
                include: {
                    media: true,
                },
                orderBy: { order: 'asc' },
            },
        },
    });

    if (!block) {
        throw new Error("Content block not found");
    }

    // Mapear a ContentBlock
    const media: ContentBlock['media'] = block.block_media.map((bm) => ({
        id: bm.media.id,
        file_url: bm.media.file_url,
        file_type: bm.media.file_type as 'image' | 'video',
        filename: bm.media.filename,
        storage_path: bm.media.storage_path,
        storage_bytes: Number(bm.media.storage_bytes),
        thumbnail_url: bm.media.thumbnail_url || undefined,
        display_order: bm.media.display_order,
    }));

    return {
        id: block.id,
        type: block.type as ContentBlock['type'],
        title: block.title || undefined,
        description: block.description || undefined,
        presentation: block.presentation as ContentBlock['presentation'],
        order: block.order,
        config: (block.config as Record<string, unknown>) || undefined,
        media,
    };
}

// BATCH UPDATE CONTENT BLOCKS (para actualizar múltiples bloques de una vez)
export async function batchUpdatePortfolioContentBlocks(
    portfolioId: string,
    blocks: ContentBlock[]
): Promise<{ success: boolean; error?: string }> {
    try {
        // Obtener portfolio para revalidar
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { studio: { select: { slug: true } } },
        });

        // Usar transacción para actualizar todos los bloques
        await prisma.$transaction(async (tx) => {
            for (const block of blocks) {
                if (block.id) {
                    // Actualizar bloque existente
                    await tx.studio_portfolio_content_blocks.update({
                        where: { id: block.id },
                        data: {
                            type: block.type,
                            title: block.title || null,
                            description: block.description || null,
                            presentation: block.presentation,
                            order: block.order,
                            config: block.config || null,
                        },
                    });

                    // Actualizar relaciones con media
                    await tx.studio_portfolio_content_block_media.deleteMany({
                        where: { content_block_id: block.id },
                    });

                    if (block.media && block.media.length > 0) {
                        for (const [index, mediaItem] of block.media.entries()) {
                            const existingMedia = await tx.studio_portfolio_media.findFirst({
                                where: {
                                    portfolio_id: portfolioId,
                                    file_url: mediaItem.file_url,
                                },
                            });

                            if (existingMedia) {
                                await tx.studio_portfolio_content_block_media.create({
                                    data: {
                                        content_block_id: block.id,
                                        media_id: existingMedia.id,
                                        order: index,
                                    },
                                });
                            }
                        }
                    }
                } else {
                    // Crear nuevo bloque
                    await createPortfolioContentBlock(portfolioId, block);
                }
            }
        });

        // Revalidar paths
        if (portfolio?.studio.slug) {
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios`);
            revalidatePath(`/${portfolio.studio.slug}/profile/edit/content/portfolios/${portfolioId}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error batch updating content blocks:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al actualizar bloques",
        };
    }
}

