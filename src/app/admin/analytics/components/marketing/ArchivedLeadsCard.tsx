'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Archive, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { MarketingAnalytics } from '../../types';

interface ArchivedLeadsCardProps {
    data: MarketingAnalytics['archivedLeads'];
    loading?: boolean;
}

export function ArchivedLeadsCard({ data, loading = false }: ArchivedLeadsCardProps) {
    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="h-4 w-4 text-red-500" />;
            case 'down':
                return <TrendingDown className="h-4 w-4 text-green-500" />;
            default:
                return <Minus className="h-4 w-4 text-gray-500" />;
        }
    };

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'up':
                return 'text-red-400 bg-red-500/10 border-red-500/30';
            case 'down':
                return 'text-green-400 bg-green-500/10 border-green-500/30';
            default:
                return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
        }
    };

    const getTrendText = (trend: string) => {
        switch (trend) {
            case 'up':
                return 'Aumentando';
            case 'down':
                return 'Disminuyendo';
            default:
                return 'Estable';
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Archive className="h-5 w-5" />
                        Leads Archivados
                    </CardTitle>
                    <CardDescription>
                        Análisis de leads archivados
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
                    <Archive className="h-5 w-5" />
                    Leads Archivados
                </CardTitle>
                <CardDescription>
                    Análisis de leads archivados y tendencias
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Métrica principal */}
                    <div className="text-center">
                        <div className="text-4xl font-bold text-orange-600 mb-2">
                            {data.total.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground mb-4">Total Leads Archivados</div>

                        {/* Indicador de tendencia */}
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getTrendColor(data.trend)}`}>
                            {getTrendIcon(data.trend)}
                            <span className="text-sm font-medium">
                                Tendencia: {getTrendText(data.trend)}
                            </span>
                        </div>
                    </div>

                    {/* Análisis de tendencia */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Análisis de Tendencia</h4>
                        <div className="space-y-3">
                            {data.trend === 'up' && (
                                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-red-300">Atención: Aumento en Archivados</div>
                                        <div className="text-sm text-red-200">
                                            El número de leads archivados está aumentando. Revisa los criterios de archivado y
                                            considera optimizar el proceso de seguimiento.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {data.trend === 'down' && (
                                <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-green-300">Excelente: Reducción en Archivados</div>
                                        <div className="text-sm text-green-200">
                                            El número de leads archivados está disminuyendo. Esto indica una mejora en la
                                            gestión y seguimiento de leads.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {data.trend === 'stable' && (
                                <div className="flex items-start gap-3 p-3 bg-zinc-500/10 border border-zinc-500/30 rounded-lg">
                                    <Minus className="h-5 w-5 text-zinc-400 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-zinc-300">Estable: Archivados Constantes</div>
                                        <div className="text-sm text-zinc-200">
                                            El número de leads archivados se mantiene estable. Monitorea regularmente
                                            para identificar oportunidades de mejora.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recomendaciones */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Recomendaciones</h4>
                        <div className="space-y-2">
                            {data.trend === 'up' && (
                                <>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                                        <span>Revisar criterios de archivado automático</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                                        <span>Implementar seguimiento más frecuente</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                                        <span>Capacitar a agentes en técnicas de seguimiento</span>
                                    </div>
                                </>
                            )}

                            {data.trend === 'down' && (
                                <>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        <span>Mantener las estrategias actuales</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        <span>Documentar mejores prácticas</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        <span>Compartir estrategias exitosas con el equipo</span>
                                    </div>
                                </>
                            )}

                            {data.trend === 'stable' && (
                                <>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                                        <span>Implementar seguimiento más proactivo</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                                        <span>Revisar procesos de calificación de leads</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                                        <span>Establecer métricas de seguimiento</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Acciones rápidas */}
                    <div className="pt-4 border-t">
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                Ver Detalles
                            </Button>
                            <Button variant="outline" size="sm">
                                Exportar Reporte
                            </Button>
                            <Button variant="outline" size="sm">
                                Configurar Alertas
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
