'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { SalesAnalytics } from '../../types';

interface MoneyInPlayCardProps {
  data: SalesAnalytics['moneyInPlay'];
  agentsPerformance: SalesAnalytics['agentsPerformance'];
  loading?: boolean;
}

export function MoneyInPlayCard({ 
  data, 
  agentsPerformance, 
  loading = false 
}: MoneyInPlayCardProps) {
  // Calcular métricas adicionales
  const totalAgents = agentsPerformance.length;
  const averagePerAgent = totalAgents > 0 ? data.total / totalAgents : 0;
  const highestAgent = agentsPerformance.reduce((max, agent) => 
    agent.moneyInPlay > max.moneyInPlay ? agent : max, agentsPerformance[0] || { moneyInPlay: 0, name: '' }
  );
  const lowestAgent = agentsPerformance.reduce((min, agent) => 
    agent.moneyInPlay < min.moneyInPlay ? agent : min, agentsPerformance[0] || { moneyInPlay: 0, name: '' }
  );

  // Calcular distribución por etapas (simulado)
  const stageDistribution = {
    'Nuevo': data.total * 0.25,
    'Calificado': data.total * 0.30,
    'Propuesta': data.total * 0.25,
    'Negociación': data.total * 0.15,
    'Convertido': data.total * 0.05
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Dinero en Juego
          </CardTitle>
          <CardDescription>
            Valor total gestionado por agentes
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
          Dinero en Juego
        </CardTitle>
        <CardDescription>
          Valor total gestionado por agentes en el pipeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Métrica principal */}
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              ${data.total.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mb-4">Total en Pipeline</div>
            
            {/* Indicadores adicionales */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-900">Promedio por Agente</div>
                <div className="text-lg font-bold text-blue-600">
                  ${averagePerAgent.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="font-medium text-purple-900">Agentes Activos</div>
                <div className="text-lg font-bold text-purple-600">
                  {totalAgents}
                </div>
              </div>
            </div>
          </div>

          {/* Distribución por agente */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Distribución por Agente</h4>
            <div className="space-y-3">
              {agentsPerformance
                .sort((a, b) => b.moneyInPlay - a.moneyInPlay)
                .slice(0, 5)
                .map((agent) => {
                  const percentage = (agent.moneyInPlay / data.total) * 100;
                  return (
                    <div key={agent.agentId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{agent.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            ${agent.moneyInPlay.toLocaleString()}
                          </span>
                          <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Distribución por etapas */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Distribución por Etapas</h4>
            <div className="space-y-3">
              {Object.entries(stageDistribution).map(([stage, amount]) => {
                const percentage = (amount / data.total) * 100;
                return (
                  <div key={stage} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          ${amount.toLocaleString()}
                        </span>
                        <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Análisis de riesgo */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Análisis de Riesgo</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Agente con mayor exposición */}
              <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <div className="font-medium text-orange-900">Mayor Exposición</div>
                  <div className="text-sm text-orange-700">
                    {highestAgent.name}: ${highestAgent.moneyInPlay.toLocaleString()}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    {((highestAgent.moneyInPlay / data.total) * 100).toFixed(1)}% del total
                  </div>
                </div>
              </div>

              {/* Agente con menor exposición */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Menor Exposición</div>
                  <div className="text-sm text-blue-700">
                    {lowestAgent.name}: ${lowestAgent.moneyInPlay.toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {((lowestAgent.moneyInPlay / data.total) * 100).toFixed(1)}% del total
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recomendaciones */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Recomendaciones</h4>
            <div className="space-y-2">
              {highestAgent.moneyInPlay > averagePerAgent * 2 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span>Considerar redistribuir leads de {highestAgent.name} para balancear la carga</span>
                </div>
              )}
              {lowestAgent.moneyInPlay < averagePerAgent * 0.5 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Asignar más leads a {lowestAgent.name} para optimizar su capacidad</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Monitorear semanalmente la distribución de dinero en juego</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Implementar alertas automáticas para desbalances significativos</span>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Ver Detalles
              </Button>
              <Button variant="outline" size="sm">
                Redistribuir Leads
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
