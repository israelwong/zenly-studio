'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, BarChart3, TrendingUp, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ZenButton } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar } from '@/components/ui/zen/base/ZenCalendar';
import { AnalyticsOverviewCards, TopContentList, TrafficSourceStats } from '../../components';
import { getStudioAnalyticsSummary, getTopContent } from '@/lib/actions/studio/analytics/analytics-dashboard.actions';
import type { DateRange } from 'react-day-picker';

interface PerfilAnalyticsClientProps {
    studioId: string;
    studioSlug: string;
    initialSummaryData: Awaited<ReturnType<typeof getStudioAnalyticsSummary>>['data'];
    initialTopContentData: Awaited<ReturnType<typeof getTopContent>>['data'];
}

export function PerfilAnalyticsClient({
    studioId,
    studioSlug,
    initialSummaryData,
    initialTopContentData,
}: PerfilAnalyticsClientProps) {
    const [mounted, setMounted] = useState(false);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        // Por defecto: mes actual
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return { from: start, to: end };
    });
    const [tempRange, setTempRange] = useState<DateRange | undefined>(undefined);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [summaryData, setSummaryData] = useState(initialSummaryData);
    const [topContentData, setTopContentData] = useState(initialTopContentData);

    // Evitar problemas de hidratación renderizando Popover solo en cliente
    useEffect(() => {
        setMounted(true);
    }, []);

    // Cargar datos cuando cambia el rango
    useEffect(() => {
        if (!dateRange?.from || !dateRange?.to) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const [summaryResult, topContentResult] = await Promise.all([
                    getStudioAnalyticsSummary(studioId, {
                        dateFrom: dateRange.from!,
                        dateTo: dateRange.to!,
                    }),
                    getTopContent(studioId, 5, {
                        dateFrom: dateRange.from!,
                        dateTo: dateRange.to!,
                    }),
                ]);

                if (summaryResult.success && summaryResult.data) {
                    setSummaryData(summaryResult.data);
                }
                if (topContentResult.success && topContentResult.data) {
                    setTopContentData(topContentResult.data);
                }
            } catch (error) {
                console.error('Error cargando analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [dateRange, studioId]);

    // Actualizar rango cuando cambia el mes seleccionado
    useEffect(() => {
        if (calendarOpen && currentMonth) {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
            setTempRange({ from: start, to: end });
        }
    }, [currentMonth, calendarOpen]);

    const handleApplyRange = () => {
        if (tempRange?.from && tempRange?.to) {
            setDateRange(tempRange);
            setCalendarOpen(false);
        }
    };

    const formatDateRange = () => {
        if (!dateRange?.from) return 'Seleccionar rango';
        if (!dateRange.to) {
            return format(dateRange.from, 'MMMM yyyy', { locale: es });
        }
        // Mostrar rango completo cuando hay from y to
        const fromFormatted = format(dateRange.from, 'd MMM', { locale: es });
        const toFormatted = format(dateRange.to, 'd MMM yyyy', { locale: es });
        return `${fromFormatted} - ${toFormatted}`;
    };

    // Validar que los datos sean válidos

    if (!summaryData || !topContentData) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">No hay datos disponibles</p>
            </div>
        );
    }

    // Validar estructura de datos
    if (!summaryData.profile || !topContentData.posts) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error en la estructura de datos</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header con título y filtro */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                        Resumen General de Interacciones
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    {mounted ? (
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <ZenButton variant="ghost" size="sm" className="gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {formatDateRange()}
                                </ZenButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
                                <div className="p-3">
                                    <ZenCalendar
                                        mode="range"
                                        defaultMonth={tempRange?.from || dateRange?.from}
                                        selected={tempRange}
                                        onSelect={setTempRange}
                                        onMonthChange={setCurrentMonth}
                                        numberOfMonths={2}
                                        locale={es}
                                    />
                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 mt-3">
                                        <ZenButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setTempRange(dateRange);
                                                setCalendarOpen(false);
                                            }}
                                        >
                                            Cancelar
                                        </ZenButton>
                                        <ZenButton
                                            variant="primary"
                                            size="sm"
                                            onClick={handleApplyRange}
                                            disabled={!tempRange?.from || !tempRange?.to}
                                        >
                                            Aplicar
                                        </ZenButton>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <ZenButton variant="ghost" size="sm" className="gap-2" disabled>
                            <Calendar className="h-4 w-4" />
                            {formatDateRange()}
                        </ZenButton>
                    )}
                </div>
            </div>

            {/* Main Stats Grid */}
            <div>
                <AnalyticsOverviewCards data={summaryData} />
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
                            Contenido Destacado
                        </h2>
                    </div>
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-zinc-400">Cargando...</p>
                        </div>
                    ) : (
                        <TopContentList
                            posts={topContentData.posts.map(post => ({
                                id: post.id,
                                slug: post.slug,
                                title: post.title ?? null,
                                caption: post.caption ?? null,
                                analyticsViews: post.analyticsViews,
                                analyticsClicks: post.analyticsClicks,
                                analyticsShares: post.analyticsShares,
                                coverImage: post.coverImage ?? undefined,
                            }))}
                            studioSlug={studioSlug}
                        />
                    )}
                </div>

                {/* Traffic Sources - Takes 1 column */}
                {summaryData.profile && (
                    (summaryData.profile.trafficSources ||
                        summaryData.profile.topReferrers?.length ||
                        summaryData.profile.topUtmSources?.length)
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
                                trafficSources={summaryData.profile.trafficSources}
                                topReferrers={summaryData.profile.topReferrers}
                                topUtmSources={summaryData.profile.topUtmSources}
                                utmMediums={summaryData.profile.utmMediums}
                                utmCampaigns={summaryData.profile.utmCampaigns}
                            />
                        </div>
                    )}
            </div>
        </div>
    );
}
