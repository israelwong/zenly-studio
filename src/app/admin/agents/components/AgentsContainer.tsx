"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { ZenButton } from '@/components/ui/zen';
import { ZenInput } from '@/components/ui/zen';
import { Plus, User, Search, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { AgentCard } from './AgentCard';
import { Agent } from '../types';

interface AgentsContainerProps {
    agents: Agent[];
    onAgentDelete?: (agentId: string) => void;
}

export function AgentsContainer({ agents, onAgentDelete }: AgentsContainerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [localAgents, setLocalAgents] = useState<Agent[]>(agents);

    // Sincronizar localAgents cuando cambien los agents del servidor
    useEffect(() => {
        setLocalAgents(agents);
    }, [agents]);

    const filteredAgents = useMemo(() => {
        let filtered = localAgents;

        // Filtrar por estado
        if (activeFilter === 'active') {
            filtered = filtered.filter(agent => agent.activo);
        } else if (activeFilter === 'inactive') {
            filtered = filtered.filter(agent => !agent.activo);
        }

        // Filtrar por término de búsqueda
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(agent =>
                agent.nombre.toLowerCase().includes(term) ||
                agent.email.toLowerCase().includes(term) ||
                agent.telefono.includes(term)
            );
        }

        return filtered;
    }, [localAgents, searchTerm, activeFilter]);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
    };

    const clearSearch = () => {
        setSearchTerm('');
    };

    const handleFilterChange = (filter: 'all' | 'active' | 'inactive') => {
        setActiveFilter(filter);
    };

    const handleDelete = (agentId: string) => {
        // Actualizar la lista local eliminando el agente
        setLocalAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentId));
        // Notificar al componente padre
        if (onAgentDelete) {
            onAgentDelete(agentId);
        }
    };

    return (
        <>
            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros y Búsqueda</CardTitle>
                    <CardDescription>
                        Encuentra agentes específicos usando los filtros
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 md:flex-row">
                        <div className="flex-1 relative">
                            <ZenInput
                                placeholder="Buscar por nombre, email o teléfono..."
                                icon={Search}
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {searchTerm && (
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    icon={X}
                                    className="absolute right-1 top-1 h-6 w-6 p-0"
                                    onClick={clearSearch}
                                />
                            )}
                        </div>
                        <div className="flex gap-2">
                            <ZenButton
                                variant={activeFilter === 'all' ? 'primary' : 'outline'}
                                size="sm"
                                icon={Filter}
                                iconPosition="left"
                                onClick={() => handleFilterChange('all')}
                            >
                                Todos
                            </ZenButton>
                            <ZenButton
                                variant={activeFilter === 'active' ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => handleFilterChange('active')}
                            >
                                Activos
                            </ZenButton>
                            <ZenButton
                                variant={activeFilter === 'inactive' ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => handleFilterChange('inactive')}
                            >
                                Inactivos
                            </ZenButton>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Agents List */}
            <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="border-b border-zinc-800">
                    <CardTitle className="text-lg font-semibold text-white">Lista de Agentes</CardTitle>
                    <div className="text-sm text-zinc-400">
                        Gestiona todos los agentes comerciales del sistema
                        {searchTerm && (
                            <span className="block text-xs text-zinc-500 mt-1">
                                Mostrando {filteredAgents.length} de {agents.length} agentes
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {agents.length === 0 ? (
                        <div className="text-center py-8">
                            <User className="mx-auto h-12 w-12 text-zinc-400" />
                            <h3 className="mt-2 text-sm font-semibold text-white">No hay agentes</h3>
                            <p className="mt-1 text-sm text-zinc-400">
                                Comienza creando tu primer agente comercial.
                            </p>
                            <div className="mt-6">
                                <ZenButton asChild icon={Plus} iconPosition="left">
                                    <Link href="/admin/agents/new">
                                        Crear Agente
                                    </Link>
                                </ZenButton>
                            </div>
                        </div>
                    ) : filteredAgents.length === 0 ? (
                        <div className="text-center py-8">
                            <User className="mx-auto h-12 w-12 text-zinc-400" />
                            <h3 className="mt-2 text-sm font-semibold text-white">No se encontraron agentes</h3>
                            <p className="mt-1 text-sm text-zinc-400">
                                No hay agentes que coincidan con los filtros aplicados.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {filteredAgents.map((agent) => (
                                <AgentCard
                                    key={agent.id}
                                    agent={agent}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
