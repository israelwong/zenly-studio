'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import {
    CreditCard,
    Users,
    Building2,
    TrendingUp,
    Star,
    CheckCircle
} from 'lucide-react';
import { Plan } from '../types';

interface StatsProps {
    plans: Plan[];
}

export function Stats({ plans }: StatsProps) {
    // Calcular estadísticas
    const totalPlans = plans.length;
    const activePlans = plans.filter(plan => plan.active).length;
    const popularPlans = plans.filter(plan => plan.popular).length;
    const totalStudios = plans.reduce((acc, plan) => acc + (plan._count?.projects || 0), 0);
    const totalSubscriptions = plans.reduce((acc, plan) => acc + (plan._count?.subscriptions || 0), 0);

    // Calcular ingresos estimados mensuales
    const estimatedMonthlyRevenue = plans.reduce((acc, plan) => {
        const studiosCount = plan._count?.projects || 0;
        const monthlyPrice = plan.price_monthly || 0;
        return acc + (studiosCount * monthlyPrice);
    }, 0);

    const stats = [
        {
            title: 'Total Planes',
            value: totalPlans,
            description: `${activePlans} activos`,
            icon: CreditCard,
            color: 'text-blue-500'
        },
        {
            title: 'Estudios Suscritos',
            value: totalStudios,
            description: `${totalSubscriptions} suscripciones`,
            icon: Building2,
            color: 'text-green-500'
        },
        {
            title: 'Planes Populares',
            value: popularPlans,
            description: `${Math.round((popularPlans / totalPlans) * 100)}% del total`,
            icon: Star,
            color: 'text-yellow-500'
        },
        {
            title: 'Ingresos Estimados',
            value: `$${estimatedMonthlyRevenue.toLocaleString()}`,
            description: 'Mensual',
            icon: TrendingUp,
            color: 'text-emerald-500'
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {stat.title}
                        </CardTitle>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stat.description}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
