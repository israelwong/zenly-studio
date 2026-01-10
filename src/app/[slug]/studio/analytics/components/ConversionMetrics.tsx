'use client';

import React from 'react';
import { Target, TrendingUp, MousePointerClick, DollarSign, Percent } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';

interface ConversionMetricsProps {
    data: {
        totalSubmissions: number;
        totalLandingVisits: number;
        totalLeadformVisits: number;
        conversionRate: number;
        clickThroughRate: number;
        totalConversionValue: number;
        topOffers: Array<{ offerId: string; count: number; value: number }>;
    };
}

export function ConversionMetrics({ data }: ConversionMetricsProps) {
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
        return `$${num.toFixed(0)}`;
    };

    const formatPercent = (num: number): string => {
        return `${num.toFixed(1)}%`;
    };

    const cards = [
        {
            title: 'Total Conversiones',
            value: data.totalSubmissions,
            icon: Target,
            description: 'Formularios completados',
            color: 'text-emerald-400',
            bgColor: 'from-emerald-500/10 to-emerald-500/5',
            borderColor: 'border-emerald-500/20',
        },
        {
            title: 'Tasa de Conversión',
            value: data.conversionRate,
            icon: Percent,
            description: 'Submissions / Visitas Leadform',
            color: 'text-blue-400',
            bgColor: 'from-blue-500/10 to-blue-500/5',
            borderColor: 'border-blue-500/20',
            isPercent: true,
        },
        {
            title: 'Click Through Rate',
            value: data.clickThroughRate,
            icon: TrendingUp,
            description: 'Leadform / Landing',
            color: 'text-purple-400',
            bgColor: 'from-purple-500/10 to-purple-500/5',
            borderColor: 'border-purple-500/20',
            isPercent: true,
        },
        {
            title: 'Valor Total',
            value: data.totalConversionValue,
            icon: DollarSign,
            description: 'Valor de conversiones',
            color: 'text-yellow-400',
            bgColor: 'from-yellow-500/10 to-yellow-500/5',
            borderColor: 'border-yellow-500/20',
            isCurrency: true,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Main Metrics */}
            <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                    Conversiones
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards.map((card, index) => (
                        <ZenCard key={index} className="p-5 hover:border-zinc-700 transition-colors group relative overflow-hidden">
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.bgColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                            <div className="relative">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.bgColor} border ${card.borderColor}`}>
                                        <card.icon className={`w-4 h-4 ${card.color}`} />
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-zinc-400 mb-2">
                                    {card.title}
                                </p>
                                <p className={`text-2xl font-bold ${card.color} mb-1`}>
                                    {card.isPercent
                                        ? formatPercent(card.value)
                                        : card.isCurrency
                                            ? formatNumber(card.value)
                                            : card.value.toLocaleString()}
                                </p>
                                <p className="text-xs text-zinc-500 line-clamp-1">
                                    {card.description}
                                </p>
                            </div>
                        </ZenCard>
                    ))}
                </div>
            </div>

            {/* Detailed Stats */}
            <ZenCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10">
                        <MousePointerClick className="w-4 h-4 text-cyan-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Funnel de Conversión</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                        <div>
                            <p className="text-xs font-medium text-zinc-400">Visitas Landing</p>
                            <p className="text-sm text-zinc-300 mt-0.5">Usuarios que vieron la oferta</p>
                        </div>
                        <p className="text-lg font-bold text-white">
                            {data.totalLandingVisits.toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                        <div>
                            <p className="text-xs font-medium text-zinc-400">Visitas Leadform</p>
                            <p className="text-sm text-zinc-300 mt-0.5">Usuarios que vieron el formulario</p>
                        </div>
                        <p className="text-lg font-bold text-blue-400">
                            {data.totalLeadformVisits.toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                        <div>
                            <p className="text-xs font-medium text-zinc-400">Conversiones</p>
                            <p className="text-sm text-zinc-300 mt-0.5">Formularios completados</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-400">
                            {data.totalSubmissions.toLocaleString()}
                        </p>
                    </div>
                </div>
            </ZenCard>
        </div>
    );
}
