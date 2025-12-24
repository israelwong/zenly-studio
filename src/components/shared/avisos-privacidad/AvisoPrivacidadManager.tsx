'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenSwitch } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import {
  obtenerAvisosPrivacidad,
  crearAvisoPrivacidad,
  actualizarAvisoPrivacidad,
  eliminarAvisoPrivacidad,
} from '@/lib/actions/studio/config/avisos-privacidad.actions';
import { RichTextEditor } from '../terminos-condiciones/RichTextEditor';
import { MarkdownPreview } from '../terminos-condiciones/MarkdownPreview';
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: 'Aviso de Privacidad',
    content: '',
    version: '1.0',
    is_active: true,
  });
  const [initialFormData, setInitialFormData] = useState({
    title: 'Aviso de Privacidad',
    content: '',
    version: '1.0',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<{
    title?: string[];
    content?: string[];
    version?: string[];
  }>({});

  useEffect(() => {
    if (isOpen) {
      loadAvisos();
    }
  }, [isOpen]);

  const loadAvisos = async () => {
    try {
      setLoading(true);
      const result = await obtenerAvisosPrivacidad(studioSlug);

      if (result.success && result.data) {
        setAvisos(result.data);
      } else {
        toast.error(result.error || 'Error al cargar avisos de privacidad');
      }
    } catch (error) {
      console.error('Error loading avisos:', error);
      toast.error('Error al cargar avisos de privacidad');
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedChanges = () => {
    if (!showForm) return false;
    return (
      formData.title !== initialFormData.title ||
      formData.content !== initialFormData.content ||
      formData.version !== initialFormData.version ||
      formData.is_active !== initialFormData.is_active
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
      title: 'Aviso de Privacidad',
      content: '',
      version: '1.0',
      is_active: true,
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
      title: 'Aviso de Privacidad',
      content: '',
      version: '1.0',
      is_active: true,
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (aviso: AvisoPrivacidad) => {
    setEditingId(aviso.id);
    setFormData({
      title: aviso.title,
      content: aviso.content,
      version: aviso.version,
      is_active: aviso.is_active,
    });
    setInitialFormData({
      title: aviso.title,
      content: aviso.content,
      version: aviso.version,
      is_active: aviso.is_active,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = (avisoId: string) => {
    setPendingDeleteId(avisoId);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      const result = await eliminarAvisoPrivacidad(studioSlug, pendingDeleteId);

      if (result.success) {
        toast.success('Aviso de privacidad eliminado exitosamente');
        await loadAvisos();
        onRefresh?.();
      } else {
        toast.error(result.error || 'Error al eliminar aviso de privacidad');
      }
    } catch (error) {
      console.error('Error deleting aviso:', error);
      toast.error('Error al eliminar aviso de privacidad');
    } finally {
      setShowConfirmDelete(false);
      setPendingDeleteId(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDelete(false);
    setPendingDeleteId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const result = editingId
        ? await actualizarAvisoPrivacidad(studioSlug, editingId, formData)
        : await crearAvisoPrivacidad(studioSlug, formData);

      if (result.success) {
        toast.success(
          editingId
            ? 'Aviso de privacidad actualizado exitosamente'
            : 'Aviso de privacidad creado exitosamente'
        );
        await loadAvisos();
        setShowForm(false);
        setEditingId(null);
        onRefresh?.();
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
    }
  };

  const activeAviso = avisos.find((a) => a.is_active);

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Avisos de Privacidad"
        description="Gestiona los avisos de privacidad de tu estudio (requerido por LFPDPPP en México)"
        size="xl"
      >
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {!showForm ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Avisos de Privacidad</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        {activeAviso
                          ? `Versión activa: ${activeAviso.version}`
                          : 'No hay aviso de privacidad activo'}
                      </p>
                    </div>
                    <ZenButton onClick={handleCreate} icon={Plus}>
                      Crear Aviso
                    </ZenButton>
                  </div>

                  {avisos.length === 0 ? (
                    <div className="text-center py-12 border border-zinc-800 rounded-lg">
                      <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                      <p className="text-zinc-400 mb-4">No hay avisos de privacidad creados</p>
                      <ZenButton onClick={handleCreate} icon={Plus} variant="outline">
                        Crear Primer Aviso
                      </ZenButton>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {avisos.map((aviso) => (
                        <div
                          key={aviso.id}
                          className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-white">{aviso.title}</h4>
                                {aviso.is_active ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Activo
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                                    <XCircle className="h-3 w-3" />
                                    Inactivo
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-zinc-400 mb-2">
                                Versión: {aviso.version}
                              </p>
                              <p className="text-xs text-zinc-500">
                                Creado: {new Date(aviso.created_at).toLocaleDateString('es-MX')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <ZenButton
                                onClick={() => handleEdit(aviso)}
                                variant="ghost"
                                size="sm"
                                icon={Edit2}
                              >
                                Editar
                              </ZenButton>
                              <ZenButton
                                onClick={() => handleDelete(aviso.id)}
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                className="text-red-400 hover:text-red-300"
                              >
                                Eliminar
                              </ZenButton>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <ZenInput
                    label="Título"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    error={formErrors.title?.[0]}
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Versión
                    </label>
                    <ZenInput
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="1.0"
                      error={formErrors.version?.[0]}
                      required
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Formato: X.Y (ej: 1.0, 1.1, 2.0)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Contenido <span className="text-red-400">*</span>
                    </label>
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
                      Mínimo 100 caracteres para cumplir con los requisitos legales
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <ZenSwitch
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <label className="text-sm text-zinc-300">
                      Activar este aviso (desactivará otros)
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                    <ZenButton
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowPreview(!showPreview);
                      }}
                      icon={Eye}
                    >
                      {showPreview ? 'Ocultar' : 'Vista'} Previa
                    </ZenButton>
                    <div className="flex items-center gap-2">
                      <ZenButton
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setEditingId(null);
                        }}
                      >
                        Cancelar
                      </ZenButton>
                      <ZenButton type="submit">
                        {editingId ? 'Actualizar' : 'Crear'} Aviso
                      </ZenButton>
                    </div>
                  </div>

                  {showPreview && formData.content && (
                    <div className="mt-4 border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
                      <h4 className="text-sm font-semibold text-white mb-2">Vista Previa</h4>
                      <MarkdownPreview content={formData.content} />
                    </div>
                  )}
                </form>
              )}
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

      <ZenConfirmModal
        isOpen={showConfirmDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar aviso de privacidad?"
        description="Esta acción no se puede deshacer. El aviso será eliminado permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}

