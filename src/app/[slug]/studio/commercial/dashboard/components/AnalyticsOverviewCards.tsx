'use client';

import React from 'react';
import { Eye, MousePointerClick, Share2, TrendingUp } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';

interface AnalyticsOverviewCardsProps {
    data: {
        posts: {
            totalViews: number;
            totalClicks: number;
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
            description: 'Aperturas de modal',
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card, index) => (
                <ZenCard key={index} className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-400 mb-1">
                                {card.title}
                            </p>
                            <p className="text-3xl font-bold text-white mb-1">
                                {formatNumber(card.value)}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {card.description}
                            </p>
                        </div>
                        <div className={`p-3 rounded-lg bg-zinc-800/50 ${card.color}`}>
                            <card.icon className="w-5 h-5" />
                        </div>
                    </div>
                </ZenCard>
            ))}
        </div>
    );
}
