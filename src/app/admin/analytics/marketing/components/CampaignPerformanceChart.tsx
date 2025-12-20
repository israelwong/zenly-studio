import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function CampaignPerformanceChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Rendimiento de Campañas</CardTitle>
                <CardDescription>Métricas de rendimiento por campaña</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Rendimiento de Campañas (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
