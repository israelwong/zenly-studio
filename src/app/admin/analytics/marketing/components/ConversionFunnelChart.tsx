import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function ConversionFunnelChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Embudo de Conversión</CardTitle>
                <CardDescription>Análisis del embudo de conversión</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Embudo de Conversión (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
