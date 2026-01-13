"use server";

import { prisma } from "@/lib/prisma";
import { detectDeviceType, calculateUniqueVisits, calculateRecurrentVisits } from "@/lib/utils/analytics-helpers";
import { getStudioOwnerId, createOwnerExclusionFilter } from "@/lib/utils/analytics-filters";

/**
 * Obtener métricas de conversión de ofertas
 */
export async function getConversionMetrics(
    studioId: string,
    options?: {
        eventDateFrom?: Date;
        eventDateTo?: Date;
    }
) {
    try {
        // Límite de tiempo: últimos 90 días
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 90);

        // Fecha inicio del mes actual (por defecto)
        const startOfMonth = options?.eventDateFrom || (() => {
            const date = new Date();
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            return date;
        })();

        // Fecha fin (por defecto: fin del mes actual)
        const endOfMonth = options?.eventDateTo || (() => {
            const date = new Date();
            date.setMonth(date.getMonth() + 1);
            date.setDate(0);
            date.setHours(23, 59, 59, 999);
            return date;
        })();

        // Obtener owner_id y crear filtro de exclusión
        const ownerId = await getStudioOwnerId(studioId);
        const ownerExclusionFilter = await createOwnerExclusionFilter(studioId, ownerId);

        // Obtener todas las ofertas del studio
        const offers = await prisma.studio_offers.findMany({
            where: {
                studio_id: studioId,
                is_active: true,
            },
            select: {
                id: true,
            },
        });

        const offerIds = offers.map(o => o.id);

        // Obtener datos en paralelo
        const [
            landingVisits,
            leadformVisits,
            submissions,
            packagesByCategory,
            packageClicks,
            eventsThisMonth,
            pendingPromises,
        ] = await Promise.all([
            // Visitas landing
            offerIds.length > 0 ? prisma.studio_offer_visits.count({
                where: {
                    offer_id: { in: offerIds },
                    visit_type: 'landing',
                    created_at: { gte: dateLimit },
                },
            }) : Promise.resolve(0),

            // Visitas leadform
            offerIds.length > 0 ? prisma.studio_offer_visits.count({
                where: {
                    offer_id: { in: offerIds },
                    visit_type: 'leadform',
                    created_at: { gte: dateLimit },
                },
            }) : Promise.resolve(0),

            // Submissions
            offerIds.length > 0 ? prisma.studio_offer_submissions.findMany({
                where: {
                    offer_id: { in: offerIds },
                    created_at: { gte: dateLimit },
                },
                select: {
                    id: true,
                    offer_id: true,
                    conversion_value: true,
                },
            }) : Promise.resolve([]),

            // Paquetes por categoría (event_type)
            prisma.studio_paquetes.groupBy({
                by: ['event_type_id'],
                where: {
                    studio_id: studioId,
                    status: 'active',
                },
                _count: {
                    id: true,
                },
            }),

            // Clicks en paquetes (últimos 90 días)
            // Nota: Los clicks se guardan con content_type: 'PROMISE' y paqueteId en metadata
            prisma.studio_content_analytics.findMany({
                where: {
                    studio_id: studioId,
                    content_type: 'PROMISE',
                    event_type: 'PAQUETE_CLICK',
                    created_at: { gte: dateLimit },
                    ...ownerExclusionFilter,
                },
                select: {
                    metadata: true,
                },
                take: 10000, // Limitar para performance
            }),

            // Eventos convertidos (filtro solo por fecha, sin estado)
            // Eventos son los que se convirtieron desde promesas con cotización autorizada/aprobada
            // Filtramos por created_at (cuando se creó el evento desde la promesa)
            prisma.studio_events.count({
                where: {
                    studio_id: studioId,
                    cotizacion_id: { not: null },
                    cotizacion: {
                        status: {
                            in: ['aprobada', 'autorizada', 'approved'],
                        },
                    },
                    created_at: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            }),

            // Promesas pendientes
            prisma.studio_promises.count({
                where: {
                    studio_id: studioId,
                    status: 'pending',
                    is_test: false,
                },
            }),
        ]);

        // Calcular métricas de ofertas
        const totalSubmissions = submissions.length;
        const totalConversionValue = submissions.reduce((sum, s) => {
            return sum + (s.conversion_value ? Number(s.conversion_value) : 0);
        }, 0);

        const conversionRate = leadformVisits > 0 
            ? (totalSubmissions / leadformVisits) * 100 
            : 0;

        const clickThroughRate = landingVisits > 0
            ? (leadformVisits / landingVisits) * 100
            : 0;

        // Obtener nombres de categorías de eventos
        const eventTypeIds = packagesByCategory.map(p => p.event_type_id);
        const eventTypes = await prisma.studio_event_types.findMany({
            where: {
                id: { in: eventTypeIds },
            },
            select: {
                id: true,
                name: true,
            },
        });

        const eventTypesMap = new Map(eventTypes.map(et => [et.id, et.name]));

        // Paquetes por categoría con nombres
        const packagesByCategoryData = packagesByCategory.map(p => ({
            categoryId: p.event_type_id,
            categoryName: eventTypesMap.get(p.event_type_id) || 'Sin categoría',
            count: p._count.id,
        }));

        // Agrupar clicks por paquete_id desde metadata
        const clicksByPaquete = packageClicks.reduce((acc, click) => {
            const metadata = click.metadata as Record<string, unknown>;
            const paqueteId = metadata?.paquete_id as string;
            if (!paqueteId) return acc;

            if (!acc[paqueteId]) {
                acc[paqueteId] = 0;
            }
            acc[paqueteId]++;
            return acc;
        }, {} as Record<string, number>);

        // Ordenar por clicks y obtener top 10
        const topPaqueteIds = Object.entries(clicksByPaquete)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([id]) => id);

        // Obtener detalles de paquetes más vistos
        const topPackages = topPaqueteIds.length > 0 ? await prisma.studio_paquetes.findMany({
            where: {
                id: { in: topPaqueteIds },
            },
            select: {
                id: true,
                name: true,
                cover_url: true,
                event_types: {
                    select: {
                        name: true,
                    },
                },
            },
        }) : [];

        const topPackagesWithClicks = topPackages.map(pkg => {
            const clicks = clicksByPaquete[pkg.id] || 0;
            return {
                id: pkg.id,
                name: pkg.name,
                coverUrl: pkg.cover_url,
                categoryName: pkg.event_types?.name || 'Sin categoría',
                clicks,
            };
        }).sort((a, b) => b.clicks - a.clicks);

        return {
            success: true,
            data: {
                totalSubmissions,
                totalLandingVisits: landingVisits,
                totalLeadformVisits: leadformVisits,
                conversionRate,
                clickThroughRate,
                totalConversionValue,
                packagesByCategory: packagesByCategoryData,
                topPackages: topPackagesWithClicks,
                eventsConvertedThisMonth: eventsThisMonth,
                pendingPromises,
            },
        };
    } catch (error) {
        console.error('[getConversionMetrics] Error:', error);
        return {
            success: false,
            error: 'Error al obtener métricas de conversión',
        };
    }
}

/**
 * Obtener resumen de analytics del studio
 */
export async function getStudioAnalyticsSummary(
    studioId: string,
    options?: {
        dateFrom?: Date;
        dateTo?: Date;
    }
) {
    try {
        // Obtener owner_id y crear filtro de exclusión
        const ownerId = await getStudioOwnerId(studioId);
        const ownerExclusionFilter = await createOwnerExclusionFilter(studioId, ownerId);
        
        console.log(`[getStudioAnalyticsSummary] Iniciando para studioId: ${studioId}`);

        // Límite de tiempo: usar rango proporcionado o últimos 90 días por defecto
        const dateLimit = options?.dateFrom || (() => {
            const limit = new Date();
            limit.setDate(limit.getDate() - 90);
            return limit;
        })();
        
        const dateTo = options?.dateTo || new Date();

        // Construir filtro de fecha
        const dateFilter: { gte: Date; lte?: Date } = { gte: dateLimit };
        if (dateTo) {
            dateFilter.lte = dateTo;
        }

        console.log(`[getStudioAnalyticsSummary] 📅 Filtros de fecha:`, {
            dateFrom: dateLimit.toISOString(),
            dateTo: dateTo.toISOString(),
            ownerId: ownerId || 'null',
            hasOwnerExclusion: Object.keys(ownerExclusionFilter).length > 0,
        });

        // Paralelizar queries independientes
        console.log(`[getStudioAnalyticsSummary] 🔍 Ejecutando queries...`);
        const [postsStats, portfoliosStats, offersStats, profileViewsFull, postClicksData] = await Promise.all([
            // Stats de posts (excluyendo owner)
            prisma.studio_content_analytics.groupBy({
                by: ['event_type'],
                where: {
                    studio_id: studioId,
                    content_type: 'POST',
                    created_at: dateFilter,
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            }),

            // Stats de portfolios (excluyendo owner)
            prisma.studio_content_analytics.groupBy({
                by: ['event_type'],
                where: {
                    studio_id: studioId,
                    content_type: 'PORTFOLIO',
                    created_at: dateFilter,
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            }),

            // Stats de ofertas (excluyendo owner)
            prisma.studio_content_analytics.groupBy({
                by: ['event_type'],
                where: {
                    studio_id: studioId,
                    content_type: 'OFFER',
                    created_at: dateFilter,
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            }),

            // Stats de perfil público (usando PACKAGE como contentType con metadata.profile_view)
            // Obtener datos completos de visitas al perfil para calcular métricas avanzadas (excluyendo owner)
            prisma.studio_content_analytics.findMany({
                where: {
                    studio_id: studioId,
                    content_type: 'PACKAGE',
                    content_id: studioId, // El content_id es el mismo studio_id para perfiles
                    event_type: 'PAGE_VIEW',
                    created_at: dateFilter,
                    ...ownerExclusionFilter,
                },
                select: {
                    id: true,
                    ip_address: true,
                    session_id: true,
                    user_agent: true,
                    referrer: true,
                    utm_source: true,
                    utm_medium: true,
                    utm_campaign: true,
                    metadata: true,
                },
                orderBy: {
                    created_at: 'desc'
                },
                // Limitar a 10,000 registros máximo para evitar timeouts
                take: 10000
            }),

            // Obtener datos completos de posts para calcular clicks totales (MODAL_OPEN + MEDIA_CLICK) (excluyendo owner)
            prisma.studio_content_analytics.findMany({
                where: {
                    studio_id: studioId,
                    content_type: 'POST',
                    event_type: { in: ['MODAL_OPEN', 'MEDIA_CLICK'] },
                    created_at: dateFilter,
                    ...ownerExclusionFilter,
                },
                select: {
                    event_type: true,
                }
            })
        ]);

        console.log(`[getStudioAnalyticsSummary] 📊 Resultados de queries:`, {
            postsStatsCount: postsStats.length,
            portfoliosStatsCount: portfoliosStats.length,
            offersStatsCount: offersStats.length,
            profileViewsFullCount: profileViewsFull.length,
            postClicksDataCount: postClicksData.length,
        });

        // Filtrar en memoria los que tienen profile_view: true en metadata
        const profileViewsFiltered = profileViewsFull.filter(item => {
            try {
                const metadata = item.metadata as Record<string, unknown> | null;
                return metadata && metadata.profile_view === true;
            } catch {
                return false;
            }
        });

        console.log(`[getStudioAnalyticsSummary] 🔍 Profile views filtrados:`, {
            totalViews: profileViewsFull.length,
            filteredViews: profileViewsFiltered.length,
            sampleMetadata: profileViewsFull[0]?.metadata || 'none',
        });

        // Calcular métricas de perfil (manejar arrays vacíos)
        const profileUniqueVisits = profileViewsFiltered.length > 0 
            ? calculateUniqueVisits(profileViewsFiltered)
            : { unique: 0, total: 0 };
        const profileRecurrentVisits = profileViewsFiltered.length > 0
            ? calculateRecurrentVisits(profileViewsFiltered)
            : { unique: 0, recurrent: 0, total: 0 };
        
        // Calcular device types
        const profileDeviceTypes = profileViewsFiltered.reduce((acc, item) => {
            try {
                const deviceType = detectDeviceType(item.user_agent);
                acc[deviceType] = (acc[deviceType] || 0) + 1;
            } catch {
                // Si hay error detectando device, usar 'unknown'
                acc.unknown = (acc.unknown || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        // Calcular métricas de origen del tráfico
        const trafficSourceStats = profileViewsFiltered.reduce((acc, item) => {
            const metadata = item.metadata as Record<string, unknown> | null;
            const trafficSource = metadata?.traffic_source as string || 'unknown';
            acc[trafficSource] = (acc[trafficSource] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calcular top referrers (dominios)
        const referrerStats = profileViewsFiltered
            .filter(item => item.referrer && typeof item.referrer === 'string')
            .reduce((acc, item) => {
                try {
                    const url = new URL(item.referrer!);
                    const domain = url.hostname.replace('www.', '');
                    acc[domain] = (acc[domain] || 0) + 1;
                } catch {
                    // Si no es URL válida, usar referrer tal cual (limitado a 100 caracteres)
                    const referrer = String(item.referrer).substring(0, 100);
                    acc[referrer] = (acc[referrer] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

        // Top referrers ordenados
        const topReferrers = Object.entries(referrerStats)
            .map(([domain, count]) => ({ domain, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calcular métricas UTM (con validación de tipos)
        const utmSourceStats = profileViewsFiltered
            .filter(item => item.utm_source && typeof item.utm_source === 'string')
            .reduce((acc, item) => {
                const source = String(item.utm_source).substring(0, 100);
                acc[source] = (acc[source] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const utmMediumStats = profileViewsFiltered
            .filter(item => item.utm_medium && typeof item.utm_medium === 'string')
            .reduce((acc, item) => {
                const medium = String(item.utm_medium).substring(0, 100);
                acc[medium] = (acc[medium] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const utmCampaignStats = profileViewsFiltered
            .filter(item => item.utm_campaign && typeof item.utm_campaign === 'string')
            .reduce((acc, item) => {
                const campaign = String(item.utm_campaign).substring(0, 100);
                acc[campaign] = (acc[campaign] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        // Top UTM sources
        const topUtmSources = Object.entries(utmSourceStats)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calcular totales
        const postViews = postsStats.find(s => s.event_type === 'FEED_VIEW')?._count.id || 0;
        const postModalOpens = postClicksData.filter(e => e.event_type === 'MODAL_OPEN').length;
        const postMediaClicks = postClicksData.filter(e => e.event_type === 'MEDIA_CLICK').length;
        const postTotalClicks = postModalOpens + postMediaClicks;
        const postLinkCopies = postsStats.find(s => s.event_type === 'LINK_COPY')?._count.id || 0;

        const portfolioViews = portfoliosStats.find(s => s.event_type === 'FEED_VIEW')?._count.id || 0;

        const offerViews = offersStats.find(s => s.event_type === 'SIDEBAR_VIEW')?._count.id || 0;
        const offerClicks = offersStats.find(s => s.event_type === 'OFFER_CLICK')?._count.id || 0;

        console.log(`[getStudioAnalyticsSummary] 📈 Métricas calculadas:`, {
            profileViews: profileViewsFiltered.length,
            profileUnique: profileUniqueVisits.unique,
            profileRecurrent: profileRecurrentVisits.recurrent,
            postViews,
            postTotalClicks,
            portfolioViews,
            offerViews,
            offerClicks,
        });

        console.log(`[getStudioAnalyticsSummary] ✅ Completado exitosamente para studioId: ${studioId}`);

        // Asegurar que todos los valores sean números válidos (no NaN, no Infinity)
        const safeNumber = (value: number | undefined | null): number => {
            if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
                return 0;
            }
            return value;
        };

        return {
            success: true,
            data: {
                profile: {
                    totalViews: safeNumber(profileViewsFiltered.length),
                    uniqueVisits: safeNumber(profileUniqueVisits.unique),
                    recurrentVisits: safeNumber(profileRecurrentVisits.recurrent),
                    mobileViews: safeNumber(profileDeviceTypes.mobile),
                    desktopViews: safeNumber(profileDeviceTypes.desktop),
                    trafficSources: {
                        profile: safeNumber(trafficSourceStats.profile),
                        external: safeNumber(trafficSourceStats.external),
                        unknown: safeNumber(trafficSourceStats.unknown),
                    },
                    topReferrers: Array.isArray(topReferrers) ? topReferrers : [],
                    topUtmSources: Array.isArray(topUtmSources) ? topUtmSources : [],
                    utmMediums: utmMediumStats && typeof utmMediumStats === 'object' ? utmMediumStats : {},
                    utmCampaigns: utmCampaignStats && typeof utmCampaignStats === 'object' ? utmCampaignStats : {},
                },
                posts: {
                    totalViews: safeNumber(postViews),
                    totalClicks: safeNumber(postTotalClicks),
                    modalOpens: safeNumber(postModalOpens),
                    mediaClicks: safeNumber(postMediaClicks),
                    totalShares: safeNumber(postLinkCopies),
                },
                portfolios: {
                    totalViews: safeNumber(portfolioViews),
                },
                offers: {
                    totalViews: safeNumber(offerViews),
                    totalClicks: safeNumber(offerClicks),
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
export async function getTopContent(
    studioId: string,
    limit = 10,
    options?: {
        dateFrom?: Date;
        dateTo?: Date;
    }
) {
    try {
        console.log(`[getTopContent] 🚀 Iniciando para studioId: ${studioId}, limit: ${limit}`);
        // Construir filtro de fecha
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (options?.dateFrom) {
            dateFilter.gte = options.dateFrom;
        } else {
            // Por defecto: últimos 90 días
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - 90);
            dateFilter.gte = dateLimit;
        }
        if (options?.dateTo) {
            dateFilter.lte = options.dateTo;
        }
        // Obtener owner_id y crear filtro de exclusión
        const ownerId = await getStudioOwnerId(studioId);
        const ownerExclusionFilter = await createOwnerExclusionFilter(studioId, ownerId);
        
        console.log(`[getTopContent] 📅 Filtros:`, {
            dateFrom: dateFilter.gte?.toISOString() || 'none',
            dateTo: dateFilter.lte?.toISOString() || 'none',
            ownerId: ownerId || 'null',
            hasOwnerExclusion: Object.keys(ownerExclusionFilter).length > 0,
        });

        // Top posts por vistas (excluyendo owner)
        console.log(`[getTopContent] 🔍 Buscando top posts...`);
        const topPosts = await prisma.studio_content_analytics.groupBy({
            by: ['content_id'],
            where: {
                studio_id: studioId,
                content_type: 'POST',
                event_type: 'FEED_VIEW',
                created_at: dateFilter,
                ...ownerExclusionFilter,
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
        
        console.log(`[getTopContent] 📊 Top posts encontrados:`, {
            count: topPosts.length,
            topPostIds: topPosts.slice(0, 3).map(p => ({ id: p.content_id, views: p._count.id })),
        });

        // Obtener detalles de posts
        const postIds = topPosts.map(p => p.content_id);
        
        // Si no hay posts, retornar array vacío
        if (postIds.length === 0) {
            return {
                success: true,
                data: {
                    posts: []
                }
            };
        }

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

        // Obtener clics (MODAL_OPEN + MEDIA_CLICK) y shares (LINK_COPY) por post
        const [clicksData, sharesData] = await Promise.all([
            prisma.studio_content_analytics.groupBy({
                by: ['content_id'],
                where: {
                    studio_id: studioId,
                    content_type: 'POST',
                    event_type: { in: ['MODAL_OPEN', 'MEDIA_CLICK'] },
                    content_id: { in: postIds },
                    created_at: dateFilter,
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            }),
            prisma.studio_content_analytics.groupBy({
                by: ['content_id'],
                where: {
                    studio_id: studioId,
                    content_type: 'POST',
                    event_type: 'LINK_COPY',
                    content_id: { in: postIds },
                    created_at: dateFilter,
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            })
        ]);

        // Mapear con conteo de vistas, clics y shares (asegurar serialización y tipos correctos)
        const postsWithViews = posts.map(post => {
            const viewCount = topPosts.find(tp => tp.content_id === post.id)?._count.id || 0;
            const clicksCount = clicksData.find(c => c.content_id === post.id)?._count.id || 0;
            const sharesCount = sharesData.find(s => s.content_id === post.id)?._count.id || 0;
            
            // coverImage debe ser string | undefined (no null)
            const coverImage = post.media[0]?.thumbnail_url || post.media[0]?.file_url;
            
            return {
                id: post.id,
                slug: post.slug || '',
                title: post.title || null, // string | null
                caption: post.caption || null,
                analyticsViews: typeof viewCount === 'number' ? viewCount : 0,
                analyticsClicks: clicksCount > 0 ? clicksCount : undefined, // opcional
                analyticsShares: sharesCount > 0 ? sharesCount : undefined, // opcional
                coverImage: typeof coverImage === 'string' ? coverImage : undefined, // string | undefined
            };
        }).sort((a, b) => b.analyticsViews - a.analyticsViews);

        console.log(`[getTopContent] ✅ Completado exitosamente:`, {
            studioId,
            postsFound: postsWithViews.length,
            postsWithViews: postsWithViews.slice(0, 3).map(p => ({
                id: p.id,
                title: p.title,
                views: p.analyticsViews,
            })),
        });

        return {
            success: true,
            data: {
                posts: postsWithViews
            }
        };
    } catch (error) {
        console.error('[getTopContent] Error para studioId:', studioId, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error al obtener contenido top'
        };
    }
}

/**
 * Obtener estadísticas de últimos 30 días
 */
export async function getAnalyticsTrends(studioId: string, days = 30) {
    try {
        // Obtener owner_id y crear filtro de exclusión
        const ownerId = await getStudioOwnerId(studioId);
        const ownerExclusionFilter = await createOwnerExclusionFilter(studioId, ownerId);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const trends = await prisma.studio_content_analytics.groupBy({
            by: ['content_type', 'event_type'],
            where: {
                studio_id: studioId,
                created_at: {
                    gte: startDate
                },
                ...ownerExclusionFilter,
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
