import React from 'react';
import { ZenButton } from '@/components/ui/zen';
import { Plus } from 'lucide-react';

interface KanbanHeaderProps {
    onNewLead?: () => void;
}

export function KanbanHeader({ onNewLead }: KanbanHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">CRM Kanban</h1>
                <p className="text-muted-foreground">Gestiona tus leads de manera visual</p>
            </div>
            <ZenButton onClick={onNewLead} icon={Plus} iconPosition="left">
                Nuevo Lead
            </ZenButton>
        </div>
    );
}
