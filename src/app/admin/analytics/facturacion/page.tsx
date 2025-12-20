'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Download, RefreshCw } from 'lucide-react';

// Importar componentes de facturación
import {
    BillingOverviewChart,
    PaymentStatusChart,
    RevenueByPeriodChart,
    SubscriptionStatusChart,
    PaymentMethodsChart,
    OutstandingInvoicesChart
} from './components';

export default function FacturacionAnalyticsPage() {
    const [loading, setLoading] = useState(false);

    const handleRefresh = () => {
        setLoading(true);
        // Simular carga de datos
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
                <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                </Button>
            </div>

            {/* Facturación Analytics Content */}
            <div className="space-y-6">
                <BillingOverviewChart />
                <PaymentStatusChart />
                <RevenueByPeriodChart />
                <SubscriptionStatusChart />
                <PaymentMethodsChart />
                <OutstandingInvoicesChart />
            </div>
        </div>
    );
}
