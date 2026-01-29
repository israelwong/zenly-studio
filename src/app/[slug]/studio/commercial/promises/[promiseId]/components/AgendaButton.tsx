'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import { ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { obtenerAgendamientoPorPromise, eliminarAgendamiento } from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { getRelativeDateLabel } from '@/lib/utils/date-formatter';
import { AgendaFormModal } from '@/components/shared/agenda';

interface AgendaButtonProps {
  studioSlug: string;
  promiseId: string;
  eventoId?: string | null;
}

export function AgendaButton({ studioSlug, promiseId, eventoId }: AgendaButtonProps) {
  const router = useRouter();
  const [agendamiento, setAgendamiento] = useState<AgendaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAgendamiento();
  }, [studioSlug, promiseId]);

  const loadAgendamiento = async () => {
    setLoading(true);
    try {
      const result = await obtenerAgendamientoPorPromise(studioSlug, promiseId);
      if (result.success) {
        setAgendamiento(result.data || null);
      }
    } catch (error) {
      console.error('Error cargando agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAgenda = !!agendamiento;
  const isDisabled = !!eventoId;
  const dateStatus = hasAgenda
    ? getRelativeDateLabel(agendamiento.date, { pastLabel: 'Vencida', futureVariant: 'success' })
    : null;
  const timeSuffix = hasAgenda && agendamiento?.time ? ` · ${agendamiento.time}` : '';
  const tipoLabel =
    hasAgenda && agendamiento?.type_scheduling
      ? agendamiento.type_scheduling === 'presencial'
        ? 'Presencial'
        : 'Virtual'
      : null;
  const canDelete = hasAgenda && !isDisabled && agendamiento?.id;

  const handleDeleteAgendamiento = async () => {
    if (!agendamiento?.id) return;
    setDeleting(true);
    try {
      const result = await eliminarAgendamiento(studioSlug, agendamiento.id);
      if (result.success) {
        toast.success('Agendamiento eliminado correctamente');
        setAgendamiento(null);
        setShowDeleteConfirm(false);
        loadAgendamiento();
        window.dispatchEvent(new CustomEvent('agenda-updated'));
        router.refresh();
      } else {
        toast.error(result.error || 'Error al eliminar agendamiento');
      }
    } catch (error) {
      console.error('Error eliminando agendamiento:', error);
      toast.error('Error al eliminar agendamiento');
    } finally {
      setDeleting(false);
    }
  };

  const buttonClass =
    !hasAgenda
      ? ''
      : dateStatus?.variant === 'destructive'
        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/15 hover:border-rose-500/30'
        : dateStatus?.variant === 'warning'
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/30'
          : dateStatus?.variant === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/30'
            : 'bg-zinc-800/80 text-zinc-300 border border-zinc-600/50 hover:bg-zinc-700/80 hover:border-zinc-500/50';

  if (loading) {
    return (
      <ZenButton
        variant="ghost"
        size="sm"
        disabled
        className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
      >
        <Calendar className="h-3.5 w-3.5 animate-pulse" />
        <span>Cargando...</span>
      </ZenButton>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={() => !isDisabled && setModalOpen(true)}
          disabled={isDisabled}
          className={`gap-1.5 px-2.5 py-1.5 h-7 text-xs rounded-md transition-colors cursor-pointer ${buttonClass} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={
            isDisabled
              ? 'No se pueden gestionar citas cuando el evento ya está creado'
              : hasAgenda
                ? 'Editar agendamiento'
                : 'Agendar cita'
          }
        >
          {hasAgenda ? (
            <>
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">{tipoLabel ? `Cita ${tipoLabel}` : 'Cita'}</span>
              {dateStatus && (
                <span className="text-white font-normal">{dateStatus.text}{timeSuffix}</span>
              )}
            </>
          ) : (
            <>
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Agendar cita</span>
            </>
          )}
        </ZenButton>
        {canDelete && (
          <ZenButton
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            title="Eliminar agendamiento"
            aria-label="Eliminar agendamiento"
          >
            <X className="h-3.5 w-3.5" />
          </ZenButton>
        )}
      </div>

      <ZenConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAgendamiento}
        title="Eliminar agendamiento"
        description="¿Eliminar este agendamiento? No se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={deleting}
      />

      {modalOpen && (
        <AgendaFormModal
          key={agendamiento?.id || 'new'}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          studioSlug={studioSlug}
          initialData={agendamiento}
          contexto="promise"
          promiseId={promiseId}
          onSuccess={() => {
            loadAgendamiento();
            setModalOpen(false);
            window.dispatchEvent(new CustomEvent('agenda-updated'));
            router.refresh();
          }}
        />
      )}
    </>
  );
}
