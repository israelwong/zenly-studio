'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Settings, Edit2, Trash2, X } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenInput, ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import { createPromiseLog, createPromiseLogTemplate, getPromiseLogTemplates, updatePromiseLogTemplate, deletePromiseLogTemplate, updatePromiseLog } from '@/lib/actions/studio/commercial/promises';
import { usePromiseLogs } from '@/hooks/usePromiseLogs';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import { cn } from '@/lib/utils';
import type { PromiseLogTemplate } from '@/lib/actions/studio/commercial/promises/promise-log-templates.actions';
import type { PromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';

interface QuickNoteCardProps {
  studioSlug: string;
  promiseId: string;
  /** Últimos 3 logs desde servidor para mostrar en inicialización */
  initialLastLogs?: PromiseLog[];
  onLogAdded?: () => void;
}

export function QuickNoteCard({ studioSlug, promiseId, initialLastLogs = [], onLogAdded }: QuickNoteCardProps) {
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [templates, setTemplates] = useState<PromiseLogTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [modalTemplates, setModalTemplates] = useState<PromiseLogTemplate[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [editLogContent, setEditLogContent] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { logs, addLog, updateLog } = usePromiseLogs({ promiseId, enabled: true });

  const logsRecentFirst = useMemo(
    () => [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [logs]
  );
  const lastThreeFromHook = useMemo(
    () => [...logsRecentFirst.slice(0, 3)].reverse(),
    [logsRecentFirst]
  );
  const lastThree = useMemo(
    () => (logs.length > 0 ? lastThreeFromHook : (initialLastLogs?.length ? [...initialLastLogs].reverse() : [])),
    [logs.length, lastThreeFromHook, initialLastLogs]
  );

  const loadTemplates = () => {
    setLoadingTemplates(true);
    getPromiseLogTemplates(studioSlug)
      .then((res) => {
        if (res.success && res.data) setTemplates(res.data);
      })
      .finally(() => setLoadingTemplates(false));
  };

  // Precargar plantillas al montar para que el dropdown abra al instante al hacer focus (igual que SeguimientoMinimalCard con asuntos)
  useEffect(() => {
    setLoadingTemplates(true);
    getPromiseLogTemplates(studioSlug)
      .then((res) => {
        if (res.success && res.data) setTemplates(res.data);
      })
      .finally(() => setLoadingTemplates(false));
  }, [studioSlug]);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.trim().toLowerCase();
    return templates.filter((t) => t.text.toLowerCase().includes(q));
  }, [templates, search]);

  const exactMatch = useMemo(
    () => templates.some((t) => t.text.trim().toLowerCase() === search.trim().toLowerCase()),
    [templates, search]
  );
  const canAddAsNew = search.trim().length > 0 && !exactMatch;

  const handleSelectTemplate = async (template: PromiseLogTemplate) => {
    setSending(true);
    setShowSuggestions(false);
    setSearch('');
    try {
      const result = await createPromiseLog(studioSlug, {
        promise_id: promiseId,
        content: template.text,
        log_type: 'note',
        template_id: template.id,
      });
      if (result.success && result.data) {
        addLog(result.data);
        toast.success('Nota agregada');
        onLogAdded?.();
      } else {
        toast.error(result.error ?? 'Error al agregar nota');
      }
    } catch {
      toast.error('Error al agregar nota');
    } finally {
      setSending(false);
    }
  };

  const handleAddAsNewTemplate = async () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    setSending(true);
    setShowSuggestions(false);
    try {
      const templateResult = await createPromiseLogTemplate(studioSlug, trimmed);
      if (!templateResult.success) {
        toast.error(templateResult.error ?? 'Error al crear plantilla');
        setSending(false);
        return;
      }
      const logResult = await createPromiseLog(studioSlug, {
        promise_id: promiseId,
        content: trimmed,
        log_type: 'note',
        template_id: templateResult.data.id,
      });
      if (logResult.success && logResult.data) {
        addLog(logResult.data);
        setTemplates((prev) => [templateResult.data, ...prev]);
        toast.success('Plantilla creada y nota agregada');
        onLogAdded?.();
      } else {
        toast.error(logResult.error ?? 'Error al agregar nota');
      }
    } catch {
      toast.error('Error al agregar nota');
    } finally {
      setSearch('');
      setSending(false);
    }
  };

  const openBitacora = () => {
    window.dispatchEvent(new CustomEvent('open-bitacora-sheet'));
  };

  const openConfigModal = () => {
    setConfigModalOpen(true);
    setEditingId(null);
    setEditText('');
    setDeletingId(null);
    setLoadingModal(true);
    getPromiseLogTemplates(studioSlug)
      .then((res) => {
        if (res.success && res.data) setModalTemplates(res.data);
      })
      .finally(() => setLoadingModal(false));
  };

  const handleEditTemplate = (t: PromiseLogTemplate) => {
    setEditingId(t.id);
    setEditText(t.text);
  };

  const handleSaveEdit = async (templateId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    const result = await updatePromiseLogTemplate(studioSlug, templateId, trimmed);
    if (result.success) {
      setModalTemplates((prev) => prev.map((x) => (x.id === templateId ? result.data : x)));
      setTemplates((prev) => prev.map((x) => (x.id === templateId ? result.data : x)));
      setEditingId(null);
      setEditText('');
      toast.success('Plantilla actualizada');
    } else {
      toast.error(result.error ?? 'Error al actualizar');
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    setDeletingId(templateId);
  };

  const confirmDeleteTemplate = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    const result = await deletePromiseLogTemplate(studioSlug, deletingId);
    if (result.success) {
      setModalTemplates((prev) => prev.filter((x) => x.id !== deletingId));
      setTemplates((prev) => prev.filter((x) => x.id !== deletingId));
      setDeletingId(null);
      toast.success('Plantilla eliminada');
    } else {
      toast.error(result.error ?? 'Error al eliminar');
    }
    setIsDeleting(false);
  };

  const openEditLog = (log: PromiseLog) => {
    setEditLogId(log.id);
    setEditLogContent(log.content);
  };

  const closeEditLog = () => {
    setEditLogId(null);
    setEditLogContent('');
  };

  const saveEditLog = async () => {
    if (!editLogId || !editLogContent.trim()) return;
    setSavingLog(true);
    const result = await updatePromiseLog(studioSlug, editLogId, editLogContent.trim());
    if (result.success && result.data) {
      updateLog(editLogId, result.data);
      closeEditLog();
      toast.success('Registro actualizado');
      onLogAdded?.();
    } else {
      toast.error(result.error ?? 'Error al actualizar');
    }
    setSavingLog(false);
  };

  return (
    <ZenCard variant="outlined" className="border-zinc-800">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <ZenCardTitle className="text-sm font-medium">Bitácora de seguimiento</ZenCardTitle>
          <ZenButton
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 gap-1 px-2 py-1 h-6 text-[11px]"
            onClick={openBitacora}
            title="Ver bitácora completa"
          >
            <span>Ver todos</span>
          </ZenButton>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-4">
        {/* Input con dropdown de plantillas (mismo patrón que ReminderFormModal "Asunto") */}
        <div className="space-y-2">
          <div className="relative">
            <ZenInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="Crea una nota rápida de seguimiento"
              disabled={sending}
            />
            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg max-h-60 overflow-y-auto"
              >
                {canAddAsNew && (
                  <button
                    type="button"
                    onClick={() => handleAddAsNewTemplate()}
                    className="w-full px-3 py-2 text-left text-sm text-blue-400 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-b border-zinc-700"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    Agregar &quot;{search.trim().length > 40 ? search.trim().slice(0, 40) + '…' : search.trim()}&quot; como nuevo template
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
                      <span className="truncate">{t.text}</span>
                      {t.usage_count > 0 && (
                        <span className="shrink-0 text-[10px] text-zinc-500">{t.usage_count}</span>
                      )}
                    </button>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowSuggestions(false);
                    openConfigModal();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-t border-zinc-700"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  Gestionar plantillas
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 flex-1 min-h-0 flex flex-col pb-0">
          <p className="text-xs font-medium text-zinc-500">Últimos registros</p>
          {lastThree.length === 0 ? (
            <p className="text-xs text-zinc-600">Aún no hay notas</p>
          ) : (
            <ul className="flex flex-col justify-start relative pb-0">
              {/* Línea vertical tenue que conecta los dots */}
              <span
                className="absolute left-[4px] top-2 bottom-2 w-px bg-zinc-700/60 -translate-x-px"
                aria-hidden
              />
              {lastThree.map((log, index) => {
                const isNewest = index === lastThree.length - 1;
                return (
                  <li
                    key={log.id}
                    className={cn(
                      'text-xs flex gap-2 items-start group py-1',
                      isNewest ? 'text-amber-400' : 'text-zinc-400',
                      index < lastThree.length - 1 && 'pb-3'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full z-[1] mt-1.5',
                        isNewest ? 'bg-amber-400' : 'bg-zinc-500'
                      )}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <p className="text-xs text-zinc-300 break-words whitespace-pre-wrap text-left w-full">
                        {log.content}
                      </p>
                      <div className="flex justify-start mt-0.5">
                        <span className={cn('shrink-0 text-[11px] leading-none', isNewest ? 'text-amber-500' : 'text-zinc-500')}>
                          {formatDateTime(log.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <ZenButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-5 w-5 p-0 min-w-5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity"
                      onClick={() => openEditLog(log)}
                      title="Editar registro"
                    >
                      <Edit2 className="h-3 w-3" />
                    </ZenButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </ZenCardContent>

      <ZenDialog
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        title="Plantillas rápidas"
        description="Edita o elimina las notas rápidas disponibles"
        onCancel={() => setConfigModalOpen(false)}
        cancelLabel="Cerrar"
        maxWidth="md"
      >
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loadingModal ? (
            <div className="py-8 text-center text-sm text-zinc-500">Cargando…</div>
          ) : modalTemplates.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No hay plantillas. Crea una desde el campo de nota rápida.</p>
          ) : (
            modalTemplates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 p-3 rounded-md border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                {editingId === t.id ? (
                  <>
                    <ZenInput
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(t.id);
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditText('');
                        }
                      }}
                      autoFocus
                    />
                    <ZenButton type="button" variant="ghost" size="sm" onClick={() => handleSaveEdit(t.id)} className="text-emerald-400 hover:text-emerald-300">
                      Guardar
                    </ZenButton>
                    <ZenButton type="button" variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditText(''); }} className="text-zinc-400 hover:text-zinc-300">
                      <X className="h-4 w-4" />
                    </ZenButton>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{t.text}</p>
                      {t.usage_count > 0 && (
                        <p className="text-xs text-zinc-500 mt-0.5">Usado {t.usage_count} vez{t.usage_count !== 1 ? 'es' : ''}</p>
                      )}
                    </div>
                    <ZenButton type="button" variant="ghost" size="sm" onClick={() => handleEditTemplate(t)} className="text-zinc-400 hover:text-blue-400" title="Editar">
                      <Edit2 className="h-4 w-4" />
                    </ZenButton>
                    <ZenButton type="button" variant="ghost" size="sm" onClick={() => handleDeleteTemplate(t.id)} className="text-zinc-400 hover:text-red-400" title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </ZenButton>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ZenDialog>

      <ZenConfirmModal
        isOpen={deletingId !== null}
        onClose={() => !isDeleting && setDeletingId(null)}
        onConfirm={confirmDeleteTemplate}
        title="Eliminar plantilla"
        description="¿Eliminar esta plantilla? Los registros ya creados no se modifican."
        confirmText={isDeleting ? 'Eliminando…' : 'Eliminar'}
        cancelText="Cancelar"
        variant="destructive"
        disabled={isDeleting}
      />

      <ZenDialog
        isOpen={editLogId !== null}
        onClose={closeEditLog}
        title="Editar registro"
        description="Modifica el texto del seguimiento"
        onCancel={closeEditLog}
        onSave={saveEditLog}
        cancelLabel="Cancelar"
        saveLabel={savingLog ? 'Guardando…' : 'Guardar'}
        saveDisabled={savingLog || !editLogContent.trim()}
        isLoading={savingLog}
        maxWidth="sm"
      >
        <ZenInput
          value={editLogContent}
          onChange={(e) => setEditLogContent(e.target.value)}
          placeholder="Contenido del registro"
          disabled={savingLog}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEditLog();
            if (e.key === 'Escape') closeEditLog();
          }}
        />
      </ZenDialog>
    </ZenCard>
  );
}
