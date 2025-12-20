import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function LeadsByPeriodChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Leads por Período</CardTitle>
                <CardDescription>Análisis de leads generados por período</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Leads por Período (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
