import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function AgentPerformanceChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Rendimiento de Agentes</CardTitle>
                <CardDescription>Métricas de rendimiento por agente de ventas</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Rendimiento de Agentes (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
