'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Target, TrendingUp, TrendingDown, DollarSign, Users, Percent } from 'lucide-react';
import { MarketingAnalytics } from '../../types';

interface CampaignPerformanceTableProps {
    data: MarketingAnalytics['campaignPerformance'];
    loading?: boolean;
}

export function CampaignPerformanceTable({ data, loading = false }: CampaignPerformanceTableProps) {
    // Calcular totales
    const totalLeads = data.reduce((sum, campaign) => sum + campaign.leads, 0);
    const totalConversions = data.reduce((sum, campaign) => sum + campaign.conversions, 0);
    const totalCost = data.reduce((sum, campaign) => sum + campaign.cost, 0);
    const totalROI = data.reduce((sum, campaign) => sum + campaign.roi, 0);
    const averageROI = data.length > 0 ? totalROI / data.length : 0;

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Performance de Campañas
                    </CardTitle>
                    <CardDescription>
                        Análisis de rendimiento de campañas de marketing
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
                    <Target className="h-5 w-5" />
                    Performance de Campañas
                </CardTitle>
                <CardDescription>
                    Análisis de rendimiento de campañas de marketing
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Métricas principales */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {totalLeads.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Leads</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {totalConversions.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Conversiones</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                ${totalCost.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Inversión Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {averageROI.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">ROI Promedio</div>
                        </div>
                    </div>

                    {/* Tabla de campañas */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Detalle por Campaña</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium">Campaña</th>
                                        <th className="text-right py-3 px-4 font-medium">Leads</th>
                                        <th className="text-right py-3 px-4 font-medium">Conversiones</th>
                                        <th className="text-right py-3 px-4 font-medium">Tasa</th>
                                        <th className="text-right py-3 px-4 font-medium">Costo</th>
                                        <th className="text-right py-3 px-4 font-medium">ROI</th>
                                        <th className="text-center py-3 px-4 font-medium">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((campaign) => (
                                        <tr key={campaign.campaignId} className="border-b hover:bg-zinc-800">
                                            <td className="py-3 px-4">
                                                <div className="font-medium">{campaign.campaignName}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    ID: {campaign.campaignId}
                                                </div>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{campaign.leads.toLocaleString()}</span>
                                                </div>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Target className="h-4 w-4 text-green-500" />
                                                    <span className="font-medium text-green-600">
                                                        {campaign.conversions.toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <Badge
                                                    variant={campaign.conversionRate > 10 ? "default" : "secondary"}
                                                    className={campaign.conversionRate > 10 ? "bg-green-100 text-green-800" : ""}
                                                >
                                                    {campaign.conversionRate.toFixed(1)}%
                                                </Badge>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <DollarSign className="h-4 w-4 text-orange-500" />
                                                    <span className="font-medium">
                                                        ${campaign.cost.toLocaleString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-right py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Percent className="h-4 w-4 text-purple-500" />
                                                    <span className={`font-medium ${campaign.roi > 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {campaign.roi > 0 ? '+' : ''}{campaign.roi.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <Badge
                                                    variant={campaign.roi > 0 ? "default" : "destructive"}
                                                    className={campaign.roi > 0 ? "bg-green-100 text-green-800" : ""}
                                                >
                                                    {campaign.roi > 0 ? 'Rentable' : 'Pérdida'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Análisis de rendimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Mejores campañas */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium">Mejores Campañas</h4>
                            <div className="space-y-3">
                                {data
                                    .filter(c => c.roi > 0)
                                    .sort((a, b) => b.roi - a.roi)
                                    .slice(0, 3)
                                    .map((campaign, index) => (
                                        <div key={campaign.campaignId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-green-900">{campaign.campaignName}</div>
                                                    <div className="text-sm text-green-700">
                                                        {campaign.conversions} conversiones
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600">
                                                    +{campaign.roi.toFixed(1)}%
                                                </div>
                                                <div className="text-sm text-green-700">ROI</div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Campañas a revisar */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium">Campañas a Revisar</h4>
                            <div className="space-y-3">
                                {data
                                    .filter(c => c.roi <= 0 || c.conversionRate < 5)
                                    .sort((a, b) => a.roi - b.roi)
                                    .slice(0, 3)
                                    .map((campaign) => (
                                        <div key={campaign.campaignId} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                    !
                                                </div>
                                                <div>
                                                    <div className="font-medium text-red-900">{campaign.campaignName}</div>
                                                    <div className="text-sm text-red-700">
                                                        {campaign.conversionRate.toFixed(1)}% conversión
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-red-600">
                                                    {campaign.roi.toFixed(1)}%
                                                </div>
                                                <div className="text-sm text-red-700">ROI</div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Acciones rápidas */}
                    <div className="pt-4 border-t">
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                Ver Todas las Campañas
                            </Button>
                            <Button variant="outline" size="sm">
                                Crear Nueva Campaña
                            </Button>
                            <Button variant="outline" size="sm">
                                Exportar Reporte
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
