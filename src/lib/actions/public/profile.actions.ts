"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";
import {
    GetStudioProfileInputSchema,
    type GetStudioProfileInputForm,
    type GetStudioProfileOutputForm
} from "@/lib/actions/schemas/public-profile-schemas";
import {
    PublicStudioProfile,
    PublicSocialNetwork,
    PublicContactInfo,
} from "@/types/public-profile";
import { PublicProfileDataSchema } from "@/lib/actions/schemas/public-profile-schemas";
import { getCurrentUser } from "@/lib/auth/user-utils";
import type { PublicPost, PublicPortfolio } from "@/types/public-profile";

/**
 * ⚠️ STREAMING: Get basic studio profile data (instantáneo)
 * Solo identidad: logo, nombre, slogan, contact info básico, items, paquetes, faq
 */
export async function getStudioProfileBasicData(
    input: GetStudioProfileInputForm
): Promise<{
    success: boolean;
    data?: {
        studio: {
            id: string;
            owner_id: string | null;
            studio_name: string;
            presentation: string | null;
            keywords: string | null;
            logo_url: string | null;
            slogan: string | null;
            website: string | null;
            address: string | null;
            plan_id: string | null;
            plan: { name: string; slug: string } | null;
            zonas_trabajo: Array<{ id: string; nombre: string; orden: number }>;
            faq: Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }>;
        };
        socialNetworks: PublicSocialNetwork[];
        contactInfo: PublicContactInfo;
        items: Array<{ id: string; name: string; type: 'SERVICIO'; cost: number; order: number }>;
        paquetes: Array<{
            id: string;
            nombre: string;
            descripcion?: string;
            precio: number;
            tipo_evento?: string;
            tipo_evento_order?: number;
            cover_url?: string;
            is_featured?: boolean;
            status?: string;
            order: number;
        }>;
    };
    error?: string;
}> {
    try {
        const validatedInput = GetStudioProfileInputSchema.parse(input);
        const { slug } = validatedInput;

        let userId: string | null = null;
        try {
            const currentUser = await getCurrentUser();
            userId = currentUser?.id || null;
        } catch (userError) {
            // Silencioso
        }

        // ⚠️ CACHE: Cachear datos básicos con tag por studio
        const getCachedBasicData = unstable_cache(
            async () => {
                return await retryDatabaseOperation(async () => {
                    const studioCheck = await prisma.studios.findUnique({
                        where: { slug, is_active: true },
                        select: {
                            id: true,
                            user_profiles: {
                                where: { is_active: true },
                                select: { supabase_id: true },
                                take: 1
                            }
                        }
                    });

                    if (!studioCheck) {
                        return { success: false, error: 'Studio not found' };
                    }

                    const ownerId = studioCheck.user_profiles[0]?.supabase_id || null;
                    const isOwner = userId === ownerId;

                    // Query ligera: solo identidad básica
                    const studio = await prisma.studios.findUnique({
                        where: { slug, is_active: true },
                select: {
                    id: true,
                    studio_name: true,
                    presentation: true,
                    keywords: true,
                    logo_url: true,
                    slogan: true,
                    website: true,
                    address: true,
                    email: true,
                    maps_url: true,
                    plan_id: true,
                    user_profiles: {
                        where: { is_active: true },
                        select: { supabase_id: true },
                        take: 1
                    },
                    social_networks: {
                        where: { is_active: true },
                        include: {
                            platform: {
                                select: { id: true, name: true, icon: true }
                            }
                        },
                        orderBy: { order: 'asc' }
                    },
                    phones: {
                        where: { is_active: true },
                        select: {
                            id: true,
                            number: true,
                            type: true,
                            label: true,
                            is_active: true,
                        },
                        orderBy: { order: 'asc' }
                    },
                    business_hours: {
                        select: {
                            id: true,
                            day_of_week: true,
                            start_time: true,
                            end_time: true,
                            is_active: true,
                        },
                        orderBy: { order: 'asc' }
                    },
                    items: {
                        where: { status: 'active' },
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            cost: true,
                            order: true,
                            service_categories: {
                                select: { name: true }
                            }
                        },
                        take: 50,
                        orderBy: { order: 'asc' }
                    },
                    plan: {
                        select: { name: true, slug: true }
                    },
                    zonas_trabajo: {
                        select: { id: true, nombre: true, orden: true },
                        orderBy: { orden: 'asc' }
                    },
                    faq: {
                        where: isOwner ? {} : { is_active: true },
                        select: {
                            id: true,
                            pregunta: true,
                            respuesta: true,
                            orden: true,
                            is_active: true,
                        },
                        orderBy: { orden: 'asc' }
                    }
                }
            });

                    if (!studio) {
                        return { success: false, error: 'Studio not found' };
                    }

                    // Paquetes separados (ligero) — solo públicos
                    const paquetes = await prisma.studio_paquetes.findMany({
                        where: { studio_id: studio.id, status: "active", visibility: "public" },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    precio: true,
                    cover_url: true,
                    order: true,
                    is_featured: true,
                    status: true,
                    event_types: {
                        select: { name: true, order: true }
                    },
                },
                orderBy: [{ is_featured: "desc" }, { order: "asc" }],
            });

                    return {
                        success: true,
                        data: {
                            studio: {
                                id: studio.id,
                                owner_id: studio.user_profiles?.[0]?.supabase_id || null,
                                studio_name: studio.studio_name,
                                presentation: studio.presentation,
                                keywords: studio.keywords,
                                logo_url: studio.logo_url,
                                slogan: studio.slogan,
                                website: studio.website,
                                address: studio.address,
                                plan_id: studio.plan_id,
                                plan: studio.plan,
                                zonas_trabajo: studio.zonas_trabajo,
                                faq: studio.faq.map(faq => ({
                                    id: faq.id,
                                    pregunta: faq.pregunta,
                                    respuesta: faq.respuesta,
                                    orden: faq.orden,
                                    is_active: faq.is_active,
                                })),
                            },
                            socialNetworks: studio.social_networks.map(network => ({
                                id: network.id,
                                url: network.url,
                                platform: network.platform,
                                order: network.order,
                            })),
                            contactInfo: {
                                phones: studio.phones.map(phone => ({
                                    id: phone.id,
                                    number: phone.number,
                                    type: phone.type,
                                    label: phone.label,
                                    is_active: phone.is_active,
                                })),
                                address: studio.address,
                                website: studio.website,
                                email: studio.email,
                                maps_url: studio.maps_url,
                                horarios: studio.business_hours?.map(horario => ({
                                    id: horario.id,
                                    dia: horario.day_of_week,
                                    apertura: horario.start_time,
                                    cierre: horario.end_time,
                                    cerrado: !horario.is_active,
                                })) || [],
                            },
                            items: studio.items.map(item => ({
                                id: item.id,
                                name: item.name,
                                type: 'SERVICIO' as const,
                                cost: item.cost,
                                order: item.order
                            })),
                            paquetes: paquetes.map(paquete => ({
                                id: paquete.id,
                                nombre: paquete.name,
                                descripcion: paquete.description ? paquete.description : undefined,
                                precio: paquete.precio ?? 0,
                                tipo_evento: paquete.event_types?.name ? paquete.event_types.name : undefined,
                                tipo_evento_order: paquete.event_types?.order ?? undefined,
                                cover_url: paquete.cover_url ? paquete.cover_url : undefined,
                                is_featured: paquete.is_featured ?? false,
                                status: paquete.status,
                                order: paquete.order,
                            })),
                        }
                    };
                });
            },
            ['studio-profile-basic', slug, userId || 'anonymous'],
            {
                tags: [`studio-profile-basic-${slug}`],
                revalidate: 3600, // 1 hora para datos básicos
            }
        );

        return await getCachedBasicData();
    } catch (error) {
        console.error('[getStudioProfileBasicData] ❌ Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred'
        };
    }
}

/**
 * ⚠️ METADATA LIGERA: Solo 5 campos esenciales para SEO
 * Elimina la doble carga en generateMetadata
 * ⚠️ CACHE: Cacheado con tag para invalidación granular
 */
export async function getStudioProfileMetadata(
    slug: string
): Promise<{
    success: boolean;
    data?: {
        studio_name: string;
        slogan: string | null;
        presentation: string | null;
        logo_url: string | null;
        keywords: string | null;
    };
    error?: string;
}> {
    try {
        // ⚠️ CACHE: Cachear metadata con tag por studio
        const getCachedMetadata = unstable_cache(
            async () => {
                return await retryDatabaseOperation(async () => {
            const studio = await prisma.studios.findUnique({
                where: { slug, is_active: true },
                select: {
                    studio_name: true,
                    slogan: true,
                    presentation: true,
                    logo_url: true,
                    keywords: true,
                }
            });

            if (!studio) {
                return { success: false, error: 'Studio not found' };
            }

            return {
                success: true,
                data: {
                    studio_name: studio.studio_name,
                    slogan: studio.slogan,
                    presentation: studio.presentation,
                    logo_url: studio.logo_url,
                    keywords: studio.keywords,
                }
            };
                });
            },
            ['studio-profile-metadata', slug],
            {
                tags: [`studio-profile-metadata-${slug}`],
                revalidate: 3600, // 1 hora para metadata
            }
        );

        return await getCachedMetadata();
    } catch (error) {
        console.error('[getStudioProfileMetadata] ❌ Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred'
        };
    }
}

/**
 * Metadata de un portafolio para openGraph (previsualización en WhatsApp cuando se comparte link corto)
 */
export async function getPortfolioMetadataForOg(
    studioSlug: string,
    portfolioSlug: string
): Promise<{
    success: boolean;
    data?: { title: string; cover_image_url: string | null; studio_name: string };
    error?: string;
}> {
    try {
        const portfolio = await prisma.studio_portfolios.findFirst({
            where: {
                slug: portfolioSlug,
                is_published: true,
                studio: { slug: studioSlug, is_active: true },
            },
            select: {
                title: true,
                cover_image_url: true,
                studio: { select: { studio_name: true } },
            },
        });
        if (!portfolio) {
            return { success: false, error: 'Portafolio no encontrado' };
        }
        return {
            success: true,
            data: {
                title: portfolio.title,
                cover_image_url: portfolio.cover_image_url,
                studio_name: portfolio.studio.studio_name,
            },
        };
    } catch (error) {
        console.error('[getPortfolioMetadataForOg] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener metadata del portafolio',
        };
    }
}

/**
 * ⚠️ STREAMING: Get deferred posts (pesados)
 * Se carga en segundo plano mientras se muestra el header
 * ⚠️ CACHE: Cacheado con tag por studio para invalidación granular
 */
export async function getStudioProfileDeferredPosts(
    studioId: string,
    isOwner: boolean
): Promise<{
    success: boolean;
    data?: PublicPost[];
    error?: string;
}> {
    try {
        // ⚠️ CACHE: Cachear posts con tag por studio
        const getCachedPosts = unstable_cache(
            async () => {
                return await retryDatabaseOperation(async () => {
            const posts = await prisma.studio_posts.findMany({
                where: isOwner ? { studio_id: studioId } : { studio_id: studioId, is_published: true },
                select: {
                    id: true,
                    slug: true,
                    title: true,
                    caption: true,
                    tags: true,
                    is_featured: true,
                    is_published: true,
                    published_at: true,
                    created_at: true,
                    view_count: true,
                    media: {
                        select: {
                            id: true,
                            file_url: true,
                            file_type: true,
                            filename: true,
                            storage_path: true,
                            thumbnail_url: true,
                            display_order: true,
                        },
                        orderBy: { display_order: 'asc' }
                    }
                },
                orderBy: { created_at: 'desc' },
                take: 50
            });

            return {
                success: true,
                data: posts.map(post => ({
                    id: post.id,
                    slug: post.slug ?? '',
                    title: post.title,
                    caption: post.caption,
                    tags: post.tags || [],
                    media: post.media.map(media => ({
                        id: media.id,
                        file_url: media.file_url,
                        file_type: media.file_type as 'image' | 'video',
                        filename: media.filename,
                        storage_path: media.storage_path,
                        thumbnail_url: media.thumbnail_url || undefined,
                        display_order: media.display_order,
                    })),
                    is_published: post.is_published,
                    is_featured: post.is_featured,
                    published_at: post.published_at,
                    created_at: post.created_at,
                    view_count: post.view_count,
                }))
            };
                });
            },
            ['studio-profile-posts', studioId, String(isOwner)],
            {
                tags: [`studio-profile-posts-${studioId}`],
                revalidate: 300, // 5 minutos para posts (cambian más frecuentemente)
            }
        );

        return await getCachedPosts();
    } catch (error) {
        console.error('[getStudioProfileDeferredPosts] ❌ Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred'
        };
    }
}

/**
 * ⚠️ STREAMING: Get deferred portfolios (pesados, optimizado)
 * Rompe el JOIN de 4 niveles en queries planas paralelas
 * ⚠️ CACHE: Cacheado con tag por studio para invalidación granular
 */
export async function getStudioProfileDeferredPortfolios(
    studioId: string,
    isOwner: boolean
): Promise<{
    success: boolean;
    data?: PublicPortfolio[];
    error?: string;
}> {
    try {
        // ⚠️ CACHE: Cachear portfolios con tag por studio
        const getCachedPortfolios = unstable_cache(
            async () => {
                return await retryDatabaseOperation(async () => {
            // Query 1: Portfolios básicos (sin content_blocks)
            const portfolios = await prisma.studio_portfolios.findMany({
                where: isOwner ? { studio_id: studioId } : { studio_id: studioId, is_published: true },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    caption: true,
                    cover_image_url: true,
                    category: true,
                    order: true,
                    is_featured: true,
                    is_published: true,
                    published_at: true,
                    view_count: true,
                    cover_index: true,
                    tags: true,
                    event_type: {
                        select: { id: true, name: true }
                    },
                    items: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            image_url: true,
                            video_url: true,
                            item_type: true,
                            order: true,
                        },
                        orderBy: { order: 'asc' }
                    },
                    media: {
                        select: {
                            id: true,
                            file_url: true,
                            file_type: true,
                            filename: true,
                            thumbnail_url: true,
                            display_order: true,
                        },
                        orderBy: { display_order: 'asc' }
                    },
                },
                orderBy: { order: 'asc' }
            });

            // Query 2: Content blocks (paralela, sin JOIN profundo)
            const portfolioIds = portfolios.map(p => p.id);
            const contentBlocks = portfolioIds.length > 0
                ? await prisma.studio_portfolio_content_blocks.findMany({
                      where: { portfolio_id: { in: portfolioIds } },
                      select: {
                          id: true,
                          portfolio_id: true,
                          type: true,
                          title: true,
                          description: true,
                          presentation: true,
                          config: true,
                          order: true,
                      },
                      orderBy: { order: 'asc' }
                  })
                : [];

            // Query 3: Block media (paralela)
            const blockIds = contentBlocks.map(b => b.id);
            const blockMedia = blockIds.length > 0
                ? await prisma.studio_portfolio_content_block_media.findMany({
                      where: { content_block_id: { in: blockIds } },
                      select: {
                          id: true,
                          content_block_id: true,
                          order: true,
                          media_id: true,
                      },
                      orderBy: { order: 'asc' }
                  })
                : [];

            // Query 4: Media files (paralela)
            const mediaIds = blockMedia.map(bm => bm.media_id).filter((id): id is string => Boolean(id));
            const mediaFiles = mediaIds.length > 0
                ? await prisma.studio_portfolio_media.findMany({
                      where: { id: { in: mediaIds } },
                      select: {
                          id: true,
                          file_url: true,
                          file_type: true,
                          filename: true,
                          thumbnail_url: true,
                      }
                  })
                : [];

            // Mapear media por ID
            const mediaMap = new Map(mediaFiles.map(m => [m.id, m]));

            // Construir content_blocks con media
            const blocksByPortfolio = new Map<string, typeof contentBlocks>();
            contentBlocks.forEach(block => {
                if (!blocksByPortfolio.has(block.portfolio_id)) {
                    blocksByPortfolio.set(block.portfolio_id, []);
                }
                blocksByPortfolio.get(block.portfolio_id)!.push(block);
            });

            const blockMediaByBlock = new Map<string, typeof blockMedia>();
            blockMedia.forEach(bm => {
                if (!blockMediaByBlock.has(bm.content_block_id)) {
                    blockMediaByBlock.set(bm.content_block_id, []);
                }
                blockMediaByBlock.get(bm.content_block_id)!.push(bm);
            });

            // Mapear portfolios con content_blocks
            return {
                success: true,
                data: portfolios.map(portfolio => {
                    const portfolioBlocks = blocksByPortfolio.get(portfolio.id) || [];
                    const contentBlocksMapped = portfolioBlocks.map(block => {
                        const blockMediaList = blockMediaByBlock.get(block.id) || [];
                        return {
                            id: block.id,
                            type: block.type as 'image' | 'gallery' | 'video' | 'text' | 'grid' | 'slider' | 'hero-contact' | 'hero-image' | 'hero-video' | 'hero-text' | 'hero' | 'separator' | 'media-gallery' | 'hero-portfolio' | 'hero-offer',
                            title: block.title || undefined,
                            description: block.description || undefined,
                            presentation: block.presentation as 'block' | 'fullwidth',
                            config: (typeof block.config === 'object' && block.config !== null && !Array.isArray(block.config)) ? (block.config as Record<string, unknown>) : undefined,
                            order: block.order,
                            media: blockMediaList.map(bm => {
                                const media = mediaMap.get(bm.media_id);
                                return media ? {
                                    id: media.id,
                                    file_url: media.file_url,
                                    file_type: media.file_type as 'image' | 'video',
                                    filename: media.filename,
                                    storage_path: '',
                                    thumbnail_url: media.thumbnail_url || undefined,
                                    display_order: bm.order,
                                } : null;
                            }).filter((m): m is NonNullable<typeof m> => m !== null),
                        };
                    });

                    const portfolioItems = portfolio.items.length > 0
                        ? portfolio.items.map(item => ({
                              id: item.id,
                              title: item.title || 'Sin título',
                              description: item.description,
                              image_url: item.image_url,
                              video_url: item.video_url,
                              item_type: item.item_type as 'PHOTO' | 'VIDEO',
                              order: item.order,
                          }))
                        : [];

                    return {
                        id: portfolio.id,
                        title: portfolio.title,
                        slug: portfolio.slug,
                        description: portfolio.description,
                        caption: portfolio.caption,
                        cover_image_url: portfolio.cover_image_url,
                        category: portfolio.category,
                        order: portfolio.order,
                        is_featured: portfolio.is_featured,
                        is_published: portfolio.is_published,
                        published_at: portfolio.published_at,
                        view_count: portfolio.view_count,
                        cover_index: portfolio.cover_index,
                        tags: portfolio.tags || [],
                        items: portfolioItems,
                        media: portfolio.media.map(item => ({
                            id: item.id,
                            file_url: item.file_url,
                            file_type: item.file_type as 'image' | 'video',
                            filename: item.filename,
                            thumbnail_url: item.thumbnail_url || undefined,
                            display_order: item.display_order,
                        })),
                        content_blocks: contentBlocksMapped,
                        event_type: portfolio.event_type ? {
                            id: portfolio.event_type.id,
                            nombre: portfolio.event_type.name,
                        } : null,
                    };
                })
            };
                });
            },
            ['studio-profile-portfolios', studioId, String(isOwner)],
            {
                tags: [`studio-profile-portfolios-${studioId}`],
                revalidate: 300, // 5 minutos para portfolios (cambian más frecuentemente)
            }
        );

        return await getCachedPortfolios();
    } catch (error) {
        console.error('[getStudioProfileDeferredPortfolios] ❌ Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred'
        };
    }
}

/**
 * Get complete public studio profile by slug
 * Fetches all data needed for public profile display
 * @deprecated Use getStudioProfileBasicData + getStudioProfileDeferredPosts + getStudioProfileDeferredPortfolios instead
 */
export async function getStudioProfileBySlug(
    input: GetStudioProfileInputForm
): Promise<GetStudioProfileOutputForm> {
    try {
        // Validate input
        const validatedInput = GetStudioProfileInputSchema.parse(input);
        const { slug } = validatedInput;

        // Check if user is owner (to include archived posts)
        // Manejar error silenciosamente si no se puede obtener el usuario actual
        let userId: string | null = null;
        try {
            const currentUser = await getCurrentUser();
            userId = currentUser?.id || null;
        } catch (userError) {
            // Si falla obtener el usuario actual, continuar sin esa información
            // Esto puede pasar si las variables de entorno de Supabase no están disponibles
        }

        return await retryDatabaseOperation(async () => {
            // First, get studio to check ownership
            const studioCheck = await prisma.studios.findUnique({
                where: { slug, is_active: true },
                select: {
                    id: true,
                    // Buscar en user_profiles (relación con studio_user_profiles)
                    user_profiles: {
                        where: { is_active: true },
                        select: { supabase_id: true },
                        take: 1
                    }
                }
            });

            if (!studioCheck) {
                return {
                    success: false,
                    error: 'Studio not found'
                };
            }

            const ownerId = studioCheck.user_profiles[0]?.supabase_id || null;
            const isOwner = userId === ownerId;

            // Single query to get all profile data
            const studio = await prisma.studios.findUnique({
                where: {
                    slug,
                    is_active: true
                },
                select: {
                    id: true,
                    studio_name: true,
                    presentation: true,
                    keywords: true,
                    logo_url: true,
                    slogan: true,
                    website: true,
                    address: true,
                    email: true,
                    maps_url: true,
                    plan_id: true,
                    user_profiles: {
                        where: {
                            is_active: true
                        },
                        select: {
                            supabase_id: true
                        },
                        take: 1
                    },
                    social_networks: {
                        where: { is_active: true },
                        include: {
                            platform: {
                                select: {
                                    id: true,
                                    name: true,
                                    icon: true,
                                }
                            }
                        },
                        orderBy: { order: 'asc' }
                    },
                    phones: {
                        where: { is_active: true },
                        select: {
                            id: true,
                            number: true,
                            type: true,
                            label: true,
                            is_active: true,
                        },
                        orderBy: { order: 'asc' }
                    },
                    business_hours: {
                        select: {
                            id: true,
                            day_of_week: true,
                            start_time: true,
                            end_time: true,
                            is_active: true,
                        },
                        orderBy: { order: 'asc' }
                    },
                    items: {
                        where: { status: 'active' },
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            cost: true,
                            order: true,
                            service_categories: {
                                select: {
                                    name: true,
                                }
                            }
                        },
                        take: 50,
                        orderBy: { order: 'asc' }
                    },
                    portfolios: {
                        where: isOwner ? {} : { is_published: true },
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            description: true,
                            caption: true,
                            cover_image_url: true,
                            category: true,
                            order: true,
                            is_featured: true,
                            is_published: true,
                            published_at: true,
                            view_count: true,
                            cover_index: true,
                            tags: true,
                            event_type: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            },
                            items: {
                                select: {
                                    id: true,
                                    title: true,
                                    description: true,
                                    image_url: true,
                                    video_url: true,
                                    item_type: true,
                                    order: true,
                                },
                                orderBy: { order: 'asc' }
                            },
                            media: {
                                select: {
                                    id: true,
                                    file_url: true,
                                    file_type: true,
                                    filename: true,
                                    thumbnail_url: true,
                                    display_order: true,
                                },
                                orderBy: { display_order: 'asc' }
                            },
                            content_blocks: {
                                select: {
                                    id: true,
                                    type: true,
                                    title: true,
                                    description: true,
                                    presentation: true,
                                    config: true,
                                    order: true,
                                    block_media: {
                                        select: {
                                            id: true,
                                            order: true,
                                            media: {
                                                select: {
                                                    id: true,
                                                    file_url: true,
                                                    file_type: true,
                                                    filename: true,
                                                    thumbnail_url: true,
                                                }
                                            }
                                        },
                                        orderBy: { order: 'asc' }
                                    }
                                },
                                orderBy: { order: 'asc' }
                            }
                        },
                        orderBy: { order: 'asc' }
                    },
                    plan: {
                        select: {
                            name: true,
                            slug: true,
                        }
                    },
                    zonas_trabajo: {
                        select: {
                            id: true,
                            nombre: true,
                            orden: true,
                        },
                        orderBy: { orden: 'asc' }
                    },
                    posts: {
                        where: isOwner ? {} : { is_published: true },
                        select: {
                            id: true,
                            slug: true,
                            title: true,
                            caption: true,
                            tags: true,
                            is_featured: true,
                            is_published: true,
                            published_at: true,
                            created_at: true,
                            view_count: true,
                            media: {
                                select: {
                                    id: true,
                                    file_url: true,
                                    file_type: true,
                                    filename: true,
                                    storage_path: true,
                                    thumbnail_url: true,
                                    display_order: true,
                                },
                                orderBy: { display_order: 'asc' }
                            }
                        },
                        orderBy: { created_at: 'desc' },
                        take: 50
                    },
                    faq: {
                        where: isOwner ? {} : { is_active: true },
                        select: {
                            id: true,
                            pregunta: true,
                            respuesta: true,
                            orden: true,
                            is_active: true,
                        },
                        orderBy: { orden: 'asc' }
                    }
                }
            });

            if (!studio) {
                return {
                    success: false,
                    error: 'Studio not found'
                };
            }

            // Debug: Verificar zonas de trabajo en la query

            // Transform data to match our types
            const studioProfile: PublicStudioProfile = {
                id: studio.id,
                owner_id: studio.user_profiles?.[0]?.supabase_id || null,
                studio_name: studio.studio_name,
                presentation: studio.presentation,
                keywords: studio.keywords,
                logo_url: studio.logo_url,
                slogan: studio.slogan,
                website: studio.website,
                address: studio.address,
                plan_id: studio.plan_id,
                plan: studio.plan,
                zonas_trabajo: studio.zonas_trabajo,
                faq: studio.faq.map(faq => ({
                    id: faq.id,
                    pregunta: faq.pregunta,
                    respuesta: faq.respuesta,
                    orden: faq.orden,
                    is_active: faq.is_active,
                })),
            };

            const socialNetworks: PublicSocialNetwork[] = studio.social_networks.map(network => ({
                id: network.id,
                url: network.url,
                platform: network.platform,
                order: network.order,
            }));

            // Debug: Verificar business_hours

            const contactInfo: PublicContactInfo = {
                phones: studio.phones.map(phone => ({
                    id: phone.id,
                    number: phone.number,
                    type: phone.type,
                    label: phone.label,
                    is_active: phone.is_active,
                })),
                address: studio.address,
                website: studio.website,
                email: studio.email,
                maps_url: studio.maps_url,
                horarios: studio.business_hours?.map(horario => ({
                    id: horario.id,
                    dia: horario.day_of_week,
                    apertura: horario.start_time,
                    cierre: horario.end_time,
                    cerrado: !horario.is_active,
                })) || [],
            };

            // Debug: Verificar horarios mapeados

            const items = studio.items.map(item => ({
                id: item.id,
                name: item.name,
                description: null,
                price: item.cost,
                image_url: null,
                category: item.service_categories?.name || null,
                order: item.order,
            }));

            const portfolios: PublicPortfolio[] = studio.portfolios.map(portfolio => {
                // Mapear media para PortfolioDetailSection
                const portfolioMedia = portfolio.media.map(item => ({
                    id: item.id,
                    file_url: item.file_url,
                    file_type: item.file_type as 'image' | 'video',
                    filename: item.filename,
                    thumbnail_url: item.thumbnail_url || undefined,
                    display_order: item.display_order,
                }));

                // Mapear content_blocks
                const contentBlocks = portfolio.content_blocks.map(block => ({
                    id: block.id,
                    type: block.type as 'image' | 'gallery' | 'video' | 'text' | 'grid' | 'slider' | 'hero-contact' | 'hero-image' | 'hero-video' | 'hero-text' | 'hero' | 'separator' | 'media-gallery' | 'hero-portfolio' | 'hero-offer',
                    title: block.title || undefined,
                    description: block.description || undefined,
                    presentation: block.presentation as 'block' | 'fullwidth',
                    config: (typeof block.config === 'object' && block.config !== null && !Array.isArray(block.config)) ? (block.config as Record<string, unknown>) : undefined,
                    order: block.order,
                    media: block.block_media.map(bm => ({
                        id: bm.media.id,
                        file_url: bm.media.file_url,
                        file_type: bm.media.file_type as 'image' | 'video',
                        filename: bm.media.filename,
                        storage_path: '',
                        thumbnail_url: bm.media.thumbnail_url || undefined,
                        display_order: bm.order,
                    })),
                }));

                // Priorizar items (estructura nueva) sobre media (legacy) - para compatibilidad
                const portfolioItems = portfolio.items.length > 0
                    ? portfolio.items.map(item => ({
                        id: item.id,
                        title: item.title || 'Sin título',
                        description: item.description,
                        image_url: item.image_url,
                        video_url: item.video_url,
                        item_type: item.item_type as 'PHOTO' | 'VIDEO',
                        order: item.order,
                    }))
                    : [];

                return {
                    id: portfolio.id,
                    title: portfolio.title,
                    slug: portfolio.slug,
                    description: portfolio.description,
                    caption: portfolio.caption,
                    cover_image_url: portfolio.cover_image_url,
                    category: portfolio.category,
                    order: portfolio.order,
                    is_featured: portfolio.is_featured,
                    is_published: portfolio.is_published,
                    published_at: portfolio.published_at,
                    view_count: portfolio.view_count,
                    cover_index: portfolio.cover_index,
                    tags: portfolio.tags || [],
                    items: portfolioItems,
                    media: portfolioMedia,
                    content_blocks: contentBlocks,
                    event_type: portfolio.event_type ? {
                        id: portfolio.event_type.id,
                        nombre: portfolio.event_type.name,
                    } : null,
                };
            });

            // Obtener paquetes del estudio (solo públicos)
            const paquetes = await prisma.studio_paquetes.findMany({
                where: {
                    studio_id: studio.id,
                    status: "active",
                    visibility: "public",
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    precio: true,
                    cover_url: true,
                    order: true,
                    is_featured: true,
                    status: true,
                    event_types: {
                        select: {
                            name: true,
                            order: true,
                        },
                    },
                },
                orderBy: [{ is_featured: "desc" }, { order: "asc" }],
            });

            const publicPaquetes = paquetes.map(paquete => {
                // Preservar cover_url y descripcion tal cual vienen de la DB (null se convierte a undefined para Zod)
                return {
                    id: paquete.id,
                    nombre: paquete.name,
                    descripcion: paquete.description ? paquete.description : undefined,
                    precio: paquete.precio ?? 0,
                    tipo_evento: paquete.event_types?.name ? paquete.event_types.name : undefined,
                    tipo_evento_order: paquete.event_types?.order ?? undefined,
                    cover_url: paquete.cover_url ? paquete.cover_url : undefined,
                    is_featured: paquete.is_featured ?? false,
                    status: paquete.status,
                    order: paquete.order,
                };
            });

            // Mapear posts
            const posts = studio.posts.map(post => ({
                id: post.id,
                slug: post.slug,
                title: post.title,
                caption: post.caption,
                tags: post.tags || [],
                media: post.media.map(media => ({
                    id: media.id,
                    file_url: media.file_url,
                    file_type: media.file_type as 'image' | 'video',
                    filename: media.filename,
                    storage_path: media.storage_path,
                    thumbnail_url: media.thumbnail_url || undefined,
                    display_order: media.display_order,
                })),
                is_published: post.is_published,
                is_featured: post.is_featured,
                published_at: post.published_at,
                created_at: post.created_at,
                view_count: post.view_count,
            }));

            const profileDataRaw = {
                studio: studioProfile,
                socialNetworks,
                contactInfo,
                items,
                portfolios,
                paquetes: publicPaquetes,
                posts,
            };

            const profileData = PublicProfileDataSchema.parse(profileDataRaw);

            return {
                success: true,
                data: profileData,
            };
        });

    } catch (error) {
        console.error('[getStudioProfileBySlug] ❌ Error:', error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: 'An unexpected error occurred while fetching profile data',
        };
    }
}
