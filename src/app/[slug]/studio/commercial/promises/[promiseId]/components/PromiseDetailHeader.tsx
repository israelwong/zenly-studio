'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, ArchiveRestore, Trash2, Loader2, ChevronDown, Check, Zap, FileText } from 'lucide-react';
import { ZenCardHeader, ZenCardTitle, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';

interface PromiseDetailHeaderProps {
    studioSlug: string;
    promiseId: string | null;
    loading: boolean;
    pipelineStages: PipelineStage[];
    currentPipelineStageId: string | null;
    isChangingStage: boolean;
    promiseData: {
        has_event?: boolean;
        evento_id?: string | null;
    } | null;
    contactData: {
        contactId: string;
    } | null;
    isArchived: boolean;
    onPipelineStageChange: (stageId: string) => void;
    onTemplatesClick: () => void;
    onAutomateClick: () => void;
    onArchive: () => void;
    onUnarchive: () => void;
    onDelete: () => void;
    isArchiving: boolean;
    isUnarchiving: boolean;
    isDeleting: boolean;
}

export function PromiseDetailHeader({
    studioSlug,
    promiseId,
    loading,
    pipelineStages,
    currentPipelineStageId,
    isChangingStage,
    promiseData,
    contactData,
    isArchived,
    onPipelineStageChange,
    onTemplatesClick,
    onAutomateClick,
    onArchive,
    onUnarchive,
    onDelete,
    isArchiving,
    isUnarchiving,
    isDeleting,
}: PromiseDetailHeaderProps) {
    const router = useRouter();

    return (
        <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${studioSlug}/studio/commercial/promises`)}
                        className="p-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </ZenButton>
                    <div className="flex items-baseline gap-2">
                        <ZenCardTitle>Promesa</ZenCardTitle>
                        {(() => {
                            // Verificar estado del evento primero
                            if (loading || !pipelineStages.length || !currentPipelineStageId || !promiseData) {
                                return (
                                    <div className="flex items-center gap-1.5 pb-0.5">
                                        <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                                        <span className="text-xs text-zinc-500">Cargando...</span>
                                    </div>
                                );
                            }

                            const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);
                            const isApprovedStage = currentStage?.slug === 'approved' || currentStage?.slug === 'aprobado' ||
                                currentStage?.name.toLowerCase().includes('aprobado');
                            const hasEvent = promiseData.has_event || false;
                            const isRestricted = isApprovedStage && hasEvent;

                            // Filtrar etapas: si está restringido, solo mostrar "archived" además de la actual
                            const availableStages = isRestricted
                                ? pipelineStages.filter((s) => s.slug === 'archived' || s.id === currentPipelineStageId)
                                : pipelineStages;

                            return (
                                <ZenDropdownMenu>
                                    <ZenDropdownMenuTrigger asChild>
                                        <button
                                            disabled={isChangingStage}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                        >
                                            {isChangingStage ? (
                                                <>
                                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                    <span>Actualizando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{currentStage?.name}</span>
                                                    <ChevronDown className="h-2.5 w-2.5" />
                                                </>
                                            )}
                                        </button>
                                    </ZenDropdownMenuTrigger>
                                    <ZenDropdownMenuContent align="start">
                                        {availableStages.map((stage) => (
                                            <ZenDropdownMenuItem
                                                key={stage.id}
                                                onClick={() => onPipelineStageChange(stage.id)}
                                                disabled={stage.id === currentPipelineStageId}
                                            >
                                                <span className="flex-1">{stage.name}</span>
                                                {stage.id === currentPipelineStageId && (
                                                    <Check className="h-4 w-4 text-emerald-500 ml-2" />
                                                )}
                                            </ZenDropdownMenuItem>
                                        ))}
                                    </ZenDropdownMenuContent>
                                </ZenDropdownMenu>
                            );
                        })()}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {(() => {
                        // Mostrar botón de gestionar evento si está aprobado y tiene evento
                        if (loading || !pipelineStages.length || !currentPipelineStageId || !promiseData) {
                            return null;
                        }

                        const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);
                        const isApprovedStage = currentStage?.slug === 'approved' || currentStage?.slug === 'aprobado' ||
                            currentStage?.name.toLowerCase().includes('aprobado');
                        const hasEvent = promiseData.has_event || false;
                        const isRestricted = isApprovedStage && hasEvent;
                        const eventoId = promiseData.evento_id || null;

                        if (isRestricted && eventoId) {
                            return (
                                <ZenButton
                                    variant="primary"
                                    size="sm"
                                    onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventoId}`)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    Gestionar Evento
                                </ZenButton>
                            );
                        }

                        return null;
                    })()}
                    {/* Botón de plantillas de contrato */}
                    <ZenButton
                        variant="outline"
                        size="sm"
                        onClick={onTemplatesClick}
                        className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
                    >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Plantillas de contrato</span>
                    </ZenButton>
                    {/* Botón Automatizar */}
                    {promiseId && contactData && (
                        <ZenButton
                            variant="outline"
                            size="sm"
                            onClick={onAutomateClick}
                            className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
                        >
                            <Zap className="h-3.5 w-3.5" />
                            <span>Automatizar</span>
                        </ZenButton>
                    )}
                    <ZenDropdownMenu>
                        <ZenDropdownMenuTrigger asChild>
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={isArchiving || isUnarchiving || isDeleting}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </ZenButton>
                        </ZenDropdownMenuTrigger>
                        <ZenDropdownMenuContent align="end">
                            {isArchived ? (
                                <ZenDropdownMenuItem
                                    onClick={onUnarchive}
                                    disabled={isUnarchiving}
                                >
                                    <ArchiveRestore className="h-4 w-4 mr-2" />
                                    {isUnarchiving ? 'Desarchivando...' : 'Desarchivar'}
                                </ZenDropdownMenuItem>
                            ) : (
                                <ZenDropdownMenuItem
                                    onClick={onArchive}
                                    disabled={isArchiving}
                                >
                                    <Archive className="h-4 w-4 mr-2" />
                                    {isArchiving ? 'Archivando...' : 'Archivar'}
                                </ZenDropdownMenuItem>
                            )}
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isDeleting ? 'Eliminando...' : 'Eliminar'}
                            </ZenDropdownMenuItem>
                        </ZenDropdownMenuContent>
                    </ZenDropdownMenu>
                </div>
            </div>
        </ZenCardHeader>
    );
}

