'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { ZenDialog, ZenButton } from '@/components/ui/zen';
import {
  getWhatsAppTemplates,
  logWhatsAppSentWithMessage,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
} from '@/lib/actions/studio/commercial/promises';
import { getOrCreateShortUrl } from '@/lib/actions/studio/commercial/promises/promise-short-url.actions';
import {
  getPortfoliosForWhatsApp,
  getTopShots,
  addTopShot,
  removeTopShot,
} from '@/lib/actions/studio/commercial/promises/whatsapp-resources.actions';
import type { PortfolioForWhatsApp, TopShot } from '@/lib/actions/studio/commercial/promises/whatsapp-resources.actions';
import {
  replaceWhatsAppTemplateVariables,
  formatEventDateForWhatsApp,
} from '@/lib/utils/whatsapp-templates';
import type { WhatsAppTemplate } from '@/lib/actions/studio/commercial/promises/whatsapp-templates.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface WhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string;
  contactName: string;
  phone: string;
  eventName?: string | null;
  eventDate?: Date | null;
}

const DEFAULT_MESSAGE = 'Hola [[nombre_contacto]]';

const VAR_CHIPS: { label: string; value: string }[] = [
  { label: '+ Nombre contacto', value: '[[nombre_contacto]]' },
  { label: '+ Nombre evento', value: '[[nombre_evento]]' },
  { label: '+ Fecha evento', value: '[[fecha_evento]]' },
  { label: '+ Link promesa', value: '[[link_promesa]]' },
];

const VAR_LABELS: Record<string, string> = {
  nombre_contacto: 'Nombre contacto',
  nombre_prospecto: 'Nombre contacto',
  link_promesa: 'Link promesa',
  nombre_evento: 'Nombre evento',
  fecha_evento: 'Fecha evento',
};

type Segment =
  | { type: 'text'; value: string }
  | { type: 'variable'; key: string }
  | { type: 'portfolio_link'; slug: string };

function parseMessageToSegments(str: string): Segment[] {
  const re = /\[\[(?:link_portafolio:([^\]]+)|(\w+))\]\]/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'text', value: str.slice(lastIndex, m.index) });
    }
    if (m[1] != null) {
      segments.push({ type: 'portfolio_link', slug: m[1] });
    } else if (m[2] != null) {
      segments.push({ type: 'variable', key: m[2] });
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < str.length) {
    segments.push({ type: 'text', value: str.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'text', value: '' }];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function WhatsAppMessageModal({
  isOpen,
  onClose,
  studioSlug,
  promiseId,
  contactName,
  phone,
  eventName = null,
  eventDate = null,
}: WhatsAppMessageModalProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioForWhatsApp[]>([]);
  const [topShots, setTopShots] = useState<TopShot[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [saving, setSaving] = useState(false);
  const [messageSource, setMessageSource] = useState<'template' | 'chip' | null>(null);
  const [uploadingShot, setUploadingShot] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const loadData = useCallback(async () => {
    if (!isOpen || !studioSlug || !promiseId) return;
    setLoadingTemplates(true);
    setLoadingResources(true);
    try {
      const [tplRes, urlRes, portRes, shotsRes] = await Promise.all([
        getWhatsAppTemplates(studioSlug),
        getOrCreateShortUrl(studioSlug, promiseId),
        getPortfoliosForWhatsApp(studioSlug),
        getTopShots(studioSlug),
      ]);
      if (tplRes.success && tplRes.data) setTemplates(tplRes.data);
      if (urlRes.success && urlRes.data) {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        setShortUrl(`${base}/s/${urlRes.data.shortCode}`);
      }
      if (portRes.success && portRes.data) setPortfolios(portRes.data);
      if (shotsRes.success && shotsRes.data) setTopShots(shotsRes.data);
    } finally {
      setLoadingTemplates(false);
      setLoadingResources(false);
    }
  }, [isOpen, studioSlug, promiseId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSelectedTemplateId(null);
      setMessage(DEFAULT_MESSAGE);
      setMessageSource('template');
    }
  }, [isOpen, loadData]);

  const vars = {
    nombre_contacto: contactName,
    nombre_prospecto: contactName,
    nombre_evento: eventName ?? '',
    link_promesa: shortUrl ?? '',
    fecha_evento: formatEventDateForWhatsApp(eventDate),
  };

  const previewMessage = replaceWhatsAppTemplateVariables(message, vars);

  const selectedTemplate = selectedTemplateId
    ? templates.find((t) => t.id === selectedTemplateId)
    : null;

  const isEditedFromTemplate =
    !!selectedTemplate && message.trim() !== selectedTemplate.message.trim();
  const isFromScratch = !selectedTemplateId && message.trim().length > 0;
  const hasChanges = isEditedFromTemplate || isFromScratch;

  const getMessageFromEditor = useCallback((): string => {
    const el = editorRef.current;
    if (!el) return message;
    const parts: string[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        parts.push(node.textContent);
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const portfolioSlug = el.getAttribute?.('data-portfolio-slug');
        if (portfolioSlug != null) {
          parts.push(`[[link_portafolio:${portfolioSlug}]]`);
          return;
        }
        if (el.getAttribute?.('data-var')) {
          parts.push(`[[${el.getAttribute('data-var')}]]`);
          return;
        }
        node.childNodes.forEach(walk);
      }
    };
    el.childNodes.forEach(walk);
    return parts.join('');
  }, [message]);

  const setEditorContent = useCallback((str: string) => {
    const el = editorRef.current;
    if (!el) return;
    const segments = parseMessageToSegments(str);
    const html = segments
      .map((s) => {
        if (s.type === 'text') return escapeHtml(s.value);
        if (s.type === 'portfolio_link') {
          const label = `Portafolio: ${s.slug}`;
          return `<span data-portfolio-slug="${escapeHtml(s.slug)}" contenteditable="false" class="whatsapp-modal-chip">${escapeHtml(label)}<span class="chip-remove" contenteditable="false" role="button" tabindex="-1">×</span></span>`;
        }
        const label = VAR_LABELS[s.key] ?? s.key;
        return `<span data-var="${escapeHtml(s.key)}" contenteditable="false" class="whatsapp-modal-chip">${escapeHtml(label)}<span class="chip-remove" contenteditable="false" role="button" tabindex="-1">×</span></span>`;
      })
      .join('');
    el.innerHTML = html;
  }, []);

  useEffect(() => {
    if (messageSource && editorRef.current) {
      setEditorContent(message);
      setMessageSource(null);
    }
  }, [message, messageSource, setEditorContent]);

  const handleSelectTemplate = (t: WhatsAppTemplate) => {
    setSelectedTemplateId(t.id);
    setMessage(t.message);
    setMessageSource('template');
  };

  const handleEditorInput = () => {
    const newMsg = getMessageFromEditor();
    if (newMsg !== message) setMessage(newMsg);
  };

  const insertVariableAtCursor = (variable: string) => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setMessage(message + ' ' + variable + ' ');
      setMessageSource('chip');
      return;
    }
    const range = sel.getRangeAt(0);
    const key = variable.replace(/^\[\[|\]\]$/g, '');
    const label = VAR_LABELS[key] ?? key;
    const span = document.createElement('span');
    span.setAttribute('data-var', key);
    span.setAttribute('contenteditable', 'false');
    span.className = 'whatsapp-modal-chip';
    span.innerHTML = `${escapeHtml(label)}<span class="chip-remove" contenteditable="false" role="button" tabindex="-1">×</span>`;
    try {
      range.insertNode(span);
      const prev = span.previousSibling;
      const next = span.nextSibling;
      const needsSpaceBefore =
        !prev ||
        prev.nodeType !== Node.TEXT_NODE ||
        !/[\s\u00A0]$/.test((prev as Text).textContent || '');
      const needsSpaceAfter =
        !next ||
        next.nodeType !== Node.TEXT_NODE ||
        !/^[\s\u00A0]/.test((next as Text).textContent || '');
      if (needsSpaceBefore) {
        span.parentNode?.insertBefore(document.createTextNode(' '), span);
      }
      if (needsSpaceAfter) {
        span.parentNode?.insertBefore(document.createTextNode(' '), span.nextSibling);
      }
      range.setStartAfter(span);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      setMessage(message + ' ' + variable + ' ');
      setMessageSource('chip');
      return;
    }
    setMessage(getMessageFromEditor());
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('chip-remove') || target.closest('.chip-remove')) {
      e.preventDefault();
      const chip = target.closest('.whatsapp-modal-chip') as HTMLElement;
      chip?.remove();
      setMessage(getMessageFromEditor());
    }
  };

  /** Inserta chip de portafolio [[link_portafolio:slug]] en el editor */
  const insertPortfolioChip = (slug: string, label: string) => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setMessage(message + ` [[link_portafolio:${slug}]] `);
      setMessageSource('chip');
      return;
    }
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.setAttribute('data-portfolio-slug', slug);
    span.setAttribute('contenteditable', 'false');
    span.className = 'whatsapp-modal-chip';
    span.innerHTML = `${escapeHtml(label)}<span class="chip-remove" contenteditable="false" role="button" tabindex="-1">×</span>`;
    try {
      range.insertNode(span);
      const prev = span.previousSibling;
      const next = span.nextSibling;
      const needsSpaceBefore =
        !prev ||
        prev.nodeType !== Node.TEXT_NODE ||
        !/[\s\u00A0]$/.test((prev as Text).textContent || '');
      const needsSpaceAfter =
        !next ||
        next.nodeType !== Node.TEXT_NODE ||
        !/^[\s\u00A0]/.test((next as Text).textContent || '');
      if (needsSpaceBefore) {
        span.parentNode?.insertBefore(document.createTextNode(' '), span);
      }
      if (needsSpaceAfter) {
        span.parentNode?.insertBefore(document.createTextNode(' '), span.nextSibling);
      }
      range.setStartAfter(span);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      setMessage(message + ` [[link_portafolio:${slug}]] `);
      setMessageSource('chip');
      return;
    }
    setMessage(getMessageFromEditor());
  };

  const handlePortfolioClick = (p: PortfolioForWhatsApp) => {
    insertPortfolioChip(p.slug, `Portafolio: ${p.title}`);
  };

  const handleTopShotClick = async (shot: TopShot) => {
    try {
      const res = await fetch(shot.file_url, { mode: 'cors' });
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success('¡Foto copiada! Pégala en WhatsApp con Ctrl+V');
    } catch {
      toast.error('No se pudo copiar la imagen. Prueba en otro navegador.');
    }
  };

  const handleTopShotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingShot(true);
    const formData = new FormData();
    formData.set('file', file);
    const res = await addTopShot(studioSlug, formData);
    if (res.success) {
      setTopShots((prev) => [...prev, res.data!].sort((a, b) => a.display_order - b.display_order));
      toast.success('Foto agregada al repositorio');
    } else {
      toast.error(res.error);
    }
    setUploadingShot(false);
  };

  const handleRemoveTopShot = async (id: string) => {
    const res = await removeTopShot(studioSlug, id);
    if (res.success) {
      setTopShots((prev) => prev.filter((s) => s.id !== id));
      toast.success('Foto eliminada');
    } else {
      toast.error(res.error);
    }
  };

  const getCurrentMessage = (): string =>
    editorRef.current ? getMessageFromEditor() : message;

  const getTextToSend = (): string => {
    let currentMessage = getCurrentMessage();
    currentMessage = currentMessage.replace(
      /\[\[link_portafolio:([^\]]+)\]\]/g,
      (_, slug) => `${origin}/${studioSlug}?portfolio=${encodeURIComponent(slug.trim())}`
    );
    return replaceWhatsAppTemplateVariables(currentMessage, vars).trim() || contactName;
  };

  const openWhatsAppAndLog = (textToSend: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;
    const encoded = encodeURIComponent(textToSend);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
    logWhatsAppSentWithMessage(studioSlug, promiseId, contactName, phone, textToSend).catch((e) => {
      console.error('Error registrando WhatsApp:', e);
      toast.error('Error al registrar en bitácora');
    });
  };

  const handleGuardarPlantilla = async () => {
    const currentMessage = getCurrentMessage().trim();
    if (!currentMessage) {
      toast.error('Escribe un mensaje');
      return;
    }
    setSaving(true);
    try {
      if (isEditedFromTemplate && selectedTemplate) {
        const res = await updateWhatsAppTemplate(
          studioSlug,
          selectedTemplate.id,
          selectedTemplate.title,
          currentMessage
        );
        if (!res.success) {
          toast.error(res.error ?? 'Error al actualizar plantilla');
          return;
        }
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedTemplate.id ? { ...t, message: currentMessage } : t))
        );
      } else if (isFromScratch) {
        const title = currentMessage.slice(0, 30) || 'Mensaje rápido';
        const res = await createWhatsAppTemplate(studioSlug, title, currentMessage);
        if (!res.success) {
          toast.error(res.error ?? 'Error al guardar plantilla');
          return;
        }
        setTemplates((prev) => [res.data!, ...prev]);
        setSelectedTemplateId(res.data!.id);
      }
      toast.success('Plantilla guardada. El cambio quedó guardado para futuros envíos.');
    } finally {
      setSaving(false);
    }
  };

  const handleSoloEnviar = () => {
    const textToSend = getTextToSend();
    if (!textToSend) {
      toast.error('Escribe un mensaje');
      return;
    }
    openWhatsAppAndLog(textToSend);
    onClose();
  };

  const handleGuardarYEnviar = async () => {
    const textToSend = getTextToSend();
    if (!textToSend) {
      toast.error('Escribe un mensaje');
      return;
    }
    const currentMessage = getCurrentMessage().trim();
    setSaving(true);
    try {
      if (isEditedFromTemplate && selectedTemplate) {
        const res = await updateWhatsAppTemplate(
          studioSlug,
          selectedTemplate.id,
          selectedTemplate.title,
          currentMessage
        );
        if (!res.success) {
          toast.error(res.error ?? 'Error al actualizar plantilla');
          setSaving(false);
          return;
        }
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedTemplate.id ? { ...t, message: currentMessage } : t))
        );
      } else if (isFromScratch && currentMessage) {
        const title = currentMessage.slice(0, 30) || 'Mensaje rápido';
        const res = await createWhatsAppTemplate(studioSlug, title, currentMessage);
        if (!res.success) {
          toast.error(res.error ?? 'Error al guardar plantilla');
          setSaving(false);
          return;
        }
        setTemplates((prev) => [res.data!, ...prev]);
      }
      openWhatsAppAndLog(textToSend);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarWhatsApp = () => {
    const textToSend = getTextToSend();
    if (!textToSend) {
      toast.error('Escribe un mensaje');
      return;
    }
    openWhatsAppAndLog(textToSend);
    onClose();
  };

  /** Vista previa: negritas, link_promesa y links de portafolio en azul */
  const previewStyled = (() => {
    const segments = parseMessageToSegments(message);
    if (segments.length === 0) return '—';
    const basePortfolioUrl = `${origin}/${studioSlug}?portfolio=`;
    const portfolioUrlRe = new RegExp(`(${basePortfolioUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s]*)`, 'g');
    const isPortfolioUrl = (s: string) => s.includes('?portfolio=') && (s.startsWith(origin) || s.startsWith('/'));
    return segments.map((seg, i) => {
      if (seg.type === 'text') {
        if (!seg.value) return <React.Fragment key={i} />;
        const parts = seg.value.split(portfolioUrlRe);
        return (
          <React.Fragment key={i}>
            {parts.map((part, j) =>
              isPortfolioUrl(part) ? (
                <span key={`t-${i}-${j}`} className="text-blue-500 underline cursor-pointer">
                  {part}
                </span>
              ) : (
                part
              )
            )}
          </React.Fragment>
        );
      }
      if (seg.type === 'portfolio_link') {
        const url = `${origin}/${studioSlug}?portfolio=${encodeURIComponent(seg.slug)}`;
        return (
          <span key={i} className="text-blue-500 underline cursor-pointer">
            {url}
          </span>
        );
      }
      const resolved = (vars as Record<string, string>)[seg.key] ?? `[[${seg.key}]]`;
      if (seg.key === 'link_promesa') {
        return (
          <span key={i} className="text-blue-500 underline cursor-pointer">
            {resolved}
          </span>
        );
      }
      if (['nombre_contacto', 'nombre_prospecto', 'nombre_evento', 'fecha_evento'].includes(seg.key)) {
        return <strong key={i}>{resolved}</strong>;
      }
      return <React.Fragment key={i}>{resolved}</React.Fragment>;
    });
  })();

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Enviar por WhatsApp"
      description="Plantillas a la izquierda, editor y vista previa a la derecha"
      onCancel={onClose}
      cancelLabel="Cancelar"
      onSave={hasChanges ? handleGuardarYEnviar : handleEnviarWhatsApp}
      saveLabel={
        saving
          ? 'Enviando…'
          : hasChanges
            ? 'Guardar y Enviar'
            : 'Enviar WhatsApp'
      }
      saveDisabled={saving || !previewMessage.trim()}
      isLoading={saving}
      maxWidth="5xl"
      footerLeftContent={
        hasChanges ? (
          <div className="flex items-center gap-2">
            <ZenButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </ZenButton>
            <ZenButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGuardarPlantilla}
              disabled={saving || !getCurrentMessage().trim()}
            >
              {isEditedFromTemplate ? 'Actualizar' : 'Guardar plantilla'}
            </ZenButton>
            <ZenButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSoloEnviar}
              disabled={saving || !previewMessage.trim()}
            >
              Solo Enviar
            </ZenButton>
          </div>
        ) : undefined
      }
    >
      <div className="flex gap-0 min-h-[380px]">
        {/* Col 1: Plantillas */}
        <aside className="w-52 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/40 rounded-l-lg overflow-hidden">
          <div className="px-2.5 py-2 border-b border-zinc-800">
            <p className="text-xs font-medium text-zinc-500">Plantillas</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingTemplates ? (
              <p className="text-xs text-zinc-500 py-4 px-1">Cargando…</p>
            ) : templates.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 px-1">
                Configuración → Plantillas WhatsApp
              </p>
            ) : (
              <ul className="space-y-0.5">
                {templates.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(t)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded-md text-sm truncate transition-colors',
                        selectedTemplateId === t.id
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      )}
                    >
                      {t.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Col 2: Recursos (Portafolios + Top Shots) */}
        <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/30 overflow-hidden">
          <div className="px-2.5 py-2 border-b border-zinc-800">
            <p className="text-xs font-medium text-zinc-500">Recursos</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {/* Portafolios: botones que insertan link */}
            <div>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Portafolios</p>
              {loadingResources ? (
                <p className="text-xs text-zinc-500">Cargando…</p>
              ) : portfolios.length === 0 ? (
                <p className="text-xs text-zinc-500">Sin portafolios publicados</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {portfolios.map((p) => (
                    <ZenButton
                      key={p.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePortfolioClick(p)}
                      className="text-xs h-7 px-2"
                    >
                      {p.title}
                    </ZenButton>
                  ))}
                </div>
              )}
            </div>
            {/* Top Shots: rejilla + copiar al portapapeles */}
            <div>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Fotos Top</p>
              {loadingResources ? (
                <p className="text-xs text-zinc-500">Cargando…</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1.5">
                    {topShots.map((shot) => (
                      <button
                        key={shot.id}
                        type="button"
                        onClick={() => handleTopShotClick(shot)}
                        className="aspect-square rounded-md overflow-hidden border border-zinc-700 bg-zinc-800 hover:ring-2 hover:ring-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        title="Clic para copiar. Pega en WhatsApp con Ctrl+V"
                      >
                        <img
                          src={shot.file_url}
                          alt="Top shot"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                    {topShots.length < 12 && (
                      <label className="aspect-square rounded-md border border-dashed border-zinc-600 flex items-center justify-center cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-500">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleTopShotUpload}
                          disabled={uploadingShot}
                        />
                        {uploadingShot ? (
                          <span className="text-[10px] text-zinc-500">Subiendo…</span>
                        ) : (
                          <ImagePlus className="h-5 w-5 text-zinc-500" />
                        )}
                      </label>
                    )}
                  </div>
                  {topShots.length === 0 && (
                    <p className="text-xs text-zinc-500 mt-1">Sube fotos para copiar y pegar en WhatsApp</p>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Col 3: Editor + Preview (Taller) */}
        <div className="flex-1 flex flex-col min-w-0 border border-zinc-800 border-l-0 rounded-r-lg bg-zinc-800/30 overflow-hidden">
          <div className="p-3 flex flex-col gap-3 flex-1 min-h-0">
            {/* Chips de variables */}
            <div className="flex flex-wrap gap-1.5">
              {VAR_CHIPS.map((chip) => (
                <ZenButton
                  key={chip.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariableAtCursor(chip.value)}
                  className="text-xs h-6 px-2"
                >
                  {chip.label}
                </ZenButton>
              ))}
            </div>

            {/* Editor con Smart Chips */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-xs font-medium text-zinc-500 block mb-1.5">Mensaje</label>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onClick={handleEditorClick}
                className={cn(
                  'min-h-[120px] rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-200',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30',
                  '[&_.whatsapp-modal-chip]:inline-flex [&_.whatsapp-modal-chip]:items-center [&_.whatsapp-modal-chip]:gap-0.5 [&_.whatsapp-modal-chip]:rounded [&_.whatsapp-modal-chip]:px-1.5 [&_.whatsapp-modal-chip]:py-0.5 [&_.whatsapp-modal-chip]:text-xs [&_.whatsapp-modal-chip]:bg-emerald-500/25 [&_.whatsapp-modal-chip]:text-emerald-300 [&_.whatsapp-modal-chip]:border [&_.whatsapp-modal-chip]:border-emerald-500/40 [&_.whatsapp-modal-chip]:cursor-default [&_.whatsapp-modal-chip]:mx-0.5 [&_.chip-remove]:cursor-pointer [&_.chip-remove]:opacity-80 hover:[&_.chip-remove]:opacity-100'
                )}
                data-placeholder={DEFAULT_MESSAGE}
              />
            </div>

            {/* Burbuja WhatsApp (espejo en tiempo real) */}
            <div className="shrink-0 pt-1 border-t border-zinc-700/50">
              <p className="text-xs font-medium text-zinc-500 mb-1.5">Vista previa</p>
              <div className="flex justify-end">
              <div
                className="max-w-[90%] rounded-lg px-3 py-2 shadow-sm text-sm text-zinc-800 whitespace-pre-wrap break-words text-left"
                style={{ backgroundColor: '#dcf8c6' }}
              >
                {previewStyled}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ZenDialog>
  );
}
