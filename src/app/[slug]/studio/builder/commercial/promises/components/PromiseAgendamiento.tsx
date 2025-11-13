'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Edit, Plus, Video, Link as LinkIcon, X, Copy, Check } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { AgendaFormModal } from '@/components/shared/agenda';
import { obtenerAgendamientoPorPromise, eliminarAgendamiento } from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { formatDate } from '@/lib/actions/utils/formatting';
import { toast } from 'sonner';

interface PromiseAgendamientoProps {
  studioSlug: string;
  promiseId: string | null;
  isSaved: boolean;
}

export function PromiseAgendamiento({
  studioSlug,
  promiseId,
  isSaved,
}: PromiseAgendamientoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [agendamiento, setAgendamiento] = useState<AgendaItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSaved || !promiseId) return;

    const loadAgendamiento = async () => {
      setLoading(true);
      try {
        const result = await obtenerAgendamientoPorPromise(studioSlug, promiseId);
        if (result.success) {
          setAgendamiento(result.data || null);
        }
      } catch (error) {
        console.error('Error loading agendamiento:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAgendamiento();
  }, [isSaved, promiseId, studioSlug]);

  const handleSuccess = async () => {
    if (!promiseId) return;

    setLoading(true);
    try {
      const result = await obtenerAgendamientoPorPromise(studioSlug, promiseId);
      if (result.success) {
        setAgendamiento(result.data || null);
      }
    } catch (error) {
      console.error('Error loading agendamiento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!agendamiento?.id) return;

    setIsDeleting(true);
    try {
      const result = await eliminarAgendamiento(studioSlug, agendamiento.id);
      if (result.success) {
        toast.success('Agendamiento eliminado correctamente');
        setAgendamiento(null);
        setIsDeleteModalOpen(false);
      } else {
        toast.error(result.error || 'Error al eliminar agendamiento');
      }
    } catch (error) {
      console.error('Error deleting agendamiento:', error);
      toast.error('Error al eliminar agendamiento');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isSaved || !promiseId) {
    return null;
  }

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Agendamiento
            </ZenCardTitle>
            {agendamiento && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20"
              >
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </ZenButton>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-16 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
          ) : !agendamiento ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Calendar className="h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500 text-center mb-3">
                No hay agendamiento aún
              </p>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Agendar
              </ZenButton>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Fecha y Hora */}
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-400 mb-0.5">Fecha y Hora</p>
                  <p className="text-sm font-semibold text-zinc-200">
                    {formatDate(agendamiento.date)}
                  </p>
                  {agendamiento.time && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-500" />
                      <p className="text-xs text-zinc-300 font-medium">{agendamiento.time}</p>
                    </div>
                  )}
                </div>
              </div>

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

              {agendamiento.type_scheduling === 'presencial' && agendamiento.link_meeting_url && (
                <div className="flex items-start gap-2.5">
                  <LinkIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-400 mb-0.5">Link de Google Maps</p>
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

              {agendamiento.type_scheduling === 'virtual' && agendamiento.link_meeting_url && (
                <div className="flex items-start gap-2.5">
                  <LinkIcon className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-400 mb-0.5">Link de reunión virtual</p>
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

              {/* Concepto */}
              {agendamiento.concept && (
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">Concepto</p>
                  <p className="text-xs text-zinc-200 leading-relaxed">{agendamiento.concept}</p>
                </div>
              )}

              {/* Descripción */}
              {agendamiento.description && (
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">Descripción</p>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">
                    {agendamiento.description}
                  </p>
                </div>
              )}

              {/* Botón para editar */}
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="w-full text-xs text-zinc-400 hover:text-zinc-300 mt-2"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Editar agendamiento
              </ZenButton>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      <AgendaFormModal
        key={agendamiento?.id || 'new'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studioSlug={studioSlug}
        initialData={agendamiento}
        contexto="promise"
        promiseId={promiseId}
        onSuccess={handleSuccess}
      />

      <ZenConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Cancelar agendamiento"
        description="¿Estás seguro de que deseas cancelar este agendamiento? Esta acción no se puede deshacer."
        confirmText="Cancelar agendamiento"
        cancelText="Cerrar"
        variant="destructive"
        loading={isDeleting}
      />
    </>
  );
}



