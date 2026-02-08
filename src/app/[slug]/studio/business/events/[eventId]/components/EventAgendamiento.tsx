'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Plus, Copy, Star } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenConfirmModal,
} from '@/components/ui/zen';
import { AgendaFormModal } from '@/components/shared/agenda';
import { obtenerAgendamientosPorEvento, eliminarAgendamiento } from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { formatDisplayDate, formatDisplayDateShort } from '@/lib/utils/date-formatter';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EventAgendamientoProps {
  studioSlug: string;
  eventId: string;
  eventDate: Date | string | null | undefined; // Fecha principal del evento (de la promesa)
  onAgendaUpdated?: () => void;
}

export function EventAgendamiento({
  studioSlug,
  eventId,
  eventDate,
  onAgendaUpdated,
}: EventAgendamientoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedAgendamientoId, setExpandedAgendamientoId] = useState<string | null>(null);
  const [agendamientos, setAgendamientos] = useState<AgendaItem[]>([]);
  const [editingAgendamiento, setEditingAgendamiento] = useState<AgendaItem | null>(null);
  const [deletingAgendamientoId, setDeletingAgendamientoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loadAgendamientos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await obtenerAgendamientosPorEvento(studioSlug, eventId);
      if (result.success) {
        setAgendamientos(result.data || []);
      }
    } catch (error) {
      console.error('Error loading agendamientos:', error);
    } finally {
      setLoading(false);
    }
  }, [studioSlug, eventId]);

  useEffect(() => {
    loadAgendamientos();
  }, [loadAgendamientos]);

  const handleSuccess = (agendaItem?: AgendaItem) => {
    if (agendaItem) {
      if (editingAgendamiento) {
        // Actualizar agendamiento existente
        setAgendamientos((prev) =>
          prev.map((item) => (item.id === agendaItem.id ? agendaItem : item))
        );
      } else {
        // Agregar nuevo agendamiento y ordenar por fecha
        setAgendamientos((prev) => {
          const updated = [...prev, agendaItem];
          return updated.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateA - dateB;
          });
        });
      }
    } else {
      // Fallback: recargar si no se recibió el item
      loadAgendamientos();
    }
    setEditingAgendamiento(null);
    window.dispatchEvent(new CustomEvent('agenda-updated'));
    onAgendaUpdated?.();
  };

  const handleAddNew = () => {
    setEditingAgendamiento(null);
    setIsModalOpen(true);
  };

  const handleEdit = (agendamiento: AgendaItem) => {
    setEditingAgendamiento(agendamiento);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (agendamientoId: string) => {
    setDeletingAgendamientoId(agendamientoId);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAgendamientoId) return;

    const agendamientoToDelete = agendamientos.find((a) => a.id === deletingAgendamientoId);

    // Optimistic update: eliminar del estado local inmediatamente
    setAgendamientos((prev) => prev.filter((a) => a.id !== deletingAgendamientoId));
    setIsDeleteModalOpen(false);
    setDeletingAgendamientoId(null);

    setIsDeleting(true);
    try {
      const result = await eliminarAgendamiento(studioSlug, deletingAgendamientoId);
      if (result.success) {
        toast.success('Agendamiento eliminado correctamente');
        window.dispatchEvent(new CustomEvent('agenda-updated'));
        onAgendaUpdated?.();
      } else {
        // Revertir si falló
        if (agendamientoToDelete) {
          setAgendamientos((prev) => [...prev, agendamientoToDelete].sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateA - dateB;
          }));
        }
        toast.error(result.error || 'Error al eliminar agendamiento');
        setIsDeleteModalOpen(true);
        setDeletingAgendamientoId(deletingAgendamientoId);
      }
    } catch (error) {
      // Revertir si falló
      if (agendamientoToDelete) {
        setAgendamientos((prev) => [...prev, agendamientoToDelete].sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        }));
      }
      console.error('Error deleting agendamiento:', error);
      toast.error('Error al eliminar agendamiento');
      setIsDeleteModalOpen(true);
      setDeletingAgendamientoId(deletingAgendamientoId);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderAgendamientoRow = (agendamiento: AgendaItem, isMainDate = false, isLast = true) => {
    const isExpanded = expandedAgendamientoId === agendamiento.id;
    const address = agendamiento.location_address ?? agendamiento.address ?? '';
    const linkUrl = agendamiento.location_url ?? agendamiento.link_meeting_url ?? '';

    return (
      <div
        key={agendamiento.id}
        className={cn(
          'rounded-lg overflow-hidden',
          !isLast && 'border-b border-zinc-800/60'
        )}
      >
        {/* Fila resumen (header con fondo sutil, rounded-t-lg al expandir) */}
        <div
          className={cn(
            'flex items-center gap-2 w-full py-3 px-2 rounded-lg cursor-pointer select-none transition-colors duration-200 bg-zinc-900/60 hover:bg-zinc-800/40',
            isExpanded && 'rounded-b-none rounded-t-lg'
          )}
          onClick={() => setExpandedAgendamientoId((id) => (id === agendamiento.id ? null : agendamiento.id))}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setExpandedAgendamientoId((id) => (id === agendamiento.id ? null : agendamiento.id)))}
          role="button"
          tabIndex={0}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-300',
              isMainDate ? 'text-emerald-400' : 'text-amber-500',
              isExpanded && 'rotate-180'
            )}
          />
          <span className="text-xs text-zinc-400 shrink-0 w-20">
            {formatDisplayDateShort(agendamiento.date)}
          </span>
          <span className={cn('flex items-center gap-1 min-w-0 flex-1', isMainDate ? 'text-emerald-400' : 'text-amber-500')}>
            {isMainDate && <Star className="h-3 w-3 shrink-0 text-emerald-400 fill-emerald-400" />}
            <span className="text-sm font-medium truncate">{agendamiento.concept || '—'}</span>
          </span>
        </div>

        {/* Contenido expandido (seamless, sin líneas divisorias) */}
        <div
          className={cn(
            'grid transition-all duration-300 ease-in-out overflow-hidden',
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="min-h-0 overflow-hidden px-2 pt-2 pb-2 space-y-2">
            {/* Tipo de reunión */}
            <div className="flex items-center justify-between gap-3 w-full min-w-0 rounded-lg px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/50">
              <span className="text-sm text-zinc-500 shrink-0">Tipo de reunión</span>
              <span className="text-sm text-zinc-200 capitalize text-right break-words min-w-0">
                {agendamiento.type_scheduling || 'No definido'}
              </span>
            </div>

            {/* Fecha */}
            <div className="flex items-center justify-between gap-3 w-full min-w-0 rounded-lg px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/50">
              <span className="text-sm text-zinc-500 shrink-0">Fecha</span>
              <span className="text-sm text-zinc-200 text-right">
                {agendamiento.date ? formatDisplayDate(agendamiento.date) : 'No definido'}
              </span>
            </div>

            {/* Horario */}
            <div className="flex items-center justify-between gap-3 w-full min-w-0 rounded-lg px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/50">
              <span className="text-sm text-zinc-500 shrink-0">Horario</span>
              <span className="text-sm text-zinc-200 text-right">
                {agendamiento.time || 'No definido'}
              </span>
            </div>

            {/* Nombre del lugar */}
            <div className="flex items-center justify-between gap-3 w-full min-w-0 rounded-lg px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/50">
              <span className="text-sm text-zinc-500 shrink-0">Nombre del lugar</span>
              <span className="text-sm text-zinc-200 text-right break-words min-w-0">
                {agendamiento.location_name || 'No definido'}
              </span>
            </div>

            {/* Dirección */}
            <div className="flex items-center justify-between gap-3 w-full min-w-0 rounded-lg px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/50">
              <span className="text-sm text-zinc-500 shrink-0">Dirección</span>
              <span className="text-sm text-zinc-200 truncate min-w-0 flex-1 text-right">{address || 'No definido'}</span>
            </div>

            {/* Link de Google Maps / Link reunión + Copiar */}
            <div className="flex items-center justify-between gap-3 w-full min-w-0 rounded-lg px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/50">
              <span className="text-sm text-zinc-500 shrink-0">
                {agendamiento.type_scheduling === 'presencial' ? 'Link de Google Maps' : 'Link de ubicación'}
              </span>
              {linkUrl ? (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-400 hover:text-emerald-300 underline truncate min-w-0 flex-1 text-right mx-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {linkUrl}
                </a>
              ) : (
                <span className="text-sm text-zinc-200 flex-1 text-right">No definido</span>
              )}
              <button
                type="button"
                title="Copiar"
                onClick={(e) => {
                  e.stopPropagation();
                  if (linkUrl) navigator.clipboard.writeText(linkUrl).then(
                    () => toast.success(agendamiento.type_scheduling === 'presencial' ? 'Link de Google Maps copiado' : 'Link copiado'),
                    () => {}
                  );
                }}
                className="shrink-0 p-1.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors focus:outline-none disabled:opacity-50"
                disabled={!linkUrl}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            {/* Comentarios (mismo orden que modal) */}
            <div className="flex items-start justify-between gap-3 w-full min-w-0 rounded-lg px-3 py-2.5 bg-zinc-900/40 border border-zinc-800/50">
              <span className="text-sm text-zinc-500 shrink-0 pt-0.5">Comentarios</span>
              <span className="text-sm text-zinc-200 leading-relaxed text-right break-words min-w-0 flex-1">
                {(agendamiento.description?.length ?? 0) > 0 ? agendamiento.description : 'No definido'}
              </span>
            </div>

            {/* Botones de acción: Editar protagónico (2:1), Eliminar compacto */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={(e) => (e.stopPropagation(), handleEdit(agendamiento))}
                className="flex-[2] min-w-0 px-4 py-1.5 rounded-md text-xs font-medium transition-colors bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/60 focus:outline-none text-center"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={(e) => (e.stopPropagation(), handleDeleteClick(agendamiento.id))}
                disabled={isDeleting}
                className="flex-1 min-w-0 px-4 py-1.5 rounded-md text-xs font-medium transition-colors bg-red-950/20 text-red-500/80 hover:bg-red-900/30 focus:outline-none disabled:opacity-50 text-center"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Orden cronológico ascendente: la fecha más antigua arriba
  const sortedAgenda = [...agendamientos].sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return ta - tb;
  });

  // Saber si un agendamiento coincide con la fecha principal del evento (para color Esmeralda)
  const isMainDate = (a: AgendaItem) => {
    if (!a.date || !eventDate) return false;
    const eventDateObj = eventDate instanceof Date ? eventDate : new Date(eventDate);
    if (isNaN(eventDateObj.getTime())) return false;
    const agendaDateOnly = new Date(Date.UTC(
      new Date(a.date).getUTCFullYear(),
      new Date(a.date).getUTCMonth(),
      new Date(a.date).getUTCDate()
    ));
    const eventDateOnly = new Date(Date.UTC(
      eventDateObj.getUTCFullYear(),
      eventDateObj.getUTCMonth(),
      eventDateObj.getUTCDate()
    ));
    return agendaDateOnly.getTime() === eventDateOnly.getTime();
  };

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Agenda
            </ZenCardTitle>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleAddNew}
              className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
            >
              <Plus className="h-3 w-3 mr-1" />
              Agregar
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-32 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sortedAgenda.map((a, i) =>
                renderAgendamientoRow(a, isMainDate(a), i === sortedAgenda.length - 1)
              )}

              {eventDate && !sortedAgenda.some(isMainDate) && (
                <div className="flex items-center gap-2 py-2 px-2 rounded-lg text-zinc-500">
                  <Star className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-emerald-400">Fecha Principal</span>
                  <span className="text-xs text-zinc-400">{formatDisplayDateShort(eventDate)}</span>
                </div>
              )}

              {agendamientos.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-zinc-500 mb-2">No hay agendamientos</p>
                  <p className="text-xs text-zinc-600">Agrega citas virtuales, presenciales o sesiones</p>
                </div>
              )}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Modal para crear/editar agendamiento */}
      {isModalOpen && (
        <AgendaFormModal
          key={editingAgendamiento?.id || 'new'}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAgendamiento(null);
          }}
          studioSlug={studioSlug}
          initialData={editingAgendamiento}
          contexto="evento"
          eventoId={eventId}
          onSuccess={handleSuccess}
        />
      )}

      {/* Modal de confirmación para eliminar */}
      {isDeleteModalOpen && (
        <ZenConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false);
              setDeletingAgendamientoId(null);
            }
          }}
          onConfirm={handleDelete}
          title="Eliminar agendamiento"
          description="¿Estás seguro de que deseas eliminar este agendamiento? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
          loading={isDeleting}
          loadingText="Eliminando..."
        />
      )}
    </>
  );
}

