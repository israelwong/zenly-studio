import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { User, Target, TrendingUp } from 'lucide-react';
import { Agent } from '../types';

interface StatsProps {
    agents: Agent[];
}

export function Stats({ agents }: StatsProps) {
    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.activo).length;
    const totalLeads = agents.reduce((sum, agent) => sum + (agent._count.platform_leads || 0), 0);
    const averageGoal = agents.length > 0
        ? Math.round(agents.reduce((sum, agent) => sum + (agent.metaMensualLeads || 0), 0) / agents.length)
        : 0;
    const averageCommission = agents.length > 0
        ? (agents.reduce((sum, agent) => sum + (Number(agent.comisionConversion) || 0), 0) / agents.length * 100)
        : 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Agentes</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalAgents}</div>
                    <p className="text-xs text-muted-foreground">
                        {activeAgents} activos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Leads Asignados</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalLeads}</div>
                    <p className="text-xs text-muted-foreground">
                        Total de leads en gestión
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Meta Promedio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{averageGoal}</div>
                    <p className="text-xs text-muted-foreground">
                        Leads mensuales por agente
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Comisión Promedio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {averageCommission.toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Por conversión exitosa
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
