'use client';

import React from 'react';
import { ExternalLink, Globe, Tag, TrendingUp } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';

interface TrafficSourceStatsProps {
    trafficSources?: {
        profile: number;
        external: number;
        unknown: number;
    };
    topReferrers?: Array<{ domain: string; count: number }>;
    topUtmSources?: Array<{ source: string; count: number }>;
    utmMediums?: Record<string, number>;
    utmCampaigns?: Record<string, number>;
}

export function TrafficSourceStats({
    trafficSources,
    topReferrers = [],
    topUtmSources = [],
    utmMediums = {},
    utmCampaigns = {}
}: TrafficSourceStatsProps) {
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const totalTraffic = (trafficSources?.profile || 0) + (trafficSources?.external || 0) + (trafficSources?.unknown || 0);

    return (
        <div className="space-y-4">
            {/* Origen del Tráfico */}
            {trafficSources && totalTraffic > 0 && (
                <ZenCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Origen del Tráfico</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <p className="text-xs font-medium text-zinc-400">Navegación Interna</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">Desde otra página del sitio</p>
                                </div>
                                <span className="text-xs text-emerald-400 font-semibold">
                                    {totalTraffic > 0 ? `${Math.round((trafficSources.profile / totalTraffic) * 100)}%` : '0%'}
                                </span>
                            </div>
                            <p className="text-xl font-bold text-emerald-400">
                                {formatNumber(trafficSources.profile)}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <p className="text-xs font-medium text-zinc-400">Tráfico Externo</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">Desde otro sitio web</p>
                                </div>
                                <span className="text-xs text-blue-400 font-semibold">
                                    {totalTraffic > 0 ? `${Math.round((trafficSources.external / totalTraffic) * 100)}%` : '0%'}
                                </span>
                            </div>
                            <p className="text-xl font-bold text-blue-400">
                                {formatNumber(trafficSources.external)}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <p className="text-xs font-medium text-zinc-400">Tráfico Directo</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">URL escrita directamente</p>
                                </div>
                                <span className="text-xs text-purple-400 font-semibold">
                                    {totalTraffic > 0 ? `${Math.round((trafficSources.unknown / totalTraffic) * 100)}%` : '0%'}
                                </span>
                            </div>
                            <p className="text-xl font-bold text-purple-400">
                                {formatNumber(trafficSources.unknown)}
                            </p>
                        </div>
                    </div>
                </ZenCard>
            )}

            {/* Top Referrers */}
            {topReferrers.length > 0 && (
                <ZenCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <Globe className="w-4 h-4 text-blue-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Top Referrers</h3>
                    </div>
                    <div className="space-y-2">
                        {topReferrers.map((referrer, index) => (
                            <div key={referrer.domain} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <span className="text-xs font-bold text-zinc-500 w-4 shrink-0">
                                        {index + 1}
                                    </span>
                                    <span className="text-xs text-zinc-300 truncate">
                                        {referrer.domain}
                                    </span>
                                </div>
                                <span className="text-xs font-semibold text-white ml-2 shrink-0">
                                    {formatNumber(referrer.count)}
                                </span>
                            </div>
                        ))}
                    </div>
                </ZenCard>
            )}

            {/* Top UTM Sources */}
            {topUtmSources.length > 0 && (
                <ZenCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-purple-500/10">
                            <Tag className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Fuentes UTM</h3>
                    </div>
                    <div className="space-y-2">
                        {topUtmSources.map((utm, index) => (
                            <div key={utm.source} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <span className="text-xs font-bold text-zinc-500 w-4 shrink-0">
                                        {index + 1}
                                    </span>
                                    <span className="text-xs text-zinc-300 truncate">
                                        {utm.source}
                                    </span>
                                </div>
                                <span className="text-xs font-semibold text-white ml-2 shrink-0">
                                    {formatNumber(utm.count)}
                                </span>
                            </div>
                        ))}
                    </div>
                </ZenCard>
            )}

            {/* UTM Mediums */}
            {Object.keys(utmMediums).length > 0 && (
                <ZenCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-cyan-500/10">
                            <ExternalLink className="w-4 h-4 text-cyan-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Medios UTM</h3>
                    </div>
                    <div className="space-y-1.5">
                        {Object.entries(utmMediums)
                            .sort(([, a], [, b]) => b - a)
                            .map(([medium, count]) => (
                                <div key={medium} className="flex items-center justify-between p-2 rounded bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                                    <span className="text-xs text-zinc-400">{medium}</span>
                                    <span className="text-xs font-semibold text-white">{formatNumber(count)}</span>
                                </div>
                            ))}
                    </div>
                </ZenCard>
            )}
        </div>
    );
}
