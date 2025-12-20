'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Columns3, DollarSign, Users, TrendingUp } from 'lucide-react';
import { MarketingAnalytics } from '../../types';

interface PipelineStagesChartProps {
    data: MarketingAnalytics['pipelineStages'];
    loading?: boolean;
}

export function PipelineStagesChart({ data, loading = false }: PipelineStagesChartProps) {
    // Calcular totales
    const totalLeads = data.reduce((sum, stage) => sum + stage.count, 0);
    const totalValue = data.reduce((sum, stage) => sum + stage.financialValue, 0);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Columns3 className="h-5 w-5" />
                        Pipeline por Etapas
                    </CardTitle>
                    <CardDescription>
                        Distribución de leads por etapas del pipeline
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
                    <Columns3 className="h-5 w-5" />
                    Pipeline por Etapas
                </CardTitle>
                <CardDescription>
                    Distribución de leads por etapas del pipeline
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Métricas principales */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">
                                {totalLeads.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Leads</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                                ${totalValue.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Valor Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">
                                {data.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Etapas Activas</div>
                        </div>
                    </div>

                    {/* Tabla de etapas */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Detalle por Etapa</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium">Etapa</th>
                                        <th className="text-right py-3 px-4 font-medium">Leads</th>
                                        <th className="text-right py-3 px-4 font-medium">%</th>
                                        <th className="text-right py-3 px-4 font-medium">Valor</th>
                                        <th className="text-right py-3 px-4 font-medium">Valor/Lead</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((stage, index) => {
                                        const valuePerLead = stage.count > 0 ? stage.financialValue / stage.count : 0;
                                        return (
                                            <tr key={stage.stage} className="border-b hover:bg-zinc-800">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                        <span className="font-medium">{stage.stage}</span>
                                                    </div>
                                                </td>
                                                <td className="text-right py-3 px-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">{stage.count.toLocaleString()}</span>
                                                    </div>
                                                </td>
                                                <td className="text-right py-3 px-4">
                                                    <Badge variant="secondary">{stage.percentage.toFixed(1)}%</Badge>
                                                </td>
                                                <td className="text-right py-3 px-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <DollarSign className="h-4 w-4 text-green-500" />
                                                        <span className="font-medium text-green-600">
                                                            ${stage.financialValue.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="text-right py-3 px-4">
                                                    <span className="text-sm text-muted-foreground">
                                                        ${valuePerLead.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Gráfica de barras horizontal */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Distribución Visual</h4>
                        <div className="space-y-3">
                            {data.map((stage) => (
                                <div key={stage.stage} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{stage.stage}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">
                                                {stage.count} leads ({stage.percentage.toFixed(1)}%)
                                            </span>
                                            <Badge variant="outline">
                                                ${stage.financialValue.toLocaleString()}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                                            style={{ width: `${stage.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resumen de conversión */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            <h4 className="font-medium text-blue-900">Resumen de Conversión</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-blue-700">Tasa de conversión promedio:</span>
                                <span className="font-medium ml-2">
                                    {((data.find(s => s.stage === 'Convertido')?.count || 0) / totalLeads * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div>
                                <span className="text-blue-700">Valor promedio por lead:</span>
                                <span className="font-medium ml-2">
                                    ${totalLeads > 0 ? (totalValue / totalLeads).toFixed(0) : 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
