'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ZenInput, ZenButton } from '@/components/ui/zen';
import { replaceWhatsAppTemplateVariables, formatEventDateForWhatsApp } from '@/lib/utils/whatsapp-templates';
import { cn } from '@/lib/utils';

export interface WhatsAppAdvancedEditorProps {
  /** Título de la plantilla */
  title: string;
  /** Mensaje de la plantilla (raw con variables) */
  message: string;
  /** Callback cuando cambia el título */
  onTitleChange: (title: string) => void;
  /** Callback cuando cambia el mensaje */
  onMessageChange: (message: string) => void;
  /** Variables para reemplazar en la vista previa */
  variables?: {
    nombre_contacto?: string;
    nombre_prospecto?: string;
    nombre_evento?: string;
    link_promesa?: string;
    fecha_evento?: Date | null;
  };
  /** Si se permite enviar mensajes (muestra botones de envío) */
  allowSending?: boolean;
  /** Callback cuando se hace clic en "Guardar plantilla" */
  onSaveTemplate?: () => void;
  /** Callback cuando se hace clic en "Solo Enviar" */
  onSendOnly?: () => void;
  /** Callback cuando se hace clic en "Guardar y Enviar" */
  onSaveAndSend?: () => void;
  /** Si está guardando/enviando */
  isSaving?: boolean;
  /** Si hay cambios sin guardar */
  hasChanges?: boolean;
  /** Si es edición de plantilla existente */
  isEditingTemplate?: boolean;
  /** Callback personalizado para insertar variable (opcional, usa lógica interna por defecto) */
  onInsertVariable?: (variable: string) => void;
  /** Callback para insertar portafolio (opcional) */
  onInsertPortfolio?: (slug: string, label: string, shortUrl?: string) => void;
  /** Ref expuesta para acceso externo al editor (opcional) */
  editorRef?: React.RefObject<HTMLDivElement>;
  /** Callback para obtener el mensaje actual del editor (opcional, útil para validaciones) */
  onGetCurrentMessage?: (getter: () => string) => void;
  /** Placeholder para el título */
  titlePlaceholder?: string;
  /** Mensaje por defecto */
  defaultMessage?: string;
  /** Clase CSS adicional */
  className?: string;
}

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

/**
 * Editor avanzado de WhatsApp con contentEditable, chips visuales y vista previa en tiempo real
 */
export function WhatsAppAdvancedEditor({
  title,
  message,
  onTitleChange,
  onMessageChange,
  variables = {},
  allowSending = false,
  onSaveTemplate,
  onSendOnly,
  onSaveAndSend,
  isSaving = false,
  hasChanges = false,
  isEditingTemplate = false,
  titlePlaceholder = 'Ej. Saludo inicial',
  defaultMessage = 'Hola [[nombre_contacto]]',
  onInsertVariable,
  onInsertPortfolio,
  editorRef: externalEditorRef,
  onGetCurrentMessage,
  className = '',
}: WhatsAppAdvancedEditorProps) {
  const internalEditorRef = useRef<HTMLDivElement>(null);
  const editorRef = externalEditorRef || internalEditorRef;
  const [messageSource, setMessageSource] = useState<'template' | 'chip' | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Preparar variables para vista previa
  const vars = {
    nombre_contacto: variables.nombre_contacto || variables.nombre_prospecto || '',
    nombre_prospecto: variables.nombre_prospecto || variables.nombre_contacto || '',
    nombre_evento: variables.nombre_evento || '',
    link_promesa: variables.link_promesa || '',
    fecha_evento: variables.fecha_evento ? formatEventDateForWhatsApp(variables.fecha_evento) : '',
  };

  const previewMessage = replaceWhatsAppTemplateVariables(message, vars);

  // Obtener mensaje del editor contentEditable
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

  // Establecer contenido del editor desde string
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

  // Obtener rango al final del editor para inserción
  const getRangeAtEndOfEditor = useCallback((): Range | null => {
    const el = editorRef.current;
    if (!el) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    return range;
  }, []);

  // Inicializar contenido del editor al montar o cuando cambia el mensaje inicialmente
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML.trim();
      const targetMessage = message || defaultMessage;
      // Solo inicializar si está vacío o si el mensaje cambió externamente (sin ser por input del usuario)
      if (!currentContent || (messageSource === 'template' && targetMessage)) {
        setEditorContent(targetMessage);
        setMessageSource(null);
      }
    }
  }, [message, defaultMessage, messageSource, setEditorContent]);

  // Manejar input del editor
  const handleEditorInput = () => {
    const newMsg = getMessageFromEditor();
    if (newMsg !== message) onMessageChange(newMsg);
  };

  // Insertar variable como chip visual
  const insertVariableAtCursor = useCallback(
    (variable: string) => {
      // Si hay callback personalizado, usarlo
      if (onInsertVariable) {
        onInsertVariable(variable);
        return;
      }

      // Lógica interna por defecto
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const range = getRangeAtEndOfEditor();
      if (!range) {
        onMessageChange(message + ' ' + variable + ' ');
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
        onMessageChange(getMessageFromEditor());
      } catch {
        onMessageChange(message + ' ' + variable + ' ');
        setMessageSource('chip');
      }
    },
    [message, getRangeAtEndOfEditor, getMessageFromEditor, onMessageChange, onInsertVariable]
  );

  // Manejar clic en editor (para eliminar chips)
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('chip-remove') || target.closest('.chip-remove')) {
      e.preventDefault();
      const chip = target.closest('.whatsapp-modal-chip') as HTMLElement;
      chip?.remove();
      onMessageChange(getMessageFromEditor());
    }
  };

  // Exponer función para obtener mensaje actual (usando useRef para evitar loops)
  const getMessageFnRef = useRef<(() => string) | null>(null);
  getMessageFnRef.current = getMessageFromEditor;
  
  useEffect(() => {
    if (onGetCurrentMessage) {
      onGetCurrentMessage(() => {
        return getMessageFnRef.current ? getMessageFnRef.current() : message;
      });
    }
  }, [onGetCurrentMessage, message]); // Solo dependemos de onGetCurrentMessage y message

  // Función interna para insertar portafolio (si no hay callback externo)
  const insertPortfolioChipInternal = useCallback(
    (slug: string, label: string, shortUrl?: string) => {
      if (onInsertPortfolio) {
        onInsertPortfolio(slug, label, shortUrl);
        return;
      }

      // Lógica interna por defecto
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const range = getRangeAtEndOfEditor();
      if (!range) {
        onMessageChange(message + (shortUrl ? ` ${shortUrl} ` : ` [[link_portafolio:${slug}]] `));
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
        onMessageChange(getMessageFromEditor());
      } catch {
        onMessageChange(message + (shortUrl ? ` ${shortUrl} ` : ` [[link_portafolio:${slug}]] `));
        setMessageSource('chip');
      }
    },
    [message, getRangeAtEndOfEditor, getMessageFromEditor, onMessageChange, onInsertPortfolio]
  );

  // Exponer función de inserción de portafolio si se necesita
  useEffect(() => {
    // El callback onInsertPortfolio se puede llamar desde el componente padre
    // No necesitamos hacer nada aquí
  }, [onInsertPortfolio]);

  // Renderizar vista previa estilizada
  const previewStyled = (() => {
    const segments = parseMessageToSegments(message);
    if (segments.length === 0) return '—';
    const linkClass = 'text-blue-600 underline underline-offset-1 cursor-pointer hover:text-blue-700';
    
    // Función helper para renderizar texto con saltos de línea
    const renderTextWithLineBreaks = (text: string, keyPrefix: string) => {
      if (!text) return null;
      const parts = text.split('\n');
      return parts.map((part, idx) => (
        <React.Fragment key={`${keyPrefix}-${idx}`}>
          {part}
          {idx < parts.length - 1 && <br />}
        </React.Fragment>
      ));
    };
    
    return segments.map((seg, i) => {
      if (seg.type === 'text') {
        if (!seg.value) return <React.Fragment key={i} />;
        return <React.Fragment key={i}>{renderTextWithLineBreaks(seg.value, `text-${i}`)}</React.Fragment>;
      }
      if (seg.type === 'portfolio_link') {
        const url = `${origin}/studio?portfolio=${encodeURIComponent(seg.slug)}`;
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
    <div className={cn('flex flex-col', className)}>
      {/* Título y chips de variables */}
      <div className="shrink-0 p-3 pb-2 border-b border-zinc-800 bg-zinc-950 space-y-3">
        <div>
          <label className="text-xs font-medium text-zinc-500 block mb-1.5">Título de la plantilla</label>
          <ZenInput
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={titlePlaceholder}
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
      </div>

      {/* Editor contentEditable */}
      <div className="flex-1 flex flex-col min-h-0 p-3 pt-2">
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
          data-placeholder={defaultMessage}
        />
      </div>

      {/* Vista previa (burbuja WhatsApp) */}
      <div className="shrink-0 p-3 pt-2 border-t border-zinc-800">
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

      {/* Botones de acción (solo si allowSending es true y NO hay footer externo) */}
      {/* Nota: Cuando se usa en WhatsAppMessageModal, los botones están en el footer del ZenDialog */}
      {allowSending && (onSaveTemplate || onSendOnly || onSaveAndSend) && !editorRef && (
        <div className="shrink-0 p-3 pt-2 border-t border-zinc-800 flex items-center gap-2">
          {hasChanges && onSaveTemplate && (
            <ZenButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSaveTemplate}
              disabled={isSaving || !message.trim()}
            >
              {isEditingTemplate ? 'Actualizar plantilla' : 'Guardar plantilla'}
            </ZenButton>
          )}
          {onSendOnly && (
            <ZenButton
              type="button"
              variant="outline"
              size="sm"
              onClick={onSendOnly}
              disabled={isSaving || !previewMessage.trim()}
            >
              Solo Enviar
            </ZenButton>
          )}
          {onSaveAndSend && (
            <ZenButton
              type="button"
              variant="primary"
              size="sm"
              onClick={onSaveAndSend}
              disabled={isSaving || !previewMessage.trim()}
              isLoading={isSaving}
            >
              {hasChanges ? (isEditingTemplate ? 'Actualizar y Enviar' : 'Guardar y Enviar') : 'Enviar WhatsApp'}
            </ZenButton>
          )}
        </div>
      )}
    </div>
  );
}
