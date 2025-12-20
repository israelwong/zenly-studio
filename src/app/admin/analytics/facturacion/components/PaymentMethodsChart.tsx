import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function PaymentMethodsChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Métodos de Pago</CardTitle>
                <CardDescription>Distribución de métodos de pago utilizados</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Métodos de Pago (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
