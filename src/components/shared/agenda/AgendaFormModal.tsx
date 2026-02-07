'use client';

import React, { useState } from 'react';
import { ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import { AgendaForm } from './AgendaForm';
import { toast } from 'sonner';
import {
  crearAgendamiento,
  actualizarAgendamiento,
  eliminarAgendamiento,
  type AgendaItem,
} from '@/lib/actions/shared/agenda-unified.actions';

interface AgendaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  initialData?: AgendaItem | null;
  contexto?: 'promise' | 'evento';
  promiseId?: string | null;
  eventoId?: string | null;
  onSuccess?: (agendaItem?: AgendaItem) => void;
}

export function AgendaFormModal({
  isOpen,
  onClose,
  studioSlug,
  initialData,
  contexto,
  promiseId,
  eventoId,
  onSuccess,
}: AgendaFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (data: {
    date: Date;
    time?: string;
    address?: string;
    concept?: string;
    description?: string;
    link_meeting_url?: string;
    type_scheduling?: 'presencial' | 'virtual';
    agenda_tipo?: string;
    location_name?: string;
    location_address?: string;
    location_url?: string;
  }) => {
    setLoading(true);

    try {
      // Determinar contexto si no está especificado
      const finalContexto = contexto || (initialData?.contexto as 'promise' | 'evento' | undefined) || 'promise';

      if (initialData) {
        // Actualizar
        const result = await actualizarAgendamiento(studioSlug, {
          id: initialData.id,
          date: data.date,
          time: data.time,
          address: data.address,
          concept: data.concept,
          description: data.description,
          link_meeting_url: data.link_meeting_url,
          type_scheduling: data.type_scheduling,
          agenda_tipo: data.agenda_tipo,
          location_name: data.location_name,
          location_address: data.location_address,
          location_url: data.location_url,
        });

        if (result.success) {
          toast.success('Agendamiento actualizado');
          onSuccess?.(result.data);
          window.dispatchEvent(new CustomEvent('agenda-updated'));
          onClose();
        } else {
          toast.error(result.error || 'Error al actualizar agendamiento');
        }
      } else {
        // Crear
        const result = await crearAgendamiento(studioSlug, {
          contexto: finalContexto,
          promise_id: promiseId || undefined,
          evento_id: eventoId || undefined,
          date: data.date,
          time: data.time,
          address: data.address,
          concept: data.concept,
          description: data.description,
          link_meeting_url: data.link_meeting_url,
          type_scheduling: data.type_scheduling,
          agenda_tipo: data.agenda_tipo,
          location_name: data.location_name,
          location_address: data.location_address,
          location_url: data.location_url,
        });

        if (result.success) {
          toast.success('Agendamiento creado');
          onSuccess?.(result.data);
          window.dispatchEvent(new CustomEvent('agenda-updated'));
          onClose();
        } else {
          toast.error(result.error || 'Error al crear agendamiento');
        }
      }
    } catch (error) {
      console.error('Error in agenda form:', error);
      toast.error('Error al procesar agendamiento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;

    setIsDeleting(true);
    try {
      const result = await eliminarAgendamiento(studioSlug, initialData.id);
      if (result.success) {
        toast.success('Agendamiento eliminado correctamente');
        onSuccess?.(undefined);
        window.dispatchEvent(new CustomEvent('agenda-updated'));
        onClose();
      } else {
        toast.error(result.error || 'Error al eliminar agendamiento');
      }
    } catch (error) {
      console.error('Error deleting agendamiento:', error);
      toast.error('Error al eliminar agendamiento');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const title = initialData ? 'Editar Agendamiento' : 'Nuevo Agendamiento';
  const description = contexto
    ? `Agendamiento para ${contexto === 'promise' ? 'promesa' : 'evento'}`
    : 'Crear un nuevo agendamiento';

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="md"
    >
      <AgendaForm
        studioSlug={studioSlug}
        initialData={initialData || undefined}
        contexto={contexto}
        promiseId={promiseId}
        eventoId={eventoId}
        onSubmit={handleSubmit}
        onCancel={onClose}
        onDelete={initialData ? () => setIsDeleteModalOpen(true) : undefined}
        loading={loading}
      />
      {isDeleteModalOpen && (
        <ZenConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false);
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
    </ZenDialog>
  );
}

