'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { ZenInput } from '@/components/ui/zen';
import { Search, Users } from 'lucide-react';
import { PersonalItem } from './PersonalItem';
import { type PersonalData } from '@/lib/actions/schemas/personal-schemas';

interface PersonalListSimpleProps {
    personal: PersonalData[];
    onEdit: (personal: PersonalData) => void;
    onDelete: (personalId: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
    loading?: boolean;
    // filterType?: PersonnelType; // No se puede usar con PersonalData actual
}

export function PersonalListSimple({
    personal,
    onEdit,
    onDelete,
    onToggleActive,
    loading = false
}: PersonalListSimpleProps) {
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrar personal por búsqueda y tipo
    const filteredPersonal = personal.filter((person) => {
        // Filtro por tipo (si se especifica) - PersonalData no tiene campo type directo
        // if (filterType && person.type !== filterType) {
        //     return false;
        // }

        // Filtro por búsqueda
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesName = person.nombre?.toLowerCase().includes(searchLower);
            const matchesEmail = person.email?.toLowerCase().includes(searchLower);
            const matchesPhone = person.telefono?.toLowerCase().includes(searchLower);

            if (!matchesName && !matchesEmail && !matchesPhone) {
                return false;
            }
        }

        return true;
    });

    // Función placeholder para toggle (se implementará en el componente padre)
    const handleToggleActive = (id: string, isActive: boolean) => {
        onToggleActive(id, isActive);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800 animate-pulse">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-700 rounded-full"></div>
                                    <div>
                                        <div className="h-4 bg-zinc-700 rounded w-32 mb-2"></div>
                                        <div className="h-3 bg-zinc-700 rounded w-24"></div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-8 bg-zinc-700 rounded w-16"></div>
                                    <div className="h-8 bg-zinc-700 rounded w-16"></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <>
            {/* Búsqueda simple */}
            <div className="mb-6">
                <ZenInput
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={Search}
                />
            </div>

            {/* Lista simplificada */}
            <div className="space-y-3">
                {filteredPersonal.length === 0 ? (
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-8 text-center">
                            <div className="text-zinc-400">
                                {personal.length === 0 ? (
                                    <div>
                                        <Users className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                                        <p className="text-lg font-medium mb-2">No hay personal registrado</p>
                                        <p className="text-sm">Comienza agregando empleados o proveedores a tu equipo</p>
                                    </div>
                                ) : (
                                    <div>
                                        <Search className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                                        <p className="text-lg font-medium mb-2">No se encontraron resultados</p>
                                        <p className="text-sm">Intenta ajustar el término de búsqueda</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    filteredPersonal.map((person) => (
                        <PersonalItem
                            key={person.id}
                            personal={person}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onToggleStatus={handleToggleActive}
                        />
                    ))
                )}
            </div>

        </>
    );
}
