import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Users } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableLeadCard } from './DraggableLeadCard';
import { KanbanColumn } from '../types';

interface DroppableColumnProps {
    column: KanbanColumn;
    isUpdating: boolean;
}

export function DroppableColumn({ column, isUpdating }: DroppableColumnProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: column.id,
        data: {
            type: 'column',
            etapaId: column.id,
        },
    });


    return (
        <Card
            ref={setNodeRef}
            className={`min-h-[600px] transition-colors ${isOver ? 'bg-blue-50 border-blue-300' : ''
                }`}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: column.color }}
                        />
                        <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="text-xs">
                            {column.leads.length}
                        </Badge>
                        {column.totalSubscriptionValue && column.totalSubscriptionValue > 0 && (
                            <div className="text-xs text-green-600 font-medium">
                                ${column.totalSubscriptionValue.toLocaleString()}/mes
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <SortableContext
                    items={column.leads.map(lead => lead.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {column.leads.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay leads en esta etapa</p>
                        </div>
                    ) : (
                        column.leads.map((lead) => (
                            <DraggableLeadCard
                                key={lead.id}
                                lead={lead}
                                isUpdating={isUpdating}
                            />
                        ))
                    )}
                </SortableContext>
            </CardContent>
        </Card>
    );
}
