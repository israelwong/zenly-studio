'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    DollarSign,
    BarChart3,
    PieChart,
    Target,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import { FinancialAnalytics } from '../../types';

interface FinancialProjectionsProps {
    data: FinancialAnalytics['projections'];
    balance: FinancialAnalytics['balance'];
    loading?: boolean;
}

export function FinancialProjections({
    data,
    balance,
    loading = false
}: FinancialProjectionsProps) {
    // Calcular métricas de proyecciones
    const totalProjectedIncome = data.reduce((sum, month) => sum + month.projectedIncome, 0);
    const totalProjectedExpenses = data.reduce((sum, month) => sum + month.projectedExpenses, 0);
    const totalProjectedProfit = totalProjectedIncome - totalProjectedExpenses;
    const averageMonthlyGrowth = data.length > 1 ?
        ((data[data.length - 1].projectedIncome - data[0].projectedIncome) / data[0].projectedIncome * 100) / (data.length - 1) : 0;

    // Simular datos de tendencias (en producción vendrían de la API)
    const currentMonthProfit = balance.netProfit;
    const projectedGrowthRate = 12.5; // % de crecimiento proyectado
    const riskFactors = [
        { factor: 'Estacionalidad', impact: 'medium', description: 'Variaciones estacionales en ingresos' },
        { factor: 'Competencia', impact: 'low', description: 'Presión competitiva moderada' },
        { factor: 'Economía', impact: 'high', description: 'Condiciones económicas inciertas' }
    ];

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Proyecciones Financieras
                    </CardTitle>
                    <CardDescription>
                        Análisis de proyecciones y tendencias futuras
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
                    Proyecciones Financieras
                </CardTitle>
                <CardDescription>
                    Análisis de proyecciones y tendencias futuras
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Métricas principales */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                ${totalProjectedIncome.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Ingresos Proyectados</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span className="text-xs text-green-600">+{projectedGrowthRate}%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                                ${totalProjectedExpenses.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Gastos Proyectados</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <TrendingUp className="h-4 w-4 text-red-500" />
                                <span className="text-xs text-red-600">+5.2%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${totalProjectedProfit > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                ${totalProjectedProfit.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Beneficio Proyectado</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                {totalProjectedProfit > 0 ? (
                                    <TrendingUp className="h-4 w-4 text-blue-500" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                                <span className={`text-xs ${totalProjectedProfit > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {averageMonthlyGrowth.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Gráfica de proyecciones mensuales */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Proyecciones Mensuales</h4>
                        <div className="space-y-3">
                            {data.map((month, index) => {
                                const profit = month.projectedIncome - month.projectedExpenses;
                                const maxIncome = Math.max(...data.map(m => m.projectedIncome));
                                const incomePercentage = (month.projectedIncome / maxIncome) * 100;
                                const expensePercentage = (month.projectedExpenses / maxIncome) * 100;

                                return (
                                    <div key={month.month} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{month.month}</span>
                                            <div className="text-right">
                                                <span className={`font-bold ${profit > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                    ${profit.toLocaleString()}
                                                </span>
                                                <div className="text-xs text-muted-foreground">
                                                    ${month.projectedIncome.toLocaleString()} - ${month.projectedExpenses.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3 relative">
                                            <div
                                                className="bg-green-500 h-3 rounded-l-full transition-all duration-500"
                                                style={{ width: `${incomePercentage}%` }}
                                            />
                                            <div
                                                className="bg-red-500 h-3 rounded-r-full transition-all duration-500 absolute top-0"
                                                style={{
                                                    width: `${expensePercentage}%`,
                                                    left: `${incomePercentage}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Análisis de tendencias */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Análisis de Tendencias</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                    <span className="font-medium text-green-900">Crecimiento Proyectado</span>
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                    +{projectedGrowthRate}%
                                </div>
                                <div className="text-sm text-green-700">Crecimiento mensual promedio</div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium text-blue-900">Objetivo Anual</span>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">
                                    ${(totalProjectedIncome * 1.2).toLocaleString()}
                                </div>
                                <div className="text-sm text-blue-700">Ingresos objetivo (+20%)</div>
                            </div>
                        </div>
                    </div>

                    {/* Factores de riesgo */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Factores de Riesgo</h4>
                        <div className="space-y-3">
                            {riskFactors.map((risk, index) => {
                                const getRiskColor = (impact: string) => {
                                    switch (impact) {
                                        case 'high': return 'bg-red-50 border-red-200 text-red-900';
                                        case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-900';
                                        case 'low': return 'bg-green-50 border-green-200 text-green-900';
                                        default: return 'bg-gray-50 border-gray-200 text-gray-900';
                                    }
                                };

                                const getRiskIcon = (impact: string) => {
                                    switch (impact) {
                                        case 'high': return AlertTriangle;
                                        case 'medium': return AlertTriangle;
                                        case 'low': return CheckCircle;
                                        default: return AlertTriangle;
                                    }
                                };

                                const IconComponent = getRiskIcon(risk.impact);

                                return (
                                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${getRiskColor(risk.impact)}`}>
                                        <IconComponent className="h-5 w-5 mt-0.5" />
                                        <div>
                                            <div className="font-medium">{risk.factor}</div>
                                            <div className="text-sm opacity-80">{risk.description}</div>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={
                                                risk.impact === 'high' ? 'bg-red-100 text-red-800' :
                                                    risk.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                            }
                                        >
                                            {risk.impact === 'high' ? 'Alto' : risk.impact === 'medium' ? 'Medio' : 'Bajo'}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recomendaciones */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Recomendaciones</h4>
                        <div className="space-y-2">
                            {totalProjectedProfit > currentMonthProfit * 1.5 && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    <span>Las proyecciones muestran un crecimiento saludable. Considerar inversiones estratégicas.</span>
                                </div>
                            )}
                            {totalProjectedExpenses > totalProjectedIncome * 0.8 && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                    <span>Los gastos proyectados son altos. Revisar y optimizar la estructura de costos.</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                <span>Monitorear mensualmente las proyecciones vs resultados reales para ajustar estrategias.</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                <span>Implementar controles de riesgo para mitigar factores externos identificados.</span>
                            </div>
                        </div>
                    </div>

                    {/* Escenarios */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Escenarios de Proyección</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                    <span className="font-medium text-red-900">Escenario Pesimista</span>
                                </div>
                                <div className="text-2xl font-bold text-red-600">
                                    ${(totalProjectedIncome * 0.8).toLocaleString()}
                                </div>
                                <div className="text-sm text-red-700">-20% de crecimiento</div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium text-blue-900">Escenario Base</span>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">
                                    ${totalProjectedIncome.toLocaleString()}
                                </div>
                                <div className="text-sm text-blue-700">Crecimiento proyectado</div>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                    <span className="font-medium text-green-900">Escenario Optimista</span>
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                    ${(totalProjectedIncome * 1.3).toLocaleString()}
                                </div>
                                <div className="text-sm text-green-700">+30% de crecimiento</div>
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
                                Exportar Proyecciones
                            </Button>
                            <Button variant="outline" size="sm">
                                Configurar Alertas
                            </Button>
                            <Button variant="outline" size="sm">
                                Actualizar Modelo
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
