import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getStudioProfileBySlug } from '@/lib/actions/public/profile.actions';
import { getStudioAnalyticsSummary, getTopContent } from '@/lib/actions/studio/analytics/analytics-dashboard.actions';
import { AnalyticsOverviewCards, TopContentList, AnalyticsSkeleton, TrafficSourceStats } from '../components';
import { BarChart3, TrendingUp, Globe } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Analytics - Perfil de Negocio',
    description: 'Estadísticas del perfil público y contenido',
};

interface PerfilAnalyticsPageProps {
    params: Promise<{
        slug: string;
    }>;
}

async function PerfilAnalyticsContent({ studioSlug }: { studioSlug: string }) {
    // Obtener studio profile
    const result = await getStudioProfileBySlug({ slug: studioSlug });

    if (!result.success || !result.data) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar el studio</p>
                <p className="text-xs text-zinc-500 mt-2">
                    {result.success === false ? result.error : 'No data'}
                </p>
            </div>
        );
    }

    const studio = result.data.studio;

    // Obtener datos de analytics
    const [summaryResult, topContentResult] = await Promise.all([
        getStudioAnalyticsSummary(studio.id),
        getTopContent(studio.id, 10),
    ]);

    if (!summaryResult.success || !topContentResult.success) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar analytics</p>
            </div>
        );
    }

    // Validar que data existe
    if (!summaryResult.data || !topContentResult.data) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar datos de analytics</p>
            </div>
        );
    }

    const analyticsData = summaryResult.data;
    const topContentData = topContentResult.data;

    return (
        <div className="space-y-8">
            {/* Main Stats Grid */}
            <div>
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                        Resumen General
                    </h2>
                </div>
                <AnalyticsOverviewCards data={analyticsData} />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Content - Takes 2 columns */}
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            Contenido Más Popular
                        </h2>
                    </div>
                    <TopContentList
                        posts={topContentData.posts}
                        studioSlug={studioSlug}
                    />
                </div>

                {/* Traffic Sources - Takes 1 column */}
                {analyticsData.profile && (
                    analyticsData.profile.trafficSources ||
                    analyticsData.profile.topReferrers?.length ||
                    analyticsData.profile.topUtmSources?.length
                ) && (
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 rounded-lg bg-purple-500/10">
                                <Globe className="w-5 h-5 text-purple-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">
                                Origen del Tráfico
                            </h2>
                        </div>
                        <TrafficSourceStats
                            trafficSources={analyticsData.profile.trafficSources}
                            topReferrers={analyticsData.profile.topReferrers}
                            topUtmSources={analyticsData.profile.topUtmSources}
                            utmMediums={analyticsData.profile.utmMediums}
                            utmCampaigns={analyticsData.profile.utmCampaigns}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default async function PerfilAnalyticsPage({ params }: PerfilAnalyticsPageProps) {
    const { slug } = await params;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Content */}
            <Suspense fallback={<AnalyticsSkeleton />}>
                <PerfilAnalyticsContent studioSlug={slug} />
            </Suspense>
        </div>
    );
}
