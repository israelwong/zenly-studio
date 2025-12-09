"use server";

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
    PublicPortfolio
} from "@/types/public-profile";
import { PublicProfileDataSchema } from "@/lib/actions/schemas/public-profile-schemas";
import { getCurrentUser } from "@/lib/auth/user-utils";

/**
 * Get complete public studio profile by slug
 * Fetches all data needed for public profile display
 */
export async function getStudioProfileBySlug(
    input: GetStudioProfileInputForm
): Promise<GetStudioProfileOutputForm> {
    try {
        // Validate input
        const validatedInput = GetStudioProfileInputSchema.parse(input);
        const { slug } = validatedInput;

        // Check if user is owner (to include archived posts)
        const currentUser = await getCurrentUser();
        const userId = currentUser?.id || null;

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
                google_maps_url: studio.maps_url,
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
                    type: block.type as 'image' | 'gallery' | 'video' | 'text' | 'grid' | 'slider' | 'hero-contact' | 'hero-image' | 'hero-video' | 'hero-text' | 'hero' | 'separator' | 'media-gallery',
                    title: block.title || undefined,
                    description: block.description || undefined,
                    presentation: block.presentation as 'block' | 'fullwidth',
                    config: block.config || undefined,
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

            // Obtener paquetes del estudio
            const paquetes = await prisma.studio_paquetes.findMany({
                where: {
                    studio_id: studio.id,
                    status: "active",
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
        console.error('❌ [getStudioProfileBySlug] Error:', error);

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
