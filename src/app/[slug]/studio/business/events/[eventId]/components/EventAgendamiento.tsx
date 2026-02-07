'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Clock, Edit, Plus, Video, Link as LinkIcon, Copy, Check, Star, Trash2 } from 'lucide-react';
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
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { toast } from 'sonner';

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
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
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

  const renderAgendamientoCard = (agendamiento: AgendaItem, isMainDate = false) => (
    <div
      key={agendamiento.id}
      className={`p-4 rounded-lg border relative ${isMainDate
        ? 'bg-emerald-950/20 border-emerald-500/30'
        : 'bg-zinc-800/50 border-zinc-700/50'
        }`}
    >
      {isMainDate && (
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400">Fecha Principal del Evento</span>
        </div>
      )}

      <div className="space-y-3">
        {/* Fecha y Hora */}
        {!isMainDate && (
          <div className="flex items-start gap-2.5">
            <Calendar className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-400 mb-0.5">Fecha y Hora</p>
              <p className="text-sm font-semibold text-zinc-200">
                {formatDisplayDate(agendamiento.date)}
              </p>
              {agendamiento.time && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <p className="text-xs text-zinc-300 font-medium">{agendamiento.time}</p>
                </div>
              )}
            </div>
          </div>
        )}
        {isMainDate && (
          <div className="flex items-start gap-2.5">
            <Calendar className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-200">
                {formatDisplayDate(agendamiento.date)}
              </p>
              {agendamiento.time && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-xs text-zinc-300 font-medium">{agendamiento.time}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Encabezado: Asunto | icono editar | icono eliminar */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Asunto</p>
            <p className="text-xs text-zinc-200 leading-relaxed">
              {agendamiento.concept || '—'}
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(agendamiento)}
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-400"
              title="Editar agendamiento"
              aria-label="Editar"
            >
              <Edit className="h-3.5 w-3.5" />
            </ZenButton>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(agendamiento.id)}
              disabled={isDeleting}
              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
              title="Eliminar agendamiento"
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </ZenButton>
          </div>
        </div>

        {/* Tipo de reunión */}
        <div className="flex items-center gap-2">
          {agendamiento.type_scheduling === 'presencial' ? (
            <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" />
          ) : (
            <Video className="h-4 w-4 text-purple-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Tipo de reunión</p>
            <p className="text-xs font-semibold text-zinc-200 capitalize">
              {agendamiento.type_scheduling || '—'}
            </p>
          </div>
        </div>

        {/* Descripción */}
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Descripción</p>
            <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">
              {agendamiento.description || '—'}
            </p>
          </div>
        </div>

        {/* Nombre del lugar */}
        {(agendamiento.location_name || agendamiento.type_scheduling === 'presencial') && (
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-400 mb-0.5">Nombre del lugar</p>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {agendamiento.location_name || '—'}
              </p>
            </div>
          </div>
        )}

        {/* Dirección: valor o badge Pendiente */}
        <div className="flex items-start gap-2.5">
          <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Dirección</p>
            {(agendamiento.location_address ?? agendamiento.address) ? (
              <p className="text-xs text-zinc-300 leading-relaxed">
                {agendamiento.type_scheduling === 'presencial'
                  ? (agendamiento.location_address ?? agendamiento.address)
                  : '—'}
              </p>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Pendiente
              </span>
            )}
          </div>
        </div>

        {/* Link Google Maps / Link reunión virtual: valor o badge Pendiente */}
        <div className="flex items-start gap-2.5">
          <LinkIcon
            className={`h-4 w-4 mt-0.5 flex-shrink-0 ${agendamiento.type_scheduling === 'presencial' ? 'text-blue-400' : 'text-purple-400'}`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">
              {agendamiento.type_scheduling === 'presencial'
                ? 'Link de Google Maps'
                : 'Link de reunión virtual'}
            </p>
            {(agendamiento.location_url ?? agendamiento.link_meeting_url) ? (
              <div className="flex items-center gap-2">
                <a
                  href={agendamiento.location_url ?? agendamiento.link_meeting_url ?? ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline truncate flex-1"
                >
                  {agendamiento.location_url ?? agendamiento.link_meeting_url}
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const url = agendamiento.location_url ?? agendamiento.link_meeting_url ?? '';
                      await navigator.clipboard.writeText(url);
                      setCopiedLink(url || null);
                      toast.success('Link copiado al portapapeles');
                      setTimeout(() => setCopiedLink(null), 2000);
                    } catch (error) {
                      console.error('Error copying to clipboard:', error);
                      toast.error('Error al copiar link');
                    }
                  }}
                  className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                  title="Copiar link"
                >
                  {copiedLink === (agendamiento.location_url ?? agendamiento.link_meeting_url) ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Pendiente
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Verificar si hay un agendamiento con la fecha principal usando métodos UTC
  const mainDateAgendamiento = agendamientos.find((a) => {
    if (!a.date) return false;
    if (!eventDate) return false;
    
    // Asegurar que eventDate sea un objeto Date
    const eventDateObj = eventDate instanceof Date ? eventDate : new Date(eventDate);
    if (isNaN(eventDateObj.getTime())) return false;
    
    // Comparar solo fechas (sin hora) usando métodos UTC
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
  });

  // Agendamientos adicionales (excluyendo el principal si existe)
  const additionalAgendamientos = agendamientos.filter(
    (a) => !mainDateAgendamiento || a.id !== mainDateAgendamiento.id
  );

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
            <div className="space-y-4">
              {/* Fecha Principal del Evento */}
              {mainDateAgendamiento ? (
                renderAgendamientoCard(mainDateAgendamiento, true)
              ) : (
                <div className="p-4 rounded-lg border bg-emerald-950/20 border-emerald-500/30">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Star className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">Fecha Principal del Evento</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Calendar className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-200">
                        {formatDisplayDate(eventDate)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Agendamientos Adicionales */}
              {additionalAgendamientos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    <p className="text-xs font-semibold text-zinc-400">Agendamientos Adicionales</p>
                  </div>
                  {additionalAgendamientos.map((agendamiento) =>
                    renderAgendamientoCard(agendamiento, false)
                  )}
                </div>
              )}

              {/* Mensaje cuando no hay agendamientos adicionales */}
              {additionalAgendamientos.length === 0 && !mainDateAgendamiento && (
                <div className="text-center py-4">
                  <p className="text-xs text-zinc-500 mb-2">
                    No hay agendamientos adicionales
                  </p>
                  <p className="text-xs text-zinc-600">
                    Puedes agregar citas virtuales, presenciales o sesiones previas
                  </p>
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

