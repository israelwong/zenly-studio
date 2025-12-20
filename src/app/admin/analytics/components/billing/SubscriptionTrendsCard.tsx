'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Users,
    DollarSign,
    BarChart3,
    PieChart,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { BillingAnalytics } from '../../types';

interface SubscriptionTrendsCardProps {
    data: BillingAnalytics['subscriptions'];
    loading?: boolean;
}

export function SubscriptionTrendsCard({
    data,
    loading = false
}: SubscriptionTrendsCardProps) {
    // Calcular métricas de tendencias
    const totalMonthlyRevenue = data.reduce((sum, plan) => sum + plan.monthlyRevenue, 0);
    const totalYearlyRevenue = data.reduce((sum, plan) => sum + plan.yearlyRevenue, 0);
    const totalSubscribers = data.reduce((sum, plan) => sum + plan.subscriberCount, 0);

    // Simular datos de tendencias (en producción vendrían de la API)
    const monthlyTrend = 15.2; // % de crecimiento mensual
    const yearlyTrend = 8.7; // % de crecimiento anual
    const churnRate = 3.2; // % de cancelaciones
    const retentionRate = 96.8; // % de retención

    // Calcular mix de suscripciones
    const monthlySubscribers = Math.round(totalSubscribers * 0.65); // 65% mensual
    const yearlySubscribers = totalSubscribers - monthlySubscribers; // 35% anual

    // Simular datos históricos para gráfica
    const historicalData = [
        { month: 'Ene', monthly: 45000, yearly: 12000, total: 57000 },
        { month: 'Feb', monthly: 48000, yearly: 15000, total: 63000 },
        { month: 'Mar', monthly: 52000, yearly: 18000, total: 70000 },
        { month: 'Abr', monthly: 55000, yearly: 20000, total: 75000 },
        { month: 'May', monthly: 58000, yearly: 22000, total: 80000 },
        { month: 'Jun', monthly: 62000, yearly: 25000, total: 87000 }
    ];

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Tendencias de Suscripciones
                    </CardTitle>
                    <CardDescription>
                        Análisis de tendencias mensuales vs anuales
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
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
                    <TrendingUp className="h-5 w-5" />
                    Tendencias de Suscripciones
                </CardTitle>
                <CardDescription>
                    Análisis de tendencias mensuales vs anuales
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Métricas principales */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {monthlySubscribers.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Suscriptores Mensuales</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <ArrowUpRight className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600">+{monthlyTrend}%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {yearlySubscribers.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Suscriptores Anuales</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <ArrowUpRight className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600">+{yearlyTrend}%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {retentionRate}%
                            </div>
                            <div className="text-sm text-muted-foreground">Tasa de Retención</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <ArrowUpRight className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600">+2.1%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {churnRate}%
                            </div>
                            <div className="text-sm text-muted-foreground">Tasa de Cancelación</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <ArrowDownRight className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-600">-0.8%</span>
                            </div>
                        </div>
                    </div>

                    {/* Gráfica de tendencias históricas */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Tendencias Históricas (Últimos 6 meses)</h4>
                        <div className="space-y-3">
                            {historicalData.map((month, index) => {
                                const maxTotal = Math.max(...historicalData.map(m => m.total));
                                const monthlyPercentage = (month.monthly / maxTotal) * 100;
                                const yearlyPercentage = (month.yearly / maxTotal) * 100;

                                return (
                                    <div key={month.month} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{month.month}</span>
                                            <div className="text-right">
                                                <span className="font-bold text-blue-600">
                                                    ${month.total.toLocaleString()}
                                                </span>
                                                <div className="text-xs text-muted-foreground">
                                                    ${month.monthly.toLocaleString()}M + ${month.yearly.toLocaleString()}A
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3 relative">
                                            <div
                                                className="bg-blue-500 h-3 rounded-l-full transition-all duration-500"
                                                style={{ width: `${monthlyPercentage}%` }}
                                            />
                                            <div
                                                className="bg-purple-500 h-3 rounded-r-full transition-all duration-500 absolute top-0"
                                                style={{
                                                    width: `${yearlyPercentage}%`,
                                                    left: `${monthlyPercentage}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Análisis de mix de suscripciones */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Mix de Suscripciones</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Distribución por tipo */}
                            <div className="space-y-3">
                                <h5 className="text-sm font-medium text-blue-700">Distribución por Tipo</h5>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                <span className="text-sm font-medium">Mensual</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-blue-600">
                                                    {monthlySubscribers} ({((monthlySubscribers / totalSubscribers) * 100).toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${(monthlySubscribers / totalSubscribers) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-purple-500" />
                                                <span className="text-sm font-medium">Anual</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-purple-600">
                                                    {yearlySubscribers} ({((yearlySubscribers / totalSubscribers) * 100).toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${(yearlySubscribers / totalSubscribers) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue por tipo */}
                            <div className="space-y-3">
                                <h5 className="text-sm font-medium text-green-700">Revenue por Tipo</h5>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                                <span className="text-sm font-medium">Mensual</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-green-600">
                                                    ${totalMonthlyRevenue.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${(totalMonthlyRevenue / (totalMonthlyRevenue + totalYearlyRevenue)) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                                <span className="text-sm font-medium">Anual</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-orange-600">
                                                    ${totalYearlyRevenue.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${(totalYearlyRevenue / (totalMonthlyRevenue + totalYearlyRevenue)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Análisis de retención */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Análisis de Retención</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-green-600" />
                                    <span className="font-medium text-green-900">Retención Mensual</span>
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                    {retentionRate}%
                                </div>
                                <div className="text-sm text-green-700">Suscriptores activos</div>
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                    <span className="font-medium text-red-900">Cancelaciones</span>
                                </div>
                                <div className="text-2xl font-bold text-red-600">
                                    {churnRate}%
                                </div>
                                <div className="text-sm text-red-700">Tasa de churn</div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium text-blue-900">Lifetime Value</span>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">
                                    ${(totalMonthlyRevenue / totalSubscribers * 12).toFixed(0)}
                                </div>
                                <div className="text-sm text-blue-700">LTV promedio</div>
                            </div>
                        </div>
                    </div>

                    {/* Recomendaciones */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Recomendaciones</h4>
                        <div className="space-y-2">
                            {yearlySubscribers < totalSubscribers * 0.4 && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                    <span>Incentivar suscripciones anuales para mejorar el cash flow y reducir churn.</span>
                                </div>
                            )}
                            {churnRate > 5 && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                    <span>Implementar estrategias de retención para reducir la tasa de cancelación.</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                <span>Monitorear tendencias de conversión mensual vs anual para optimizar precios.</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span>Analizar patrones de cancelación para identificar oportunidades de mejora.</span>
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
                                Optimizar Retención
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
