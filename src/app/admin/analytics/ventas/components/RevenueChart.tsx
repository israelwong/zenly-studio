import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function RevenueChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Ingresos</CardTitle>
                <CardDescription>Análisis de ingresos por período</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Ingresos (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
