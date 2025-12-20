'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MarketingAnalytics } from '../../types';

interface LeadsByPeriodChartProps {
    data: MarketingAnalytics['leadsByPeriod'];
    loading?: boolean;
}

export function LeadsByPeriodChart({ data, loading = false }: LeadsByPeriodChartProps) {
    const [selectedPeriod, setSelectedPeriod] = React.useState('current');

    // Calcular totales
    const totalLeads = data.reduce((sum, period) => sum + period.total, 0);
    const currentPeriod = data.find(p => p.period === selectedPeriod);

    // Calcular tendencia (comparar con período anterior)
    const currentIndex = data.findIndex(p => p.period === selectedPeriod);
    const previousPeriod = currentIndex > 0 ? data[currentIndex - 1] : null;
    const trend = previousPeriod
        ? currentPeriod!.total > previousPeriod.total
            ? 'up'
            : currentPeriod!.total < previousPeriod.total
                ? 'down'
                : 'stable'
        : 'stable';

    const trendPercentage = previousPeriod
        ? Math.abs(((currentPeriod!.total - previousPeriod.total) / previousPeriod.total) * 100)
        : 0;

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Leads por Período
                    </CardTitle>
                    <CardDescription>
                        Distribución de leads en el tiempo
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
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Leads por Período
                        </CardTitle>
                        <CardDescription>
                            Distribución de leads en el tiempo
                        </CardDescription>
                    </div>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="current">Período Actual</SelectItem>
                            <SelectItem value="last-7-days">Últimos 7 días</SelectItem>
                            <SelectItem value="last-30-days">Últimos 30 días</SelectItem>
                            <SelectItem value="last-90-days">Últimos 90 días</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Métricas principales */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">
                                {currentPeriod?.total.toLocaleString() || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Leads</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                                {totalLeads.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total General</div>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1">
                                {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                                {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                                {trend === 'stable' && <Minus className="h-4 w-4 text-gray-500" />}
                                <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-500' :
                                    trend === 'down' ? 'text-red-500' :
                                        'text-gray-500'
                                    }`}>
                                    {trendPercentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className="text-sm text-muted-foreground">vs Período Anterior</div>
                        </div>
                    </div>

                    {/* Gráfica de barras simple */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Distribución por Etapas</h4>
                        <div className="space-y-3">
                            {currentPeriod && Object.entries(currentPeriod.byStage).map(([stage, count]) => {
                                const percentage = (count / currentPeriod.total) * 100;
                                return (
                                    <div key={stage} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{stage}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">{count} leads</span>
                                                <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                                            </div>
                                        </div>
                                        <div className="w-full bg-zinc-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Lista de períodos */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Historial de Períodos</h4>
                        <div className="space-y-2">
                            {data.slice(0, 5).map((period) => (
                                <div
                                    key={period.period}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${period.period === selectedPeriod
                                        ? 'bg-blue-500/10 border-blue-500/30'
                                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                                        }`}
                                    onClick={() => setSelectedPeriod(period.period)}
                                >
                                    <div>
                                        <div className="font-medium">{period.period}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {Object.keys(period.byStage).length} etapas
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold">{period.total.toLocaleString()}</div>
                                        <div className="text-sm text-muted-foreground">leads</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
