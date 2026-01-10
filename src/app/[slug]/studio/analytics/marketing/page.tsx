import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getStudioProfileBySlug } from '@/lib/actions/public/profile.actions';
import { getConversionMetrics } from '@/lib/actions/studio/analytics/analytics-dashboard.actions';
import { ConversionMetrics, AnalyticsSkeleton } from '../components';
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

    // Obtener datos de conversión
    const conversionResult = await getConversionMetrics(studio.id);

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

    const conversionData = conversionResult.data;

    return (
        <div className="space-y-8">
            {/* Conversion Metrics */}
            <div>
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-1.5 rounded-lg bg-yellow-500/10">
                        <Target className="w-5 h-5 text-yellow-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                        Reportes de Conversión
                    </h2>
                </div>
                <ConversionMetrics data={conversionData} />
            </div>
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
