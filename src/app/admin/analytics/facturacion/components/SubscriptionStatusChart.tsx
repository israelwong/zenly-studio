import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function SubscriptionStatusChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Estado de Suscripciones</CardTitle>
                <CardDescription>Distribución de estados de suscripciones</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Estado de Suscripciones (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
