import React from 'react';
import { Badge } from '@/components/ui/shadcn/badge';
import { User, UserCheck, Clock } from 'lucide-react';

interface LeadAssignmentStatusProps {
    agentId?: string | null;
    agentName?: string | null;
    variant?: 'badge' | 'dot' | 'full';
    size?: 'sm' | 'md' | 'lg';
}

export function LeadAssignmentStatus({
    agentId,
    agentName,
    variant = 'badge',
    size = 'sm'
}: LeadAssignmentStatusProps) {
    const isAssigned = !!agentId;

    // Variante de punto/dot
    if (variant === 'dot') {
        return (
            <div className="flex items-center gap-2">
                <div
                    className={`w-2 h-2 rounded-full ${isAssigned ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                />
                {size !== 'sm' && (
                    <span className="text-xs text-muted-foreground">
                        {isAssigned ? 'Asignado' : 'Libre'}
                    </span>
                )}
            </div>
        );
    }

    // Variante completa con nombre del agente
    if (variant === 'full' && isAssigned && agentName) {
        return (
            <div className="flex items-center gap-2">
                <UserCheck className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-700 font-medium">
                    {agentName}
                </span>
            </div>
        );
    }

    // Variante de badge (por defecto)
    if (isAssigned) {
        return (
            <Badge
                variant="default"
                className="bg-green-100 text-green-800 hover:bg-green-100"
            >
                <UserCheck className="mr-1 h-3 w-3" />
                Asignado
                {variant === 'full' && agentName && (
                    <span className="ml-1">• {agentName}</span>
                )}
            </Badge>
        );
    }

    return (
        <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-800 hover:bg-amber-100"
        >
            <Clock className="mr-1 h-3 w-3" />
            Libre
        </Badge>
    );
}
