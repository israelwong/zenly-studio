"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ContentBlock } from "@/types/content-blocks";

// GET OFFER CONTENT BLOCKS WITH MEDIA
async function getOfferContentBlockWithMedia(blockId: string): Promise<ContentBlock> {
    const block = await prisma.studio_offer_content_blocks.findUnique({
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

// GET OFFER CONTENT BLOCKS
export async function getOfferContentBlocks(
    offerId: string
): Promise<{ success: boolean; data?: ContentBlock[]; error?: string }> {
    try {
        const blocks = await prisma.studio_offer_content_blocks.findMany({
            where: { offer_id: offerId },
            orderBy: { order: 'asc' },
        });

        // Obtener bloques con media
        const blocksWithMedia = await Promise.all(
            blocks.map((block) => getOfferContentBlockWithMedia(block.id))
        );

        return {
            success: true,
            data: blocksWithMedia,
        };
    } catch (error) {
        console.error("Error fetching offer content blocks:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al obtener bloques",
        };
    }
}

// BATCH UPDATE OFFER CONTENT BLOCKS
export async function batchUpdateOfferContentBlocks(
    offerId: string,
    studioId: string,
    blocks: ContentBlock[]
): Promise<{ success: boolean; error?: string }> {
    try {
        // Obtener offer para revalidar
        const offer = await prisma.studio_offers.findUnique({
            where: { id: offerId },
            select: { studio: { select: { slug: true } } },
        });

        if (!offer) {
            return { success: false, error: "Oferta no encontrada" };
        }

        // Usar transacción para actualizar todos los bloques
        await prisma.$transaction(async (tx) => {
            // Obtener IDs de bloques existentes
            const existingBlocks = await tx.studio_offer_content_blocks.findMany({
                where: { offer_id: offerId },
                select: { id: true },
            });
            const existingBlockIds = new Set(existingBlocks.map(b => b.id));
            const incomingBlockIds = new Set(blocks.filter(b => b.id).map(b => b.id!));

            // Eliminar bloques que ya no están en la lista
            const blocksToDelete = Array.from(existingBlockIds).filter(id => !incomingBlockIds.has(id));
            const blocksToDeleteSet = new Set(blocksToDelete);
            if (blocksToDelete.length > 0) {
                await tx.studio_offer_content_blocks.deleteMany({
                    where: {
                        id: { in: blocksToDelete },
                        offer_id: offerId,
                    },
                });
            }

            // Actualizar o crear bloques
            for (const block of blocks) {
                if (block.id && existingBlockIds.has(block.id) && !blocksToDeleteSet.has(block.id)) {
                    try {
                        // Actualizar bloque existente
                        await tx.studio_offer_content_blocks.update({
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
                        await tx.studio_offer_content_block_media.deleteMany({
                            where: { content_block_id: block.id },
                        });

                        if (block.media && block.media.length > 0) {
                            for (const [index, mediaItem] of block.media.entries()) {
                                // Buscar o crear media
                                let existingMedia = await tx.studio_offer_media.findFirst({
                                    where: {
                                        offer_id: offerId,
                                        file_url: mediaItem.file_url,
                                    },
                                });

                                if (!existingMedia && mediaItem.file_url) {
                                    // Crear nuevo media si no existe
                                    existingMedia = await tx.studio_offer_media.create({
                                        data: {
                                            offer_id: offerId,
                                            studio_id: studioId,
                                            file_url: mediaItem.file_url,
                                            file_type: mediaItem.file_type,
                                            filename: mediaItem.filename,
                                            storage_bytes: BigInt(mediaItem.storage_bytes || 0),
                                            mime_type: mediaItem.mime_type || 'application/octet-stream',
                                            display_order: mediaItem.display_order || index,
                                            alt_text: mediaItem.alt_text || null,
                                            thumbnail_url: mediaItem.thumbnail_url || null,
                                            storage_path: mediaItem.storage_path,
                                            dimensions: mediaItem.dimensions || null,
                                            duration_seconds: mediaItem.duration_seconds || null,
                                        },
                                    });
                                }

                                if (existingMedia) {
                                    await tx.studio_offer_content_block_media.create({
                                        data: {
                                            content_block_id: block.id,
                                            media_id: existingMedia.id,
                                            order: index,
                                        },
                                    });
                                }
                            }
                        }
                    } catch (error: any) {
                        // Si el bloque no existe (fue eliminado), crear uno nuevo
                        if (error?.code === 'P2025' || error?.message?.includes('Record to update not found')) {
                            // Crear nuevo bloque en lugar del que no existe
                            const lastBlock = await tx.studio_offer_content_blocks.findFirst({
                                where: { offer_id: offerId },
                                orderBy: { order: 'desc' },
                                select: { order: true },
                            });
                            const nextOrder = (lastBlock?.order || 0) + 1;

                            const newBlock = await tx.studio_offer_content_blocks.create({
                                data: {
                                    offer_id: offerId,
                                    type: block.type,
                                    title: block.title || null,
                                    description: block.description || null,
                                    presentation: block.presentation || 'block',
                                    order: block.order ?? nextOrder,
                                    config: block.config || null,
                                },
                            });

                            // Crear relaciones con media
                            if (block.media && block.media.length > 0) {
                                for (const [index, mediaItem] of block.media.entries()) {
                                    let existingMedia = await tx.studio_offer_media.findFirst({
                                        where: {
                                            offer_id: offerId,
                                            file_url: mediaItem.file_url,
                                        },
                                    });

                                    if (!existingMedia && mediaItem.file_url) {
                                        existingMedia = await tx.studio_offer_media.create({
                                            data: {
                                                offer_id: offerId,
                                                studio_id: studioId,
                                                file_url: mediaItem.file_url,
                                                file_type: mediaItem.file_type,
                                                filename: mediaItem.filename,
                                                storage_bytes: BigInt(mediaItem.storage_bytes || 0),
                                                mime_type: mediaItem.mime_type || 'application/octet-stream',
                                                display_order: mediaItem.display_order || index,
                                                alt_text: mediaItem.alt_text || null,
                                                thumbnail_url: mediaItem.thumbnail_url || null,
                                                storage_path: mediaItem.storage_path,
                                                dimensions: mediaItem.dimensions || null,
                                                duration_seconds: mediaItem.duration_seconds || null,
                                            },
                                        });
                                    }

                                    if (existingMedia) {
                                        await tx.studio_offer_content_block_media.create({
                                            data: {
                                                content_block_id: newBlock.id,
                                                media_id: existingMedia.id,
                                                order: index,
                                            },
                                        });
                                    }
                                }
                            }
                        } else {
                            // Re-lanzar otros errores
                            throw error;
                        }
                    }
                } else {
                    // Crear nuevo bloque
                    const lastBlock = await tx.studio_offer_content_blocks.findFirst({
                        where: { offer_id: offerId },
                        orderBy: { order: 'desc' },
                        select: { order: true },
                    });
                    const nextOrder = (lastBlock?.order || 0) + 1;

                    const newBlock = await tx.studio_offer_content_blocks.create({
                        data: {
                            offer_id: offerId,
                            type: block.type,
                            title: block.title || null,
                            description: block.description || null,
                            presentation: block.presentation || 'block',
                            order: block.order ?? nextOrder,
                            config: block.config || null,
                        },
                    });

                    // Crear relaciones con media
                    if (block.media && block.media.length > 0) {
                        for (const [index, mediaItem] of block.media.entries()) {
                            let existingMedia = await tx.studio_offer_media.findFirst({
                                where: {
                                    offer_id: offerId,
                                    file_url: mediaItem.file_url,
                                },
                            });

                            if (!existingMedia && mediaItem.file_url) {
                                existingMedia = await tx.studio_offer_media.create({
                                    data: {
                                        offer_id: offerId,
                                        studio_id: studioId,
                                        file_url: mediaItem.file_url,
                                        file_type: mediaItem.file_type,
                                        filename: mediaItem.filename,
                                        storage_bytes: BigInt(mediaItem.storage_bytes || 0),
                                        mime_type: mediaItem.mime_type || 'application/octet-stream',
                                        display_order: mediaItem.display_order || index,
                                        alt_text: mediaItem.alt_text || null,
                                        thumbnail_url: mediaItem.thumbnail_url || null,
                                        storage_path: mediaItem.storage_path,
                                        dimensions: mediaItem.dimensions || null,
                                        duration_seconds: mediaItem.duration_seconds || null,
                                    },
                                });
                            }

                            if (existingMedia) {
                                await tx.studio_offer_content_block_media.create({
                                    data: {
                                        content_block_id: newBlock.id,
                                        media_id: existingMedia.id,
                                        order: index,
                                    },
                                });
                            }
                        }
                    }
                }
            }
        }, {
            timeout: 30000, // 30 segundos para transacciones con muchos bloques
        });

        // Revalidar paths
        if (offer.studio.slug) {
            revalidatePath(`/${offer.studio.slug}/studio/commercial/ofertas`);
            revalidatePath(`/${offer.studio.slug}/studio/commercial/ofertas/${offerId}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error batch updating offer content blocks:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al actualizar bloques",
        };
    }
}
