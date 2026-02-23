'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import Link from 'next/link';
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
import { ClosingProcessInfoModal } from '../../../components/ClosingProcessInfoModal';
import { getReminderByPromise, deleteReminder } from '@/lib/actions/studio/commercial/promises/reminders.actions';

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
  onQuitarCancelacion?: (id: string) => void;
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
  onQuitarCancelacion,
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
  const [reminder, setReminder] = useState<{
    id: string;
    subject_text: string;
    reminder_date: Date;
    description?: string | null;
  } | null>(null);
  const [loadingReminder, setLoadingReminder] = useState(false);

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

  /** href para Link: misma ruta que handleClick (edición, negociación o evento). */
  const getHref = (): string => {
    const estadosConEvento = ['aprobada', 'autorizada', 'approved', 'en_cierre', 'contract_signed'];
    if (estadosConEvento.includes(cotizacion.status) && cotizacion.evento_id) {
      return `/${studioSlug}/studio/business/events/${cotizacion.evento_id}`;
    }
    if (!promiseId) return '#';
    const params = new URLSearchParams();
    if (contactId) params.set('contactId', contactId);
    const qs = params.toString();
    const base = `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`;
    if (cotizacion.status === 'negociacion') {
      return `/${studioSlug}/studio/commercial/promises/${promiseId}/cierre`;
    }
    return qs ? `${base}?${qs}` : base;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode && onToggleSelect) {
      e.preventDefault();
      onToggleSelect();
      return;
    }
    if (getHref() === '#') {
      e.preventDefault();
      toast.error('No se puede editar la cotización sin una promesa asociada');
      return;
    }
    window.dispatchEvent(new CustomEvent('close-overlays'));
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
      // Marcar cambio local ANTES de hacer la llamada al servidor
      // para evitar que realtime recargue el componente
      onArchive?.(cotizacion.id);
      
      const result = await archiveCotizacion(cotizacion.id, studioSlug);
      if (result.success) {
        toast.success('Cotización archivada exitosamente');
        setShowArchiveModal(false);
      } else {
        toast.error(result.error || 'Error al archivar cotización');
        setShowArchiveModal(false);
        // El componente padre manejará la recarga si es necesario
      }
    } catch {
      toast.error('Error al archivar cotización');
      setShowArchiveModal(false);
      // El componente padre manejará la recarga si es necesario
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleUnarchive = async () => {
    isProcessingRef.current = true;
    setLoading(true);
    try {
      // Marcar cambio local ANTES de hacer la llamada al servidor
      // para evitar que realtime recargue el componente
      onUnarchive?.(cotizacion.id);
      
      const result = await unarchiveCotizacion(cotizacion.id, studioSlug);
      if (result.success) {
        toast.success('Cotización desarchivada exitosamente');
        setShowUnarchiveModal(false);
      } else {
        toast.error(result.error || 'Error al desarchivar cotización');
        setShowUnarchiveModal(false);
        // Revertir cambio local si falló
        // El componente padre manejará la recarga si es necesario
      }
    } catch {
      toast.error('Error al desarchivar cotización');
      setShowUnarchiveModal(false);
      // El componente padre manejará la recarga si es necesario
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

  const handlePasarACierreClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!promiseId) {
      toast.error('No se puede pasar a cierre sin una promesa asociada');
      return;
    }

    // Cargar recordatorio asociado a la promesa
    setLoadingReminder(true);
    try {
      const reminderResult = await getReminderByPromise(studioSlug, promiseId);
      if (reminderResult.success && reminderResult.data && !reminderResult.data.is_completed) {
        setReminder({
          id: reminderResult.data.id,
          subject_text: reminderResult.data.subject_text,
          reminder_date: reminderResult.data.reminder_date,
          description: reminderResult.data.description,
        });
      } else {
        setReminder(null);
      }
    } catch (error) {
      console.error('[handlePasarACierreClick] Error cargando recordatorio:', error);
      setReminder(null);
    } finally {
      setLoadingReminder(false);
      // Mostrar modal informativo después de cargar el recordatorio
      setShowClosingProcessInfoModal(true);
    }
  };

  const handlePasarACierre = async (shouldDeleteReminder: boolean = false) => {
    if (!promiseId) {
      toast.error('No se puede pasar a cierre sin una promesa asociada');
      return;
    }

    setLoading(true);
    try {
      // Eliminar recordatorio si el usuario lo solicitó
      if (shouldDeleteReminder && reminder) {
        try {
          const deleteResult = await deleteReminder(studioSlug, reminder.id);
          if (deleteResult.success) {
            toast.success('Recordatorio eliminado');
          } else {
            console.warn('[handlePasarACierre] Error eliminando recordatorio:', deleteResult.error);
            // Continuar con el proceso aunque falle la eliminación del recordatorio
          }
        } catch (error) {
          console.error('[handlePasarACierre] Error eliminando recordatorio:', error);
          // Continuar con el proceso aunque falle la eliminación del recordatorio
        }
      }

      const result = await pasarACierre(studioSlug, cotizacion.id);
      if (result.success) {
        toast.success('Cotización pasada a proceso de cierre');
        // Usar callback específico si existe, sino usar onUpdate como fallback
        if (onPasarACierre) {
          onPasarACierre(cotizacion.id);
        } else {
          onUpdate?.(cotizacion.id);
        }
        // Cerrar modal y navegar usando metodología ZEN
        setShowClosingProcessInfoModal(false);
        setReminder(null); // Limpiar recordatorio
        window.dispatchEvent(new CustomEvent('close-overlays'));
        // Forzar refresh del router para asegurar que determinePromiseState obtenga datos actualizados
        router.refresh();
        startTransition(() => {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cierre`);
        });
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
        onQuitarCancelacion?.(cotizacion.id);
        router.refresh();
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

  const href = getHref();
  const cardClassName = `p-3 border rounded-lg transition-colors relative no-underline text-inherit block ${isArchivada
    ? 'bg-zinc-900/30 border-zinc-800/50 opacity-50 grayscale'
    : selectionMode && isSelected
      ? 'bg-emerald-950/40 border-emerald-800/30'
      : 'bg-zinc-800/50 border-zinc-700'
  } ${isArchivada ? 'cursor-default' : 'cursor-pointer hover:bg-zinc-800'}`;

  return (
    <>
      <Link
        ref={setNodeRef}
        style={style}
        href={href}
        className={cardClassName}
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
                  ${(cotizacion.total_a_pagar ?? cotizacion.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                {/* Icono de visibilidad - ocultar si está archivada */}
                {!isArchivada && (
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
                          {/* Archivada: solo desarchivar y eliminar */}
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
      </Link>

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
          if (loading || loadingReminder) return;
          setShowClosingProcessInfoModal(false);
          setReminder(null);
        }}
        onConfirm={handlePasarACierre}
        onCancel={() => {
          // No permitir cancelar mientras está procesando
          if (loading || loadingReminder) return;
          setShowClosingProcessInfoModal(false);
          setReminder(null);
          onCierreCancelado?.(cotizacion.id);
        }}
        cotizacionName={cotizacion.name}
        reminder={reminder}
        isLoading={loading || loadingReminder}
      />

    </>
  );
}

