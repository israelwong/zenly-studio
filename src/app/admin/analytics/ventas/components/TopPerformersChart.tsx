import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function TopPerformersChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Ranking de mejores agentes de ventas</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Top Performers (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
