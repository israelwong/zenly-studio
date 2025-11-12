'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Eye, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenSwitch } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  obtenerTerminosCondiciones,
  crearTerminosCondiciones,
  actualizarTerminosCondiciones,
  eliminarTerminosCondiciones,
  actualizarOrdenTerminosCondiciones,
} from '@/lib/actions/studio/config/terminos-condiciones.actions';
import { RichTextEditor } from './RichTextEditor';
import { MarkdownPreview } from './MarkdownPreview';
import type { TerminosCondicionesForm } from '@/lib/actions/schemas/terminos-condiciones-schemas';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TerminoCondicion {
  id: string;
  title: string;
  content: string;
  order: number;
  is_active: boolean;
  is_required: boolean;
  created_at: Date;
  updated_at: Date;
}

interface TerminosCondicionesManagerProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

interface SortableTerminoItemProps {
  termino: TerminoCondicion;
  index: number;
  totalItems: number;
  onEdit: (termino: TerminoCondicion) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

function SortableTerminoItem({
  termino,
  index,
  totalItems,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown
}: SortableTerminoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: termino.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isActive = termino.is_active;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-lg w-full cursor-pointer transition-all ${isActive
        ? 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10'
        : 'border-zinc-700 bg-zinc-800/30 opacity-75'
        }`}
      onClick={() => onEdit(termino)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1 text-zinc-500 hover:text-zinc-400"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className={`font-semibold ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                {termino.title}
              </h4>
              {isActive && (
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                  Activo
                </span>
              )}
              {!isActive && (
                <span className="px-2 py-0.5 text-xs bg-zinc-500/20 text-zinc-400 rounded">
                  Inactivo
                </span>
              )}
              {termino.is_required && (
                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                  Requerido
                </span>
              )}
            </div>
            <p className={`text-sm line-clamp-2 ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {termino.content.substring(0, 150)}...
            </p>
            <p className={`text-xs mt-2 ${isActive ? 'text-zinc-500' : 'text-zinc-600'}`}>
              {isActive ? 'Activo desde' : 'Creado'}: {new Date(termino.created_at).toLocaleDateString()}
              {termino.updated_at.getTime() !== termino.created_at.getTime() && (
                <> • Actualizado: {new Date(termino.updated_at).toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => onMoveUp(termino.id)}
            disabled={index === 0}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-300 disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </ZenButton>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => onMoveDown(termino.id)}
            disabled={index === totalItems - 1}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-300 disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </ZenButton>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => onDelete(termino.id)}
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </ZenButton>
        </div>
      </div>
    </div>
  );
}

export function TerminosCondicionesManager({
  studioSlug,
  isOpen,
  onClose,
  onRefresh,
}: TerminosCondicionesManagerProps) {
  const [terminos, setTerminos] = useState<TerminoCondicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
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
    title?: string[];
    content?: string[];
  }>({});

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      loadTerminos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadTerminos = async () => {
    try {
      setLoading(true);
      const result = await obtenerTerminosCondiciones(studioSlug);

      if (result.success && result.data) {
        setTerminos(result.data);
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
    if (!showForm) return false;
    return (
      formData.title !== initialFormData.title ||
      formData.content !== initialFormData.content ||
      formData.is_active !== initialFormData.is_active ||
      formData.is_required !== initialFormData.is_required
    );
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
    setShowForm(false);
    setEditingId(null);
    const emptyForm = {
      title: '',
      content: '',
      is_active: true,
      is_required: false,
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

  const handleCreate = () => {
    setEditingId(null);
    const emptyForm = {
      title: '',
      content: '',
      is_active: true,
      is_required: false,
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (termino: TerminoCondicion) => {
    setEditingId(termino.id);
    const editForm = {
      title: termino.title,
      content: termino.content,
      is_active: termino.is_active,
      is_required: termino.is_required,
    };
    setFormData(editForm);
    setInitialFormData(editForm);
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      const result = await eliminarTerminosCondiciones(studioSlug, pendingDeleteId);

      if (result.success) {
        setTerminos(prev => prev.filter(t => t.id !== pendingDeleteId));
        toast.success('Términos y condiciones eliminados exitosamente');
        onRefresh?.();
      } else {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : 'Error al eliminar términos y condiciones';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting terminos:', error);
      toast.error('Error al eliminar términos y condiciones');
    } finally {
      setShowConfirmDelete(false);
      setPendingDeleteId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDelete(false);
    setPendingDeleteId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || isReordering) {
      return;
    }

    const oldIndex = terminos.findIndex((t) => t.id === active.id);
    const newIndex = terminos.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newTerminos = arrayMove(terminos, oldIndex, newIndex);

    try {
      setIsReordering(true);

      // Actualizar estado local primero
      setTerminos(newTerminos);

      // Actualizar orden en el servidor
      const terminosConOrden = newTerminos.map((termino, index) => ({
        id: termino.id,
        orden: index,
      }));

      const result = await actualizarOrdenTerminosCondiciones(studioSlug, terminosConOrden);

      if (!result.success) {
        // Revertir si falla
        setTerminos(terminos);
        toast.error(result.error || 'Error al actualizar el orden');
      } else {
        toast.success('Orden actualizado exitosamente');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error reordering terminos:', error);
      // Revertir si falla
      setTerminos(terminos);
      toast.error('Error al actualizar el orden');
    } finally {
      setIsReordering(false);
    }
  };

  const handleMoveUp = async (id: string) => {
    const currentIndex = terminos.findIndex((t) => t.id === id);
    if (currentIndex === 0 || isReordering) return;

    const newIndex = currentIndex - 1;
    const newTerminos = arrayMove(terminos, currentIndex, newIndex);

    try {
      setIsReordering(true);
      setTerminos(newTerminos);

      const terminosConOrden = newTerminos.map((termino, index) => ({
        id: termino.id,
        orden: index,
      }));

      const result = await actualizarOrdenTerminosCondiciones(studioSlug, terminosConOrden);

      if (!result.success) {
        setTerminos(terminos);
        toast.error(result.error || 'Error al actualizar el orden');
      } else {
        toast.success('Orden actualizado exitosamente');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error moving termino:', error);
      setTerminos(terminos);
      toast.error('Error al actualizar el orden');
    } finally {
      setIsReordering(false);
    }
  };

  const handleMoveDown = async (id: string) => {
    const currentIndex = terminos.findIndex((t) => t.id === id);
    if (currentIndex === terminos.length - 1 || isReordering) return;

    const newIndex = currentIndex + 1;
    const newTerminos = arrayMove(terminos, currentIndex, newIndex);

    try {
      setIsReordering(true);
      setTerminos(newTerminos);

      const terminosConOrden = newTerminos.map((termino, index) => ({
        id: termino.id,
        orden: index,
      }));

      const result = await actualizarOrdenTerminosCondiciones(studioSlug, terminosConOrden);

      if (!result.success) {
        setTerminos(terminos);
        toast.error(result.error || 'Error al actualizar el orden');
      } else {
        toast.success('Orden actualizado exitosamente');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error moving termino:', error);
      setTerminos(terminos);
      toast.error('Error al actualizar el orden');
    } finally {
      setIsReordering(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación client-side
    if (!formData.content.trim()) {
      setFormErrors({ content: ['El contenido es obligatorio.'] });
      toast.error('El contenido es obligatorio.');
      return;
    }

    if (formData.content.trim().length < 10) {
      setFormErrors({ content: ['El contenido debe tener al menos 10 caracteres.'] });
      toast.error('El contenido debe tener al menos 10 caracteres.');
      return;
    }

    try {
      const data = {
        title: formData.title,
        content: formData.content,
        is_active: formData.is_active,
        is_required: formData.is_required,
      } satisfies TerminosCondicionesForm;

      let result;
      if (editingId) {
        result = await actualizarTerminosCondiciones(studioSlug, editingId, data);
      } else {
        result = await crearTerminosCondiciones(studioSlug, data);
      }

      if (result.success && result.data) {
        const terminoMapeado: TerminoCondicion = {
          id: result.data.id,
          title: result.data.title,
          content: result.data.content,
          order: result.data.order,
          is_active: result.data.is_active,
          is_required: result.data.is_required,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at,
        };

        if (editingId) {
          setTerminos(prev =>
            prev.map(t => (t.id === editingId ? terminoMapeado : t))
          );
        } else {
          setTerminos(prev => [...prev, terminoMapeado]);
        }

        toast.success(
          editingId ? 'Términos y condiciones actualizados exitosamente' : 'Términos y condiciones creados exitosamente'
        );
        setShowForm(false);
        setEditingId(null);
        setInitialFormData(formData);
        setFormErrors({});
        onRefresh?.();
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
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Gestionar Términos y Condiciones"
        description="Comunica las condiciones generales de tus productos y servicios: garantías, cancelaciones, devoluciones, políticas de pago, etc. Puedes crear un documento extenso o separarlo en bloques organizados."
        maxWidth="xl"
      >
        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <ZenInput
              label="Título"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (formErrors.title) {
                  setFormErrors(prev => ({ ...prev, title: undefined }));
                }
              }}
              required
              placeholder="Ej: Términos y Condiciones"
              error={formErrors.title?.[0]}
            />

            {/* Toggle entre Editor y Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-300">
                  Contenido <span className="text-red-400">*</span>
                </label>
                <ZenButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-8"
                >
                  {showPreview ? (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Editar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Vista Previa
                    </>
                  )}
                </ZenButton>
              </div>

              {showPreview ? (
                <div className="h-[500px] p-4 bg-zinc-900 border border-zinc-700 rounded-lg overflow-y-auto overflow-x-hidden">
                  <MarkdownPreview content={formData.content} />
                </div>
              ) : (
                <RichTextEditor
                  value={formData.content}
                  onChange={(value) => {
                    setFormData({ ...formData, content: value });
                    if (formErrors.content) {
                      setFormErrors(prev => ({ ...prev, content: undefined }));
                    }
                  }}
                  placeholder="Escribe tus términos y condiciones..."
                  rows={12}
                  error={formErrors.content?.[0]}
                />
              )}
            </div>

            <ZenSwitch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              label="Estado"
              description={formData.is_active ? 'Los términos están activos y se mostrarán' : 'Los términos están inactivos y no se mostrarán'}
            />

            <ZenSwitch
              checked={formData.is_required}
              onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
              label="Requerido"
              description={formData.is_required ? 'El cliente debe aceptar estos términos antes de poder confirmar o formalizar la aprobación de un paquete o cotización' : 'Los términos son opcionales y no requieren aceptación'}
            />

            <div className="flex items-center justify-end gap-3 pt-4">
              <ZenButton
                type="button"
                variant="ghost"
                onClick={() => {
                  if (hasUnsavedChanges()) {
                    setPendingClose(() => () => setShowForm(false));
                    setShowConfirmClose(true);
                  } else {
                    setShowForm(false);
                    setEditingId(null);
                  }
                }}
              >
                Cancelar
              </ZenButton>
              <ZenButton type="submit" variant="primary">
                {editingId ? 'Actualizar' : 'Crear'}
              </ZenButton>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                {terminos.length} término(s) y condición(es)
              </p>
              <ZenButton variant="primary" size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevos Términos
              </ZenButton>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/50 animate-pulse"
                  >
                    <div className="h-5 bg-zinc-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-zinc-700 rounded w-full mb-1"></div>
                    <div className="h-4 bg-zinc-700 rounded w-5/6"></div>
                  </div>
                ))}
              </div>
            ) : terminos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-400 mb-2">No hay términos y condiciones configurados</p>
                <p className="text-xs text-zinc-500 mb-4">
                  Define las condiciones generales de tus productos y servicios: garantías, cancelaciones, devoluciones, políticas de pago, etc.
                </p>
                <ZenButton variant="outline" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primeros términos
                </ZenButton>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={terminos.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={`space-y-2 max-h-[600px] overflow-y-auto overflow-x-hidden ${isReordering ? 'pointer-events-none opacity-50' : ''}`}>
                    {terminos.map((termino, index) => (
                      <SortableTerminoItem
                        key={termino.id}
                        termino={termino}
                        index={index}
                        totalItems={terminos.length}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </ZenDialog>

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

      <ZenConfirmModal
        isOpen={showConfirmDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar términos y condiciones?"
        description="Esta acción no se puede deshacer. Los términos y condiciones se eliminarán permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}
