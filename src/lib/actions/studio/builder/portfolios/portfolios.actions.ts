"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
    portfolioFormSchema,
    type PortfolioFormData,
    type PortfolioFilters,
} from "@/lib/actions/schemas/portfolio-schemas";
import { StudioPortfolio } from "@/types/studio-portfolios";

// Tipo específico para el resultado de portfolios
type PortfoliosResult =
    | { success: true; data: StudioPortfolio[] }
    | { success: false; error: string };

// Helper para generar slug desde título
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// Validar si un slug existe en el studio (excluyendo un portfolio específico si se proporciona)
export async function checkPortfolioSlugExists(studioSlug: string, slug: string, excludePortfolioId?: string): Promise<boolean> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return false;
        }

        const existing = await prisma.studio_portfolios.findUnique({
            where: {
                studio_id_slug: {
                    studio_id: studio.id,
                    slug: slug,
                },
            },
            select: { id: true },
        });

        // Si no existe, o si existe pero es el mismo portfolio que estamos editando, no hay conflicto
        return !!(existing && (!excludePortfolioId || existing.id !== excludePortfolioId));
    } catch (error) {
        console.error('Error checking portfolio slug:', error);
        return false;
    }
}

// Helper para generar slug único verificando en BD
async function generateUniqueSlug(studioId: string, baseSlug: string, excludePortfolioId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
        const existing = await prisma.studio_portfolios.findUnique({
            where: {
                studio_id_slug: {
                    studio_id: studioId,
                    slug: slug,
                },
            },
            select: { id: true },
        });
        
        // Si no existe, o si existe pero es el mismo portfolio que estamos editando, es válido
        if (!existing || (excludePortfolioId && existing.id === excludePortfolioId)) {
            return slug;
        }
        
        // Si existe otro portfolio con ese slug, agregar número al final
        slug = `${baseSlug}-${counter}`;
        counter++;
        
        // Límite de seguridad para evitar loops infinitos
        if (counter > 1000) {
            // Usar timestamp como último recurso
            slug = `${baseSlug}-${Date.now()}`;
            break;
        }
    }
    
    return slug;
}

// Helper para obtener studio_id desde slug
async function getStudioIdFromSlug(studioSlug: string): Promise<string | null> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true },
        });
        return studio?.id || null;
    } catch (error) {
        console.error('Error obteniendo studio_id:', error);
        return null;
    }
}

// CREATE from slug (helper para PortfolioEditor)
export async function createStudioPortfolioFromSlug(studioSlug: string, data: PortfolioFormData) {
    const studioId = await getStudioIdFromSlug(studioSlug);
    if (!studioId) {
        return { success: false, error: "Studio no encontrado" };
    }
    return createStudioPortfolio(studioId, data);
}

// UPDATE from slug (helper para PortfolioEditor)
export async function updateStudioPortfolioFromSlug(
    portfolioId: string,
    studioSlug: string,
    data: Partial<PortfolioFormData>
) {
    // Verificar que el portfolio pertenece al studio
    const studioId = await getStudioIdFromSlug(studioSlug);
    if (!studioId) {
        return { success: false, error: "Studio no encontrado" };
    }

    const existingPortfolio = await prisma.studio_portfolios.findUnique({
        where: { id: portfolioId },
        select: { studio_id: true },
    });

    if (!existingPortfolio) {
        return { success: false, error: "Portfolio no encontrado" };
    }

    if (existingPortfolio.studio_id !== studioId) {
        return { success: false, error: "No tienes permiso para editar este portfolio" };
    }

    return updateStudioPortfolio(portfolioId, data);
}

// CREATE
export async function createStudioPortfolio(studioId: string, data: PortfolioFormData) {
    try {
        const validatedData = portfolioFormSchema.parse(data);
        
        // Generar slug base si no se proporciona
        const baseSlug = validatedData.slug || generateSlug(validatedData.title);
        
        // Generar slug único verificando en BD
        const slug = await generateUniqueSlug(studioId, baseSlug);

        // Crear portfolio con transacción para media y content_blocks
        const portfolio = await prisma.$transaction(async (tx) => {
            // Verificar slug único dentro de la transacción (evita race conditions)
            let finalSlug = slug;
            let counter = 1;
            while (true) {
                const existing = await tx.studio_portfolios.findUnique({
                    where: {
                        studio_id_slug: {
                            studio_id: studioId,
                            slug: finalSlug,
                        },
                    },
                    select: { id: true },
                });
                
                if (!existing) {
                    break;
                }
                
                // Generar nuevo slug si existe
                const baseSlug = validatedData.slug || generateSlug(validatedData.title);
                finalSlug = `${baseSlug}-${counter}`;
                counter++;
                
                if (counter > 1000) {
                    finalSlug = `${baseSlug}-${Date.now()}`;
                    break;
                }
            }
            
            // Crear portfolio base
            const newPortfolio = await tx.studio_portfolios.create({
                data: {
                    studio_id: studioId,
                    title: validatedData.title,
                    slug: finalSlug,
                    description: validatedData.description || null,
                    caption: validatedData.caption || null,
                    cover_image_url: validatedData.cover_image_url || null,
                    cover_index: validatedData.cover_index,
                    category: validatedData.category || null,
                    event_type_id: validatedData.event_type_id || null,
                    tags: validatedData.tags || [],
                    is_featured: validatedData.is_featured || false,
                    is_published: validatedData.is_published || false,
                    published_at: validatedData.is_published ? new Date() : null,
                    order: validatedData.order || 0,
                },
                include: {
                    event_type: { select: { id: true, name: true } },
                    studio: { select: { slug: true, studio_name: true } },
                },
            });

            // Crear media items
            if (validatedData.media && validatedData.media.length > 0) {
                await tx.studio_portfolio_media.createMany({
                    data: validatedData.media.map((item, index) => ({
                        portfolio_id: newPortfolio.id,
                        studio_id: studioId,
                        file_url: item.file_url,
                        file_type: item.file_type,
                        filename: item.filename,
                        storage_bytes: BigInt(item.storage_bytes || 0),
                        mime_type: item.mime_type || "",
                        dimensions: item.dimensions || null,
                        duration_seconds: item.duration_seconds || null,
                        display_order: item.display_order ?? index,
                        alt_text: item.alt_text || null,
                        thumbnail_url: item.thumbnail_url || null,
                        storage_path: item.storage_path,
                    })),
                });
            }

            // Crear content blocks (si se proporcionan)
            if (validatedData.content_blocks && validatedData.content_blocks.length > 0) {
                for (const block of validatedData.content_blocks) {
                    const contentBlock = await tx.studio_portfolio_content_blocks.create({
                        data: {
                            portfolio_id: newPortfolio.id,
                            type: block.type,
                            title: block.title || null,
                            description: block.description || null,
                            presentation: block.presentation || "block",
                            order: block.order || 0,
                            config: block.config || null,
                        },
                    });

                    // Crear relaciones con media si existen
                    if (block.media && block.media.length > 0) {
                        // Optimización: Obtener todos los media items existentes en una sola consulta
                        const fileUrls = block.media.map(item => item.file_url);
                        const existingMediaItems = await tx.studio_portfolio_media.findMany({
                            where: {
                                portfolio_id: newPortfolio.id,
                                file_url: { in: fileUrls },
                            },
                        });

                        // Crear un Map para búsqueda rápida
                        const existingMediaMap = new Map(
                            existingMediaItems.map(item => [item.file_url, item.id])
                        );

                        // Crear media items que no existen
                        const mediaItemsToCreate = block.media
                            .filter(item => !existingMediaMap.has(item.file_url))
                            .map(item => ({
                                portfolio_id: newPortfolio.id,
                                studio_id: studioId,
                                file_url: item.file_url,
                                file_type: item.file_type,
                                filename: item.filename,
                                storage_bytes: BigInt(item.storage_bytes || 0),
                                mime_type: item.mime_type || "",
                                dimensions: item.dimensions || null,
                                duration_seconds: item.duration_seconds || null,
                                display_order: item.display_order || 0,
                                alt_text: item.alt_text || null,
                                thumbnail_url: item.thumbnail_url || null,
                                storage_path: item.storage_path,
                            }));

                        // Crear nuevos media items en batch si hay alguno
                        let newMediaItems: Array<{ id: string; file_url: string }> = [];
                        if (mediaItemsToCreate.length > 0) {
                            // createMany no retorna los IDs, así que usamos create con Promise.all
                            newMediaItems = await Promise.all(
                                mediaItemsToCreate.map(item =>
                                    tx.studio_portfolio_media.create({
                                        data: item,
                                        select: { id: true, file_url: true },
                                    })
                                )
                            );

                            // Agregar los nuevos items al mapa
                            newMediaItems.forEach(item => {
                                existingMediaMap.set(item.file_url, item.id);
                            });
                        }

                        // Obtener todos los IDs de media (existentes + nuevos) en el orden correcto
                        const mediaIds = block.media.map(item => existingMediaMap.get(item.file_url)!);

                        // Crear relaciones many-to-many
                        await tx.studio_portfolio_content_block_media.createMany({
                            data: mediaIds.map((mediaId, index) => ({
                                content_block_id: contentBlock.id,
                                media_id: mediaId,
                                order: index,
                            })),
                        });
                    }
                }
            }

            return newPortfolio;
        }, {
            maxWait: 10000, // 10 segundos para iniciar la transacción
            timeout: 15000, // 15 segundos para completar la transacción
        });

        // Obtener portfolio completo con relaciones
        const portfolioWithRelations = await prisma.studio_portfolios.findUnique({
            where: { id: portfolio.id },
            include: {
                event_type: { select: { id: true, name: true } },
                studio: { select: { slug: true, studio_name: true } },
                media: {
                    orderBy: { display_order: "asc" },
                },
                content_blocks: {
                    include: {
                        block_media: {
                            include: {
                                media: true,
                            },
                            orderBy: { order: "asc" },
                        },
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        revalidatePath(`/${portfolio.studio.slug}/studio/builder/content/portfolios`);
        if (portfolio.is_published) {
            revalidatePath(`/${portfolio.studio.slug}/portfolios/${portfolio.slug}`);
        }

        return { success: true, data: portfolioWithRelations as unknown as StudioPortfolio };
    } catch (error) {
        console.error("Error creating portfolio:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al crear portfolio",
        };
    }
}

// READ
export async function getStudioPortfolios(studioId: string, filters?: PortfolioFilters): Promise<PortfoliosResult> {
    try {
        const where: Record<string, unknown> = {
            studio_id: studioId,
        };

        // Solo agregar filtros si están definidos
        if (filters?.is_published !== undefined) {
            where.is_published = filters.is_published;
        }
        if (filters?.category) {
            where.category = filters.category;
        }
        if (filters?.event_type_id) {
            where.event_type_id = filters.event_type_id;
        }

        console.log("[getStudioPortfolios] Query where:", JSON.stringify(where, null, 2));

        const portfolios = await prisma.studio_portfolios.findMany({
            where,
            include: {
                event_type: { select: { id: true, name: true } },
                media: {
                    orderBy: { display_order: "asc" },
                },
                content_blocks: {
                    include: {
                        block_media: {
                            include: {
                                media: true,
                            },
                            orderBy: { order: "asc" },
                        },
                    },
                    orderBy: { order: "asc" },
                },
            },
            orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
        });

        console.log("[getStudioPortfolios] Found portfolios:", portfolios.length);

        return { success: true, data: portfolios as unknown as StudioPortfolio[] };
    } catch (error) {
        console.error("Error fetching portfolios:", error);
        const errorMessage = error instanceof Error ? error.message : "Error al obtener portfolios";
        console.error("Error details:", errorMessage);
        return { success: false, error: errorMessage };
    }
}

// READ by slug - Helper para builder
export async function getStudioPortfoliosBySlug(studioSlug: string, filters?: PortfolioFilters): Promise<PortfoliosResult> {
    try {
        console.log("[getStudioPortfoliosBySlug] Looking for studio with slug:", studioSlug);
        
        // Obtener studioId desde slug
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            console.error("[getStudioPortfoliosBySlug] Studio not found for slug:", studioSlug);
            return { success: false, error: "Studio no encontrado" };
        }

        console.log("[getStudioPortfoliosBySlug] Found studio ID:", studio.id);

        const result = await getStudioPortfolios(studio.id, filters);
        return result;
    } catch (error) {
        console.error("Error fetching portfolios by slug:", error);
        const errorMessage = error instanceof Error ? error.message : "Error al obtener portfolios";
        console.error("Error details:", errorMessage);
        return { success: false, error: errorMessage };
    }
}

// READ by ID
export async function getStudioPortfolioById(portfolioId: string) {
    try {
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            include: {
                event_type: { select: { id: true, name: true } },
                studio: {
                    select: {
                        id: true,
                        slug: true,
                        studio_name: true,
                    },
                },
                media: {
                    orderBy: { display_order: "asc" },
                },
                content_blocks: {
                    include: {
                        block_media: {
                            include: {
                                media: true,
                            },
                            orderBy: { order: "asc" },
                        },
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!portfolio) {
            return { success: false, error: "Portfolio no encontrado" };
        }

        return { success: true, data: portfolio };
    } catch (error) {
        console.error("Error fetching portfolio:", error);
        return { success: false, error: "Error al obtener portfolio" };
    }
}

// READ by slug (para visualización pública)
export async function getStudioPortfolioBySlug(studioSlug: string, portfolioSlug: string) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        const portfolio = await prisma.studio_portfolios.findFirst({
            where: {
                studio_id: studio.id,
                slug: portfolioSlug,
                is_published: true,
            },
            include: {
                event_type: { select: { id: true, name: true } },
                studio: {
                    select: {
                        id: true,
                        slug: true,
                        studio_name: true,
                    },
                },
                media: {
                    orderBy: { display_order: "asc" },
                },
                content_blocks: {
                    include: {
                        block_media: {
                            include: {
                                media: true,
                            },
                            orderBy: { order: "asc" },
                        },
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!portfolio) {
            return { success: false, error: "Portfolio no encontrado" };
        }

        return { success: true, data: portfolio };
    } catch (error) {
        console.error("Error fetching portfolio by slug:", error);
        return { success: false, error: "Error al obtener portfolio" };
    }
}

// UPDATE
export async function updateStudioPortfolio(
    portfolioId: string,
    data: Partial<PortfolioFormData>
) {
    try {
        const validatedData = portfolioFormSchema.partial().parse(data);

        // Obtener portfolio existente para revalidar paths
        const existingPortfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: {
                studio: { select: { slug: true } },
                slug: true,
            },
        });

        if (!existingPortfolio) {
            return { success: false, error: "Portfolio no encontrado" };
        }

        // Obtener studio_id y published_at del portfolio existente
        const portfolioWithStudio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { 
                studio_id: true,
                published_at: true,
            },
        });

        if (!portfolioWithStudio) {
            return { success: false, error: "Portfolio no encontrado" };
        }

        // Si se actualiza el slug, validar que sea único (excluyendo el portfolio actual)
        let finalSlug = validatedData.slug;
        if (validatedData.slug) {
            finalSlug = await generateUniqueSlug(portfolioWithStudio.studio_id, validatedData.slug, portfolioId);
        }

        // Aumentar timeout de transacción para portfolios complejos con muchos bloques
        const portfolio = await prisma.$transaction(async (tx) => {
            // Verificar slug único dentro de la transacción (evita race conditions)
            let transactionSlug = finalSlug;
            if (finalSlug) {
                let counter = 1;
                while (true) {
                    const existing = await tx.studio_portfolios.findUnique({
                        where: {
                            studio_id_slug: {
                                studio_id: portfolioWithStudio.studio_id,
                                slug: transactionSlug,
                            },
                        },
                        select: { id: true },
                    });
                    
                    // Si no existe, o si existe pero es el mismo portfolio que estamos editando, es válido
                    if (!existing || existing.id === portfolioId) {
                        break;
                    }
                    
                    // Si existe otro portfolio, agregar número al final
                    const baseSlug = validatedData.slug || "";
                    transactionSlug = `${baseSlug}-${counter}`;
                    counter++;
                    
                    if (counter > 1000) {
                        transactionSlug = `${baseSlug}-${Date.now()}`;
                        break;
                    }
                }
            }

            // Actualizar portfolio base
            const updatedPortfolio = await tx.studio_portfolios.update({
                where: { id: portfolioId },
                data: {
                    title: validatedData.title,
                    slug: transactionSlug || undefined,
                    description: validatedData.description ?? undefined,
                    caption: validatedData.caption ?? undefined,
                    cover_image_url: validatedData.cover_image_url ?? undefined,
                    cover_index: validatedData.cover_index,
                    category: validatedData.category ?? undefined,
                    event_type_id: validatedData.event_type_id ?? undefined,
                    tags: validatedData.tags,
                    is_featured: validatedData.is_featured,
                    is_published: validatedData.is_published,
                    published_at: validatedData.is_published 
                        ? new Date() 
                        : validatedData.is_published === false 
                            ? portfolioWithStudio.published_at ?? null // Preservar fecha histórica al despublicar
                            : undefined,
                    order: validatedData.order,
                    updated_at: new Date(),
                },
                include: {
                    event_type: { select: { id: true, name: true } },
                    studio: { select: { slug: true } },
                },
            });

            // Actualizar media si se proporciona
            if (validatedData.media !== undefined) {
                // Eliminar media existente
                await tx.studio_portfolio_media.deleteMany({
                    where: { portfolio_id: portfolioId },
                });

                // Crear nuevos media items
                if (validatedData.media.length > 0) {
                    await tx.studio_portfolio_media.createMany({
                        data: validatedData.media.map((item, index) => ({
                            portfolio_id: portfolioId,
                            studio_id: portfolioWithStudio.studio_id,
                            file_url: item.file_url,
                            file_type: item.file_type,
                            filename: item.filename,
                            storage_bytes: BigInt(item.storage_bytes || 0),
                            mime_type: item.mime_type || "",
                            dimensions: item.dimensions || null,
                            duration_seconds: item.duration_seconds || null,
                            display_order: item.display_order ?? index,
                            alt_text: item.alt_text || null,
                            thumbnail_url: item.thumbnail_url || null,
                            storage_path: item.storage_path,
                        })),
                    });
                }
            }

            // Actualizar content_blocks si se proporcionan
            if (validatedData.content_blocks !== undefined) {
                // Obtener content_blocks existentes con sus relaciones de media
                const existingBlocks = await tx.studio_portfolio_content_blocks.findMany({
                    where: { portfolio_id: portfolioId },
                    include: { block_media: true },
                });

                // Eliminar relaciones de media de bloques existentes
                const existingBlockIds = existingBlocks.map(b => b.id);
                if (existingBlockIds.length > 0) {
                    await tx.studio_portfolio_content_block_media.deleteMany({
                        where: { content_block_id: { in: existingBlockIds } },
                    });
                }

                // Eliminar content_blocks existentes
                await tx.studio_portfolio_content_blocks.deleteMany({
                    where: { portfolio_id: portfolioId },
                });

                // Crear nuevos content blocks
                if (validatedData.content_blocks.length > 0) {
                    for (const block of validatedData.content_blocks) {
                        const contentBlock = await tx.studio_portfolio_content_blocks.create({
                            data: {
                                portfolio_id: portfolioId,
                                type: block.type,
                                title: block.title || null,
                                description: block.description || null,
                                presentation: block.presentation || "block",
                                order: block.order || 0,
                                config: block.config || null,
                            },
                        });

                        // Crear relaciones con media si existen
                        if (block.media && block.media.length > 0) {
                            // Obtener todos los file_urls únicos de este bloque
                            const fileUrls = block.media.map(m => m.file_url);
                            
                            // Buscar todos los media existentes de una vez
                            const existingMediaList = await tx.studio_portfolio_media.findMany({
                                where: {
                                    portfolio_id: portfolioId,
                                    file_url: { in: fileUrls },
                                },
                            });
                            
                            // Crear un mapa para búsquedas rápidas
                            const existingMediaMap = new Map(
                                existingMediaList.map(m => [m.file_url, m.id])
                            );
                            
                            // Obtener o crear media items
                            const mediaItems = await Promise.all(
                                block.media.map(async (mediaItem) => {
                                    const existingMediaId = existingMediaMap.get(mediaItem.file_url);
                                    
                                    if (existingMediaId) {
                                        return existingMediaId;
                                    }

                                    const newMedia = await tx.studio_portfolio_media.create({
                                        data: {
                                            portfolio_id: portfolioId,
                                            studio_id: portfolioWithStudio.studio_id,
                                            file_url: mediaItem.file_url,
                                            file_type: mediaItem.file_type,
                                            filename: mediaItem.filename,
                                            storage_bytes: BigInt(mediaItem.storage_bytes || 0),
                                            mime_type: mediaItem.mime_type || "",
                                            dimensions: mediaItem.dimensions || null,
                                            duration_seconds: mediaItem.duration_seconds || null,
                                            display_order: mediaItem.display_order || 0,
                                            alt_text: mediaItem.alt_text || null,
                                            thumbnail_url: mediaItem.thumbnail_url || null,
                                            storage_path: mediaItem.storage_path,
                                        },
                                    });

                                    return newMedia.id;
                                })
                            );

                            // Crear relaciones many-to-many
                            await tx.studio_portfolio_content_block_media.createMany({
                                data: mediaItems.map((mediaId, index) => ({
                                    content_block_id: contentBlock.id,
                                    media_id: mediaId,
                                    order: index,
                                })),
                            });
                        }
                    }
                }
            }

            return updatedPortfolio;
        }, {
            maxWait: 10000, // 10 segundos para iniciar la transacción
            timeout: 15000, // 15 segundos para completar la transacción
        });

        // Obtener portfolio completo con relaciones actualizadas
        const portfolioWithRelations = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            include: {
                event_type: { select: { id: true, name: true } },
                studio: { select: { slug: true, studio_name: true } },
                media: {
                    orderBy: { display_order: "asc" },
                },
                content_blocks: {
                    include: {
                        block_media: {
                            include: {
                                media: true,
                            },
                            orderBy: { order: "asc" },
                        },
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        revalidatePath(`/${portfolio.studio.slug}/studio/builder/content/portfolios`);
        if (portfolio.is_published) {
            revalidatePath(`/${portfolio.studio.slug}/portfolios/${portfolio.slug}`);
        }

        return { success: true, data: portfolioWithRelations as unknown as StudioPortfolio };
    } catch (error) {
        console.error("Error updating portfolio:", error);
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "Error al actualizar portfolio",
        };
    }
}

// DELETE
export async function deleteStudioPortfolio(portfolioId: string) {
    try {
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: { 
                studio: { select: { slug: true } },
                slug: true,
                is_published: true,
            },
        });

        if (!portfolio) {
            return { success: false, error: "Portfolio no encontrado" };
        }

        const studioSlug = portfolio.studio.slug;

        await prisma.studio_portfolios.delete({
            where: { id: portfolioId },
        });

        // Revalidar lista de portfolios (siempre)
        revalidatePath(`/${studioSlug}/studio/builder/content/portfolios`);
        
        // Revalidar página del editor (por si el usuario está en esa página)
        revalidatePath(`/${studioSlug}/studio/builder/content/portfolios/${portfolioId}/editar`);
        
        // Revalidar página pública solo si estaba publicado
        if (portfolio.is_published) {
            revalidatePath(`/${studioSlug}/portfolios/${portfolio.slug}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting portfolio:", error);
        return { success: false, error: "Error al eliminar portfolio" };
    }
}

// TOGGLE PUBLISH
export async function toggleStudioPortfolioPublish(portfolioId: string) {
    try {
        const portfolio = await prisma.studio_portfolios.findUnique({
            where: { id: portfolioId },
            select: {
                is_published: true,
                studio: { select: { slug: true } },
                slug: true,
            },
        });

        if (!portfolio) {
            return { success: false, error: "Portfolio no encontrado" };
        }

        const updatedPortfolio = await prisma.studio_portfolios.update({
            where: { id: portfolioId },
            data: {
                is_published: !portfolio.is_published,
                published_at: !portfolio.is_published ? new Date() : null,
            },
        });

        revalidatePath(`/${portfolio.studio.slug}/studio/builder/content/portfolios`);
        revalidatePath(`/${portfolio.studio.slug}/portfolios/${portfolio.slug}`);

        return { success: true, data: updatedPortfolio };
    } catch (error) {
        console.error("Error toggling publish:", error);
        return { success: false, error: "Error al cambiar estado" };
    }
}

// INCREMENT VIEW COUNT
export async function incrementPortfolioViewCount(portfolioId: string) {
    try {
        await prisma.studio_portfolios.update({
            where: { id: portfolioId },
            data: {
                view_count: {
                    increment: 1,
                },
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error incrementing view count:", error);
        return { success: false };
    }
}

