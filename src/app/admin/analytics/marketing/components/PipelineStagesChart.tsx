import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function PipelineStagesChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Etapas del Pipeline</CardTitle>
                <CardDescription>Distribución de leads por etapa</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Etapas del Pipeline (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
