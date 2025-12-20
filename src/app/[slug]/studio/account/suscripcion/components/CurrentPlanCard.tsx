"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
    CheckCircle,
    XCircle,
    Calendar,
    CreditCard,
    Settings,
    Crown,
    Star,
    Building
} from 'lucide-react';
import { SuscripcionData } from '@/lib/actions/studio/account/suscripcion/types';

interface CurrentPlanCardProps {
    data: SuscripcionData;
    studioSlug: string;
}

export function CurrentPlanCard({ data, studioSlug }: CurrentPlanCardProps) {
    const { subscription, plan, limits } = data;

    const getPlanIcon = (planSlug: string) => {
        switch (planSlug) {
            case 'free': return <CheckCircle className="h-6 w-6 text-green-400" />;
            case 'pro': return <Star className="h-6 w-6 text-blue-400" />;
            case 'enterprise': return <Crown className="h-6 w-6 text-purple-400" />;
            default: return <Settings className="h-6 w-6 text-zinc-400" />;
        }
    };

    const getPlanColor = (planSlug: string) => {
        switch (planSlug) {
            case 'free': return 'bg-green-900/30 text-green-300 border-green-800';
            case 'pro': return 'bg-blue-900/30 text-blue-300 border-blue-800';
            case 'enterprise': return 'bg-purple-900/30 text-purple-300 border-purple-800';
            default: return 'bg-zinc-900/30 text-zinc-300 border-zinc-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-900/30 text-green-300 border-green-800';
            case 'TRIAL': return 'bg-yellow-900/30 text-yellow-300 border-yellow-800';
            case 'CANCELLED': return 'bg-red-900/30 text-red-300 border-red-800';
            case 'PAUSED': return 'bg-orange-900/30 text-orange-300 border-orange-800';
            case 'EXPIRED': return 'bg-red-900/30 text-red-300 border-red-800';
            default: return 'bg-zinc-900/30 text-zinc-300 border-zinc-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Activa';
            case 'TRIAL': return 'Prueba';
            case 'CANCELLED': return 'Cancelada';
            case 'PAUSED': return 'Pausada';
            case 'EXPIRED': return 'Expirada';
            default: return status;
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(price);
    };

    const getLimitText = (limit: any) => {
        if (limit.limit_value === -1) return 'Ilimitado';
        return `${limit.limit_value} ${limit.unit}`;
    };

    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {getPlanIcon(plan.slug)}
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                {plan.name}
                                {plan.popular && (
                                    <Badge className="bg-blue-900/30 text-blue-300 border-blue-800">
                                        Más Popular
                                    </Badge>
                                )}
                            </CardTitle>
                            <p className="text-zinc-400 text-sm mt-1">
                                {plan.description}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                            {formatPrice(plan.price_monthly)}
                        </div>
                        <div className="text-zinc-400 text-sm">/mes</div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Estado de la suscripción */}
                <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full border ${getStatusColor(subscription.status)}`}>
                            {subscription.status === 'ACTIVE' ? (
                                <CheckCircle className="h-4 w-4 inline mr-1" />
                            ) : (
                                <XCircle className="h-4 w-4 inline mr-1" />
                            )}
                            {getStatusText(subscription.status)}
                        </div>
                        <div className="text-zinc-400 text-sm">
                            Próximo pago: {formatDate(subscription.current_period_end)}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        Gestionar
                    </Button>
                </div>

                {/* Límites del plan */}
                <div>
                    <h4 className="text-white font-medium mb-3">Límites del Plan</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {limits.map((limit) => (
                            <div
                                key={limit.id}
                                className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700"
                            >
                                <div className="text-zinc-400 text-sm capitalize">
                                    {limit.limit_type.replace(/_/g, ' ')}
                                </div>
                                <div className="text-white font-medium">
                                    {getLimitText(limit)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Features del plan */}
                <div>
                    <h4 className="text-white font-medium mb-3">Características Incluidas</h4>
                    <div className="space-y-2">
                        {plan.features.highlights.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-zinc-300">
                                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                                <span className="text-sm">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                    <Button
                        variant="outline"
                        className="flex-1 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Cambiar Plan
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                    >
                        <Calendar className="h-4 w-4 mr-2" />
                        Historial
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
