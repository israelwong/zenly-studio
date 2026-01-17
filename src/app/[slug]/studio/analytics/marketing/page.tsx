import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getStudioProfileBySlug } from '@/lib/actions/public/profile.actions';
import { getConversionMetrics } from '@/lib/actions/studio/analytics/analytics-dashboard.actions';
import { getPromiseStats } from '@/lib/actions/studio/analytics/promise-stats.actions';
import { AnalyticsSkeleton } from '../components';
import { ConversionMetricsClient } from './components/ConversionMetricsClient';
import { PromiseStatsClient } from './components/PromiseStatsClient';
import { Target } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Analytics - Conversiones',
    description: 'Métricas de conversión y campañas comerciales',
};

interface MarketingAnalyticsPageProps {
    params: Promise<{
        slug: string;
    }>;
}

async function MarketingAnalyticsContent({ studioSlug }: { studioSlug: string }) {
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

    // Obtener datos iniciales (mes actual)
    const [conversionResult, promiseStatsResult] = await Promise.all([
        getConversionMetrics(studio.id),
        getPromiseStats(studio.id),
    ]);

    if (!conversionResult.success) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar métricas de conversión</p>
            </div>
        );
    }

    if (!conversionResult.data) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">No hay datos de conversión disponibles</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Conversion Metrics */}
            <div>
                <ConversionMetricsClient 
                    studioId={studio.id} 
                    initialData={conversionResult.data} 
                />
            </div>

            {/* Promise Stats */}
            {promiseStatsResult.success && promiseStatsResult.data && (
                <div>
                    <PromiseStatsClient 
                        studioId={studio.id} 
                        initialData={promiseStatsResult.data} 
                    />
                </div>
            )}
        </div>
    );
}

export default async function MarketingAnalyticsPage({ params }: MarketingAnalyticsPageProps) {
    const { slug } = await params;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Content */}
            <Suspense fallback={<AnalyticsSkeleton />}>
                <MarketingAnalyticsContent studioSlug={slug} />
            </Suspense>
        </div>
    );
}
