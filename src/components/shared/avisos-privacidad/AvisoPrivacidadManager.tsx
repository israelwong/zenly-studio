'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  obtenerAvisosPrivacidad,
  crearAvisoPrivacidad,
  actualizarAvisoPrivacidad,
} from '@/lib/actions/studio/config/avisos-privacidad.actions';
import { RichTextEditor } from './RichTextEditor';
import type { AvisoPrivacidadForm } from '@/lib/actions/schemas/avisos-privacidad-schemas';
import { toast } from 'sonner';

interface AvisoPrivacidad {
  id: string;
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface AvisoPrivacidadManagerProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function AvisoPrivacidadManager({
  studioSlug,
  isOpen,
  onClose,
  onRefresh,
}: AvisoPrivacidadManagerProps) {
  const [avisos, setAvisos] = useState<AvisoPrivacidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
  const [formData, setFormData] = useState({
    content: '',
    version: '1.0',
  });
  const [initialFormData, setInitialFormData] = useState({
    content: '',
    version: '1.0',
  });
  const [formErrors, setFormErrors] = useState<{
    content?: string[];
  }>({});
  const autoOpenedRef = React.useRef(false);

  useEffect(() => {
    if (isOpen) {
      autoOpenedRef.current = false;
      setLoading(true); // Set loading immediately when opening
      loadAvisos();
    } else {
      autoOpenedRef.current = false;
      // Reset form when closing
      setEditingId(null);
      const emptyForm = {
        content: '',
        version: '1.0',
      };
      setFormData(emptyForm);
      setInitialFormData(emptyForm);
      setFormErrors({});
      setLoading(true); // Reset loading state when closing
    }
  }, [isOpen, studioSlug]);

  const loadAvisos = async () => {
    try {
      setLoading(true);
      const result = await obtenerAvisosPrivacidad(studioSlug);

      if (result.success && result.data) {
        setAvisos(result.data);
        // Preparar formulario después de cargar
        const activeAviso = result.data.find((a: AvisoPrivacidad) => a.is_active);
        if (activeAviso) {
          // Editar aviso existente
          setEditingId(activeAviso.id);
          setFormData({
            content: activeAviso.content,
            version: activeAviso.version,
          });
          setInitialFormData({
            content: activeAviso.content,
            version: activeAviso.version,
          });
        } else {
          // Crear nuevo aviso si no existe
          setEditingId(null);
          const emptyForm = {
            content: '',
            version: '1.0',
          };
          setFormData(emptyForm);
          setInitialFormData(emptyForm);
        }
        setFormErrors({});
        autoOpenedRef.current = true;
      } else {
        toast.error(result.error || 'Error al cargar avisos de privacidad');
        setAvisos([]); // Set empty array on error
        // Preparar formulario vacío en caso de error
        setEditingId(null);
        const emptyForm = {
          content: '',
          version: '1.0',
        };
        setFormData(emptyForm);
        setInitialFormData(emptyForm);
        setFormErrors({});
        autoOpenedRef.current = true;
      }
    } catch (error) {
      console.error('Error loading avisos:', error);
      toast.error('Error al cargar avisos de privacidad');
      setAvisos([]); // Set empty array on error
      // Preparar formulario vacío en caso de error
      setEditingId(null);
      const emptyForm = {
        content: '',
        version: '1.0',
      };
      setFormData(emptyForm);
      setInitialFormData(emptyForm);
      setFormErrors({});
      autoOpenedRef.current = true;
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedChanges = () => {
    return formData.content !== initialFormData.content;
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setPendingClose(() => onClose);
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setEditingId(null);
    const emptyForm = {
      content: '',
      version: '1.0',
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFormErrors({});
    setShowConfirmClose(false);
    if (pendingClose) {
      pendingClose();
      setPendingClose(null);
    }
  };

  const handleCancelClose = () => {
    setShowConfirmClose(false);
    setPendingClose(null);
  };



  const handleSubmit = async () => {
    setFormErrors({});
    setIsSubmitting(true);

    try {
      // Siempre enviar is_active: true y title: 'Aviso de Privacidad' ya que son fijos
      const dataWithDefaults = {
        ...formData,
        title: 'Aviso de Privacidad',
        is_active: true,
      };
      const result = editingId
        ? await actualizarAvisoPrivacidad(studioSlug, editingId, dataWithDefaults)
        : await crearAvisoPrivacidad(studioSlug, dataWithDefaults);

      if (result.success && result.data) {
        toast.success(
          editingId
            ? 'Aviso de privacidad actualizado exitosamente'
            : 'Aviso de privacidad creado exitosamente'
        );

        // Actualización local del estado
        const updatedAviso = result.data;

        // Actualizar el array de avisos localmente
        if (editingId) {
          // Actualizar aviso existente
          setAvisos((prev) =>
            prev.map((a) => (a.id === editingId ? updatedAviso : a))
          );
        } else {
          // Agregar nuevo aviso y desactivar los demás
          setAvisos((prev) => {
            const deactivated = prev.map((a) => ({ ...a, is_active: false }));
            return [...deactivated, updatedAviso];
          });
        }

        // Actualizar el formulario con los nuevos datos
        setEditingId(updatedAviso.id);
        setFormData({
          content: updatedAviso.content,
          version: updatedAviso.version,
        });
        setInitialFormData({
          content: updatedAviso.content,
          version: updatedAviso.version,
        });

        // Notificar al padre solo para actualizar la vista externa (sin refrescar todo)
        onRefresh?.();
        onClose();
      } else {
        if (result.error && typeof result.error === 'object') {
          setFormErrors(result.error as any);
        } else {
          toast.error(result.error || 'Error al guardar aviso de privacidad');
        }
      }
    } catch (error) {
      console.error('Error saving aviso:', error);
      toast.error('Error al guardar aviso de privacidad');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAviso = avisos.find((a) => a.is_active);

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Aviso de Privacidad"
        description="Gestiona el aviso de privacidad de tu estudio (requerido por LFPDPPP en México)"
        maxWidth="xl"
        onSave={handleSubmit}
        onCancel={handleClose}
        saveLabel={editingId ? 'Actualizar' : 'Crear'}
        cancelLabel="Cancelar"
        isLoading={isSubmitting}
      >
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {/* Skeleton: Información estática */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-zinc-800">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-800 rounded" />
                  <div className="h-4 w-40 bg-zinc-800 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-800 rounded" />
                  <div className="h-4 w-32 bg-zinc-800 rounded" />
                </div>
              </div>

              {/* Skeleton: Editor de texto */}
              <div className="space-y-2">
                <div className="h-96 w-full bg-zinc-800 rounded-lg border border-zinc-800" />
                <div className="h-3 w-64 bg-zinc-800 rounded" />
              </div>
            </div>
          ) : (
            <>
              {/* Información estática */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Título
                  </label>
                  <p className="text-sm text-zinc-300">Aviso de Privacidad</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Versión
                  </label>
                  <p className="text-sm text-zinc-300">
                    {formData.version}{' '}
                    <span className="text-xs text-zinc-500">(incremento automático al guardar)</span>
                  </p>
                </div>
              </div>

              <div>
                <RichTextEditor
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  placeholder="Escribe el contenido del aviso de privacidad..."
                  rows={20}
                />
                {formErrors.content && (
                  <p className="text-sm text-red-400 mt-1">{formErrors.content[0]}</p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  Se mostrará en tu perfil de usuario, cotizaciones y portal de cliente
                </p>
              </div>
            </>
          )}
        </div>
      </ZenDialog>

      <ZenConfirmModal
        isOpen={showConfirmClose}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar?"
        confirmText="Descartar"
        cancelText="Cancelar"
        variant="destructive"
      />

    </>
  );
}

