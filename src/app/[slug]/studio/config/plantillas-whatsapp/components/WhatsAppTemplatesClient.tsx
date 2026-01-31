'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, MessageCircle } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenCardContent, ZenButton, ZenInput, ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
} from '@/lib/actions/studio/commercial/promises';
import type { WhatsAppTemplate } from '@/lib/actions/studio/commercial/promises/whatsapp-templates.actions';
import { toast } from 'sonner';

const VAR_HINT = 'Variables: [[nombre_prospecto]], [[nombre_evento]], [[link_promesa]]';

interface WhatsAppTemplatesClientProps {
  studioSlug: string;
}

export function WhatsAppTemplatesClient({ studioSlug }: WhatsAppTemplatesClientProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTemplates = () => {
    setLoading(true);
    getWhatsAppTemplates(studioSlug)
      .then((res) => {
        if (res.success && res.data) setTemplates(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTemplates();
  }, [studioSlug]);

  const handleCreate = async () => {
    const t = newTitle.trim();
    const m = newMessage.trim();
    if (!t || !m) {
      toast.error('Título y mensaje son requeridos');
      return;
    }
    setCreating(true);
    const result = await createWhatsAppTemplate(studioSlug, t, m);
    if (result.success && result.data) {
      setTemplates((prev) => [result.data!, ...prev]);
      setCreateOpen(false);
      setNewTitle('');
      setNewMessage('');
      toast.success('Plantilla creada');
    } else {
      toast.error(result.error ?? 'Error al crear');
    }
    setCreating(false);
  };

  const handleEdit = (t: WhatsAppTemplate) => {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditMessage(t.message);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const t = editTitle.trim();
    const m = editMessage.trim();
    if (!t || !m) {
      toast.error('Título y mensaje son requeridos');
      return;
    }
    setSaving(true);
    const result = await updateWhatsAppTemplate(studioSlug, editingId, t, m);
    if (result.success && result.data) {
      setTemplates((prev) => prev.map((x) => (x.id === editingId ? result.data! : x)));
      setEditingId(null);
      setEditTitle('');
      setEditMessage('');
      toast.success('Plantilla actualizada');
    } else {
      toast.error(result.error ?? 'Error al actualizar');
    }
    setSaving(false);
  };

  const handleDelete = (id: string) => setDeletingId(id);

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    const result = await deleteWhatsAppTemplate(studioSlug, deletingId);
    if (result.success) {
      setTemplates((prev) => prev.filter((x) => x.id !== deletingId));
      setDeletingId(null);
      toast.success('Plantilla eliminada');
    } else {
      toast.error(result.error ?? 'Error al eliminar');
    }
    setIsDeleting(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-full flex flex-col">
      <ZenCard variant="default" padding="none" className="flex flex-col flex-1 min-h-0">
        <ZenCardHeader className="border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <ZenCardTitle>Plantillas WhatsApp</ZenCardTitle>
                <ZenCardDescription>
                  Mensajes predefinidos para enviar desde la ficha de la promesa. Usa variables en el texto.
                </ZenCardDescription>
              </div>
            </div>
            <ZenButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Nueva plantilla
            </ZenButton>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6 flex-1 min-h-0 overflow-auto">
          <p className="text-xs text-zinc-500 mb-4">{VAR_HINT}</p>
          {loading ? (
            <p className="text-sm text-zinc-400 py-8">Cargando plantillas…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8">
              No hay plantillas. Crea una para usarlas al enviar WhatsApp desde una promesa.
            </p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-2 p-3 rounded-md border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  {editingId === t.id ? (
                    <>
                      <div className="flex-1 min-w-0 space-y-2">
                        <ZenInput
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Nombre de la plantilla"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') {
                              setEditingId(null);
                              setEditTitle('');
                              setEditMessage('');
                            }
                          }}
                        />
                        <textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          placeholder="Mensaje con variables [[nombre_prospecto]], etc."
                          rows={3}
                          className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <ZenButton type="button" variant="ghost" size="sm" onClick={handleSaveEdit} disabled={saving} className="text-emerald-400 hover:text-emerald-300">
                          Guardar
                        </ZenButton>
                        <ZenButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditTitle('');
                            setEditMessage('');
                          }}
                          className="text-zinc-400 hover:text-zinc-300"
                        >
                          <X className="h-4 w-4" />
                        </ZenButton>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200">{t.title}</p>
                        <p className="text-sm text-zinc-400 mt-1 whitespace-pre-wrap break-words line-clamp-3">{t.message}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <ZenButton type="button" variant="ghost" size="sm" onClick={() => handleEdit(t)} className="text-zinc-400 hover:text-blue-400" title="Editar">
                          <Edit2 className="h-4 w-4" />
                        </ZenButton>
                        <ZenButton type="button" variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-zinc-400 hover:text-red-400" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </ZenButton>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      <ZenDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva plantilla WhatsApp"
        description="El mensaje puede incluir variables que se reemplazarán al enviar"
        onCancel={() => setCreateOpen(false)}
        cancelLabel="Cancelar"
        onSave={handleCreate}
        saveLabel={creating ? 'Creando…' : 'Crear'}
        saveDisabled={creating || !newTitle.trim() || !newMessage.trim()}
        isLoading={creating}
        maxWidth="md"
      >
        <div className="space-y-3">
          <ZenInput
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nombre de la plantilla (ej: Saludo inicial)"
          />
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Mensaje</label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Hola [[nombre_prospecto]], te comparto el link de tu cotización: [[link_promesa]]"
              rows={4}
              className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      </ZenDialog>

      <ZenConfirmModal
        isOpen={deletingId !== null}
        onClose={() => !isDeleting && setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Eliminar plantilla"
        description="¿Eliminar esta plantilla? No se borran los mensajes ya enviados."
        confirmText={isDeleting ? 'Eliminando…' : 'Eliminar'}
        cancelText="Cancelar"
        variant="destructive"
        disabled={isDeleting}
      />
    </div>
  );
}
