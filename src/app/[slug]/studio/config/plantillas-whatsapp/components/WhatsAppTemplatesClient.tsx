'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, X, MessageCircle, ChevronDown, ChevronRight, Eye, Loader2 } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenCardContent, ZenButton, ZenDialog, ZenConfirmModal } from '@/components/ui/zen';
import {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
} from '@/lib/actions/studio/commercial/promises';
import { getPortfoliosForWhatsApp, getPortfolioFullDetail } from '@/lib/actions/studio/commercial/promises/whatsapp-resources.actions';
import { getOrCreatePortfolioShortUrl } from '@/lib/actions/studio/commercial/promises/promise-short-url.actions';
import type { WhatsAppTemplate } from '@/lib/actions/studio/commercial/promises/whatsapp-templates.actions';
import type { PortfolioForWhatsApp, PortfolioGroup } from '@/lib/actions/studio/commercial/promises/whatsapp-resources.types';
import type { PublicPortfolio } from '@/types/public-profile';
import { PortfolioDetailModal } from '@/components/profile/sections/PortfolioDetailModal';
import { WhatsAppAdvancedEditor } from '@/components/shared/whatsapp';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  
  // Estados para el modal de creación con columnas
  const [portfolioGroups, setPortfolioGroups] = useState<PortfolioGroup[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [previewPortfolio, setPreviewPortfolio] = useState<PublicPortfolio | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingPreviewSlug, setLoadingPreviewSlug] = useState<string | null>(null);
  const [loadingResources, setLoadingResources] = useState(false);
  const [messageSource, setMessageSource] = useState<'template' | 'chip' | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

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

  // Cargar portafolios cuando se abre el modal de creación
  const loadModalData = useCallback(async () => {
    if (!createOpen) return;
    setLoadingResources(true);
    try {
      const portRes = await getPortfoliosForWhatsApp(studioSlug);
      if (portRes.success && portRes.data) {
        setPortfolioGroups(portRes.data);
        // Expandir todas las secciones por defecto
        const toExpand = new Set<string>();
        portRes.data.forEach((g) => toExpand.add(g.eventTypeName));
        setExpandedSections(toExpand);
      }
    } finally {
      setLoadingResources(false);
    }
  }, [createOpen, studioSlug]);

  useEffect(() => {
    if (createOpen) {
      loadModalData();
      if (editingId) {
        // Si estamos editando, asegurar que los datos estén cargados
        const template = templates.find((t) => t.id === editingId);
        if (template) {
          setEditTitle(template.title);
          setEditMessage(template.message);
          setMessageSource('template'); // Forzar sincronización del editor
        }
      } else {
        // Solo resetear si no estamos editando
        setNewTitle('');
        setNewMessage('');
        setMessageSource('template'); // Forzar sincronización del editor
      }
    } else {
      // Resetear cuando se cierra el modal
      setEditingId(null);
      setEditTitle('');
      setEditMessage('');
      setNewTitle('');
      setNewMessage('');
    }
  }, [createOpen, loadModalData, editingId, templates]);

  // Manejar inserción de portafolio
  const handlePortfolioClick = async (p: PortfolioForWhatsApp) => {
    const res = await getOrCreatePortfolioShortUrl(studioSlug, p.slug);
    const shortUrl = res.success && res.data ? `${origin}/s/${res.data.shortCode}` : undefined;
    insertPortfolioChip(p.slug, `Portafolio: ${p.title}`, shortUrl);
  };

  // Obtener mensaje actual del editor
  const getMessageFromEditor = useCallback((): string => {
    const el = editorRef.current;
    if (!el) return editingId ? editMessage : newMessage;
    const parts: string[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        parts.push(node.textContent);
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        if (elem.tagName === 'BR') {
          parts.push('\n');
          return;
        }
        const portfolioShortUrl = elem.getAttribute?.('data-portfolio-short-url');
        if (portfolioShortUrl != null) {
          parts.push(portfolioShortUrl);
          return;
        }
        const portfolioSlug = elem.getAttribute?.('data-portfolio-slug');
        if (portfolioSlug != null) {
          parts.push(`[[link_portafolio:${portfolioSlug}]]`);
          return;
        }
        if (elem.getAttribute?.('data-var')) {
          parts.push(`[[${elem.getAttribute('data-var')}]]`);
          return;
        }
        node.childNodes.forEach(walk);
      }
    };
    el.childNodes.forEach(walk);
    return parts.join('');
  }, [newMessage, editMessage, editingId]);

  // Insertar variable
  const insertVariableAtCursor = useCallback((variable: string) => {
    const el = editorRef.current;
    if (!el) {
      if (editingId) {
        setEditMessage((prev) => prev + ' ' + variable + ' ');
      } else {
        setNewMessage((prev) => prev + ' ' + variable + ' ');
      }
      setMessageSource('chip');
      return;
    }
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const key = variable.replace(/^\[\[|\]\]$/g, '');
    const label = key === 'nombre_contacto' ? 'Nombre contacto' : key === 'nombre_evento' ? 'Nombre evento' : key === 'fecha_evento' ? 'Fecha evento' : key === 'link_promesa' ? 'Link promesa' : key;
    const span = document.createElement('span');
    span.setAttribute('data-var', key);
    span.setAttribute('contenteditable', 'false');
    span.className = 'whatsapp-modal-chip';
    span.innerHTML = `${label}<span class="chip-remove" contenteditable="false" role="button" tabindex="-1">×</span>`;
    try {
      const hasContentBefore = (el.textContent?.trim().length ?? 0) > 0;
      const lastNode = el.childNodes[el.childNodes.length - 1];
      const prevEndsWithSpace = lastNode?.nodeType === Node.TEXT_NODE && /[\s\u00A0]$/.test((lastNode as Text).textContent || '');
      if (hasContentBefore && !prevEndsWithSpace) {
        const spaceBefore = document.createTextNode(' ');
        range.insertNode(spaceBefore);
        range.setStartAfter(spaceBefore);
        range.collapse(true);
      }
      range.insertNode(span);
      const spaceAfter = document.createTextNode(' ');
      span.parentNode?.insertBefore(spaceAfter, span.nextSibling);
      const sel = window.getSelection();
      if (sel) {
        const newRange = document.createRange();
        newRange.setStartAfter(spaceAfter);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      const updatedMessage = getMessageFromEditor();
      if (editingId) {
        setEditMessage(updatedMessage);
      } else {
        setNewMessage(updatedMessage);
      }
    } catch {
      if (editingId) {
        setEditMessage((prev) => prev + ' ' + variable + ' ');
      } else {
        setNewMessage((prev) => prev + ' ' + variable + ' ');
      }
      setMessageSource('chip');
    }
  }, [getMessageFromEditor, editingId]);

  // Insertar portafolio como chip
  const insertPortfolioChip = useCallback((slug: string, label: string, shortUrl?: string) => {
    const el = editorRef.current;
    if (!el) {
      const portfolioLink = shortUrl ? ` ${shortUrl} ` : ` [[link_portafolio:${slug}]] `;
      if (editingId) {
        setEditMessage((prev) => prev + portfolioLink);
      } else {
        setNewMessage((prev) => prev + portfolioLink);
      }
      setMessageSource('chip');
      return;
    }
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const span = document.createElement('span');
    span.setAttribute('data-portfolio-slug', slug);
    if (shortUrl) span.setAttribute('data-portfolio-short-url', shortUrl);
    span.setAttribute('contenteditable', 'false');
    span.className = 'whatsapp-modal-chip';
    span.innerHTML = `${label}<span class="chip-remove" contenteditable="false" role="button" tabindex="-1">×</span>`;
    try {
      const hasContentBefore = (el.textContent?.trim().length ?? 0) > 0;
      const lastNode = el.childNodes[el.childNodes.length - 1];
      const prevEndsWithSpace = lastNode?.nodeType === Node.TEXT_NODE && /[\s\u00A0]$/.test((lastNode as Text).textContent || '');
      if (hasContentBefore && !prevEndsWithSpace) {
        const spaceBefore = document.createTextNode(' ');
        range.insertNode(spaceBefore);
        range.setStartAfter(spaceBefore);
        range.collapse(true);
      }
      range.insertNode(span);
      const spaceAfter = document.createTextNode(' ');
      span.parentNode?.insertBefore(spaceAfter, span.nextSibling);
      const sel = window.getSelection();
      if (sel) {
        const newRange = document.createRange();
        newRange.setStartAfter(spaceAfter);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      const updatedMessage = getMessageFromEditor();
      if (editingId) {
        setEditMessage(updatedMessage);
      } else {
        setNewMessage(updatedMessage);
      }
    } catch {
      const portfolioLink = shortUrl ? ` ${shortUrl} ` : ` [[link_portafolio:${slug}]] `;
      if (editingId) {
        setEditMessage((prev) => prev + portfolioLink);
      } else {
        setNewMessage((prev) => prev + portfolioLink);
      }
      setMessageSource('chip');
    }
  }, [getMessageFromEditor, editingId]);

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
    setCreateOpen(true); // Abrir el modal para editar
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const currentMessage = editorRef.current ? getMessageFromEditor() : editMessage;
    const t = editTitle.trim();
    const m = currentMessage.trim();
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
      setCreateOpen(false);
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
                </div>
              ))}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      <ZenDialog
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditingId(null);
          setEditTitle('');
          setEditMessage('');
          setNewTitle('');
          setNewMessage('');
        }}
        title={editingId ? 'Editar plantilla WhatsApp' : 'Nueva plantilla WhatsApp'}
        description="Plantillas y portafolios por tipo de evento"
        onCancel={() => {
          setCreateOpen(false);
          setEditingId(null);
          setEditTitle('');
          setEditMessage('');
          setNewTitle('');
          setNewMessage('');
        }}
        cancelLabel="Cancelar"
        onSave={editingId ? handleSaveEdit : handleCreate}
        saveLabel={
          editingId
            ? saving
              ? 'Actualizando…'
              : 'Actualizar'
            : creating
              ? 'Creando…'
              : 'Crear'
        }
        saveDisabled={
          editingId
            ? saving || !editTitle.trim() || !editMessage.trim()
            : creating || !newTitle.trim() || !newMessage.trim()
        }
        isLoading={editingId ? saving : creating}
        maxWidth="4xl"
      >
        <div className="flex gap-0 max-h-[85vh] min-h-[380px] overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800">
          {/* Col 1: Portafolios (sin columna de plantillas porque ya estamos en la página de plantillas) */}
          <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950 rounded-l-lg overflow-hidden">
            <div className="shrink-0 sticky top-0 z-10 px-2.5 py-2 border-b border-zinc-800 bg-zinc-950">
              <p className="text-xs font-medium text-zinc-500">Portafolios</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {loadingResources ? (
                <p className="text-xs text-zinc-500">Cargando…</p>
              ) : portfolioGroups.length === 0 ? (
                <p className="text-xs text-zinc-500">Sin portafolios publicados</p>
              ) : (
                <ul className="space-y-1">
                  {portfolioGroups.map((group) => {
                    const isExpanded = expandedSections.has(group.eventTypeName);
                    return (
                      <li key={group.eventTypeName}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSections((prev) => {
                              const next = new Set(prev);
                              if (next.has(group.eventTypeName)) next.delete(group.eventTypeName);
                              else next.add(group.eventTypeName);
                              return next;
                            })
                          }
                          className="flex items-center gap-1 w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="truncate">{group.eventTypeName}</span>
                          <span className="shrink-0 text-zinc-500">({group.portfolios.length})</span>
                        </button>
                        {isExpanded && (
                          <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-zinc-700/60 pl-2">
                            {group.portfolios.map((p) => (
                              <li key={p.id} className="flex items-center gap-1 group/row">
                                <span className="min-w-0 flex-1 truncate text-sm text-zinc-300" title={p.title}>
                                  {p.title}
                                </span>
                                <div className="flex shrink-0 opacity-70 group-hover/row:opacity-100">
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setLoadingPreviewSlug(p.slug);
                                      const res = await getPortfolioFullDetail(studioSlug, p.slug);
                                      setLoadingPreviewSlug(null);
                                      if (res.success) {
                                        setPreviewPortfolio(res.data);
                                        setIsPreviewOpen(true);
                                      } else {
                                        toast.error(res.error ?? 'Error al cargar portafolio');
                                      }
                                    }}
                                    disabled={loadingPreviewSlug !== null}
                                    className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
                                    title="Vista previa"
                                    aria-label="Vista previa"
                                  >
                                    {loadingPreviewSlug === p.slug ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePortfolioClick(p);
                                    }}
                                    className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400"
                                    title="Agregar al mensaje"
                                    aria-label="Agregar al mensaje"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Col 2: Editor */}
          <div className="flex-1 flex flex-col min-w-0 border-l border-zinc-800 rounded-r-lg bg-zinc-950 overflow-hidden">
            <WhatsAppAdvancedEditor
              title={editingId ? editTitle : newTitle}
              message={editingId ? editMessage : newMessage}
              onTitleChange={editingId ? setEditTitle : setNewTitle}
              onMessageChange={(newMsg) => {
                if (editingId) {
                  setEditMessage(newMsg);
                } else {
                  setNewMessage(newMsg);
                }
                setMessageSource('chip');
              }}
              allowSending={false}
              defaultMessage="Hola [[nombre_contacto]]"
              variables={{
                nombre_contacto: 'Nombre contacto',
                nombre_prospecto: 'Nombre contacto',
                nombre_evento: 'Nombre evento',
                link_promesa: 'link-promesa',
                fecha_evento: null,
              }}
              editorRef={editorRef}
              onInsertVariable={insertVariableAtCursor}
              onInsertPortfolio={insertPortfolioChip}
              className="flex-1 min-h-0 overflow-y-auto"
            />
          </div>
        </div>

        {/* Modal de vista previa de portafolio */}
        <PortfolioDetailModal
          portfolio={previewPortfolio}
          studioSlug={studioSlug}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewPortfolio(null);
          }}
          hideShareButton
        />
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
