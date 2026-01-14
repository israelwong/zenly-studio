'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Copy, Archive, Trash2, Loader2, GripVertical, Edit2, CheckCircle, ArchiveRestore, XCircle, Eye, EyeOff, CheckSquare, Square, Handshake, RotateCcw } from 'lucide-react';
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
  ZenDialog,
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
  toggleCotizacionVisibility,
  toggleNegociacionStatus,
  quitarCancelacionCotizacion,
  cancelarCotizacion,
  cancelarCotizacionYEvento,
  pasarACierre,
  type CotizacionListItem,
} from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { ClosingProcessInfoModal } from '../ClosingProcessInfoModal';
import { getCotizacionClicks } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';

interface PromiseQuotesPanelCardProps {
  cotizacion: CotizacionListItem;
  studioSlug: string;
  promiseId?: string | null;
  contactId?: string | null;
  onUpdate?: (cotizacionId: string) => void;
  onVisibilityToggle?: (cotizacionId: string, visible: boolean) => void;
  isDuplicating?: boolean;
  onDuplicateStart?: (id: string) => void;
  onDuplicateComplete?: (newCotizacion: CotizacionListItem) => void;
  onDuplicateError?: () => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onNameUpdate?: (id: string, newName: string) => void;
  onPasarACierre?: (id: string) => void;
  onCierreCancelado?: (id: string) => void;
  hasApprovedQuote?: boolean; // Indica si ya hay una cotización aprobada
  selectionMode?: boolean; // Modo selección múltiple
  isSelected?: boolean; // Si está seleccionada
  onToggleSelect?: () => void; // Callback para toggle de selección
}

export function PromiseQuotesPanelCard({
  cotizacion,
  studioSlug,
  promiseId,
  contactId,
  onUpdate,
  onVisibilityToggle,
  isDuplicating = false,
  onDuplicateStart,
  onDuplicateComplete,
  onDuplicateError,
  onDelete,
  onArchive,
  onUnarchive,
  onNameUpdate,
  onPasarACierre,
  onCierreCancelado,
  hasApprovedQuote = false,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: PromiseQuotesPanelCardProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showClosingProcessInfoModal, setShowClosingProcessInfoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(cotizacion.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const [clickCount, setClickCount] = useState<number | null>(null);

  // Sincronizar editingName cuando cambie cotizacion.name (solo si el modal no está abierto)
  useEffect(() => {
    if (!showEditNameModal) {
      setEditingName(cotizacion.name);
    }
  }, [cotizacion.name, showEditNameModal]);

  // Seleccionar texto cuando se abre el modal
  useEffect(() => {
    if (showEditNameModal && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [showEditNameModal]);

  // Cargar contador de clicks
  useEffect(() => {
    const loadClickCount = async () => {
      try {
        const result = await getCotizacionClicks(cotizacion.id);
        if (result.success && result.data) {
          setClickCount(result.data.clicks);
        }
      } catch (error) {
        console.debug('[PromiseQuotesPanelCard] Failed to load click count:', error);
      }
    };

    loadClickCount();
  }, [cotizacion.id]);

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

  const getStatusVariant = (status: string, revisionStatus?: string | null, selectedByProspect?: boolean): 'default' | 'destructive' | 'secondary' | 'success' | 'warning' | 'info' => {
    // Si es revisión pendiente, usar ámbar
    if (revisionStatus === 'pending_revision') {
      return 'warning';
    }
    // En negociación - usar warning (amber)
    if (status === 'negociacion') {
      return 'warning';
    }
    // En cierre - usar info (azul)
    if (status === 'en_cierre') {
      return 'info';
    }
    // Estados de contrato (nuevos)
    if (status === 'contract_signed') {
      return 'success'; // Verde - listo para autorizar evento
    }
    if (status === 'contract_generated') {
      return 'info'; // Azul - esperando firma del cliente
    }
    if (status === 'contract_pending') {
      return 'warning'; // Ámbar - esperando confirmación de datos
    }
    // Si está aprobada (incluso si es revisión activa), usar verde
    if (status === 'aprobada' || status === 'approved' || status === 'autorizada') {
      return 'success';
    }
    // Archivada
    if (status === 'archivada') {
      return 'secondary';
    }
    // Rechazada/Cancelada
    if (status === 'rechazada' || status === 'rejected' || status === 'cancelada') {
      return 'destructive';
    }
    // Pendiente y otros estados: zinc
    return 'secondary';
  };

  const getStatusLabel = (status: string, revisionStatus?: string | null, selectedByProspect?: boolean): string => {
    // Si es revisión pendiente (no autorizada aún)
    if (revisionStatus === 'pending_revision') {
      return 'Revisión';
    }
    // En negociación
    if (status === 'negociacion') {
      return 'Negociación';
    }
    // En cierre
    if (status === 'en_cierre') {
      return 'En Cierre';
    }
    // Estados de contrato (nuevos)
    if (status === 'contract_signed') {
      return 'Contrato Firmado';
    }
    if (status === 'contract_generated') {
      return 'Contrato Generado';
    }
    if (status === 'contract_pending') {
      return 'Contrato Pendiente';
    }
    // Si está aprobada, mostrar "Aprobada" (independiente si es revisión activa o no)
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
    if (status === 'archivada') {
      return 'Archivada';
    }
    if (status === 'pendiente' || status === 'pending') {
      return 'Pendiente';
    }
    return status;
  };

  const handleClick = () => {
    // En modo selección, toggle de selección en lugar de navegar
    if (selectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }

    // Si la cotización tiene evento_id asociado, redirigir al evento
    // Esto aplica para estados: aprobada/autorizada/approved, en_cierre, contract_signed
    const estadosConEvento = ['aprobada', 'autorizada', 'approved', 'en_cierre', 'contract_signed'];
    if (estadosConEvento.includes(cotizacion.status) && cotizacion.evento_id) {
      router.push(`/${studioSlug}/studio/business/events/${cotizacion.evento_id}`);
      return;
    }

    if (!promiseId) {
      toast.error('No se puede editar la cotización sin una promesa asociada');
      return;
    }

    // Si es revisión pendiente, redirigir a página de edición de revisión
    if (cotizacion.revision_of_id && cotizacion.revision_status === 'pending_revision') {
      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}/revision`);
      return;
    }

    // Si está en negociación, redirigir a la página de negociación para editar
    if (cotizacion.status === 'negociacion') {
      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}/negociacion`);
      return;
    }

    const params = new URLSearchParams();
    if (contactId) {
      params.set('contactId', contactId);
    }
    const queryString = params.toString();
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}${queryString ? `?${queryString}` : ''}`);
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
    setEditingName(cotizacion.name);
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    const trimmedName = editingName.trim();
    if (trimmedName === cotizacion.name) {
      setShowEditNameModal(false);
      return;
    }

    // Cerrar modal primero
    setShowEditNameModal(false);

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
    setShowEditNameModal(false);
  };

  const handleToggleVisibility = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isProcessingRef.current || loading) return;

    const newVisibility = !cotizacion.visible_to_client;

    // Actualización optimista inmediata
    if (onVisibilityToggle) {
      onVisibilityToggle(cotizacion.id, newVisibility);
    }

    isProcessingRef.current = true;
    setLoading(true);
    try {
      const result = await toggleCotizacionVisibility(cotizacion.id, studioSlug);
      if (result.success) {
        toast.success(
          newVisibility
            ? 'Cotización visible para el prospecto'
            : 'Cotización ocultada del prospecto'
        );
        // Recargar desde servidor para sincronizar
        router.refresh();
      } else {
        toast.error(result.error || 'Error al cambiar visibilidad');
        // Revertir cambio optimista si falla
        if (onVisibilityToggle) {
          onVisibilityToggle(cotizacion.id, cotizacion.visible_to_client);
        }
      }
    } catch {
      toast.error('Error al cambiar visibilidad');
      // Revertir cambio optimista si falla
      if (onVisibilityToggle) {
        onVisibilityToggle(cotizacion.id, cotizacion.visible_to_client);
      }
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleToggleNegociacion = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isProcessingRef.current || loading) return;

    // Solo permitir quitar de negociación (volver a pendiente)
    if (cotizacion.status !== 'negociacion') {
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    try {
      const result = await toggleNegociacionStatus(cotizacion.id, studioSlug);
      if (result.success) {
        toast.success('Cotización vuelta a estado pendiente');
        // Recargar desde servidor para sincronizar
        router.refresh();
        onUpdate?.(cotizacion.id);
      } else {
        toast.error(result.error || 'Error al cambiar estado de negociación');
      }
    } catch {
      toast.error('Error al cambiar estado de negociación');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handlePasarACierreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!promiseId) {
      toast.error('No se puede pasar a cierre sin una promesa asociada');
      return;
    }

    // Mostrar modal informativo
    setShowClosingProcessInfoModal(true);
  };

  const handlePasarACierre = async () => {
    if (!promiseId) {
      toast.error('No se puede pasar a cierre sin una promesa asociada');
      return;
    }

    setLoading(true);
    try {
      const result = await pasarACierre(studioSlug, cotizacion.id);
      if (result.success) {
        toast.success('Cotización pasada a proceso de cierre');
        // Usar callback específico si existe, sino usar onUpdate como fallback
        if (onPasarACierre) {
          onPasarACierre(cotizacion.id);
        } else {
          onUpdate?.(cotizacion.id);
        }
        // NO cerrar el modal ni resetear loading - se mantendrá abierto durante la redirección
        // Usar window.location.href para mantener el modal visible hasta que la nueva página cargue
        window.location.href = `/${studioSlug}/studio/commercial/promises/${promiseId}/cierre`;
        return; // Salir antes del finally para mantener loading=true y modal abierto
      } else {
        toast.error(result.error || 'Error al pasar cotización a cierre');
        setShowClosingProcessInfoModal(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('[handlePasarACierre] Error:', error);
      toast.error('Error al pasar cotización a cierre');
      setShowClosingProcessInfoModal(false);
      setLoading(false);
    }
  };

  const handleCancelOnly = async () => {
    isProcessingRef.current = true;
    setLoading(true);
    try {
      const result = await cancelarCotizacion(studioSlug, cotizacion.id);
      if (result.success) {
        toast.success('Cotización cancelada exitosamente');
        setShowCancelModal(false);
        onUpdate?.(cotizacion.id);
      } else {
        toast.error(result.error || 'Error al cancelar cotización');
        setShowCancelModal(false);
      }
    } catch {
      toast.error('Error al cancelar cotización');
      setShowCancelModal(false);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleCancelWithEvent = async () => {
    isProcessingRef.current = true;
    setLoading(true);
    try {
      const result = await cancelarCotizacionYEvento(studioSlug, cotizacion.id);
      if (result.success) {
        toast.success('Cotización y evento cancelados exitosamente');
        setShowCancelModal(false);
        onUpdate?.(cotizacion.id);
      } else {
        toast.error(result.error || 'Error al cancelar cotización y evento');
        setShowCancelModal(false);
      }
    } catch {
      toast.error('Error al cancelar cotización y evento');
      setShowCancelModal(false);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleQuitarCancelacion = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessingRef.current || loading) return;

    if (cotizacion.status !== 'cancelada') {
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    try {
      const result = await quitarCancelacionCotizacion(cotizacion.id, studioSlug);
      if (result.success) {
        toast.success('Cancelación quitada, cotización vuelta a estado pendiente');
        router.refresh();
        onUpdate?.(cotizacion.id);
      } else {
        toast.error(result.error || 'Error al quitar cancelación');
      }
    } catch {
      toast.error('Error al quitar cancelación');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  // Estados simplificados usando solo status
  const isPendiente = cotizacion.status === 'pendiente';
  const isArchivada = cotizacion.status === 'archivada';
  const isCancelada = cotizacion.status === 'cancelada';
  const isNegociacion = cotizacion.status === 'negociacion';
  const isRevision = cotizacion.revision_status === 'pending_revision' || cotizacion.revision_status === 'active';

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`p-3 border rounded-lg transition-colors relative ${isArchivada
          ? 'bg-zinc-900/30 border-zinc-800/50 opacity-50 grayscale'
          : selectionMode && isSelected
            ? 'bg-emerald-950/40 border-emerald-800/30'
            : 'bg-zinc-800/50 border-zinc-700'
          } ${isArchivada ? 'cursor-default' : selectionMode ? 'cursor-pointer hover:bg-zinc-800' : 'cursor-pointer hover:bg-zinc-800'
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
          {/* Checkbox de selección o grip vertical */}
          {selectionMode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              className="p-1 -ml-1 -mt-1 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-emerald-400" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 -mt-1 text-zinc-500 hover:text-zinc-400 transition-colors shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium truncate mb-1 ${isArchivada ? 'text-zinc-500' : 'text-zinc-200'
              }`}>
              {cotizacion.name}
            </h4>
            {cotizacion.description && (
              <p className={`text-xs line-clamp-1 mb-2 ${isArchivada ? 'text-zinc-600' : 'text-zinc-400'
                }`}>
                {cotizacion.description}
              </p>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${isArchivada ? 'text-zinc-500' : 'text-emerald-400'
                  }`}>
                  ${(cotizacion.price - (cotizacion.discount || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                {isArchivada ? (
                  <ZenBadge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                  >
                    Archivada
                  </ZenBadge>
                ) : (
                  <ZenBadge
                    variant={getStatusVariant(cotizacion.status, cotizacion.revision_status, cotizacion.selected_by_prospect)}
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                  >
                    {getStatusLabel(cotizacion.status, cotizacion.revision_status, cotizacion.selected_by_prospect)}
                    {cotizacion.revision_number && cotizacion.revision_status === 'pending_revision' && (
                      <span className="ml-1">#{cotizacion.revision_number}</span>
                    )}
                  </ZenBadge>
                )}
              </div>
              {/* Mostrar precio original si hay descuento aplicado */}
              {(() => {
                const tieneDescuento = cotizacion.discount && cotizacion.discount > 0;

                if (tieneDescuento) {
                  return (
                    <div className="mt-0.5">
                      <p className={`text-[10px] ${isArchivada ? 'text-zinc-600' : 'text-zinc-500'}`}>
                        Precio original: <span className="font-semibold">
                          ${cotizacion.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
              <p className={`text-[10px] ${isArchivada ? 'text-zinc-600' : 'text-zinc-500'}`}>
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
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Ocultar botones en modo selección */}
            {!selectionMode && (
              <>
                {/* Icono de visibilidad */}
                {!(isArchivada && hasApprovedQuote) && (
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleToggleVisibility}
                    disabled={loading || isDuplicating}
                    title={cotizacion.visible_to_client ? 'Ocultar del prospecto' : 'Mostrar al prospecto'}
                  >
                    {cotizacion.visible_to_client ? (
                      <Eye className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-zinc-500" />
                    )}
                  </ZenButton>
                )}
                {/* Icono de negociación - solo mostrar si está en negociación */}
                {!(isArchivada && hasApprovedQuote) && cotizacion.status === 'negociacion' && (
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleToggleNegociacion}
                    disabled={loading || isDuplicating}
                    title="Quitar de negociación"
                  >
                    <Handshake className="h-4 w-4 text-amber-400" />
                  </ZenButton>
                )}
                {/* Ocultar menú si es archivada Y hay cotización en cierre */}
                {!(isArchivada && hasApprovedQuote) && (
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
                      {/* Menú según estado: pendiente, negociacion, archivada, cancelada */}
                      {isPendiente ? (
                        <>
                          {/* Pendiente: editar nombre, duplicar, archivar, pasar a cierre, negociar, eliminar */}
                          <ZenDropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditName(e);
                            }}
                            disabled={loading || isDuplicating}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar nombre
                          </ZenDropdownMenuItem>
                          {!isRevision && (
                            <ZenDropdownMenuItem onClick={handleDuplicate} disabled={loading || isDuplicating}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </ZenDropdownMenuItem>
                          )}
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
                          {!hasApprovedQuote && (
                            <ZenDropdownMenuItem
                              onClick={handlePasarACierreClick}
                              disabled={loading || isDuplicating || !promiseId}
                              className="text-emerald-400 focus:text-emerald-300"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Pasar a Cierre
                            </ZenDropdownMenuItem>
                          )}
                          <ZenDropdownMenuSeparator />
                          {promiseId && (
                            <ZenDropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}/negociacion`);
                              }}
                              disabled={loading || isDuplicating}
                              className="text-amber-400 focus:text-amber-300"
                            >
                              <Handshake className="h-4 w-4 mr-2" />
                              Negociar
                            </ZenDropdownMenuItem>
                          )}
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
                      ) : isNegociacion ? (
                        <>
                          {/* Negociación: editar nombre, duplicar, archivar, pasar a cierre, editar negociación, eliminar */}
                          <ZenDropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditName(e);
                            }}
                            disabled={loading || isDuplicating}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar nombre
                          </ZenDropdownMenuItem>
                          {!isRevision && (
                            <ZenDropdownMenuItem onClick={handleDuplicate} disabled={loading || isDuplicating}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </ZenDropdownMenuItem>
                          )}
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
                          {!hasApprovedQuote && (
                            <ZenDropdownMenuItem
                              onClick={handlePasarACierreClick}
                              disabled={loading || isDuplicating || !promiseId}
                              className="text-emerald-400 focus:text-emerald-300"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Pasar a Cierre
                            </ZenDropdownMenuItem>
                          )}
                          <ZenDropdownMenuSeparator />
                          {promiseId && (
                            <ZenDropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}/negociacion`);
                              }}
                              disabled={loading || isDuplicating}
                              className="text-amber-400 focus:text-amber-300"
                            >
                              <Handshake className="h-4 w-4 mr-2" />
                              Editar negociación
                            </ZenDropdownMenuItem>
                          )}
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
                      ) : isArchivada ? (
                        <>
                          {/* Archivada: duplicar, desarchivar, eliminar */}
                          {!isRevision && (
                            <ZenDropdownMenuItem onClick={handleDuplicate} disabled={loading || isDuplicating}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </ZenDropdownMenuItem>
                          )}
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
                      ) : isCancelada ? (
                        <>
                          {/* Cancelada: quitar cancelación, duplicar, eliminar */}
                          <ZenDropdownMenuItem
                            onClick={handleQuitarCancelacion}
                            disabled={loading || isDuplicating}
                            className="text-emerald-400 focus:text-emerald-300"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Quitar cancelación
                          </ZenDropdownMenuItem>
                          <ZenDropdownMenuSeparator />
                          {!isRevision && (
                            <ZenDropdownMenuItem onClick={handleDuplicate} disabled={loading || isDuplicating}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </ZenDropdownMenuItem>
                          )}
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
                      ) : null}
                    </ZenDropdownMenuContent>
                  </ZenDropdownMenu>
                )}
              </>
            )}
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

      {/* Modal de cancelación con dos opciones */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Cancelar Cotización</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Esta cotización está autorizada. ¿Qué deseas hacer?
            </p>
            <div className="flex flex-col gap-3">
              <ZenButton
                variant="outline"
                onClick={handleCancelOnly}
                disabled={loading}
                className="w-full justify-start"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar solo la cotización
              </ZenButton>
              <ZenButton
                variant="destructive"
                onClick={handleCancelWithEvent}
                disabled={loading}
                className="w-full justify-start"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar cotización y evento
              </ZenButton>
              <ZenButton
                variant="ghost"
                onClick={() => {
                  if (!isProcessingRef.current) {
                    setShowCancelModal(false);
                  }
                }}
                disabled={loading}
                className="w-full"
              >
                Cancelar
              </ZenButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición de nombre */}
      <ZenDialog
        isOpen={showEditNameModal}
        onClose={handleCancelEditName}
        title="Editar nombre de cotización"
        description="Ingresa el nuevo nombre para esta cotización"
        maxWidth="md"
        onSave={handleSaveName}
        onCancel={handleCancelEditName}
        saveLabel="Guardar"
        cancelLabel="Cancelar"
        isLoading={loading}
        closeOnClickOutside={false}
      >
        <div className="space-y-4">
          <ZenInput
            ref={inputRef}
            label="Nombre"
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
            placeholder="Nombre de la cotización"
            disabled={loading}
          />
        </div>
      </ZenDialog>

      {/* Modal informativo de proceso de cierre */}
      <ClosingProcessInfoModal
        isOpen={showClosingProcessInfoModal}
        onClose={() => {
          // No permitir cerrar mientras está procesando
          if (loading) return;
          setShowClosingProcessInfoModal(false);
        }}
        onConfirm={handlePasarACierre}
        onCancel={() => {
          // No permitir cancelar mientras está procesando
          if (loading) return;
          setShowClosingProcessInfoModal(false);
          onCierreCancelado?.(cotizacion.id);
        }}
        cotizacionName={cotizacion.name}
        isLoading={loading}
      />

    </>
  );
}

