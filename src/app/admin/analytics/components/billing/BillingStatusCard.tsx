'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
    DollarSign,
    CheckCircle,
    Clock,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Calendar,
    CreditCard
} from 'lucide-react';
import { BillingAnalytics } from '../../types';

interface BillingStatusCardProps {
    data: BillingAnalytics['billing'];
    loading?: boolean;
}

export function BillingStatusCard({
    data,
    loading = false
}: BillingStatusCardProps) {
    // Calcular métricas adicionales
    const totalBilling = data.invoiced + data.pending;
    const collectionRate = totalBilling > 0 ? (data.invoiced / totalBilling) * 100 : 0;
    const pendingPercentage = totalBilling > 0 ? (data.pending / totalBilling) * 100 : 0;

    // Simular datos de tendencias (en producción vendrían de la API)
    const monthlyTrend = 12.5; // % de crecimiento mensual
    const yearlyTrend = 8.3; // % de crecimiento anual
    const averageCollectionTime = 15; // días promedio de cobro

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Estado de Facturación
                    </CardTitle>
                    <CardDescription>
                        Análisis de facturación y cobros
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
                    <DollarSign className="h-5 w-5" />
                    Estado de Facturación
                </CardTitle>
                <CardDescription>
                    Análisis de facturación y cobros
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Métricas principales */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">
                                ${data.invoiced.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Facturado (Cobrado)</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-xs text-green-600">{collectionRate.toFixed(1)}% cobrado</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-orange-600">
                                ${data.pending.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Por Facturar</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <Clock className="h-4 w-4 text-orange-500" />
                                <span className="text-xs text-orange-600">{pendingPercentage.toFixed(1)}% pendiente</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">
                                ${totalBilling.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Facturación</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <CreditCard className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-blue-600">100% del pipeline</span>
                            </div>
                        </div>
                    </div>

                    {/* Gráfica de estado de facturación */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Distribución de Facturación</h4>
                        <div className="space-y-3">
                            {/* Facturado */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <span className="text-sm font-medium">Facturado (Cobrado)</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-green-600">
                                            ${data.invoiced.toLocaleString()}
                                        </span>
                                        <span className="text-sm text-muted-foreground ml-2">
                                            {collectionRate.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${collectionRate}%` }}
                                    />
                                </div>
                            </div>

                            {/* Pendiente */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                                        <span className="text-sm font-medium">Por Facturar</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-orange-600">
                                            ${data.pending.toLocaleString()}
                                        </span>
                                        <span className="text-sm text-muted-foreground ml-2">
                                            {pendingPercentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${pendingPercentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Análisis de tendencias */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Tendencias de Facturación</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                    <div>
                                        <div className="font-medium text-green-900">Crecimiento Mensual</div>
                                        <div className="text-sm text-green-700">vs mes anterior</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-green-600">
                                        +{monthlyTrend}%
                                    </div>
                                    <div className="text-sm text-green-700">Tendencia</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <div className="font-medium text-blue-900">Tiempo Promedio</div>
                                        <div className="text-sm text-blue-700">de cobro</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-blue-600">
                                        {averageCollectionTime} días
                                    </div>
                                    <div className="text-sm text-blue-700">Promedio</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Análisis de riesgo */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Análisis de Riesgo</h4>
                        <div className="space-y-3">
                            {/* Alertas basadas en métricas */}
                            {pendingPercentage > 30 && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-red-900">Alto Nivel de Pendientes</div>
                                        <div className="text-sm text-red-700">
                                            El {pendingPercentage.toFixed(1)}% de la facturación está pendiente.
                                            Revisar procesos de cobro.
                                        </div>
                                        <div className="text-xs text-red-600 mt-1">
                                            Recomendación: Implementar recordatorios automáticos y seguimiento activo.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {collectionRate < 70 && (
                                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-yellow-900">Tasa de Cobro Baja</div>
                                        <div className="text-sm text-yellow-700">
                                            Solo el {collectionRate.toFixed(1)}% de la facturación se ha cobrado.
                                        </div>
                                        <div className="text-xs text-yellow-600 mt-1">
                                            Recomendación: Revisar métodos de pago y políticas de cobro.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {collectionRate >= 70 && pendingPercentage <= 30 && (
                                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-green-900">Estado Saludable</div>
                                        <div className="text-sm text-green-700">
                                            La facturación se encuentra en un estado óptimo con buena tasa de cobro.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Proyecciones */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Proyecciones</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-purple-600" />
                                    <span className="font-medium text-purple-900">Proyección Mensual</span>
                                </div>
                                <div className="text-2xl font-bold text-purple-600">
                                    ${(totalBilling * (1 + monthlyTrend / 100)).toLocaleString()}
                                </div>
                                <div className="text-sm text-purple-700">Próximo mes</div>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    <span className="font-medium text-orange-900">Proyección Anual</span>
                                </div>
                                <div className="text-2xl font-bold text-orange-600">
                                    ${(totalBilling * 12 * (1 + yearlyTrend / 100)).toLocaleString()}
                                </div>
                                <div className="text-sm text-orange-700">Próximo año</div>
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
                                Generar Facturas
                            </Button>
                            <Button variant="outline" size="sm">
                                Enviar Recordatorios
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
