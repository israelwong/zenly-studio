'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Download, RefreshCw } from 'lucide-react';

// Importar componentes de marketing
import {
    LeadsByPeriodChart,
    PipelineStagesChart,
    CampaignPerformanceChart,
    LeadSourcesChart,
    ConversionFunnelChart,
    AgentPerformanceChart
} from './components';

export default function MarketingAnalyticsPage() {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

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

            {/* Marketing Analytics Content */}
            <div className="space-y-6">
                <LeadsByPeriodChart />
                <PipelineStagesChart />
                <CampaignPerformanceChart />
                <LeadSourcesChart />
                <ConversionFunnelChart />
                <AgentPerformanceChart />
            </div>
        </div>
    );
}
