'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Star,
    Building2,
    Users,
    DollarSign,
    Crown,
    Check,
    Copy
} from 'lucide-react';
import { Plan } from '../types';

interface PlanCardStaticProps {
    plan: Plan;
    onEdit: (plan: Plan) => void;
    onDelete: (plan: Plan) => void;
    onDuplicate: (plan: Plan) => void;
    onToggleActive: (planId: string) => void;
    onTogglePopular: (planId: string) => void;
}

export function PlanCardStatic({
    plan,
    onEdit,
    onDelete,
    onDuplicate,
    onToggleActive,
    onTogglePopular
}: PlanCardStaticProps) {
    const formatPrice = (price: number | null) => {
        if (!price) return 'Gratis';
        return `$${price.toLocaleString('en-US')}`;
    };

    const formatFeatures = (features: string[] | Record<string, unknown> | null | undefined) => {
        if (!features) return [];
        if (Array.isArray(features)) {
            return features;
        }
        // If it's an object, convert to array of strings
        return Object.entries(features).map(([key, value]) => `${key}: ${value}`);
    };

    const planFeatures = formatFeatures(plan.features);

    return (
        <Card
            className={`relative transition-all duration-200 hover:shadow-lg ${plan.popular ? 'ring-2 ring-yellow-500 shadow-yellow-500/20' : ''
                }`}
        >
            {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-yellow-500 text-yellow-900 hover:bg-yellow-600">
                        <Crown className="w-3 h-3 mr-1" />
                        Popular
                    </Badge>
                </div>
            )}

            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                            {plan.name}
                            {!plan.active && (
                                <Badge variant="secondary" className="text-xs">
                                    Inactivo
                                </Badge>
                            )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {plan.description || 'Sin descripción'}
                        </p>
                        <div className="text-xs text-muted-foreground">
                            Slug: <code className="bg-muted px-1 rounded">{plan.slug}</code>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <div className="text-2xl font-bold text-white">
                        {formatPrice(plan.price_monthly ?? null)}
                        <span className="text-sm text-muted-foreground">/mes</span>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(plan)}
                            className="text-zinc-400 hover:text-white"
                            title="Editar plan"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDuplicate(plan)}
                            className="text-blue-400 hover:text-blue-500"
                            title="Duplicar plan"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(plan)}
                            className="text-red-400 hover:text-red-500"
                            title="Eliminar plan"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-zinc-500" />
                        {plan._count?.projects || 0} Estudios
                    </div>
                    <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-zinc-500" />
                        {plan._count?.subscriptions || 0} Suscripciones
                    </div>
                    <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-zinc-500" />
                        Anual: {formatPrice(plan.price_yearly ?? null)}
                    </div>
                    <div className="flex items-center">
                        <Star className="h-4 w-4 mr-2 text-zinc-500" />
                        Orden: {plan.orden}
                    </div>
                </div>

                <div className="space-y-2">
                    <h5 className="text-sm font-medium text-white">Características:</h5>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {planFeatures.length > 0 ? (
                            planFeatures.map((feature, index) => (
                                <li key={index} className="flex items-center">
                                    <Check className="h-3 w-3 mr-1 text-green-500" />
                                    {feature}
                                </li>
                            ))
                        ) : (
                            <li>No hay características definidas.</li>
                        )}
                    </ul>
                </div>

                <div className="flex justify-end space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleActive(plan.id)}
                        className={plan.active ? "text-green-500 border-green-500 hover:bg-green-900/20" : "text-red-500 border-red-500 hover:bg-red-900/20"}
                    >
                        {plan.active ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                        {plan.active ? 'Activo' : 'Inactivo'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTogglePopular(plan.id)}
                        className={plan.popular ? "text-yellow-500 border-yellow-500 hover:bg-yellow-500/10" : "text-zinc-500 border-zinc-500 hover:bg-zinc-500/10"}
                    >
                        <Star className="h-4 w-4 mr-2" />
                        {plan.popular ? 'Popular' : 'Marcar Popular'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
