import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function LeadSourcesChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Fuentes de Leads</CardTitle>
                <CardDescription>Distribución de leads por fuente</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Fuentes de Leads (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
