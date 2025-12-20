import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function SalesOverviewChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Resumen de Ventas</CardTitle>
                <CardDescription>Vista general del rendimiento de ventas</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Resumen de Ventas (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
