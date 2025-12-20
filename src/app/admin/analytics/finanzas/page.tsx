'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Download, RefreshCw } from 'lucide-react';

// Importar componentes de finanzas
import {
    FinancialOverviewChart,
    ProfitLossChart,
    CashFlowChart,
    RevenueBreakdownChart,
    CostAnalysisChart,
    FinancialMetricsChart
} from './components';

export default function FinanzasAnalyticsPage() {
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

            {/* Finanzas Analytics Content */}
            <div className="space-y-6">
                <FinancialOverviewChart />
                <ProfitLossChart />
                <CashFlowChart />
                <RevenueBreakdownChart />
                <CostAnalysisChart />
                <FinancialMetricsChart />
            </div>
        </div>
    );
}
