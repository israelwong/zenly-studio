'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Clock, Edit, Plus, Video, Link as LinkIcon, X, Copy, Check, Star, MoreVertical } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenConfirmModal,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
      {/* Menú dropdown en esquina superior derecha (solo para agendamientos adicionales) */}
      {!isMainDate && (
        <div className="absolute top-3 right-3">
          <ZenDropdownMenu open={openMenuId === agendamiento.id} onOpenChange={(open) => setOpenMenuId(open ? agendamiento.id : null)}>
            <ZenDropdownMenuTrigger asChild>
              <ZenButton
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
              >
                <MoreVertical className="h-4 w-4" />
              </ZenButton>
            </ZenDropdownMenuTrigger>
            <ZenDropdownMenuContent align="end">
              <ZenDropdownMenuItem
                onClick={() => {
                  handleEdit(agendamiento);
                  setOpenMenuId(null);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </ZenDropdownMenuItem>
              <ZenDropdownMenuSeparator />
              <ZenDropdownMenuItem
                onClick={() => {
                  handleDeleteClick(agendamiento.id);
                  setOpenMenuId(null);
                }}
                className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
              >
                <X className="mr-2 h-4 w-4" />
                Eliminar
              </ZenDropdownMenuItem>
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
        </div>
      )}

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
        {/* Para fecha principal, mostrar solo fecha sin label */}
        {isMainDate && (
          <div className="flex items-start gap-2.5">
            <Calendar className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isMainDate ? 'text-emerald-200' : 'text-zinc-200'}`}>
                {formatDisplayDate(agendamiento.date)}
              </p>
              {agendamiento.time && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock className={`h-3.5 w-3.5 ${isMainDate ? 'text-emerald-500' : 'text-zinc-500'}`} />
                  <p className="text-xs text-zinc-300 font-medium">{agendamiento.time}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tipo de reunión */}
        {agendamiento.type_scheduling && (
          <div className="flex items-center gap-2">
            {agendamiento.type_scheduling === 'presencial' ? (
              <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" />
            ) : (
              <Video className="h-4 w-4 text-purple-400 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-400 mb-0.5">Tipo de reunión</p>
              <p className="text-xs font-semibold text-zinc-200 capitalize">
                {agendamiento.type_scheduling}
              </p>
            </div>
          </div>
        )}

        {/* Dirección o Link */}
        {agendamiento.type_scheduling === 'presencial' && agendamiento.address && (
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-400 mb-0.5">Dirección</p>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {agendamiento.address}
              </p>
            </div>
          </div>
        )}

        {(agendamiento.type_scheduling === 'presencial' || agendamiento.type_scheduling === 'virtual') &&
          agendamiento.link_meeting_url && (
            <div className="flex items-start gap-2.5">
              <LinkIcon
                className={`h-4 w-4 ${agendamiento.type_scheduling === 'presencial' ? 'text-blue-400' : 'text-purple-400'} mt-0.5 flex-shrink-0`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-400 mb-0.5">
                  {agendamiento.type_scheduling === 'presencial'
                    ? 'Link de Google Maps'
                    : 'Link de reunión virtual'}
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={agendamiento.link_meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline truncate flex-1"
                  >
                    {agendamiento.link_meeting_url}
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(agendamiento.link_meeting_url || '');
                        setCopiedLink(agendamiento.link_meeting_url || null);
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
                    {copiedLink === agendamiento.link_meeting_url ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Nombre o descripción (ocultar para fecha principal) */}
        {!isMainDate && (agendamiento.description || agendamiento.concept) && (
          <div className="pt-2 border-t border-zinc-700/30">
            <p className="text-xs text-zinc-300 leading-relaxed">
              {agendamiento.description || agendamiento.concept}
            </p>
          </div>
        )}

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

