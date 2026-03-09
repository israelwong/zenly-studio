'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, ArchiveRestore, Trash2, Loader2, XCircle, RotateCcw } from 'lucide-react';
import { ZenCardHeader, ZenCardTitle, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { PromiseDeleteModal } from '@/components/shared/promises';
import { CancelPromiseModal } from '../../components/CancelPromiseModal';
import { cancelarPromise } from '@/lib/actions/studio/commercial/promises';
import { toast } from 'sonner';
import { getPromiseStageBadgeConfig } from '@/lib/utils/promise-stage-badge';
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
        contactName?: string | null;
        /** Alternativa a contactName (usado en pendiente/cierre/autorizada) */
        name?: string | null;
    } | null;
    isArchived: boolean;
    isCanceled?: boolean;
    onPipelineStageChange: (stageId: string, stageName?: string) => void;
    onConfigClick?: () => void;
    onArchive: () => void;
    onUnarchive: () => void;
    onRestoreCanceled?: () => void;
    onCancelSuccess?: () => void;
    onDelete: () => void;
    isArchiving: boolean;
    isUnarchiving: boolean;
    isDeleting: boolean;
    /** Modo foco (edición/negociación): ocultar Regresar al Kanban y controles derecha */
    focusMode?: boolean;
    /** Abrir modal de opciones de automatización (se muestra a la izquierda del badge de etapa) */
    onAutomateClick?: () => void;
    /** Si se setea (ej. 'archived'), el badge usa este estado de forma optimista antes de redirigir/refrescar */
    optimisticStageSlug?: string | null;
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
    isCanceled = false,
    onPipelineStageChange,
    onConfigClick,
    onArchive,
    onUnarchive,
    onRestoreCanceled,
    onCancelSuccess,
    onDelete,
    isArchiving,
    isUnarchiving,
    isDeleting,
    focusMode = false,
    onAutomateClick,
    optimisticStageSlug = null,
}: PromiseDetailHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const isCierreRoute = pathname?.includes('/cierre') ?? false;
    const [mounted, setMounted] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);

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
                    {!focusMode && (
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('close-overlays'));
                            startTransition(() => {
                                router.push(`/${studioSlug}/studio/commercial/promises`);
                            });
                        }}
                        className="p-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </ZenButton>
                    )}
                    <div className="flex items-baseline gap-2">
                        <ZenCardTitle className="font-normal text-zinc-400">
                            {!contactData
                              ? 'Propuesta para …'
                              : (contactData.contactName ?? contactData.name)
                                ? <>Propuesta para <span className="font-bold text-white">{contactData.contactName ?? contactData.name}</span></>
                                : <>Propuesta para <span className="font-bold text-zinc-300">sin nombre</span></>}
                        </ZenCardTitle>
                        {loading && (
                            <div className="flex items-center gap-1.5 pb-0.5">
                                <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                                <span className="text-xs text-zinc-500">Cargando...</span>
                            </div>
                        )}
                    </div>
                </div>
                {/* Derecha: badge de etapa, Gestionar Evento, dropdown (Visualización y automatización dentro del menú) */}
                <div className="flex items-center gap-3 ml-auto">
                    {/* Badge de Seguimiento (estado) - mapeo homologado aprobada/cancelada/archivada/pendiente */}
                    {!loading && pipelineStages.length > 0 && (optimisticStageSlug || currentPipelineStageId) && (() => {
                        const effectiveStage = optimisticStageSlug
                            ? pipelineStages.find((s) => {
                                const alt = optimisticStageSlug === 'archived' ? 'archivado' : optimisticStageSlug === 'canceled' ? 'cancelado' : null;
                                return s.slug === optimisticStageSlug || (alt !== null && s.slug === alt);
                              })
                            : pipelineStages.find((s) => s.id === currentPipelineStageId);
                        const badgeConfig = effectiveStage
                            ? getPromiseStageBadgeConfig(effectiveStage.slug, effectiveStage.name)
                            : optimisticStageSlug
                                ? getPromiseStageBadgeConfig(optimisticStageSlug)
                                : null;
                        if (!badgeConfig) return null;
                        return (
                            <span title="Etapa actual del pipeline" className={badgeConfig.className}>
                                {badgeConfig.label}
                            </span>
                        );
                    })()}
                    {!focusMode && (() => {
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
                    {/* Dropdown menu: no mostrar en ruta cierre; solo si no es modo foco */}
                    {!focusMode && !isCierreRoute && (() => {
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
                                        disabled={isArchiving || isUnarchiving || isDeleting || isCanceling}
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
                                    ) : isCanceled ? (
                                        <ZenDropdownMenuItem
                                            onClick={onRestoreCanceled}
                                            disabled={isUnarchiving}
                                        >
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            Restaurar a etapa Nuevo
                                        </ZenDropdownMenuItem>
                                    ) : (
                                        <>
                                            <ZenDropdownMenuItem
                                                onClick={onArchive}
                                                disabled={isArchiving}
                                            >
                                                <Archive className="h-4 w-4 mr-2" />
                                                {isArchiving ? 'Archivando...' : 'Archivar'}
                                            </ZenDropdownMenuItem>
                                            <ZenDropdownMenuItem
                                                onClick={() => setShowCancelModal(true)}
                                                disabled={isCanceling}
                                                className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                {isCanceling ? 'Cancelando...' : 'Cancelar'}
                                            </ZenDropdownMenuItem>
                                        </>
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

        {/* Modal de cancelación con motivo */}
        {promiseId && (
            <CancelPromiseModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={async (motivo) => {
                    setIsCanceling(true);
                    try {
                        const result = await cancelarPromise(studioSlug, promiseId, motivo);
                        if (result.success) {
                            toast.success(result.message ?? 'Promesa cancelada');
                            if (promiseId) window.dispatchEvent(new CustomEvent('promise-logs-invalidate', { detail: { promiseId } }));
                            onCancelSuccess?.();
                            setShowCancelModal(false);
                        } else {
                            toast.error(result.error ?? 'Error al cancelar');
                        }
                    } catch (err) {
                        console.error('Error cancelando promesa:', err);
                        toast.error('Error al cancelar promesa');
                    } finally {
                        setIsCanceling(false);
                    }
                }}
            />
        )}
        </>
    );
}

