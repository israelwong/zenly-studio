'use client';

import React from 'react';
import { Eye, MousePointerClick, Share2, TrendingUp, Users, Smartphone, Monitor, RotateCcw } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';

interface AnalyticsOverviewCardsProps {
    data: {
        profile?: {
            totalViews: number;
            uniqueVisits: number;
            recurrentVisits: number;
            mobileViews: number;
            desktopViews: number;
            trafficSources?: {
                profile: number;
                external: number;
                unknown: number;
            };
            topReferrers?: Array<{ domain: string; count: number }>;
            topUtmSources?: Array<{ source: string; count: number }>;
            utmMediums?: Record<string, number>;
            utmCampaigns?: Record<string, number>;
        };
        posts: {
            totalViews: number;
            totalClicks: number;
            modalOpens: number;
            mediaClicks: number;
            totalShares: number;
        };
        portfolios: {
            totalViews: number;
        };
        offers: {
            totalViews: number;
            totalClicks: number;
        };
    };
}

export function AnalyticsOverviewCards({ data }: AnalyticsOverviewCardsProps) {
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const cards = [
        {
            title: 'Visitas al Perfil',
            value: data.profile?.totalViews || 0,
            icon: Users,
            description: 'Visitas al perfil público',
            color: 'text-emerald-400'
        },
        {
            title: 'Visitas Únicas',
            value: data.profile?.uniqueVisits || 0,
            icon: Users,
            description: 'Visitas únicas por IP',
            color: 'text-blue-400'
        },
        {
            title: 'Visitas Recurrentes',
            value: data.profile?.recurrentVisits || 0,
            icon: RotateCcw,
            description: 'Usuarios que regresaron',
            color: 'text-purple-400'
        },
        {
            title: 'Mobile',
            value: data.profile?.mobileViews || 0,
            icon: Smartphone,
            description: 'Visitas desde móvil',
            color: 'text-cyan-400'
        },
        {
            title: 'Desktop',
            value: data.profile?.desktopViews || 0,
            icon: Monitor,
            description: 'Visitas desde escritorio',
            color: 'text-orange-400'
        },
        {
            title: 'Vistas de Posts',
            value: data.posts.totalViews,
            icon: Eye,
            description: 'Posts vistos en feed',
            color: 'text-blue-400'
        },
        {
            title: 'Clics en Posts',
            value: data.posts.totalClicks,
            icon: MousePointerClick,
            description: `Modal: ${data.posts.modalOpens} | Media: ${data.posts.mediaClicks}`,
            color: 'text-emerald-400'
        },
        {
            title: 'Links Compartidos',
            value: data.posts.totalShares,
            icon: Share2,
            description: 'Veces que copiaron link',
            color: 'text-purple-400'
        },
        {
            title: 'Vistas Portfolios',
            value: data.portfolios.totalViews,
            icon: TrendingUp,
            description: 'Páginas vistas',
            color: 'text-orange-400'
        },
        {
            title: 'Vistas Ofertas',
            value: data.offers.totalViews,
            icon: Eye,
            description: 'Ofertas en sidebar',
            color: 'text-pink-400'
        },
        {
            title: 'Clics en Ofertas',
            value: data.offers.totalClicks,
            icon: MousePointerClick,
            description: 'Clics en ofertas',
            color: 'text-cyan-400'
        },
    ];

    // Agrupar cards por categoría
    const profileCards = cards.slice(0, 5);
    const contentCards = cards.slice(5);

    return (
        <div className="space-y-6">
            {/* Perfil Público Section */}
            <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                    Perfil Público
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {profileCards.map((card, index) => (
                        <ZenCard key={index} className="p-5 hover:border-zinc-700 transition-colors group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.color.replace('text-', 'from-')}/20 to-zinc-800/50 border ${card.color.replace('text-', 'border-')}/20`}>
                                        <card.icon className={`w-4 h-4 ${card.color}`} />
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-zinc-400 mb-2">
                                    {card.title}
                                </p>
                                <p className={`text-2xl font-bold ${card.color} mb-1`}>
                                    {formatNumber(card.value)}
                                </p>
                                <p className="text-xs text-zinc-500 line-clamp-1">
                                    {card.description}
                                </p>
                            </div>
                        </ZenCard>
                    ))}
                </div>
            </div>

            {/* Contenido Section */}
            <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                    Contenido
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contentCards.map((card, index) => (
                        <ZenCard key={index} className="p-5 hover:border-zinc-700 transition-colors group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.color.replace('text-', 'from-')}/20 to-zinc-800/50 border ${card.color.replace('text-', 'border-')}/20`}>
                                        <card.icon className={`w-4 h-4 ${card.color}`} />
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-zinc-400 mb-2">
                                    {card.title}
                                </p>
                                <p className={`text-2xl font-bold ${card.color} mb-1`}>
                                    {formatNumber(card.value)}
                                </p>
                                <p className="text-xs text-zinc-500 line-clamp-2">
                                    {card.description}
                                </p>
                            </div>
                        </ZenCard>
                    ))}
                </div>
            </div>
        </div>
    );
}
