'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Plus, Video, Link as LinkIcon, Edit, Copy, Check, Trash2 } from 'lucide-react';
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
  eventoId?: string | null; // Si existe, deshabilitar creación de citas
}

export function PromiseAgendamiento({
  studioSlug,
  promiseId,
  isSaved,
  eventoId,
}: PromiseAgendamientoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [agendamiento, setAgendamiento] = useState<AgendaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [justDeleted, setJustDeleted] = useState(false);

  useEffect(() => {
    if (!isSaved || !promiseId || justDeleted) return;

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
  }, [isSaved, promiseId, studioSlug, justDeleted]);

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
        window.dispatchEvent(new CustomEvent('agenda-updated'));

        // Marcar que acabamos de eliminar para prevenir re-fetch
        setJustDeleted(true);

        // Actualizar estados inmediatamente
        setAgendamiento(null);
        setIsDeleting(false);

        // Cerrar modales (esto desmontará los componentes)
        setIsDeleteModalOpen(false);
        setIsModalOpen(false);

        // Resetear flag después de un momento
        setTimeout(() => setJustDeleted(false), 500);
      } else {
        toast.error(result.error || 'Error al eliminar agendamiento');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting agendamiento:', error);
      toast.error('Error al eliminar agendamiento');
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
              Agenda de citas con prospecto
            </ZenCardTitle>
            {!agendamiento ? (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                disabled={!!eventoId}
                className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                title={eventoId ? "No se pueden crear citas cuando el evento ya está creado" : "Agendar"}
                aria-label="Agendar"
              >
                <Plus className="h-3.5 w-3.5" />
              </ZenButton>
            ) : (
              <div className="flex items-center gap-1">
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  disabled={!!eventoId}
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={eventoId ? "No se pueden editar citas cuando el evento ya está creado" : "Editar agendamiento"}
                  aria-label="Editar agendamiento"
                >
                  <Edit className="h-3.5 w-3.5" />
                </ZenButton>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={!!eventoId || isDeleting}
                  className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={eventoId ? "No se pueden eliminar citas cuando el evento ya está creado" : "Eliminar agendamiento"}
                  aria-label="Eliminar agendamiento"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </ZenButton>
              </div>
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
              <p className="text-xs text-zinc-500 text-center">
                No hay agendamiento aún
              </p>
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

              {/* Dirección: valor o Pendiente */}
              {agendamiento.type_scheduling === 'presencial' && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-400 mb-0.5">Dirección</p>
                    {(agendamiento.location_address ?? agendamiento.address) ? (
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {agendamiento.location_address ?? agendamiento.address}
                      </p>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Link Google Maps (presencial) o Link reunión virtual: valor o Pendiente */}
              {agendamiento.type_scheduling === 'presencial' && (
                <div className="flex items-start gap-2.5">
                  <LinkIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-400 mb-0.5">Link de Google Maps</p>
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
              )}

              {agendamiento.type_scheduling === 'virtual' && (
                <div className="flex items-start gap-2.5">
                  <LinkIcon className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-400 mb-0.5">Link de reunión virtual</p>
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
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Solo renderizar AgendaFormModal cuando está abierto */}
      {isModalOpen && (
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
      )}

      {/* Solo renderizar ZenConfirmModal cuando está abierto */}
      {isDeleteModalOpen && (
        <ZenConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false);
            }
          }}
          onConfirm={handleDelete}
          title="Cancelar agendamiento"
          description="¿Estás seguro de que deseas cancelar este agendamiento? Esta acción no se puede deshacer."
          confirmText="Cancelar agendamiento"
          cancelText="Cerrar"
          variant="destructive"
          loading={isDeleting}
          loadingText="Eliminando..."
        />
      )}
    </>
  );
}



