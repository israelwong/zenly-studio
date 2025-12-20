"use server";

import { prisma } from "@/lib/prisma";

/**
 * Obtener resumen de analytics del studio
 */
export async function getStudioAnalyticsSummary(studioId: string) {
    try {
        // Stats de posts
        const postsStats = await prisma.studio_content_analytics.groupBy({
            by: ['event_type'],
            where: {
                studio_id: studioId,
                content_type: 'POST',
            },
            _count: {
                id: true
            }
        });

        // Stats de portfolios
        const portfoliosStats = await prisma.studio_content_analytics.groupBy({
            by: ['event_type'],
            where: {
                studio_id: studioId,
                content_type: 'PORTFOLIO',
            },
            _count: {
                id: true
            }
        });

        // Stats de ofertas
        const offersStats = await prisma.studio_content_analytics.groupBy({
            by: ['event_type'],
            where: {
                studio_id: studioId,
                content_type: 'OFFER',
            },
            _count: {
                id: true
            }
        });

        // Calcular totales
        const postViews = postsStats.find(s => s.event_type === 'FEED_VIEW')?._count.id || 0;
        const postModalOpens = postsStats.find(s => s.event_type === 'MODAL_OPEN')?._count.id || 0;
        const postLinkCopies = postsStats.find(s => s.event_type === 'LINK_COPY')?._count.id || 0;

        const portfolioViews = portfoliosStats.find(s => s.event_type === 'PAGE_VIEW')?._count.id || 0;

        const offerViews = offersStats.find(s => s.event_type === 'SIDEBAR_VIEW')?._count.id || 0;
        const offerClicks = offersStats.find(s => s.event_type === 'OFFER_CLICK')?._count.id || 0;

        return {
            success: true,
            data: {
                posts: {
                    totalViews: postViews,
                    totalClicks: postModalOpens,
                    totalShares: postLinkCopies,
                },
                portfolios: {
                    totalViews: portfolioViews,
                },
                offers: {
                    totalViews: offerViews,
                    totalClicks: offerClicks,
                }
            }
        };
    } catch (error) {
        console.error('[getStudioAnalyticsSummary] Error:', error);
        return {
            success: false,
            error: 'Error al obtener resumen de analytics'
        };
    }
}

/**
 * Obtener contenido más visto (posts y portfolios)
 */
export async function getTopContent(studioId: string, limit = 10) {
    try {
        // Top posts por vistas
        const topPosts = await prisma.studio_content_analytics.groupBy({
            by: ['content_id'],
            where: {
                studio_id: studioId,
                content_type: 'POST',
                event_type: 'FEED_VIEW'
            },
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: limit
        });

        // Obtener detalles de posts
        const postIds = topPosts.map(p => p.content_id);
        const posts = await prisma.studio_posts.findMany({
            where: {
                id: { in: postIds }
            },
            select: {
                id: true,
                slug: true,
                title: true,
                caption: true,
                view_count: true,
                media: {
                    select: {
                        file_url: true,
                        thumbnail_url: true
                    },
                    take: 1,
                    orderBy: {
                        display_order: 'asc'
                    }
                }
            }
        });

        // Mapear con conteo de vistas
        const postsWithViews = posts.map(post => {
            const viewCount = topPosts.find(tp => tp.content_id === post.id)?._count.id || 0;
            return {
                ...post,
                analyticsViews: viewCount,
                coverImage: post.media[0]?.thumbnail_url || post.media[0]?.file_url
            };
        }).sort((a, b) => b.analyticsViews - a.analyticsViews);

        return {
            success: true,
            data: {
                posts: postsWithViews
            }
        };
    } catch (error) {
        console.error('[getTopContent] Error:', error);
        return {
            success: false,
            error: 'Error al obtener contenido top'
        };
    }
}

/**
 * Obtener estadísticas de últimos 30 días
 */
export async function getAnalyticsTrends(studioId: string, days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const trends = await prisma.studio_content_analytics.groupBy({
            by: ['content_type', 'event_type'],
            where: {
                studio_id: studioId,
                created_at: {
                    gte: startDate
                }
            },
            _count: {
                id: true
            }
        });

        // Agrupar por tipo de contenido
        const posts = trends
            .filter(t => t.content_type === 'POST')
            .reduce((acc, curr) => {
                acc[curr.event_type] = curr._count.id;
                return acc;
            }, {} as Record<string, number>);

        const portfolios = trends
            .filter(t => t.content_type === 'PORTFOLIO')
            .reduce((acc, curr) => {
                acc[curr.event_type] = curr._count.id;
                return acc;
            }, {} as Record<string, number>);

        const offers = trends
            .filter(t => t.content_type === 'OFFER')
            .reduce((acc, curr) => {
                acc[curr.event_type] = curr._count.id;
                return acc;
            }, {} as Record<string, number>);

        return {
            success: true,
            data: {
                period: `${days} días`,
                posts,
                portfolios,
                offers
            }
        };
    } catch (error) {
        console.error('[getAnalyticsTrends] Error:', error);
        return {
            success: false,
            error: 'Error al obtener tendencias'
        };
    }
}
