'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { User, Target, Phone, CheckCircle } from 'lucide-react';

interface LeadsStatsProps {
    totalLeads: number;
    nuevosLeads: number;
    contactadosLeads: number;
    calificadosLeads: number;
}

export default function LeadsStats({ 
    totalLeads, 
    nuevosLeads, 
    contactadosLeads, 
    calificadosLeads 
}: LeadsStatsProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-zinc-400">Total Leads</CardTitle>
                    <User className="h-5 w-5 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{totalLeads}</div>
                    <p className="text-sm text-green-400 mt-1">
                        +3 esta semana
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-zinc-400">Nuevos</CardTitle>
                    <Target className="h-5 w-5 text-green-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{nuevosLeads}</div>
                    <p className="text-sm text-zinc-500 mt-1">
                        Sin asignar
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-zinc-400">Contactados</CardTitle>
                    <Phone className="h-5 w-5 text-yellow-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{contactadosLeads}</div>
                    <p className="text-sm text-zinc-500 mt-1">
                        En proceso
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-zinc-400">Calificados</CardTitle>
                    <CheckCircle className="h-5 w-5 text-purple-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{calificadosLeads}</div>
                    <p className="text-sm text-zinc-500 mt-1">
                        Listos para propuesta
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
