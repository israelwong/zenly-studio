import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { KanbanColumn } from '../types';

interface KanbanSummaryProps {
    columns: KanbanColumn[];
}

export function KanbanSummary({ columns }: KanbanSummaryProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Resumen del Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {columns.map((column) => {
                        const totalValue = column.leads.reduce((sum, lead) => sum + lead.value, 0);
                        const totalSubscriptionValue = column.totalSubscriptionValue || 0;
                        return (
                            <div key={column.id} className="text-center">
                                <div className="text-2xl font-bold">{column.leads.length}</div>
                                <div className="text-sm text-muted-foreground">{column.title}</div>
                                <div className="text-xs text-green-600 font-medium">
                                    ${totalValue.toLocaleString()}
                                </div>
                                {totalSubscriptionValue > 0 && (
                                    <div className="text-xs text-blue-600 font-medium">
                                        ${totalSubscriptionValue.toLocaleString()}/mes
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
