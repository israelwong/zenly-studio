'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Plus } from 'lucide-react';
import LeadItem from './LeadItem';

interface Lead {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    estado: string;
    fechaCreacion: string;
    agente: string | null;
}

interface LeadsListProps {
    leads: Lead[];
    onViewDetails: (lead: Lead) => void;
}

export default function LeadsList({ leads, onViewDetails }: LeadsListProps) {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-white">Lista de Leads</CardTitle>
                    <Link href="/admin/leads/new">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Lead
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {leads.map((lead) => (
                        <LeadItem
                            key={lead.id}
                            lead={lead}
                            onViewDetails={onViewDetails}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
