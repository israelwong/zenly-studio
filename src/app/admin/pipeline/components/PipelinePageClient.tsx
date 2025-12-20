'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    Plus,
    GripVertical,
    Eye
} from 'lucide-react';
import { DraggablePipelineStages } from './DraggablePipelineStages';

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

interface PipelinePageClientProps {
    pipelineTypes: PipelineType[];
    onCreateStage?: () => void;
    onEditStage?: (stage: PipelineStage) => void;
    activeSection?: 'comercial' | 'soporte';
}

export function PipelinePageClient({ pipelineTypes, onCreateStage, onEditStage, activeSection }: PipelinePageClientProps) {
    const router = useRouter();

    const handleEditStage = (stage: PipelineStage) => {
        if (onEditStage) {
            onEditStage(stage);
        }
    };

    // Calcular estadísticas totales
    const allStages = pipelineTypes.flatMap(type => type.stages);
    const totalStages = allStages.length;
    const activeStages = allStages.filter(stage => stage.isActive).length;
    const totalLeads = allStages.reduce((sum, stage) => sum + (stage.leadCount || 0), 0);

    // Obtener información de la sección activa
    const getSectionInfo = () => {
        if (activeSection === 'comercial') {
            return {
                title: 'Pipeline Comercial',
                description: 'Gestiona las etapas del proceso de ventas y conversión de leads',
                icon: '📈',
                color: '#3B82F6'
            };
        } else {
            return {
                title: 'Pipeline de Soporte',
                description: 'Gestiona las etapas del proceso de atención al cliente y resolución de tickets',
                icon: '🎧',
                color: '#10B981'
            };
        }
    };

    const sectionInfo = getSectionInfo();

    return (
        <div className="p-6 space-y-6">
            {/* Section Header */}
            <div className="flex items-center space-x-3 mb-6">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: sectionInfo.color }}
                >
                    {sectionInfo.icon}
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">{sectionInfo.title}</h2>
                    <p className="text-sm text-zinc-400">{sectionInfo.description}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border border-border bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Total Etapas</p>
                                <p className="text-xl font-bold text-white">{totalStages}</p>
                            </div>
                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">E</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Etapas Activas</p>
                                <p className="text-xl font-bold text-white">
                                    {activeStages}
                                </p>
                            </div>
                            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <Eye className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Total Leads</p>
                                <p className="text-xl font-bold text-white">
                                    {totalLeads}
                                </p>
                            </div>
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">L</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline Types with Stages */}
            <div className="space-y-6">
                {pipelineTypes.map((pipelineType) => (
                    <div key={pipelineType.id} className="space-y-4">
                        {/* Pipeline Type Header */}
                        <div className="flex items-center space-x-3">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: pipelineType.color }}
                            ></div>
                            <h2 className="text-xl font-semibold text-white">
                                {pipelineType.nombre}
                            </h2>
                            <Badge variant="outline" className="text-xs">
                                {pipelineType.stages.length} etapas
                            </Badge>
                            {pipelineType.descripcion && (
                                <p className="text-sm text-zinc-400">
                                    {pipelineType.descripcion}
                                </p>
                            )}
                        </div>

                        {/* Stages for this type */}
                        <DraggablePipelineStages
                            stages={pipelineType.stages}
                            onEdit={handleEditStage}
                            pipelineTypeId={pipelineType.id}
                        />
                    </div>
                ))}
            </div>

            {/* Instructions */}
            <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-4">
                    <h3 className="font-medium text-white mb-2">Instrucciones</h3>
                    <ul className="text-sm text-zinc-400 space-y-1">
                        <li>• Arrastra las etapas para reordenar el pipeline</li>
                        <li>• Las etapas activas se muestran en el Kanban CRM</li>
                        <li>• Las etapas inactivas no aparecen en el flujo de trabajo</li>
                        {activeSection === 'comercial' ? (
                            <>
                                <li>• El orden de las etapas determina el flujo de los leads comerciales</li>
                                <li>• No se pueden eliminar etapas que contengan leads</li>
                            </>
                        ) : (
                            <>
                                <li>• El orden de las etapas determina el flujo de los tickets de soporte</li>
                                <li>• No se pueden eliminar etapas que contengan tickets</li>
                            </>
                        )}
                    </ul>
                </CardContent>
            </Card>

        </div>
    );
}
