'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MoreVertical, Copy, Trash2, ChevronDown, ChevronRight, Eye, Plus, Loader2 } from 'lucide-react';
import { ZenDialog, ZenButton, ZenInput, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem } from '@/components/ui/zen';
import {
  getWhatsAppTemplates,
  logWhatsAppSentWithMessage,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
  duplicateWhatsAppTemplate,
} from '@/lib/actions/studio/commercial/promises';
import { getOrCreateShortUrl, getOrCreatePortfolioShortUrl } from '@/lib/actions/studio/commercial/promises/promise-short-url.actions';
import { getPortfoliosForWhatsApp, getPortfolioFullDetail } from '@/lib/actions/studio/commercial/promises/whatsapp-resources.actions';
import type { PortfolioForWhatsApp, PortfolioGroup } from '@/lib/actions/studio/commercial/promises/whatsapp-resources.types';
import type { PublicPortfolio } from '@/types/public-profile';
import { PortfolioDetailModal } from '@/components/profile/sections/PortfolioDetailModal';
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
  const [portfolioGroups, setPortfolioGroups] = useState<PortfolioGroup[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [previewPortfolio, setPreviewPortfolio] = useState<PublicPortfolio | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingPreviewSlug, setLoadingPreviewSlug] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [saving, setSaving] = useState(false);
  const [messageSource, setMessageSource] = useState<'template' | 'chip' | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const loadData = useCallback(async () => {
    if (!isOpen || !studioSlug || !promiseId) return;
    setLoadingTemplates(true);
    setLoadingResources(true);
    try {
      const [tplRes, urlRes, portRes] = await Promise.all([
        getWhatsAppTemplates(studioSlug),
        getOrCreateShortUrl(studioSlug, promiseId),
        getPortfoliosForWhatsApp(studioSlug),
      ]);
      if (tplRes.success && tplRes.data) setTemplates(tplRes.data);
      if (urlRes.success && urlRes.data) {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        setShortUrl(`${base}/s/${urlRes.data.shortCode}`);
      }
      if (portRes.success && portRes.data) {
        setPortfolioGroups(portRes.data);
        const eventNameNorm = (eventName ?? '').trim().toLowerCase();
        const toExpand = new Set<string>();
        if (eventNameNorm) {
          const match = portRes.data.find(
            (g) => g.eventTypeName.trim().toLowerCase() === eventNameNorm
          );
          if (match) toExpand.add(match.eventTypeName);
        }
        if (toExpand.size === 0) {
          portRes.data.forEach((g) => toExpand.add(g.eventTypeName));
        }
        setExpandedSections(toExpand);
      }
    } finally {
      setLoadingTemplates(false);
      setLoadingResources(false);
    }
  }, [isOpen, studioSlug, promiseId, eventName]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSelectedTemplateId(null);
      setTemplateName('');
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
    !!selectedTemplate &&
    (message.trim() !== selectedTemplate.message.trim() ||
      templateName.trim() !== selectedTemplate.title.trim());
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
  }, [message]);

  const setEditorContent = useCallback((str: string) => {
    const el = editorRef.current;
    if (!el) return;
    const segments = parseMessageToSegments(str);
    const html = segments
      .map((s) => {
        if (s.type === 'text') return escapeHtml(s.value).replace(/\n/g, '<br>');
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

  /** Rango colapsado al final del editor. Todas las inserciones (variables y portafolios) se realizan aquí para evitar conflictos con Smart Chips. */
  const getRangeAtEndOfEditor = useCallback((): Range | null => {
    const el = editorRef.current;
    if (!el) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    return range;
  }, []);

  useEffect(() => {
    if (messageSource && editorRef.current) {
      setEditorContent(message);
      setMessageSource(null);
    }
  }, [message, messageSource, setEditorContent]);

  const handleSelectTemplate = (t: WhatsAppTemplate) => {
    setSelectedTemplateId(t.id);
    setTemplateName(t.title);
    setMessage(t.message);
    setMessageSource('template');
  };

  const handleDuplicateTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const res = await duplicateWhatsAppTemplate(studioSlug, id);
    if (res.success && res.data) {
      setTemplates((prev) => [res.data!, ...prev]);
      toast.success('Plantilla duplicada');
    } else {
      toast.error(res.success ? undefined : res.error);
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const res = await deleteWhatsAppTemplate(studioSlug, id);
    if (res.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedTemplateId === id) {
        setSelectedTemplateId(null);
        setTemplateName('');
        setMessage(DEFAULT_MESSAGE);
        setMessageSource('template');
      }
      toast.success('Plantilla eliminada');
    } else {
      toast.error(res.error);
    }
  };

  const handleEditorInput = () => {
    const newMsg = getMessageFromEditor();
    if (newMsg !== message) setMessage(newMsg);
  };

  /** Inserta chip de variable [[tag]] siempre al final del editor. variable debe ser ej. [[nombre_evento]]. */
  const insertVariableAtCursor = useCallback(
    (variable: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      let range = getRangeAtEndOfEditor();
      if (!range) {
        setMessage(message + ' ' + variable + ' ');
        setMessageSource('chip');
        return;
      }
      const key = variable.replace(/^\[\[|\]\]$/g, '');
      const label = VAR_LABELS[key] ?? key;
      const span = document.createElement('span');
      span.setAttribute('data-var', key);
      span.setAttribute('contenteditable', 'false');
      span.className = 'whatsapp-modal-chip';
      span.innerHTML = `${escapeHtml(label)}<span class="chip-remove" contenteditable="false" role="button" tabindex="-1">×</span>`;
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
        setMessage(getMessageFromEditor());
      } catch {
        setMessage(message + ' ' + variable + ' ');
        setMessageSource('chip');
      }
    },
    [message, getRangeAtEndOfEditor]
  );

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('chip-remove') || target.closest('.chip-remove')) {
      e.preventDefault();
      const chip = target.closest('.whatsapp-modal-chip') as HTMLElement;
      chip?.remove();
      setMessage(getMessageFromEditor());
    }
  };

  /** Inserta chip de portafolio siempre al final del editor. Si shortUrl está definido, el chip usa link corto para previsualización en WhatsApp. */
  const insertPortfolioChip = useCallback(
    (slug: string, label: string, shortUrl?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const range = getRangeAtEndOfEditor();
      if (!range) {
        setMessage(message + (shortUrl ? ` ${shortUrl} ` : ` [[link_portafolio:${slug}]] `));
        setMessageSource('chip');
        return;
      }
      const span = document.createElement('span');
      span.setAttribute('data-portfolio-slug', slug);
      if (shortUrl) span.setAttribute('data-portfolio-short-url', shortUrl);
      span.setAttribute('contenteditable', 'false');
      span.className = 'whatsapp-modal-chip';
      span.innerHTML = `${escapeHtml(label)}<span class="chip-remove" contenteditable="false" role="button" tabindex="-1">×</span>`;
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
        setMessage(getMessageFromEditor());
      } catch {
        setMessage(message + (shortUrl ? ` ${shortUrl} ` : ` [[link_portafolio:${slug}]] `));
        setMessageSource('chip');
      }
    },
    [message, getRangeAtEndOfEditor]
  );

  const handlePortfolioClick = async (p: PortfolioForWhatsApp) => {
    const res = await getOrCreatePortfolioShortUrl(studioSlug, p.slug);
    const shortUrl = res.success && res.data ? `${origin}/s/${res.data.shortCode}` : undefined;
    insertPortfolioChip(p.slug, `Portafolio: ${p.title}`, shortUrl);
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
    const titleToSave = templateName.trim() || currentMessage.slice(0, 30) || 'Mensaje rápido';
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
          titleToSave,
          currentMessage
        );
        if (!res.success) {
          toast.error(res.error ?? 'Error al actualizar plantilla');
          return;
        }
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === selectedTemplate.id ? { ...t, title: titleToSave, message: currentMessage } : t
          )
        );
        setTemplateName(titleToSave);
      } else if (isFromScratch) {
        const res = await createWhatsAppTemplate(studioSlug, titleToSave, currentMessage);
        if (!res.success) {
          toast.error(res.error ?? 'Error al guardar plantilla');
          return;
        }
        setTemplates((prev) => [res.data!, ...prev]);
        setSelectedTemplateId(res.data!.id);
        setTemplateName(res.data!.title);
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
    const titleToSave = templateName.trim() || currentMessage.slice(0, 30) || 'Mensaje rápido';
    setSaving(true);
    try {
      if (isEditedFromTemplate && selectedTemplate) {
        const res = await updateWhatsAppTemplate(
          studioSlug,
          selectedTemplate.id,
          titleToSave,
          currentMessage
        );
        if (!res.success) {
          toast.error(res.error ?? 'Error al actualizar plantilla');
          setSaving(false);
          return;
        }
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === selectedTemplate.id ? { ...t, title: titleToSave, message: currentMessage } : t
          )
        );
      } else if (isFromScratch && currentMessage) {
        const res = await createWhatsAppTemplate(studioSlug, titleToSave, currentMessage);
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

  /** Vista previa: negritas, links en azul tipo enlace */
  const linkClass = 'text-blue-600 underline underline-offset-1 cursor-pointer hover:text-blue-700';
  const previewStyled = (() => {
    const segments = parseMessageToSegments(message);
    if (segments.length === 0) return '—';
    const basePortfolioUrl = `${origin}/${studioSlug}?portfolio=`;
    const portfolioUrlRe = new RegExp(`(${basePortfolioUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s]*)`, 'g');
    const escapedOrigin = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const shortUrlRe = new RegExp(`(${escapedOrigin}/s/[^\\s]+)`, 'g');
    const isPortfolioUrl = (s: string) => s.includes('?portfolio=') && (s.startsWith(origin) || s.startsWith('/'));
    const isShortUrl = (s: string) => (s.startsWith(origin) || s.startsWith('/')) && /\/s\/[^\s]+/.test(s);
    const isLink = (s: string) => isPortfolioUrl(s) || isShortUrl(s);
    const splitByUrls = (text: string): string[] => {
      const byPortfolio = text.split(portfolioUrlRe);
      const result: string[] = [];
      for (const part of byPortfolio) {
        if (isPortfolioUrl(part)) {
          result.push(part);
        } else {
          const byShort = part.split(shortUrlRe);
          byShort.forEach((p) => result.push(p));
        }
      }
      return result;
    };
    return segments.map((seg, i) => {
      if (seg.type === 'text') {
        if (!seg.value) return <React.Fragment key={i} />;
        const parts = splitByUrls(seg.value);
        return (
          <React.Fragment key={i}>
            {parts.map((part, j) =>
              isLink(part) ? (
                <span key={`t-${i}-${j}`} className={linkClass}>
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
          <span key={i} className={linkClass}>
            {url}
          </span>
        );
      }
      const resolved = (vars as Record<string, string>)[seg.key] ?? `[[${seg.key}]]`;
      if (seg.key === 'link_promesa') {
        return (
          <span key={i} className={linkClass}>
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
            ? selectedTemplate
              ? 'Actualizar y Enviar'
              : 'Guardar y Enviar'
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
                {templates.map((t) => {
                  const trimmed = t.message.replace(/\s+/g, ' ').trim();
                  const snippet = trimmed.slice(0, 38);
                  const snippetDisplay = trimmed.length > 38 ? snippet + '…' : snippet;
                  return (
                    <li key={t.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectTemplate(t)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(t)}
                        className={cn(
                          'flex justify-between items-start gap-1 w-full text-left px-2 py-1.5 rounded-md transition-colors cursor-pointer',
                          selectedTemplateId === t.id
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{t.title}</p>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">{snippetDisplay}</p>
                        </div>
                        <ZenDropdownMenu>
                          <ZenDropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="shrink-0 p-0.5 rounded hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                              aria-label="Acciones"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </ZenDropdownMenuTrigger>
                          <ZenDropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <ZenDropdownMenuItem
                              onClick={(e) => handleDuplicateTemplate(e as unknown as React.MouseEvent, t.id)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuItem
                              onClick={(e) => handleDeleteTemplate(e as unknown as React.MouseEvent, t.id)}
                              className="text-red-400 focus:text-red-300"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </ZenDropdownMenuItem>
                          </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Col 2: Portafolios por tipo de evento */}
        <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/30 overflow-hidden">
          <div className="px-2.5 py-2 border-b border-zinc-800">
            <p className="text-xs font-medium text-zinc-500">Portafolios</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingResources ? (
              <p className="text-xs text-zinc-500">Cargando…</p>
            ) : portfolioGroups.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin portafolios publicados</p>
            ) : (
              <ul className="space-y-1">
                {portfolioGroups.map((group) => {
                  const isExpanded = expandedSections.has(group.eventTypeName);
                  const isHighlighted =
                  (eventName ?? '').trim().toLowerCase() ===
                  group.eventTypeName.trim().toLowerCase();
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
                        className={cn(
                          'flex items-center gap-1 w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                          isHighlighted ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        )}
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

        {/* Col 3: Editor + Preview (Taller) */}
        <div className="flex-1 flex flex-col min-w-0 border border-zinc-800 border-l-0 rounded-r-lg bg-zinc-800/30 overflow-hidden">
          <div className="p-3 flex flex-col gap-3 flex-1 min-h-0">
            {/* Título de la plantilla */}
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1.5">
                Título de la plantilla
              </label>
              <ZenInput
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ej. Saludo inicial"
                className="bg-zinc-900/50 border-zinc-700"
              />
            </div>
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

      {/* Overlay: previsualización de portafolio sin cerrar el modal de WhatsApp */}
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
  );
}
