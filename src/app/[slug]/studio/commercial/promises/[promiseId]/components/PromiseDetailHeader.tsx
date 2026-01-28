'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, ArchiveRestore, Trash2, Loader2, ChevronDown, Check, Zap, Settings } from 'lucide-react';
import { ZenCardHeader, ZenCardTitle, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { PromiseDeleteModal } from '@/components/shared/promises';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import { isTerminalStage } from '@/lib/utils/pipeline-stage-names';

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
        evento_status?: string | null;
    } | null;
    contactData: {
        contactId: string;
    } | null;
    isArchived: boolean;
    onPipelineStageChange: (stageId: string, stageName?: string) => void;
    onAutomateClick: () => void;
    onConfigClick?: () => void;
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
    onAutomateClick,
    onConfigClick,
    onArchive,
    onUnarchive,
    onDelete,
    isArchiving,
    isUnarchiving,
    isDeleting,
}: PromiseDetailHeaderProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleDeleteClick = () => {
        if (!promiseId) return;
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = () => {
        setShowDeleteModal(false);
        onDelete();
    };

    return (
        <>
        <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            // Cerrar overlays al regresar
                            window.dispatchEvent(new CustomEvent('close-overlays'));
                            startTransition(() => {
                                router.push(`/${studioSlug}/studio/commercial/promises`);
                            });
                        }}
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
                            // Si no está restringido, mostrar todas las etapas (ya vienen filtradas por is_active del servidor)
                            const availableStages = isRestricted
                                ? pipelineStages.filter((s) => s.slug === 'archived' || s.id === currentPipelineStageId)
                                : pipelineStages;

                            if (!mounted) {
                                return (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                        <span>{currentStage?.name}</span>
                                        <ChevronDown className="h-2.5 w-2.5" />
                                    </div>
                                );
                            }

                            const activeStages = availableStages.filter((s) => !isTerminalStage(s.slug));
                            const historialStages = availableStages.filter((s) => isTerminalStage(s.slug));

                            return (
                                <ZenDropdownMenu>
                                    <ZenDropdownMenuTrigger asChild>
                                        <button
                                            disabled={isChangingStage}
                                            title="Los estados de cierre se agrupan en la columna Historial del Kanban"
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
                                    <ZenDropdownMenuContent
                                        align="start"
                                        className="max-h-[300px] overflow-y-auto"
                                    >
                                        {activeStages.map((stage) => (
                                            <ZenDropdownMenuItem
                                                key={stage.id}
                                                onClick={() => onPipelineStageChange(stage.id, stage.name)}
                                                disabled={stage.id === currentPipelineStageId}
                                            >
                                                <span className="flex-1">{stage.name}</span>
                                                {stage.id === currentPipelineStageId && (
                                                    <Check className="h-4 w-4 text-emerald-500 ml-2" />
                                                )}
                                            </ZenDropdownMenuItem>
                                        ))}
                                        {historialStages.length > 0 && (
                                            <>
                                                <ZenDropdownMenuSeparator />
                                                <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                                                    Historial
                                                </div>
                                                {historialStages.map((stage) => (
                                                    <ZenDropdownMenuItem
                                                        key={stage.id}
                                                        onClick={() => onPipelineStageChange(stage.id, stage.name)}
                                                        disabled={stage.id === currentPipelineStageId}
                                                    >
                                                        <span className="flex-1">{stage.name}</span>
                                                        {stage.id === currentPipelineStageId && (
                                                            <Check className="h-4 w-4 text-emerald-500 ml-2" />
                                                        )}
                                                    </ZenDropdownMenuItem>
                                                ))}
                                            </>
                                        )}
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
                        const eventoStatus = promiseData.evento_status;
                        const eventoActivo = eventoStatus === 'ACTIVE' || eventoStatus === 'IN_PROGRESS';

                        // Mostrar botón "Gestionar Evento" solo si hay evento contratado y activo
                        if (isRestricted && typeof eventoId === 'string' && eventoId.trim() !== '' && eventoActivo) {
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
                    {/* Botones de plantillas y automatizar: solo mostrar si NO hay evento creado */}
                    {(() => {
                        // Validar primero: si hay evento creado, no mostrar botones
                        if (loading || !promiseData) {
                            return null;
                        }

                        const eventoId = promiseData.evento_id;
                        const eventoStatus = promiseData.evento_status;
                        
                        // Solo ocultar si evento_id es un string no vacío Y el evento está activo (ACTIVE o IN_PROGRESS)
                        // No ocultar si el evento está CANCELLED o ARCHIVED
                        const eventoActivo = eventoStatus === 'ACTIVE' || eventoStatus === 'IN_PROGRESS';
                        
                        if (typeof eventoId === 'string' && eventoId.trim() !== '' && eventoActivo) {
                            return null; // Evento contratado y activo: ocultar botones
                        }

                        // No hay evento: mostrar botones
                        return (
                            <>
                                {/* Botón Automatizar */}
                                {promiseId && contactData && (
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        onClick={onAutomateClick}
                                        className="gap-1.5 px-2.5 py-1.5 h-7 text-xs border-l-2 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_8px_rgba(16,185,129,0.1)] transition-all duration-300"
                                    >
                                        <Zap className="h-3.5 w-3.5 text-emerald-400/90" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
                                        <span>Automatizar</span>
                                    </ZenButton>
                                )}
                                {/* Botón Configurar */}
                                {onConfigClick && (
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={onConfigClick}
                                        className="gap-1.5 px-2.5 py-1.5 h-7 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                                        title="Configurar"
                                    >
                                        <Settings className="h-3.5 w-3.5" />
                                        <span>Configurar</span>
                                    </ZenButton>
                                )}
                            </>
                        );
                    })()}
                    {/* Dropdown menu: solo mostrar si NO hay evento creado */}
                    {(() => {
                        // Validar primero: si hay evento creado, no mostrar dropdown
                        if (loading || !promiseData) {
                            return null;
                        }

                        const eventoId = promiseData.evento_id;
                        const eventoStatus = promiseData.evento_status;
                        
                        // Solo ocultar si evento_id es un string no vacío Y el evento está activo (ACTIVE o IN_PROGRESS)
                        const eventoActivo = eventoStatus === 'ACTIVE' || eventoStatus === 'IN_PROGRESS';
                        
                        if (typeof eventoId === 'string' && eventoId.trim() !== '' && eventoActivo) {
                            return null; // Evento contratado y activo: ocultar dropdown
                        }

                        // No hay evento: mostrar dropdown
                        if (!mounted) {
                            return (
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    disabled
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </ZenButton>
                            );
                        }

                        return (
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
                                        onClick={handleDeleteClick}
                                        disabled={isDeleting}
                                        className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                                    </ZenDropdownMenuItem>
                                </ZenDropdownMenuContent>
                            </ZenDropdownMenu>
                        );
                    })()}
                </div>
            </div>
        </ZenCardHeader>

        {/* Modal de confirmación de eliminación */}
        {promiseId && (
            <PromiseDeleteModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                studioSlug={studioSlug}
                promiseId={promiseId}
                isDeleting={isDeleting}
            />
        )}
        </>
    );
}

