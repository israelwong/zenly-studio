'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Search, Filter } from 'lucide-react';

interface LeadsFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onFilterClick: () => void;
    onNewLeadsClick: () => void;
    onUnassignedClick: () => void;
}

export default function LeadsFilters({
    searchTerm,
    onSearchChange,
    onFilterClick,
    onNewLeadsClick,
    onUnassignedClick
}: LeadsFiltersProps) {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-lg font-semibold text-white">Filtros y Búsqueda</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Buscar por nombre, email o teléfono..."
                                className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400 focus:border-zinc-600"
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                            onClick={onFilterClick}
                        >
                            <Filter className="mr-2 h-4 w-4" />
                            Filtros
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                            onClick={onNewLeadsClick}
                        >
                            Nuevos
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                            onClick={onUnassignedClick}
                        >
                            Sin Asignar
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
