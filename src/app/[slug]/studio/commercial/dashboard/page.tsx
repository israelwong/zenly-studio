import React, { Suspense } from 'react';
import { getStudioProfileBySlug } from '@/lib/actions/public/profile.actions';
import { getStudioAnalyticsSummary, getTopContent } from '@/lib/actions/studio/analytics/analytics-dashboard.actions';
import { AnalyticsOverviewCards, TopContentList, AnalyticsSkeleton } from './components';
import { LayoutDashboard, BarChart3, TrendingUp } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';

interface DashboardPageProps {
    params: Promise<{
        slug: string;
    }>;
}

async function DashboardContent({ studioSlug }: { studioSlug: string }) {
    // Obtener studio profile
    const studioProfile = await getStudioProfileBySlug({ slug: studioSlug });

    if (!studioProfile || !studioProfile.studio) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar el studio</p>
            </div>
        );
    }

    const studio = studioProfile.studio;

    // Obtener datos de analytics
    const [summaryResult, topContentResult] = await Promise.all([
        getStudioAnalyticsSummary(studio.id),
        getTopContent(studio.id, 10)
    ]);

    if (!summaryResult.success || !topContentResult.success) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar analytics</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Card */}
            <ZenCard className="p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-emerald-500/10">
                        <LayoutDashboard className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">
                            Bienvenido, {studio.studio_name}
                        </h2>
                        <p className="text-sm text-zinc-400">
                            Aquí está el resumen de tu perfil público y contenido
                        </p>
                    </div>
                </div>
            </ZenCard>

            {/* Analytics Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white">
                        Estadísticas de Contenido
                    </h3>
                </div>
                <AnalyticsOverviewCards data={summaryResult.data} />
            </div>

            {/* Top Content Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white">
                        Contenido Más Popular
                    </h3>
                </div>
                <TopContentList
                    posts={topContentResult.data.posts}
                    studioSlug={studioSlug}
                />
            </div>
        </div>
    );
}

export default async function DashboardPage({ params }: DashboardPageProps) {
    const { slug } = await params;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">
                    Dashboard
                </h1>
                <p className="text-sm text-zinc-400">
                    Vista general de tu estudio y contenido
                </p>
            </div>

            {/* Content */}
            <Suspense fallback={<AnalyticsSkeleton />}>
                <DashboardContent studioSlug={slug} />
            </Suspense>
        </div>
    );
}
