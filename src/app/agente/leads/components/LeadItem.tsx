'use client';

import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import { LeadAssignmentStatus } from '@/components/shared/LeadAssignmentStatus';

interface Lead {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    estado: string;
    fechaCreacion: string;
    agente: string | null;
}

interface LeadItemProps {
    lead: Lead;
    onViewDetails: (lead: Lead) => void;
}

export default function LeadItem({ lead, onViewDetails }: LeadItemProps) {
    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'nuevo':
                return 'bg-blue-500 text-white';
            case 'contactado':
                return 'bg-yellow-500 text-white';
            case 'calificado':
                return 'bg-green-500 text-white';
            case 'propuesta':
                return 'bg-purple-500 text-white';
            case 'cerrado':
                return 'bg-zinc-500 text-white';
            default:
                return 'bg-zinc-500 text-white';
        }
    };

    const getEstadoLabel = (estado: string) => {
        switch (estado) {
            case 'nuevo':
                return 'Nuevo';
            case 'contactado':
                return 'Contactado';
            case 'calificado':
                return 'Calificado';
            case 'propuesta':
                return 'Propuesta';
            case 'cerrado':
                return 'Cerrado';
            default:
                return estado;
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition-colors bg-zinc-900/50">
            <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-400" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{lead.nombre}</h3>
                        <Badge className={getEstadoColor(lead.estado)}>
                            {getEstadoLabel(lead.estado)}
                        </Badge>
                        <LeadAssignmentStatus
                            agentId={lead.agente ? 'assigned' : null}
                            agentName={lead.agente}
                            variant="badge"
                        />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                        </div>
                        <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.telefono}
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {lead.fechaCreacion}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <div className="text-right space-y-1">
                    <LeadAssignmentStatus
                        agentId={lead.agente ? 'assigned' : null}
                        agentName={lead.agente}
                        variant="full"
                        size="md"
                    />
                    {!lead.agente && (
                        <div className="text-xs text-amber-600">
                            Disponible para asignación
                        </div>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                    onClick={() => onViewDetails(lead)}
                >
                    Ver Detalles
                </Button>
            </div>
        </div>
    );
}
