'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
    CreditCard,
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    Calendar,
    BarChart3
} from 'lucide-react';
import { BillingAnalytics } from '../../types';

interface SubscriptionsChartProps {
    data: BillingAnalytics['subscriptions'];
    loading?: boolean;
}

export function SubscriptionsChart({
    data,
    loading = false
}: SubscriptionsChartProps) {
    // Calcular totales
    const totalSubscriptions = data.reduce((sum, plan) => sum + plan.subscriberCount, 0);
    const totalRevenue = data.reduce((sum, plan) => sum + plan.monthlyRevenue, 0);
    const totalYearlyRevenue = data.reduce((sum, plan) => sum + plan.yearlyRevenue, 0);
    const averageRevenuePerSubscriber = totalSubscriptions > 0 ? totalRevenue / totalSubscriptions : 0;

    // Ordenar por revenue
    const sortedByRevenue = [...data].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
    const sortedBySubscribers = [...data].sort((a, b) => b.subscriberCount - a.subscriberCount);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Suscripciones por Plan
                    </CardTitle>
                    <CardDescription>
                        Análisis de suscripciones y revenue por plan
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-pulse text-muted-foreground">Cargando datos...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Suscripciones por Plan
                </CardTitle>
                <CardDescription>
                    Análisis de suscripciones y revenue por plan
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Métricas principales */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {totalSubscriptions.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Suscripciones</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                ${totalRevenue.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Revenue Mensual</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                ${totalYearlyRevenue.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Revenue Anual</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                ${averageRevenuePerSubscriber.toFixed(0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Promedio por Suscriptor</div>
                        </div>
                    </div>

                    {/* Gráfica de barras simulada */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Distribución por Plan</h4>
                        <div className="space-y-4">
                            {data.map((plan) => {
                                const maxRevenue = Math.max(...data.map(p => p.monthlyRevenue));
                                const percentage = (plan.monthlyRevenue / maxRevenue) * 100;
                                const subscriberPercentage = totalSubscriptions > 0 ? (plan.subscriberCount / totalSubscriptions) * 100 : 0;

                                return (
                                    <div key={plan.planId} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                                                <span className="font-medium">{plan.planName}</span>
                                                <Badge variant="outline">{plan.subscriberCount} suscriptores</Badge>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600">
                                                    ${plan.monthlyRevenue.toLocaleString()}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {subscriberPercentage.toFixed(1)}% del total
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>${plan.priceMonthly}/mes</span>
                                            <span>${plan.priceYearly}/año</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Análisis de tendencias */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Top Revenue Plans */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                Planes con Mayor Revenue
                            </h4>
                            <div className="space-y-3">
                                {sortedByRevenue.slice(0, 3).map((plan, index) => (
                                    <div key={plan.planId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-green-900">{plan.planName}</div>
                                                <div className="text-sm text-green-700">
                                                    {plan.subscriberCount} suscriptores
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-green-600">
                                                ${plan.monthlyRevenue.toLocaleString()}
                                            </div>
                                            <div className="text-sm text-green-700">Revenue mensual</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Subscriber Plans */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                Planes con Más Suscriptores
                            </h4>
                            <div className="space-y-3">
                                {sortedBySubscribers.slice(0, 3).map((plan, index) => (
                                    <div key={plan.planId} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-blue-900">{plan.planName}</div>
                                                <div className="text-sm text-blue-700">
                                                    ${plan.priceMonthly}/mes
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-blue-600">
                                                {plan.subscriberCount}
                                            </div>
                                            <div className="text-sm text-blue-700">Suscriptores</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Análisis de precios */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Análisis de Precios</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-purple-600" />
                                    <span className="font-medium text-purple-900">Precio Promedio</span>
                                </div>
                                <div className="text-2xl font-bold text-purple-600">
                                    ${data.length > 0 ? (data.reduce((sum, p) => sum + p.priceMonthly, 0) / data.length).toFixed(0) : 0}
                                </div>
                                <div className="text-sm text-purple-700">Por mes</div>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    <span className="font-medium text-orange-900">Ahorro Anual</span>
                                </div>
                                <div className="text-2xl font-bold text-orange-600">
                                    {data.length > 0 ? ((data.reduce((sum, p) => sum + p.priceYearly, 0) / data.length) / (data.reduce((sum, p) => sum + p.priceMonthly, 0) / data.length) * 12).toFixed(0) : 0}%
                                </div>
                                <div className="text-sm text-orange-700">Descuento promedio</div>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="h-4 w-4 text-green-600" />
                                    <span className="font-medium text-green-900">Revenue Mix</span>
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                    {totalRevenue > 0 ? ((totalYearlyRevenue / totalRevenue) * 100).toFixed(0) : 0}%
                                </div>
                                <div className="text-sm text-green-700">Anual vs Mensual</div>
                            </div>
                        </div>
                    </div>

                    {/* Recomendaciones */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Recomendaciones</h4>
                        <div className="space-y-2">
                            {sortedByRevenue[0] && sortedByRevenue[0].monthlyRevenue > totalRevenue * 0.4 && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    <span>El plan {sortedByRevenue[0].planName} genera el 40%+ del revenue. Considerar optimizaciones.</span>
                                </div>
                            )}
                            {sortedBySubscribers[0] && sortedBySubscribers[0].subscriberCount > totalSubscriptions * 0.5 && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                    <span>El plan {sortedBySubscribers[0].planName} tiene más del 50% de suscriptores. Evaluar escalabilidad.</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                <span>Monitorear tendencias de conversión entre planes mensuales y anuales.</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                                <span>Analizar oportunidades de upselling en planes de menor valor.</span>
                            </div>
                        </div>
                    </div>

                    {/* Acciones rápidas */}
                    <div className="pt-4 border-t">
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                Ver Detalles Completos
                            </Button>
                            <Button variant="outline" size="sm">
                                Exportar Reporte
                            </Button>
                            <Button variant="outline" size="sm">
                                Configurar Alertas
                            </Button>
                            <Button variant="outline" size="sm">
                                Optimizar Precios
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
