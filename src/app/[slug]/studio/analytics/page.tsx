import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Users, Target } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';

export const metadata: Metadata = {
    title: 'Analytics - ZEN Studio',
    description: 'Analíticas de perfil público y conversiones',
};

interface AnalyticsPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
    const { slug } = await params;

    const analyticsSections = [
        {
            title: 'Perfil de Negocio',
            description: 'Estadísticas de visitas, interacciones y contenido del perfil público',
            href: `/${slug}/studio/analytics/perfil`,
            icon: Users,
            color: 'text-emerald-400',
            bgColor: 'from-emerald-500/10 to-emerald-500/5',
            borderColor: 'border-emerald-500/20',
        },
        {
            title: 'Conversiones',
            description: 'Conversiones, ofertas y métricas de campañas comerciales',
            href: `/${slug}/studio/analytics/marketing`,
            icon: Target,
            color: 'text-blue-400',
            bgColor: 'from-blue-500/10 to-blue-500/5',
            borderColor: 'border-blue-500/20',
        },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <BarChart3 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Analytics</h1>
                </div>
                <p className="text-zinc-400">
                    Selecciona el tipo de analytics que deseas revisar
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analyticsSections.map((section) => (
                    <Link
                        key={section.title}
                        href={section.href}
                        className="group"
                    >
                        <ZenCard className="p-6 hover:border-zinc-700 transition-all duration-200 h-full">
                            <div className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${section.bgColor} border ${section.borderColor} p-6`}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg bg-zinc-800/50 ${section.color}`}>
                                        <section.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                                            {section.title}
                                        </h2>
                                        <p className="text-sm text-zinc-400">
                                            {section.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </ZenCard>
                    </Link>
                ))}
            </div>
        </div>
    );
}
