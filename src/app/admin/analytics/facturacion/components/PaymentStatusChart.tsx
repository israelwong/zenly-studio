import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';

export default function PaymentStatusChart() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Estado de Pagos</CardTitle>
                <CardDescription>Distribución de estados de pago</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-center justify-center text-zinc-500">
                    Gráfico de Estado de Pagos (Placeholder)
                </div>
            </CardContent>
        </Card>
    );
}
