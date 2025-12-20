import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function CashFlowChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Flujo de Caja</CardTitle>
                <CardDescription>Análisis del flujo de caja</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Flujo de Caja (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
