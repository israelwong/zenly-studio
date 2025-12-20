'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Calculator,
    PieChart,
    BarChart3,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import { FinancialAnalytics } from '../../types';

interface BalanceCardProps {
    data: FinancialAnalytics['balance'];
    loading?: boolean;
}

export function BalanceCard({
    data,
    loading = false
}: BalanceCardProps) {
    // Calcular métricas adicionales
    const profitMargin = data.totalIncome > 0 ? (data.netProfit / data.totalIncome) * 100 : 0;
    const expenseRatio = data.totalIncome > 0 ? (data.totalExpenses / data.totalIncome) * 100 : 0;
    const isProfitable = data.netProfit > 0;
    const isHealthy = profitMargin > 20; // Consideramos saludable >20% de margen

    // Simular datos de tendencias (en producción vendrían de la API)
    const monthlyGrowth = 8.5; // % de crecimiento mensual
    const expenseGrowth = 3.2; // % de crecimiento de gastos
    const previousMonthProfit = data.netProfit * 0.92; // Simular mes anterior

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Balance General
                    </CardTitle>
                    <CardDescription>
                        Resumen financiero de ingresos y gastos
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
                    <Calculator className="h-5 w-5" />
                    Balance General
                </CardTitle>
                <CardDescription>
                    Resumen financiero de ingresos y gastos
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Métricas principales */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                                ${data.totalIncome.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Ingresos</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span className="text-xs text-green-600">+{monthlyGrowth}%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-red-600">
                                ${data.totalExpenses.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Gastos</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <TrendingUp className="h-4 w-4 text-red-500" />
                                <span className="text-xs text-red-600">+{expenseGrowth}%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className={`text-3xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                ${data.netProfit.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Beneficio Neto</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                {isProfitable ? (
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                                <span className={`text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                                    {((data.netProfit - previousMonthProfit) / Math.abs(previousMonthProfit) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Gráfica de balance */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Distribución Financiera</h4>
                        <div className="space-y-3">
                            {/* Ingresos */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <span className="text-sm font-medium">Ingresos</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-green-600">
                                            ${data.totalIncome.toLocaleString()}
                                        </span>
                                        <span className="text-sm text-muted-foreground ml-2">
                                            100%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Gastos */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <span className="text-sm font-medium">Gastos</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-red-600">
                                            ${data.totalExpenses.toLocaleString()}
                                        </span>
                                        <span className="text-sm text-muted-foreground ml-2">
                                            {expenseRatio.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-red-500 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${expenseRatio}%` }}
                                    />
                                </div>
                            </div>

                            {/* Beneficio Neto */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${isProfitable ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                        <span className="text-sm font-medium">Beneficio Neto</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-bold ${isProfitable ? 'text-blue-600' : 'text-orange-600'}`}>
                                            ${data.netProfit.toLocaleString()}
                                        </span>
                                        <span className="text-sm text-muted-foreground ml-2">
                                            {profitMargin.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full transition-all duration-500 ${isProfitable ? 'bg-blue-500' : 'bg-orange-500'}`}
                                        style={{ width: `${Math.abs(profitMargin)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Análisis de rentabilidad */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Análisis de Rentabilidad</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <PieChart className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium text-blue-900">Margen de Beneficio</span>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {profitMargin.toFixed(1)}%
                                </div>
                                <div className="text-sm text-blue-700">
                                    {isHealthy ? 'Saludable' : 'Necesita mejora'}
                                </div>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="h-4 w-4 text-purple-600" />
                                    <span className="font-medium text-purple-900">Ratio de Gastos</span>
                                </div>
                                <div className="text-2xl font-bold text-purple-600">
                                    {expenseRatio.toFixed(1)}%
                                </div>
                                <div className="text-sm text-purple-700">
                                    {expenseRatio < 80 ? 'Controlado' : 'Alto'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estado financiero */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Estado Financiero</h4>
                        <div className="space-y-3">
                            {isProfitable && isHealthy ? (
                                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-green-900">Estado Financiero Saludable</div>
                                        <div className="text-sm text-green-700">
                                            La empresa mantiene un margen de beneficio del {profitMargin.toFixed(1)}%,
                                            lo que indica una gestión financiera sólida.
                                        </div>
                                    </div>
                                </div>
                            ) : isProfitable ? (
                                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-yellow-900">Margen de Beneficio Bajo</div>
                                        <div className="text-sm text-yellow-700">
                                            Aunque hay beneficios, el margen del {profitMargin.toFixed(1)}% está por debajo
                                            del objetivo del 20%. Considerar optimización de costos.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-red-900">Pérdidas Financieras</div>
                                        <div className="text-sm text-red-700">
                                            Los gastos superan los ingresos. Revisar urgentemente la estructura
                                            de costos y estrategias de ingresos.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recomendaciones */}
                            <div className="space-y-2">
                                <h5 className="text-sm font-medium">Recomendaciones</h5>
                                {expenseRatio > 80 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                                        <span>Optimizar gastos operativos para mejorar el margen de beneficio.</span>
                                    </div>
                                )}
                                {profitMargin < 15 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                                        <span>Implementar estrategias para aumentar los ingresos o reducir costos.</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                    <span>Monitorear mensualmente el balance para mantener la salud financiera.</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    <span>Considerar inversiones estratégicas para el crecimiento sostenible.</span>
                                </div>
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
                                Optimizar Gastos
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
