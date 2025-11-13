'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Copy, Archive, Trash2, Loader2, GripVertical, Edit2, CheckCircle, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import {
  ZenBadge,
  ZenButton,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
  ZenConfirmModal,
  ZenInput,
} from '@/components/ui/zen';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  deleteCotizacion,
  archiveCotizacion,
  unarchiveCotizacion,
  duplicateCotizacion,
  updateCotizacionName,
  type CotizacionListItem,
} from '@/lib/actions/studio/builder/commercial/promises/cotizaciones.actions';

interface PromiseQuotesPanelCardProps {
  cotizacion: CotizacionListItem;
  studioSlug: string;
  promiseId?: string | null;
  contactId?: string | null;
  onUpdate?: () => void;
  isDuplicating?: boolean;
  onDuplicateStart?: (id: string) => void;
  onDuplicateComplete?: (newCotizacion: CotizacionListItem) => void;
  onDuplicateError?: () => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onNameUpdate?: (id: string, newName: string) => void;
}

export function PromiseQuotesPanelCard({
  cotizacion,
  studioSlug,
  promiseId,
  contactId,
  onUpdate,
  isDuplicating = false,
  onDuplicateStart,
  onDuplicateComplete,
  onDuplicateError,
  onDelete,
  onArchive,
  onUnarchive,
  onNameUpdate,
}: PromiseQuotesPanelCardProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(cotizacion.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);

  // Sincronizar editingName cuando cambie cotizacion.name (solo si no está editando)
  useEffect(() => {
    if (!isEditingName) {
      setEditingName(cotizacion.name);
    }
  }, [cotizacion.name, isEditingName]);

  // Seleccionar texto cuando se entra en modo edición
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cotizacion.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'success' => {
    if (status === 'autorizada') {
      return 'success';
    }
    if (status === 'aprobada' || status === 'approved') {
      return 'default';
    }
    if (status === 'rechazada' || status === 'rejected' || status === 'cancelada') {
      return 'destructive';
    }
    return 'secondary';
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'aprobada' || status === 'approved') {
      return 'Aprobada';
    }
    if (status === 'autorizada') {
      return 'Autorizada';
    }
    if (status === 'rechazada' || status === 'rejected') {
      return 'Rechazada';
    }
    if (status === 'cancelada') {
      return 'Cancelada';
    }
    if (status === 'pendiente' || status === 'pending') {
      return 'Pendiente';
    }
    return status;
  };

  const handleClick = () => {
    // No navegar si está editando el nombre
    if (isEditingName) {
      return;
    }
    if (!promiseId) {
      toast.error('No se puede editar la cotización sin una promesa asociada');
      return;
    }
    const params = new URLSearchParams();
    if (contactId) {
      params.set('contactId', contactId);
    }
    const queryString = params.toString();
    router.push(`/${studioSlug}/studio/builder/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}${queryString ? `?${queryString}` : ''}`);
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    onDuplicateStart?.(cotizacion.id);
    try {
      const result = await duplicateCotizacion(cotizacion.id, studioSlug);
      if (result.success && result.data?.cotizacion) {
        toast.success('Cotización duplicada exitosamente');
        // Actualización optimista: agregar la nueva cotización al final
        const nuevaCotizacion: CotizacionListItem = {
          ...result.data.cotizacion,
          archived: result.data.cotizacion.archived ?? false,
        };
        onDuplicateComplete?.(nuevaCotizacion);
      } else {
        toast.error(result.error || 'Error al duplicar cotización');
        onDuplicateError?.();
      }
    } catch {
      toast.error('Error al duplicar cotización');
      onDuplicateError?.();
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    isProcessingRef.current = true;
    setLoading(true);
    try {
      const result = await archiveCotizacion(cotizacion.id, studioSlug);
      if (result.success) {
        toast.success('Cotización archivada exitosamente');
        setShowArchiveModal(false);
        // Actualización local: actualizar estado archived (después de cerrar modal)
        onArchive?.(cotizacion.id);
      } else {
        toast.error(result.error || 'Error al archivar cotización');
        setShowArchiveModal(false);
      }
    } catch {
      toast.error('Error al archivar cotización');
      setShowArchiveModal(false);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleUnarchive = async () => {
    isProcessingRef.current = true;
    setLoading(true);
    try {
      const result = await unarchiveCotizacion(cotizacion.id, studioSlug);
      if (result.success) {
        toast.success('Cotización desarchivada exitosamente');
        setShowUnarchiveModal(false);
        // Actualización local: actualizar estado archived (después de cerrar modal)
        onUnarchive?.(cotizacion.id);
      } else {
        toast.error(result.error || 'Error al desarchivar cotización');
        setShowUnarchiveModal(false);
      }
    } catch {
      toast.error('Error al desarchivar cotización');
      setShowUnarchiveModal(false);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleDelete = async () => {
    isProcessingRef.current = true;
    setLoading(true);
    try {
      const result = await deleteCotizacion(cotizacion.id, studioSlug);
      if (result.success) {
        toast.success('Cotización eliminada exitosamente');
        setShowDeleteModal(false);
        // Actualización local: remover de la lista (después de cerrar modal)
        onDelete?.(cotizacion.id);
      } else {
        toast.error(result.error || 'Error al eliminar cotización');
        setShowDeleteModal(false);
      }
    } catch {
      toast.error('Error al eliminar cotización');
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleStartEditName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
    setEditingName(cotizacion.name);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    const trimmedName = editingName.trim();
    if (trimmedName === cotizacion.name) {
      setIsEditingName(false);
      return;
    }

    // Salir del modo edición primero para mostrar el cambio
    setIsEditingName(false);

    // Actualización optimista: actualizar en el padre inmediatamente
    onNameUpdate?.(cotizacion.id, trimmedName);

    setLoading(true);
    try {
      const result = await updateCotizacionName(cotizacion.id, studioSlug, trimmedName);
      if (result.success) {
        toast.success('Nombre actualizado exitosamente');
      } else {
        toast.error(result.error || 'Error al actualizar nombre');
        // Revertir cambio optimista
        onNameUpdate?.(cotizacion.id, cotizacion.name);
        setEditingName(cotizacion.name);
      }
    } catch {
      toast.error('Error al actualizar nombre');
      // Revertir cambio optimista
      onNameUpdate?.(cotizacion.id, cotizacion.name);
      setEditingName(cotizacion.name);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditName = () => {
    setEditingName(cotizacion.name);
    setIsEditingName(false);
  };

  const handleAuthorize = async () => {
    if (!promiseId) {
      toast.error('No se puede autorizar sin una promesa asociada');
      return;
    }

    // Validar que exista al menos una fecha definida
    try {
      const { getPromiseById } = await import('@/lib/actions/studio/builder/commercial/promises/promise-logs.actions');
      const result = await getPromiseById(promiseId);

      if (result.success && result.data) {
        const hasDate = result.data.defined_date ||
          (result.data.interested_dates && result.data.interested_dates.length > 0);

        if (!hasDate) {
          toast.error('Debe existir al menos una fecha definida para autorizar la cotización');
          return;
        }
      } else {
        toast.error('Error al validar la promesa');
        return;
      }
    } catch (error) {
      console.error('Error validating promise:', error);
      toast.error('Error al validar la promesa');
      return;
    }

    router.push(`/${studioSlug}/studio/builder/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}/autorizar`);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`p-3 border rounded-lg transition-colors relative ${cotizacion.archived
          ? 'bg-zinc-900/30 border-zinc-800/50 opacity-50 grayscale'
          : 'bg-zinc-800/50 border-zinc-700'
          } ${isEditingName ? 'cursor-default' : cotizacion.archived ? 'cursor-default' : 'cursor-pointer hover:bg-zinc-800'
          }`}
        onClick={handleClick}
      >
        {isDuplicating && (
          <div className="absolute inset-0 bg-zinc-900/80 rounded-lg flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Duplicando cotización...</span>
            </div>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 -mt-1 text-zinc-500 hover:text-zinc-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div
                className="flex items-center gap-2 mb-1"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <ZenInput
                  ref={inputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveName();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      handleCancelEditName();
                    }
                  }}
                  className="flex-1 h-7 text-sm"
                  autoFocus
                  disabled={loading}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <ZenButton
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveName();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={loading || !editingName.trim()}
                  className="h-7 px-2"
                >
                  ✓
                </ZenButton>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEditName();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={loading}
                  className="h-7 px-2"
                >
                  ✕
                </ZenButton>
              </div>
            ) : (
              <h4 className={`text-sm font-medium truncate mb-1 ${cotizacion.archived ? 'text-zinc-500' : 'text-zinc-200'
                }`}>
                {cotizacion.name}
              </h4>
            )}
            {cotizacion.description && (
              <p className={`text-xs line-clamp-1 mb-2 ${cotizacion.archived ? 'text-zinc-600' : 'text-zinc-400'
                }`}>
                {cotizacion.description}
              </p>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${cotizacion.archived ? 'text-zinc-500' : 'text-emerald-400'
                  }`}>
                  ${cotizacion.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <ZenBadge
                  variant={getStatusVariant(cotizacion.status)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                >
                  {getStatusLabel(cotizacion.status)}
                </ZenBadge>
              </div>
              <p className={`text-[10px] ${cotizacion.archived ? 'text-zinc-600' : 'text-zinc-500'}`}>
                Actualizado: {new Date(cotizacion.updated_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <ZenDropdownMenu>
              <ZenDropdownMenuTrigger asChild>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={loading || isDuplicating}
                >
                  <MoreVertical className="h-4 w-4 text-zinc-400" />
                </ZenButton>
              </ZenDropdownMenuTrigger>
              <ZenDropdownMenuContent align="end">
                {cotizacion.archived ? (
                  <>
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUnarchiveModal(true);
                      }}
                      disabled={loading || isDuplicating}
                    >
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Desarchivar
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuSeparator />
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteModal(true);
                      }}
                      disabled={loading || isDuplicating}
                      className="text-red-400 focus:text-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </ZenDropdownMenuItem>
                  </>
                ) : (
                  <>
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditName(e);
                      }}
                      disabled={loading || isDuplicating || isEditingName}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar nombre
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuSeparator />
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAuthorize();
                      }}
                      disabled={loading || isDuplicating || isEditingName || !promiseId}
                      className="text-emerald-400 focus:text-emerald-300"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Autorizar
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuSeparator />
                    <ZenDropdownMenuItem onClick={handleDuplicate} disabled={loading || isDuplicating || isEditingName}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowArchiveModal(true);
                      }}
                      disabled={loading || isDuplicating}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archivar
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuSeparator />
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteModal(true);
                      }}
                      disabled={loading || isDuplicating}
                      className="text-red-400 focus:text-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </ZenDropdownMenuItem>
                  </>
                )}
              </ZenDropdownMenuContent>
            </ZenDropdownMenu>
          </div>
        </div>
      </div>

      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isProcessingRef.current) {
            setShowDeleteModal(false);
          }
        }}
        onConfirm={handleDelete}
        title="Eliminar Cotización"
        description="¿Estás seguro de eliminar esta cotización? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={loading}
      />

      <ZenConfirmModal
        isOpen={showArchiveModal}
        onClose={() => {
          if (!isProcessingRef.current) {
            setShowArchiveModal(false);
          }
        }}
        onConfirm={handleArchive}
        title="Archivar Cotización"
        description="¿Estás seguro de archivar esta cotización? Podrás desarchivarla más tarde."
        confirmText="Archivar"
        cancelText="Cancelar"
        variant="default"
        loading={loading}
      />

      <ZenConfirmModal
        isOpen={showUnarchiveModal}
        onClose={() => {
          if (!isProcessingRef.current) {
            setShowUnarchiveModal(false);
          }
        }}
        onConfirm={handleUnarchive}
        title="Desarchivar Cotización"
        description="¿Estás seguro de desarchivar esta cotización?"
        confirmText="Desarchivar"
        cancelText="Cancelar"
        variant="default"
        loading={loading}
      />
    </>
  );
}

