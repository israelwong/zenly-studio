'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar
} from 'lucide-react';
import { SalesAnalytics } from '../../types';

interface ConversionsAndPendingCardProps {
  data: SalesAnalytics['agentsPerformance'];
  loading?: boolean;
}

export function ConversionsAndPendingCard({
  data,
  loading = false
}: ConversionsAndPendingCardProps) {
  // Calcular totales
  const totalConverted = data.reduce((sum, agent) => sum + agent.converted, 0);
  const totalPending = data.reduce((sum, agent) => sum + agent.pending, 0);
  const totalLeads = data.reduce((sum, agent) => sum + agent.leadsManaged, 0);
  const overallConversionRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;
  const pendingRatio = totalConverted > 0 ? totalPending / totalConverted : 0;

  // Identificar agentes con problemas
  const agentsWithHighPending = data.filter(agent =>
    agent.pending > agent.converted * 2
  );
  const agentsWithLowConversion = data.filter(agent =>
    agent.conversionRate < 10
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Conversiones y Pendientes
          </CardTitle>
          <CardDescription>
            Análisis de conversiones y leads pendientes
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
          <Target className="h-5 w-5" />
          Conversiones y Pendientes
        </CardTitle>
        <CardDescription>
          Análisis de conversiones y leads pendientes por agente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {totalConverted.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Convertidos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {totalPending.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {overallConversionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Tasa Conversión</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {pendingRatio.toFixed(1)}x
              </div>
              <div className="text-sm text-muted-foreground">Ratio Pendiente</div>
            </div>
          </div>

          {/* Análisis de tendencias */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Análisis de Tendencias</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Conversiones por agente */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Top Conversores
                </h5>
                {data
                  .sort((a, b) => b.converted - a.converted)
                  .slice(0, 3)
                  .map((agent, index) => (
                    <div key={agent.agentId} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{agent.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{agent.converted}</div>
                        <div className="text-xs text-green-600">{agent.conversionRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Pendientes por agente */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-orange-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Más Pendientes
                </h5>
                {data
                  .sort((a, b) => b.pending - a.pending)
                  .slice(0, 3)
                  .map((agent, index) => (
                    <div key={agent.agentId} className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{agent.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">{agent.pending}</div>
                        <div className="text-xs text-orange-600">
                          {(agent.pending / agent.leadsManaged * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Alertas y problemas */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Alertas y Problemas</h4>
            <div className="space-y-3">
              {/* Agentes con muchos pendientes */}
              {agentsWithHighPending.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-900">Alto Número de Pendientes</div>
                    <div className="text-sm text-red-700">
                      {agentsWithHighPending.map(agent => agent.name).join(', ')} tienen más del doble de pendientes que conversiones.
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      Recomendación: Revisar estrategias de seguimiento y priorización.
                    </div>
                  </div>
                </div>
              )}

              {/* Agentes con baja conversión */}
              {agentsWithLowConversion.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-900">Baja Tasa de Conversión</div>
                    <div className="text-sm text-yellow-700">
                      {agentsWithLowConversion.map(agent => agent.name).join(', ')} tienen tasas de conversión menores al 10%.
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                      Recomendación: Capacitación adicional y revisión de técnicas de venta.
                    </div>
                  </div>
                </div>
              )}

              {/* Estado general */}
              {agentsWithHighPending.length === 0 && agentsWithLowConversion.length === 0 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-900">Estado General Bueno</div>
                    <div className="text-sm text-green-700">
                      Todos los agentes mantienen niveles saludables de conversión y seguimiento.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabla detallada */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Detalle por Agente</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Agente</th>
                    <th className="text-right py-2 px-3 font-medium">Convertidos</th>
                    <th className="text-right py-2 px-3 font-medium">Pendientes</th>
                    <th className="text-right py-2 px-3 font-medium">Ratio</th>
                    <th className="text-right py-2 px-3 font-medium">Tasa Conv.</th>
                    <th className="text-center py-2 px-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((agent) => {
                    const ratio = agent.converted > 0 ? agent.pending / agent.converted : agent.pending;
                    const isHealthy = agent.conversionRate > 10 && ratio < 2;
                    const needsAttention = agent.conversionRate < 10 || ratio > 2;

                    return (
                      <tr key={agent.agentId} className="border-b hover:bg-zinc-800">
                        <td className="py-2 px-3">
                          <div className="font-medium">{agent.name}</div>
                        </td>
                        <td className="text-right py-2 px-3">
                          <span className="font-medium text-green-600">{agent.converted}</span>
                        </td>
                        <td className="text-right py-2 px-3">
                          <span className="font-medium text-orange-600">{agent.pending}</span>
                        </td>
                        <td className="text-right py-2 px-3">
                          <span className="text-muted-foreground">{ratio.toFixed(1)}x</span>
                        </td>
                        <td className="text-right py-2 px-3">
                          <Badge
                            variant={agent.conversionRate > 15 ? "default" : agent.conversionRate > 10 ? "secondary" : "destructive"}
                            className={
                              agent.conversionRate > 15 ? "bg-green-100 text-green-800" :
                                agent.conversionRate > 10 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                            }
                          >
                            {agent.conversionRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge
                            variant={isHealthy ? "default" : needsAttention ? "destructive" : "secondary"}
                            className={
                              isHealthy ? "bg-green-100 text-green-800" :
                                needsAttention ? "bg-red-100 text-red-800" :
                                  "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {isHealthy ? 'Saludable' : needsAttention ? 'Atención' : 'Regular'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Ver Detalles Completos
              </Button>
              <Button variant="outline" size="sm">
                Programar Reuniones
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
