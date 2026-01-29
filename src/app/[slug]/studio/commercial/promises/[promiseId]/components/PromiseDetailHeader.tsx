'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, ArchiveRestore, Trash2, Loader2, Settings } from 'lucide-react';
import { ZenCardHeader, ZenCardTitle, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { PromiseDeleteModal } from '@/components/shared/promises';
import { PromiseNotesButton } from './PromiseNotesButton';
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

                            return (
                                <span
                                    title="Etapa actual del pipeline"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                >
                                    {currentStage?.name ?? '—'}
                                </span>
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

                        // No hay evento: mostrar botones (Automatizar está en la card "Lo que el prospecto ve")
                        return (
                            <>
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
                    {promiseId && contactData?.contactId && (
                        <>
                            <div className="h-4 w-px bg-zinc-700" aria-hidden />
                            <PromiseNotesButton
                                studioSlug={studioSlug}
                                promiseId={promiseId}
                                contactId={contactData.contactId}
                            />
                        </>
                    )}
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

