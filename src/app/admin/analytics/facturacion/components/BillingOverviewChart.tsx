import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function BillingOverviewChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Resumen de Facturación</CardTitle>
                <CardDescription>Vista general del estado de facturación</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Resumen de Facturación (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
