import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function FinancialMetricsChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Métricas Financieras</CardTitle>
                <CardDescription>KPIs y métricas financieras clave</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Métricas Financieras (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
