import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function ConversionRatesChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tasas de Conversión</CardTitle>
                <CardDescription>Análisis de tasas de conversión por etapa</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Tasas de Conversión (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
