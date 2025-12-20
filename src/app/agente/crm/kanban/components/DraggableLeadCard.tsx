'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
    GripVertical,
    Calendar,
    DollarSign,
    ExternalLink,
    Clock
} from 'lucide-react';
import { Lead } from '../types';

interface DraggableLeadCardProps {
    lead: Lead;
    isUpdating: boolean;
}

export function DraggableLeadCard({ lead, isUpdating }: DraggableLeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'high': return 'Alta';
            case 'medium': return 'Media';
            case 'low': return 'Baja';
            default: return 'Sin prioridad';
        }
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${isUpdating ? 'opacity-50 pointer-events-none' : ''
                }`}
            {...attributes}
            {...listeners}
        >
            <div className="space-y-3">
                {/* Header del lead */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <h4 className="font-medium text-sm">{lead.name}</h4>
                            <p className="text-xs text-muted-foreground">{lead.studio}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ExternalLink className="h-3 w-3" />
                    </Button>
                </div>

                {/* Información del lead */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-medium text-green-600">${lead.value.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Creado: {new Date(lead.createdAt || '').toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Modificado: {new Date(lead.updatedAt || '').toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Estado de suscripción */}
                {lead.hasSubscription ? (
                    <Badge variant="outline" className="text-xs text-green-700 bg-green-50 border-green-200 hover:bg-green-100">
                        Suscripción: ${lead.subscriptionPrice?.toLocaleString()}/mes
                    </Badge>
                ) : (
                    <Badge variant="outline" className="text-xs text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100">
                        Pendiente de suscripción
                    </Badge>
                )}

                {/* Prioridad y fuente */}
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                        {getPriorityLabel(lead.priority)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{lead.source}</span>
                </div>

                {/* Notas */}
                {lead.notes && (
                    <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                        {lead.notes}
                    </div>
                )}
            </div>
        </Card>
    );
}
