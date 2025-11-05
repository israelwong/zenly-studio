import React, { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { PipelineWrapper } from './components/PipelineWrapper';
import { withRetry, getFriendlyErrorMessage } from '@/lib/database/retry-helper';

interface PipelineStage {
    id: string;
    name: string;
    description: string | null;
    color: string;
    order: number;
    isActive: boolean;
    leadCount: number;
    pipelineTypeId?: string | null;
    pipelineType?: {
        id: string;
        nombre: string;
        descripcion: string | null;
        color: string;
    } | null;
}

interface PipelineType {
    id: string;
    nombre: string;
    descripcion: string | null;
    color: string;
    stages: PipelineStage[];
}

// Función para obtener las etapas del pipeline agrupadas por tipo
async function getPipelineStagesGrouped(): Promise<PipelineType[]> {
    try {
        // En build time, retornar array vacío para evitar errores de conexión
        if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
            return [];
        }

        // Usar withRetry para manejar errores P1001 de conectividad
        const pipelineTypes = await withRetry(async () => {
            return await prisma.platform_pipeline_types.findMany({
                include: {
                    pipeline_stages: {
                        include: {
                            _count: {
                                select: {
                                    platform_leads: true
                                }
                            }
                        },
                        orderBy: {
                            order: 'asc'
                        }
                    }
                },
                orderBy: {
                    order: 'asc'
                }
            });
        });

        return pipelineTypes.map(type => ({
            id: type.id,
            nombre: type.nombre,
            descripcion: type.descripcion,
            color: type.color,
            stages: type.pipeline_stages.map(stage => ({
                id: stage.id,
                name: stage.nombre,
                description: stage.descripcion,
                color: stage.color,
                order: stage.orden,
                isActive: stage.isActive,
                leadCount: stage._count.platform_leads,
                pipelineTypeId: stage.pipeline_type_id,
                pipelineType: {
                    id: type.id,
                    nombre: type.nombre,
                    descripcion: type.descripcion,
                    color: type.color
                }
            }))
        }));
    } catch (error) {
        console.error('Error fetching pipeline stages grouped:', error);
        // En build time, retornar array vacío en lugar de lanzar error
        if (process.env.NODE_ENV === 'production') {
            return [];
        }
        throw new Error(getFriendlyErrorMessage(error));
    }
}

export default async function PipelinePage() {
    let pipelineTypes: PipelineType[] = [];
    let error: string | null = null;

    try {
        pipelineTypes = await getPipelineStagesGrouped();
    } catch (err) {
        error = err instanceof Error ? err.message : 'Error desconocido al cargar el pipeline';
    }

    if (error) {
        return (
            <div className="p-6 space-y-6">
                {/* Error State */}
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-red-400 font-medium mb-2">Error al cargar pipeline</h3>
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
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="p-6 space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-zinc-700 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-zinc-700 rounded w-1/2 mb-6"></div>
                    <div className="grid gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-zinc-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        }>
            <PipelineWrapper pipelineTypes={pipelineTypes} />
        </Suspense>
    );
}