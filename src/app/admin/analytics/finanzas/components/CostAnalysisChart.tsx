import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function CostAnalysisChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Análisis de Costos</CardTitle>
                <CardDescription>Análisis detallado de costos operativos</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Análisis de Costos (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
