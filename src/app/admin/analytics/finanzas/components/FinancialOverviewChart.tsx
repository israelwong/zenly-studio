import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function FinancialOverviewChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Resumen Financiero</CardTitle>
                <CardDescription>Vista general del estado financiero</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Resumen Financiero (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
