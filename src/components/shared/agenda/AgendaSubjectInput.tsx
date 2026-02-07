'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Settings, FileText, Trash2 } from 'lucide-react';
import { ZenInput, ZenButton, ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import {
  getAgendaSubjectTemplates,
  createAgendaSubjectTemplate,
  updateAgendaSubjectTemplate,
  deleteAgendaSubjectTemplate,
  type AgendaSubjectTemplate,
} from '@/lib/actions/shared/agenda-subject-templates.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface AgendaSubjectInputProps {
  context: string;
  studioSlug: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export function AgendaSubjectInput({
  context,
  studioSlug,
  value,
  onChange,
  label = 'Asunto',
  placeholder = 'Nombre o descripción',
  className,
  inputClassName,
  disabled = false,
}: AgendaSubjectInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [templates, setTemplates] = useState<AgendaSubjectTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [modalTemplates, setModalTemplates] = useState<AgendaSubjectTemplate[]>([]);
  const [loadingModalTemplates, setLoadingModalTemplates] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateText, setEditTemplateText] = useState('');
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadingTemplates(true);
    getAgendaSubjectTemplates(studioSlug, context)
      .then((res) => {
        if (res.success && res.data) setTemplates(res.data);
      })
      .finally(() => setLoadingTemplates(false));
  }, [studioSlug, context]);

  const filteredTemplates = useMemo(() => {
    if (!value.trim()) return templates;
    const q = value.trim().toLowerCase();
    return templates.filter((t) => t.text.toLowerCase().includes(q));
  }, [templates, value]);

  const exactMatch = useMemo(
    () => templates.some((t) => t.text.trim().toLowerCase() === value.trim().toLowerCase()),
    [templates, value]
  );
  const canAddAsNew = value.trim().length > 0 && !exactMatch;

  const handleSelectTemplate = (t: AgendaSubjectTemplate) => {
    onChange(t.text);
    setShowSuggestions(false);
  };

  const handleAddAsNewTemplate = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const res = await createAgendaSubjectTemplate(studioSlug, trimmed, context);
    if (res.success) {
      setTemplates((prev) => [res.data!, ...prev]);
      setShowSuggestions(false);
      toast.success('Plantilla agregada');
    } else {
      toast.error(res.error ?? 'Error al crear plantilla');
    }
  };

  const openManageModal = () => {
    setShowSuggestions(false);
    setManageModalOpen(true);
    setEditingTemplateId(null);
    setEditTemplateText('');
    setDeletingTemplateId(null);
    setLoadingModalTemplates(true);
    getAgendaSubjectTemplates(studioSlug, context)
      .then((res) => {
        if (res.success && res.data) setModalTemplates(res.data);
      })
      .finally(() => setLoadingModalTemplates(false));
  };

  const handleSaveEditTemplate = async (templateId: string) => {
    const trimmed = editTemplateText.trim();
    if (!trimmed) return;
    const result = await updateAgendaSubjectTemplate(studioSlug, templateId, trimmed);
    if (result.success) {
      setModalTemplates((prev) => prev.map((x) => (x.id === templateId ? result.data! : x)));
      setTemplates((prev) => prev.map((x) => (x.id === templateId ? result.data! : x)));
      if (value === editTemplateText.trim()) onChange(trimmed);
      setEditingTemplateId(null);
      setEditTemplateText('');
      toast.success('Plantilla actualizada');
    } else {
      toast.error(result.error ?? 'Error al actualizar');
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!deletingTemplateId) return;
    setIsDeletingTemplate(true);
    const result = await deleteAgendaSubjectTemplate(studioSlug, deletingTemplateId);
    if (result.success) {
      setModalTemplates((prev) => prev.filter((x) => x.id !== deletingTemplateId));
      setTemplates((prev) => prev.filter((x) => x.id !== deletingTemplateId));
      setDeletingTemplateId(null);
      toast.success('Plantilla eliminada');
    } else {
      toast.error(result.error ?? 'Error al eliminar');
    }
    setIsDeletingTemplate(false);
  };

  return (
    <div className={cn('space-y-0.5', className)} ref={containerRef}>
      {label && <label className="text-xs text-zinc-500">{label}</label>}
      <div className="relative">
        <ZenInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('h-8 text-xs border-zinc-700 bg-zinc-900', inputClassName)}
        />
        {showSuggestions && (
          <div
            className="absolute z-[100] mt-1 w-full min-w-[200px] rounded-md border border-zinc-600 bg-zinc-900 shadow-lg shadow-black/20 max-h-60 overflow-y-auto"
            role="listbox"
          >
            {canAddAsNew && (
              <button
                type="button"
                onClick={handleAddAsNewTemplate}
                className="w-full px-3 py-2 text-left text-sm text-blue-400 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-b border-zinc-700"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Agregar &quot;{value.trim().length > 40 ? value.trim().slice(0, 40) + '…' : value.trim()}&quot; como nueva plantilla
              </button>
            )}
            {loadingTemplates ? (
              <div className="py-4 text-center text-xs text-zinc-500">Cargando…</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-zinc-500">
                {canAddAsNew ? null : 'Sin plantillas. Escribe y agrega una.'}
              </div>
            ) : (
              filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTemplate(t)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-between gap-2'
                  )}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    {(t.context === 'GLOBAL' || t.context == null) && (
                      <span className="shrink-0 text-xs" title="Plantilla global">🌐</span>
                    )}
                    <span className="truncate">{t.text}</span>
                  </span>
                  {t.usage_count > 0 && (
                    <span className="shrink-0 text-[10px] text-zinc-500">{t.usage_count}</span>
                  )}
                </button>
              ))
            )}
            <button
              type="button"
              onClick={openManageModal}
              className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-t border-zinc-700"
            >
              <Settings className="h-4 w-4 shrink-0" />
              Gestionar plantillas
            </button>
          </div>
        )}
      </div>

      <ZenDialog
        isOpen={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        title="Plantillas de asunto"
        description="Edita o elimina los asuntos disponibles para agendamientos"
        onCancel={() => setManageModalOpen(false)}
        cancelLabel="Cerrar"
        maxWidth="md"
      >
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loadingModalTemplates ? (
            <div className="py-8 text-center text-sm text-zinc-500">Cargando…</div>
          ) : modalTemplates.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No hay plantillas. Escribe un asunto arriba y agrega una.</p>
          ) : (
            modalTemplates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 p-3 rounded-md border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                {editingTemplateId === t.id ? (
                  <>
                    <ZenInput
                      value={editTemplateText}
                      onChange={(e) => setEditTemplateText(e.target.value)}
                      className="flex-1 min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditTemplate(t.id);
                        if (e.key === 'Escape') {
                          setEditingTemplateId(null);
                          setEditTemplateText('');
                        }
                      }}
                    />
                    <ZenButton type="button" size="sm" onClick={() => handleSaveEditTemplate(t.id)}>
                      Guardar
                    </ZenButton>
                    <ZenButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTemplateId(null);
                        setEditTemplateText('');
                      }}
                    >
                      Cancelar
                    </ZenButton>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 truncate text-sm text-zinc-200">{t.text}</span>
                    {t.usage_count > 0 && (
                      <span className="text-[10px] text-zinc-500">{t.usage_count}</span>
                    )}
                    <ZenButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTemplateId(t.id);
                        setEditTemplateText(t.text);
                      }}
                      title="Editar"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </ZenButton>
                    <ZenButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => setDeletingTemplateId(t.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ZenButton>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ZenDialog>

      <ZenConfirmModal
        isOpen={deletingTemplateId !== null}
        onClose={() => setDeletingTemplateId(null)}
        onConfirm={confirmDeleteTemplate}
        title="Eliminar plantilla"
        description="¿Eliminar esta plantilla de asunto? No se borran los agendamientos ya creados."
        confirmText="Eliminar"
        variant="destructive"
        loading={isDeletingTemplate}
      />
    </div>
  );
}
