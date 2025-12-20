import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function OutstandingInvoicesChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Facturas Pendientes</CardTitle>
                <CardDescription>Análisis de facturas pendientes de pago</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Facturas Pendientes (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
