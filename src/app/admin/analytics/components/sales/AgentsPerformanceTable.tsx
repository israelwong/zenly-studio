'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shadcn/avatar';
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  Award,
  AlertTriangle
} from 'lucide-react';
import { SalesAnalytics } from '../../types';

interface AgentsPerformanceTableProps {
  data: SalesAnalytics['agentsPerformance'];
  totalAgents: number;
  loading?: boolean;
}

export function AgentsPerformanceTable({
  data,
  totalAgents,
  loading = false
}: AgentsPerformanceTableProps) {
  // Calcular totales
  const totalLeadsManaged = data.reduce((sum, agent) => sum + agent.leadsManaged, 0);
  const totalMoneyInPlay = data.reduce((sum, agent) => sum + agent.moneyInPlay, 0);
  const totalConverted = data.reduce((sum, agent) => sum + agent.converted, 0);
  const totalPending = data.reduce((sum, agent) => sum + agent.pending, 0);
  const averageConversionRate = data.length > 0
    ? data.reduce((sum, agent) => sum + agent.conversionRate, 0) / data.length
    : 0;

  // Ordenar agentes por performance
  const topPerformers = [...data].sort((a, b) => b.conversionRate - a.conversionRate);
  const needsAttention = [...data].filter(agent =>
    agent.conversionRate < 10 || agent.pending > agent.converted * 2
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rendimiento de Agentes
          </CardTitle>
          <CardDescription>
            Análisis de performance y supervisión de agentes
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
          <Users className="h-5 w-5" />
          Rendimiento de Agentes
        </CardTitle>
        <CardDescription>
          Análisis de performance y supervisión de agentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalAgents}
              </div>
              <div className="text-sm text-muted-foreground">Total Agentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {totalLeadsManaged.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Leads Gestionados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${totalMoneyInPlay.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Dinero en Juego</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {totalConverted.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Convertidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {totalPending.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Pendientes</div>
            </div>
          </div>

          {/* Tabla de agentes */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Detalle por Agente</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Agente</th>
                    <th className="text-right py-3 px-4 font-medium">Leads</th>
                    <th className="text-right py-3 px-4 font-medium">Dinero en Juego</th>
                    <th className="text-right py-3 px-4 font-medium">Convertidos</th>
                    <th className="text-right py-3 px-4 font-medium">Pendientes</th>
                    <th className="text-right py-3 px-4 font-medium">Tasa Conversión</th>
                    <th className="text-center py-3 px-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((agent, index) => (
                    <tr key={agent.agentId} className="border-b hover:bg-zinc-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`/avatars/${agent.agentId}.jpg`} />
                            <AvatarFallback>
                              {agent.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {agent.agentId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{agent.leadsManaged.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <DollarSign className="h-4 w-4 text-purple-500" />
                          <span className="font-medium text-purple-600">
                            ${agent.moneyInPlay.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-600">
                            {agent.converted.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span className="font-medium text-orange-600">
                            {agent.pending.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
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
                      <td className="text-center py-3 px-4">
                        <Badge
                          variant={agent.conversionRate > 15 ? "default" : agent.conversionRate > 10 ? "secondary" : "destructive"}
                          className={
                            agent.conversionRate > 15 ? "bg-green-100 text-green-800" :
                              agent.conversionRate > 10 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                          }
                        >
                          {agent.conversionRate > 15 ? 'Excelente' :
                            agent.conversionRate > 10 ? 'Bueno' : 'Necesita Atención'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análisis de performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                Top Performers
              </h4>
              <div className="space-y-3">
                {topPerformers.slice(0, 3).map((agent, index) => (
                  <div key={agent.agentId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-green-900">{agent.name}</div>
                        <div className="text-sm text-green-700">
                          {agent.converted} conversiones
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {agent.conversionRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-green-700">Conversión</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agentes que necesitan atención */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Necesitan Atención
              </h4>
              <div className="space-y-3">
                {needsAttention.slice(0, 3).map((agent) => (
                  <div key={agent.agentId} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        !
                      </div>
                      <div>
                        <div className="font-medium text-red-900">{agent.name}</div>
                        <div className="text-sm text-red-700">
                          {agent.pending} pendientes
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">
                        {agent.conversionRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-red-700">Conversión</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resumen de conversión */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">Resumen de Performance</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Tasa de conversión promedio:</span>
                <span className="font-medium ml-2">
                  {averageConversionRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-blue-700">Dinero promedio por agente:</span>
                <span className="font-medium ml-2">
                  ${totalAgents > 0 ? (totalMoneyInPlay / totalAgents).toFixed(0) : 0}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Leads promedio por agente:</span>
                <span className="font-medium ml-2">
                  {totalAgents > 0 ? (totalLeadsManaged / totalAgents).toFixed(0) : 0}
                </span>
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
                Generar Reporte
              </Button>
              <Button variant="outline" size="sm">
                Configurar Alertas
              </Button>
              <Button variant="outline" size="sm">
                Programar Reunión
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
