import React from 'react';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Input } from '@/components/ui/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { Search } from 'lucide-react';

interface KanbanFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    filterStudio: string;
    onStudioChange: (value: string) => void;
    filterPriority: string;
    onPriorityChange: (value: string) => void;
    studios: string[];
}

export function KanbanFilters({
    searchTerm,
    onSearchChange,
    filterStudio,
    onStudioChange,
    filterPriority,
    onPriorityChange,
    studios
}: KanbanFiltersProps) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar leads por nombre, estudio o email..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <Select value={filterStudio} onValueChange={onStudioChange}>
                        <SelectTrigger className="w-full md:w-48">
                            <SelectValue placeholder="Filtrar por estudio" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estudios</SelectItem>
                            {studios.map(studio => (
                                <SelectItem key={studio} value={studio}>{studio}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterPriority} onValueChange={onPriorityChange}>
                        <SelectTrigger className="w-full md:w-48">
                            <SelectValue placeholder="Filtrar por prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las prioridades</SelectItem>
                            <SelectItem value="high">Alta prioridad</SelectItem>
                            <SelectItem value="medium">Media prioridad</SelectItem>
                            <SelectItem value="low">Baja prioridad</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    );
}
