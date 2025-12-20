import React from 'react';
import { prisma } from '@/lib/prisma';
import { SectionNavigation } from '@/components/ui/shadcn/section-navigation';
import { AgentsPageClient } from './components';
import { Agent } from './types';
import { withRetry, getFriendlyErrorMessage } from '@/lib/database/retry-helper';

async function getAgents(): Promise<Agent[]> {
    try {
        // En build time, retornar array vacío para evitar errores de conexión
        if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
            return [];
        }

        // Consulta optimizada con include para obtener el conteo de leads en una sola query
        // Usar withRetry para manejar errores P1001 de conectividad
        const agents = await withRetry(async () => {
            return await prisma.platform_agents.findMany({
                include: {
                    _count: {
                        select: {
                            platform_leads: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            });
        });

        // Convertir Decimal a number para el frontend
        return agents.map(agent => ({
            ...agent,
            comisionConversion: Number(agent.comisionConversion)
        }));
    } catch (error) {
        console.error('Error fetching agents:', error);
        // En build time, retornar array vacío en lugar de lanzar error
        if (process.env.NODE_ENV === 'production') {
            return [];
        }
        throw new Error(getFriendlyErrorMessage(error));
    }
}

export default async function AgentsPage() {
    let agents: Agent[] = [];
    let error: string | null = null;

    try {
        agents = await getAgents();
    } catch (err) {
        error = err instanceof Error ? err.message : 'Error desconocido al cargar los agentes';
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <SectionNavigation
                title="Gestión de Agentes"
                description="Administra los agentes comerciales y su rendimiento"
                actionButton={{
                    label: "Nuevo Agente",
                    href: "/admin/agents/new",
                    icon: "UserPlus"
                }}
            />

            {/* Error State */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-red-400 font-medium mb-2">Error al cargar agentes</h3>
                            <p className="text-red-300 text-sm mb-3">{error}</p>
                            <div className="text-red-300 text-sm space-y-1">
                                <p><strong>Posibles soluciones:</strong></p>
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    <li>Verifica tu conexión a internet</li>
                                    <li>Confirma que el proyecto de Supabase esté activo</li>
                                    <li>Espera unos segundos y recarga la página</li>
                                    <li>Si el problema persiste, contacta al administrador</li>
                                </ul>
                            </div>
                            <a
                                href="/admin/agents"
                                className="mt-4 inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                            >
                                Recargar página
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Client Components with State Management */}
            {!error && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                    <AgentsPageClient initialAgents={agents} />
                </div>
            )}
        </div>
    );
}
