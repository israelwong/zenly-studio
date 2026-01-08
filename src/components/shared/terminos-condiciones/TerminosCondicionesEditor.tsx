'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenSwitch } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  obtenerTerminosCondiciones,
  crearTerminosCondiciones,
  actualizarTerminosCondiciones,
} from '@/lib/actions/studio/config/terminos-condiciones.actions';
import { SimpleTextEditor } from './SimpleTextEditor';
import type { TerminosCondicionesForm } from '@/lib/actions/schemas/terminos-condiciones-schemas';
import { toast } from 'sonner';

interface TerminosCondicionesEditorProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function TerminosCondicionesEditor({
  studioSlug,
  isOpen,
  onClose,
  onRefresh,
}: TerminosCondicionesEditorProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_active: true,
    is_required: false,
  });
  const [initialFormData, setInitialFormData] = useState({
    title: '',
    content: '',
    is_active: true,
    is_required: false,
  });
  const [formErrors, setFormErrors] = useState<{
    content?: string[];
  }>({});
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTerminos();
    } else {
      // Resetear formulario al cerrar
      setEditingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadTerminos = async () => {
    try {
      setLoading(true);
      const result = await obtenerTerminosCondiciones(studioSlug);

      if (result.success && result.data) {
        // Automáticamente abrir editor con término activo o template por defecto
        const terminoActivo = result.data.find(t => t.is_active);
        if (terminoActivo) {
          // Cargar término activo en el editor
          const editForm = {
            title: terminoActivo.title,
            content: terminoActivo.content,
            is_active: terminoActivo.is_active,
            is_required: terminoActivo.is_required,
          };
          setFormData(editForm);
          setInitialFormData(editForm);
          setEditingId(terminoActivo.id);
        } else {
          // No hay término activo, cargar template por defecto del sistema
          const defaultTemplate = `<p><strong>Términos y Condiciones Generales</strong></p><ul><li>Los paquetes y precios pueden cambiar sin previo aviso.</li><li>El monto pendiente a diferir debe ser cubierto 2 días previos a la celebración del evento.</li><li>Una vez contratado, el precio del paquete o cotización se congela y no está sujeto a cambios.</li><li>Los servicios están sujetos a disponibilidad del estudio.</li><li>Al generar el contrato y pagar el anticipo, tanto el cliente como el estudio se comprometen legalmente a cumplir con los términos establecidos.</li><li>El anticipo pagado no es reembolsable en caso de cancelación por parte del cliente.</li><li>Las fechas y horarios acordados son compromisos vinculantes para ambas partes.</li></ul>`;
          const defaultForm = {
            title: '',
            content: defaultTemplate,
            is_active: true,
            is_required: false,
          };
          setFormData(defaultForm);
          setInitialFormData(defaultForm);
          setEditingId(null);
        }
      } else {
        toast.error(result.error || 'Error al cargar términos y condiciones');
      }
    } catch (error) {
      console.error('Error loading terminos:', error);
      toast.error('Error al cargar términos y condiciones');
    } finally {
      setLoading(false);
    }
  };

  // Verificar si hay cambios sin guardar
  const hasUnsavedChanges = () => {
    return (
      formData.content !== initialFormData.content ||
      formData.is_active !== initialFormData.is_active
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // No hacer nada si no hay cambios
    if (!hasUnsavedChanges()) {
      return;
    }

    // Validación client-side: solo validar si está vacío
    if (!formData.content.trim()) {
      setFormErrors({ content: ['El contenido es obligatorio.'] });
      toast.error('El contenido es obligatorio.');
      return;
    }

    try {
      setSubmitting(true);
      const data = {
        title: 'Términos y Condiciones Generales', // Hardcodeado, no editable
        content: formData.content,
        is_active: formData.is_active,
        is_required: false, // Siempre false, no editable
      } satisfies TerminosCondicionesForm;

      let result;
      if (editingId) {
        result = await actualizarTerminosCondiciones(studioSlug, editingId, data);
      } else {
        result = await crearTerminosCondiciones(studioSlug, data);
      }

      if (result.success && result.data) {
        // Actualizar estado inicial para reflejar los cambios guardados
        setInitialFormData(formData);
        setFormErrors({});

        // Mostrar mensaje apropiado
        const resultAny = result as Record<string, unknown>;
        const message = typeof resultAny.message === 'string' ? resultAny.message : undefined;
        if (message && message.includes('histórico')) {
          toast.success('Términos y condiciones actualizados. La versión anterior se guardó como histórico.');
        } else {
          toast.success(
            editingId ? 'Términos y condiciones actualizados exitosamente' : 'Términos y condiciones creados exitosamente'
          );
        }

        // Notificar al componente padre para que recargue si es necesario
        onRefresh?.();

        // Cerrar el modal inmediatamente después de guardar exitosamente
        onClose();
      } else {
        if (result.error && typeof result.error === 'object' && !Array.isArray(result.error)) {
          setFormErrors(result.error as typeof formErrors);
          const firstError = Object.values(result.error).flat()[0];
          if (firstError) {
            toast.error(firstError);
          }
        } else {
          const errorMessage = typeof result.error === 'string'
            ? result.error
            : 'Error al guardar términos y condiciones';
          toast.error(errorMessage);
          setFormErrors({});
        }
      }
    } catch (error) {
      console.error('Error saving terminos:', error);
      toast.error('Error al guardar términos y condiciones');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      // Si hay cambios sin guardar, mostrar modal de confirmación
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    // Resetear al estado inicial
    setFormData(initialFormData);
    setFormErrors({});
    setShowConfirmClose(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowConfirmClose(false);
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleCancel}
      title="Gestionar Términos y Condiciones"
      description="Define las condiciones generales de tus productos y servicios. Al editar, la versión anterior se guardará automáticamente como histórico."
      maxWidth="lg"
      onSave={!loading && hasUnsavedChanges() && !submitting ? () => handleSubmit() : undefined}
      onCancel={!loading ? handleCancel : undefined}
      saveLabel={!loading ? (editingId ? 'Actualizar' : 'Crear') : undefined}
      cancelLabel={!loading ? 'Cancelar' : undefined}
      isLoading={submitting || loading}
    >
      {loading ? (
        <div className="space-y-4">
          {/* Skeleton del toolbar */}
          <div className="flex items-center gap-1 flex-wrap p-2 bg-zinc-900/50 border border-zinc-800 rounded-md">
            <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse"></div>
            <div className="w-px h-6 bg-zinc-700"></div>
            <div className="h-7 w-16 bg-zinc-800 rounded animate-pulse"></div>
            <div className="w-px h-6 bg-zinc-700"></div>
            <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse"></div>
          </div>

          {/* Skeleton del editor */}
          <div className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-lg min-h-[500px] animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-zinc-700 rounded w-full"></div>
              <div className="h-4 bg-zinc-700 rounded w-5/6"></div>
              <div className="h-4 bg-zinc-700 rounded w-full"></div>
              <div className="h-4 bg-zinc-700 rounded w-4/5"></div>
              <div className="h-4 bg-zinc-700 rounded w-full"></div>
              <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
            </div>
          </div>

          {/* Skeleton del switch */}
          <div className="flex items-start gap-3 p-3 border border-zinc-700 rounded-lg bg-zinc-800/30">
            <div className="h-5 w-10 bg-zinc-700 rounded-full animate-pulse mt-0.5"></div>
            <div className="flex-1">
              <div className="h-4 w-48 bg-zinc-700 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-64 bg-zinc-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Editor */}
          <SimpleTextEditor
            value={formData.content}
            onChange={(value) => {
              setFormData({ ...formData, content: value });
              if (formErrors.content) {
                setFormErrors(prev => ({ ...prev, content: undefined }));
              }
            }}
            placeholder="Escribe tus términos y condiciones..."
            error={formErrors.content?.[0]}
          />

          {/* Switch de estado abajo */}
          <ZenSwitch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            label="Visible en cotizaciones y paquetes"
            description={formData.is_active ? 'Los términos y condiciones se mostrarán al prospecto en letras pequeñas justo debajo de los detalles de la cotización o paquete' : 'Los términos y condiciones no se mostrarán al usuario'}
          />
        </form>
      )}

      {/* Modal de confirmación para descartar cambios */}
      <ZenConfirmModal
        isOpen={showConfirmClose}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar. Si cierras ahora, los cambios no se guardarán."
        confirmText="Descartar cambios"
        cancelText="Cancelar"
        variant="destructive"
      />
    </ZenDialog>
  );
}

